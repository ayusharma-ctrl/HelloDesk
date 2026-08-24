# PHASE_6.md — Advanced Tool Calling, Custom Plug-and-Play API Integrations & Chat Widget

## Scope

Phase 6 expands HelloDesk's agentic tool ecosystem with enterprise **Custom Plug-and-Play API Tools** (allowing companies to connect their proprietary APIs with pre-flight verification), smart human agent handoff logic with 24h offline fallback, and an upgraded **Chat Widget** with unread count badges, `ayusharma-ctrl` branding, and multi-channel mode switching.

---

## 1. Custom Plug-and-Play API Tools (`CustomToolService`)

Companies cannot and should not expose raw database credentials. HelloDesk allows workspace admins to register secure REST API endpoints with authentication headers:

### Tool Registration Lifecycle:
1. **Admin Definition**:
   - Tool Name (e.g. `check_subscription_status`, `lookup_billing_invoice`).
   - Description (Detailed prompt instructions for LLM parameter extraction).
   - HTTP Method (`GET` or `POST`).
   - Target Endpoint URL (`https://api.mycompany.com/v1/...`).
   - Authentication Headers (`{"Authorization": "Bearer ...", "X-API-Key": "..."}`).
2. **Mandatory Pre-Flight Verification**:
   - Before saving or activating any tool, the backend sends a test request to verify reachability and ensure it returns an HTTP 2xx response.
   - Saves with status `isActive: true` only upon successful pre-flight check.
3. **Dynamic LLM Ingestion**:
   - `ToolRegistryService.getToolDescriptionsPrompt(workspaceId)` dynamically binds active custom tools to the system prompt.
4. **Execution & Audit Logging**:
   - Every tool run is executed with a 5000ms timeout race and persisted in `ToolExecutionLog`.

---

## 2. Smart Human Handoff & Offline 24h Fallback (`AssignToHumanAgentTool`)

- Checks live Redis presence (`workspace:{id}:presence`).
- **If Human Agents Online**: Automatically assigns to least-busy agent and fires `agent:handoff-alert` real-time notification to the Agent Inbox.
- **If Human Agents Offline**: Courteously informs customer that specialists are away, captures inquiry, and sets expectation of a follow-up email response within 24 hours.

---

## 3. Chat Widget Capabilities

- **Unread Message Counter & Badge**: Tracks incoming messages while minimized; renders a red badge counter on the floating launcher; resets on open and syncs `/api/v1/widget/read`.
- **Mode Switching Bar**:
  - 💬 **AI Assistant** (Instant 0-token answers + tools)
  - 🎙️ **Voice AI Agent** (Opens real-time streaming voice session)
  - 👥 **Human Specialist** (Smart qualification and fallback)
- **Branding**: `⚡ Powered by ayusharma-ctrl` badge in footer.
- **Bot Distinction**: Bot messages are clearly distinguished with an `🤖 AI Assistant` pill.
