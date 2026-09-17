package handlers

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/elijah-karori/indie-tech-api/internal/models"
	"github.com/elijah-karori/indie-tech-api/internal/scoring"
)

type TaskHandler struct {
	db *pgxpool.Pool
}

func NewTaskHandler(db *pgxpool.Pool) *TaskHandler {
	return &TaskHandler{db: db}
}

type CreateTaskInput struct {
	CustomerID        uuid.UUID  `json:"customer_id"`
	CustomerType      string     `json:"customer_type"` // 'enterprise', 'personal'
	ServiceType       string     `json:"service_type"`  // 'corrective', 'preventive', 'contract_based', 'project_based', 'one_time'
	MachineCategoryID *uuid.UUID `json:"machine_category_id,omitempty"`
	Title             string     `json:"title"`
	Description       string     `json:"description,omitempty"`
	TargetPriceKES    *float64   `json:"target_price_kes,omitempty"`
	EarliestStartTime *time.Time `json:"earliest_start_time,omitempty"`
	DeadlineTime      *time.Time `json:"deadline_time,omitempty"`
}

func (h *TaskHandler) CreateTask(c echo.Context) error {
	var input CreateTaskInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid input payload"})
	}

	if input.CustomerID == uuid.Nil || input.Title == "" || input.ServiceType == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "customer_id, title, and service_type are required"})
	}

	if input.CustomerType == "" {
		input.CustomerType = "personal"
	}

	ctx := c.Request().Context()
	var task models.Task
	err := h.db.QueryRow(ctx, `
		INSERT INTO tasks (customer_id, customer_type, service_type, machine_category_id, title, description, target_price_kes, earliest_start_time, deadline_time, state)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open_for_bidding')
		RETURNING id, customer_id, customer_type, service_type, machine_category_id, title, COALESCE(description, ''), target_price_kes, earliest_start_time, deadline_time, state, created_at, updated_at
	`, input.CustomerID, input.CustomerType, input.ServiceType, input.MachineCategoryID, input.Title, input.Description, input.TargetPriceKES, input.EarliestStartTime, input.DeadlineTime).Scan(
		&task.ID, &task.CustomerID, &task.CustomerType, &task.ServiceType, &task.MachineCategoryID, &task.Title, &task.Description, &task.TargetPriceKES, &task.EarliestStartTime, &task.DeadlineTime, &task.State, &task.CreatedAt, &task.UpdatedAt,
	)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to create task"})
	}

	return c.JSON(http.StatusCreated, task)
}

type SubmitBidInput struct {
	TaskID            uuid.UUID  `json:"task_id"`
	TechnicianID      uuid.UUID  `json:"technician_id"`
	BidAmountKES      float64    `json:"bid_amount_kes"`
	ProposedStartTime *time.Time `json:"proposed_start_time,omitempty"`
}

func (h *TaskHandler) SubmitBid(c echo.Context) error {
	var input SubmitBidInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid input payload"})
	}

	if input.TaskID == uuid.Nil || input.TechnicianID == uuid.Nil || input.BidAmountKES <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "task_id, technician_id, and positive bid_amount_kes required"})
	}

	ctx := c.Request().Context()
	var bid models.Bid
	err := h.db.QueryRow(ctx, `
		INSERT INTO bids (task_id, technician_id, bid_amount_kes, proposed_start_time, status)
		VALUES ($1, $2, $3, $4, 'submitted')
		ON CONFLICT (task_id, technician_id) DO UPDATE SET
			bid_amount_kes = EXCLUDED.bid_amount_kes,
			proposed_start_time = EXCLUDED.proposed_start_time,
			status = 'submitted',
			updated_at = NOW()
		RETURNING id, task_id, technician_id, bid_amount_kes, proposed_start_time, status, created_at, updated_at
	`, input.TaskID, input.TechnicianID, input.BidAmountKES, input.ProposedStartTime).Scan(
		&bid.ID, &bid.TaskID, &bid.TechnicianID, &bid.BidAmountKES, &bid.ProposedStartTime, &bid.Status, &bid.CreatedAt, &bid.UpdatedAt,
	)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to submit bid"})
	}

	return c.JSON(http.StatusOK, bid)
}

