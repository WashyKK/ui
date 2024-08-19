package api

import (
	"context"

	"github.com/go-kit/kit/endpoint"
	"github.com/washykk/ui/products"
)

func createProductEndpoint(svc products.Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(createProductReq)
		if err := req.validate(); err != nil {
			return nil, err
		}

		product, err := svc.Create(ctx, req.token, req.product)
		if err != nil {
			return nil, err
		}

		return createProductRes{
			created: true,
			Product: product,
		}, nil
	}
}

func listProductsEndpoint(svc products.Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(listProductsReq)
		if err := req.validate(); err != nil {
			return nil, err
		}

		pgm := products.ProductPageMeta{
			Offset:   req.offset,
			Limit:    req.limit,
			Name:     req.name,
			Tag:      req.tag,
			Metadata: req.metadata,
		}

		page, err := svc.List(ctx, req.token, pgm)
		if err != nil {
			return nil, err
		}

		res := productPageRes{
			pageRes: pageRes{
				Total:  page.Total,
				Offset: page.Offset,
				Limit:  page.Limit,
			},
			Products: []viewProductRes{},
		}
		for _, d := range page.Products {
			res.Products = append(res.Products, viewProductRes{Product: d})
		}

		return res, nil
	}
}

func updateProductEndpoint(svc products.Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(updateProductReq)
		if err := req.validate(); err != nil {
			return nil, err
		}

		product, err := svc.Update(ctx, req.token, req.Product)
		if err != nil {
			return nil, err
		}

		return updateProductRes{
			Product: product,
		}, nil
	}
}

func viewProductEndpoint(svc products.Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(viewProductReq)
		if err := req.validate(); err != nil {
			return nil, err
		}

		product, err := svc.View(ctx, req.token, req.id)
		if err != nil {
			return nil, err
		}

		return viewProductRes{
			Product: product,
		}, nil
	}
}

func deleteProductEndpoint(svc products.Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(deleteProductReq)
		if err := req.validate(); err != nil {
			return nil, err
		}

		if err := svc.Delete(ctx, req.token, req.id); err != nil {
			return nil, err
		}

		return deleteProductRes{}, nil
	}
}
