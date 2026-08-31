package handlers

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/elijah-karori/indie-tech-api/internal/mpesa"
)

type OrderHandler struct {
	DB    *pgxpool.Pool
	Mpesa *mpesa.Client
}

func NewOrderHandler(db *pgxpool.Pool, mpesaClient *mpesa.Client) *OrderHandler {
	return &OrderHandler{DB: db, Mpesa: mpesaClient}
}

type checkoutRequest struct {
	ClientPhone string  `json:"client_phone" validate:"required"` // 2547XXXXXXXX
	ClientName  string  `json:"client_name"`
	ItemType    string  `json:"item_type" validate:"required"` // spare_part|service_package|digital_download
	ItemRef     string  `json:"item_ref"`                       // uuid, optional (e.g. service_packages.id)
	Description string  `json:"description" validate:"required"`
	AmountKES   float64 `json:"amount_kes" validate:"required"`
}

// Checkout handles POST /api/v1/orders/checkout — creates a pending order and
// triggers the M-Pesa STK Push prompt on the client's phone in one step.
func (h *OrderHandler) Checkout(c echo.Context) error {
	var req checkoutRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	if req.ClientPhone == "" || req.ItemType == "" || req.Description == "" || req.AmountKES <= 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "client_phone, item_type, description, and amount_kes are required")
	}

	ctx := c.Request().Context()
	tx, err := h.DB.Begin(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "database error")
	}
	defer tx.Rollback(ctx)

	var clientID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO clients (name, phone)
		VALUES ($1, $2)
		ON CONFLICT (phone) DO UPDATE SET name = COALESCE(NULLIF(EXCLUDED.name, ''), clients.name)
		RETURNING id
	`, req.ClientName, req.ClientPhone).Scan(&clientID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "could not save client")
	}

	var itemRef *uuid.UUID
	if req.ItemRef != "" {
		parsed, err := uuid.Parse(req.ItemRef)
		if err == nil {
			itemRef = &parsed
		}
	}

	var orderID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO orders (client_id, item_type, item_ref, description, amount_kes, status)
		VALUES ($1, $2, $3, $4, $5, 'pending')
		RETURNING id
	`, clientID, req.ItemType, itemRef, req.Description, req.AmountKES).Scan(&orderID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "could not create order")
	}

	if err := tx.Commit(ctx); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "database error")
	}

	stkResp, err := h.Mpesa.InitiateSTKPush(ctx, mpesa.STKPushRequest{
		PhoneNumber: req.ClientPhone,
		Amount:      req.AmountKES,
		AccountRef:  orderID.String()[:8], // short ref shown on the STK prompt
		Description: req.Description,
	})
	if err != nil {
		// Order exists but STK push failed to send — mark it failed rather
		// than leaving it silently pending forever.
		_, _ = h.DB.Exec(ctx, `UPDATE orders SET status = 'failed', updated_at = now() WHERE id = $1`, orderID)
		return echo.NewHTTPError(http.StatusBadGateway, "could not initiate M-Pesa payment: "+err.Error())
	}

	if _, err := h.DB.Exec(ctx, `
		UPDATE orders SET mpesa_checkout_id = $1, updated_at = now() WHERE id = $2
	`, stkResp.CheckoutRequestID, orderID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "could not save checkout reference")
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"order_id":         orderID,
		"checkout_request": stkResp.CheckoutRequestID,
		"customer_message": stkResp.CustomerMessage,
	})
}

// Status handles GET /api/v1/orders/:id/status — lets the checkout UI poll
// for payment confirmation after the STK prompt fires, since the actual
// confirmation arrives async via the M-Pesa callback webhook. Public/no auth
// by design (same reasoning as ticket lookup) — only exposes status + amount,
// nothing sensitive.
func (h *OrderHandler) Status(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid order id")
	}

	ctx := c.Request().Context()
	var status string
	var amount float64
	var receipt *string
	err = h.DB.QueryRow(ctx, `
		SELECT status, amount_kes, mpesa_receipt FROM orders WHERE id = $1
	`, id).Scan(&status, &amount, &receipt)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "order not found")
	}

	resp := map[string]interface{}{
		"order_id":   id,
		"status":     status,
		"amount_kes": amount,
	}
	if receipt != nil {
		resp["mpesa_receipt"] = *receipt
	}
	return c.JSON(http.StatusOK, resp)
}
