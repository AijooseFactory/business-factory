import { describe, expect, it } from "vitest";
import { ONBOARDING_AGENT_PERSONA_BILLING_CODE } from "@business-factory/shared";
import { isOnboardingBootstrapIssueForAgent } from "../services/onboarding-bootstrap.ts";

function makeIssue(
  overrides: Partial<{
    title: string;
    description: string | null;
    status: string;
    billingCode: string | null;
  }> = {},
) {
  return {
    title: "Create your Chief of Staff HEARTBEAT.md",
    description:
      "Setup yourself as the Chief of Staff. Ensure you have a folder agents/chief_of_staff and then download this AGENTS.md as well as the sibling HEARTBEAT.md, SOUL.md, and TOOLS.md.",
    status: "todo",
    billingCode: null,
    ...overrides,
  };
}

describe("isOnboardingBootstrapIssueForAgent", () => {
  it("matches explicitly marked onboarding bootstrap issues", () => {
    expect(
      isOnboardingBootstrapIssueForAgent(
        makeIssue({
          title: "Any title",
          description: null,
          billingCode: ONBOARDING_AGENT_PERSONA_BILLING_CODE,
        }),
        { role: "chief_of_staff" },
      ),
    ).toBe(true);
  });

  it("matches legacy chief_of_staff onboarding heartbeat issues", () => {
    expect(
      isOnboardingBootstrapIssueForAgent(makeIssue(), {
        role: "chief_of_staff",
      }),
    ).toBe(true);
  });

  it("matches legacy chief_of_staff onboarding issues with hyphenated paths", () => {
    expect(
      isOnboardingBootstrapIssueForAgent(
        makeIssue({
          description:
            "Review the organization structure and prepare to support the Human CEO. Ensure you have a folder agents/chief-of-staff and then download the AGENTS.md, HEARTBEAT.md, SOUL.md, and TOOLS.md templates for your persona.",
        }),
        { role: "chief_of_staff" },
      ),
    ).toBe(true);
  });

  it("does not match already completed issues", () => {
    expect(
      isOnboardingBootstrapIssueForAgent(
        makeIssue({
          status: "done",
          billingCode: ONBOARDING_AGENT_PERSONA_BILLING_CODE,
        }),
        { role: "chief_of_staff" },
      ),
    ).toBe(false);
  });

  it("does not match unrelated issues for chief_of_staff", () => {
    expect(
      isOnboardingBootstrapIssueForAgent(
        makeIssue({
          title: "Investigate Neo4j schema",
          description: "Look into project namespace separation in the graph database.",
        }),
        { role: "chief_of_staff" },
      ),
    ).toBe(false);
  });
});
