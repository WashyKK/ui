package products

import (
	"context"
	"time"

	"github.com/absmach/magistrala"
)

type service struct {
	products   ProductRepository
	idProvider magistrala.IDProvider
}

func NewService(drepo ProductRepository, idp magistrala.IDProvider) Service {
	return service{
		products:   drepo,
		idProvider: idp,
	}
}

func (svc service) Create(ctx context.Context, token string, product Product) (ds Product, err error) {
	_, err = svc.identify(ctx, token)
	if err != nil {
		return Product{}, err
	}

	if product.ID == "" {
		prodID, err := svc.idProvider.ID()
		if err != nil {
			return Product{}, err
		}
		product.ID = prodID
	}

	product.CreatedAt = time.Now()
	product.CreatedBy = "admin"

	return svc.products.Create(ctx, product)
}

func (svc service) View(ctx context.Context, token, id string) (Product, error) {
	if _, err := svc.identify(ctx, token); err != nil {
		return Product{}, err
	}

	return svc.products.Retrieve(ctx, id)
}

func (svc service) List(ctx context.Context, token string, pgm ProductPageMeta) (ProductPage, error) {
	_, err := svc.identify(ctx, token)
	if err != nil {
		return ProductPage{}, err
	}
	return ProductPage{
		Products: []Product{
			{
				Name: "name",
				ID: "ID",
				Description: "descri",
			},
			{
				Name: "name2",
				ID: "ID",
				Description: "descri",
			},
			{
				Name: "name3",
				ID: "ID",
				Description: "descri",
			},
			{
				Name: "name4",
				ID: "ID",
				Description: "descri",
			},
		},
	}, nil
}

func (svc service) Update(ctx context.Context, token string, product Product) (Product, error) {
	_, err := svc.identify(ctx, token)
	if err != nil {
		return Product{}, err
	}

	product.UpdatedAt = time.Now()

	return svc.products.Update(ctx, product)
}

func (svc service) Delete(ctx context.Context, token, id string) error {
	if _, err := svc.identify(ctx, token); err != nil {
		return err
	}

	return svc.products.Delete(ctx, id)
}

func (svc service) identify(_ context.Context, _ string) (string, error) {
	return "", nil
}
