package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/elijah-karori/indie-tech-api/internal/models"
)

type BlogHandler struct {
	db *pgxpool.Pool
}

func NewBlogHandler(db *pgxpool.Pool) *BlogHandler {
	return &BlogHandler{db: db}
}

func (h *BlogHandler) List(c echo.Context) error {
	ctx := c.Request().Context()
	rows, err := h.db.Query(ctx, `
		SELECT id, slug, title, body_md, excerpt, published_at, created_at, updated_at
		FROM blog_posts
		WHERE published_at IS NOT NULL AND published_at <= NOW()
		ORDER BY published_at DESC
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to fetch blog posts"})
	}
	defer rows.Close()

	var posts []models.BlogPost
	for rows.Next() {
		var p models.BlogPost
		if err := rows.Scan(&p.ID, &p.Slug, &p.Title, &p.BodyMD, &p.Excerpt, &p.PublishedAt, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to scan blog post"})
		}
		posts = append(posts, p)
	}

	if posts == nil {
		posts = []models.BlogPost{}
	}

	return c.JSON(http.StatusOK, posts)
}

func (h *BlogHandler) GetBySlug(c echo.Context) error {
	slug := c.Param("slug")
	if slug == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "slug required"})
	}

	ctx := c.Request().Context()
	var p models.BlogPost
	err := h.db.QueryRow(ctx, `
		SELECT id, slug, title, body_md, excerpt, published_at, created_at, updated_at
		FROM blog_posts
		WHERE slug = $1 AND published_at IS NOT NULL AND published_at <= NOW()
	`, slug).Scan(&p.ID, &p.Slug, &p.Title, &p.BodyMD, &p.Excerpt, &p.PublishedAt, &p.CreatedAt, &p.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "blog post not found"})
	}

	return c.JSON(http.StatusOK, p)
}
