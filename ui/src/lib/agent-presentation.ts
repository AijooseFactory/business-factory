import { AGENT_ROLE_LABELS, type Agent, type HeartbeatRun } from "@business-factory/shared";

const customRoleLabels: Record<string, string> = {
  chief_of_staff: "Chief of Staff",
};

const adapterLabels: Record<string, string> = {
  claude_local: "Claude",
  codex_local: "Codex",
  gemini_local: "Gemini",
  opencode_local: "OpenCode",
  cursor: "Cursor",
  openclaw_gateway: "OpenClaw Gateway",
  agent_zero: "Agent Zero",
  process: "Process",
  http: "HTTP",
};

const pinnedStatuses = new Set(["paused", "pending_approval", "terminated"]);
const failingRunStatuses = new Set(["failed", "timed_out", "cancelled"]);

export function getAgentRoleLabel(role: string): string {
  return customRoleLabels[role] ?? (AGENT_ROLE_LABELS as Record<string, string>)[role] ?? role;
}

export function getAgentAdapterLabel(adapterType: string): string {
  return adapterLabels[adapterType] ?? adapterType;
}

export function getAgentSubtitle(agent: Pick<Agent, "adapterType" | "role" | "title">): string {
  const title = agent.title?.trim() ?? "";
  if (agent.adapterType === "agent_zero") {
    return title ? `${getAgentAdapterLabel(agent.adapterType)} - ${title}` : getAgentAdapterLabel(agent.adapterType);
  }

  const roleLabel = getAgentRoleLabel(agent.role);
  return title ? `${roleLabel} - ${title}` : roleLabel;
}

export function getAgentInlineLabel(
  agent: Pick<Agent, "name" | "adapterType" | "role" | "title">,
): string {
  const name = agent.name.trim();
  const subtitle = getAgentSubtitle(agent).trim();
  if (!subtitle) return name;
  if (name.toLowerCase() === subtitle.toLowerCase()) return name;
  return `${name} - ${subtitle}`;
}

export function getAgentDisplayStatus(agentStatus: string, latestRunStatus?: string | null): string {
  if (pinnedStatuses.has(agentStatus)) return agentStatus;
  if (!latestRunStatus) return agentStatus;
  if (latestRunStatus === "running" || latestRunStatus === "queued") return "running";
  if (latestRunStatus === "succeeded") return "active";
  if (failingRunStatuses.has(latestRunStatus)) return "error";
  return agentStatus;
}

export function buildLatestRunStatusByAgent(
  runs: Array<Pick<HeartbeatRun, "agentId" | "status" | "createdAt">>,
): Map<string, string> {
  const latestByAgent = new Map<string, { status: string; createdAtMs: number }>();

  for (const run of runs) {
    const createdAtMs = new Date(run.createdAt).getTime();
    const existing = latestByAgent.get(run.agentId);
    if (!existing || createdAtMs > existing.createdAtMs) {
      latestByAgent.set(run.agentId, { status: run.status, createdAtMs });
    }
  }

  return new Map(
    Array.from(latestByAgent.entries()).map(([agentId, value]) => [agentId, value.status]),
  );
}
