# Prompting Guide

## Purpose

This file standardizes how to prompt Gemini and Jules for AI Companion tasks.

## Gemini planning prompt template

```text
Task: AIC-XXX – [title]

Context:
Read docs/project-memory first.
Use the current repository state and Jira task scope.
Do not expand beyond the Jira task.

Deliver:
1. Implementation summary
2. Files likely affected
3. Risk areas
4. Tests/checks to run
5. Manual QA checklist
6. Jules implementation prompt
7. Jira completion comment draft
```

## Jules implementation prompt template

```text
Task: AIC-XXX – [title]

Read docs/project-memory before making changes.

Scope:
[Paste Gemini implementation plan]

Rules:
- Do not merge.
- Create a branch/PR for review.
- Keep changes scoped to this Jira task.
- Do not modify production secrets, env vars, Supabase production, Vercel production, or unrelated infrastructure.
- Preserve existing architecture and patterns.
- Run lint, typecheck, tests, and build where applicable.
- Include summary, changed files, validation results, and manual QA checklist.
```

## Project Memory update prompt template

```text
Update AI Companion Project Memory after AIC-XXX.

Completed story:
[summary]

Merged PR:
[PR link/summary]

Update only affected files under docs/project-memory.
Do not modify application code.
Create a documentation-only PR.
```

## AI Context

Use Gemini for planning/review. Use Jules for repository changes. Use ChatGPT as optional second reviewer or fallback architect.
