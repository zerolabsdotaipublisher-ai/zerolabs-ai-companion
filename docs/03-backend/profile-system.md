# Profile System

## Overview

This document outlines the backend profile system configuration and database models for the AI Companion.

## Schema Extensions

The `identity_profiles` table stores user-specific data.

### Preferences JSONB

The `preferences` JSONB schema has been extended to include an `onboarding_completed` (boolean) flag. This flag is used to track the initialization state of a user profile after they have completed the initial onboarding journey.
