package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/elijah-karori/indie-tech-api/internal/models"
)

type JobCardHandler struct {
	db *pgxpool.Pool
}

func NewJobCardHandler(db *pgxpool.Pool) *JobCardHandler {
	return &JobCardHandler{db: db}
}

func generateJobCardCode() string {
	b := make([]byte, 3)
	_, _ = rand.Read(b)
	return fmt.Sprintf("JOB-%s", strings.ToUpper(hex.EncodeToString(b)))
}

type CreateJobCardInput struct {
	TicketID       uuid.UUID `json:"ticket_id"`
	TechnicianName string    `json:"technician_name"`
	WorkDone       string    `json:"work_done"`
	PartsUsed      []string  `json:"parts_used"`
	ServiceReport  string    `json:"service_report"`
}

func (h *JobCardHandler) Create(c echo.Context) error {
	var input CreateJobCardInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid payload"})
	}

	if input.TicketID == uuid.Nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "ticket_id is required"})
	}

	ctx := c.Request().Context()

	// Get device_id from ticket
	var deviceID *uuid.UUID
	_ = h.db.QueryRow(ctx, `SELECT device_id FROM tickets WHERE id = $1`, input.TicketID).Scan(&deviceID)

	code := generateJobCardCode()
	partsJSON, _ := json.Marshal(input.PartsUsed)

	var jc models.JobCard
	err := h.db.QueryRow(ctx, `
		INSERT INTO job_cards (job_card_code, ticket_id, device_id, technician_name, work_done, parts_used, status, service_report)
		VALUES ($1, $2, $3, $4, $5, $6, 'opened', $7)
		RETURNING id, job_card_code, ticket_id, device_id, COALESCE(technician_name, ''), COALESCE(work_done, ''), status, COALESCE(service_report, ''), created_at, updated_at
	`, code, input.TicketID, deviceID, input.TechnicianName, input.WorkDone, partsJSON, input.ServiceReport).Scan(
		&jc.ID, &jc.JobCardCode, &jc.TicketID, &jc.DeviceID, &jc.TechnicianName, &jc.WorkDone, &jc.Status, &jc.ServiceReport, &jc.CreatedAt, &jc.UpdatedAt,
	)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to create job card"})
	}

	jc.PartsUsed = input.PartsUsed

	return c.JSON(http.StatusCreated, jc)
}

func (h *JobCardHandler) GetByCode(c echo.Context) error {
	code := c.Param("code")
	if code == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "job card code required"})
	}

	ctx := c.Request().Context()
	var jc models.JobCard
	var partsRaw []byte

	err := h.db.QueryRow(ctx, `
		SELECT id, job_card_code, ticket_id, device_id, COALESCE(technician_name, ''), COALESCE(work_done, ''), parts_used, status, COALESCE(service_report, ''), completed_at, created_at, updated_at
		FROM job_cards
		WHERE job_card_code = $1
	`, code).Scan(
		&jc.ID, &jc.JobCardCode, &jc.TicketID, &jc.DeviceID, &jc.TechnicianName, &jc.WorkDone, &partsRaw, &jc.Status, &jc.ServiceReport, &jc.CompletedAt, &jc.CreatedAt, &jc.UpdatedAt,
	)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "job card not found"})
	}

	if len(partsRaw) > 0 {
		_ = json.Unmarshal(partsRaw, &jc.PartsUsed)
	}

	return c.JSON(http.StatusOK, jc)
}

func (h *JobCardHandler) GetByTicket(c echo.Context) error {
	ticketID := c.Param("ticket_id")
	if ticketID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "ticket_id required"})
	}

	ctx := c.Request().Context()
	rows, err := h.db.Query(ctx, `
		SELECT id, job_card_code, ticket_id, device_id, COALESCE(technician_name, ''), COALESCE(work_done, ''), parts_used, status, COALESCE(service_report, ''), completed_at, created_at, updated_at
		FROM job_cards
		WHERE ticket_id = $1
		ORDER BY created_at DESC
	`, ticketID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to fetch job cards"})
	}
	defer rows.Close()

	var cards []models.JobCard
	for rows.Next() {
		var jc models.JobCard
		var partsRaw []byte
		if err := rows.Scan(&jc.ID, &jc.JobCardCode, &jc.TicketID, &jc.DeviceID, &jc.TechnicianName, &jc.WorkDone, &partsRaw, &jc.Status, &jc.ServiceReport, &jc.CompletedAt, &jc.CreatedAt, &jc.UpdatedAt); err == nil {
			if len(partsRaw) > 0 {
				_ = json.Unmarshal(partsRaw, &jc.PartsUsed)
			}
			cards = append(cards, jc)
		}
	}
	if cards == nil {
		cards = []models.JobCard{}
	}

	return c.JSON(http.StatusOK, cards)
}
