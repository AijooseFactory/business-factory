import type { DeploymentExposure, DeploymentMode } from "@business-factory/shared";
import { resolvePrivateHostnameAllowSet } from "../middleware/private-hostname-guard.js";

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function validateOpenClawGatewayAdapterConfig(input: {
  adapterConfig: Record<string, unknown>;
  deploymentMode: DeploymentMode;
  deploymentExposure: DeploymentExposure;
  bindHost: string;
  allowedHostnames: string[];
}): string | null {
  const rawPaperclipApiUrl = asNonEmptyString(input.adapterConfig.paperclipApiUrl);
  if (!rawPaperclipApiUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawPaperclipApiUrl);
  } catch {
    return `paperclipApiUrl must be a valid http:// or https:// URL (got ${rawPaperclipApiUrl}).`;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return `paperclipApiUrl must use http:// or https:// (got ${parsed.protocol}).`;
  }

  if (input.deploymentMode !== "authenticated" || input.deploymentExposure !== "private") {
    return null;
  }

  const hostname = parsed.hostname.trim().toLowerCase();
  const allowSet = resolvePrivateHostnameAllowSet({
    allowedHostnames: input.allowedHostnames,
    bindHost: input.bindHost,
  });
  if (allowSet.has(hostname)) {
    return null;
  }

  return (
    `paperclipApiUrl hostname "${hostname}" is not allowed for this Paperclip instance. ` +
    `Run pnpm paperclipai allowed-hostname ${hostname} or choose a reachable allowed hostname.`
  );
}
