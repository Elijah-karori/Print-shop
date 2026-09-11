package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	natsServer "github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
)

const (
	StreamName            = "INVENTORY"
	StreamSubjects        = "inventory.*"
	SubjectItemAdded      = "inventory.item_added"
	SubjectItemRecalled   = "inventory.item_recalled"
	DurableAnalyticsConsumer = "inventory-analytics-consumer"
)

type EventService struct {
	server *natsServer.Server
	nc     *nats.Conn
	js     nats.JetStreamContext
	db     *pgxpool.Pool
}

type ItemAddedPayload struct {
	UnitID       string  `json:"unit_id"`
	PartID       string  `json:"part_id"`
	SerialNumber string  `json:"serial_number"`
	UnitCostKES  float64 `json:"unit_cost_kes"`
	Timestamp    time.Time `json:"timestamp"`
}

type ItemRecalledPayload struct {
	UnitID       string    `json:"unit_id"`
	SerialNumber string    `json:"serial_number"`
	Reason       string    `json:"reason"`
	Timestamp    time.Time `json:"timestamp"`
}

func StartEmbeddedNATS(db *pgxpool.Pool) (*EventService, error) {
	opts := &natsServer.Options{
		ServerName: "embedded-nats",
		Host:       "127.0.0.1",
		Port:       -1, // In-process / random port to avoid port conflict
		JetStream:  true,
		StoreDir:   "./data/nats",
		NoLog:      true,
		NoSigs:     true,
	}

	ns, err := natsServer.NewServer(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create NATS server: %w", err)
	}

	go ns.Start()

	if !ns.ReadyForConnections(10 * time.Second) {
		return nil, fmt.Errorf("NATS server failed to start within timeout")
	}

	nc, err := nats.Connect(ns.ClientURL())
	if err != nil {
		ns.Shutdown()
		return nil, fmt.Errorf("failed to connect to embedded NATS: %w", err)
	}

	js, err := nc.JetStream()
	if err != nil {
		nc.Close()
		ns.Shutdown()
		return nil, fmt.Errorf("failed to get JetStream context: %w", err)
	}

	// Create or update JetStream Stream for Inventory
	_, err = js.AddStream(&nats.StreamConfig{
		Name:     StreamName,
		Subjects: []string{StreamSubjects},
		Storage:  nats.MemoryStorage,
	})
	if err != nil {
		log.Printf("NATS stream creation warning: %v", err)
	}

	es := &EventService{
		server: ns,
		nc:     nc,
		js:     js,
		db:     db,
	}

	if err := es.startConsumers(); err != nil {
		log.Printf("failed to start event consumers: %v", err)
	}

	return es, nil
}

func (es *EventService) Close() {
	if es.nc != nil {
		es.nc.Close()
	}
	if es.server != nil {
		es.server.Shutdown()
	}
}

// Producers

func (es *EventService) PublishItemAdded(ctx context.Context, payload ItemAddedPayload) error {
	if es == nil || es.js == nil {
		return nil
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = es.js.Publish(SubjectItemAdded, data)
	return err
}

func (es *EventService) PublishItemRecalled(ctx context.Context, payload ItemRecalledPayload) error {
	if es == nil || es.js == nil {
		return nil
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = es.js.Publish(SubjectItemRecalled, data)
	return err
}

// Consumers

func (es *EventService) startConsumers() error {
	_, err := es.js.Subscribe(StreamSubjects, func(m *nats.Msg) {
		_ = m.Ack()
		switch m.Subject {
		case SubjectItemAdded:
			var p ItemAddedPayload
			if err := json.Unmarshal(m.Data, &p); err == nil {
				es.recordAnalyticsEvent("item_added", p.UnitID, p)
			}
		case SubjectItemRecalled:
			var p ItemRecalledPayload
			if err := json.Unmarshal(m.Data, &p); err == nil {
				es.recordAnalyticsEvent("item_recalled", p.UnitID, p)
			}
		}
	}, nats.Durable(DurableAnalyticsConsumer), nats.ManualAck())

	return err
}

func (es *EventService) recordAnalyticsEvent(eventType string, targetID string, payload interface{}) {
	if es.db == nil {
		return
	}
	meta, _ := json.Marshal(payload)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, _ = es.db.Exec(ctx, `
		INSERT INTO telemetry_events (event_type, target_type, target_id, metadata)
		VALUES ($1, 'inventory_event', $2, $3::jsonb)
	`, eventType, targetID, string(meta))
}
