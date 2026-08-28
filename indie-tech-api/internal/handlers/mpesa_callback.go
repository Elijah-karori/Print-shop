package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/elijah-karori/indie-tech-api/internal/mpesa"
)

type MpesaCallbackHandler struct {
	DB *pgxpool.Pool
}

func NewMpesaCallbackHandler(db *pgxpool.Pool) *MpesaCallbackHandler {
	return &MpesaCallbackHandler{DB: db}
}

// HandleCallback handles POST /api/v1/mpesa/callback — the webhook Safaricom
// calls once the customer enters their PIN (or cancels/times out).
//
// IMPORTANT: Safaricom expects a 200 response with a specific JSON ack body
// regardless of what you do internally — if you don't ack correctly, Daraja
// will retry the callback repeatedly.
func (h *MpesaCallbackHandler) HandleCallback(c echo.Context) error {
	var payload mpesa.CallbackPayload
	if err := c.Bind(&payload); err != nil {
		// Still ack with 200 so Safaricom doesn't retry a malformed payload forever.
		return ackOK(c)
	}

	ctx := c.Request().Context()
	checkoutID := payload.Body.StkCallback.CheckoutRequestID
	resultCode := payload.Body.StkCallback.ResultCode

	if resultCode == 0 {
		// Success — mark order paid, store the receipt, and if this was a
		// spare-part purchase, decrement stock by 1. NOTE: orders currently
		// have no quantity field, so this assumes qty=1 per order — if you
		// ever add a quantity selector to checkout, this decrement needs to
		// use that value instead of a hardcoded 1.
		receipt := payload.ExtractReceipt()
		var itemType string
		var itemRef *string
		err := h.DB.QueryRow(ctx, `
			UPDATE orders SET status = 'paid', mpesa_receipt = $1, updated_at = now()
			WHERE mpesa_checkout_id = $2
			RETURNING item_type, item_ref::text
		`, receipt, checkoutID).Scan(&itemType, &itemRef)

		if err == nil && itemType == "spare_part" && itemRef != nil {
			_, _ = h.DB.Exec(ctx, `
				UPDATE parts SET stock_qty = GREATEST(stock_qty - 1, 0), updated_at = now()
				WHERE id = $1
			`, *itemRef)
		}
	} else {
		// Cancelled, insufficient funds, timeout, etc. — resultCode/desc explain why.
		_, _ = h.DB.Exec(ctx, `
			UPDATE orders SET status = 'failed', updated_at = now()
			WHERE mpesa_checkout_id = $1
		`, checkoutID)
	}

	return ackOK(c)
}

func ackOK(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"ResultCode": "0",
		"ResultDesc": "Accepted",
	})
}
