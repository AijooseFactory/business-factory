// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { Agent, HeartbeatRun } from "@business-factory/shared";
import {
  buildLatestRunStatusByAgent,
  getAgentInlineLabel,
  getAgentDisplayStatus,
  getAgentRoleLabel,
  getAgentSubtitle,
} from "./agent-presentation";

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "agent-1",
    companyId: "company-1",
    name: "Einstein",
    urlKey: "einstein",
    role: "chief_of_staff" as Agent["role"],
    title: "Chief of Staff",
    icon: null,
    status: "idle",
    reportsTo: null,
    capabilities: null,
    adapterType: "agent_zero",
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    permissions: { canCreateAgents: false },
    lastHeartbeatAt: null,
    metadata: null,
    createdAt: new Date("2026-03-12T00:00:00.000Z"),
    updatedAt: new Date("2026-03-12T00:00:00.000Z"),
    ...overrides,
  };
}

function makeRun(overrides: Partial<HeartbeatRun> = {}): HeartbeatRun {
  return {
    id: "run-1",
    companyId: "company-1",
    agentId: "agent-1",
    invocationSource: "on_demand",
    triggerDetail: "manual",
    status: "succeeded",
    startedAt: new Date("2026-03-12T00:00:00.000Z"),
    finishedAt: new Date("2026-03-12T00:00:10.000Z"),
    error: null,
    wakeupRequestId: null,
    exitCode: 0,
    signal: null,
    usageJson: null,
    resultJson: null,
    sessionIdBefore: null,
    sessionIdAfter: null,
    logStore: null,
    logRef: null,
    logBytes: null,
    logSha256: null,
    logCompressed: false,
    stdoutExcerpt: null,
    stderrExcerpt: null,
    errorCode: null,
    externalRunId: null,
    contextSnapshot: null,
    createdAt: new Date("2026-03-12T00:00:10.000Z"),
    updatedAt: new Date("2026-03-12T00:00:10.000Z"),
    ...overrides,
  };
}

describe("agent presentation helpers", () => {
  it("formats chief_of_staff roles with a human label", () => {
    expect(getAgentRoleLabel("chief_of_staff")).toBe("Chief of Staff");
  });

  it("shows Agent Zero before the title for Agent Zero agents", () => {
    expect(getAgentSubtitle(makeAgent())).toBe("Agent Zero - Chief of Staff");
  });

  it("formats an inline Einstein label for Agent Zero surfaces", () => {
    expect(getAgentInlineLabel(makeAgent())).toBe("Einstein - Agent Zero - Chief of Staff");
  });

  it("treats a latest successful run as healthy for display", () => {
    expect(getAgentDisplayStatus("error", "succeeded")).toBe("active");
    expect(getAgentDisplayStatus("idle", "succeeded")).toBe("active");
    expect(getAgentDisplayStatus("idle", "running")).toBe("running");
    expect(getAgentDisplayStatus("active", "failed")).toBe("error");
    expect(getAgentDisplayStatus("paused", "succeeded")).toBe("paused");
  });

  it("uses the most recent run per agent", () => {
    const latestStatuses = buildLatestRunStatusByAgent([
      makeRun({
        id: "run-old",
        status: "failed",
        createdAt: new Date("2026-03-12T00:00:00.000Z"),
      }),
      makeRun({
        id: "run-new",
        status: "succeeded",
        createdAt: new Date("2026-03-12T00:05:00.000Z"),
      }),
      makeRun({
        id: "run-other",
        agentId: "agent-2",
        status: "running",
        createdAt: new Date("2026-03-12T00:06:00.000Z"),
      }),
    ]);

    expect(latestStatuses.get("agent-1")).toBe("succeeded");
    expect(latestStatuses.get("agent-2")).toBe("running");
  });
});
