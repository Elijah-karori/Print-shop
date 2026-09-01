package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
)

type SearchHandler struct {
	db *pgxpool.Pool
}

func NewSearchHandler(db *pgxpool.Pool) *SearchHandler {
	return &SearchHandler{db: db}
}

type SearchResultItem struct {
	Category    string `json:"category"` // 'part' | 'machine' | 'job_card' | 'documentation' | 'serialized_item'
	ID          string `json:"id"`
	Title       string `json:"title"`
	Subtitle    string `json:"subtitle,omitempty"`
	Description string `json:"description,omitempty"`
	URL         string `json:"url,omitempty"`
}

type SearchResponse struct {
	Query   string             `json:"query"`
	Results []SearchResultItem `json:"results"`
}

func (h *SearchHandler) Search(c echo.Context) error {
	q := c.QueryParam("q")
	if q == "" {
		return c.JSON(http.StatusOK, SearchResponse{Query: "", Results: []SearchResultItem{}})
	}

	ctx := c.Request().Context()
	results := []SearchResultItem{}

	// 1. Search Inventory Parts & Part Numbers (SKU)
	partRows, err := h.db.Query(ctx, `
		SELECT id, sku, name, COALESCE(description, ''), price_kes
		FROM parts
		WHERE active = true AND (
			to_tsvector('english', name || ' ' || sku || ' ' || COALESCE(description, '')) @@ websearch_to_tsquery('english', $1)
			OR name ILIKE '%' || $1 || '%'
			OR sku ILIKE '%' || $1 || '%'
		)
		LIMIT 10
	`, q)
	if err == nil {
		for partRows.Next() {
			var id, sku, name, desc string
			var price float64
			if err := partRows.Scan(&id, &sku, &name, &desc, &price); err == nil {
				results = append(results, SearchResultItem{
					Category:    "part",
					ID:          id,
					Title:       name,
					Subtitle:    "SKU: " + sku,
					Description: desc,
					URL:         "/shop",
				})
			}
		}
		partRows.Close()
	}

	// 2. Search Machines & Devices
	deviceRows, err := h.db.Query(ctx, `
		SELECT id, device_type, COALESCE(brand, ''), COALESCE(model, ''), COALESCE(serial_number, '')
		FROM devices
		WHERE (
			to_tsvector('english', device_type || ' ' || COALESCE(brand, '') || ' ' || COALESCE(model, '') || ' ' || COALESCE(serial_number, '')) @@ websearch_to_tsquery('english', $1)
			OR device_type ILIKE '%' || $1 || '%'
			OR brand ILIKE '%' || $1 || '%'
			OR model ILIKE '%' || $1 || '%'
			OR serial_number ILIKE '%' || $1 || '%'
		)
		LIMIT 10
	`, q)
	if err == nil {
		for deviceRows.Next() {
			var id, dType, brand, model, sn string
			if err := deviceRows.Scan(&id, &dType, &brand, &model, &sn); err == nil {
				title := dType
				if brand != "" || model != "" {
					title += " - " + brand + " " + model
				}
				subtitle := ""
				if sn != "" {
					subtitle = "Serial: " + sn
				}
				results = append(results, SearchResultItem{
					Category:    "machine",
					ID:          id,
					Title:       title,
					Subtitle:    subtitle,
					Description: "Registered Machine Record",
					URL:         "/book",
				})
			}
		}
		deviceRows.Close()
	}

	// 3. Search Job Cards & Reports
	jcRows, err := h.db.Query(ctx, `
		SELECT id, job_card_code, COALESCE(technician_name, ''), COALESCE(work_done, ''), COALESCE(service_report, '')
		FROM job_cards
		WHERE (
			to_tsvector('english', job_card_code || ' ' || COALESCE(technician_name, '') || ' ' || COALESCE(work_done, '') || ' ' || COALESCE(service_report, '')) @@ websearch_to_tsquery('english', $1)
			OR job_card_code ILIKE '%' || $1 || '%'
			OR work_done ILIKE '%' || $1 || '%'
			OR service_report ILIKE '%' || $1 || '%'
		)
		LIMIT 10
	`, q)
	if err == nil {
		for jcRows.Next() {
			var id, code, tech, work, report string
			if err := jcRows.Scan(&id, &code, &tech, &work, &report); err == nil {
				desc := work
				if desc == "" {
					desc = report
				}
				results = append(results, SearchResultItem{
					Category:    "job_card",
					ID:          id,
					Title:       "Job Card " + code,
					Subtitle:    "Technician: " + tech,
					Description: desc,
					URL:         "/track/jobcard/" + code,
				})
			}
		}
		jcRows.Close()
	}

	// 4. Search Machine Documentation, Manuals & Blog Articles
	docRows, err := h.db.Query(ctx, `
		SELECT id, slug, title, COALESCE(excerpt, '')
		FROM blog_posts
		WHERE published_at IS NOT NULL AND published_at <= NOW() AND (
			to_tsvector('english', title || ' ' || COALESCE(excerpt, '') || ' ' || body_md) @@ websearch_to_tsquery('english', $1)
			OR title ILIKE '%' || $1 || '%'
			OR body_md ILIKE '%' || $1 || '%'
		)
		LIMIT 10
	`, q)
	if err == nil {
		for docRows.Next() {
			var id, slug, title, excerpt string
			if err := docRows.Scan(&id, &slug, &title, &excerpt); err == nil {
				results = append(results, SearchResultItem{
					Category:    "documentation",
					ID:          id,
					Title:       title,
					Subtitle:    "Technical Service Manual / Guide",
					Description: excerpt,
					URL:         "/blog/" + slug,
				})
			}
		}
		docRows.Close()
	}

	return c.JSON(http.StatusOK, SearchResponse{
		Query:   q,
		Results: results,
	})
}
