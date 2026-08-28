// Package notify wraps outbound client notifications (WhatsApp today,
// SMS could be added later behind the same interface). Handlers depend on
// the Notifier interface, not the concrete WhatsApp client, so tests can
// swap in a no-op/mock implementation.
package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/elijah-karori/indie-tech-api/internal/config"
	"github.com/elijah-karori/indie-tech-api/internal/models"
)

type Notifier interface {
	SendTicketStatus(ctx context.Context, phone, ticketCode string, status models.TicketStatus) error
}

type WhatsAppNotifier struct {
	cfg        *config.Config
	httpClient *http.Client
}

func NewWhatsAppNotifier(cfg *config.Config) *WhatsAppNotifier {
	return &WhatsAppNotifier{cfg: cfg, httpClient: &http.Client{}}
}

// statusMessage maps internal ticket statuses to client-facing copy.
// Swap this for an approved WhatsApp message template name once you've
// set up templates in Meta Business Manager (required for messages sent
// outside the 24-hour customer service window).
func statusMessage(ticketCode string, status models.TicketStatus) string {
	switch status {
	case models.StatusReceived:
		return fmt.Sprintf("Ticket %s received. We'll review and dispatch a technician shortly.", ticketCode)
	case models.StatusDispatched:
		return fmt.Sprintf("Ticket %s: technician has been dispatched and is on the way.", ticketCode)
	case models.StatusInProgress:
		return fmt.Sprintf("Ticket %s: work is currently in progress on your device.", ticketCode)
	case models.StatusResolved:
		return fmt.Sprintf("Ticket %s has been resolved. Thank you for your business!", ticketCode)
	case models.StatusCancelled:
		return fmt.Sprintf("Ticket %s has been cancelled. Contact us if this is unexpected.", ticketCode)
	default:
		return fmt.Sprintf("Ticket %s status updated: %s", ticketCode, status)
	}
}

// SendTicketStatus sends a freeform text message via the WhatsApp Business
// Cloud API. Note: Meta only allows freeform messages within a 24-hour
// window after the customer last messaged you — for the "Ticket Received"
// and other proactive nudges outside that window, you'll need an approved
// message template instead (structurally similar call, different payload).
func (w *WhatsAppNotifier) SendTicketStatus(ctx context.Context, phone, ticketCode string, status models.TicketStatus) error {
	url := fmt.Sprintf("https://graph.facebook.com/%s/%s/messages", w.cfg.WhatsAppAPIVersion, w.cfg.WhatsAppPhoneNumberID)

	payload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"to":                phone,
		"type":              "text",
		"text": map[string]string{
			"body": statusMessage(ticketCode, status),
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+w.cfg.WhatsAppAccessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := w.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("whatsapp send failed (%d): %s", resp.StatusCode, string(respBody))
	}
	return nil
}
