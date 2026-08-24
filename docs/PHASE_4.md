# PHASE_4.md — Production Agentic AI, pgvector RAG & Enterprise Tooling

## Scope

Phase 4 evolves HelloDesk from background AI draft generation into a **production-grade, multi-tenant Autonomous AI Support Platform** with PostgreSQL pgvector RAG, a bounded Agentic AI runtime, typed domain tools, multi-layer safety guardrails, observability traces, and cost analytics.

---

## Key Features & Capabilities Implemented

### 1. Unified AI Architecture Foundation (`src/modules/ai/`)
- **Universal Provider Abstraction**: `LLMProvider` interface wrapping Google Gemini (`gemini-2.5-flash`) and OpenAI (`gpt-4o-mini`) with automatic circuit breaking, parameter normalization, and token usage accounting.
- **Trace Context Propagation**: Distributed `TraceContext` capturing hierarchical spans across retrieval -> tools -> model -> guardrails -> persistence.
- **Dynamic Prompt Registry**: `PromptRegistryService` with variable interpolation and database-backed prompt versioning (`PromptVersion`).

### 2. PostgreSQL pgvector Engine & Versioned KB Ingestion
- **PostgreSQL Vector Extension**: Enabled `vector` extension in Prisma schema with 768-dimension embeddings for `ArticleChunk`.
- **Structure-Aware Semantic Chunking**: `ChunkingService` splits markdown/HTML articles respecting headings (`#`, `##`, `###`), paragraphs, and token windows (400 tokens / 40 token overlap).
- **Embeddings Pipeline**: `EmbeddingService` generates normalized vectors using Gemini `text-embedding-004`.
- **Atomic Document Versioning**: `VectorStoreService` indexes new `ArticleVersion` records and atomically swaps active chunks upon publication.
- **Strict Tenant Scoping**: All vector queries include `WHERE ac.workspace_id = ${workspaceId}` at the SQL engine level.

### 3. Hybrid Retrieval & Deterministic Fast Path (0-Token Response)
- **Reciprocal Rank Fusion (RRF)**: `HybridRetrieverService` blends semantic vector distance and lexical full-text matching to accurately resolve exact product IDs, error codes, and general inquiries.
- **Retrieval Confidence Scoring**: `ConfidenceEvaluator` computes composite confidence scores (0.0–1.0) and determines exact-match eligibility.
- **Fast-Path 0-Token Fast Return**: If a query has an exact high-confidence FAQ/article match (>0.88 similarity), HelloDesk returns the authoritative snippet directly without invoking an LLM, reducing latency to <50ms and token costs to $0.00.

### 4. Bounded Agentic AI Runtime & State Machine
- **Explicit Agent State**: `AgentState` manages workspace, conversation, contact, channel, intent, retrieved context, tool calls, iteration count, and token budgets.
- **Deterministic Bounds**:
  - `maxIterations`: 5 reasoning steps.
  - `maxExecutionTimeMs`: 15,000ms.
  - `tokenBudget`: 4,000 tokens.
- **Deterministic Human Handoff**: `HandoffService` triggers escalation when confidence is low, tool execution fails, or the customer requests a human agent, notifying the agent dashboard with `agent:handoff-alert`.

### 5. Central Typed Tool Registry & Domain Tool Calling
- **Strict Zod Schemas**: `AgentTool` interface requiring input/output validation, risk classification, and audit logging.
- **Approved Domain Tools**:
  - `searchKnowledgeBase`: Deep tenant-scoped RAG search.
  - `getCustomerProfile`: Customer CRM history, ticket count, and memory facts.
  - `getOrderStatus`: Live e-commerce order fulfillment & payment status lookup.
  - `getDeliveryStatus`: Real-time shipping carrier tracking and milestone history.
  - `getWorkspacePolicy`: Return windows, warranty, and SLA policy lookup.
- **Audit Logging**: Every tool execution is persisted in `ToolExecutionLog` with execution latency, inputs, and outputs.

### 6. Autonomous Multi-Channel Live Chat & Email Support
- **Unassigned Mode**: In live chat and inbound email, when no human agent is online/assigned, `WidgetService` automatically engages the autonomous Agentic AI runtime to resolve customer tickets.
- **Human-Assigned Mode**: When a human agent is active, AI functions strictly as a copilot (generating smart drafts and summaries without directly sending messages).

### 7. Multi-Layer AI Safety, PII Redaction & Guardrails
- **Prompt Injection Pre-Flight**: `InjectionDetectorService` blocks jailbreak patterns (`"Ignore previous instructions"`, `"System prompt override"`).
- **PII Masking**: `PiiMaskerService` automatically redacts Credit Cards, SSNs, and API keys before sending prompts to external LLM providers.
- **Untrusted Context Boundary**: User queries and retrieved KB snippets are wrapped in explicit security delimiters.
- **Output Guardrails**: `OutputGuardrailsService` blocks unauthorized financial promises (e.g. fabricated refund claims) and triggers automatic human routing.

### 8. AI Observability, Tracing & Cost Intelligence
- **Cost Accounting**: `CostAccountingService` and `PRICING_MATRIX_V1` track token expenditure and real-time dollar costs per workspace and conversation.
- **Golden Evaluation Suite**: `EvaluationService` runs an automated 6-scenario benchmark suite validating FAQs, tool calling, handoff triggers, and injection defenses.

---

## API Endpoints Added in Phase 4

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/ai/tools` | List registered domain tools & schemas |
| `POST` | `/api/v1/ai/retrieval/search` | Test hybrid pgvector retrieval & fast-path matching |
| `POST` | `/api/v1/ai/agent/execute` | Execute autonomous agent run directly |
| `POST` | `/api/v1/ai/eval/run` | Run automated golden benchmark evaluation |
| `GET` | `/api/v1/ai/cost/analytics` | Fetch token usage and estimated dollar cost analytics |
