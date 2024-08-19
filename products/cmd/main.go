package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"os"

	mglog "github.com/absmach/magistrala/logger"
	mgpostgres "github.com/absmach/magistrala/pkg/postgres"
	"github.com/absmach/magistrala/pkg/server"
	httpserver "github.com/absmach/magistrala/pkg/server/http"
	"github.com/absmach/magistrala/pkg/uuid"
	"github.com/caarlos0/env/v10"
	"github.com/go-chi/chi/v5"
	"github.com/washykk/ui/products"
	"github.com/washykk/ui/products/api"
	"github.com/washykk/ui/products/postgres"
	"golang.org/x/sync/errgroup"
)

const (
	defDB          = "products"
	envPrefixDB    = "MG_DASHBOARDS_DB_"
	envPrefixHTTP  = "MG_DASHBOARDS_HTTP_"
	envPrefixAuth  = "MG_AUTH_GRPC_"
	svcName        = "products"
	defSvcHTTPPort = "9097"
)

type config struct {
	LogLevel   string `env:"MG_DASHBOARDS_LOG_LEVEL"   envDefault:"info"`
	InstanceID string `env:"MG_DASHBOARDS_INSTANCE_ID" envDefault:""`
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	g, ctx := errgroup.WithContext(ctx)

	// Create new products configuration
	cfg := config{}
	if err := env.Parse(&cfg); err != nil {
		log.Fatalf("failed to load products configuration: %s", err)
	}

	var logger *slog.Logger
	logger, err := mglog.New(os.Stdout, cfg.LogLevel)
	if err != nil {
		log.Fatalf("failed to init logger: %s", err.Error())
	}

	var exitCode int
	defer mglog.ExitWithError(&exitCode)

	dbConfig := mgpostgres.Config{Name: defDB}
	if err := env.ParseWithOptions(&dbConfig, env.Options{Prefix: envPrefixDB}); err != nil {
		logger.Error(err.Error())
		exitCode = 1
		return
	}
	fmt.Println(dbConfig)

	dm := postgres.Migration()
	db, err := mgpostgres.Setup(dbConfig, *dm)
	if err != nil {
		logger.Error(err.Error())
		exitCode = 1
		return
	}
	defer db.Close()

	repoConfig := postgres.NewRepository(db)
	idp := uuid.New()

	svc := products.NewService(repoConfig, idp)
	mux := chi.NewRouter()

	httpServerConfig := server.Config{Port: defSvcHTTPPort}
	if err := env.ParseWithOptions(&httpServerConfig, env.Options{Prefix: envPrefixHTTP}); err != nil {
		logger.Error(fmt.Sprintf("failed to load %s HTTP server configuration : %s", svcName, err))
		exitCode = 1
		return
	}
	fmt.Println(httpServerConfig)
	hs := httpserver.NewServer(ctx, cancel, svcName, httpServerConfig, api.MakeHandler(svc, mux, logger, cfg.InstanceID), logger)

	g.Go(func() error {
		return hs.Start()
	})

	g.Go(func() error {
		return server.StopSignalHandler(ctx, cancel, logger, svcName, hs)
	})

	if err := g.Wait(); err != nil {
		logger.Error(fmt.Sprintf("%s service terminated : %s", svcName, err))
	}
}
