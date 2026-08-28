package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/elijah-karori/indie-tech-api/internal/models"
)

type PartHandler struct {
	DB *pgxpool.Pool
}

func NewPartHandler(db *pgxpool.Pool) *PartHandler {
	return &PartHandler{DB: db}
}

// List handles GET /api/v1/parts — public, used by the storefront. Only
// returns active parts with stock > 0 so out-of-stock items don't show up
// as buyable; flip `active` or let stock hit zero to pull something from
// the shop without deleting its row (order history still references it).
func (h *PartHandler) List(c echo.Context) error {
	ctx := c.Request().Context()

	rows, err := h.DB.Query(ctx, `
		SELECT id, sku, name, description, price_kes, stock_qty, active, created_at, updated_at
		FROM parts
		WHERE active = true AND stock_qty > 0
		ORDER BY name ASC
	`)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "database error")
	}
	defer rows.Close()

	parts := []models.Part{}
	for rows.Next() {
		var p models.Part
		if err := rows.Scan(&p.ID, &p.SKU, &p.Name, &p.Description, &p.PriceKES, &p.StockQty, &p.Active, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "scan error")
		}
		parts = append(parts, p)
	}

	return c.JSON(http.StatusOK, parts)
}
