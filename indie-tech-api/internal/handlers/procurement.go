package handlers

import (
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/elijah-karori/indie-tech-api/internal/models"
)

type ProcurementHandler struct {
	db *pgxpool.Pool
}

func NewProcurementHandler(db *pgxpool.Pool) *ProcurementHandler {
	return &ProcurementHandler{db: db}
}

type CreateSupplierInput struct {
	Name         string  `json:"name"`
	ContactPhone string  `json:"contact_phone"`
	ContactEmail string  `json:"contact_email"`
	Rating       float64 `json:"rating"`
}

func (h *ProcurementHandler) CreateSupplier(c echo.Context) error {
	var input CreateSupplierInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid input"})
	}
	if input.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "supplier name is required"})
	}
	if input.Rating <= 0 {
		input.Rating = 5.0
	}

	ctx := c.Request().Context()
	var s models.Supplier
	err := h.db.QueryRow(ctx, `
		INSERT INTO suppliers (name, contact_phone, contact_email, rating)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, COALESCE(contact_phone, ''), COALESCE(contact_email, ''), rating, created_at
	`, input.Name, input.ContactPhone, input.ContactEmail, input.Rating).Scan(
		&s.ID, &s.Name, &s.ContactPhone, &s.ContactEmail, &s.Rating, &s.CreatedAt,
	)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to create supplier"})
	}

	return c.JSON(http.StatusCreated, s)
}

func (h *ProcurementHandler) ListSuppliers(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := h.db.Query(ctx, `
		SELECT id, name, COALESCE(contact_phone, ''), COALESCE(contact_email, ''), rating, created_at
		FROM suppliers
		ORDER BY name ASC
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to list suppliers"})
	}
	defer rows.Close()

	var list []models.Supplier
	for rows.Next() {
		var s models.Supplier
		if err := rows.Scan(&s.ID, &s.Name, &s.ContactPhone, &s.ContactEmail, &s.Rating, &s.CreatedAt); err == nil {
			list = append(list, s)
		}
	}
	if list == nil {
		list = []models.Supplier{}
	}

	return c.JSON(http.StatusOK, list)
}

type CreatePOLineInput struct {
	PONumber     string    `json:"po_number"`
	SupplierID   uuid.UUID `json:"supplier_id"`
	PartID       uuid.UUID `json:"part_id"`
	Quantity     int       `json:"quantity"`
	UnitPriceKES float64   `json:"unit_price_kes"`
}

func (h *ProcurementHandler) CreatePOLine(c echo.Context) error {
	var input CreatePOLineInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid input"})
	}
	if input.PONumber == "" || input.SupplierID == uuid.Nil || input.PartID == uuid.Nil || input.Quantity <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "po_number, supplier_id, part_id, and quantity > 0 required"})
	}

	ctx := c.Request().Context()
	var poLineID uuid.UUID
	err := h.db.QueryRow(ctx, `
		INSERT INTO po_lines (po_number, supplier_id, part_id, quantity, unit_price_kes)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, input.PONumber, input.SupplierID, input.PartID, input.Quantity, input.UnitPriceKES).Scan(&poLineID)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to create po line"})
	}

	// Record price history entry
	_, _ = h.db.Exec(ctx, `
		INSERT INTO price_history (part_id, supplier_id, price_kes)
		VALUES ($1, $2, $3)
	`, input.PartID, input.SupplierID, input.UnitPriceKES)

	return c.JSON(http.StatusCreated, map[string]interface{}{"id": poLineID, "status": "created"})
}

type ProcessReceiptInput struct {
	POLineID      uuid.UUID `json:"po_line_id"`
	ReceivedQty   int       `json:"received_qty"`
	SerialPrefix  string    `json:"serial_prefix"` // Optional prefix e.g. "SN-KYOCERA-"
}

func (h *ProcurementHandler) ProcessReceipt(c echo.Context) error {
	var input ProcessReceiptInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid payload"})
	}

	if input.POLineID == uuid.Nil || input.ReceivedQty <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "po_line_id and received_qty > 0 required"})
	}

	ctx := c.Request().Context()
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "database error"})
	}
	defer tx.Rollback(ctx)

	var partID uuid.UUID
	var unitPrice float64
	err = tx.QueryRow(ctx, `
		SELECT part_id, unit_price_kes FROM po_lines WHERE id = $1
	`, input.POLineID).Scan(&partID, &unitPrice)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "po_line not found"})
	}

	var receiptID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO receipts (po_line_id, received_qty)
		VALUES ($1, $2)
		RETURNING id
	`, input.POLineID, input.ReceivedQty).Scan(&receiptID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to create receipt"})
	}

	prefix := input.SerialPrefix
	if prefix == "" {
		prefix = "SN-"
	}

	// Spawn individual serialized ITEM_UNITS with locked unit_cost_kes
	createdUnits := []models.ItemUnit{}
	for i := 1; i <= input.ReceivedQty; i++ {
		sn := fmt.Sprintf("%s%s-%04d", prefix, receiptID.String()[:8], i)
		var iu models.ItemUnit
		err := tx.QueryRow(ctx, `
			INSERT INTO item_units (part_id, receipt_id, serial_number, unit_cost_kes, status)
			VALUES ($1, $2, $3, $4, 'in_stock')
			RETURNING id, part_id, receipt_id, serial_number, unit_cost_kes, status, created_at, updated_at
		`, partID, receiptID, sn, unitPrice).Scan(
			&iu.ID, &iu.PartID, &iu.ReceiptID, &iu.SerialNumber, &iu.UnitCostKES, &iu.Status, &iu.CreatedAt, &iu.UpdatedAt,
		)
		if err == nil {
			createdUnits = append(createdUnits, iu)
			// Ledger entry
			_, _ = tx.Exec(ctx, `
				INSERT INTO unit_transactions (item_unit_id, action, note)
				VALUES ($1, 'receive', $2)
			`, iu.ID, "Received from PO Line "+input.POLineID.String())
		}
	}

	// Update overall stock quantity on parts table
	_, _ = tx.Exec(ctx, `
		UPDATE parts SET stock_qty = stock_qty + $1, updated_at = NOW() WHERE id = $2
	`, input.ReceivedQty, partID)

	if err := tx.Commit(ctx); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to commit receipt"})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"receipt_id":  receiptID,
		"units_count": len(createdUnits),
		"item_units":  createdUnits,
	})
}