func (h *TaskHandler) GetTaskBidsRanked(c echo.Context) error {
	taskIDStr := c.Param("id")
	taskID, err := uuid.Parse(taskIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid task id"})
	}

	ctx := c.Request().Context()

	var task models.Task
	err = h.db.QueryRow(ctx, `
		SELECT id, customer_id, customer_type, service_type, machine_category_id, title, COALESCE(description, ''), target_price_kes, earliest_start_time, deadline_time, state, created_at, updated_at
		FROM tasks WHERE id = $1
	`, taskID).Scan(
		&task.ID, &task.CustomerID, &task.CustomerType, &task.ServiceType, &task.MachineCategoryID, &task.Title, &task.Description, &task.TargetPriceKES, &task.EarliestStartTime, &task.DeadlineTime, &task.State, &task.CreatedAt, &task.UpdatedAt,
	)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "task not found"})
	}

	rows, err := h.db.Query(ctx, `
		SELECT id, task_id, technician_id, bid_amount_kes, proposed_start_time, status, created_at, updated_at
		FROM bids WHERE task_id = $1
	`, taskID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to read bids"})
	}
	defer rows.Close()

	var bids []models.Bid
	techIDs := make(map[uuid.UUID]bool)
	for rows.Next() {
		var b models.Bid
		if err := rows.Scan(&b.ID, &b.TaskID, &b.TechnicianID, &b.BidAmountKES, &b.ProposedStartTime, &b.Status, &b.CreatedAt, &b.UpdatedAt); err == nil {
			bids = append(bids, b)
			techIDs[b.TechnicianID] = true
		}
	}

	techs := make(map[uuid.UUID]models.Technician)
	for tid := range techIDs {
		var t models.Technician
		err := h.db.QueryRow(ctx, `
			SELECT id, name, COALESCE(email, ''), phone, level, base_callout_fee_kes, overall_rating, rating_count, created_at
			FROM technicians WHERE id = $1
		`, tid).Scan(&t.ID, &t.Name, &t.Email, &t.Phone, &t.Level, &t.BaseCalloutFeeKES, &t.OverallRating, &t.RatingCount, &t.CreatedAt)
		if err == nil {
			techs[tid] = t
		}
	}

	repo := scoring.NewDBRepo(h.db)
	scoredBids, err := scoring.RankBids(ctx, repo, task, bids, techs)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to rank bids"})
	}

	if scoredBids == nil {
		scoredBids = []scoring.ScoredBid{}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"task":  task,
		"bids":  scoredBids,
		"total": len(scoredBids),
	})
}

type AcceptBidInput struct {
	BidID uuid.UUID `json:"bid_id"`
}

func (h *TaskHandler) AcceptBid(c echo.Context) error {
	taskIDStr := c.Param("id")
	taskID, err := uuid.Parse(taskIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid task id"})
	}

	var input AcceptBidInput
	if err := c.Bind(&input); err != nil || input.BidID == uuid.Nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "bid_id is required"})
	}

	ctx := c.Request().Context()
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "transaction error"})
	}
	defer tx.Rollback(ctx)

	var currentState string
	err = tx.QueryRow(ctx, `SELECT state FROM tasks WHERE id = $1 FOR UPDATE`, taskID).Scan(&currentState)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "task not found"})
	}

	if currentState != "open_for_bidding" {
		return c.JSON(http.StatusConflict, map[string]string{"message": "task is not open for bidding"})
	}

	var techID uuid.UUID
	err = tx.QueryRow(ctx, `
		UPDATE bids SET status = 'accepted', updated_at = NOW()
		WHERE id = $1 AND task_id = $2
		RETURNING technician_id
	`, input.BidID, taskID).Scan(&techID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "bid not found for this task"})
	}

	_, _ = tx.Exec(ctx, `
		UPDATE bids SET status = 'rejected', updated_at = NOW()
		WHERE task_id = $1 AND id != $2
	`, taskID, input.BidID)

	_, err = tx.Exec(ctx, `
		UPDATE tasks
		SET state = 'assigned', assigned_technician_id = $1, updated_at = NOW()
		WHERE id = $2
	`, techID, taskID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to update task status"})
	}

	if err := tx.Commit(ctx); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to commit transaction"})
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "accepted", "assigned_technician_id": techID.String()})
}

type SubmitRatingInput struct {
	TaskID       uuid.UUID `json:"task_id"`
	TechnicianID uuid.UUID `json:"technician_id"`
	CustomerID   uuid.UUID `json:"customer_id"`
	Score        float64   `json:"score"`
	ReviewText   string    `json:"review_text"`
}

func (h *TaskHandler) SubmitRating(c echo.Context) error {
	var input SubmitRatingInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid payload"})
	}

	if input.TaskID == uuid.Nil || input.TechnicianID == uuid.Nil || input.CustomerID == uuid.Nil || input.Score < 1.0 || input.Score > 5.0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "task_id, technician_id, customer_id, and score between 1.0 and 5.0 required"})
	}

	ctx := c.Request().Context()
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "transaction error"})
	}
	defer tx.Rollback(ctx)

	var ratingID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO ratings (task_id, technician_id, customer_id, score, review_text)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, input.TaskID, input.TechnicianID, input.CustomerID, input.Score, input.ReviewText).Scan(&ratingID)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to insert rating"})
	}

	// Incremental O(1) rating update:
	// new_avg = ((old_avg * old_count) + new_score) / (old_count + 1)
	_, err = tx.Exec(ctx, `
		UPDATE technicians
		SET overall_rating = ((overall_rating * rating_count) + $1) / (rating_count + 1),
		    rating_count = rating_count + 1
		WHERE id = $2
	`, input.Score, input.TechnicianID)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to update technician rating"})
	}

	if err := tx.Commit(ctx); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to commit rating"})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"rating_id": ratingID,
		"status":    "submitted",
	})
}
