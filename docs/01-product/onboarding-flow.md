# Onboarding Flow

## Overview

This document outlines the first-time user onboarding journey for the AI Companion MVP product workflow.

## Onboarding Logic

- **Goal:** Fast, low-friction, maximum 2 steps.
- **Step 1:** Welcome & preferred name confirmation.
- **Step 2:** "Companion Vibe" selection (e.g., Spontaneous, Reflective, Creative).

## Initialization

The final step of the onboarding flow will update the `identity_profiles.preferences` JSONB object.

- It will store the selected Companion Vibe.
- It will set the `"onboarding_completed": true` flag to track the initialization state.

## Detection Pattern

To avoid performance hits in the edge middleware, the onboarding status check **MUST** occur in the `/dashboard` server component, **NOT** in `middleware.ts`.
