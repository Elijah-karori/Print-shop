package main

import (
	"context"
	"log"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/elijah-karori/indie-tech-api/internal/config"
	"github.com/elijah-karori/indie-tech-api/internal/db"
	"github.com/elijah-karori/indie-tech-api/internal/handlers"
	"github.com/elijah-karori/indie-tech-api/internal/mpesa"
	"github.com/elijah-karori/indie-tech-api/internal/notify"
	"github.com/elijah-karori/indie-tech-api/internal/routes"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()
	pool, err := db.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	mpesaClient := mpesa.NewClient(cfg)
	whatsapp := notify.NewWhatsAppNotifier(cfg)

	h := &routes.Handlers{
		Ticket:        handlers.NewTicketHandler(pool, whatsapp),
		Order:         handlers.NewOrderHandler(pool, mpesaClient),
		Package:       handlers.NewPackageHandler(pool),
		Part:          handlers.NewPartHandler(pool),
		MpesaCallback: handlers.NewMpesaCallbackHandler(pool),
	}

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS()) // tighten AllowOrigins before production launch

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]string{"status": "ok"})
	})

	routes.Register(e, h, cfg)

	log.Printf("starting server on :%s (env: %s)", cfg.Port, cfg.Env)
	if err := e.Start(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
