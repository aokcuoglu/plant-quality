# PlantX — Agent Reference

> Last updated: 2026-04-24

## Docker Development Environment

This project runs locally via Docker Compose on Orbstack (macOS).

### Architecture

| Service    | Image                 | Host Port   | Purpose                  |
|------------|----------------------|-------------|--------------------------|
| `app`      | `plant-quality-app`  | `3000`      | Next.js 16 application   |
| `db`       | `postgres:16-alpine` | `5432`      | PostgreSQL database      |
| `minio`    | `minio/minio`        | `9000/9001` | S3-compatible storage    |
| `mailpit`  | `axllent/mailpit`    | `1025/8025` | SMTP catcher + web UI    |

### Quick Start

```bash
docker-compose up -d          # Start everything
docker-compose logs -f app  # Tail app logs
docker-compose down -v      # Stop + remove volumes
```

### Local Endpoints

| Service            | URL                        | Credentials           |
|--------------------|---------------------------|-----------------------|
| Application        | http://localhost:3000     | —                     |
| MinIO API          | http://localhost:9000     | `minioadmin/minioadmin` |
| MinIO Console      | http://localhost:9001     | `minioadmin/minioadmin` |
| Mailpit Web UI     | http://localhost:8025     | —                     |
| PostgreSQL         | `localhost:5432`          | `postgres/postgres`     |

### Environment

- `.env.docker` — used **only** by Docker Compose (never commit!)
- `.env.docker.example` — template for new developers

### Build Notes

- `output: "standalone"` is required in `next.config.ts` for containerized build
- Dockerfile uses multi-stage build (deps → builder → runner)
- `node_modules` is copied to runner stage for Prisma CLI + TS execution
- Entrypoint: `migrate deploy` → `prisma generate` → `db seed` → `node server.js`

### Auth in Development

Two login methods are available:

1. **Dev Mode (Credentials)** — select any seeded user from dropdown, instant login
2. **Magic Link** — Mailpit catches emails at `localhost:8025`

> The `credentials` provider is **dev-only** and bypasses OAuth/email flow.

### Database

```bash
# Connect from host
psql -h localhost -U postgres -d plantx

# Connect from another container
docker exec -it plantx-db psql -U postgres -d plantx
```

### Troubleshooting

| Issue                              | Fix                                                  |
|------------------------------------|------------------------------------------------------|
| Connection refused (PostgreSQL)    | Ensure port `5432` is mapped in docker-compose.yml   |
| CSRF errors during login           | `trustHost: true` is set in `src/lib/auth.ts`        |
| `Missing env: R2_ACCOUNT_ID` build | `.env.docker` is injected during build stage         |
| Verification link fails            | Check `AUTH_URL` matches actual host:port          |
| Mailpit empty                      | Check `EMAIL_SERVER` points to `plantx-mail:1025`    |
| Magic link redirects to login        | Verify cookie domain; use `localhost`, not `127.0.0.1` |

### Reset Everything

```bash
docker-compose down -v
rm -rf postgres_data minio_data
docker-compose up -d --build
```

## Production

Do NOT use `.env.docker` in production. Replace with:
- **Supabase** → `DATABASE_URL`
- **Cloudflare R2** → `R2_*` credentials
- **Resend** → `EMAIL_SERVER` with actual API key

---

## Legacy Notes

- Previously used Supabase PostgreSQL directly during dev
- Previously ran `npm run dev` on host machine
- Now fully containerized for clean, reproducible local stacks
