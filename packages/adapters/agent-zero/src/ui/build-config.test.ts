import { describe, expect, it } from "vitest";
import type { CreateConfigValues } from "@business-factory/adapter-utils";
import { buildAgentZeroConfig } from "./build-config.js";

describe("buildAgentZeroConfig", () => {
  it("preserves the API key entered in create mode", () => {
    const result = buildAgentZeroConfig({
      url: "http://ajf-einstein/",
      apiKey: "token-123",
    } as CreateConfigValues);

    expect(result).toEqual({
      url: "http://ajf-einstein/",
      apiKey: "token-123",
    });
  });
});
