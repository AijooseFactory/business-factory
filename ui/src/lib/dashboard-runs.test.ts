// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { LiveRunForIssue } from "../api/heartbeats";
import { selectDashboardAgentRuns } from "./dashboard-runs";

function makeRun(overrides: Partial<LiveRunForIssue>): LiveRunForIssue {
  return {
    id: overrides.id ?? "run-1",
    status: overrides.status ?? "succeeded",
    invocationSource: overrides.invocationSource ?? "on_demand",
    triggerDetail: overrides.triggerDetail ?? null,
    startedAt: overrides.startedAt ?? "2026-03-12T18:00:00.000Z",
    finishedAt: overrides.finishedAt ?? "2026-03-12T18:00:10.000Z",
    createdAt: overrides.createdAt ?? "2026-03-12T18:00:00.000Z",
    agentId: overrides.agentId ?? "agent-einstein",
    agentName: overrides.agentName ?? "Einstein",
    adapterType: overrides.adapterType ?? "agent-zero",
    issueId: overrides.issueId ?? null,
  };
}

describe("selectDashboardAgentRuns", () => {
  it("keeps only the latest run for each agent", () => {
    const runs = [
      makeRun({ id: "einstein-new", agentId: "einstein", createdAt: "2026-03-12T18:40:00.000Z" }),
      makeRun({ id: "einstein-old", agentId: "einstein", createdAt: "2026-03-12T17:40:00.000Z" }),
      makeRun({ id: "tesla-new", agentId: "tesla", agentName: "Tesla", createdAt: "2026-03-12T18:30:00.000Z" }),
    ];

    expect(selectDashboardAgentRuns(runs, 4).map((run) => run.id)).toEqual([
      "einstein-new",
      "tesla-new",
    ]);
  });

  it("caps the list to the requested number of unique agents", () => {
    const runs = [
      makeRun({ id: "einstein", agentId: "einstein", createdAt: "2026-03-12T18:40:00.000Z" }),
      makeRun({ id: "tesla", agentId: "tesla", agentName: "Tesla", createdAt: "2026-03-12T18:39:00.000Z" }),
      makeRun({ id: "curie", agentId: "curie", agentName: "Curie", createdAt: "2026-03-12T18:38:00.000Z" }),
    ];

    expect(selectDashboardAgentRuns(runs, 2).map((run) => run.id)).toEqual([
      "einstein",
      "tesla",
    ]);
  });
});
