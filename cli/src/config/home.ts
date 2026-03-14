import os from "node:os";
import path from "node:path";

const DEFAULT_INSTANCE_ID = "default";
const INSTANCE_ID_RE = /^[a-zA-Z0-9_-]+$/;

export function resolveBusinessFactoryHomeDir(): string {
  const envHome = process.env.BUSINESS_FACTORY_HOME?.trim() || process.env.PAPERCLIP_HOME?.trim();
  if (envHome) return path.resolve(expandHomePrefix(envHome));
  return path.resolve(os.homedir(), ".business-factory");
}

export function resolveBusinessFactoryInstanceId(override?: string): string {
  const raw = override?.trim() || process.env.BUSINESS_FACTORY_INSTANCE_ID?.trim() || process.env.PAPERCLIP_INSTANCE_ID?.trim() || DEFAULT_INSTANCE_ID;
  if (!INSTANCE_ID_RE.test(raw)) {
    throw new Error(
      `Invalid instance id '${raw}'. Allowed characters: letters, numbers, '_' and '-'.`,
    );
  }
  return raw;
}

export function resolveBusinessFactoryInstanceRoot(instanceId?: string): string {
  const id = resolveBusinessFactoryInstanceId(instanceId);
  return path.resolve(resolveBusinessFactoryHomeDir(), "instances", id);
}

export function resolveDefaultConfigPath(instanceId?: string): string {
  return path.resolve(resolveBusinessFactoryInstanceRoot(instanceId), "config.json");
}

export function resolveDefaultContextPath(): string {
  return path.resolve(resolveBusinessFactoryHomeDir(), "context.json");
}

export function resolveDefaultEmbeddedPostgresDir(instanceId?: string): string {
  return path.resolve(resolveBusinessFactoryInstanceRoot(instanceId), "db");
}

export function resolveDefaultLogsDir(instanceId?: string): string {
  return path.resolve(resolveBusinessFactoryInstanceRoot(instanceId), "logs");
}

export function resolveDefaultSecretsKeyFilePath(instanceId?: string): string {
  return path.resolve(resolveBusinessFactoryInstanceRoot(instanceId), "secrets", "master.key");
}

export function resolveDefaultStorageDir(instanceId?: string): string {
  return path.resolve(resolveBusinessFactoryInstanceRoot(instanceId), "data", "storage");
}

export function resolveDefaultBackupDir(instanceId?: string): string {
  return path.resolve(resolveBusinessFactoryInstanceRoot(instanceId), "data", "backups");
}

export function expandHomePrefix(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.resolve(os.homedir(), value.slice(2));
  return value;
}

export function describeLocalInstancePaths(instanceId?: string) {
  const resolvedInstanceId = resolveBusinessFactoryInstanceId(instanceId);
  const instanceRoot = resolveBusinessFactoryInstanceRoot(resolvedInstanceId);
  return {
    homeDir: resolveBusinessFactoryHomeDir(),
    instanceId: resolvedInstanceId,
    instanceRoot,
    configPath: resolveDefaultConfigPath(resolvedInstanceId),
    embeddedPostgresDataDir: resolveDefaultEmbeddedPostgresDir(resolvedInstanceId),
    backupDir: resolveDefaultBackupDir(resolvedInstanceId),
    logDir: resolveDefaultLogsDir(resolvedInstanceId),
    secretsKeyFilePath: resolveDefaultSecretsKeyFilePath(resolvedInstanceId),
    storageDir: resolveDefaultStorageDir(resolvedInstanceId),
  };
}

/** @deprecated Use `resolveBusinessFactoryInstanceId` instead. */
export const resolvePaperclipInstanceId = resolveBusinessFactoryInstanceId;

/** @deprecated Use `resolveBusinessFactoryHomeDir` instead. */
export const resolvePaperclipHomeDir = resolveBusinessFactoryHomeDir;