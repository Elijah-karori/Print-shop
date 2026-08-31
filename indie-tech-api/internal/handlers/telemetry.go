package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
)

type TelemetryHandler struct {
	db *pgxpool.Pool
}

func NewTelemetryHandler(db *pgxpool.Pool) *TelemetryHandler {
	return &TelemetryHandler{db: db}
}

type RecordTelemetryInput struct {
	EventType  string                 `json:"event_type"`  // 'click' | 'purchase' | 'recall' | 'blog_view'
	TargetType string                 `json:"target_type"` // 'part' | 'package' | 'blog_post'
	TargetID   string                 `json:"target_id"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

func (h *TelemetryHandler) Record(c echo.Context) error {
	var input RecordTelemetryInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid telemetry payload"})
	}

	if input.EventType == "" || input.TargetType == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "event_type and target_type are required"})
	}

	metaJSON, err := json.Marshal(input.Metadata)
	if err != nil {
		metaJSON = []byte("{}")
	}

	ctx := c.Request().Context()
	_, err = h.db.Exec(ctx, `
		INSERT INTO telemetry_events (event_type, target_type, target_id, metadata)
		VALUES ($1, $2, $3, $4)
	`, input.EventType, input.TargetType, input.TargetID, metaJSON)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to record telemetry"})
	}

	return c.JSON(http.StatusCreated, map[string]string{"status": "recorded"})
}

type TelemetryStatsResponse struct {
	MostClicked   []map[string]interface{} `json:"most_clicked"`
	MostPurchased []map[string]interface{} `json:"most_purchased"`
	BlogViews     []map[string]interface{} `json:"blog_views"`
	Recalls       []map[string]interface{} `json:"recalls"`
}

func (h *TelemetryHandler) GetStats(c echo.Context) error {
	ctx := c.Request().Context()
	stats := TelemetryStatsResponse{
		MostClicked:   []map[string]interface{}{},
		MostPurchased: []map[string]interface{}{},
		BlogViews:     []map[string]interface{}{},
		Recalls:       []map[string]interface{}{},
	}

	// Most clicked targets
	rows, err := h.db.Query(ctx, `
		SELECT target_type, target_id, COUNT(*) as count
		FROM telemetry_events
		WHERE event_type = 'click'
		GROUP BY target_type, target_id
		ORDER BY count DESC
		LIMIT 10
	`)
	if err == nil {
		for rows.Next() {
			var tType, tID string
			var count int
			if rows.Scan(&tType, &tID, &count) == nil {
				stats.MostClicked = append(stats.MostClicked, map[string]interface{}{
					"target_type": tType,
					"target_id":   tID,
					"count":       count,
				})
			}
		}
		rows.Close()
	}

	// Most purchased targets
	pRows, err := h.db.Query(ctx, `
		SELECT target_type, target_id, COUNT(*) as count
		FROM telemetry_events
		WHERE event_type = 'purchase'
		GROUP BY target_type, target_id
		ORDER BY count DESC
		LIMIT 10
	`)
	if err == nil {
		for pRows.Next() {
			var tType, tID string
			var count int
			if pRows.Scan(&tType, &tID, &count) == nil {
				stats.MostPurchased = append(stats.MostPurchased, map[string]interface{}{
					"target_type": tType,
					"target_id":   tID,
					"count":       count,
				})
			}
		}
		pRows.Close()
	}

	// Blog view analytics
	bRows, err := h.db.Query(ctx, `
		SELECT target_id, COUNT(*) as views
		FROM telemetry_events
		WHERE event_type = 'blog_view'
		GROUP BY target_id
		ORDER BY views DESC
		LIMIT 10
	`)
	if err == nil {
		for bRows.Next() {
			var tID string
			var views int
			if bRows.Scan(&tID, &views) == nil {
				stats.BlogViews = append(stats.BlogViews, map[string]interface{}{
					"slug":  tID,
					"views": views,
				})
			}
		}
		bRows.Close()
	}

	return c.JSON(http.StatusOK, stats)
}
