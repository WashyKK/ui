MG_DOCKER_IMAGE_NAME_PREFIX ?= ghcr.io/washykk/ui
SVC = products
BUILD_DIR = build
CGO_ENABLED ?= 0
GOOS ?= linux
GOARCH ?= amd64
VERSION ?= $(shell git describe --abbrev=0 --tags || echo "none")
COMMIT ?= $(shell git rev-parse HEAD)
TIME ?= $(shell date +%F_%T)
MOCKERY_VERSION=v2.43.0
USER_REPO ?= $(shell git remote get-url origin | sed -e 's/.*\/\([^/]*\)\/\([^/]*\).*/\1_\2/' )
empty:=
space:= $(empty) $(empty)
# Docker compose project name should follow this guidelines: https://docs.docker.com/compose/reference/#use--p-to-specify-a-project-name
DOCKER_PROJECT ?= $(shell echo $(subst $(space),,$(USER_REPO)) | tr -c -s '[:alnum:][=-=]' '_' | tr '[:upper:]' '[:lower:]')

define compile_service
	CGO_ENABLED=$(CGO_ENABLED) GOOS=$(GOOS) GOARCH=$(GOARCH) GOARM=$(GOARM) \
	go build -ldflags "-s -w \
	-X 'github.com/absmach/magistrala.BuildTime=$(TIME)' \
	-X 'github.com/absmach/magistrala.Version=$(VERSION)' \
	-X 'github.com/absmach/magistrala.Commit=$(COMMIT)'" \
	-o ${BUILD_DIR}/$(SVC) products/cmd/main.go
endef

define make_dockers
	docker build \
		--no-cache \
		--build-arg SVC=$(SVC) \
		--build-arg GOARCH=$(GOARCH) \
		--build-arg GOARM=$(GOARM) \
		--build-arg VERSION=$(VERSION) \
		--build-arg COMMIT=$(COMMIT) \
		--build-arg TIME=$(TIME) \
		--tag=$(MG_DOCKER_IMAGE_NAME_PREFIX)/$(SVC) \
		-f ./docker/products.prod.Dockerfile .

	docker build \
		--no-cache \
		--build-arg SVC=ui \
		--tag=$(MG_DOCKER_IMAGE_NAME_PREFIX)/ui \
		-f ./docker/ui.prod.Dockerfile .
endef

define make_dockers_dev
	docker build \
		--no-cache \
		--build-arg SVC=$(SVC) \
		--tag=$(MG_DOCKER_IMAGE_NAME_PREFIX)/$(SVC) \
		-f ./docker/products.dev.Dockerfile ./build

		docker build \
		--no-cache \
		--build-arg SVC=ui \
		--tag=$(MG_DOCKER_IMAGE_NAME_PREFIX)/ui \
		-f ./docker/ui.dev.Dockerfile .
endef

all: products

.PHONY: products dockers dockers_dev run_docker run mocks

clean:
	rm -rf ${BUILD_DIR}

cleandocker:
	# Stops containers and removes containers, networks, volumes, and images created by up
	docker compose -f docker/docker-compose.dev.yml -p ${DOCKER_PROJECT} down --rmi all -v --remove-orphans

install:
	cp ${BUILD_DIR}/$(SVC) $(GOBIN)/magistrala-${SVC}

mocks:
	@which mockery > /dev/null || go install github.com/vektra/mockery/v2@$(MOCKERY_VERSION)
	@unset MOCKERY_VERSION && go generate ./...

test:
	go test -v -race -count 1 -tags test -coverprofile=coverage.out $(shell go list ./... | grep -v 'cmd')

lint:
	golangci-lint run --config .golangci.yml

$(SVC):
	$(call compile_service)

dockers:
	$(call make_dockers)

dockers_dev:
	$(call make_dockers_dev)

define docker_push
	docker push $(MG_DOCKER_IMAGE_NAME_PREFIX)/$(SVC):$(1)
endef

latest: docker
	$(call docker_push,latest)

run_dev:
	docker compose -f docker/docker-compose.dev.yml --env-file .env -p ${DOCKER_PROJECT} up

run_prod:
	docker compose -f docker/docker-compose.prod.yml --env-file .env -p ${DOCKER_PROJECT} up

run:
	${BUILD_DIR}/$(SVC)
