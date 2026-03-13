import { describe, expect, it } from "vitest";
import { resolveDefaultAgentWorkspaceDir } from "../home-paths.js";
import {
  mergeIssueContext,
  resolveProjectWorkspaceSelection,
  resolveRuntimeSessionParamsForWorkspace,
  shouldResetTaskSessionForWake,
  type ResolvedWorkspaceForRun,
} from "../services/heartbeat.ts";

function buildResolvedWorkspace(overrides: Partial<ResolvedWorkspaceForRun> = {}): ResolvedWorkspaceForRun {
  return {
    cwd: "/tmp/project",
    source: "project_primary",
    projectId: "project-1",
    workspaceId: "workspace-1",
    repoUrl: null,
    repoRef: null,
    workspaceHints: [],
    warnings: [],
    ...overrides,
  };
}

const ORIGINAL_AGENT_ZERO_PROJECTS_ROOT = process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT;
const ORIGINAL_SHARED_PROJECT_PATH_ALIASES = process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES;

describe("resolveRuntimeSessionParamsForWorkspace", () => {
  it("migrates fallback workspace sessions to project workspace when project cwd becomes available", () => {
    const agentId = "agent-123";
    const fallbackCwd = resolveDefaultAgentWorkspaceDir(agentId);

    const result = resolveRuntimeSessionParamsForWorkspace({
      agentId,
      previousSessionParams: {
        sessionId: "session-1",
        cwd: fallbackCwd,
        workspaceId: "workspace-1",
      },
      resolvedWorkspace: buildResolvedWorkspace({ cwd: "/tmp/new-project-cwd" }),
    });

    expect(result.sessionParams).toMatchObject({
      sessionId: "session-1",
      cwd: "/tmp/new-project-cwd",
      workspaceId: "workspace-1",
    });
    expect(result.warning).toContain("Attempting to resume session");
  });

  it("does not migrate when previous session cwd is not the fallback workspace", () => {
    const result = resolveRuntimeSessionParamsForWorkspace({
      agentId: "agent-123",
      previousSessionParams: {
        sessionId: "session-1",
        cwd: "/tmp/some-other-cwd",
        workspaceId: "workspace-1",
      },
      resolvedWorkspace: buildResolvedWorkspace({ cwd: "/tmp/new-project-cwd" }),
    });

    expect(result.sessionParams).toEqual({
      sessionId: "session-1",
      cwd: "/tmp/some-other-cwd",
      workspaceId: "workspace-1",
    });
    expect(result.warning).toBeNull();
  });

  it("does not migrate when resolved workspace id differs from previous session workspace id", () => {
    const agentId = "agent-123";
    const fallbackCwd = resolveDefaultAgentWorkspaceDir(agentId);

    const result = resolveRuntimeSessionParamsForWorkspace({
      agentId,
      previousSessionParams: {
        sessionId: "session-1",
        cwd: fallbackCwd,
        workspaceId: "workspace-1",
      },
      resolvedWorkspace: buildResolvedWorkspace({
        cwd: "/tmp/new-project-cwd",
        workspaceId: "workspace-2",
      }),
    });

    expect(result.sessionParams).toEqual({
      sessionId: "session-1",
      cwd: fallbackCwd,
      workspaceId: "workspace-1",
    });
    expect(result.warning).toBeNull();
  });
});

describe("shouldResetTaskSessionForWake", () => {
  it("resets session context on assignment wake", () => {
    expect(shouldResetTaskSessionForWake({ wakeReason: "issue_assigned" })).toBe(true);
  });

  it("resets session context when the assigned issue definition changes", () => {
    expect(shouldResetTaskSessionForWake({ wakeReason: "issue_updated" })).toBe(true);
  });

  it("resets session context on timer heartbeats", () => {
    expect(shouldResetTaskSessionForWake({ wakeSource: "timer" })).toBe(true);
  });

  it("resets session context on manual on-demand invokes", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeSource: "on_demand",
        wakeTriggerDetail: "manual",
      }),
    ).toBe(true);
  });

  it("does not reset session context on mention wake comment", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeReason: "issue_comment_mentioned",
        wakeCommentId: "comment-1",
      }),
    ).toBe(false);
  });

  it("does not reset session context when commentId is present", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeReason: "issue_commented",
        commentId: "comment-2",
      }),
    ).toBe(false);
  });

  it("does not reset for comment wakes", () => {
    expect(shouldResetTaskSessionForWake({ wakeReason: "issue_commented" })).toBe(false);
  });

  it("does not reset when wake reason is missing", () => {
    expect(shouldResetTaskSessionForWake({})).toBe(false);
  });

  it("does not reset session context on callback on-demand invokes", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeSource: "on_demand",
        wakeTriggerDetail: "callback",
      }),
    ).toBe(false);
  });
});

