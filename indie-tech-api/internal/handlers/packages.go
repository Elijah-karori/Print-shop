package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/elijah-karori/indie-tech-api/internal/models"
)

type PackageHandler struct {
	DB *pgxpool.Pool
}

func NewPackageHandler(db *pgxpool.Pool) *PackageHandler {
	return &PackageHandler{DB: db}
}

// List handles GET /api/v1/packages — public, used by the storefront to
// render service packages/SLAs. Only returns active packages so retiring
// an offering is just a SQL flag flip, not a code deploy.
func (h *PackageHandler) List(c echo.Context) error {
	ctx := c.Request().Context()

	rows, err := h.DB.Query(ctx, `
		SELECT id, name, description, price_kes, cadence, active, created_at
		FROM service_packages
		WHERE active = true
		ORDER BY price_kes ASC
	`)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "database error")
	}
	defer rows.Close()

	packages := []models.ServicePackage{}
	for rows.Next() {
		var p models.ServicePackage
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.PriceKES, &p.Cadence, &p.Active, &p.CreatedAt); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "scan error")
		}
		packages = append(packages, p)
	}

	return c.JSON(http.StatusOK, packages)
}
