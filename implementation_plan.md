# Clawme Implementation Plan

## Session Goal

This session translates `CLAWME_HANDOVER.md` into a buildable Phase 1 foundation for the existing Nuxt app, while keeping clean seams for Prisma, SSE chat, and future ecosystem features.

## Current Repository Reality

- Nuxt 4 + `@nuxt/ui` pages already exist, but they are mostly static prototypes.
- Global app shell is incomplete: `UApp` and the real CSS entry were not wired correctly.
- No database schema, onboarding flow, or authenticated service-layer foundation exists yet.
- The current `server/api/agent.post.ts` is a one-off local-model experiment, not the REST/SSE architecture from the handover.

## Implementation Strategy

### Track A: App Shell and Brand Foundation

1. Fix global app bootstrapping (`UApp`, shared CSS, theme config).
2. Apply the Coral `#E05D44` brand palette as the Nuxt UI primary color.
3. Refactor layout styles to use semantic tokens so later screens stay consistent.

### Track B: Initialization and State Backbone

1. Introduce a local persisted app-state repository as a temporary Phase 1 backbone.
2. Implement `/setup` onboarding to create the owner, default assistant, and local provider config.
3. Add global route protection so uninitialized installs are guided into setup first.

### Track C: Chat Transport Skeleton

1. Create a persisted default chat session between the owner and the assistant.
2. Add an SSE chat endpoint that follows the handover's 3-step lifecycle:
   - pre-create `GENERATING` placeholder
   - stream response chunks
   - finalize message as `DONE`
3. Keep the generation engine swappable so it can later point to real LLM providers.

### Track D: Prisma Readiness

1. Add Prisma dependencies and scripts.
2. Write the initial `schema.prisma` from the handover data model.
3. Keep current repositories small enough to swap from file storage to Prisma with minimal page churn.

## This Session's Definition of Done

- `implementation_plan.md` and `task.md` are regenerated from the handover, not copied verbatim.
- The app has a working global theme and onboarding route.
- The server exposes a persisted system bootstrap API.
- The server exposes a basic authenticated SSE chat scaffold.
- Prisma schema and install hooks are present, even if dependency install still requires network approval.
