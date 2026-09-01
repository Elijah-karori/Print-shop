package handlers

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/elijah-karori/indie-tech-api/internal/models"
)

type DeploymentHandler struct {
	db *pgxpool.Pool
}

func NewDeploymentHandler(db *pgxpool.Pool) *DeploymentHandler {
	return &DeploymentHandler{db: db}
}

type InstallComponentInput struct {
	DeviceID   uuid.UUID `json:"device_id"`
	ItemUnitID uuid.UUID `json:"item_unit_id"`
}

func (h *DeploymentHandler) InstallComponent(c echo.Context) error {
	var input InstallComponentInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid input"})
	}

	if input.DeviceID == uuid.Nil || input.ItemUnitID == uuid.Nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "device_id and item_unit_id required"})
	}

	ctx := c.Request().Context()
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "database error"})
	}
	defer tx.Rollback(ctx)

	var mc models.MachineComponent
	err = tx.QueryRow(ctx, `
		INSERT INTO machine_components (device_id, item_unit_id, active)
		VALUES ($1, $2, true)
		RETURNING id, device_id, item_unit_id, installed_at, active
	`, input.DeviceID, input.ItemUnitID).Scan(&mc.ID, &mc.DeviceID, &mc.ItemUnitID, &mc.InstalledAt, &mc.Active)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to record component installation"})
	}

	// Update item_unit status to 'installed'
	_, _ = tx.Exec(ctx, `
		UPDATE item_units SET status = 'installed', updated_at = NOW() WHERE id = $1
	`, input.ItemUnitID)

	// Record in unit_transactions ledger
	_, _ = tx.Exec(ctx, `
		INSERT INTO unit_transactions (item_unit_id, action, note)
		VALUES ($1, 'install', $2)
	`, input.ItemUnitID, "Installed into machine device ID: "+input.DeviceID.String())

	if err := tx.Commit(ctx); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to commit component installation"})
	}

	return c.JSON(http.StatusCreated, mc)
}

type CreateDeploymentInput struct {
	ItemUnitID uuid.UUID  `json:"item_unit_id"`
	ClientID   *uuid.UUID `json:"client_id,omitempty"`
	AssignedTo string     `json:"assigned_to"`
}

func (h *DeploymentHandler) CreateDeployment(c echo.Context) error {
	var input CreateDeploymentInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "invalid input"})
	}

	if input.ItemUnitID == uuid.Nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "item_unit_id required"})
	}

	ctx := c.Request().Context()
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "database error"})
	}
	defer tx.Rollback(ctx)

	var d models.Deployment
	err = tx.QueryRow(ctx, `
		INSERT INTO deployments (item_unit_id, client_id, assigned_to, status)
		VALUES ($1, $2, $3, 'active')
		RETURNING id, item_unit_id, client_id, COALESCE(assigned_to, ''), deployed_at, status
	`, input.ItemUnitID, input.ClientID, input.AssignedTo).Scan(
		&d.ID, &d.ItemUnitID, &d.ClientID, &d.AssignedTo, &d.DeployedAt, &d.Status,
	)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to create deployment"})
	}

	// Update item unit status to 'deployed'
	_, _ = tx.Exec(ctx, `
		UPDATE item_units SET status = 'deployed', updated_at = NOW() WHERE id = $1
	`, input.ItemUnitID)

	// Record in unit_transactions ledger
	_, _ = tx.Exec(ctx, `
		INSERT INTO unit_transactions (item_unit_id, action, note)
		VALUES ($1, 'deploy', $2)
	`, input.ItemUnitID, "Deployed to: "+input.AssignedTo)

	if err := tx.Commit(ctx); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to commit deployment"})
	}

	return c.JSON(http.StatusCreated, d)
}

func (h *DeploymentHandler) ListDeployments(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := h.db.Query(ctx, `
		SELECT id, item_unit_id, client_id, COALESCE(assigned_to, ''), deployed_at, returned_at, status
		FROM deployments
		ORDER BY deployed_at DESC
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to list deployments"})
	}
	defer rows.Close()

	var list []models.Deployment
	for rows.Next() {
		var d models.Deployment
		if err := rows.Scan(&d.ID, &d.ItemUnitID, &d.ClientID, &d.AssignedTo, &d.DeployedAt, &d.ReturnedAt, &d.Status); err == nil {
			list = append(list, d)
		}
	}
	if list == nil {
		list = []models.Deployment{}
	}

	return c.JSON(http.StatusOK, list)
}
