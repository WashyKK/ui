package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/absmach/magistrala/pkg/errors"
	mgpostgres "github.com/absmach/magistrala/pkg/postgres"
	"github.com/jackc/pgtype"
	"github.com/jmoiron/sqlx"
	"github.com/washykk/ui/products"
)

type productRepo struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) products.ProductRepository {
	return &productRepo{db: db}
}

func (r *productRepo) Create(ctx context.Context, product products.Product) (products.Product, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return products.Product{}, err
	}
	q := `INSERT INTO products (id, name, domain_id, tags, description, metadata, layout, created_by, created_at, updated_by, updated_at)
	VALUES (:id, :name, :domain_id, :tags, :description, :metadata, :layout, :created_by, :created_at, :updated_by, :updated_at)
RETURNING id, name, COALESCE(domain_id, '') AS domain_id, tags, description, layout, metadata, created_by, created_at, updated_by, updated_at`

	dbProduct, err := toDBProduct(product)
	if err != nil {
		return products.Product{}, err
	}
	row, err := r.db.NamedQueryContext(ctx, q, dbProduct)
	if err != nil {
		if err := tx.Rollback(); err != nil {
			return products.Product{}, err
		}
		return products.Product{}, err
	}

	defer row.Close()

	var dash products.Product

	if row.Next() {
		dbProduct = DBProduct{}
		if err := row.StructScan(&dbProduct); err != nil {
			return products.Product{}, err
		}

		dash, err = toProduct(dbProduct)
		if err != nil {
			return products.Product{}, err
		}
	}

	if err = tx.Commit(); err != nil {
		return products.Product{}, err
	}
	return dash, nil
}

func (r *productRepo) Retrieve(ctx context.Context, productID string) (products.Product, error) {
	q := `SELECT id, name, COALESCE(domain_id,'') AS domain_id, tags, description, metadata, layout, created_by, created_at, COALESCE(updated_by,'') AS updated_by, updated_at 
	FROM products WHERE id = :id`

	dbDash := DBProduct{
		ID: productID,
	}

	row, err := r.db.NamedQueryContext(ctx, q, dbDash)
	if err != nil {
		return products.Product{}, err
	}
	defer row.Close()

	dbDash = DBProduct{}
	if row.Next() {
		if err := row.StructScan(&dbDash); err != nil {
			return products.Product{}, err
		}

		return toProduct(dbDash)
	}

	return products.Product{}, errors.New("error")
}

func (r *productRepo) RetrieveAll(ctx context.Context, pgm products.ProductPageMeta) (products.ProductPage, error) {
	query, err := PageQuery(pgm)
	if err != nil {
		return products.ProductPage{}, err
	}

	q := fmt.Sprintf(`SELECT d.id, d.name, COALESCE(d.domain_id,'') AS domain_id, d.tags, d.description, d.metadata, d.created_by, d.created_at, COALESCE(d.updated_by,'') AS updated_by, d.updated_at
		FROM products d %s ORDER BY d.created_at DESC LIMIT :limit OFFSET :offset`, query)

	dbPage, err := toDBProductPage(pgm)
	if err != nil {
		return products.ProductPage{}, err
	}
	rows, err := r.db.NamedQueryContext(ctx, q, dbPage)
	if err != nil {
		return products.ProductPage{}, err
	}
	defer rows.Close()

	var items []products.Product
	for rows.Next() {
		dbd := DBProduct{}
		if err = rows.StructScan(&dbd); err != nil {
			fmt.Println("err: ", err)
			return products.ProductPage{}, err
		}

		d, err := toProduct(dbd)
		if err != nil {
			return products.ProductPage{}, err
		}
		items = append(items, d)
	}
	cq := fmt.Sprintf(`SELECT COUNT(*) FROM products d %s;`, query)

	total, err := mgpostgres.Total(ctx, r.db, cq, dbPage)
	if err != nil {
		return products.ProductPage{}, err
	}

	return products.ProductPage{
		Products: items,
		Total:    total,
		Offset:   pgm.Offset,
		Limit:    pgm.Limit,
	}, nil
}

func (r *productRepo) Update(ctx context.Context, product products.Product) (products.Product, error) {
	var query []string
	var upq string

	if product.Name != "" {
		query = append(query, "name= :name,")
	}
	if product.Description != "" {
		query = append(query, "description = :description,")
	}
	if product.Metadata != nil {
		query = append(query, "metadata = :metadata,")
	}

	if len(query) > 0 {
		upq = strings.Join(query, " ")
	}

	q := fmt.Sprintf(`UPDATE products SET %s updated_at = :updated_at, updated_by = :updated_by WHERE id= :id 
				RETURNING id, name, COALESCE(domain_id, '') AS domain_id,tags, description, layout, metadata, created_by, created_at, updated_at, updated_by`, upq)

	dbDash, err := toDBProduct(product)
	if err != nil {
		return products.Product{}, err
	}

	row, err := r.db.NamedQueryContext(ctx, q, dbDash)
	if err != nil {
		return products.Product{}, err
	}

	defer row.Close()

	dbDash = DBProduct{}
	if row.Next() {
		if err := row.StructScan(&dbDash); err != nil {
			return products.Product{}, err
		}

		return toProduct(dbDash)
	}

	return products.Product{}, errors.New("error")
}

