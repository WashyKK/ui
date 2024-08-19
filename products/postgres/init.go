package postgres

import migrate "github.com/rubenv/sql-migrate"

func Migration() *migrate.MemoryMigrationSource {
	return &migrate.MemoryMigrationSource{
		Migrations: []*migrate.Migration{
			{
				Id: "products_01",
				Up: []string{
					`CREATE TABLE IF NOT EXISTS products(
						id           VARCHAR(36) PRIMARY KEY,
						name         VARCHAR(254) NOT NULL,
						price	     DECIMAL(8,2) NOT NULL,
						stock        SMALLINT,
						category     VARCHAR(254),
						description  VARCHAR(1024),
						metadata     JSONB,
						created_by   VARCHAR(254),
						created_at   TIMESTAMP,
						updated_by   VARCHAR(254),
						updated_at   TIMESTAMP
					);`,
				},
				Down: []string{
					`DROP TABLE IF EXISTS products`,
				},
			},
		},
	}
}
