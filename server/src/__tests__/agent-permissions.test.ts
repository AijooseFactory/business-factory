import { describe, expect, it } from "vitest";
import { defaultPermissionsForRole, normalizeAgentPermissions } from "../services/agent-permissions.js";

describe("agent permissions", () => {
  it("grants chief_of_staff the default ability to create agents", () => {
    expect(defaultPermissionsForRole("chief_of_staff")).toEqual({
      canCreateAgents: true,
    });
  });

  it("keeps chief_of_staff agent creation enabled when permissions are omitted", () => {
    expect(normalizeAgentPermissions(undefined, "chief_of_staff")).toEqual({
      canCreateAgents: true,
    });
  });
});
