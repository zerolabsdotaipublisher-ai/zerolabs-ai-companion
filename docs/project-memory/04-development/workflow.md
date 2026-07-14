# Development Workflow

## Purpose

This file documents the working process for AI Companion development.

## Historical workflow

The previous workflow was:

```text
Jira task
→ ChatGPT planning with attached docs
→ GitHub Copilot implementation prompt
→ Copilot branch/PR
→ ChatGPT review
→ Manual QA
→ Merge
```

## New workflow from AIC-207 onward

The intended workflow is:

```text
Jira task
→ Gemini planning using Project Memory
→ Jules implementation prompt
→ Jules creates branch/changes/PR
→ Review PR
→ Manual QA
→ Merge
→ Update Project Memory
```

## Roles

### You

- Product owner / engineering manager
- Select Jira task
- Approve scope
- Perform manual QA
- Decide merge readiness

### Gemini

- Planner / solution architect
- Reads Jira and Project Memory
- Produces implementation plan and Jules prompt
- Reviews output
- Helps update Project Memory

### Jules

- Implementation engineer
- Reads Project Memory and Gemini instructions
- Creates branch/changes/PR
- Runs checks where possible
- Does not merge automatically

### ChatGPT

- Optional independent reviewer/fallback architect
- Useful when comparing output, validating decisions, or improving Project Memory

## Branch/PR rules

- Do not merge directly without review.
- Keep work scoped to Jira task.
- Prefer documentation-only branches for Project Memory updates.
- Implementation PRs must include summary, tests/checks, and manual QA checklist.
- Do not change production systems, secrets, Supabase production, Vercel production, or unrelated infrastructure unless explicitly instructed.

## Done definition

A task is done when:

- Implementation matches Jira scope.
- Automated checks pass where applicable.
- Manual QA passes where applicable.
- PR is reviewed.
- Merge is completed.
- Project Memory is updated if the task changed project knowledge.
