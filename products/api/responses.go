package api

import (
	"fmt"
	"net/http"

	"github.com/absmach/magistrala"
	"github.com/washykk/ui/products"
)

var _ magistrala.Response = (*createProductRes)(nil)

type createProductRes struct {
	products.Product
	created bool
}

func (res createProductRes) Code() int {
	if res.created {
		return http.StatusCreated
	}

	return http.StatusOK
}

func (res createProductRes) Headers() map[string]string {
	if res.created {
		return map[string]string{
			"Location": fmt.Sprintf("/products/%s", res.ID),
		}
	}

	return map[string]string{}
}

func (res createProductRes) Empty() bool {
	return false
}

type updateProductRes struct {
	products.Product
}

func (res updateProductRes) Code() int {
	return http.StatusOK
}

func (res updateProductRes) Headers() map[string]string {
	return map[string]string{}
}

func (res updateProductRes) Empty() bool {
	return false
}

type viewProductRes struct {
	products.Product
}

func (res viewProductRes) Code() int {
	return http.StatusOK
}

func (res viewProductRes) Headers() map[string]string {
	return map[string]string{}
}

func (res viewProductRes) Empty() bool {
	return false
}

type pageRes struct {
	Limit  uint64 `json:"limit,omitempty"`
	Offset uint64 `json:"offset"`
	Total  uint64 `json:"total"`
}

type productPageRes struct {
	pageRes
	Products []viewProductRes `json:"products"`
}

func (res productPageRes) Code() int {
	return http.StatusOK
}

func (res productPageRes) Headers() map[string]string {
	return map[string]string{}
}

func (res productPageRes) Empty() bool {
	return false
}

type deleteProductRes struct{}

func (res deleteProductRes) Code() int {
	return http.StatusNoContent
}

func (res deleteProductRes) Headers() map[string]string {
	return map[string]string{}
}

func (res deleteProductRes) Empty() bool {
	return true
}
