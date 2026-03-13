import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { approvalRoutes } from "../routes/approvals.js";
import { errorHandler } from "../middleware/index.js";

const mockApprovalService = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  requestRevision: vi.fn(),
  resubmit: vi.fn(),
  listComments: vi.fn(),
  addComment: vi.fn(),
  issueOpenClawBootstrapClaim: vi.fn(),
  claimApiKey: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  wakeup: vi.fn(),
}));

const mockIssueApprovalService = vi.hoisted(() => ({
  listIssuesForApproval: vi.fn(),
  linkManyForApproval: vi.fn(),
}));

const mockSecretService = vi.hoisted(() => ({
  normalizeHireApprovalPayloadForPersistence: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  approvalService: () => mockApprovalService,
  heartbeatService: () => mockHeartbeatService,
  issueApprovalService: () => mockIssueApprovalService,
  logActivity: mockLogActivity,
  secretService: () => mockSecretService,
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      userId: "user-1",
      companyIds: ["company-1"],
      source: "session",
      isInstanceAdmin: false,
    };
    next();
  });
  app.use("/api", approvalRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("approval claim api key routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeartbeatService.wakeup.mockResolvedValue({ id: "wake-1" });
    mockIssueApprovalService.listIssuesForApproval.mockResolvedValue([{ id: "issue-1" }]);
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("returns one-time bootstrap claim details when approving an openclaw hire", async () => {
    mockApprovalService.approve.mockResolvedValue({
      approval: {
        id: "approval-1",
        companyId: "company-1",
        type: "hire_agent",
        status: "approved",
        payload: { adapterType: "openclaw_gateway" },
        requestedByAgentId: null,
      },
      applied: true,
    });
    mockApprovalService.issueOpenClawBootstrapClaim.mockResolvedValue({
      approval: {
        id: "approval-1",
        companyId: "company-1",
        type: "hire_agent",
        status: "approved",
        payload: { adapterType: "openclaw_gateway" },
        requestedByAgentId: null,
        claimSecretExpiresAt: new Date("2026-03-12T21:00:00.000Z"),
        claimSecretConsumedAt: null,
      },
      claimSecret: "pcp_claim_1234567890abcdef",
      claimApiKeyPath: "/api/approvals/approval-1/claim-api-key",
    });

    const res = await request(createApp())
      .post("/api/approvals/approval-1/approve")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.claimSecret).toBe("pcp_claim_1234567890abcdef");
    expect(res.body.claimApiKeyPath).toBe("/api/approvals/approval-1/claim-api-key");
  });

  it("supports claiming the initial API key from an approval claim secret", async () => {
    mockApprovalService.claimApiKey.mockResolvedValue({
      keyId: "key-1",
      token: "pcp_key_123",
      agentId: "agent-1",
      createdAt: "2026-03-12T20:30:00.000Z",
    });

    const res = await request(createApp())
      .post("/api/approvals/approval-1/claim-api-key")
      .send({ claimSecret: "pcp_claim_1234567890abcdef" });

    expect(res.status).toBe(201);
    expect(mockApprovalService.claimApiKey).toHaveBeenCalledWith(
      "approval-1",
      "pcp_claim_1234567890abcdef",
    );
    expect(res.body).toEqual({
      keyId: "key-1",
      token: "pcp_key_123",
      agentId: "agent-1",
      createdAt: "2026-03-12T20:30:00.000Z",
    });
  });
});
