package routes

import (
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
	Blog          *handlers.BlogHandler
	Telemetry     *handlers.TelemetryHandler
	Inventory     *handlers.InventoryHandler
	JobCard       *handlers.JobCardHandler
	Search        *handlers.SearchHandler
	Reliability   *handlers.ReliabilityHandler
	MpesaCallback *handlers.MpesaCallbackHandler
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

	// --- Public: blog & service guides ---
	api.GET("/blog", h.Blog.List)
	api.GET("/blog/:slug", h.Blog.GetBySlug)

	// --- Public: search engine ---
	api.GET("/search", h.Search.Search)

	// --- Public: telemetry & analytics metrics ---
	api.POST("/telemetry", h.Telemetry.Record)
	api.GET("/telemetry/stats", h.Telemetry.GetStats)
	api.GET("/analytics/mtbf", h.Reliability.GetMTBFByModel)
	api.GET("/analytics/suppliers", h.Reliability.GetSupplierFailureRates)

	// --- Public: job card lookup ---
	api.GET("/jobcards/:code", h.JobCard.GetByCode)
	api.GET("/jobcards/ticket/:ticket_id", h.JobCard.GetByTicket)

	// --- M-Pesa webhook: must stay unauthenticated (Safaricom calls this directly) ---
	api.POST("/mpesa/callback", h.MpesaCallback.HandleCallback)

	// --- Admin/technician: requires JWT ---
	admin := api.Group("/admin", custommw.RequireAuth(cfg.JWTSecret))
	admin.GET("/tickets", h.Ticket.List)
	admin.PATCH("/tickets/:id/status", h.Ticket.UpdateStatus)

	admin.POST("/inventory/serialized", h.Inventory.AddSerializedItem)
	admin.POST("/inventory/recall", h.Inventory.TriggerRecall)
	admin.GET("/inventory/serialized", h.Inventory.ListSerializedItems)

	admin.POST("/jobcards", h.JobCard.Create)
	admin.POST("/failures", h.Reliability.RecordFailure)
}
