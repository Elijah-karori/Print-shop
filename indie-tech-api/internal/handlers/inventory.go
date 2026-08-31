package handlers

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/elijah-karori/indie-tech-api/internal/models"
)

type InventoryHandler struct {
	db *pgxpool.Pool
}

func NewInventoryHandler(db *pgxpool.Pool) *InventoryHandler {
	return &InventoryHandler{db: db}
}

type AddSerializedItemInput struct {
	PartID       uuid.UUID `json:"part_id"`
	SerialNumber string    `json:"serial_number"`
}

func (h *InventoryHandler) AddSerializedItem(c echo.Context) error {
	var input AddSerializedItemInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid input"})
	}

	if input.PartID == uuid.Nil || input.SerialNumber == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "part_id and serial_number are required"})
	}

	ctx := c.Request().Context()
	var item models.SerializedItem
	err := h.db.QueryRow(ctx, `
		INSERT INTO serialized_items (part_id, serial_number, status)
		VALUES ($1, $2, 'in_stock')
		RETURNING id, part_id, serial_number, status, created_at, updated_at
	`, input.PartID, input.SerialNumber).Scan(&item.ID, &item.PartID, &item.SerialNumber, &item.Status, &item.CreatedAt, &item.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to add serialized item (serial may already exist)"})
	}

	return c.JSON(http.StatusCreated, item)
}

type TriggerRecallInput struct {
	SerialNumber string `json:"serial_number"`
	RecallReason string `json:"recall_reason"`
}

func (h *InventoryHandler) TriggerRecall(c echo.Context) error {
	var input TriggerRecallInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid payload"})
	}

	if input.SerialNumber == "" || input.RecallReason == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "serial_number and recall_reason are required"})
	}

	ctx := c.Request().Context()
	res, err := h.db.Exec(ctx, `
		UPDATE serialized_items
		SET status = 'recalled', recall_reason = $1, updated_at = NOW()
		WHERE serial_number = $2
	`, input.RecallReason, input.SerialNumber)

	if err != nil || res.RowsAffected() == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "serialized item not found or could not be recalled"})
	}

	// Record recall telemetry
	_, _ = h.db.Exec(ctx, `
		INSERT INTO telemetry_events (event_type, target_type, target_id, metadata)
		VALUES ('recall', 'part', $1, json_build_object('reason', $2::text))
	`, input.SerialNumber, input.RecallReason)

	return c.JSON(http.StatusOK, map[string]string{"status": "recalled", "serial_number": input.SerialNumber})
}

func (h *InventoryHandler) ListSerializedItems(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := h.db.Query(ctx, `
		SELECT id, part_id, serial_number, status, COALESCE(recall_reason, ''), created_at, updated_at
		FROM serialized_items
		ORDER BY created_at DESC
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to list serialized items"})
	}
	defer rows.Close()

	var items []models.SerializedItem
	for rows.Next() {
		var item models.SerializedItem
		if err := rows.Scan(&item.ID, &item.PartID, &item.SerialNumber, &item.Status, &item.RecallReason, &item.CreatedAt, &item.UpdatedAt); err == nil {
			items = append(items, item)
		}
	}
	if items == nil {
		items = []models.SerializedItem{}
	}

	return c.JSON(http.StatusOK, items)
}
