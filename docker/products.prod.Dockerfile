FROM golang:1.22-alpine AS builder
ARG SVC
ARG GOARCH
ARG GOARM
ARG VERSION
ARG COMMIT
ARG TIME

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN apk add --no-cache make upx \
  && make $SVC \
  && upx build/washykk-$SVC \
  && mv build/$SVC /exe

FROM scratch
COPY --from=builder /exe /
ENTRYPOINT ["/exe"]
