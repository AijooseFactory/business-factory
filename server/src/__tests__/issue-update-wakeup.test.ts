import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/index.js";
import { issueRoutes } from "../routes/issues.js";

const mockIssueService = vi.hoisted(() => ({
  getById: vi.fn(),
  getByIdentifier: vi.fn(),
  update: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  wakeup: vi.fn(),
}));

const mockAccessService = vi.hoisted(() => ({
  canUser: vi.fn(),
  hasPermission: vi.fn(),
}));

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
}));

const mockProjectService = vi.hoisted(() => ({
  getById: vi.fn(),
  listByIds: vi.fn(),
}));

const mockGoalService = vi.hoisted(() => ({
  getById: vi.fn(),
}));

const mockIssueApprovalService = vi.hoisted(() => ({
  listApprovalsForIssue: vi.fn(),
  link: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  accessService: () => mockAccessService,
  agentService: () => mockAgentService,
  goalService: () => mockGoalService,
  heartbeatService: () => mockHeartbeatService,
  issueApprovalService: () => mockIssueApprovalService,
  issueService: () => mockIssueService,
  logActivity: mockLogActivity,
  projectService: () => mockProjectService,
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      userId: "user-1",
      companyIds: ["company-1"],
      source: "local_implicit",
      isInstanceAdmin: true,
    };
    next();
  });
  app.use("/api", issueRoutes({} as any, {} as any));
  app.use(errorHandler);
  return app;
}

describe("issue update wakeups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeartbeatService.wakeup.mockResolvedValue({ id: "run-1" });
    mockAccessService.canUser.mockResolvedValue(true);
    mockAccessService.hasPermission.mockResolvedValue(true);
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("wakes the assigned agent when title or description changes on an active assigned issue", async () => {
    mockIssueService.getById.mockResolvedValueOnce({
      id: "issue-1",
      companyId: "company-1",
      identifier: "AIJ-99",
      title: "Old title",
      description: "Old description",
      status: "todo",
      assigneeAgentId: "agent-1",
      assigneeUserId: null,
    });
    mockIssueService.update.mockResolvedValue({
      id: "issue-1",
      companyId: "company-1",
      identifier: "AIJ-99",
      title: "New title",
      description: "Updated description",
      status: "todo",
      assigneeAgentId: "agent-1",
      assigneeUserId: null,
    });

    const res = await request(createApp())
      .patch("/api/issues/issue-1")
      .send({
        title: "New title",
        description: "Updated description",
      });

    expect(res.status).toBe(200);
    expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith(
      "agent-1",
      expect.objectContaining({
        source: "automation",
        reason: "issue_updated",
        payload: { issueId: "issue-1", mutation: "update" },
      }),
    );
  });

  it("does not wake the assigned agent for non-task metadata changes alone", async () => {
    mockIssueService.getById.mockResolvedValueOnce({
      id: "issue-1",
      companyId: "company-1",
      identifier: "AIJ-99",
      title: "Same title",
      description: "Same description",
      status: "todo",
      assigneeAgentId: "agent-1",
      assigneeUserId: null,
      priority: "medium",
    });
    mockIssueService.update.mockResolvedValue({
      id: "issue-1",
      companyId: "company-1",
      identifier: "AIJ-99",
      title: "Same title",
      description: "Same description",
      status: "todo",
      assigneeAgentId: "agent-1",
      assigneeUserId: null,
      priority: "high",
    });

    const res = await request(createApp())
      .patch("/api/issues/issue-1")
      .send({
        priority: "high",
      });

    expect(res.status).toBe(200);
    expect(mockHeartbeatService.wakeup).not.toHaveBeenCalled();
  });
});
