# E-Commerce Microservices Project

Repository name: `e-commerce-microservices-project`

A small containerized e-commerce backend with an API gateway, product service, order service, PostgreSQL, and Redis.

```mermaid
flowchart LR
  Client --> Gateway
  Gateway --> Products
  Gateway --> Orders
  Products --> PostgreSQL
  Products --> Redis
  Orders --> PostgreSQL
  Orders --> Redis
```

## Run locally

Docker Compose reads `.env` if present. Start from the example without committing your real password:

```sh
cp .env.example .env
docker compose up --build
```

The gateway is available at `http://localhost:3000`.

```sh
curl http://localhost:3000/products
curl -X POST http://localhost:3000/orders \
  -H 'content-type: application/json' \
  -d '{"productId":1,"quantity":2}'
```

Development mode is automatic when using the base file: `docker-compose.override.yml` mounts source code and exposes service/debug ports. Persistent PostgreSQL and Redis data is stored in named volumes.

## Production images

Set `REGISTRY` to the Docker Hub namespace (or another registry), then build and push the semantic version tag:

```sh
docker login
docker compose build
docker compose push
REGISTRY=docker.io/your-user VERSION=v1.0.0 docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The production file references registry images and does not build application images. Keep credentials in the environment or a secret manager; they are never copied into an image.

## Design and security notes

- Each application image uses a dependency-first multi-stage Alpine build and runs as the non-root `node` user.
- Every application and infrastructure container has a health check; application startup waits for healthy PostgreSQL/Redis and upstream services.
- Configuration is provided through environment variables. Change the example database password before deployment.
- Compose places services on a dedicated network, applies CPU/memory limits, and uses named persistent volumes.
- The application handles `SIGTERM` for graceful shutdown.

## Image size report

The final sizes depend on the local Docker cache and image version. The report below defines the required result; record the measured value after building:

| Image | Runtime base | Required maximum | Measured |
|---|---|---:|---:|
| `ecommerce-gateway` | `node:22-alpine` | 150 MB | run command below |
| `ecommerce-products` | `node:22-alpine` | 150 MB | run command below |
| `ecommerce-orders` | `node:22-alpine` | 150 MB | run command below |

```sh
docker compose build
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}' \
  | Select-String 'ecommerce-(gateway|products|orders)'
```

The three application Dockerfiles use the official `gcr.io/distroless/nodejs22-debian13:nonroot` runtime. The build stages use Alpine only for dependency installation; the final images contain only production dependencies and application source. Distroless images do not include a shell or `wget`, so application health checks use the Node runtime directly.

Docker Hub displays compressed layer sizes, while `docker images` displays local unpacked image sizes. Record both measurements when documenting the 150 MB requirement:

```sh
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}' \
  | Select-String 'ecommerce-(gateway|products|orders)'
docker buildx imagetools inspect docker.io/blessedsoft/ecommerce-gateway:v1.0.0
docker buildx imagetools inspect docker.io/blessedsoft/ecommerce-products:v1.0.0
docker buildx imagetools inspect docker.io/blessedsoft/ecommerce-orders:v1.0.0
```
