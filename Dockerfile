FROM golang:1.25-bookworm AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/tauchoportal ./cmd

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /out/tauchoportal /app/tauchoportal
COPY public ./public
COPY pages ./pages
COPY templates ./templates

USER 65532:65532
ENTRYPOINT ["/app/tauchoportal"]
