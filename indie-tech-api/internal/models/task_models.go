package models

import (
	"time"

	"github.com/google/uuid"
)

type Customer struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email,omitempty"`
	Phone        string    `json:"phone"`
	CustomerType string    `json:"customer_type"` // 'enterprise', 'personal'
	CreatedAt    time.Time `json:"created_at"`
}

type Technician struct {
	ID                uuid.UUID `json:"id"`
	Name              string    `json:"name"`
	Email             string    `json:"email,omitempty"`
	Phone             string    `json:"phone"`
	Level             string    `json:"level"` // 'junior', 'intermediate', 'senior', 'master'
	BaseCalloutFeeKES float64   `json:"base_callout_fee_kes"`
	OverallRating     float64   `json:"overall_rating"`
	RatingCount       int       `json:"rating_count"`
	CreatedAt         time.Time `json:"created_at"`
}

type MachineCategory struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Code      string    `json:"code"`
	CreatedAt time.Time `json:"created_at"`
}

type TechnicianRateCard struct {
	ID                uuid.UUID  `json:"id"`
	TechnicianID      uuid.UUID  `json:"technician_id"`
	ServiceType       string     `json:"service_type"` // 'corrective', 'preventive', 'contract_based', 'project_based', 'one_time'
	MachineCategoryID *uuid.UUID `json:"machine_category_id,omitempty"`
	RateKES           float64    `json:"rate_kes"`
	CreatedAt         time.Time  `json:"created_at"`
}

type TechnicianMachineExperience struct {
	TechnicianID       uuid.UUID `json:"technician_id"`
	MachineCategoryID  uuid.UUID `json:"machine_category_id"`
	JobsCompletedCount int       `json:"jobs_completed_count"`
}

type Task struct {
	ID                   uuid.UUID  `json:"id"`
	CustomerID           uuid.UUID  `json:"customer_id"`
	CustomerType         string     `json:"customer_type"` // 'enterprise', 'personal'
	ServiceType          string     `json:"service_type"`  // 'corrective', 'preventive', 'contract_based', 'project_based', 'one_time'
	MachineCategoryID    *uuid.UUID `json:"machine_category_id,omitempty"`
	Title                string     `json:"title"`
	Description          string     `json:"description,omitempty"`
	TargetPriceKES       *float64   `json:"target_price_kes,omitempty"`
	EarliestStartTime    *time.Time `json:"earliest_start_time,omitempty"`
	DeadlineTime         *time.Time `json:"deadline_time,omitempty"`
	State                string     `json:"state"` // 'draft', 'open_for_bidding', 'assigned', 'in_progress', 'completed', 'cancelled', 'bidding_closed'
	AssignedTechnicianID *uuid.UUID `json:"assigned_technician_id,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

type Bid struct {
	ID                uuid.UUID  `json:"id"`
	TaskID            uuid.UUID  `json:"task_id"`
	TechnicianID      uuid.UUID  `json:"technician_id"`
	BidAmountKES      float64    `json:"bid_amount_kes"`
	ProposedStartTime *time.Time `json:"proposed_start_time,omitempty"`
	Status            string     `json:"status"` // 'submitted', 'accepted', 'rejected'
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type Rating struct {
	ID           uuid.UUID `json:"id"`
	TaskID       uuid.UUID `json:"task_id"`
	TechnicianID uuid.UUID `json:"technician_id"`
	CustomerID   uuid.UUID `json:"customer_id"`
	Score        float64   `json:"score"`
	ReviewText   string    `json:"review_text,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}
