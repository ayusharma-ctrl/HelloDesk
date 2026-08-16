# PHASE_1.md

## Scope

Phase 1 covers all 7 mandatory requirements, plus one stretch feature: **AI Auto-Reply Drafts**. The goal is a working, deployed, end-to-end system within a 24-48 hour build window, prioritizing correctness and completeness over polish or advanced optimization.

## Features Covered

1. **Auth & Team Roles** - email/password signup and login; JWT access tokens only; workspace-aware signup; config-driven RBAC via Roles, Permissions, and Role-Permission mapping tables; UI access controlled by backend-issued permission flags
2. **Live Chat Widget** - embeddable single-script widget; real-time messaging, typing indicators, online/offline status, read receipts, and persistent chat history via Socket.io
3. **Email Channel** - inbound email via Resend webhook, outbound replies via Resend API, threading preserved using Message-ID/In-Reply-To headers
4. **Unified Inbox** - combined chat and email view; filter by channel, assignee, and status; assign/reassign, snooze, and resolve actions
5. **Knowledge Base** - rich text article authoring, categorization, public search page, and debounced in-widget article suggestions
6. **AI Conversation Summarization** - live-updating summaries generated via Google Gemini API as conversations progress
7. **Custom Domain Support** - workspace-level custom domain for the knowledge base, with DNS verification and SSL handled through the easiest production-ready path available during deployment
8. **(Stretch) AI Auto-Reply Drafts** - Gemini-generated draft replies based on conversation context, surfaced to agents/admins as a starting point

## Key Architectural Decisions

- **Multi-tenancy**: every core table and query is scoped by `workspace_id` for strict tenant isolation
- **Backend architecture**: Node.js + TypeScript modular monolith, organized with clear module boundaries
- **Auth**: email/password signup/login with JWT access tokens; no refresh tokens in Phase 1
- **Signup flow**: user enters email, password, name, and workspace name; `Workspace.name` is unique; a missing workspace is created and the first user becomes Admin; later users joining an existing workspace become Agents by default
- **Agent status**: tracked in Redis (`available`, `busy`, `away`, `offline`), updated automatically on socket connect/disconnect and conversation assignment
- **Conversation assignment**: simple round-robin among `available` agents per workspace, using a Redis-backed pointer
- **Conversation status**: `open`, `pending`, `snoozed`, and `resolved` describe the client-agent conversation lifecycle; `pending` means the conversation is still active but waiting on the customer/agent side rather than fully resolved
- **Queueing & wait time**: queue membership is runtime state in Redis/BullMQ, not database state; when all online/active agents are busy, new conversations queue and EWT uses `(Queue Position / Active Agents) x Average Handle Time`
- **Async processing**: email delivery and AI calls run through BullMQ background jobs rather than blocking request/response cycles
- **Providers**: Resend for inbound/outbound email; Google Gemini for summaries and auto-reply drafts
- **Message tracking**: `Conversation.lastMessageId` tracks the latest message in the conversation regardless of channel; email threading still uses message email headers (`emailMessageId`, `emailInReplyTo`) and inbound `In-Reply-To`/`References`
- **AI draft storage**: `Message.isAiDraft = true` represents a non-sent suggested reply, not a delivered customer/agent message
- **Knowledge Base URLs**: article and category slugs are workspace-scoped and used for clean public URLs
- **Custom domain SSL**: use the easiest deployment-compatible managed certificate path, preferably Vercel/Cloudflare-managed SSL; app stores DNS verification state and documents the production flow
- **Resilience**: Redis-backed token bucket rate limiting, circuit breakers, retry-with-exponential-backoff for external service calls, and debouncing/throttling where relevant

## Trade-offs Explicitly Deferred

| Deferred Item | Reason |
|---|---|
| Password reset flow | Not required for Phase 1; users choose their password during signup |
| Refresh tokens | JWT access tokens are sufficient for Phase 1 |
| Social sign-in | Email/password is sufficient for assignment scope |
| Workload-aware agent assignment | Simple round-robin is sufficient for Phase 1; smarter balancing is future scope |
| ML-based wait time prediction | Formula-based EWT with rolling averages is enough without ML models |
| Cloud S3 Storage | Extensible `StorageProvider` interface implemented with local disk storage; ready for S3 provider swap |
| Automated tests | Deprioritized in favor of shipping full feature scope within the time window |
| Canned responses, contact timeline, SLA tracking | Valid stretch goals, but not included in Phase 1 to protect delivery of mandatory features |

## Why AI Auto-Reply Drafts Was Chosen

AI Auto-Reply Drafts directly strengthen the AI integration evaluation criterion, reuse the same Gemini integration built for conversation summaries, and deliver visible day-to-day value to agents/admins with relatively low additional implementation cost.
