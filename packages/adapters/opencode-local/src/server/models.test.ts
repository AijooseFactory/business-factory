vi.mock("@business-factory/adapter-utils/server-utils", async () => {
  const { vi } = await import("vitest");
  const actual = await vi.importActual("@business-factory/adapter-utils/server-utils");
  return {
    ...actual,
    runChildProcess: vi.fn(),
  };
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ensureOpenCodeModelConfiguredAndAvailable,
  listOpenCodeModels,
  resetOpenCodeModelsCacheForTests,
} from "./models.js";

describe("openCode models", () => {
  afterEach(() => {
    delete process.env.BUSINESS_FACTORY_OPENCODE_COMMAND;
    resetOpenCodeModelsCacheForTests();
    vi.clearAllMocks();
  });

  it("returns an empty list when discovery command is unavailable", async () => {
    // We need to access the mocked runChildProcess
    const serverUtils = await import("@business-factory/adapter-utils/server-utils");
    const runChildProcessMock = vi.mocked(serverUtils).runChildProcess;
    // Simulate that the opencode command is not found or fails
    runChildProcessMock.mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "command not found", signal: null, timedOut: false });

    const models = await listOpenCodeModels();
    expect(models).toEqual([]);
  });

  it("rejects when model is missing", async () => {
    await expect(
      ensureOpenCodeModelConfiguredAndAvailable({ model: "" })
    ).rejects.toThrow("OpenCode requires `adapterConfig.model` in provider/model format.");
  });

  it("rejects when discovery cannot run for configured model", async () => {
    const serverUtils = await import("@business-factory/adapter-utils/server-utils");
    const runChildProcessMock = vi.mocked(serverUtils).runChildProcess;
    // Mock a successful discovery but with no models
    runChildProcessMock.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "", signal: null, timedOut: false });

    await expect(
      ensureOpenCodeModelConfiguredAndAvailable({ model: "openai/gpt-5" })
    ).rejects.toThrow("OpenCode returned no models. Run `opencode models` and verify provider auth.");
  });
});