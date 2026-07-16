# Onboarding Flow

## Overview

This document outlines the first-time user onboarding journey for the AI Companion MVP product workflow.

**Status:** Implemented (Task 7.2 & Task 7.3 completed)

## Onboarding Logic

- **Goal:** Fast, low-friction, maximum 2 steps.
- **Step 1:** Welcome & preferred name confirmation.
- **Step 2:** "Companion Vibe" selection (e.g., Spontaneous, Reflective, Creative).

## Initialization

The final step of the onboarding flow will update the `identity_profiles.preferences` JSONB object.

- It will store the selected Companion Vibe.
- It will set the `"onboarding_completed": true` flag to track the initialization state.

## Implementation Details (Task 7.2)

- **Protected Route:** The `/onboarding` route is a protected route enforcing server-side check integration.
- **Distraction-Free Layout:** Implemented using Next.js App Router Route Groups `(app)` and `(onboarding)` to isolate the flow from the main dashboard header and navigation menu.
- **Two-Step Visual Flow:** Managed by the `OnboardingFlow` React component in the `src/app/(onboarding)/onboarding/` route.

## Route Enforcement

Route enforcement logic is fully implemented (Task 7.3).

- Un-onboarded users are automatically redirected to onboarding.
- Fully onboarded users are automatically reverse-redirected to the dashboard if they try to access onboarding.
