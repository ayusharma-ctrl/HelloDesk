# SETUP.md — Installation & Deployment Guide

## Tech Stack Overview

### Backend (`hellodesk-server`)
- **Language**: TypeScript
- **Runtime/Framework**: Node.js 24.19.0 LTS + NestJS v11 + Express Adapter
- **Database**: PostgreSQL 17 + `pgvector` extension for 768-dim semantic search
- **ORM**: Prisma ORM (with `postgresqlExtensions` preview feature)
- **Cache & Presence**: Redis 7 for presence tracking, queuing, and rate limiting
- **Realtime**: Socket.io via NestJS `@WebSocketGateway()` (EventsGateway & VoiceGateway)
- **Background Jobs**: BullMQ for email processing, AI summaries, drafts, and vector indexing
- **Validation**: Zod & Class-Validator
- **Logging & Telemetry**: Pino structured logging + hierarchical `TraceContext` spans
- **AI Core**: Google Gemini 2.5 Flash, Gemini `text-embedding-004`, OpenAI GPT-4o-mini
- **Voice Stack**: `faster-whisper` for streaming STT + `Piper` for neural streaming TTS

### Frontend (`hellodesk-client`)
- **Framework**: Next.js 16 App Router + React 19 + TypeScript (Turbopack)
- **Styling**: Tailwind CSS + dynamic CSS theme variables
- **Client State**: Zustand for widget state, audio recorder, and UI toggles
- **Server State**: TanStack Query for caching, retry with backoff, and Socket.io cache sync
- **Deployment**: Vercel

---

## 🐳 Docker Compose 1-Command Local Orchestration

To run the complete HelloDesk platform locally (PostgreSQL with pgvector, Redis 7, NestJS API server, and Next.js client):

```bash
# 1. Start all containers in the background
docker compose up -d --build

# 2. Inspect real-time container logs
docker compose logs -f

# 3. Stop containers and cleanup
docker compose down
```

### Services Exposed:
- **Client App & Landing Page**: `http://localhost:3000`
- **Admin Insights Dashboard**: `http://localhost:3000/dashboard`
- **Voice AI Agent Playground**: `http://localhost:3000/voice-demo`
- **Chat Widget Demo**: `http://localhost:3000/widget-demo`
- **Server REST API**: `http://localhost:3001`
- **PostgreSQL (pgvector)**: `localhost:5432` (`postgres:postgrespassword`)
- **Redis**: `localhost:6379`

---

## Local Development Setup

### Prerequisites
- Node.js 20+ LTS
- PostgreSQL with `vector` extension (or use Docker `pgvector/pgvector:pg17`)
- Redis 7+
- Google Gemini API Key (`GEMINI_API_KEY`)
- OpenAI API Key (`OPENAI_API_KEY`) — optional
- Resend API Key (`RESEND_API_KEY`) for email routing

### 1. Database & Server Setup
```bash
cd hellodesk-server
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### 2. Frontend Client Setup
```bash
cd hellodesk-client
npm install
cp .env.example .env
npm run dev
```

---

## Environment Variables

### Backend (`hellodesk-server/.env`)
| Variable | Description | Required |
|---|---|:---:|
| `DATABASE_URL` | PostgreSQL URL with pgvector support | Yes |
| `REDIS_URL` | Redis connection URL (`redis://localhost:6379`) | Yes |
| `JWT_SECRET` | Secret key for signing authentication tokens | Yes |
| `GEMINI_API_KEY` | Google Gemini API key (2.5 Flash & text-embedding-004) | Yes |
| `OPENAI_API_KEY` | OpenAI API key (GPT-4o-mini) | Optional |
| `RESEND_API_KEY` | Resend API key for inbound/outbound email | Yes |
| `RESEND_FROM_EMAIL`| Verified sender email address | Yes |
| `APP_BASE_URL` | Frontend URL (`http://localhost:3000`) | Yes |
| `SERVER_BASE_URL` | Backend URL (`http://localhost:3001`) | Yes |
| `PORT` | Backend port (Default: `3001`) | No |

### Frontend (`hellodesk-client/.env`)
| Variable | Description | Required |
|---|---|:---:|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL (`http://localhost:3001`) | Yes |
| `NEXT_PUBLIC_SOCKET_URL` | Realtime Socket.io URL (`http://localhost:3001`) | Yes |
| `NEXT_PUBLIC_SERVER_URL` | Server URL (`http://localhost:3001`) | Yes |

---

## 📌 Embeddable Live Chat Widget Script

To embed the HelloDesk Live Chat Widget onto any web page or external HTML application, place this snippet before `</body>`:

```html
<!-- Start HelloDesk Live Chat Widget -->
<div id="hellodesk-widget-root"></div>
<script
  src="http://localhost:3000/widget-demo/widget.js"
  data-workspace-id="YOUR_WORKSPACE_UUID"
></script>
<!-- End HelloDesk Live Chat Widget -->
```
