package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	log "github.com/sirupsen/logrus"
)

type DB struct {
	Pool *pgxpool.Pool
}

var Database *DB

// Connect создает connection pool к PostgreSQL
func Connect(databaseURL string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return fmt.Errorf("unable to parse database URL: %w", err)
	}

	// Настройка connection pool
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute
	config.HealthCheckPeriod = time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return fmt.Errorf("unable to create connection pool: %w", err)
	}

	// Проверка подключения
	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("unable to ping database: %w", err)
	}

	Database = &DB{Pool: pool}
	log.Info("✅ Successfully connected to PostgreSQL database")

	return nil
}

// Close закрывает connection pool
func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
		log.Info("Database connection pool closed")
	}
}

// Ping проверяет подключение к БД
func (db *DB) Ping(ctx context.Context) error {
	return db.Pool.Ping(ctx)
}

// GetStats возвращает статистику connection pool
func (db *DB) GetStats() *pgxpool.Stat {
	return db.Pool.Stat()
}
