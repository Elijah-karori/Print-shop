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
	StreamName               = "PLATFORM_EVENTS"
	StreamSubjects           = "platform.*"
	SubjectItemAdded         = "platform.item_added"
	SubjectItemRecalled      = "platform.item_recalled"
	SubjectItemsReceived     = "platform.items_received"
	SubjectTaskCreated       = "platform.task_created"
	SubjectBidSubmitted      = "platform.bid_submitted"
	SubjectBidAccepted       = "platform.bid_accepted"
	SubjectRatingSubmitted   = "platform.rating_submitted"
	DurableAnalyticsConsumer = "platform-analytics-consumer"
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

type ItemsReceivedPayload struct {
	ReceiptID   string    `json:"receipt_id"`
	POLineID    string    `json:"po_line_id"`
	PartID      string    `json:"part_id"`
	UnitIDs     []string  `json:"unit_ids"`
	UnitCostKES float64   `json:"unit_cost_kes"`
	Timestamp   time.Time `json:"timestamp"`
}

type TaskCreatedPayload struct {
	TaskID       string    `json:"task_id"`
	CustomerID   string    `json:"customer_id"`
	CustomerType string    `json:"customer_type"`
	ServiceType  string    `json:"service_type"`
	Title        string    `json:"title"`
	Timestamp    time.Time `json:"timestamp"`
}

type BidSubmittedPayload struct {
	BidID        string    `json:"bid_id"`
	TaskID       string    `json:"task_id"`
	TechnicianID string    `json:"technician_id"`
	BidAmountKES float64   `json:"bid_amount_kes"`
	Timestamp    time.Time `json:"timestamp"`
}

type BidAcceptedPayload struct {
	TaskID       string    `json:"task_id"`
	BidID        string    `json:"bid_id"`
	TechnicianID string    `json:"technician_id"`
	Timestamp    time.Time `json:"timestamp"`
}

type RatingSubmittedPayload struct {
	RatingID     string    `json:"rating_id"`
	TaskID       string    `json:"task_id"`
	TechnicianID string    `json:"technician_id"`
	Score        float64   `json:"score"`
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

func (es *EventService) PublishItemsReceived(ctx context.Context, payload ItemsReceivedPayload) error {
	if es == nil || es.js == nil {
		return nil
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = es.js.Publish(SubjectItemsReceived, data)
	return err
}

func (es *EventService) PublishTaskCreated(ctx context.Context, payload TaskCreatedPayload) error {
	if es == nil || es.js == nil {
		return nil
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = es.js.Publish(SubjectTaskCreated, data)
	return err
}

func (es *EventService) PublishBidSubmitted(ctx context.Context, payload BidSubmittedPayload) error {
	if es == nil || es.js == nil {
		return nil
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = es.js.Publish(SubjectBidSubmitted, data)
	return err
}

func (es *EventService) PublishBidAccepted(ctx context.Context, payload BidAcceptedPayload) error {
	if es == nil || es.js == nil {
		return nil
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = es.js.Publish(SubjectBidAccepted, data)
	return err
}

func (es *EventService) PublishRatingSubmitted(ctx context.Context, payload RatingSubmittedPayload) error {
	if es == nil || es.js == nil {
		return nil
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = es.js.Publish(SubjectRatingSubmitted, data)
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
		case SubjectItemsReceived:
			var p ItemsReceivedPayload
			if err := json.Unmarshal(m.Data, &p); err == nil {
				for _, unitID := range p.UnitIDs {
					es.recordAnalyticsEvent("item_added", unitID, p)
				}
			}
		case SubjectTaskCreated:
			var p TaskCreatedPayload
			if err := json.Unmarshal(m.Data, &p); err == nil {
				es.recordAnalyticsEvent("task_created", p.TaskID, p)
			}
		case SubjectBidSubmitted:
			var p BidSubmittedPayload
			if err := json.Unmarshal(m.Data, &p); err == nil {
				es.recordAnalyticsEvent("bid_submitted", p.BidID, p)
			}
		case SubjectBidAccepted:
			var p BidAcceptedPayload
			if err := json.Unmarshal(m.Data, &p); err == nil {
				es.recordAnalyticsEvent("bid_accepted", p.TaskID, p)
			}
		case SubjectRatingSubmitted:
			var p RatingSubmittedPayload
			if err := json.Unmarshal(m.Data, &p); err == nil {
				es.recordAnalyticsEvent("rating_submitted", p.RatingID, p)
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
