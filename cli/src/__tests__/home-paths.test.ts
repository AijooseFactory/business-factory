import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  describeLocalInstancePaths,
  expandHomePrefix,
  resolveBusinessFactoryHomeDir,
  resolveBusinessFactoryInstanceId,
} from "../config/home.js";

const ORIGINAL_ENV = { ...process.env };

describe("home path resolution", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("defaults to ~/.business-factory and default instance", () => {
    delete process.env.BUSINESS_FACTORY_HOME;
    delete process.env.BUSINESS_FACTORY_INSTANCE_ID;
    delete process.env.PAPERCLIP_HOME;
    delete process.env.PAPERCLIP_INSTANCE_ID;

    const paths = describeLocalInstancePaths();
    expect(paths.homeDir).toBe(path.resolve(os.homedir(), ".business-factory"));
    expect(paths.instanceId).toBe("default");
    expect(paths.configPath).toBe(path.resolve(os.homedir(), ".business-factory", "instances", "default", "config.json"));
  });

  it("supports BUSINESS_FACTORY_HOME and explicit instance ids", () => {
    process.env.BUSINESS_FACTORY_HOME = "~/business-factory-home";

    const home = resolveBusinessFactoryHomeDir();
    expect(home).toBe(path.resolve(os.homedir(), "business-factory-home"));
    expect(resolveBusinessFactoryInstanceId("dev_1")).toBe("dev_1");
  });

  it("falls back to PAPERCLIP_HOME when BUSINESS_FACTORY_HOME is not set", () => {
    delete process.env.BUSINESS_FACTORY_HOME;
    process.env.PAPERCLIP_HOME = "/tmp/paperclip-home";

    const home = resolveBusinessFactoryHomeDir();
    expect(home).toBe("/tmp/paperclip-home");
  });

  it("rejects invalid instance ids", () => {
    expect(() => resolveBusinessFactoryInstanceId("bad/id")).toThrow(/Invalid instance id/);
  });

  it("expands ~ prefixes", () => {
    expect(expandHomePrefix("~")).toBe(os.homedir());
    expect(expandHomePrefix("~/x/y")).toBe(path.resolve(os.homedir(), "x/y"));
  });
});