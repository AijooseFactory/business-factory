import { describe, expect, it } from "vitest";
import { validateOpenClawGatewayAdapterConfig } from "../services/openclaw-gateway-config.js";

describe("validateOpenClawGatewayAdapterConfig", () => {
  it("rejects disallowed paperclipApiUrl hostnames in authenticated private mode", () => {
    const reason = validateOpenClawGatewayAdapterConfig({
      adapterConfig: {
        paperclipApiUrl: "http://host.docker.internal:3100",
      },
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      bindHost: "0.0.0.0",
      allowedHostnames: ["localhost", "127.0.0.1"],
    });

    expect(reason).toContain('paperclipApiUrl hostname "host.docker.internal" is not allowed');
  });

  it("allows hostnames already configured for the instance", () => {
    const reason = validateOpenClawGatewayAdapterConfig({
      adapterConfig: {
        paperclipApiUrl: "http://host.docker.internal:3100",
      },
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      bindHost: "0.0.0.0",
      allowedHostnames: ["localhost", "host.docker.internal"],
    });

    expect(reason).toBeNull();
  });

  it("allows non-private deployments without hostname allowlist checks", () => {
    const reason = validateOpenClawGatewayAdapterConfig({
      adapterConfig: {
        paperclipApiUrl: "https://paperclip.example.com",
      },
      deploymentMode: "authenticated",
      deploymentExposure: "public",
      bindHost: "0.0.0.0",
      allowedHostnames: [],
    });

    expect(reason).toBeNull();
  });
});
