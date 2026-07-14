# Product Overview

## Purpose

AI Companion is a daily experience companion. It helps users decide one small real-world action to take each day, optionally capture the moment, and gradually build a meaningful timeline.

The product is intentionally not a journaling app, productivity app, or social platform. It is a suggestion-first experience system with memory in the background.

## Core product loop

```text
Open app
→ See one daily suggestion, with optional alternatives
→ Do, skip, or ignore
→ Perform activity in real life
→ Optionally capture with photo or short input
→ AI generates a one-line memory
→ Memory is stored in timeline
```

## Product philosophy

- Make daily engagement fast.
- Keep user effort low.
- Encourage real-world activity.
- Capture meaning after action.
- Let memory emerge in the background.

## MVP product direction

The MVP should focus strictly on:

- Daily suggestion
- Simple decision: do / skip / ignore
- Quick capture
- One-line memory generation
- Timeline view

## Current implementation state

The current repository is still in the platform/authentication foundation stage.

Implemented:

- App foundation
- Deployment foundation
- Configuration foundation
- Logging/monitoring foundation
- Authentication and identity foundation

Not implemented yet:

- Daily suggestion screen
- Capture flow
- Timeline
- AI generation
- Memory system

## Ecosystem relationship

AI Companion should remain an independent product application. In the future it may integrate with:

- AI Autobiography
- AI Publisher
- ZeroFlow

AI Companion's future role in the ecosystem is to become a source of personal life experience data. The product must not become tightly coupled to those other systems during the MVP foundation stage.

## AI Context

When planning product work, do not expand scope into full memory, timeline intelligence, travel planning, or autobiography features unless the Jira story explicitly asks for it.
