package handlers

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/elijah-karori/indie-tech-api/internal/models"
)

type ReliabilityHandler struct {
	db *pgxpool.Pool
}

func NewReliabilityHandler(db *pgxpool.Pool) *ReliabilityHandler {
	return &ReliabilityHandler{db: db}
}

type RecordFailureInput struct {
	DeviceID          uuid.UUID  `json:"device_id"`
	FailedUnitID      uuid.UUID  `json:"failed_unit_id"`
	ReplacementUnitID *uuid.UUID `json:"replacement_unit_id,omitempty"`
	TicketID          *uuid.UUID `json:"ticket_id,omitempty"`
	FailureReason     string     `json:"failure_reason"`
	OperatingHours    int        `json:"operating_hours"`
}

func (h *ReliabilityHandler) RecordFailure(c echo.Context) error {
	var input RecordFailureInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid input"})
	}

	if input.DeviceID == uuid.Nil || input.FailedUnitID == uuid.Nil || input.FailureReason == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "device_id, failed_unit_id, and failure_reason are required"})
	}

	ctx := c.Request().Context()
	var fe models.FailureEvent
	err := h.db.QueryRow(ctx, `
		INSERT INTO failure_events (device_id, failed_unit_id, replacement_unit_id, ticket_id, failure_reason, operating_hours)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, device_id, failed_unit_id, replacement_unit_id, ticket_id, failure_reason, operating_hours, occurred_at, created_at
	`, input.DeviceID, input.FailedUnitID, input.ReplacementUnitID, input.TicketID, input.FailureReason, input.OperatingHours).Scan(
		&fe.ID, &fe.DeviceID, &fe.FailedUnitID, &fe.ReplacementUnitID, &fe.TicketID, &fe.FailureReason, &fe.OperatingHours, &fe.OccurredAt, &fe.CreatedAt,
	)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to record failure event"})
	}

	// Update failed unit status
	_, _ = h.db.Exec(ctx, `UPDATE item_units SET status = 'failed', updated_at = NOW() WHERE id = $1`, input.FailedUnitID)

	return c.JSON(http.StatusCreated, fe)
}

func (h *ReliabilityHandler) GetMTBFByModel(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := h.db.Query(ctx, `
		SELECT brand, model, total_failures, avg_operating_hours_to_failure, mtbf_hours
		FROM analytics.mv_mtbf_by_model
	`)
	if err != nil {
		// Fallback query directly from base tables if view is refreshing or empty
		rows, err = h.db.Query(ctx, `
			SELECT
				d.brand,
				d.model,
				COUNT(DISTINCT fe.id) AS total_failures,
				COALESCE(AVG(fe.operating_hours), 0) AS avg_operating_hours_to_failure,
				CASE
					WHEN COUNT(DISTINCT fe.id) > 0 THEN ROUND((SUM(COALESCE(fe.operating_hours, 1000))::numeric / COUNT(DISTINCT fe.id)), 2)
					ELSE 0
				END AS mtbf_hours
			FROM devices d
			LEFT JOIN failure_events fe ON fe.device_id = d.id
			GROUP BY d.brand, d.model
		`)
		if err != nil {
			return c.JSON(http.StatusOK, []models.MTBFByModel{})
		}
	}
	defer rows.Close()

	var list []models.MTBFByModel
	for rows.Next() {
		var item models.MTBFByModel
		if err := rows.Scan(&item.Brand, &item.Model, &item.TotalFailures, &item.AvgOperatingHoursFailure, &item.MTBFHours); err == nil {
			list = append(list, item)
		}
	}
	if list == nil {
		list = []models.MTBFByModel{}
	}

	return c.JSON(http.StatusOK, list)
}

func (h *ReliabilityHandler) GetSupplierFailureRates(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := h.db.Query(ctx, `
		SELECT supplier_id, supplier_name, total_units_received, total_failed_units, failure_rate_percentage
		FROM analytics.mv_supplier_failure_rates
	`)
	if err != nil {
		// Fallback direct query
		rows, err = h.db.Query(ctx, `
			SELECT
				s.id AS supplier_id,
				s.name AS supplier_name,
				COUNT(DISTINCT iu.id) AS total_units_received,
				COUNT(DISTINCT fe.id) AS total_failed_units,
				CASE
					WHEN COUNT(DISTINCT iu.id) > 0 THEN ROUND((COUNT(DISTINCT fe.id)::numeric / COUNT(DISTINCT iu.id)::numeric) * 100, 2)
					ELSE 0
				END AS failure_rate_percentage
			FROM suppliers s
			LEFT JOIN po_lines pol ON pol.supplier_id = s.id
			LEFT JOIN receipts r ON r.po_line_id = pol.id
			LEFT JOIN item_units iu ON iu.receipt_id = r.id
			LEFT JOIN failure_events fe ON fe.failed_unit_id = iu.id
			GROUP BY s.id, s.name
		`)
		if err != nil {
			return c.JSON(http.StatusOK, []models.SupplierFailureRate{})
		}
	}
	defer rows.Close()

	var list []models.SupplierFailureRate
	for rows.Next() {
		var item models.SupplierFailureRate
		if err := rows.Scan(&item.SupplierID, &item.SupplierName, &item.TotalUnitsReceived, &item.TotalFailedUnits, &item.FailureRatePercentage); err == nil {
			list = append(list, item)
		}
	}
	if list == nil {
		list = []models.SupplierFailureRate{}
	}

	return c.JSON(http.StatusOK, list)
}
