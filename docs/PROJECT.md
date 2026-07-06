# PROJECT.md

## What Is This Project

HelloDesk AI is a production-grade Intercom-like customer communication platform. It combines live chat, email support, a searchable knowledge base, and AI-assisted agent workflows into one unified system for customer support teams.

## Problem Statement

Businesses need one place to manage customer conversations from live chat and email without agents switching between tools. This project provides:

- An embeddable chat widget for any website
- A working inbound support email address with automatic threading
- A unified inbox where agents and admins see chat and email conversations together
- A public knowledge base with in-widget article suggestions
- AI-generated conversation summaries and reply drafts to speed up support
- Multi-tenant support so multiple workspaces can use the same platform in isolation

## Who Uses This

- **Admin (workspace owner)** - signs up, creates or joins a workspace, manages team members, roles, knowledge base, domains, and overview data
- **Agent (support staff)** - handles live chat and email conversations with customers
- **Customer (anonymous or identified visitor)** - initiates chat or email conversations through the widget or support inbox

## Core Design Principles

- **Multi-tenancy first**: every piece of workspace-owned data is scoped to `workspace_id`, ensuring isolation between companies using the platform
- **Self-serve onboarding**: users sign up with email/password and a unique workspace name; if the workspace does not exist it is created and the first user becomes Admin, otherwise the user joins as Agent
- **Admin-controlled roles**: Admins can invite users and manually change user roles after signup
- **Config-driven RBAC**: role and permission checks are driven by backend-issued permission flags, not hardcoded frontend logic
- **Async by default**: heavy operations such as email sending and AI calls run through BullMQ background jobs rather than blocking API responses
- **Pragmatic Phase 1 scope**: simple, correct implementations over premature optimization, while still documenting production trade-offs clearly
