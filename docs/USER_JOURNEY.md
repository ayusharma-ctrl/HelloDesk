# HelloDesk — Complete User Journeys & End-to-End Flow Architecture

This document outlines the end-to-end user journeys, decision graphs, RAG search mechanics, tool calling pipelines, and multi-agent observability across HelloDesk.

---

## 1. Master System Flowchart

```mermaid
flowchart TD
    Start([Customer Initiates Inquiry]) --> ChannelChoice{Channel Type}
    
    %% Channel Branching
    ChannelChoice -->|Live Chat Widget| ChatFlow[Chat Widget Channel]
    ChannelChoice -->|Inbound Email| EmailFlow[Resend Webhook Channel]
    ChannelChoice -->|Real-Time Voice| VoiceFlow[Socket.io Voice Gateway]

    %% Voice Subflow
    VoiceFlow --> STT[Whisper STT Streaming Adapter]
    STT --> AudioToText[Transcript Emitted]
    AudioToText --> AgentEntry[Autonomous AI Core Runtime]

    %% Chat & Email Entry
    ChatFlow --> AgentEntry
    EmailFlow --> AgentEntry

    %% Pre-flight Safety
    AgentEntry --> Safety1{Prompt Injection Check}
    Safety1 -->|Adversarial Jailbreak| InjectionBlock[Return Safe System Refusal]
    Safety1 -->|Safe| PIIMask[PII Masker: Redact CC / SSN / API Keys]

    %% RAG Engine & Fast Path
    PIIMask --> RAGRetrieval[PostgreSQL pgvector Hybrid Retrieval: RRF]
    RAGRetrieval --> FastPathCheck{Confidence >= 0.88 & Exact Match?}
    FastPathCheck -->|Yes - Exact Match| FastPathReturn[0-Token Fast-Path Response: <50ms, $0.00]
    FastPathCheck -->|No - Complex Query| ReasoningLoop[Bounded ReAct State Machine: Max 5 Iterations]

    %% Tool Calling & Reasoning
    ReasoningLoop --> ModelDecision{Agent Next Action?}
    ModelDecision -->|Call Domain / Custom Tool| ExecTool[Execute Typed Tool with Timeout & Audit Log]
    ExecTool --> ReasoningLoop
    ModelDecision -->|Customer Demands Human / Low Confidence| HandoffCheck{Human Agent Online in Redis?}
    
    %% Handoff Logic
    HandoffCheck -->|Yes| AssignHuman[Assign to Online Specialist & Emit Alert]
    HandoffCheck -->|No| OfflineSLA[Explain Specialists Offline & Promise 24h Email Reply]

    ModelDecision -->|Final Response Synthesized| Guardrails[Output Safety Guardrails & PII Unmasking]
    
    %% Response Delivery
    Guardrails --> DeliveryChoice{Channel Type}
    DeliveryChoice -->|Live Chat| DeliverChat[Deliver Message via Socket.io]
    DeliveryChoice -->|Inbound Email| DeliverEmail[Send Threaded Email via Resend]
    DeliveryChoice -->|Voice Session| PiperTTS[Streaming Piper Neural TTS <150ms]
    PiperTTS --> AudioOut[Stream Audio Chunks to Customer Speaker]

    %% Barge-In Interruption
    AudioOut --> BargeInEvent{Customer Speaks During Audio?}
    BargeInEvent -->|Yes: voice:interrupt| CancelPlayback[Abort Piper Stream & Reset Turn]
```

---

## 2. Inbound Chat Scenarios & Decision Logic

### Scenario A: Instant FAQ Resolution (0-Token Fast Path)
1. Customer types: *"What is your return policy for shoes?"*
2. `HybridRetrieverService` executes Reciprocal Rank Fusion combining pgvector cosine distance + PostgreSQL full-text search.
3. High similarity match (> 0.88) found in published article `Return Policy`.
4. **Fast-Path Action**: The exact snippet is returned directly to the widget in **<50ms with 0 LLM tokens burned ($0.00 cost)**.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Widget as Chat Widget
    participant Server as NestJS Backend
    participant DB as PostgreSQL (pgvector)

    Customer->>Widget: "What is your return policy?"
    Widget->>Server: POST /widget/messages
    Server->>DB: 1 - (embedding <=> query_vec) WHERE workspace_id = $ws
    DB-->>Server: Similarity: 0.93 (Exact Match)
    Server-->>Widget: Return KB snippet directly (0-tokens, <50ms)
    Widget-->>Customer: Displays authoritative answer with KB source link
