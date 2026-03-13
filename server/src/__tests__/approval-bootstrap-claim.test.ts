import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { approvalService } from "../services/approvals.ts";

const mockAgentService = vi.hoisted(() => ({
  activatePendingApproval: vi.fn(),
  create: vi.fn(),
  terminate: vi.fn(),
  createApiKey: vi.fn(),
}));

const mockNotifyHireApproved = vi.hoisted(() => vi.fn());

vi.mock("../services/agents.js", () => ({
  agentService: vi.fn(() => mockAgentService),
}));

vi.mock("../services/hire-hook.js", () => ({
  notifyHireApproved: mockNotifyHireApproved,
}));

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type ApprovalRecord = {
  id: string;
  companyId: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  requestedByAgentId: string | null;
  claimSecretHash?: string | null;
  claimSecretExpiresAt?: Date | null;
  claimSecretConsumedAt?: Date | null;
};

function createApproval(overrides: Partial<ApprovalRecord> = {}): ApprovalRecord {
  return {
    id: "approval-1",
    companyId: "company-1",
    type: "hire_agent",
    status: "approved",
    payload: {
      agentId: "agent-1",
      adapterType: "openclaw_gateway",
    },
    requestedByAgentId: "requester-1",
    claimSecretHash: null,
    claimSecretExpiresAt: null,
    claimSecretConsumedAt: null,
    ...overrides,
  };
}

function createDbStub(selectResults: unknown[][], updateResults: unknown[][]) {
  const pendingSelectResults = [...selectResults];
  const pendingUpdateResults = [...updateResults];

  const selectWhere = vi.fn(async () => pendingSelectResults.shift() ?? []);
  const from = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from }));

  const returning = vi.fn(async () => pendingUpdateResults.shift() ?? []);
  const updateWhere = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set }));

  return {
    db: { select, update },
    set,
  };
}

describe("approval bootstrap claim flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgentService.activatePendingApproval.mockResolvedValue(undefined);
    mockAgentService.create.mockResolvedValue({ id: "agent-1" });
    mockAgentService.terminate.mockResolvedValue(undefined);
    mockAgentService.createApiKey.mockResolvedValue({
      id: "key-1",
      token: "pcp_key_123",
      createdAt: new Date("2026-03-12T20:30:00.000Z"),
    });
    mockNotifyHireApproved.mockResolvedValue(undefined);
  });

  it("issues a bootstrap claim secret for approved openclaw_gateway hire approvals", async () => {
    const approval = createApproval();
    const updated = createApproval({
      claimSecretHash: "stored-hash",
      claimSecretExpiresAt: new Date("2026-03-12T20:40:00.000Z"),
    });
    const dbStub = createDbStub([[approval]], [[updated]]);
    const svc = approvalService(dbStub.db as any) as any;

    const result = await svc.issueOpenClawBootstrapClaim("approval-1");

    expect(result.claimSecret).toMatch(/^pcp_claim_/);
    expect(result.claimApiKeyPath).toBe("/api/approvals/approval-1/claim-api-key");
    expect(dbStub.set).toHaveBeenCalledTimes(1);
    expect(dbStub.set.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        claimSecretHash: expect.any(String),
        claimSecretExpiresAt: expect.any(Date),
        claimSecretConsumedAt: null,
      }),
    );
  });

  it("claims the initial approval API key exactly once", async () => {
    const claimSecret = "pcp_claim_1234567890abcdef";
    const approval = createApproval({
      claimSecretHash: hashToken(claimSecret),
      claimSecretExpiresAt: new Date("2026-03-12T21:00:00.000Z"),
      claimSecretConsumedAt: null,
    });
    const consumed = createApproval({
      claimSecretHash: approval.claimSecretHash,
      claimSecretExpiresAt: approval.claimSecretExpiresAt,
      claimSecretConsumedAt: new Date("2026-03-12T20:31:00.000Z"),
    });
    const dbStub = createDbStub([[approval], []], [[consumed]]);
    const svc = approvalService(dbStub.db as any) as any;

    const result = await svc.claimApiKey("approval-1", claimSecret);

    expect(mockAgentService.createApiKey).toHaveBeenCalledWith("agent-1", "initial-approval-key");
    expect(result).toEqual({
      keyId: "key-1",
      token: "pcp_key_123",
      agentId: "agent-1",
      createdAt: new Date("2026-03-12T20:30:00.000Z"),
    });
    expect(dbStub.set).toHaveBeenCalledWith(
      expect.objectContaining({
        claimSecretConsumedAt: expect.any(Date),
      }),
    );
  });
});
