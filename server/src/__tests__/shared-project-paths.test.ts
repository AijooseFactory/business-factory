import { afterEach, describe, expect, it } from "vitest";
import path from "node:path";
import { normalizeSharedProjectPath } from "../services/shared-project-paths.ts";

const ORIGINAL_AGENT_ZERO_PROJECTS_ROOT = process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT;
const ORIGINAL_SHARED_PROJECT_PATH_ALIASES = process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES;

afterEach(() => {
  if (ORIGINAL_AGENT_ZERO_PROJECTS_ROOT === undefined) {
    delete process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT;
  } else {
    process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT = ORIGINAL_AGENT_ZERO_PROJECTS_ROOT;
  }

  if (ORIGINAL_SHARED_PROJECT_PATH_ALIASES === undefined) {
    delete process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES;
  } else {
    process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES = ORIGINAL_SHARED_PROJECT_PATH_ALIASES;
  }
});

describe("normalizeSharedProjectPath", () => {
  it("maps configured legacy roots onto the shared projects root", () => {
    process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT = "/host_usr_projects";
    process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES =
      "/Users/george/Mac/data/usr/projects,/home/node/Mac/data/usr/projects";

    const normalized = normalizeSharedProjectPath(
      "/home/node/Mac/data/usr/projects/ai_joose_factory/.a0proj/_projects/internal/graphrag-agent-zero",
    );

    expect(normalized).toBe(
      path.join("/host_usr_projects", "ai_joose_factory/.a0proj/_projects/internal/graphrag-agent-zero"),
    );
  });

  it("preserves unrelated paths when they do not match a configured alias", () => {
    process.env.PAPERCLIP_AGENT_ZERO_PROJECTS_ROOT = "/host_usr_projects";
    process.env.PAPERCLIP_SHARED_PROJECT_PATH_ALIASES =
      "/Users/george/Mac/data/usr/projects,/home/node/Mac/data/usr/projects";

    const normalized = normalizeSharedProjectPath("/tmp/graphrag-agent-zero");

    expect(normalized).toBe("/tmp/graphrag-agent-zero");
  });
});