describe("resolveProjectWorkspaceSelection", () => {
  it("preserves configured project workspaces for remote adapters even when Paperclip cannot stat the host path", async () => {
    process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT = "/host_usr_projects";
    process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES =
      "/Users/george/Mac/data/usr/projects,/home/node/Mac/data/usr/projects";

    const result = await resolveProjectWorkspaceSelection({
      adapterType: "agent_zero",
      fallbackCwd: "/tmp/fallback",
      projectWorkspaceRows: [
        {
          id: "workspace-1",
          cwd: "/home/node/Mac/data/usr/projects/ai_joose_factory/.a0proj/_projects/internal/graphrag-agent-zero",
          repoUrl: "https://github.com/AijooseFactory/graphrag-agent-zero",
          repoRef: "main",
        },
      ],
      directoryExists: async () => false,
    });

    try {
      expect(result).toMatchObject({
        cwd: "/host_usr_projects/ai_joose_factory/.a0proj/_projects/internal/graphrag-agent-zero",
        workspaceId: "workspace-1",
        repoUrl: "https://github.com/AijooseFactory/graphrag-agent-zero",
        repoRef: "main",
        warnings: [],
      });
    } finally {
      if (ORIGINAL_AGENT_ZERO_PROJECTS_ROOT === undefined) {
        delete process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT;
      } else {
        process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT = ORIGINAL_AGENT_ZERO_PROJECTS_ROOT;
      }
      if (ORIGINAL_SHARED_PROJECT_PATH_ALIASES === undefined) {
        delete process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES;
      } else {
        process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES = ORIGINAL_SHARED_PROJECT_PATH_ALIASES;
      }
    }
  });

  it("falls back for local adapters when the configured project workspace is unavailable", async () => {
    const result = await resolveProjectWorkspaceSelection({
      adapterType: "codex_local",
      fallbackCwd: "/tmp/fallback",
      projectWorkspaceRows: [
        {
          id: "workspace-1",
          cwd: "/Users/george/Mac/data/usr/projects/ai_joose_factory/.a0proj/_projects/internal/graphrag-agent-zero",
          repoUrl: "https://github.com/AijooseFactory/graphrag-agent-zero",
          repoRef: "main",
        },
      ],
      directoryExists: async () => false,
    });

    expect(result?.cwd).toBe("/tmp/fallback");
    expect(result?.warnings[0]).toContain("Using fallback workspace");
  });
});

describe("mergeIssueContext", () => {
  it("hydrates identifier, title, and description into the run context issue payload", () => {
    const context: Record<string, unknown> = {
      issueId: "issue-1",
      wakeReason: "issue_assigned",
    };

    const result = mergeIssueContext(context, {
      id: "issue-1",
      identifier: "AIJ-6",
      title: "Create Missing Agent Zero Project",
      description: "The Hybrid GraphRAG for Agent Zero needs to be created in Agent Zero.",
    });

    expect(result.issue).toEqual({
      id: "issue-1",
      identifier: "AIJ-6",
      title: "Create Missing Agent Zero Project",
      description: "The Hybrid GraphRAG for Agent Zero needs to be created in Agent Zero.",
    });
  });

  it("preserves existing issue context fields when the fetched issue is partial", () => {
    const context: Record<string, unknown> = {
      issue: {
        id: "issue-1",
        description: "Existing description",
      },
    };

    const result = mergeIssueContext(context, {
      id: "issue-1",
      identifier: "AIJ-6",
      title: "Create Missing Agent Zero Project",
      description: null,
    });

    expect(result.issue).toEqual({
      id: "issue-1",
      identifier: "AIJ-6",
      title: "Create Missing Agent Zero Project",
      description: "Existing description",
    });
  });
});
