import { access, lstat, mkdir, readFile, readlink, readdir, realpath, symlink, unlink, writeFile } from "node:fs/promises";
import { constants as fsConstants, watch } from "node:fs";
import path from "node:path";
import { agents, companies, projectWorkspaces } from "@paperclipai/db";
import type { Db } from "@paperclipai/db";
import { and, asc, eq, ne } from "drizzle-orm";
import { logger } from "../middleware/logger.js";
import { agentService } from "./agents.js";
import { projectService } from "./projects.js";
import { normalizeSharedProjectPath } from "./shared-project-paths.js";

const DEFAULT_AGENT_ZERO_PROJECTS_ROOT = process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT?.trim() || null;
const DEFAULT_AGENT_ZERO_PAPERCLIP_API_URL =
  process.env.PAPERCLIP_AGENT_ZERO_API_URL?.trim() ||
  process.env.PAPERCLIP_INTERNAL_API_URL?.trim() ||
  "http://ajf-paperclip:3100";
const PAPERCLIP_BRIDGE_INSTRUCTIONS_FILENAME = "paperclip-bridge.md";
const DEFAULT_FILE_STRUCTURE = {
  enabled: true,
  gitignore: "",
  max_depth: 5,
  max_files: 20,
  max_folders: 20,
  max_lines: 250,
};

type ProjectProjectionInput = {
  rootDir: string;
  project: {
    name: string;
    description?: string | null;
    color?: string | null;
  };
  workspace: {
    cwd?: string | null;
    repoUrl?: string | null;
  };
};

export type AgentZeroPaperclipBridgePersistentConfig = {
  apiUrl: string;
  companyId: string;
  agentId: string;
  projectId?: string | null;
  apiKey?: string | null;
};

export type AgentZeroPaperclipBridgeRuntimeConfig = {
  runId?: string | null;
  taskId?: string | null;
  issueId?: string | null;
  issueIdentifier?: string | null;
  issueTitle?: string | null;
  wakeReason?: string | null;
  wakeCommentId?: string | null;
};

export type AgentZeroProjectDescriptor = {
  slug: string;
  title: string | null;
  description: string | null;
  color: string | null;
  gitUrl: string | null;
  projectPath: string;
  workspacePath: string;
};

function parseObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.git$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function projectNameFromRepoUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return slugify(path.posix.basename(url.pathname)) || null;
  } catch {
    return slugify(path.posix.basename(value)) || null;
  }
}

export function buildAgentZeroProjectSlug(input: {
  projectName?: string | null;
  workspaceCwd?: string | null;
  repoUrl?: string | null;
}): string {
  const workspaceCwd = nonEmpty(input.workspaceCwd);
  if (workspaceCwd) {
    const slug = slugify(path.basename(workspaceCwd));
    if (slug) return slug;
  }

  const repoUrl = nonEmpty(input.repoUrl);
  if (repoUrl) {
    const repoSlug = projectNameFromRepoUrl(repoUrl);
    if (repoSlug) return repoSlug;
  }

  const projectName = nonEmpty(input.projectName) ?? "project";
  return slugify(projectName) || "project";
}

function buildAgentZeroProjectHeader(input: {
  slug: string;
  projectName: string;
  description?: string | null;
  color?: string | null;
  repoUrl?: string | null;
}) {
  return {
    name: input.slug,
    title: input.projectName,
    description: input.description ?? "",
    instructions: "",
    color: input.color ?? "#22c55e",
    git_url: input.repoUrl ?? "",
    memory: "own",
    file_structure: DEFAULT_FILE_STRUCTURE,
  };
}

function parseEnvText(source: string) {
  const entries: Record<string, string> = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = rawLine.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    entries[match[1]] = match[2] ?? "";
  }
  return entries;
}

