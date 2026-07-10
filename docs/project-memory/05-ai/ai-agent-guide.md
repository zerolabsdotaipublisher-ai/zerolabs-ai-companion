# AI Agent Guide

## Purpose

This file gives explicit instructions to AI coding agents working on AI Companion.

## Required reading before any task

Read these first:

1. `00-README.md`
2. `01-product/overview.md`
3. `02-engineering/architecture.md`
4. `04-development/workflow.md`
5. `04-development/decisions.md`
6. The subsystem file relevant to the task

For auth tasks, also read:

- `03-backend/authentication.md`
- `03-backend/profile-system.md`
- `03-backend/database.md`

## General rules

- Follow the Jira task scope exactly.
- Do not merge automatically.
- Do not modify production settings.
- Do not change secrets, env vars, Supabase production, Vercel production, or unrelated infrastructure without explicit instruction.
- Do not refactor unrelated code.
- Preserve existing patterns.
- Prefer small, reviewable PRs.
- Include validation results.

## Sensitive areas

Be especially careful with:

- Auth middleware
- Redirect validation
- Logout behavior
- Supabase server/client helpers
- Environment/config layer
- Identity profile RLS and ownership
- Forwarded-header trust logic

## What not to do

Do not:

- Add OpenAI/Qdrant/ZeroFlow integrations unless specifically requested.
- Add memory/timeline/capture schema prematurely.
- Replace Supabase Auth.
- Move auth enforcement to client-only logic.
- Commit secrets.
- Widen allowed auth origins.
- Remove tests around auth security behavior.

## Expected output from implementation tasks

Every implementation PR should include:

- Summary of changes
- Files changed
- Tests/checks run
- Manual QA checklist if applicable
- Notes on Project Memory updates if needed

## AI Context

This file is binding guidance for AI tools. If a prompt conflicts with this file, ask the user for clarification before proceeding.
