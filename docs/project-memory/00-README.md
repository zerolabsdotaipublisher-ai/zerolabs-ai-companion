# AI Companion Engineering Handbook

This folder is the official project memory for the AI Companion repository.

It exists so humans and AI coding agents can understand the current product direction, architecture, workflow, completed work, and guardrails before making changes.

## How to use this handbook

Before starting any AIC task, read this file first, then read the relevant section files.

Recommended order for AI agents:

1. `00-README.md`
2. `01-product/overview.md`
3. `02-engineering/architecture.md`
4. `04-development/workflow.md`
5. `04-development/decisions.md`
6. `05-ai/ai-agent-guide.md`
7. Any subsystem file related to the task

## Current state

AI Companion has completed its platform foundation and authentication/identity foundation through AIC-206.

Implemented areas include:

- Next.js App Router foundation
- Vercel deployment pipeline
- Environment/configuration management
- Logging and monitoring foundation
- Supabase Auth integration
- Signup and email verification callback handling
- Login flow
- Session persistence and server-side validation
- Logout and auth state handling
- Protected routes for `/dashboard` and `/profile`
- Identity profile schema and profile management UI
- Personalization preference storage and update flow

Not yet implemented:

- Daily suggestion engine
- Capture flow
- Memory generation
- Timeline view
- OpenAI-powered suggestion/memory generation
- Qdrant semantic memory
- ZeroFlow orchestration

## Maintenance rule

AIC work is not fully complete unless Project Memory is updated when the task changes architecture, workflow, status, roadmap, database, authentication, or major implementation rules.

## File map

- `01-product/overview.md` — product vision and mission
- `01-product/scope.md` — MVP and out-of-scope boundaries
- `01-product/roadmap.md` — future product direction
- `01-product/onboarding-flow.md` — first-time user onboarding journey
- `02-engineering/architecture.md` — system architecture
- `02-engineering/tech-stack.md` — current and future technical stack
- `02-engineering/folder-structure.md` — repository layout and folder responsibilities
- `02-engineering/coding-standards.md` — engineering rules
- `03-backend/database.md` — database and schema state
- `03-backend/authentication.md` — authentication/session lifecycle
- `03-backend/profile-system.md` — identity profile and personalization system
- `04-development/workflow.md` — Jira → planning → Jules → PR → QA workflow
- `04-development/qa-checklist.md` — manual QA patterns
- `04-development/completed-features.md` — completed feature register
- `04-development/decisions.md` — architecture decision record
- `04-development/known-issues.md` — resolved and active issues
- `05-ai/ai-agent-guide.md` — explicit AI agent instructions
- `05-ai/prompting-guide.md` — prompt patterns for Gemini/Jules
- `CHANGELOG.md` — handbook and project milestone log

## Core rule for AI agents

Do not infer missing architecture. If the handbook and code disagree, stop and ask for clarification. Do not silently rewrite core authentication, profile, configuration, or deployment patterns.
