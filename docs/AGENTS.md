# AGENTS.md - DailyWord Contributor Guide

This file defines guardrails for AI coding agents and human contributors in the DailyWord repo.

## Project Stack
- React + TypeScript (Vite)
- Capacitor (web + iOS + Android)
- Tailwind CSS + Radix UI
- Vitest + React Testing Library
- Playwright

## Primary Goals
- Keep changes small, focused, and reviewable.
- Preserve behavior unless a requirement explicitly changes.
- Keep docs and tests aligned with implementation.

## Architecture Rules
- Keep business logic in `src/domain` (word selection, scoring, streaks, validation, date logic).
- Keep UI in `src/ui` or `src/components` presentational when possible.
- Keep platform integrations in `src/platform` (Capacitor, storage, notifications, native bridges).
- Domain code must not import React, Capacitor, or browser globals directly.

Dependency direction:
1. UI -> domain
2. domain -> interfaces only
3. platform adapters implement those interfaces

## Determinism Requirements
- Daily word logic must be deterministic for a given date seed.
- Do not call `Date.now()` or random APIs directly in domain logic.
- Inject clock and RNG providers for testability.
- Any changes to deterministic behavior must include test updates and a short note in PR/docs.

## Testing Policy
- Use Vitest for unit and domain tests.
- Use React Testing Library for component behavior and interaction wiring.
- Use Playwright for end-to-end user flows.
- Every behavior change must include relevant test updates.

Recommended split:
- `src/domain/**/*.test.ts`: core rules and edge cases
- `src/**/*.test.tsx`: component tests
- `tests/e2e/**/*.spec.ts`: browser and mobile-web smoke flows

## Styling and UI
- Prefer Tailwind utilities and shared design tokens.
- Use Radix primitives for accessibility-sensitive components (dialogs, popovers, menus).
- Keep custom component wrappers thin and typed.
- Do not ship temporary debug styling or hardcoded dev-only content.

## Capacitor and Mobile
- Web app remains source of truth; Capacitor wraps built web assets.
- Run `npx cap sync` after build changes that affect native shells.
- Keep native-specific logic isolated in platform adapters.

## Local Quality Checks
Before pushing a PR, run:
1. `npm run build`
2. `npm run test`
3. `npm run test:e2e`

If lint/format scripts exist, run those too.

## Change Hygiene
- Avoid large refactors mixed with feature work.
- Do not introduce breaking data format changes without migration/version notes.
- Avoid duplicate helper logic; prefer shared utilities.
- Never commit secrets or API keys.

## PR Summary Template
Include:
- Files changed
- Behavior changes
- Tests added/updated
- Determinism/data impact
- Manual verification performed
