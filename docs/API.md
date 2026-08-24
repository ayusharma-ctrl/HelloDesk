# API.md — REST API Specifications

## Public Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/signup` | Create user with email/password and workspace name |
| `POST` | `/api/v1/auth/login` | Email/password login; returns JWT access token, workspace, role, and permissions |
| `GET` | `/api/v1/kb/public/search` | Public knowledge base search with CNAME tenant resolution |
| `GET` | `/api/v1/kb/public/articles/:slug` | Public article view by slug |
| `POST` | `/api/v1/widget/conversations` | Start conversation from widget (supports text and media attachments) |
| `POST` | `/api/v1/widget/messages` | Send message from widget |
| `GET` | `/api/v1/widget/status` | Fetch workspace online agent presence and theme |
| `GET` | `/api/v1/widget/conversations/:id` | Fetch conversation message history for visitor |
| `POST` | `/api/v1/widget/read` | Mark visitor messages as read |
| `GET` | `/api/v1/widget/kb-suggestions` | Debounced KB search suggestions in widget |
| `POST` | `/api/v1/webhooks/email/inbound` | Resend inbound email webhook receiver with threading and autonomous agent routing |
| `POST` | `/api/v1/conversations/:id/rate` | Customer rating submission for resolved conversations (1-5 star scale) |

---

## AI Core, RAG & Tooling Endpoints (`/api/v1/ai`)

| Role / Permission | Method | Endpoint | Description |
|---|---|---|---|
| Any logged-in user | `GET` | `/api/v1/ai/tools` | List registered domain tools & schemas |
| Any logged-in user | `POST` | `/api/v1/ai/retrieval/search` | Test pgvector hybrid retrieval (RRF) & fast-path check |
| Any logged-in user | `POST` | `/api/v1/ai/agent/execute` | Execute autonomous AI agent directly on a message |
| Admin (`llm:manage`) | `POST` | `/api/v1/ai/eval/run` | Execute automated 6-scenario golden benchmark evaluation suite |
| Admin (`llm:manage`) | `GET` | `/api/v1/ai/cost/analytics` | Fetch token usage and estimated dollar cost analytics |
| Admin (`llm:manage`) | `GET` | `/api/v1/ai/custom-tools` | List registered custom API tools for workspace |
| Admin (`llm:manage`) | `POST` | `/api/v1/ai/custom-tools` | Register custom API tool (with mandatory pre-flight verification) |
| Admin (`llm:manage`) | `POST` | `/api/v1/ai/custom-tools/test` | Live test custom API tool endpoint with headers and params |
| Admin (`llm:manage`) | `PATCH` | `/api/v1/ai/custom-tools/:id/status` | Toggle custom tool active/inactive status |
| Admin (`llm:manage`) | `DELETE` | `/api/v1/ai/custom-tools/:id` | Remove custom API tool |
| Any logged-in user | `POST` | `/api/v1/ai/voice/test-tts` | Test Piper neural TTS streaming chunk generation |
| Any logged-in user | `GET` | `/api/v1/ai/voice/sessions/:sessionId` | Get telemetry and metrics for an active voice session |

---

## Authorized Application Endpoints

