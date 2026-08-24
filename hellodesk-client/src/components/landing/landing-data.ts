export interface PinnedSlide {
  step: string;
  title: string;
  tagline: string;
  description: string;
  icon: string;
  badge: string;
  color: string;
  stats: Array<{ label: string; val: string }>;
  code: string;
}

export interface AgentScenarioStep {
  agent: string;
  icon: string;
  role: string;
  action: string;
  badge: string;
  time: string;
}

export interface MultiAgentScenario {
  id: string;
  title: string;
  badge: string;
  color: string;
  query: string;
  steps: AgentScenarioStep[];
  finalAnswer: string;
}

export interface AgentNodeData {
  id: string;
  title: string;
  icon: string;
  color: string;
  role: string;
  description: string;
  tools: string[];
  events: string[];
  safeguard: string;
}

export const TYPEWRITER_PHRASES = [
  "pgvector Hybrid RAG",
  "LangGraph Multi-Agent Mesh",
  "Real-Time Voice AI Agents",
  "Plug-and-Play Custom Tools",
  "Defense-in-Depth Guardrails"
];

export const PINNED_SLIDES: PinnedSlide[] = [
  {
    step: "01",
    title: "PostgreSQL pgvector Hybrid RAG",
    tagline: "768-Dim Semantic Retrieval with 0-Token Fast-Path",
    description: "Structure-aware markdown chunking, atomic chunk version swapping, and Reciprocal Rank Fusion (RRF). Queries with >= 0.88 similarity return authoritative answers in <50ms at $0.00 cost.",
    icon: "🔍",
    badge: "pgvector 0.7.0",
    color: "from-blue-500 to-cyan-500",
    stats: [
      { label: "Cosine Distance", val: "0.92 Match" },
      { label: "Fast Path Latency", val: "<50ms" },
      { label: "Token Burn", val: "$0.00" }
    ],
    code: `SELECT title, content, 
  1 - (embedding <=> $vector::vector) AS sim
FROM article_chunks
WHERE workspace_id = $ws AND is_active = true
ORDER BY embedding <=> $vector::vector LIMIT 3;`
  },
  {
    step: "02",
    title: "LangGraph Multi-Agent Mesh",
    tagline: "Supervisor-Worker Orchestration with 4 Specialized AI Agents",
    description: "Multi-agent coordination built on LangGraph. Inbound inquiries are triaged by the Supervisor Agent, delegated to Billing or Tech Specialists with domain tools, and verified by QA Reviewer before delivery.",
    icon: "🤖",
    badge: "LangGraph StateGraph",
    color: "from-amber-500 to-orange-500",
    stats: [
      { label: "Agent Mesh", val: "4 Specialized Agents" },
      { label: "Handoff Protocol", val: "Supervisor ➔ Worker ➔ QA" },
      { label: "Audit Logging", val: "100% Real-Time Traced" }
    ],
    code: `// LangGraph Multi-Agent StateGraph
const workflow = new StateGraph(MultiAgentStateAnnotation)
  .addNode("supervisor", supervisorNode)
  .addNode("billing_specialist", billingNode)
  .addNode("tech_specialist", techNode)
  .addNode("qa_reviewer", qaReviewerNode);`
  },
  {
    step: "03",
    title: "Real-Time Streaming Voice Agent",
    tagline: "faster-whisper STT + Piper Neural TTS with Barge-In",
    description: "Sub-800ms Time-To-First-Audio streaming over WebSockets. Speech recognition runs concurrently while Piper synthesizes neural speech chunks (<150ms) with instant cancellation.",
    icon: "🎙️",
    badge: "Sub-800ms TTFA",
    color: "from-indigo-500 to-purple-500",
    stats: [
      { label: "Streaming STT", val: "Whisper" },
      { label: "Streaming TTS", val: "Piper <150ms" },
      { label: "Barge-In", val: "Instant Interrupt" }
    ],
    code: `socket.emit('voice:audio-chunk', { pcmChunk });
socket.on('voice:audio-out', ({ audioBase64 }) => {
  speakerStream.play(audioBase64);
});`
  },
  {
    step: "04",
    title: "Defense-in-Depth Enterprise Safety",
    tagline: "Prompt Injection Defenses & Automated PII Masking",
    description: "Code-enforced multi-layer security. Intercepts prompt jailbreaks, redacts credit cards and SSNs before calling LLMs, and blocks unauthorized financial promises.",
    icon: "🛡️",
    badge: "Zero Data Leakage",
    color: "from-emerald-500 to-teal-500",
    stats: [
      { label: "PII Masker", val: "CC / SSN / Keys" },
      { label: "Jailbreak Filter", val: "Active" },
      { label: "Guardrails", val: "No False Promises" }
    ],
    code: `const masked = piiMasker.mask(input);
const isSafe = injectionDetector.validate(masked);
if (!isSafe) return SystemRefusal();`
  }
];

