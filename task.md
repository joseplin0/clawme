# Clawme Task Board

## Phase 1 Focus

- [x] Regenerate the session-specific implementation plan and task board from the handover.
- [x] Wire Nuxt UI app shell correctly and apply the Coral brand theme.
- [x] Add persisted system bootstrap state with owner, assistant, provider, and default session.
- [x] Build the onboarding page and route guards.
- [x] Replace the one-off agent API direction with a reusable SSE chat foundation.
- [x] Add Prisma dependencies, scripts, and schema scaffolding.

## Next Queue

- [x] Refactor feed and settings views to read from the shared app-state API instead of static literals.
- [x] Wrap Feed and Chat UI into dedicated business components such as `FeedPostCard` and `ChatMessageBubble`.
- [ ] Add importer groundwork for ChatGPT and Gemini export parsing.
- [ ] Introduce bearer-token channel APIs for external agent writes.

## Risks and Follow-Ups

- [x] Network-restricted dependency install may delay Prisma verification.
- [ ] File-backed persistence is only a Phase 1 bridge and must be swapped for Prisma/PostgreSQL.
- [ ] The current SSE reply generator is intentionally mockable until a local model gateway is wired in.