```

---

### Scenario B: Dynamic Tool Calling (Live Order Lookup)
1. Customer types: *"Where is my package for order ORD-10294?"*
2. Safety pre-flight passes; pgvector retrieves general shipping policies.
3. LLM decides action: `{"action": "tool_call", "toolName": "getOrderStatus", "parameters": {"orderId": "ORD-10294"}}`.
4. `ToolRegistryService` validates parameters with Zod schema, invokes authoritative endpoint, and records `ToolExecutionLog`.
5. LLM ingests tool result: `{ status: "shipped", trackingNumber: "TRK-98234190", carrier: "FastCourier" }`.
6. LLM synthesizes friendly status with tracking link and delivery estimate.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Agent as AgentRuntimeService
    participant Tools as ToolRegistryService
    participant Carrier as Shipping / Custom API
    participant Guard as OutputGuardrailsService

    Customer->>Agent: "Where is order ORD-10294?"
    Agent->>Tools: executeTool("getOrderStatus", { orderId: "ORD-10294" })
    Tools->>Carrier: GET /api/orders/ORD-10294
    Carrier-->>Tools: 200 OK { status: "Out for Delivery" }
    Tools-->>Agent: Tool result returned
    Agent->>Guard: Validate synthesized answer
    Guard-->>Agent: Output safe (no unauthorized financial promise)
    Agent-->>Customer: "Order ORD-10294 is Out for Delivery with FastCourier!"
```

---

### Scenario C: Custom Plug-and-Play API Tool (Enterprise User Database)
1. Workspace Admin registers a custom API tool `query_user_subscription` pointing to `https://api.mycompany.com/v1/sub` with Auth headers.
2. System tests endpoint with pre-flight verification before saving.
3. When customer asks: *"What plan am I on?"*, AI dynamically extracts customer email and invokes the custom tool.
4. AI responds with current tier and renewal dates without human intervention.

---

### Scenario D: Human Escalation & Offline Fallback
1. Customer explicitly demands: *"I need to speak to a human representative."*
2. `AssignToHumanAgentTool` queries Redis presence `workspace:{id}:presence`.
3. **If Agents are Online**:
   - System assigns conversation to least-busy agent via round-robin.
   - Emits `agent:handoff-alert` real-time notification to the Agent Inbox.
   - AI transitions to Copilot mode (only generates private drafts, never sends customer messages).
4. **If Agents are Offline**:
   - AI responds: *"All human specialists are currently offline. Our team will review your inquiry and email you within 24 hours."*
   - Widget displays email capture form.

---

## 3. Real-Time Autonomous Voice Agent Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer Browser (Mic/Speaker)
    participant Gateway as VoiceGateway (Socket.io)
    participant STT as WhisperAdapterService
    participant Agent as AgentRuntimeService
    participant TTS as PiperAdapterService

    Customer->>Gateway: voice:session-start
    Gateway-->>Customer: voice:session-ready
    
    loop Streaming Turn
        Customer->>Gateway: voice:audio-chunk (WebM / PCM)
        Gateway->>STT: appendAudioChunk()
    end

    Customer->>Gateway: voice:audio-chunk (isFinal: true)
    STT-->>Gateway: voice:transcript-final (sttLatencyMs: 210ms)
    Gateway-->>Customer: voice:transcript-final
    
    Gateway->>Agent: runAgent(transcript, channel='voice')
    Agent-->>Gateway: finalResponse (agentLatencyMs: 340ms)
    
    Gateway->>TTS: synthesizeStream(finalResponse)
    loop Streaming Audio Chunks
        TTS-->>Gateway: Audio Chunk 1..N (<150ms / chunk)
        Gateway-->>Customer: voice:audio-out
        Customer->>Customer: Playback on Speaker (TTFA: 680ms)
    end

    opt Customer Interrupts (Barge-In)
        Customer->>Gateway: voice:interrupt
        Gateway->>TTS: cancelSynthesis()
        Gateway-->>Customer: voice:playback-cancelled
        Note over Customer,Gateway: Speaker output halts instantly, context resets
    end
```

---

## 4. Multi-Agent & Copilot Interaction Matrix

| Mode | Trigger Condition | AI Role | Customer Visibility | Sender Type |
|---|---|---|:---:|:---:|
| **Autonomous AI Bot** | Unassigned conversation + AI enabled | Answers questions, calls tools, handles voice | **Visible directly** | `bot` |
| **Copilot Smart Draft** | Human agent assigned | Generates private draft suggestions | **Private to agent only** | `agent` (Draft) |
| **Fast-Path Exact Match** | High-confidence FAQ match (>0.88) | Direct KB return (0-token, <50ms) | **Visible directly** | `bot` |
| **Human Specialist** | Human assigned & active | Human types and replies | **Visible directly** | `agent` |
