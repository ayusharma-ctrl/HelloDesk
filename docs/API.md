# API.md

## Public Endpoints

| Method | Endpoint                           | Description                                                                                                                       |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/v1/auth/signup`              | Create user with email/password and workspace name; create workspace + Admin if new, otherwise create Agent in existing workspace |
| `POST` | `/api/v1/auth/login`               | Email/password login; returns JWT access token, workspace, role, and permission flags                                             |
| `GET`  | `/api/v1/kb/public/search`         | Public knowledge base search                                                                                                      |
| `GET`  | `/api/v1/kb/public/articles/:slug` | Public article view by workspace-scoped slug                                                                                      |
| `POST` | `/api/v1/widget/conversations`     | Start conversation from widget after first visitor message                                                                        |
| `POST` | `/api/v1/widget/messages`          | Send message from widget                                                                                                          |
| `GET`  | `/api/v1/widget/kb-suggestions`    | Debounced KB suggestions inside widget                                                                                            |
| `POST` | `/api/v1/webhooks/email/inbound`   | Resend inbound email webhook event receiver                                                                                       |

## Authorized Endpoints

| Role / Permission  | Method   | Endpoint                               | Description                                                  |
| ------------------ | -------- | -------------------------------------- | ------------------------------------------------------------ |
| Any logged-in user | `GET`    | `/api/v1/auth/me`                           | Fetch current user, workspace, role, and permission flags    |
| Admin              | `GET`    | `/api/v1/dashboard/overview`           | Agent status counts and workspace overview                   |
| Admin              | `POST`   | `/api/v1/users/invite`                 | Invite agent/admin to workspace                              |
| Admin              | `GET`    | `/api/v1/users`                        | List workspace users                                         |
| Admin              | `PATCH`  | `/api/v1/users/:id/role`               | Change user role                                             |
| Admin              | `PATCH`  | `/api/v1/users/:id/status`             | Activate/deactivate a user                                   |
| Admin              | `PATCH`  | `/api/v1/conversations/:id/reassign`   | Reassign conversation to agent/admin for escalation          |
| Admin              | `POST`   | `/api/v1/domains`                      | Register custom domain                                       |
| Admin              | `GET`    | `/api/v1/domains/:id/verify`           | Check DNS/SSL verification status                            |
| Admin              | `POST`   | `/api/v1/kb/articles`                  | Create KB article                                            |
| Admin              | `PUT`    | `/api/v1/kb/articles/:id`              | Update KB article                                            |
| Admin              | `DELETE` | `/api/v1/kb/articles/:id`              | Delete KB article                                            |
| Agent/Admin        | `GET`    | `/api/v1/conversations`                | List conversations filtered by assignee, status, and channel |
| Agent/Admin        | `GET`    | `/api/v1/conversations/:id`            | Get conversation detail and messages                         |
| Agent/Admin        | `POST`   | `/api/v1/conversations/:id/messages`   | Reply to a chat or email conversation                        |
| Agent/Admin        | `PATCH`  | `/api/v1/conversations/:id/status`     | Snooze or resolve conversation                               |
| Agent/Admin        | `PATCH`  | `/api/v1/agents/me/status`             | Set own status to available/away                             |
| Agent/Admin        | `GET`    | `/api/v1/conversations/:id/ai-summary` | Fetch latest AI-generated summary                            |
| Agent/Admin        | `GET`    | `/api/v1/conversations/:id/ai-draft`   | Fetch latest AI-generated reply draft                        |

## Authorization Notes

- Authorized endpoints must use RBAC permission checks resolved from role-permission mappings.
- Frontend role checks are for UX only; backend permission checks are the security boundary.
- All workspace-owned resources must be scoped by `workspace_id`.
- Chat assignment auto-assigns only to available agents; admins can manually reassign to agents or admins for escalation.
- Queue membership is runtime state in Redis/BullMQ, not database-backed conversation status.
- `ConversationStatus.pending` is a client-agent conversation lifecycle status, not the queue implementation.
- `Conversation.lastMessageId` tracks the latest message for any channel.
- Inbound Resend email webhook JSON should be threaded by `In-Reply-To`/`References` headers against stored outbound `Message.emailMessageId` values; if no thread match is found, create a new email conversation for the workspace.
