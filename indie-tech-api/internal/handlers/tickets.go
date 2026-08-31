package handlers

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/elijah-karori/indie-tech-api/internal/models"
	"github.com/elijah-karori/indie-tech-api/internal/notify"
)

type TicketHandler struct {
	DB     *pgxpool.Pool
	Notify notify.Notifier // e.g. WhatsApp sender — interface so it's swappable/mockable
}

func NewTicketHandler(db *pgxpool.Pool, n notify.Notifier) *TicketHandler {
	return &TicketHandler{DB: db, Notify: n}
}

type createTicketRequest struct {
	ClientPhone     string `json:"client_phone" validate:"required"`
	ClientName      string `json:"client_name"`
	BusinessType    string `json:"business_type"`
	DeviceType      string `json:"device_type" validate:"required"`
	Brand           string `json:"brand"`
	Model           string `json:"model"`
	SerialNumber    string `json:"serial_number"`
	IssueDesc       string `json:"issue_desc" validate:"required"`
	Priority        string `json:"priority"`         // low|normal|high|emergency
	MaintenanceType string `json:"maintenance_type"` // preventive|corrective
}

// Create handles POST /api/v1/tickets — the public-facing "book a ticket" endpoint.
func (h *TicketHandler) Create(c echo.Context) error {
	var req createTicketRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	if req.ClientPhone == "" || req.DeviceType == "" || req.IssueDesc == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "client_phone, device_type, and issue_desc are required")
	}
	priority := req.Priority
	if priority == "" {
		priority = string(models.PriorityNormal)
	}

	mType := req.MaintenanceType
	if mType != string(models.MaintenancePreventive) && mType != string(models.MaintenanceCorrective) {
		mType = string(models.MaintenanceCorrective)
	}

	ctx := c.Request().Context()
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "database error")
	}
	defer tx.Rollback(ctx)

	// Upsert client by phone.
	var clientID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO clients (name, phone, business_type)
		VALUES ($1, $2, $3)
		ON CONFLICT (phone) DO UPDATE SET name = COALESCE(NULLIF(EXCLUDED.name, ''), clients.name)
		RETURNING id
	`, req.ClientName, req.ClientPhone, req.BusinessType).Scan(&clientID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "could not save client")
	}

	// Create device record (machine management).
	var deviceID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO devices (client_id, device_type, brand, model, serial_number)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, clientID, req.DeviceType, req.Brand, req.Model, req.SerialNumber).Scan(&deviceID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "could not save device")
	}

	code, err := generateTicketCode()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "could not generate ticket code")
	}

	var ticket models.Ticket
	err = tx.QueryRow(ctx, `
		INSERT INTO tickets (ticket_code, client_id, device_id, issue_desc, priority, maintenance_type, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'received')
		RETURNING id, ticket_code, client_id, device_id, issue_desc, priority, maintenance_type, status, created_at, updated_at
	`, code, clientID, deviceID, req.IssueDesc, priority, mType).Scan(
		&ticket.ID, &ticket.TicketCode, &ticket.ClientID, &ticket.DeviceID,
		&ticket.IssueDesc, &ticket.Priority, &ticket.MaintenanceType, &ticket.Status, &ticket.CreatedAt, &ticket.UpdatedAt,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "could not create ticket")
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO ticket_events (ticket_id, status, note) VALUES ($1, 'received', 'Ticket submitted by client')
	`, ticket.ID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "could not log ticket event")
	}

	if err := tx.Commit(ctx); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "database error")
	}

	// Best-effort notification — don't fail the request if WhatsApp is down.
	go h.Notify.SendTicketStatus(context.Background(), req.ClientPhone, ticket.TicketCode, models.StatusReceived)

	return c.JSON(http.StatusCreated, ticket)
}

// Lookup handles GET /api/v1/tickets/lookup?code=TKT-XXXXX&phone=2547...
func (h *TicketHandler) Lookup(c echo.Context) error {
	code := c.QueryParam("code")
	phone := c.QueryParam("phone")
	if code == "" || phone == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "code and phone are required")
	}

	ctx := c.Request().Context()
	var ticket models.Ticket
	err := h.DB.QueryRow(ctx, `
		SELECT t.id, t.ticket_code, t.client_id, t.device_id, t.issue_desc, t.priority, t.maintenance_type,
		       t.status, t.scheduled_at, t.resolved_at, t.created_at, t.updated_at
		FROM tickets t
		JOIN clients c ON c.id = t.client_id
		WHERE t.ticket_code = $1 AND c.phone = $2
	`, code, phone).Scan(
		&ticket.ID, &ticket.TicketCode, &ticket.ClientID, &ticket.DeviceID, &ticket.IssueDesc,
		&ticket.Priority, &ticket.MaintenanceType, &ticket.Status, &ticket.ScheduledAt, &ticket.ResolvedAt,
		&ticket.CreatedAt, &ticket.UpdatedAt,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "ticket not found")
	}

	return c.JSON(http.StatusOK, ticket)
}

// List handles GET /api/v1/admin/tickets — technician-facing dashboard list.
func (h *TicketHandler) List(c echo.Context) error {
	ctx := c.Request().Context()
	statusFilter := c.QueryParam("status")

	query := `
		SELECT t.id, t.ticket_code, t.client_id, t.device_id, t.issue_desc, t.priority, t.maintenance_type,
		       t.status, t.scheduled_at, t.resolved_at, t.created_at, t.updated_at
		FROM tickets t
		WHERE ($1 = '' OR t.status = $1::ticket_status)
		ORDER BY t.created_at DESC
		LIMIT 100
	`
	rows, err := h.DB.Query(ctx, query, statusFilter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "database error")
	}
	defer rows.Close()

	tickets := []models.Ticket{}
	for rows.Next() {
		var t models.Ticket
		if err := rows.Scan(
			&t.ID, &t.TicketCode, &t.ClientID, &t.DeviceID, &t.IssueDesc,
			&t.Priority, &t.MaintenanceType, &t.Status, &t.ScheduledAt, &t.ResolvedAt, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "scan error")
		}
		tickets = append(tickets, t)
	}

	return c.JSON(http.StatusOK, tickets)
}

type updateStatusRequest struct {
	Status string `json:"status" validate:"required"` // dispatched|in_progress|resolved|cancelled
	Note   string `json:"note"`
}

func (h *TicketHandler) UpdateStatus(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid ticket id")
	}

	var req updateStatusRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	validStatuses := map[string]bool{
		"dispatched": true, "in_progress": true, "resolved": true, "cancelled": true,
	}
	if !validStatuses[req.Status] {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid status value")
	}

	ctx := c.Request().Context()
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "database error")
	}
	defer tx.Rollback(ctx)

	setResolved := ""
	if req.Status == "resolved" {
		setResolved = ", resolved_at = now()"
	}

	var clientPhone string
	var ticketCode string
	err = tx.QueryRow(ctx, `
		UPDATE tickets t SET status = $1, updated_at = now()`+setResolved+`
		FROM clients c
		WHERE t.id = $2 AND t.client_id = c.id
		RETURNING c.phone, t.ticket_code
	`, req.Status, id).Scan(&clientPhone, &ticketCode)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "ticket not found")
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO ticket_events (ticket_id, status, note) VALUES ($1, $2, $3)
	`, id, req.Status, req.Note); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "could not log ticket event")
	}

	if err := tx.Commit(ctx); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "database error")
	}

	go h.Notify.SendTicketStatus(context.Background(), clientPhone, ticketCode, models.TicketStatus(req.Status))

	return c.JSON(http.StatusOK, map[string]string{"status": "updated"})
}
