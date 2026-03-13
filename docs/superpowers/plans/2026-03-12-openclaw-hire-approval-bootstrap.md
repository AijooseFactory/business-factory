# OpenClaw Hire Approval Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class Paperclip API key bootstrap flow for `hire_agent` approvals that create `openclaw_gateway` agents, matching the existing join-request claim model.

**Architecture:** Extend `approvals` with one-time claim metadata, mint that metadata when an OpenClaw hire approval is approved, and expose a single-use claim endpoint that creates the first agent API key only after approval. Surface claim status and operator instructions in the approval detail UI without storing a live API token in approval payloads.

**Tech Stack:** TypeScript, Express, Drizzle ORM/Postgres, Vitest, React, TanStack Query

---

## Chunk 1: Server Bootstrap Claim Flow

### Task 1: Add approval claim metadata to persistence and shared types

**Files:**
- Modify: `packages/db/src/schema/approvals.ts`
- Modify: `packages/shared/src/types/approval.ts`
- Modify: `packages/shared/src/validators/approval.ts`
- Modify: `packages/shared/src/validators/index.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/db/src/migrations/<generated>`

- [ ] Write the failing schema/type tests or route expectations that require approval claim metadata to exist.
- [ ] Run the targeted tests to verify they fail because approvals do not yet expose claim metadata.
- [ ] Add nullable approval claim fields analogous to join-request claim tracking.
- [ ] Export the new approval claim input/output types through shared validators and shared type index.
- [ ] Generate the migration for the approval claim columns.
- [ ] Re-run the targeted tests and typecheck to verify the schema/types compile.

### Task 2: Add approval bootstrap claim behavior on approve and claim

**Files:**
- Modify: `server/src/services/approvals.ts`
- Modify: `server/src/routes/approvals.ts`
- Modify: `server/src/services/agents.ts` (only if a small helper is needed for initial approval-key naming)
- Modify: `server/src/__tests__/approvals-service.test.ts`
- Modify: `server/src/__tests__/approval-routes-idempotency.test.ts`
- Create: `server/src/__tests__/approval-claim-api-key.test.ts`

- [ ] Write failing tests for:
  - approving an `openclaw_gateway` hire approval creates one-time claim metadata
  - non-OpenClaw hire approvals do not get claim metadata
  - `POST /api/approvals/:id/claim-api-key` creates the first key exactly once
  - claim fails before approval, after expiry, and after consumption
- [ ] Run the targeted tests to verify the failures are for missing approval-claim behavior.
- [ ] Implement claim metadata generation during approval for `hire_agent` + `openclaw_gateway`.
- [ ] Implement the approval claim endpoint using the existing join-request claim semantics.
- [ ] Ensure responses and activity logging never expose hashed secrets, and only the claim response returns the live token.
- [ ] Re-run the targeted tests to verify the server path is green.

## Chunk 2: UI Claim Surface

### Task 3: Add approval API client and approval detail UI for claim instructions

**Files:**
- Modify: `ui/src/api/approvals.ts`
- Modify: `ui/src/pages/ApprovalDetail.tsx`
- Modify: `ui/src/components/ApprovalPayload.tsx` (only if claim status needs payload-adjacent rendering)

- [ ] Write a failing UI test if coverage exists at this layer; otherwise define the exact runtime verification target for the approval detail page.
- [ ] Add the approval claim API client method and types.
- [ ] Show claim availability/status on approved OpenClaw hire approvals, including the claim path and operator instructions.
- [ ] Keep the one-time claim secret/token handling explicit and scoped to the claim action.
- [ ] Re-run UI typecheck/build verification.

## Chunk 3: Verification and Migration

### Task 4: Apply migrations, rebuild, and verify Oliver’s approval path

**Files:**
- Modify: existing generated migration outputs only

- [ ] Run the focused server and shared test suite.
- [ ] Run server/shared/UI typecheck as needed for touched packages.
- [ ] Apply the new DB migration against the local Paperclip database.
- [ ] Rebuild and restart Paperclip.
- [ ] Verify Oliver’s approval now has claim metadata available after approval and that the approval claim endpoint works end-to-end.