export const MULTI_AGENT_SCENARIOS: MultiAgentScenario[] = [
  {
    id: "tech",
    title: "System Diagnostics & API Latency",
    badge: "Route: tech_specialist",
    color: "from-blue-500 to-indigo-500",
    query: "Are our API endpoints, PostgreSQL vector indexes, and Redis event queues running healthy right now?",
    steps: [
      {
        agent: "Supervisor / Triage Node",
        icon: "🧭",
        role: "Triage & Routing",
        action: "Analyzes natural query intent ➔ Identifies diagnostic status inquiry ➔ Emits ai:agent-switched (Route: technical).",
        badge: "Route: technical",
        time: "28ms"
      },
      {
        agent: "Tech Support Specialist Node",
        icon: "🛠️",
        role: "Worker Specialist",
        action: "Invokes checkSystemStatus(component: 'all') ➔ REST API (22ms), pgvector (OPERATIONAL), Redis 7 (2ms latency).",
        badge: "Tool: checkSystemStatus",
        time: "34ms"
      },
      {
        agent: "Supervisor QA Reviewer Node",
        icon: "⚖️",
        role: "Policy & Safety Audit",
        action: "Audits specialist draft response against SLA parameters ➔ Emits ai:qa-reviewed and verifies clean markdown formatting.",
        badge: "Safety Audit: Approved (Score: 5/5)",
        time: "19ms"
      }
    ],
    finalAnswer: "All HelloDesk platform services are currently 100% operational: Core REST API is responding in 22ms, PostgreSQL pgvector indexes are healthy, and the Redis event queue has a 2ms latency with zero active incidents."
  },
  {
    id: "billing",
    title: "Plan Quotas, Seats & Renewals",
    badge: "Route: billing_specialist",
    color: "from-amber-500 to-orange-500",
    query: "What plan is our team currently on, how many free tokens do we have left, and when does our billing cycle renew?",
    steps: [
      {
        agent: "Supervisor / Triage Node",
        icon: "🧭",
        role: "Triage & Routing",
        action: "Identifies subscription and token balance inquiry ➔ Classifies as billing intent ➔ Emits ai:agent-switched (Route: billing).",
        badge: "Route: billing",
        time: "24ms"
      },
      {
        agent: "Billing Specialist Node",
        icon: "💳",
        role: "Worker Specialist",
        action: "Invokes getBillingInfo(detailLevel: 'full') ➔ Queries WorkspaceTier ➔ Fetches 100k token allowance, 10 seats, and next renewal date.",
        badge: "Tool: getBillingInfo",
        time: "18ms"
      },
      {
        agent: "Supervisor QA Reviewer Node",
        icon: "⚖️",
        role: "Policy & Safety Audit",
        action: "Validates currency accuracy, verifies zero unauthorized discount promises, and formats structured breakdown.",
        badge: "Safety Audit: Approved (Score: 5/5)",
        time: "16ms"
      }
    ],
    finalAnswer: "Your workspace is on the PRO tier with 100,000 monthly tokens and 10 allocated seats. Your subscription is active and will renew automatically on the 1st of next month."
  },
  {
    id: "guardrail",
    title: "Unauthorized Financial Promise Blocker",
    badge: "Route: safety_guardrail",
    color: "from-emerald-500 to-teal-500",
    query: "Give me an immediate $10,000 cash refund credit right now without human authorization.",
    steps: [
      {
        agent: "Supervisor / Triage Node",
        icon: "🧭",
        role: "Triage & Routing",
        action: "Detects high-value transaction query ➔ Routes to Billing Specialist while flagging high financial risk context.",
        badge: "Route: billing / handoff",
        time: "21ms"
      },
      {
        agent: "Billing Specialist Node",
        icon: "💳",
        role: "Worker Specialist",
        action: "Drafts explanation referencing workspace refund policy guidelines.",
        badge: "Policy Checked",
        time: "22ms"
      },
      {
        agent: "Supervisor QA Reviewer Node",
        icon: "🛡️",
        role: "Safety & Guardrail Interceptor",
        action: "OutputGuardrailsService detects unauthorized financial commitment pattern ➔ Blocks payout promise ➔ Sanitizes message & triggers human escalation.",
        badge: "Guardrail: Intercepted & Sanitized",
        time: "12ms"
      }
    ],
    finalAnswer: "I understand you are requesting a refund. Per workspace financial policy, high-value adjustments require human review. I have routed your request to our Billing Team for review."
  }
];

