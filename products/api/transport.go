package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/absmach/magistrala"
	"github.com/absmach/magistrala/pkg/apiutil"
	"github.com/absmach/magistrala/pkg/errors"
	"github.com/go-chi/chi/v5"
	kithttp "github.com/go-kit/kit/transport/http"
	"github.com/washykk/ui/products"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "github.com/rs/cors"
)

const (
	ContentType  = "application/json"
	BearerPrefix = "Bearer "
	MaxLimitSize = 100
	offsetKey    = "offset"
	limitKey     = "limit"
	metadataKey  = "metadata"
	createdByKey = "created_by"
	tagKey       = "tag"
	nameKey      = "name"
	totalKey     = "total"
	defOffset    = 0
	defLimit     = 10
)

func MakeHandler(svc products.Service, r *chi.Mux, logger *slog.Logger, instanceID string) http.Handler {
	opts := []kithttp.ServerOption{
		kithttp.ServerErrorEncoder(apiutil.LoggingErrorEncoder(logger, encodeError)),
	}

	r.Route("/products", func(r chi.Router) {
		r.Post("/", otelhttp.NewHandler(kithttp.NewServer(
			createProductEndpoint(svc),
			decodeCreateProductReq,
			encodeResponse,
			opts...,
		), "create_product").ServeHTTP)
		r.Get("/", otelhttp.NewHandler(
			kithttp.NewServer(
				listProductsEndpoint(svc),
				decodeListProductsReq,
				encodeResponse,
				opts...,
			), "list_products").ServeHTTP)
		r.Get("/{productID}", otelhttp.NewHandler(kithttp.NewServer(
			viewProductEndpoint(svc),
			decodeViewProductReq,
			encodeResponse,
			opts...,
		), "view_product").ServeHTTP)
		r.Patch("/{productID}", otelhttp.NewHandler(kithttp.NewServer(
			updateProductEndpoint(svc),
			decodeUpdateProductReq,
			encodeResponse,
			opts...,
		), "update_product").ServeHTTP)
		r.Delete("/{productID}", otelhttp.NewHandler(kithttp.NewServer(
			deleteProductEndpoint(svc),
			decodeDeleteProductReq,
			encodeResponse,
			opts...,
		), "delete_product").ServeHTTP)
	})

	r.Get("/health", magistrala.Health("products", instanceID))

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	return handler
}

func decodeCreateProductReq(_ context.Context, r *http.Request) (interface{}, error) {
	if !strings.Contains(r.Header.Get("Content-Type"), ContentType) {
		return nil, errors.New("Unsupported Content Type")
	}

	var dash products.Product
	if err := json.NewDecoder(r.Body).Decode(&dash); err != nil {
		return nil, err
	}
	req := createProductReq{
		token:   apiutil.ExtractBearerToken(r),
		product: dash,
	}

	return req, nil
}

func decodeListProductsReq(_ context.Context, r *http.Request) (interface{}, error) {
	o, err := apiutil.ReadNumQuery[uint64](r, offsetKey, defOffset)
	if err != nil {
		return nil, err
	}
	l, err := apiutil.ReadNumQuery[uint64](r, limitKey, defLimit)
	if err != nil {
		return nil, err
	}
	m, err := apiutil.ReadMetadataQuery(r, metadataKey, nil)
	if err != nil {
		return nil, err
	}
	n, err := apiutil.ReadStringQuery(r, nameKey, "")
	if err != nil {
		return nil, err
	}
	t, err := apiutil.ReadStringQuery(r, tagKey, "")
	if err != nil {
		return nil, err
	}

	c, err := apiutil.ReadStringQuery(r, createdByKey, "")
	if err != nil {
		return nil, err
	}

	req := listProductsReq{
		token:    apiutil.ExtractBearerToken(r),
		name:     n,
		offset:   o,
		limit:    l,
		metadata: m,
		tag:      t,
		createBy: c,
	}

	return req, nil
}

func decodeViewProductReq(_ context.Context, r *http.Request) (interface{}, error) {
	req := viewProductReq{
		token: apiutil.ExtractBearerToken(r),
		id:    chi.URLParam(r, "productID"),
	}
	return req, nil
}

func decodeUpdateProductReq(_ context.Context, r *http.Request) (interface{}, error) {
	if !strings.Contains(r.Header.Get("Content-Type"), ContentType) {
		return nil, errors.New("Unsupported Content Type")
	}

	var dash products.Product
	if err := json.NewDecoder(r.Body).Decode(&dash); err != nil {
		return nil, errors.New("Unsupported Content Type")
	}

	if dash.ID == "" {
		dash.ID = chi.URLParam(r, "productID")
	}

	req := updateProductReq{
		token:   apiutil.ExtractBearerToken(r),
		Product: dash,
	}

	return req, nil
}

func decodeDeleteProductReq(_ context.Context, r *http.Request) (interface{}, error) {
	req := deleteProductReq{
		token: apiutil.ExtractBearerToken(r),
		id:    chi.URLParam(r, "productID"),
	}
	return req, nil
}

func encodeResponse(_ context.Context, w http.ResponseWriter, response interface{}) error {
	if ar, ok := response.(magistrala.Response); ok {
		for k, v := range ar.Headers() {
			w.Header().Set(k, v)
		}
		w.Header().Set("Content-Type", ContentType)
		w.WriteHeader(ar.Code())

		if ar.Empty() {
			return nil
		}
	}

	return json.NewEncoder(w).Encode(response)
}

func encodeError(_ context.Context, err error, w http.ResponseWriter) {
	var wrapper error
	if errors.Contains(err, errors.New("Unsupported Content Type")) {
		wrapper, err = errors.Unwrap(err)
	}

	w.Header().Set("Content-Type", ContentType)
	switch {
	case errors.Contains(err, errors.New("Unsupported Content Type")):
		w.WriteHeader(http.StatusUnsupportedMediaType)
	default:
		w.WriteHeader(http.StatusInternalServerError)
	}

	if wrapper != nil {
		err = errors.Wrap(wrapper, err)
	}
	if errorVal, ok := err.(errors.Error); ok {
		if err := json.NewEncoder(w).Encode(errorVal); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
		}
	}
}
