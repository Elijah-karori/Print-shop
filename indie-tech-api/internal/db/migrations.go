package db

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// migrationsFS embeds every .sql file in internal/db/migrations directly
// into the compiled binary, so deployment never depends on the source
// tree (or a separate migration tool) being present on the target host.
//
//go:embed migrations/*.sql
var migrationsFS embed.FS

// migrationLockKey is an arbitrary fixed int64 used with pg_advisory_lock
// so that if two instances of this binary start at the same moment
// (e.g. a rolling deploy, or a crash-restart race under NSSM), only one
// of them actually runs migrations while the other waits and then finds
// there's nothing left to do.
const migrationLockKey = 8412_2026

// RunMigrations applies every embedded migration that hasn't already been
// recorded in schema_migrations, in filename order. It is safe to call on
// every startup: a brand-new database gets every migration in order, and
// an existing database only gets whatever is new since it was last
// deployed. Each migration runs in its own transaction, and the whole
// run is guarded by a Postgres advisory lock.
func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("migrate: acquire connection: %w", err)
	}
	defer conn.Release()

	if _, err := conn.Exec(ctx, `SELECT pg_advisory_lock($1)`, migrationLockKey); err != nil {
		return fmt.Errorf("migrate: acquire advisory lock: %w", err)
	}
	defer func() {
		if _, err := conn.Exec(ctx, `SELECT pg_advisory_unlock($1)`, migrationLockKey); err != nil {
			log.Printf("migrate: warning: failed to release advisory lock: %v", err)
		}
	}()

	if _, err := conn.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version     TEXT PRIMARY KEY,
			applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`); err != nil {
		return fmt.Errorf("migrate: create schema_migrations: %w", err)
	}

	applied := make(map[string]bool)
	rows, err := conn.Query(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return fmt.Errorf("migrate: read schema_migrations: %w", err)
	}
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			rows.Close()
			return fmt.Errorf("migrate: scan schema_migrations: %w", err)
		}
		applied[v] = true
	}
	rows.Close()

	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("migrate: read embedded migrations: %w", err)
	}

	var pending []string
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		if !applied[e.Name()] {
			pending = append(pending, e.Name())
		}
	}
	sort.Strings(pending) // filenames are zero-padded (0001_, 0002_...), so lexical sort == correct order

	if len(pending) == 0 {
		log.Printf("migrate: database is up to date (%d migrations already applied)", len(applied))
		return nil
	}

	log.Printf("migrate: applying %d pending migration(s): %s", len(pending), strings.Join(pending, ", "))

	for _, name := range pending {
		sqlBytes, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return fmt.Errorf("migrate: read %s: %w", name, err)
		}

		tx, err := conn.Begin(ctx)
		if err != nil {
			return fmt.Errorf("migrate: begin tx for %s: %w", name, err)
		}

		if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("migrate: %s failed: %w", name, err)
		}

		if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, name); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("migrate: %s failed to record: %w", name, err)
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("migrate: %s failed to commit: %w", name, err)
		}

		log.Printf("migrate: applied %s", name)
	}

	return nil
}
