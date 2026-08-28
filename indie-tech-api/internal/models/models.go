package models

import (
	"time"

	"github.com/google/uuid"
)

type Client struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Phone        string    `json:"phone"`
	BusinessType string    `json:"business_type,omitempty"`
	Location     string    `json:"location,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type Device struct {
	ID           uuid.UUID `json:"id"`
	ClientID     uuid.UUID `json:"client_id"`
	DeviceType   string    `json:"device_type"`
	Brand        string    `json:"brand,omitempty"`
	Model        string    `json:"model,omitempty"`
	SerialNumber string    `json:"serial_number,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type TicketStatus string

const (
	StatusReceived   TicketStatus = "received"
	StatusDispatched TicketStatus = "dispatched"
	StatusInProgress TicketStatus = "in_progress"
	StatusResolved   TicketStatus = "resolved"
	StatusCancelled  TicketStatus = "cancelled"
)

type TicketPriority string

const (
	PriorityLow       TicketPriority = "low"
	PriorityNormal    TicketPriority = "normal"
	PriorityHigh      TicketPriority = "high"
	PriorityEmergency TicketPriority = "emergency"
)

type Ticket struct {
	ID          uuid.UUID      `json:"id"`
	TicketCode  string         `json:"ticket_code"`
	ClientID    uuid.UUID      `json:"client_id"`
	DeviceID    *uuid.UUID     `json:"device_id,omitempty"`
	IssueDesc   string         `json:"issue_desc"`
	Priority    TicketPriority `json:"priority"`
	Status      TicketStatus   `json:"status"`
	ScheduledAt *time.Time     `json:"scheduled_at,omitempty"`
	ResolvedAt  *time.Time     `json:"resolved_at,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type TicketEvent struct {
	ID        uuid.UUID    `json:"id"`
	TicketID  uuid.UUID    `json:"ticket_id"`
	Status    TicketStatus `json:"status"`
	Note      string       `json:"note,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
}

type PackageCadence string

const (
	CadenceOneTime   PackageCadence = "one_time"
	CadenceMonthly   PackageCadence = "monthly"
	CadenceQuarterly PackageCadence = "quarterly"
	CadenceAnnual    PackageCadence = "annual"
)

type ServicePackage struct {
	ID          uuid.UUID      `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	PriceKES    float64        `json:"price_kes"`
	Cadence     PackageCadence `json:"cadence"`
	Active      bool           `json:"active"`
	CreatedAt   time.Time      `json:"created_at"`
}

type Part struct {
	ID          uuid.UUID `json:"id"`
	SKU         string    `json:"sku"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	PriceKES    float64   `json:"price_kes"`
	StockQty    int       `json:"stock_qty"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type OrderStatus string

const (
	OrderPending  OrderStatus = "pending"
	OrderPaid     OrderStatus = "paid"
	OrderFailed   OrderStatus = "failed"
	OrderRefunded OrderStatus = "refunded"
)

type Order struct {
	ID               uuid.UUID   `json:"id"`
	ClientID         uuid.UUID   `json:"client_id"`
	ItemType         string      `json:"item_type"` // spare_part | service_package | digital_download
	ItemRef          *uuid.UUID  `json:"item_ref,omitempty"`
	Description      string      `json:"description"`
	AmountKES        float64     `json:"amount_kes"`
	Status           OrderStatus `json:"status"`
	MpesaCheckoutID  string      `json:"mpesa_checkout_id,omitempty"`
	MpesaReceipt     string      `json:"mpesa_receipt,omitempty"`
	CreatedAt        time.Time   `json:"created_at"`
	UpdatedAt        time.Time   `json:"updated_at"`
}

type BlogPost struct {
	ID          uuid.UUID  `json:"id"`
	Slug        string     `json:"slug"`
	Title       string     `json:"title"`
	BodyMD      string     `json:"body_md"`
	Excerpt     string     `json:"excerpt,omitempty"`
	PublishedAt *time.Time `json:"published_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
