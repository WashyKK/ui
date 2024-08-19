package products

import (
	"context"
	"time"
)

type Product struct {
	Name        string    `json:"name"`
	ID          string    `json:"id"`
	Description string    `json:"description,omitempty"`
	Stock       uint64    `json:"stock"`
	Price       uint64    `json:"price"`
	Category    string    `json:"category"`
	CreatedBy   string    `json:"created_by,omitempty"`
	CreatedAt   time.Time `json:"created_at,omitempty"`
	UpdatedAt   time.Time `json:"updated_at,omitempty"`
	UpdatedBy   string    `json:"updated_by,omitempty"`
	Metadata    Metadata  `json:"metadata,omitempty"`
}

type Metadata map[string]interface{}

type ProductPage struct {
	Total    uint64    `json:"total"`
	Offset   uint64    `json:"offset"`
	Limit    uint64    `json:"limit"`
	Products []Product `json:"products"`
}

type ProductPageMeta struct {
	Total    uint64   `json:"total"`
	Offset   uint64   `json:"offset"`
	Limit    uint64   `json:"limit" `
	Name     string   `json:"name,omitempty"`
	Order    string   `json:"order,omitempty"`
	Tag      string   `json:"tag,omitempty"`
	Metadata Metadata `json:"metadata,omitempty"`
	Category string   `json:"category,omitempty"`
}

type ProductRepository interface {
	Create(ctx context.Context, product Product) (Product, error)

	Retrieve(ctx context.Context, productID string) (Product, error)

	RetrieveAll(ctx context.Context, page ProductPageMeta) (ProductPage, error)

	Update(ctx context.Context, product Product) (Product, error)

	Delete(ctx context.Context, productID string) error
}

type Service interface {
	Create(ctx context.Context, token string, product Product) (Product, error)

	View(ctx context.Context, token, id string) (Product, error)

	List(ctx context.Context, token string, pgm ProductPageMeta) (ProductPage, error)

	Update(ctx context.Context, token string, product Product) (Product, error)

	Delete(ctx context.Context, token, id string) error
}
