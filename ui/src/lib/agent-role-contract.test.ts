// @vitest-environment node

import { describe, expect, it } from "vitest";
import { AGENT_ROLE_LABELS, AGENT_ROLES } from "@business-factory/shared";

describe("agent role contract", () => {
  it("includes chief_of_staff in the shared role model", () => {
    expect(AGENT_ROLES).toContain("chief_of_staff");
    expect((AGENT_ROLE_LABELS as Record<string, string>).chief_of_staff).toBe("Chief of Staff");
  });
});