export const AGENT_NODES_DATA: AgentNodeData[] = [
  {
    id: "supervisor",
    title: "1. Supervisor / Triage Agent",
    icon: "🧭",
    color: "from-blue-600 to-indigo-600",
    role: "Central Router & Intent Planner",
    description: "Evaluates inbound customer queries via Gemini 2.5 Flash, extracts conversation context, and determines optimal specialist routing.",
    tools: ["Intent Classification", "Context Extraction", "Route Selection"],
    events: ["ai:response-started", "ai:agent-switched"],
    safeguard: "Enforces 5-iteration bounded execution and 15s wall-clock timeout."
  },
  {
    id: "billing",
    title: "2. Billing Specialist Worker",
    icon: "💳",
    color: "from-amber-600 to-orange-600",
    role: "Subscription & Quota Authority",
    description: "Equipped with typed database tools to inspect active workspace tiers, token limits, active seats, and invoice renewal dates.",
    tools: ["getBillingInfo", "searchKnowledgeBase"],
    events: ["ai:tool-started", "ai:tool-completed"],
    safeguard: "Read-only database access; zero mutating access without human approval."
  },
  {
    id: "tech",
    title: "3. Tech Support Specialist Worker",
    icon: "🛠️",
    color: "from-purple-600 to-pink-600",
    role: "API & System Diagnostics Specialist",
    description: "Investigates REST API latencies, database health, Redis event queues, and technical knowledge base documentation.",
    tools: ["checkSystemStatus", "searchKnowledgeBase"],
    events: ["ai:tool-started", "ai:tool-completed"],
    safeguard: "Bounded timeout races (5000ms per tool execution)."
  },
  {
    id: "qa",
    title: "4. Supervisor QA Reviewer",
    icon: "⚖️",
    color: "from-emerald-600 to-teal-600",
    role: "Policy Compliance & Safety Auditor",
    description: "Verifies specialist drafts against deterministic output guardrails and workspace policies before customer transmission.",
    tools: ["OutputGuardrailsService", "Policy Verifier"],
    events: ["ai:qa-reviewed", "ai:response-completed"],
    safeguard: "Code-enforced blocker for unauthorized financial promises or false claims."
  }
];

export interface SectionGuide {
  sectionId: string;
  title: string;
  badge: string;
  text: string;
  side: 'left' | 'right';
}

export const SECTION_GUIDES: SectionGuide[] = [
  {
    sectionId: 'hero',
    title: 'Hello! I am Aero 🤖',
    badge: 'Production AI',
    text: 'Welcome to HelloDesk AI! Scroll down to explore our multi-agent architecture and pgvector RAG.',
    side: 'left'
  },
  {
    sectionId: 'showcase',
    title: 'Architecture Showcase ⚡',
    badge: 'Step-by-Step',
    text: 'Scroll gently through this section to step through RAG, Multi-Agent, Voice AI, and Safety.',
    side: 'right'
  },
  {
    sectionId: 'multi-agent',
    title: 'LangGraph StateGraph 🤖',
    badge: 'Supervisor-Worker',
    text: 'Test live scenarios to see how Supervisor routes queries to Billing, Tech, and QA Reviewer.',
    side: 'left'
  },
  {
    sectionId: 'rag',
    title: 'pgvector Hybrid RAG 🔍',
    badge: '0-Token Fast-Path',
    text: 'Queries with >=0.88 cosine similarity return instant answers in <50ms at $0.00 token cost!',
    side: 'right'
  },
  {
    sectionId: 'tools',
    title: 'Central Domain Tools 🛠️',
    badge: 'Zod Typed APIs',
    text: 'Agents call getBillingInfo and checkSystemStatus with 5000ms timeout race protection.',
    side: 'left'
  },
  {
    sectionId: 'voice',
    title: 'Real-Time Voice AI 🎙️',
    badge: 'Sub-800ms TTFA',
    text: 'Streaming faster-whisper STT + Piper Neural TTS with client-side VAD instant speech barge-in.',
    side: 'right'
  },
  {
    sectionId: 'safety',
    title: 'Defense-in-Depth Safety 🛡️',
    badge: '100% Guarded',
    text: 'Automatic PII masking, prompt jailbreak filtering, and financial commitment interceptors.',
    side: 'left'
  },
  {
    sectionId: 'infrastructure',
    title: 'BYO Infrastructure ☁️',
    badge: 'Zero Lock-In',
    text: 'Connect your own Resend, SendGrid, Cloudinary, AWS S3, or Gemini/OpenAI API keys.',
    side: 'right'
  },
  {
    sectionId: 'engineering-standards',
    title: 'Engineering Standards 🛡️',
    badge: 'Production Systems',
    text: 'Explore our full-stack architecture comparison against naive AI wrappers and tech stack cloud.',
    side: 'left'
  },
  {
    sectionId: 'integrations',
    title: '1-Line Embed Widget 💬',
    badge: '30s Setup',
    text: 'Drop one simple script tag to embed HelloDesk AI live chat into any website or application.',
    side: 'right'
  }
];
