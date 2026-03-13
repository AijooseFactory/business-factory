import { afterEach, describe, expect, it } from "vitest";
import { lstat, mkdtemp, mkdir, readFile, readlink, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildAgentZeroProjectSlug,
  ensureAgentZeroProjectProjection,
  listAgentZeroProjects,
  syncAgentZeroProjectBridgeFiles,
} from "../services/agent-zero-project-sync.ts";

const tempDirs: string[] = [];

async function makeTempDir(prefix: string) {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    await rm(dir, { recursive: true, force: true });
  }
});

describe("buildAgentZeroProjectSlug", () => {
  it("prefers the workspace basename when available", () => {
    const slug = buildAgentZeroProjectSlug({
      projectName: "Hybrid GraphRAG for Agent Zero",
      workspaceCwd: "/Users/george/Mac/data/usr/projects/ai_joose_factory/.a0proj/_projects/internal/graphrag-agent-zero",
      repoUrl: "https://github.com/AijooseFactory/graphrag-agent-zero",
    });

    expect(slug).toBe("graphrag-agent-zero");
  });

  it("falls back to the repository name", () => {
    const slug = buildAgentZeroProjectSlug({
      projectName: "Hybrid GraphRAG for Agent Zero",
      workspaceCwd: null,
      repoUrl: "https://github.com/AijooseFactory/graphrag-agent-zero.git",
    });

    expect(slug).toBe("graphrag-agent-zero");
  });
});

