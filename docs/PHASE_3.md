# PHASE_3.md

## Scope

Phase 3 focuses on enterprise fine-grained access control (RBAC), workspace-level default agent permissions, custom per-agent permission overrides, structured global exception handling, and database backfill migrations.

## Features & Architectural Enhancements Covered

1. **Structured Global Error Interceptor & UI Banners**:
   - Implemented global `AllExceptionsFilter` (`http-exception.filter.ts`) in NestJS to intercept Zod validation errors, HTTP exceptions, and internal errors into `{ statusCode, error, message, details }`.
   - Differentiated detailed auth errors (`No account found with this email address`, `Account deactivated`, `Workspace suspended`, `Incorrect password`).
   - Created client helper `getErrorMessage()` in `api-client.ts` to surface clear validation and authorization feedback across Login, Signup, and Team forms.

2. **Workspace Default Agent Permissions**:
   - Added `WorkspaceDefaultPermission` model (`workspace_default_permissions` table) storing workspace-scoped default permission sets.
   - Seeded baseline agent default permissions (`conversation:reply`, `conversation:status:update`, `dashboard:view`, `team:view`) for new and existing workspaces.
   - Created **⚙️ Default Agent Permissions** modal on `/team` page for Admins to customize workspace default permissions.

3. **Custom Per-Agent Permission Overrides**:
   - Added `UserPermission` model (`user_permissions` table) allowing Admins to assign granular custom permission overrides to individual agents.
   - Created **🔑 Custom Permissions** modal on `/team` page with 1-click **Reset to Workspace Defaults** capability.

4. **Hierarchical 4-Tier Permission Resolution Engine**:
   - Implemented `PermissionsService.getEffectivePermissions(userId, workspaceId, roleName)` with 4-level evaluation hierarchy:
     1. **Super Admin Access**: `role === 'admin'` ➔ Grants all 10 system permissions.
     2. **User Custom Overrides**: `user_permissions` records exist for `userId` ➔ Returns user-specific custom permission keys.
     3. **Workspace Defaults**: `workspace_default_permissions` records exist for `workspaceId` ➔ Returns workspace default permission keys.
     4. **Role Baseline**: `role_permissions` fallback baseline.

5. **Automated Database Backfill Migration**:
   - Authored and applied Prisma SQL migration `20260817050000_backfill_workspace_default_permissions` to backfill missing workspace default records safely using SQL `CROSS JOIN` and `ON CONFLICT DO NOTHING`.
   - Updated `AuthService.signup()` to automatically populate default agent permissions whenever a new workspace is created.

## System Permission Invariants

| Permission Key | Description | Admin Default | Workspace Agent Default |
|---|---|:---:|:---:|
| `conversation:reply` | Send message replies in conversations | ✅ | ✅ |
| `conversation:status:update` | Update conversation status (open/snoozed/resolved) | ✅ | ✅ |
| `dashboard:view` | View workspace analytics dashboard | ✅ | ✅ |
| `team:view` | View team members and presence status | ✅ | ✅ |
| `conversation:reassign` | Reassign conversations to other agents | ✅ | ❌ |
| `agent:manage` | Manage agent status and invitations | ✅ | ❌ |
| `kb:manage` | Create, edit, and publish knowledge base articles | ✅ | ❌ |
| `domain:manage` | Register and verify custom CNAME domains | ✅ | ❌ |
| `theme:manage` | Customize workspace CSS theme tokens & branding | ✅ | ❌ |
| `llm:manage` | Configure LLM models, credentials & observability | ✅ | ❌ |
