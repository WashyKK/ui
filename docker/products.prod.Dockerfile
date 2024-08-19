FROM golang:1.22-alpine AS builder
ARG SVC
ARG GOARCH
ARG GOARM
ARG VERSION
ARG COMMIT
ARG TIME

WORKDIR /go/src/github.com/washykk/ui
COPY . .
RUN go mod tidy
RUN apk update \
  && apk add make\
  && make $SVC \
  && mv build/$SVC /exe

FROM scratch
COPY --from=builder /exe /
ENTRYPOINT ["/exe"]
