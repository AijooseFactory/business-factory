# Invite Onboarding Text Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the invite onboarding text to support Agent Zero with 2-way communication and OpenClaw Gateway with clear sections, Business Factory branding, and company name/role placeholders.

**Architecture:** Modify the `buildInviteOnboardingTextDocument` function in `server/src/routes/access.ts` to generate agent-type-specific onboarding sections. Add company name and role extraction from invite defaultsPayload.

**Tech Stack:** Node.js, Express, TypeScript, Drizzle ORM, Vitest

---

## File Mapping

| File | Action | Purpose |
|------|--------|---------|
| `server/src/routes/access.ts` | Modify (lines 991-1224) | Rewrite `buildInviteOnboardingTextDocument` function |
| `server/src/__tests__/invite-onboarding-text.test.ts` | Modify | Add/update tests for new structure |
| `packages/shared/src/validators/access.ts` | Modify (optional) | Add companyName/role to defaultsPayload schema if needed |

---

## Chunk 1: Test Updates

### Task 1: Update Existing Tests for Business Factory Branding

**Files:**
- Modify: `server/src/__tests__/invite-onboarding-text.test.ts`

- [ ] **Step 1: Read current test file**

Run: `cat server/src/__tests__/invite-onboarding-text.test.ts`

- [ ] **Step 2: Run existing tests to confirm baseline**

Run: `pnpm test:run server/src/__tests__/invite-onboarding-text.test.ts`
Expected: 3 tests pass

- [ ] **Step 3: Update test expectations for Business Factory branding**

The test currently expects "Paperclip OpenClaw Gateway Onboarding" - update to expect both sections.

```typescript
// Replace line 40 expectation with:
expect(text).toContain("Agent Zero Onboarding");
expect(text).toContain("OpenClaw Gateway Onboarding");
expect(text).toContain("Business Factory");
```

- [ ] **Step 4: Run tests to see expected failures**

Run: `pnpm test:run server/src/__tests__/invite-onboarding-text.test.ts`
Expected: FAIL - function still outputs old format

- [ ] **Step 5: Commit**

```bash
git add server/src/__tests__/invite-onboarding-text.test.ts
git commit -m "test: prepare onboarding text tests for new structure"
```

---

## Chunk 2: Rewrite buildInviteOnboardingTextDocument Function

### Task 2: Rewrite Onboarding Text Generator

**Files:**
- Modify: `server/src/routes/access.ts:991-1224`

- [ ] **Step 1: Read current function implementation**

Run: `sed -n '991,1224p' server/src/routes/access.ts`

- [ ] **Step 2: Replace function with new implementation**

The new function should output:

```
# You're invited to join [COMPANY NAME] in the Ai Business Factory Office Space

Your role: [TEAM_ROLE]

## Connectivity Check
[URLs to try]
[Test commands]
[If none work guidance]

## Agent Zero Onboarding
## This onboarding flow is for Agent Zero ONLY.

[Step 0-4 instructions for Agent Zero]

## OpenClaw Gateway Onboarding
## This onboarding flow is for OpenClaw Gateway ONLY.

[Step 0-4 instructions for OpenClaw]

## Helpful Endpoints
[Registration, claim, skill endpoints]
```

Key changes:
1. Extract companyName from defaultsPayload (field: `companyName`)
2. Extract role from defaultsPayload (field: `role`)
3. Add "Agent Zero Onboarding" section before existing content
4. Change "Paperclip" to "Business Factory" throughout
5. Add 2-way communication instructions for Agent Zero
6. Keep OpenClaw section but update branding

- [ ] **Step 3: Run tests to verify**

Run: `pnpm test:run server/src/__tests__/invite-onboarding-text.test.ts`
Expected: FAIL - need to update test expectations

- [ ] **Step 4: Update test expectations**

Update test assertions to match new output:
- "Agent Zero Onboarding" present
- "OpenClaw Gateway Onboarding" present
- "Business Factory" instead of "Paperclip"
- "Connectivity Check" section

- [ ] **Step 5: Run tests again**

Run: `pnpm test:run server/src/__tests__/invite-onboarding-text.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/access.ts server/src/__tests__/invite-onboarding-text.test.ts
git commit -m "feat: expand invite onboarding text for Agent Zero and OpenClaw"
```

---

## Chunk 3: Verification

### Task 3: Full Verification

**Files:**
- Test: All modified files

- [ ] **Step 1: Run full test suite for access routes**

Run: `pnpm test:run server/src/__tests__/access.test.ts`
Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `pnpm -r typecheck`
Expected: No errors

- [ ] **Step 3: Build the project**

Run: `pnpm build`
Expected: SUCCESS

- [ ] **Step 4: Commit any remaining changes**

```bash
git add -A
git commit -m "fix: resolve any verification issues"
```

---

## Summary

| Task | Steps | Files |
|------|-------|-------|
| 1. Update tests | 5 | 1 test file |
| 2. Rewrite function | 6 | 1 route file + test |
| 3. Verification | 4 | All |
| **Total** | **15** | **2 files** |

---

## Notes for Implementation

- The company name and role come from `invite.defaultsPayload` fields: `companyName` and `role`
- Agent Zero needs `adapterType: "agent_zero"` in join request
- OpenClaw uses `adapterType: "openclaw_gateway"`
- For 2-way communication, Agent Zero should POST to `/api/agent-zero/{agentId}/webhook`
- Test resolution endpoint already exists at `/api/invites/{token}/test-resolution`