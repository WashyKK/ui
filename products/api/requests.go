package api

import (
	"github.com/absmach/magistrala/pkg/errors"
	"github.com/washykk/ui/products"
)

type createProductReq struct {
	token   string
	product products.Product
}

func (req createProductReq) validate() error {
	if req.token == "" {
		return errors.New("validation token")
	}
	return nil
}

type updateProductReq struct {
	token string
	products.Product
}

func (req updateProductReq) validate() error {
	if req.token == "" {
		return errors.New("validation token")
	}
	if req.ID == "" {
		return errors.New("error")
	}
	return nil
}

type viewProductReq struct {
	token string
	id    string
}

func (req viewProductReq) validate() error {
	if req.token == "" {
		return errors.New("validation token")
	}
	if req.id == "" {
		return errors.New("missing id")
	}
	return nil
}

type listProductsReq struct {
	token    string
	offset   uint64
	limit    uint64
	name     string
	tag      string
	createBy string
	metadata products.Metadata
}

func (req listProductsReq) validate() error {
	if req.token == "" {
		return errors.New("validation token")
	}
	if req.limit > MaxLimitSize || req.limit < 1 {
		return errors.New("limit size")
	}
	return nil
}

type deleteProductReq struct {
	token string
	id    string
}

func (req deleteProductReq) validate() error {
	if req.token == "" {
		return errors.New("validation token")
	}
	if req.id == "" {
		return errors.New("missing id")
	}
	return nil
}
