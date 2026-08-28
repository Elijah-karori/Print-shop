package supabase

import (
	"log"

	supa "github.com/supabase-community/supabase-go"
	"github.com/elijah-karori/indie-tech-api/internal/config"
)

// NewClient initializes a Supabase client using configured credentials.
func NewClient(cfg *config.Config) *supa.Client {
	if cfg.SupabaseURL == "" || cfg.SupabaseKey == "" {
		log.Println("Supabase URL or Key not set, skipping Supabase client initialization")
		return nil
	}

	client, err := supa.NewClient(cfg.SupabaseURL, cfg.SupabaseKey, nil)
	if err != nil {
		log.Printf("failed to initialize Supabase client: %v", err)
		return nil
	}

	return client
}
