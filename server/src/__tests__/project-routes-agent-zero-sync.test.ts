import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { projectRoutes } from "../routes/projects.js";
import { errorHandler } from "../middleware/index.js";

const mockProjectService = vi.hoisted(() => ({
  resolveByReference: vi.fn(),
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  createWorkspace: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
  removeWorkspace: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());
const mockSyncProjectToAgentZeroRoot = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  projectService: () => mockProjectService,
  logActivity: mockLogActivity,
}));

vi.mock("../services/agent-zero-project-sync.js", async () => {
  const actual = await vi.importActual("../services/agent-zero-project-sync.js");
  return {
    ...actual,
    syncProjectToAgentZeroRoot: mockSyncProjectToAgentZeroRoot,
  };
});

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
  app.use("/api", projectRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("project routes Agent Zero sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectService.resolveByReference.mockResolvedValue({
      ambiguous: false,
      project: null,
    });
    mockLogActivity.mockResolvedValue(undefined);
    mockSyncProjectToAgentZeroRoot.mockResolvedValue(null);
  });

  it("re-syncs the Agent Zero projection when a project is updated", async () => {
    mockProjectService.getById.mockResolvedValue({
      id: "project-1",
      companyId: "company-1",
    });
    mockProjectService.update.mockResolvedValue({
      id: "project-1",
      companyId: "company-1",
      name: "Updated project",
    });

    const res = await request(createApp())
      .patch("/api/projects/project-1")
      .send({ name: "Updated project" });

    expect(res.status).toBe(200);
    expect(mockSyncProjectToAgentZeroRoot).toHaveBeenCalledWith(expect.anything(), "project-1");
  });

  it("re-syncs the Agent Zero projection when a project workspace is updated", async () => {
    mockProjectService.getById.mockResolvedValue({
      id: "project-1",
      companyId: "company-1",
    });
    mockProjectService.listWorkspaces.mockResolvedValue([
      {
        id: "workspace-1",
      },
    ]);
    mockProjectService.updateWorkspace.mockResolvedValue({
      id: "workspace-1",
      name: "Primary workspace",
      cwd: "/work/project",
    });

    const res = await request(createApp())
      .patch("/api/projects/project-1/workspaces/workspace-1")
      .send({ cwd: "/work/project" });

    expect(res.status).toBe(200);
    expect(mockSyncProjectToAgentZeroRoot).toHaveBeenCalledWith(expect.anything(), "project-1");
  });
});
