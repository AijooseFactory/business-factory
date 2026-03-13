import path from "node:path";

const PAPERCLIP_ISSUE_STATUSES = new Set([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "done",
  "cancelled",
]);

export type PaperclipResultEnvelope = {
  status: string;
  summary: string | null;
  comment: string | null;
};

export function asString(val: unknown, fallback: string): string {
  return typeof val === "string" ? val : fallback;
}

export function asNumber(val: unknown, fallback: number): number {
  return typeof val === "number" ? val : fallback;
}

export function parseObject(val: unknown): Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val) ? (val as Record<string, unknown>) : {};
}

export function compactText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

export function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = compactText(value);
  return trimmed.length > 0 ? trimmed : null;
}

export function slugifyProjectName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.git$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function projectNameFromRepoUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const basename = path.posix.basename(url.pathname);
    const slug = slugifyProjectName(basename);
    return slug || null;
  } catch {
    const basename = path.posix.basename(trimmed);
    const slug = slugifyProjectName(basename);
    return slug || null;
  }
}

export function deriveAgentZeroProjectName(input: {
  workspaceCwd?: unknown;
  repoUrl?: unknown;
  projectName?: unknown;
}): string | null {
  const workspaceCwd = nonEmpty(input.workspaceCwd);
  if (workspaceCwd) {
    const basename = path.basename(workspaceCwd);
    const slug = slugifyProjectName(basename);
    if (slug) return slug;
  }

  const repoUrl = nonEmpty(input.repoUrl);
  if (repoUrl) {
    const slug = projectNameFromRepoUrl(repoUrl);
    if (slug) return slug;
  }

  const projectName = nonEmpty(input.projectName);
  if (projectName) {
    const slug = slugifyProjectName(projectName);
    if (slug) return slug;
  }

  return null;
}

function normalizePaperclipResultEnvelope(value: unknown): PaperclipResultEnvelope | null {
  const parsed = parseObject(value);
  const status = nonEmpty(parsed.status);
  if (!status || !PAPERCLIP_ISSUE_STATUSES.has(status)) return null;

  const summary = nonEmpty(parsed.summary);
  const comment = nonEmpty(parsed.comment);
  if (!summary && !comment) return null;

  return { status, summary, comment };
}

function parseJsonCandidate(value: string): PaperclipResultEnvelope | null {
  try {
    return normalizePaperclipResultEnvelope(JSON.parse(value));
  } catch {
    return null;
  }
}

export function parsePaperclipResultFromResponse(responseText: unknown): PaperclipResultEnvelope | null {
  const response = nonEmpty(responseText);
  if (!response) return null;

  const marker = "PAPERCLIP_RESULT_JSON";
  const markerIndex = response.lastIndexOf(marker);
  const markerSlice = markerIndex >= 0 ? response.slice(markerIndex + marker.length).trim() : null;

  const candidates: string[] = [];
  if (markerSlice) {
    const codeBlockMatch = markerSlice.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch?.[1]) candidates.push(codeBlockMatch[1]);
    candidates.push(markerSlice);
  }
  candidates.push(response);

  for (const candidate of candidates) {
    const parsed = parseJsonCandidate(candidate.trim());
    if (parsed) return parsed;
  }

  return null;
}