describe("ensureAgentZeroProjectProjection", () => {
  const originalProjectsRoot = process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT;
  const originalPathAliases = process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES;

  afterEach(() => {
    if (originalProjectsRoot === undefined) {
      delete process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT;
    } else {
      process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT = originalProjectsRoot;
    }

    if (originalPathAliases === undefined) {
      delete process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES;
    } else {
      process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES = originalPathAliases;
    }
  });

  it("creates a symlinked Agent Zero project and writes project.json metadata", async () => {
    const root = await makeTempDir("paperclip-a0-root-");
    const workspaceBase = await makeTempDir("paperclip-a0-workspace-parent-");
    const workspace = path.join(workspaceBase, "graphrag-agent-zero");
    await mkdir(workspace, { recursive: true });

    const result = await ensureAgentZeroProjectProjection({
      rootDir: root,
      project: {
        name: "Hybrid GraphRAG for Agent Zero",
        description: "Hybrid GraphRAG integration for Agent Zero",
        color: "#22c55e",
      },
      workspace: {
        cwd: workspace,
        repoUrl: "https://github.com/AijooseFactory/graphrag-agent-zero",
      },
    });

    expect(result.slug).toBe("graphrag-agent-zero");
    expect(result.projectPath).toBe(path.join(root, "graphrag-agent-zero"));

    const projectionStat = await lstat(result.projectPath);
    expect(projectionStat.isSymbolicLink()).toBe(true);
    expect(await realpath(result.projectPath)).toBe(await realpath(workspace));
    expect(await readlink(result.projectPath)).not.toMatch(/^\//);

    const projectJson = JSON.parse(await readFile(path.join(workspace, ".a0proj", "project.json"), "utf8"));
    expect(projectJson).toMatchObject({
      title: "Hybrid GraphRAG for Agent Zero",
      description: "Hybrid GraphRAG integration for Agent Zero",
      color: "#22c55e",
      git_url: "https://github.com/AijooseFactory/graphrag-agent-zero",
      memory: "own",
      file_structure: expect.objectContaining({
        gitignore: expect.any(String),
      }),
    });
  });

  it("normalizes legacy workspace roots onto the shared mount before creating the projection", async () => {
    const root = await makeTempDir("paperclip-a0-root-");
    const aliasRoot = await makeTempDir("paperclip-a0-alias-root-");
    const relativeWorkspace = "ai_joose_factory/.a0proj/_projects/internal/graphrag-agent-zero";
    const sharedWorkspace = path.join(root, relativeWorkspace);
    await mkdir(sharedWorkspace, { recursive: true });

    process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT = root;
    process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES = aliasRoot;

    const result = await ensureAgentZeroProjectProjection({
      rootDir: root,
      project: {
        name: "Hybrid GraphRAG for Agent Zero",
      },
      workspace: {
        cwd: path.join(aliasRoot, relativeWorkspace),
        repoUrl: "https://github.com/AijooseFactory/graphrag-agent-zero",
      },
    });

    expect(await realpath(result.projectPath)).toBe(await realpath(sharedWorkspace));
    expect(await readFile(path.join(sharedWorkspace, ".a0proj", "project.json"), "utf8")).toContain(
      "\"name\": \"graphrag-agent-zero\"",
    );
  });

  it("rewrites a stale broken symlink instead of failing with EEXIST", async () => {
    const root = await makeTempDir("paperclip-a0-root-");
    const workspaceBase = await makeTempDir("paperclip-a0-workspace-parent-");
    const workspace = path.join(workspaceBase, "graphrag-agent-zero");
    await mkdir(workspace, { recursive: true });

    const staleProjection = path.join(root, "graphrag-agent-zero");
    await mkdir(root, { recursive: true });
    await symlink("/tmp/does-not-exist-anymore", staleProjection);

    const result = await ensureAgentZeroProjectProjection({
      rootDir: root,
      project: {
        name: "Hybrid GraphRAG for Agent Zero",
      },
      workspace: {
        cwd: workspace,
        repoUrl: "https://github.com/AijooseFactory/graphrag-agent-zero",
      },
    });

    expect(await realpath(result.projectPath)).toBe(await realpath(workspace));
    expect(await readlink(result.projectPath)).not.toBe("/tmp/does-not-exist-anymore");
  });

  it("uses the real workspace path for direct-root projects and removes duplicate alias symlinks", async () => {
    const root = await makeTempDir("paperclip-a0-root-");
    const workspace = path.join(root, "ai_joose_factory");
    await mkdir(workspace, { recursive: true });
    await symlink("ai_joose_factory", path.join(root, "ai-joose-factory"));

    const result = await ensureAgentZeroProjectProjection({
      rootDir: root,
      project: {
        name: "Ai joose Factory",
      },
      workspace: {
        cwd: workspace,
        repoUrl: "https://github.com/AijooseFactory/business-factory",
      },
    });

    expect(result.slug).toBe("ai-joose-factory");
    expect(result.projectPath).toBe(workspace);
    await expect(lstat(path.join(root, "ai-joose-factory"))).rejects.toThrow();
    expect(JSON.parse(await readFile(path.join(workspace, ".a0proj", "project.json"), "utf8"))).toMatchObject({
      name: "ai-joose-factory",
      title: "Ai joose Factory",
    });
  });
});

describe("syncAgentZeroProjectBridgeFiles", () => {
  it("writes Paperclip bridge instructions plus persistent and runtime env values", async () => {
    const workspace = await makeTempDir("paperclip-a0-bridge-workspace-");
    await mkdir(path.join(workspace, ".a0proj", "instructions"), { recursive: true });
    await writeFile(
      path.join(workspace, ".a0proj", "variables.env"),
      "KEEP_ME=yes\nPAPERCLIP_RUN_ID=stale-run\n",
      "utf8",
    );
    await writeFile(
      path.join(workspace, ".a0proj", "secrets.env"),
      "EXISTING_SECRET=keep\n",
      "utf8",
    );

    await syncAgentZeroProjectBridgeFiles({
      workspaceCwd: workspace,
      persistent: {
        apiUrl: "http://ajf-paperclip:3100",
        apiKey: "pcp_bridge_token",
        companyId: "company-123",
        agentId: "agent-123",
        projectId: "project-123",
      },
      runtime: {
        runId: "run-123",
        taskId: "issue-123",
        issueId: "issue-123",
        issueIdentifier: "AIJ-4",
        issueTitle: "Create a new agent",
        wakeReason: "issue_assigned",
        wakeCommentId: "comment-123",
      },
    });

    const variables = await readFile(path.join(workspace, ".a0proj", "variables.env"), "utf8");
    expect(variables).toContain("KEEP_ME=yes");
    expect(variables).toContain("PAPERCLIP_API_URL=http://ajf-paperclip:3100");
    expect(variables).toContain("PAPERCLIP_COMPANY_ID=company-123");
    expect(variables).toContain("PAPERCLIP_AGENT_ID=agent-123");
    expect(variables).toContain("PAPERCLIP_PROJECT_ID=project-123");
    expect(variables).toContain("PAPERCLIP_RUN_ID=run-123");
    expect(variables).toContain("PAPERCLIP_TASK_ID=issue-123");
    expect(variables).toContain("PAPERCLIP_ISSUE_ID=issue-123");
    expect(variables).toContain("PAPERCLIP_ISSUE_IDENTIFIER=AIJ-4");
    expect(variables).toContain("PAPERCLIP_ISSUE_TITLE=Create a new agent");
    expect(variables).toContain("PAPERCLIP_WAKE_REASON=issue_assigned");
    expect(variables).toContain("PAPERCLIP_WAKE_COMMENT_ID=comment-123");

    const secrets = await readFile(path.join(workspace, ".a0proj", "secrets.env"), "utf8");
    expect(secrets).toContain("EXISTING_SECRET=keep");
    expect(secrets).toContain("PAPERCLIP_API_KEY=pcp_bridge_token");

    const instructions = await readFile(
      path.join(workspace, ".a0proj", "instructions", "paperclip-bridge.md"),
      "utf8",
    );
    expect(instructions).toContain(".a0proj/variables.env");
    expect(instructions).toContain("POST /api/companies/{companyId}/issues");
    expect(instructions).toContain("POST /api/companies/{companyId}/projects");
    expect(instructions).toContain("PRD:");
    expect(instructions).toContain(".a0proj/secrets.env");
    expect(instructions).toContain("do not ask the user to restate the task");
  });

  it("removes stale runtime bridge values without disturbing persistent variables", async () => {
    const workspace = await makeTempDir("paperclip-a0-bridge-clear-");
    await mkdir(path.join(workspace, ".a0proj"), { recursive: true });
    await writeFile(
      path.join(workspace, ".a0proj", "variables.env"),
      [
        "PAPERCLIP_API_URL=http://ajf-paperclip:3100",
        "PAPERCLIP_COMPANY_ID=company-123",
        "PAPERCLIP_AGENT_ID=agent-123",
        "PAPERCLIP_RUN_ID=run-123",
        "PAPERCLIP_TASK_ID=issue-123",
        "PAPERCLIP_ISSUE_ID=issue-123",
        "KEEP_ME=yes",
        "",
      ].join("\n"),
      "utf8",
    );

    await syncAgentZeroProjectBridgeFiles({
      workspaceCwd: workspace,
      runtime: {
        runId: null,
        taskId: null,
        issueId: null,
        issueIdentifier: null,
        issueTitle: null,
        wakeReason: null,
        wakeCommentId: null,
      },
    });

    const variables = await readFile(path.join(workspace, ".a0proj", "variables.env"), "utf8");
    expect(variables).toContain("PAPERCLIP_API_URL=http://ajf-paperclip:3100");
    expect(variables).toContain("PAPERCLIP_COMPANY_ID=company-123");
    expect(variables).toContain("PAPERCLIP_AGENT_ID=agent-123");
    expect(variables).toContain("KEEP_ME=yes");
    expect(variables).not.toContain("PAPERCLIP_RUN_ID=");
    expect(variables).not.toContain("PAPERCLIP_TASK_ID=");
    expect(variables).not.toContain("PAPERCLIP_ISSUE_ID=");
  });
});

describe("listAgentZeroProjects", () => {
  it("discovers existing Agent Zero project folders from the shared root", async () => {
    const root = await makeTempDir("paperclip-a0-list-root-");
    const projectDir = path.join(root, "graphrag-agent-zero");
    await mkdir(path.join(projectDir, ".a0proj"), { recursive: true });
    await writeFile(
      path.join(projectDir, ".a0proj", "project.json"),
      JSON.stringify({
        title: "Hybrid GraphRAG for Agent Zero",
        description: "Hybrid GraphRAG integration for Agent Zero",
        color: "#22c55e",
        git_url: "https://github.com/AijooseFactory/graphrag-agent-zero",
        memory: "own",
        file_structure: {
          enabled: true,
          gitignore: "",
          max_depth: 5,
          max_files: 20,
          max_folders: 20,
          max_lines: 250,
        },
      }),
      "utf8",
    );

    const projects = await listAgentZeroProjects(root);
    const resolvedProjectDir = await realpath(projectDir).catch(() => path.resolve(projectDir));
    expect(projects).toEqual([
      expect.objectContaining({
        slug: "graphrag-agent-zero",
        title: "Hybrid GraphRAG for Agent Zero",
        description: "Hybrid GraphRAG integration for Agent Zero",
        projectPath: projectDir,
        workspacePath: resolvedProjectDir,
      }),
    ]);
  });

  it("reports the real workspace path when the Agent Zero project entry is a symlink", async () => {
    const root = await makeTempDir("paperclip-a0-list-root-");
    const workspace = await makeTempDir("paperclip-a0-real-workspace-");
    const projectionPath = path.join(root, "graphrag-agent-zero");
    await mkdir(path.join(workspace, ".a0proj"), { recursive: true });
    await writeFile(
      path.join(workspace, ".a0proj", "project.json"),
      JSON.stringify({
        title: "Hybrid GraphRAG for Agent Zero",
      }),
      "utf8",
    );
    await mkdir(root, { recursive: true });
    await symlink(path.relative(root, workspace), projectionPath);

    const projects = await listAgentZeroProjects(root);
    const resolvedWorkspace = await realpath(workspace).catch(() => path.resolve(workspace));
    expect(projects).toEqual([
      expect.objectContaining({
        slug: "graphrag-agent-zero",
        projectPath: projectionPath,
        workspacePath: resolvedWorkspace,
      }),
    ]);
  });
});
