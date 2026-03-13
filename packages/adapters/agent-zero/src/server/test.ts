import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";
import { asString, parseObject } from "./utils.js";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((check) => check.level === "error")) return "fail";
  if (checks.some((check) => check.level === "warn")) return "warn";
  return "pass";
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const urlValue = asString(config.url, "");

  if (!urlValue) {
    checks.push({
      code: "agent_url_missing",
      level: "error",
      message: "Agent Zero adapter requires a URL.",
      hint: "Set adapterConfig.url to the Agent Zero endpoint.",
    });
    return {
      adapterType: ctx.adapterType,
      status: summarizeStatus(checks),
      checks,
      testedAt: new Date().toISOString(),
    };
  }

  let url: URL | null = null;
  try {
    url = new URL(urlValue);
  } catch {
    checks.push({
      code: "agent_url_invalid",
      level: "error",
      message: `Invalid URL: ${urlValue}`,
    });
  }

  if (url && url.protocol !== "http:" && url.protocol !== "https:") {
    checks.push({
      code: "agent_url_protocol_invalid",
      level: "error",
      message: `Unsupported URL protocol: ${url.protocol}`,
    });
  }

  if (url) {
    checks.push({
      code: "agent_url_valid",
      level: "info",
      message: `Configured endpoint: ${url.toString()}`,
    });
  }

  if (url && (url.protocol === "http:" || url.protocol === "https:")) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });
      if (!response.ok && response.status !== 405 && response.status !== 501) {
        checks.push({
          code: "agent_endpoint_probe_unexpected_status",
          level: "warn",
          message: `Endpoint probe returned HTTP ${response.status}.`,
        });
      } else {
        checks.push({
          code: "agent_endpoint_probe_ok",
          level: "info",
          message: "Endpoint responded to a HEAD probe.",
        });
      }
    } catch (err: any) {
      checks.push({
        code: "agent_endpoint_probe_failed",
        level: "warn",
        message: err.message,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    adapterType: ctx.adapterType,
    status: summarizeStatus(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
