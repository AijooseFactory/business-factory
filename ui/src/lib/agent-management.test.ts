// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { Agent } from "@business-factory/shared";
import { getAgentManagerForCreation } from "./agent-management";

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: overrides.id ?? "agent-1",
    companyId: overrides.companyId ?? "company-1",
    name: overrides.name ?? "Agent",
    urlKey: overrides.urlKey ?? "agent",
    role: overrides.role ?? "general",
    title: overrides.title ?? null,
    icon: overrides.icon ?? null,
    status: overrides.status ?? "active",
    reportsTo: overrides.reportsTo ?? null,
    capabilities: overrides.capabilities ?? null,
    adapterType: overrides.adapterType ?? "agent_zero",
    adapterConfig: overrides.adapterConfig ?? {},
    runtimeConfig: overrides.runtimeConfig ?? {},
    budgetMonthlyCents: overrides.budgetMonthlyCents ?? 0,
    spentMonthlyCents: overrides.spentMonthlyCents ?? 0,
    permissions: overrides.permissions ?? { canCreateAgents: false },
    lastHeartbeatAt: overrides.lastHeartbeatAt ?? null,
    metadata: overrides.metadata ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-03-12T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-03-12T00:00:00.000Z"),
  };
}

describe("getAgentManagerForCreation", () => {
  it("prefers the CEO when present", () => {
    const result = getAgentManagerForCreation([
      makeAgent({ id: "einstein", name: "Einstein", role: "chief_of_staff", permissions: { canCreateAgents: true } }),
      makeAgent({ id: "ceo", name: "Ada", role: "ceo", permissions: { canCreateAgents: true } }),
    ]);

    expect(result?.id).toBe("ceo");
  });

  it("uses a chief of staff when there is no CEO", () => {
    const result = getAgentManagerForCreation([
      makeAgent({ id: "einstein", name: "Einstein", role: "chief_of_staff", permissions: { canCreateAgents: true } }),
    ]);

    expect(result?.id).toBe("einstein");
  });

  it("falls back to any agent that can create agents", () => {
    const result = getAgentManagerForCreation([
      makeAgent({ id: "builder", name: "Builder", permissions: { canCreateAgents: true } }),
    ]);

    expect(result?.id).toBe("builder");
  });

  it("returns null when no manager-capable agent exists", () => {
    expect(getAgentManagerForCreation([makeAgent()])).toBeNull();
  });
});
