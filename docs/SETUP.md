# SETUP.md

## Tech Stack

### Backend (`hellodesk-server`)

- **Language**: TypeScript
- **Runtime/Framework**: Node.js 24.19.0 LTS + NestJS v11 + Express Adapter (`src/app.module.ts`)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache / Pub-Sub / Rate Limiting**: Redis
- **Realtime**: Socket.io via NestJS `@WebSocketGateway()`
- **Background Jobs**: BullMQ, backed by Redis, for email sending, AI summary/draft generation, and webhook processing
- **Validation**: Zod & Class-Validator
- **Logging**: Pino structured logging
- **Resilience patterns**: token bucket rate limiting, circuit breakers, retry with exponential backoff, throttling/debouncing where applicable
- **Email Provider**: Resend for inbound webhook handling and outbound email replies
- **LLM Provider**: LangChain Multi-Model Dispatcher (Google Gemini, OpenAI, etc.) with circuit breakers and token tracking
- **Deployment**: Render

### Frontend (`hellodesk-client`)

- **Framework**: Next.js App Router with TypeScript
- **Folder structure**: Service-based feature folders
- **Client state**: Zustand for UI state such as widget open/close, selected conversation, and local toggles
- **Server state**: TanStack Query for fetching, caching, retry with backoff, deduplication, optimistic updates, and Socket.io cache sync
- **Deployment**: Vercel

---

## Local Development Setup

### Prerequisites

- Node.js LTS
- PostgreSQL, local or Docker
- Redis, local or Docker
- ngrok for testing inbound email webhooks locally
- Resend account with a verified or sandbox domain
- Google Gemini API key

### Backend Setup

```bash
cd hellodesk-server
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

### Frontend Setup

```bash
cd hellodesk-client
npm install
cp .env.example .env
npm run dev
```

### Testing Email Flow Locally

```bash
ngrok http 3000
```

1. Copy the ngrok HTTPS URL.
2. Register the inbound webhook endpoint in Resend as `https://<ngrok-id>.ngrok.io/api/v1/webhooks/email/inbound`.
3. Send a test email to the Resend sandbox/verified support address.
4. Confirm the webhook event payload is received and a conversation/message is created or threaded.

---

### Environment Variables - Backend

| Variable            | Description                             | Requirement                                                              |
| :------------------ | :-------------------------------------- | :----------------------------------------------------------------------- |
| `DATABASE_URL`      | PostgreSQL connection URL               | Required (ex: `postgresql://postgres:postgres@localhost:5432/hellodesk`) |
| `REDIS_URL`         | Redis server connection URL             | Required (ex: `redis://localhost:6379`)                                  |
| `RESEND_API_KEY`    | Resend provider API Key                 | Required for email verification/invites & replies                        |
| `RESEND_FROM_EMAIL` | Verified support email sender           | Required (ex: `support@yourdomain.com` or Sandbox verified email)        |
| `GEMINI_API_KEY`    | Google Gemini API Key                   | Required for AI summarize & drafting tasks                               |
| `JWT_SECRET`        | Secret token string for signing cookies | Required for logins (ex: `your-un-guessable-jwt-secret`)                 |
| `APP_BASE_URL`      | Port base URL of the client app         | Required for generating email support links                              |
| `PORT`              | Local server host port                  | Optional (Default: `3001`)                                               |

### Environment Variables - Frontend

| Variable                   | Description                           | Requirement                            |
| :------------------------- | :------------------------------------ | :------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | API server backend link URL           | Required (ex: `http://localhost:3001`) |
| `NEXT_PUBLIC_SOCKET_URL`   | Socket.io server connection pool link | Required (ex: `http://localhost:3001`) |

---

## 🛠️ Step-by-Step Running / Setup Guide

### Session 1: Database Initialization

1. Ensure your local PostgreSQL and Redis servers are active.
2. Spin up the tables and schema schemas:

   ```bash
   cd hellodesk-server
   npx prisma migrate dev --name init
   ```

3. Run the database seed route to prep standard permissions and test accounts:

   ```bash
   npm run seed
   ```

### Session 2: Boot Backend Services (Express + BullMQ Workers)

1. Set up your `.env` following `.env.example` (make sure all credentials above are set).
2. Start the primary node instance:

   ```bash
   npm run dev
   ```

   _(Note: The server startup script automatically starts background BullMQ listeners: `[ai-summary]` and `[ai-draft]` queues to ingest active tasks)._

### Session 3: Boot Front-End Dashboard (Next.js)

1. Add variables to `hellodesk-client/.env` following configuration defaults.
2. Fire up the application layout:

   ```bash
   cd hellodesk-client
   npm run dev
   ```

---

## 📌 Embeddable Live Chat Widget Script

To load the HelloDesk widget onto any page or external HTML website, copy and insert the following script block directly before the closing `</body>` tag:

```html
<!-- Start HelloDesk Live Chat Widget -->
<div id="hellodesk-widget-root"></div>
<script
  src="http://localhost:3000/widget-demo/widget.js"
  data-workspace-id="YOUR_WORKSPACE_UUID_HERE"
></script>
<!-- End HelloDesk Live Chat Widget -->
```

_Note: Replace `http://localhost:3000` with the production Next.js client URL once deployed to Vercel._

---

### Deployment Notes

- Frontend deploys to Vercel.
- Backend deploys to Render.
- PostgreSQL and Redis must be provisioned for the backend.
- After backend deployment, update the Resend inbound webhook config to point to the production backend URL.
- For custom knowledge-base domains, configure TXT and CNAME records at your DNS registrar as guided in the `/settings/domains` console.
