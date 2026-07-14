# Product Scope

## Purpose

This file defines what AI Companion should and should not build during the MVP phase.

## MVP scope

The MVP should support the core daily loop:

1. Daily suggestion
2. User decision
3. Optional capture
4. One-line memory generation
5. Timeline storage and browsing

## Current completed foundation scope

The project has completed:

- Repository initialization
- Branch strategy
- Next.js setup
- Vercel deployment
- Environment variable management
- Configuration structure
- Logging and monitoring foundation
- Supabase authentication foundation
- Signup, login, logout, session management
- Identity profile and personalization preferences

## Out of scope until explicitly scheduled

Do not implement these unless a Jira story specifically asks for them:

- Full journaling system
- Social feed
- Public sharing
- Travel planning mode
- AI Autobiography integration
- AI Publisher integration
- ZeroFlow orchestration
- Qdrant semantic memory
- Large media storage migration
- Complex trips/events model
- Full life graph
- Autobiographical narratives

## Design boundary

AI Companion should remain lightweight. Avoid introducing heavy workflows that force users to write, categorize, or manage memories manually.

## AI Context

If a task seems to require a future capability, confirm whether it is truly in scope. Do not add future architecture prematurely.
