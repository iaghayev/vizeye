FROM golang:1.22-alpine AS builder
RUN apk add --no-cache git ca-certificates
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG VERSION=dev
ARG BUILD_TIME=unknown
ARG COMMIT=unknown
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags "-X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.Commit=${COMMIT} -s -w" \
    -trimpath -o /build/vizeye-agent ./

FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /build/vizeye-agent /usr/local/bin/vizeye-agent
COPY --from=builder /build/config/config.yaml /etc/vizeye/config.yaml
USER 65534:65534
ENTRYPOINT ["/usr/local/bin/vizeye-agent"]
CMD ["-config","/etc/vizeye/config.yaml"]
