package routes

import (
	supa "github.com/supabase-community/supabase-go"
	"github.com/labstack/echo/v4"

	"github.com/elijah-karori/indie-tech-api/internal/config"
	"github.com/elijah-karori/indie-tech-api/internal/handlers"
	custommw "github.com/elijah-karori/indie-tech-api/internal/middleware"
)

type Handlers struct {
	Ticket        *handlers.TicketHandler
	Order         *handlers.OrderHandler
	Package       *handlers.PackageHandler
	Part          *handlers.PartHandler
	MpesaCallback *handlers.MpesaCallbackHandler
	Supabase      *supa.Client
}

// Register wires up all routes. Public client-facing endpoints (booking a
// ticket, tracking status, checkout) need no auth by design — friction-free
// for clients. Admin/technician endpoints require a JWT.
func Register(e *echo.Echo, h *Handlers, cfg *config.Config) {
	api := e.Group("/api/v1")

	// --- Public: ticket booking + tracking (used by the client portal) ---
	api.POST("/tickets", h.Ticket.Create)
	api.GET("/tickets/lookup", h.Ticket.Lookup)

	// --- Public: storefront catalog + checkout / M-Pesa STK Push ---
	api.GET("/packages", h.Package.List)
	api.GET("/parts", h.Part.List)
	api.POST("/orders/checkout", h.Order.Checkout)
	api.GET("/orders/:id/status", h.Order.Status)

	// --- M-Pesa webhook: must stay unauthenticated (Safaricom calls this directly) ---
	api.POST("/mpesa/callback", h.MpesaCallback.HandleCallback)

	// --- Admin/technician: requires JWT ---
	admin := api.Group("/admin", custommw.RequireAuth(cfg.JWTSecret))
	admin.GET("/tickets", h.Ticket.List)
	admin.PATCH("/tickets/:id/status", h.Ticket.UpdateStatus)
}
