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

type AddItemUnitInput struct {
	PartID       uuid.UUID `json:"part_id"`
	SerialNumber string    `json:"serial_number"`
	UnitCostKES  float64   `json:"unit_cost_kes"`
}

func (h *InventoryHandler) AddItemUnit(c echo.Context) error {
	var input AddItemUnitInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid input"})
	}

	if input.PartID == uuid.Nil || input.SerialNumber == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "part_id and serial_number are required"})
	}

	ctx := c.Request().Context()
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "database transaction error"})
	}
	defer tx.Rollback(ctx)

	// Fallback unit cost from part if not specified
	if input.UnitCostKES <= 0 {
		_ = tx.QueryRow(ctx, `SELECT price_kes FROM parts WHERE id = $1`, input.PartID).Scan(&input.UnitCostKES)
	}

	var item models.ItemUnit
	err = tx.QueryRow(ctx, `
		INSERT INTO item_units (part_id, serial_number, unit_cost_kes, status)
		VALUES ($1, $2, $3, 'in_stock')
		RETURNING id, part_id, receipt_id, serial_number, unit_cost_kes, status, created_at, updated_at
	`, input.PartID, input.SerialNumber, input.UnitCostKES).Scan(
		&item.ID, &item.PartID, &item.ReceiptID, &item.SerialNumber, &item.UnitCostKES, &item.Status, &item.CreatedAt, &item.UpdatedAt,
	)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to add item unit (serial number may already exist)"})
	}

	// Insert into unit_transactions ledger
	_, _ = tx.Exec(ctx, `
		INSERT INTO unit_transactions (item_unit_id, action, note)
		VALUES ($1, 'receive', 'Direct stock unit registration')
	`, item.ID)

	// Increment parts stock quantity
	_, _ = tx.Exec(ctx, `
		UPDATE parts SET stock_qty = stock_qty + 1, updated_at = NOW() WHERE id = $1
	`, input.PartID)

	if err := tx.Commit(ctx); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to commit unit registration"})
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
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "database error"})
	}
	defer tx.Rollback(ctx)

	var unitID uuid.UUID
	err = tx.QueryRow(ctx, `
		UPDATE item_units
		SET status = 'recalled', updated_at = NOW()
		WHERE serial_number = $1
		RETURNING id
	`, input.SerialNumber).Scan(&unitID)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "item unit not found or already recalled"})
	}

	// Record in unit_transactions ledger
	_, _ = tx.Exec(ctx, `
		INSERT INTO unit_transactions (item_unit_id, action, note)
		VALUES ($1, 'recall', $2)
	`, unitID, "Recall Reason: "+input.RecallReason)

	// Record in telemetry
	_, _ = tx.Exec(ctx, `
		INSERT INTO telemetry_events (event_type, target_type, target_id, metadata)
		VALUES ('recall', 'part', $1, json_build_object('reason', $2::text))
	`, input.SerialNumber, input.RecallReason)

	if err := tx.Commit(ctx); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to commit recall"})
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "recalled", "serial_number": input.SerialNumber})
}

func (h *InventoryHandler) ListItemUnits(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := h.db.Query(ctx, `
		SELECT id, part_id, receipt_id, serial_number, unit_cost_kes, status, created_at, updated_at
		FROM item_units
		ORDER BY created_at DESC
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to list item units"})
	}
	defer rows.Close()

	var items []models.ItemUnit
	for rows.Next() {
		var item models.ItemUnit
		if err := rows.Scan(&item.ID, &item.PartID, &item.ReceiptID, &item.SerialNumber, &item.UnitCostKES, &item.Status, &item.CreatedAt, &item.UpdatedAt); err == nil {
			items = append(items, item)
		}
	}
	if items == nil {
		items = []models.ItemUnit{}
	}

	return c.JSON(http.StatusOK, items)
}
