# Contributing

PlantQuality is a tenant-scoped B2B quality workflow application. Keep changes focused, review data access carefully, and favor existing patterns over new abstractions.

## Local Workflow

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run seed
npm run dev
```

## Pull Request Checklist

- Database reads and writes are scoped to the current company where applicable.
- Server mutations use Server Actions or authenticated API routes.
- Prisma schema changes include regenerated client output.
- UI changes follow the existing Tailwind and shadcn/ui component patterns.
- `npm run lint`, `npm run typecheck`, and `npm run build` pass locally.

## Security Expectations

- Do not commit `.env` files, credentials, database dumps, uploaded images, or production logs.
- Treat cross-tenant data leakage as a release blocker.
- Keep AI features gated by plan checks on the server, not only in the client UI.
