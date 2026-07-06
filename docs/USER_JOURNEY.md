# USER_JOURNEY.md

## 1. User Signup and Workspace Creation

1. User opens the app and signs up with name, email, password, and workspace name.
2. Backend normalizes the workspace name and checks the unique `Workspace.name` value.
3. If the workspace does not exist, backend creates it and assigns the signup user the `admin` role.
4. If the workspace already exists, backend creates the user in that workspace with the `agent` role by default.
5. Backend returns a JWT access token and the user's resolved permission flags.

## 2. Login

1. User logs in with email and password.
2. Backend validates: user exists by email, user is active, workspace is active, and hashed password matches.
3. Backend returns a JWT access token, user details, workspace details, role, and permission flags.
4. Frontend uses permission flags to show/hide routes and actions; backend remains the security boundary.

## 3. Admin Manages Team

1. Admin invites a teammate by entering name, email, and selecting a role (`admin` or `agent`).
2. Backend creates a user scoped to the same `workspace_id`, generates a temporary password, and sends an invite email via Resend.
3. Admin can change user roles later using RBAC-backed role updates.
4. Admin can deactivate users without deleting their records.

## 4. Agent Goes Online

1. Agent or admin logs in and establishes a Socket.io connection.
2. Backend sets `agent:{user_id}:status = available` in Redis.
3. User can manually set status to `away`.
4. Backend sets status to `busy` when an active conversation is assigned.
5. If the socket disconnects, backend sets status to `offline`.

## 5. Customer Initiates a Chat

1. Customer visits a website with the embedded widget. `data-workspace-id` identifies the tenant.
2. Widget opens and shows a static greeting without creating a backend conversation.
3. As the customer types, debounced public KB suggestions may appear.
4. Customer sends the first message; backend creates or finds a `Contact` using anonymous `visitor_id`, creates a `Conversation`, and stores the first `Message`.
5. Backend checks Redis for available agents in the workspace.
6. If an agent is available, round-robin assignment picks the next available agent and the widget shows a connecting state.
7. If all online/active agents are busy, the conversation queues in Redis/BullMQ runtime state and the widget shows estimated wait time plus an email fallback option.

## 6. Customer Initiates via Email

1. Customer sends email to the workspace support address.
2. Resend receives the email and calls the inbound webhook at `/api/v1/webhooks/email/inbound`.
3. Backend parses the webhook JSON event, finds or creates a `Contact` by email, and threads by matching `In-Reply-To`/`References` headers against stored outbound `Message.emailMessageId` values.
4. If no matching thread exists, backend creates a new email conversation for that workspace.
5. The conversation appears in the unified inbox.

## 7. Agent or Admin Handles a Conversation

1. Agent or admin replies from the unified inbox.
2. Chat replies are delivered via Socket.io.
3. Email replies are sent through Resend with Message-ID/In-Reply-To headers preserved.
4. AI summaries and AI reply drafts are generated asynchronously through BullMQ and Gemini.
5. AI reply drafts are stored as non-sent draft messages using `Message.isAiDraft`.
6. `Conversation.lastMessageId` tracks the latest message regardless of channel.
7. Admins can reassign conversations, including escalation to admins.
8. Agents and admins can mark conversations `open`, `pending`, `snoozed`, or `resolved` according to their permissions.

## 8. Admin Oversight

1. Admin can view workspace overview data.
2. Admin can manage team members, roles, knowledge base articles, and custom domains.
3. Admin can reassign conversations and handle escalations.

## 9. Deactivation

- Admin can set a user's `is_active` to `false`.
- Workspace deactivation remains a backend/admin operation, not a public user flow.
