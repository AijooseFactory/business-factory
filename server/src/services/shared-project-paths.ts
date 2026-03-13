import path from "node:path";

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseConfiguredRoots(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => readNonEmptyString(entry))
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => path.resolve(entry));
}

function pathMatchesRoot(candidate: string, root: string) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

export function getSharedProjectsRoot() {
  const configured = readNonEmptyString(process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT);
  return configured ? path.resolve(configured) : null;
}

export function getSharedProjectPathAliases() {
  return parseConfiguredRoots(process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES);
}

export function normalizeSharedProjectPath(value: string | null | undefined) {
  const cwd = readNonEmptyString(value);
  if (!cwd) return null;

  const resolved = path.resolve(cwd);
  const sharedRoot = getSharedProjectsRoot();
  if (!sharedRoot) return resolved;
  if (pathMatchesRoot(resolved, sharedRoot)) return resolved;

  for (const alias of getSharedProjectPathAliases()) {
    if (!pathMatchesRoot(resolved, alias)) continue;
    const relativePath = path.relative(alias, resolved);
    return relativePath ? path.join(sharedRoot, relativePath) : sharedRoot;
  }

  return resolved;
}