function upsertEnvText(source: string, updates: Record<string, string | null | undefined>) {
  const lines = source.length > 0 ? source.split(/\r?\n/) : [];
  const seen = new Set<string>();
  const nextLines: string[] = [];

  for (const rawLine of lines) {
    const match = rawLine.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      if (rawLine.length > 0 || nextLines.length > 0) nextLines.push(rawLine);
      continue;
    }
    const key = match[1];
    if (!(key in updates)) {
      nextLines.push(rawLine);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    const value = updates[key];
    if (value == null) continue;
    nextLines.push(`${key}=${value}`);
  }

  for (const [key, value] of Object.entries(updates)) {
    if (seen.has(key) || value == null) continue;
    nextLines.push(`${key}=${value}`);
  }

  const compacted = nextLines.filter((line, index, all) => {
    if (line.length > 0) return true;
    const previous = all[index - 1] ?? "";
    const next = all[index + 1] ?? "";
    return previous.length > 0 && next.length > 0;
  });

  return compacted.length > 0 ? `${compacted.join("\n")}\n` : "";
}

function buildPaperclipBridgeInstructions() {
  return [
    "# Paperclip Bridge",
    "This Agent Zero project is connected to Paperclip.",
    "",
    "Available Paperclip variables and secrets:",
    "- PAPERCLIP_API_URL",
    "- PAPERCLIP_API_KEY",
    "- PAPERCLIP_COMPANY_ID",
    "- PAPERCLIP_AGENT_ID",
    "- PAPERCLIP_PROJECT_ID",
    "- PAPERCLIP_RUN_ID (only during active Paperclip-assigned work)",
    "- PAPERCLIP_TASK_ID / PAPERCLIP_ISSUE_ID / PAPERCLIP_ISSUE_IDENTIFIER (when Paperclip assigned an issue)",
    "",
    "Assigned Paperclip issue handling:",
    "- When Paperclip assigns an issue, the issue title and description are the task.",
    "- Start executing from that issue immediately; do not ask the user to restate the task unless the issue contents are empty or contradictory.",
    "",
    "Paperclip API rules:",
    "- If these values are not already available to the current shell tool, read them from the active project's `.a0proj/variables.env` and `.a0proj/secrets.env` files.",
    "- Never invent or substitute a Paperclip API base URL. Use `PAPERCLIP_API_URL` from `.a0proj/variables.env`, not a public/default paperclip.technology URL.",
    "- Use Authorization: Bearer $PAPERCLIP_API_KEY on every Paperclip API call.",
    "- If PAPERCLIP_RUN_ID is set for an active assigned issue, include X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID on mutating calls for that issue run.",
    "- Use only documented /api routes.",
    "",
    "Primary Paperclip endpoints:",
    "- POST /api/companies/{companyId}/issues",
    "- PATCH /api/issues/{issueId}",
    "- POST /api/issues/{issueId}/comments",
    "- POST /api/companies/{companyId}/projects",
    "",
    "PRDs in Paperclip:",
    "- When the user asks for a PRD, create a Paperclip issue whose title begins with `PRD:`.",
    "- Use a Markdown description with problem, goals, scope, requirements, acceptance criteria, and risks.",
    "- If PAPERCLIP_PROJECT_ID is set and the PRD belongs to this project, include that projectId in the new issue payload.",
  ].join("\n");
}

