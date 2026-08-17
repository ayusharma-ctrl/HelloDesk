# PHASE_2.md

## Scope

Phase 2 focuses on platform modernization, client optimization, dynamic branding, multi-tier NestJS framework migration, multi-model AI observability, and containerized local orchestration.

## Features & Architectural Enhancements Covered

1. **Client Modernization & Interceptors**: Centralized Axios HTTP client (`src/lib/api-client.ts`) with automatic bearer token injection and instant 401 un-authenticated redirects.
2. **Zero-Polling Socket.io Real-Time Synchronization**: Replaced background HTTP polling with instant Socket.io event listeners (`ai:summary-ready`, `ai:draft-ready`, `presence:changed`, `conversation:updated`) bound to TanStack Query cache invalidation.
3. **Agent Conversation Scoping & RBAC Rules**: Strictly scoped agent visibility to assigned threads, while providing Admins full workspace visibility, conversation reassignment, and post-resolution reopening control.
4. **Agent Presence State Machine & Auto-Assignment**: Real-time agent status transitions (`available`, `busy`, `away`, `offline`) synchronized with Redis presence sets and automatic queue processing (`processQueue`).
5. **Bidirectional Real-Time Receipts & Widget CORS**: Dynamic CORS origin reflection for embeddable widgets (`widget.js`), instant read/seen receipt sync between agents and visitors, and resolved conversation lock guardrails.
6. **Decoupled Tenant Knowledge Base**: Public-facing help center layout (`PublicKbLayout.tsx`) decoupled from agent dashboard sidebars, scoped strictly by tenant custom domain or `workspaceId`.
7. **Virtualized Inbox Pagination**: Server-side pagination (`page`, `limit`) combined with TanStack `useInfiniteQuery` and windowed list virtualization for 60 FPS rendering of large inbox lists.
8. **Dynamic CSS Theme Tokens & Branding**: Workspace design tokens (`:root` CSS variables) with color pickers, 1-click theme presets, custom workspace logo uploads, and short name branding.
9. **Extensible File Attachments & Ratings**: Abstract `StorageProvider` interface with local disk upload handling (50MB limit) and 1-5 star customer resolution ratings.
10. **LangChain Multi-Model Integration & Observability**: Replaced direct Gemini SDK calls with LangChain unified multi-model dispatcher (`@langchain/core`, `@langchain/google-genai`, `@langchain/openai`), automated model credential testing, error circuit breakers, token usage accounting, workspace tier caps, and real-time LLM observability logs.
11. **NestJS v11 Framework Migration (Node.js 24.19.0 LTS)**: Complete backend migration from Express monolith to NestJS v11 with 13 feature modules, `@WebSocketGateway()` WebSockets, and zero API contract breaking changes.
12. **Containerization & Docker Compose**: Multi-stage `Dockerfile` definitions for `hellodesk-server` and `hellodesk-client`, orchestrated via `docker-compose.yml` powering PostgreSQL 18.6, Redis 7, NestJS server, and Next.js client.

## Key Architectural Decisions

- **Framework Standard**: NestJS v11 running on Node.js 24.19.0 LTS target with strict TypeScript compilation.
- **Layered Pattern**: Multi-tier **Controller -> Service -> Repository** pattern across all feature modules.
- **Validation**: Input payload validation via Zod schemas (`signupSchema`, `loginSchema`, `sendMessageSchema`, etc.).
- **Docker Mount Pattern**: PostgreSQL 18+ data volume mounted at `/var/lib/postgresql` with Alpine OpenSSL musl binary targets.
