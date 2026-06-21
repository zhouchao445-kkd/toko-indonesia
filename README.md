# TokoKu E-Commerce Platform

A modern e-commerce platform built with a monorepo architecture.

## Architecture

```
├── web/              → Next.js frontend (port 5000)
├── backend/          → Express.js + Prisma API (port 9000)
├── realtime/         → Socket.IO realtime service (port 3001)
├── packages/         → Shared types & utilities
│   └── shared/       → @ecommerce/shared
├── scripts/          → Build & deployment scripts
├── src/storage/      → Supabase schema & migrations
├── messages/         → i18n translation files (id/zh/en)
├── .env.example      → Environment variable template
├── vercel.json       → Vercel deployment config
├── railway.toml      → Railway deployment config
└── Dockerfile        → Docker multi-stage build
```

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | Next.js 16, React 19, TypeScript 5  |
| Styling    | Tailwind CSS 4, shadcn/ui           |
| i18n       | next-intl (id/zh/en)                |
| Backend    | Express.js 5, Prisma ORM            |
| Realtime   | Socket.IO 4                         |
| Database   | Supabase PostgreSQL                  |
| Package Mgr| pnpm (workspace)                    |

## Startup Order

Services must be started in this order:

### 1. Database (Supabase)
Ensure Supabase is running and credentials are configured in `.env`.

### 2. Backend API (port 9000)
```bash
cd backend
pnpm dev
```
Health check: `GET http://localhost:9000/health`

### 3. Realtime Service (port 3001)
```bash
cd realtime
pnpm dev
```

### 4. Frontend (port 5000)
```bash
cd web
pnpm dev
```
Or from root: `pnpm dev`

## Quick Start

```bash
# 1. Install all dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your actual credentials

# 3. Start frontend (from root)
pnpm dev
```

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Service | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | web | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | Supabase anonymous key |
| `DATABASE_URL` | backend | PostgreSQL connection string |
| `BACKEND_PORT` | backend | API port (default: 9000) |
| `REALTIME_PORT` | realtime | Socket.IO port (default: 3001) |

## i18n (Internationalization)

Supported languages:
- **id** (Bahasa Indonesia) - Default
- **zh** (中文)
- **en** (English)

URL structure:
- `/` → Indonesian (default)
- `/zh` → Chinese
- `/en` → English

## Responsive Breakpoints

| Device | Width |
|--------|-------|
| Mobile | < 640px |
| Tablet | 640px - 1023px |
| PC     | ≥ 1024px |

All interactive elements have a minimum touch target of 44×44px.

## Deployment

### Vercel (Frontend)
```bash
vercel --prod
```

### Railway (Backend + Realtime)
```bash
railway up
```

### Docker
```bash
docker build -t ecommerce-web .
docker run -p 5000:5000 --env-file .env ecommerce-web
```