| Role / Permission | Method | Endpoint | Description |
|---|---|---|---|
| Any logged-in user | `GET` | `/api/v1/auth/me` | Fetch current user profile, workspace, role, and permission flags |
| Admin | `GET` | `/api/v1/dashboard/overview` | Active conversation counts and online agent presence |
| Admin (`theme:manage`) | `PUT` | `/api/v1/theme` | Update workspace CSS color design tokens |
| Admin (`theme:manage`) | `PUT` | `/api/v1/theme/details` | Update workspace identity (name, short name, logo URL) |
| Admin (`agent:manage`) | `POST` | `/api/v1/users/invite` | Invite agent/admin to workspace with temporary password |
| Admin (`team:view`) | `GET` | `/api/v1/users` | List workspace users |
| Admin (`agent:manage`) | `PATCH` | `/api/v1/users/:id/role` | Change user role (`admin`, `agent`) |
| Admin (`agent:manage`) | `PATCH` | `/api/v1/users/:id/status` | Activate/deactivate a user |
| Admin (`domain:manage`) | `POST` | `/api/v1/domains` | Register custom CNAME domain for Knowledge Base |
| Admin (`domain:manage`) | `GET` | `/api/v1/domains/:id/verify` | Check DNS/SSL verification status |
| Admin (`kb:manage`) | `POST` | `/api/v1/kb/articles` | Create KB article (triggers automatic pgvector indexing) |
| Admin (`kb:manage`) | `PUT` | `/api/v1/kb/articles/:id` | Update KB article (re-indexes vector embeddings) |
| Admin (`kb:manage`) | `DELETE` | `/api/v1/kb/articles/:id` | Delete KB article |
| Agent/Admin | `GET` | `/api/v1/conversations` | List conversations with pagination (`page`, `limit`) |
| Agent/Admin | `GET` | `/api/v1/conversations/:id` | Get conversation detail, transcript messages, and contact info |
| Agent/Admin (`conversation:reply`) | `POST` | `/api/v1/conversations/:id/messages` | Reply to chat/email (supports text & media attachments) |
| Agent/Admin | `POST` | `/api/v1/upload` | Upload media attachment (photos, videos, docs up to 50MB) |
| Agent/Admin (`conversation:status:update`) | `PATCH` | `/api/v1/conversations/:id/status` | Snooze or resolve conversation |
| Agent/Admin | `PATCH` | `/api/v1/agents/me/status` | Set own status (`available`, `busy`, `away`, `offline`) |
| Admin (`llm:manage`) | `GET` | `/api/v1/llm/models` | List configured LLM models & free-tier usage |
| Admin (`llm:manage`) | `POST` | `/api/v1/llm/models` | Save verified LLM model configuration |
| Admin (`llm:manage`) | `GET` | `/api/v1/llm/logs` | Fetch real-time LLM request logs |
| Admin (`theme:manage`) | `GET` | `/api/v1/storage/config` | Get active BYO Storage provider (Cloudinary, ImageKit, S3) |
| Admin (`theme:manage`) | `POST` | `/api/v1/storage/verify` | Pre-flight live test storage provider credentials |
| Admin (`theme:manage`) | `POST` | `/api/v1/storage/config` | Save & activate verified BYO Storage provider |
| Admin (`theme:manage`) | `DELETE` | `/api/v1/storage/config` | Reset to platform managed storage |
| Admin (`domain:manage`) | `GET` | `/api/v1/email/config` | Get active BYO Email provider (Resend, SendGrid, Mailgun) |
| Admin (`domain:manage`) | `POST` | `/api/v1/email/verify` | Pre-flight live test email API credentials |
| Admin (`domain:manage`) | `POST` | `/api/v1/email/config` | Save & activate verified BYO Email provider |
| Admin (`domain:manage`) | `DELETE` | `/api/v1/email/config` | Disconnect email provider (disables outbound emails) |
| Admin (`domain:manage`) | `POST` | `/api/v1/email/test` | Deliver live test email through connected provider |
| Webhook (Public) | `POST` | `/api/v1/webhooks/email/resend` | Inbound email webhook for Resend routing |
| Webhook (Public) | `POST` | `/api/v1/webhooks/email/sendgrid` | Inbound parse webhook for Twilio SendGrid |
| Webhook (Public) | `POST` | `/api/v1/webhooks/email/mailgun` | Inbound webhook for Mailgun (US/EU) |
| Agent/Admin | `GET` | `/api/v1/conversations/:id/ai-summary` | Fetch latest AI-generated summary |
| Agent/Admin | `GET` | `/api/v1/conversations/:id/ai-draft` | Fetch latest AI-generated reply draft |

---

## WebSocket & Socket.io Events

### Workspace Events Gateway (`/`)
- `join:workspace` ➔ Join `workspace:${workspaceId}` room
- `agent:status-update` ➔ Broadcast agent status changes (`available`, `busy`, `away`, `offline`)
- `message:created` ➔ Inbound/outbound message broadcast
- `conversation:created` ➔ New conversation created event
- `agent:handoff-alert` ➔ Real-time escalation notification to Agent Inbox
- `ai:response-started` ➔ AI thinking indicator
- `ai:response-completed` ➔ AI synthesized answer delivered

### Real-Time Voice Gateway (`/`)
- `voice:session-start` ➔ Initialize voice session
- `voice:session-ready` ➔ Voice engine ready (faster-whisper + Piper)
- `voice:audio-chunk` ➔ Ingest streaming WebM/PCM audio chunk
- `voice:transcript-final` ➔ Final transcribed customer speech
- `voice:agent-thinking` ➔ AI reasoning state
- `voice:audio-out` ➔ Streaming neural synthesized Piper audio chunk
- `voice:interrupt` ➔ Client-side barge-in signal (halts Piper TTS output instantly)
- `voice:playback-cancelled` ➔ Confirm speaker playback stopped
- `voice:session-end` ➔ Finalize voice session and compute latency metrics
