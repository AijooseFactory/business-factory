import { beforeEach, describe, expect, it, vi } from "vitest";
import { REDACTED_EVENT_VALUE } from "../redaction.js";
import {
  syncPendingHireApprovalForAgent,
  type PendingHireApprovalAgentSnapshot,
} from "../services/pending-hire-approval.js";

type ApprovalRecord = {
  id: string;
  companyId: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
};

function createAgent(overrides: Partial<PendingHireApprovalAgentSnapshot> = {}): PendingHireApprovalAgentSnapshot {
  return {
    id: "agent-1",
    companyId: "company-1",
    status: "pending_approval",
    name: "Oliver Wendell",
    role: "pm",
    title: "Technical Program Manager",
    icon: null,
    reportsTo: "einstein-id",
    capabilities: "Turns PRDs into functional specs.",
    adapterType: "openclaw_gateway",
    adapterConfig: {
      url: "ws://host.docker.internal:3000",
      paperclipApiUrl: "http://host.docker.internal:3100",
      headers: {
        "x-openclaw-token": "gateway-token-1234567890",
      },
      waitTimeoutMs: 120000,
      sessionKeyStrategy: "issue",
      devicePrivateKeyPem: "private-key-value",
    },
    runtimeConfig: {
      heartbeat: {
        enabled: false,
        wakeOnDemand: true,
      },
    },
    budgetMonthlyCents: 0,
    metadata: {
      department: "pm",
    },
    ...overrides,
  };
}

function createApproval(payload: Record<string, unknown> = {}): ApprovalRecord {
  return {
    id: "approval-1",
    companyId: "company-1",
    type: "hire_agent",
    status: "pending",
    payload: {
      requestedByAgentId: null,
      agentId: "agent-1",
      title: "Chief of Staff",
      adapterConfig: {
        url: "ws://127.0.0.1:18789",
      },
      ...payload,
    },
  };
}

function createDbStub(selectResults: ApprovalRecord[][], updateResults: ApprovalRecord[]) {
  const pendingSelectResults = [...selectResults];
  const selectOrderBy = vi.fn(async () => pendingSelectResults.shift() ?? []);
  const selectWhere = vi.fn(() => ({ orderBy: selectOrderBy }));
  const from = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from }));

  const returning = vi.fn(async () => updateResults);
  const updateWhere = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set }));

  return {
    db: { select, update },
    set,
  };
}

describe("syncPendingHireApprovalForAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs pending hire approval payload from the current pending agent state", async () => {
    const agent = createAgent();
    const approval = createApproval();
    const dbStub = createDbStub([[approval]], [approval]);

    await syncPendingHireApprovalForAgent(dbStub.db as any, agent);

    expect(dbStub.set).toHaveBeenCalledTimes(1);
    const payload = dbStub.set.mock.calls[0][0].payload as Record<string, unknown>;
    expect(payload.name).toBe("Oliver Wendell");
    expect(payload.role).toBe("pm");
    expect(payload.title).toBe("Technical Program Manager");
    expect(payload.adapterType).toBe("openclaw_gateway");
    expect(payload.adapterConfig).toEqual({
      url: "ws://host.docker.internal:3000",
      paperclipApiUrl: "http://host.docker.internal:3100",
      headers: {
        "x-openclaw-token": REDACTED_EVENT_VALUE,
      },
      waitTimeoutMs: 120000,
      sessionKeyStrategy: "issue",
      devicePrivateKeyPem: REDACTED_EVENT_VALUE,
    });
    expect(payload.runtimeConfig).toEqual({
      heartbeat: {
        enabled: false,
        wakeOnDemand: true,
      },
    });
    expect(payload.requestedConfigurationSnapshot).toEqual({
      adapterType: "openclaw_gateway",
      adapterConfig: {
        url: "ws://host.docker.internal:3000",
        paperclipApiUrl: "http://host.docker.internal:3100",
        headers: {
          "x-openclaw-token": REDACTED_EVENT_VALUE,
        },
        waitTimeoutMs: 120000,
        sessionKeyStrategy: "issue",
        devicePrivateKeyPem: REDACTED_EVENT_VALUE,
      },
      runtimeConfig: {
        heartbeat: {
          enabled: false,
          wakeOnDemand: true,
        },
      },
    });
    expect(payload.requestedByAgentId).toBeNull();
  });

  it("skips updates when the agent is no longer pending approval", async () => {
    const agent = createAgent({ status: "idle" });
    const dbStub = createDbStub([], []);

    const result = await syncPendingHireApprovalForAgent(dbStub.db as any, agent);

    expect(result).toBeNull();
    expect(dbStub.set).not.toHaveBeenCalled();
  });
});