async function exists(pathname: string) {
  try {
    await access(pathname, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function sameRealPath(left: string, right: string) {
  try {
    const [leftPath, rightPath] = await Promise.all([realpath(left), realpath(right)]);
    return leftPath === rightPath;
  } catch {
    return false;
  }
}

async function ensureTextFile(pathname: string, contents: string) {
  await mkdir(path.dirname(pathname), { recursive: true });
  await writeFile(pathname, contents, "utf8");
}

async function ensureTextFileIfMissing(pathname: string, contents: string) {
  if (await exists(pathname)) return;
  await ensureTextFile(pathname, contents);
}

async function upsertEnvFile(pathname: string, updates: Record<string, string | null | undefined>) {
  const current = await readFile(pathname, "utf8").catch(() => "");
  await ensureTextFile(pathname, upsertEnvText(current, updates));
}

async function readPathStat(pathname: string) {
  try {
    return await lstat(pathname);
  } catch {
    return null;
  }
}

export async function ensureAgentZeroProjectProjection(input: ProjectProjectionInput) {
  const rootDir = input.rootDir.trim();
  const workspaceCwd = normalizeSharedProjectPath(nonEmpty(input.workspace.cwd));
  if (!rootDir || !workspaceCwd) {
    throw new Error("Agent Zero project projection requires both a rootDir and workspace cwd");
  }

  const slug = buildAgentZeroProjectSlug({
    projectName: input.project.name,
    workspaceCwd,
    repoUrl: input.workspace.repoUrl,
  });
  const resolvedRootDir = path.resolve(rootDir);
  const resolvedWorkspaceCwd = path.resolve(workspaceCwd);
  const workspaceIsDirectProject = path.dirname(resolvedWorkspaceCwd) === resolvedRootDir;
  const aliasProjectPath = path.join(rootDir, slug);
  const projectPath = workspaceIsDirectProject ? workspaceCwd : aliasProjectPath;
  const symlinkTarget = path.relative(path.dirname(aliasProjectPath), workspaceCwd) || ".";

  await mkdir(rootDir, { recursive: true });

  if (workspaceIsDirectProject) {
    const aliasStat = await readPathStat(aliasProjectPath);
    if (aliasStat && aliasProjectPath !== projectPath) {
      if (aliasStat.isSymbolicLink()) {
        if (await sameRealPath(aliasProjectPath, workspaceCwd)) {
          await unlink(aliasProjectPath);
        } else {
          throw new Error(`Agent Zero project alias already points somewhere else: ${aliasProjectPath}`);
        }
      } else if (!(await sameRealPath(aliasProjectPath, workspaceCwd))) {
        throw new Error(`Agent Zero project alias already exists and does not match workspace: ${aliasProjectPath}`);
      }
    }
  } else {
    const stat = await readPathStat(projectPath);
    if (stat) {
      if (stat.isSymbolicLink()) {
        const existingTarget = await readlink(projectPath);
        if (existingTarget !== symlinkTarget) {
          await unlink(projectPath);
          await symlink(symlinkTarget, projectPath);
        } else if (!(await sameRealPath(projectPath, workspaceCwd))) {
          throw new Error(`Agent Zero project path already points somewhere else: ${projectPath}`);
        }
      } else if (!(await sameRealPath(projectPath, workspaceCwd))) {
        throw new Error(`Agent Zero project path already exists and does not match workspace: ${projectPath}`);
      }
    } else {
      await symlink(symlinkTarget, projectPath);
    }
  }

  const header = buildAgentZeroProjectHeader({
    slug,
    projectName: input.project.name,
    description: input.project.description,
    color: input.project.color,
    repoUrl: input.workspace.repoUrl,
  });
  await mkdir(path.join(workspaceCwd, ".a0proj", "instructions"), { recursive: true });
  await mkdir(path.join(workspaceCwd, ".a0proj", "knowledge", "main"), { recursive: true });
  await mkdir(path.join(workspaceCwd, ".a0proj", "knowledge", "fragments"), { recursive: true });
  await ensureTextFileIfMissing(path.join(workspaceCwd, ".a0proj", "agents.json"), "{}\n");
  await ensureTextFileIfMissing(path.join(workspaceCwd, ".a0proj", "variables.env"), "");
  await ensureTextFileIfMissing(path.join(workspaceCwd, ".a0proj", "secrets.env"), "");
  await ensureTextFile(
    path.join(workspaceCwd, ".a0proj", "project.json"),
    `${JSON.stringify(header, null, 2)}\n`,
  );

  return {
    slug,
    projectPath,
  };
}

export async function syncAgentZeroProjectBridgeFiles(input: {
  workspaceCwd: string;
  persistent?: AgentZeroPaperclipBridgePersistentConfig | null;
  runtime?: AgentZeroPaperclipBridgeRuntimeConfig | null;
}) {
  const workspaceCwd = normalizeSharedProjectPath(nonEmpty(input.workspaceCwd));
  if (!workspaceCwd) return;

  const metaDir = path.join(workspaceCwd, ".a0proj");
  const instructionsDir = path.join(metaDir, "instructions");
  await mkdir(instructionsDir, { recursive: true });
  await ensureTextFileIfMissing(path.join(metaDir, "variables.env"), "");
  await ensureTextFileIfMissing(path.join(metaDir, "secrets.env"), "");

  const variableUpdates: Record<string, string | null | undefined> = {};
  const persistent = input.persistent ?? null;
  const runtime = input.runtime ?? null;

  if (persistent) {
    variableUpdates.PAPERCLIP_API_URL = persistent.apiUrl;
    variableUpdates.PAPERCLIP_COMPANY_ID = persistent.companyId;
    variableUpdates.PAPERCLIP_AGENT_ID = persistent.agentId;
    variableUpdates.PAPERCLIP_PROJECT_ID = persistent.projectId ?? null;
  }

  if (runtime) {
    variableUpdates.PAPERCLIP_RUN_ID = runtime.runId ?? null;
    variableUpdates.PAPERCLIP_TASK_ID = runtime.taskId ?? null;
    variableUpdates.PAPERCLIP_ISSUE_ID = runtime.issueId ?? null;
    variableUpdates.PAPERCLIP_ISSUE_IDENTIFIER = runtime.issueIdentifier ?? null;
    variableUpdates.PAPERCLIP_ISSUE_TITLE = runtime.issueTitle ?? null;
    variableUpdates.PAPERCLIP_WAKE_REASON = runtime.wakeReason ?? null;
    variableUpdates.PAPERCLIP_WAKE_COMMENT_ID = runtime.wakeCommentId ?? null;
  }

  await upsertEnvFile(path.join(metaDir, "variables.env"), variableUpdates);

  if (persistent?.apiKey) {
    await upsertEnvFile(path.join(metaDir, "secrets.env"), {
      PAPERCLIP_API_KEY: persistent.apiKey,
    });
  }

  await ensureTextFile(
    path.join(instructionsDir, PAPERCLIP_BRIDGE_INSTRUCTIONS_FILENAME),
    `${buildPaperclipBridgeInstructions()}\n`,
  );
}

export async function listAgentZeroProjects(rootDir: string): Promise<AgentZeroProjectDescriptor[]> {
  if (!rootDir.trim()) return [];
  try {
    const entries = await readdir(rootDir, { withFileTypes: true });
    const descriptors = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
        .map(async (entry) => {
          const projectPath = path.join(rootDir, entry.name);
          const headerPath = path.join(projectPath, ".a0proj", "project.json");
          if (!(await exists(headerPath))) return null;
          const header = parseObject(JSON.parse(await readFile(headerPath, "utf8")));
          const workspacePath = await realpath(projectPath).catch(() => path.resolve(projectPath));
          return {
            slug: entry.name,
            title: nonEmpty(header.title),
            description: nonEmpty(header.description),
            color: nonEmpty(header.color),
            gitUrl: nonEmpty(header.git_url),
            projectPath,
            workspacePath,
          } satisfies AgentZeroProjectDescriptor;
        }),
    );
    return descriptors.filter((value): value is AgentZeroProjectDescriptor => Boolean(value));
  } catch {
    return [];
  }
}

async function resolveImportCompanyId(db: Db): Promise<string | null> {
  const preferred = process.env.PAPERCLIP_AGENT_ZERO_SYNC_COMPANY_ID?.trim();
  if (preferred) return preferred;
  const rows = await db.select({ id: companies.id }).from(companies).orderBy(asc(companies.createdAt));
  return rows.length === 1 ? rows[0]!.id : null;
}

async function updateWorkspaceMetadata(
  db: Db,
  workspaceId: string,
  metadata: Record<string, unknown>,
) {
  const current = await db
    .select({ metadata: projectWorkspaces.metadata })
    .from(projectWorkspaces)
    .where(eq(projectWorkspaces.id, workspaceId))
    .then((rows) => rows[0] ?? null);
  const nextMetadata = {
    ...(parseObject(current?.metadata) ?? {}),
    ...metadata,
  };
  await db
    .update(projectWorkspaces)
    .set({ metadata: nextMetadata, updatedAt: new Date() })
    .where(eq(projectWorkspaces.id, workspaceId));
}

async function resolveSingleActiveAgentZeroAgentId(db: Db, companyId: string) {
  const rows = await db
    .select({ id: agents.id })
    .from(agents)
    .where(
      and(
        eq(agents.companyId, companyId),
        eq(agents.adapterType, "agent_zero"),
        ne(agents.status, "terminated"),
      ),
    );
  if (rows.length !== 1) return null;
  return rows[0]?.id ?? null;
}

async function resolvePersistentPaperclipBridge(
  db: Db,
  input: {
    companyId: string;
    workspaceCwd: string;
    projectId?: string | null;
    agentId?: string | null;
  },
): Promise<AgentZeroPaperclipBridgePersistentConfig | null> {
  const workspaceCwd = normalizeSharedProjectPath(nonEmpty(input.workspaceCwd));
  if (!workspaceCwd) return null;

  const agentId = input.agentId ?? (await resolveSingleActiveAgentZeroAgentId(db, input.companyId));
  if (!agentId) return null;

  const secretsPath = path.join(workspaceCwd, ".a0proj", "secrets.env");
  const existingSecrets = parseEnvText(await readFile(secretsPath, "utf8").catch(() => ""));
  const existingApiKey = nonEmpty(existingSecrets.PAPERCLIP_API_KEY);
  const apiKey =
    existingApiKey ??
    (await agentService(db).createApiKey(agentId, `agent-zero-project-bridge:${path.basename(workspaceCwd)}`)).token;

  return {
    apiUrl: DEFAULT_AGENT_ZERO_PAPERCLIP_API_URL,
    companyId: input.companyId,
    agentId,
    projectId: input.projectId ?? null,
    apiKey,
  };
}

export async function ensureAgentZeroProjectBridgeForWorkspace(
  db: Db,
  input: {
    companyId: string;
    workspaceCwd: string;
    projectId?: string | null;
    agentId?: string | null;
    runtime?: AgentZeroPaperclipBridgeRuntimeConfig | null;
  },
) {
  const workspaceCwd = normalizeSharedProjectPath(nonEmpty(input.workspaceCwd));
  if (!workspaceCwd) return;

  const persistent = await resolvePersistentPaperclipBridge(db, {
    companyId: input.companyId,
    workspaceCwd,
    projectId: input.projectId ?? null,
    agentId: input.agentId ?? null,
  });

  await syncAgentZeroProjectBridgeFiles({
    workspaceCwd,
    persistent,
    runtime: input.runtime ?? null,
  });
}

export async function syncProjectToAgentZeroRoot(db: Db, projectId: string) {
  if (!DEFAULT_AGENT_ZERO_PROJECTS_ROOT) return null;
  const svc = projectService(db);
  const project = await svc.getById(projectId);
  if (!project) return null;
  const primaryWorkspace = project.workspaces.find((workspace) => workspace.isPrimary) ?? project.workspaces[0] ?? null;
  const normalizedWorkspaceCwd = normalizeSharedProjectPath(primaryWorkspace?.cwd);
  if (!normalizedWorkspaceCwd) return null;
  if (primaryWorkspace && normalizedWorkspaceCwd !== primaryWorkspace.cwd) {
    await db
      .update(projectWorkspaces)
      .set({ cwd: normalizedWorkspaceCwd, updatedAt: new Date() })
      .where(eq(projectWorkspaces.id, primaryWorkspace.id));
  }

  const projection = await ensureAgentZeroProjectProjection({
    rootDir: DEFAULT_AGENT_ZERO_PROJECTS_ROOT,
    project: {
      name: project.name,
      description: project.description,
      color: project.color,
    },
    workspace: {
      cwd: normalizedWorkspaceCwd,
      repoUrl: primaryWorkspace.repoUrl,
    },
  });
  await ensureAgentZeroProjectBridgeForWorkspace(db, {
    companyId: project.companyId,
    workspaceCwd: normalizedWorkspaceCwd,
    projectId: project.id,
  });
  await updateWorkspaceMetadata(db, primaryWorkspace.id, {
    agentZeroProjectName: projection.slug,
    agentZeroProjectPath: projection.projectPath,
    agentZeroSyncSource: "paperclip",
  });
  return projection;
}

async function importMissingAgentZeroProjects(db: Db) {
  if (!DEFAULT_AGENT_ZERO_PROJECTS_ROOT) return;
  const companyId = await resolveImportCompanyId(db);
  if (!companyId) {
    logger.warn(
      "Skipping Agent Zero project import because no sync company could be resolved. Set PAPERCLIP_AGENT_ZERO_SYNC_COMPANY_ID to enable imports in multi-company setups.",
    );
    return;
  }

  const svc = projectService(db);
  const existingProjects = await svc.list(companyId);
  const knownWorkspacePaths = new Map<string, { projectId: string; workspaceId: string }>();
  for (const project of existingProjects) {
    for (const workspace of project.workspaces) {
      if (!workspace.cwd) continue;
      try {
        knownWorkspacePaths.set(await realpath(workspace.cwd), { projectId: project.id, workspaceId: workspace.id });
      } catch {
        knownWorkspacePaths.set(path.resolve(workspace.cwd), { projectId: project.id, workspaceId: workspace.id });
      }
      const metadata = parseObject(workspace.metadata);
      const slug = nonEmpty(metadata.agentZeroProjectName);
      if (slug) {
        knownWorkspacePaths.set(`slug:${slug}`, { projectId: project.id, workspaceId: workspace.id });
      }
    }
  }

  const discovered = await listAgentZeroProjects(DEFAULT_AGENT_ZERO_PROJECTS_ROOT);
  for (const project of discovered) {
    const existingByPath = knownWorkspacePaths.get(project.workspacePath);
    if (existingByPath) {
      await updateWorkspaceMetadata(db, existingByPath.workspaceId, {
        agentZeroProjectName: project.slug,
        agentZeroProjectPath: project.projectPath,
        agentZeroSyncSource: "agent_zero",
      });
      continue;
    }
    const existingBySlug = knownWorkspacePaths.get(`slug:${project.slug}`);
    if (existingBySlug) continue;

    const createdProject = await svc.create(companyId, {
      name: project.title ?? project.slug,
      description: project.description,
      color: project.color ?? "#22c55e",
      status: "backlog",
    });
    const workspace = await svc.createWorkspace(createdProject.id, {
      cwd: project.workspacePath,
      repoUrl: project.gitUrl,
      isPrimary: true,
      metadata: {
        agentZeroProjectName: project.slug,
        agentZeroProjectPath: project.projectPath,
        agentZeroSyncSource: "agent_zero",
      },
    });
    if (workspace) {
      await ensureAgentZeroProjectBridgeForWorkspace(db, {
        companyId,
        workspaceCwd: project.workspacePath,
        projectId: createdProject.id,
      });
      knownWorkspacePaths.set(project.workspacePath, { projectId: createdProject.id, workspaceId: workspace.id });
      knownWorkspacePaths.set(`slug:${project.slug}`, { projectId: createdProject.id, workspaceId: workspace.id });
      logger.info(
        { companyId, projectId: createdProject.id, workspaceId: workspace.id, slug: project.slug },
        "Imported Agent Zero project into Paperclip",
      );
    }
  }
}

export async function syncAgentZeroProjects(db: Db) {
  if (!DEFAULT_AGENT_ZERO_PROJECTS_ROOT) return;
  const companyRows = await db.select({ id: companies.id }).from(companies).orderBy(asc(companies.createdAt));
  for (const company of companyRows) {
    const projects = await projectService(db).list(company.id);
    for (const project of projects) {
      try {
        await syncProjectToAgentZeroRoot(db, project.id);
      } catch (err) {
        logger.warn(
          {
            err,
            companyId: company.id,
            projectId: project.id,
          },
          "Failed to project Paperclip project into Agent Zero root",
        );
      }
    }
  }
  await importMissingAgentZeroProjects(db);
}

export async function startAgentZeroProjectSync(db: Db) {
  if (!DEFAULT_AGENT_ZERO_PROJECTS_ROOT) {
    logger.info("Agent Zero project sync disabled because PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT is not set");
    return {
      close() {},
    };
  }

  await syncAgentZeroProjects(db);
  await mkdir(DEFAULT_AGENT_ZERO_PROJECTS_ROOT, { recursive: true });

  let timer: NodeJS.Timeout | null = null;
  const watcher = watch(DEFAULT_AGENT_ZERO_PROJECTS_ROOT, { persistent: false }, () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void syncAgentZeroProjects(db).catch((err) => {
        logger.error({ err }, "Agent Zero project sync failed after filesystem change");
      });
    }, 250);
  });

  return {
    close() {
      if (timer) clearTimeout(timer);
      watcher.close();
    },
  };
}