func (r *productRepo) Delete(ctx context.Context, productID string) error {
	q := "DELETE FROM products WHERE id = $1;"

	result, err := r.db.ExecContext(ctx, q, productID)
	if err != nil {
		return err
	}

	if rows, _ := result.RowsAffected(); rows == 0 {
		return errors.New("error")
	}

	return nil
}

type DBProduct struct {
	ID          string           `db:"id"`
	Name        string           `db:"name"`
	Tags        pgtype.TextArray `db:"tags,omitempty"`
	Domain      string           `db:"domain_id"`
	Description string           `db:"description,omitempty"`
	Layout      []byte           `db:"layout,omitempty"`
	Metadata    []byte           `db:"metadata,omitempty"`
	CreatedBy   string           `db:"created_by,omitempty"`
	CreatedAt   time.Time        `db:"created_at,omitempty"`
	UpdatedBy   *string          `db:"updated_by,omitempty"`
	UpdatedAt   sql.NullTime     `db:"updated_at,omitempty"`
}

func toDBProduct(d products.Product) (DBProduct, error) {
	layout := []byte("{}")

	metadata := []byte("{}")
	if len(d.Metadata) > 0 {
		b, err := json.Marshal(d.Metadata)
		if err != nil {
			return DBProduct{}, err
		}
		metadata = b
	}

	var updatedBy *string
	if d.UpdatedBy != "" {
		updatedBy = &d.UpdatedBy
	}

	var updatedAt sql.NullTime
	if d.UpdatedAt != (time.Time{}) {
		updatedAt = sql.NullTime{Time: d.UpdatedAt, Valid: true}
	}

	return DBProduct{
		ID:          d.ID,
		Name:        d.Name,
		Description: d.Description,
		Layout:      layout,
		Metadata:    metadata,
		CreatedBy:   d.CreatedBy,
		CreatedAt:   d.CreatedAt,
		UpdatedBy:   updatedBy,
		UpdatedAt:   updatedAt,
	}, nil
}

func toProduct(d DBProduct) (products.Product, error) {
	var metadata products.Metadata
	if d.Metadata != nil {
		if err := json.Unmarshal(d.Metadata, &metadata); err != nil {
			return products.Product{}, err
		}
	}

	var tags []string
	for _, e := range d.Tags.Elements {
		tags = append(tags, e.String)
	}

	var updatedBy string
	if d.UpdatedBy != nil {
		updatedBy = *d.UpdatedBy
	}

	var updatedAt time.Time
	if d.UpdatedAt.Valid {
		updatedAt = d.UpdatedAt.Time
	}

	return products.Product{
		ID:          d.ID,
		Name:        d.Name,
		Description: d.Description,
		Metadata:    metadata,
		CreatedBy:   d.CreatedBy,
		CreatedAt:   d.CreatedAt,
		UpdatedBy:   updatedBy,
		UpdatedAt:   updatedAt,
	}, nil
}

func PageQuery(pm products.ProductPageMeta) (string, error) {
	mq, _, err := mgpostgres.CreateMetadataQuery("", pm.Metadata)
	if err != nil {
		return "", err
	}

	var query []string
	var emq string
	if mq != "" {
		query = append(query, mq)
	}
	if pm.Name != "" {
		query = append(query, "d.name = :name")
	}
	if pm.Tag != "" {
		query = append(query, ":tag = ANY(d.tags)")
	}

	if len(query) > 0 {
		emq = fmt.Sprintf("WHERE %s", strings.Join(query, " AND "))
	}
	return emq, nil
}

func toDBProductPage(pm products.ProductPageMeta) (dbProductPage, error) {
	_, data, err := mgpostgres.CreateMetadataQuery("", pm.Metadata)
	if err != nil {
		return dbProductPage{}, err
	}

	return dbProductPage{
		Name:     pm.Name,
		Metadata: data,
		Tag:      pm.Tag,
		Total:    pm.Total,
		Offset:   pm.Offset,
		Limit:    pm.Limit,
	}, nil
}

type dbProductPage struct {
	Total     uint64 `db:"total"`
	Limit     uint64 `db:"limit"`
	Offset    uint64 `db:"offset"`
	Name      string `db:"name,omitempty"`
	Domain    string `db:"domain_id,omitempty"`
	Metadata  []byte `db:"metadata,omitempty"`
	Tag       string `db:"tag,omitempty"`
	CreatedBy string `db:"created_by,omitempty"`
}
