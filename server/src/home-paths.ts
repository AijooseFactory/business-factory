import os from "node:os";
import path from "node:path";

const DEFAULT_INSTANCE_ID = "default";
const INSTANCE_ID_RE = /^[a-zA-Z0-9_-]+$/;

function expandHomePrefix(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.resolve(os.homedir(), value.slice(2));
  return value;
}

export function resolveBusinessFactoryHomeDir(): string {
  const envHome = process.env.BUSINESS_FACTORY_HOME?.trim();
  if (envHome) return path.resolve(expandHomePrefix(envHome));
  return path.resolve(os.homedir(), ".business-factory");
}

export function resolveBusinessFactoryInstanceId(): string {
  const raw = process.env.BUSINESS_FACTORY_INSTANCE_ID?.trim() || DEFAULT_INSTANCE_ID;
  if (!INSTANCE_ID_RE.test(raw)) {
    throw new Error(`Invalid BUSINESS_FACTORY_INSTANCE_ID '${raw}'.`);
  }
  return raw;
}

export function resolveBusinessFactoryInstanceRoot(): string {
  return path.resolve(resolveBusinessFactoryHomeDir(), "instances", resolveBusinessFactoryInstanceId());
}

export function resolveDefaultConfigPath(): string {
  return path.resolve(resolveBusinessFactoryInstanceRoot(), "config.json");
}

export function resolveDefaultEmbeddedPostgresDir(): string {
  return path.resolve(resolveBusinessFactoryInstanceRoot(), "db");
}

export function resolveDefaultLogsDir(): string {
  return path.resolve(resolveBusinessFactoryInstanceRoot(), "logs");
}

export function resolveDefaultSecretsKeyFilePath(): string {
  return path.resolve(resolveBusinessFactoryInstanceRoot(), "secrets", "master.key");
}

export function resolveDefaultStorageDir(): string {
  return path.resolve(resolveBusinessFactoryInstanceRoot(), "data", "storage");
}

export function resolveDefaultBackupDir(): string {
  return path.resolve(resolveBusinessFactoryInstanceRoot(), "data", "backups");
}

export function resolveDefaultAgentWorkspaceDir(agentId: string): string {
  const trimmed = agentId.trim();
  if (!INSTANCE_ID_RE.test(trimmed)) {
    throw new Error(`Invalid agent id '${trimmed}'`);
  }
  return path.resolve(resolveBusinessFactoryInstanceRoot(), "workspaces", trimmed);
}

export function resolveHomeAwarePath(value: string): string {
  return path.resolve(expandHomePrefix(value));
}