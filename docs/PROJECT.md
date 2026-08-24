# PROJECT.md — HelloDesk Autonomous AI Support Platform

## Overview

**HelloDesk** is a production-grade, multi-tenant Autonomous AI Customer Communication Platform. It unifies **Live Chat, Inbound Email, and Real-Time Voice** with PostgreSQL `pgvector` RAG, typed domain tool calling, streaming neural speech (STT/TTS with barge-in), multi-layer enterprise safety guardrails, and seamless human agent collaboration.

---

## Core Capabilities

1. **Multi-Channel Autonomous Support**:
   - **Live Chat Widget**: Real-time Socket.io chat with unread count badges, `ayusharma-ctrl` branding, and multi-channel mode switching (AI Chat, Voice Agent, Human Specialist).
   - **Inbound Email**: Resend webhook integration with header-based threading (`In-Reply-To`, `References`) and autonomous AI resolution.
   - **Real-Time Voice AI Agent**: Sub-800ms Time-To-First-Audio (TTFA) streaming speech recognition (`faster-whisper`) and neural speech synthesis (`Piper`) with client-side speech detection and instant barge-in interruption.

2. **PostgreSQL pgvector RAG Engine**:
   - Structure-aware semantic markdown chunking (`ChunkingService`).
   - 768-dimensional normalized embeddings (`text-embedding-004`).
   - Hybrid Reciprocal Rank Fusion (RRF) combining vector cosine distance and lexical full-text matching.
   - **0-Token Fast-Path**: High-confidence exact FAQ matches (>0.88 similarity) return authoritative answers in <50ms with zero LLM API calls and $0.00 cost.

3. **LangGraph Supervisor-Worker Multi-Agent Mesh**:
   - Built on `@langchain/langgraph` `StateGraph` with typed state annotations and conditional routing edges.
   - **4 Specialized Agents**:
     1. **Supervisor / Triage Agent**: Analyzes intent, plans execution steps, and routes to specialist workers.
     2. **Billing Specialist Agent**: Equipped with `getBillingInfo` to handle subscription tiers, quotas, invoices, and payment renewals.
     3. **Tech Support Specialist Agent**: Equipped with `checkSystemStatus` & `searchKnowledgeBase` to diagnose platform health, API latencies, and technical inquiries.
     4. **Supervisor QA Reviewer Agent**: Validates worker drafts against workspace policies and safety guardrails before customer delivery.
   - Deterministic execution bounds: `maxIterations: 5`, 15,000ms wall-clock limit, 4,000 token budget.
   - Standard Built-In Domain Tools: `searchKnowledgeBase`, `assignToHumanAgent`, `getCustomerProfile`, `getBillingInfo`, `checkSystemStatus`, `getWorkspacePolicy`.
   - **Custom Plug-and-Play API Tools**: Workspace admins can connect external business APIs with authentication headers and pre-flight validation.

4. **Multi-Layer AI Safety & Defense-in-Depth**:
   - Prompt injection jailbreak detector (`InjectionDetectorService`).
   - Automated code-enforced PII masking for credit cards, SSNs, and API keys (`PiiMaskerService`).
   - Output guardrails blocking unauthorized financial commitments or fabricated promises (`OutputGuardrailsService`).

5. **Observability, Cost Intelligence & Evals**:
   - Hierarchical `TraceContext` capturing spans across retrieval -> tools -> model -> guardrails.
   - Per-workspace token consumption and real-time dollar expenditure tracking (`CostAccountingService`).
   - Automated 6-scenario golden benchmark evaluation suite with interactive scorecards (`EvaluationService`).

6. **Unified Agent Inbox & Admin Dashboard**:
   - Real-time inbox for human specialists with AI smart drafts and summaries.
   - Operations & AI Insights Dashboard (`/dashboard`) monitoring resolution rates, queues, and LLM telemetry.
   - 4-Tier Hierarchical RBAC (`Owner`, `Admin`, `Agent`, `Viewer`) with customizable permissions.

7. **Bring Your Own Infrastructure (BYOI) & Multi-Provider Ecosystem**:
   - **Bring Your Own Email (BYOE)**: Mandatory tenant-verified email platforms (**Resend**, **SendGrid**, **Mailgun**) with pre-flight live API verification, zero platform fallback, and SPF/DKIM domain guidance.
   - **Bring Your Own Storage (BYOS)**: Multi-tenant plug-and-play media and attachment storage (**Cloudinary**, **ImageKit.io**, **AWS S3 / Cloudflare R2 / MinIO**) with buffer streaming.
   - **Bring Your Own Models (BYOM)**: Multi-provider LLM support (**OpenAI GPT-4o**, **Google Gemini 2.5 Flash**, **Anthropic Claude**) with custom API keys and per-workspace token quotas.
   - **Enterprise Extensibility**: Extensible plugin architecture supporting custom third-party platforms on demand.

8. **End-to-End Testing & Live Demonstration Guide**:
   - Complete step-by-step verification script and performance benchmarks available in [END_TO_END_TESTING_DEMO_GUIDE.md](./END_TO_END_TESTING_DEMO_GUIDE.md).

---

## Architectural Invariants

- **Multi-Tenancy Isolation**: Every SQL query, pgvector cosine search, Redis key, and tool execution is strictly scoped by `workspace_id`.
- **Authoritative Tools**: The LLM is never the source of truth for transactional data; typed domain tools and database APIs are authoritative.
- **Deterministic-First**: Queries matching exact KB articles return immediately at 0 token cost.
- **Human Handoff as First-Class State**: When a human agent is active, AI operates strictly as a private Copilot (generating drafts and summaries, never sending messages to visitors).
