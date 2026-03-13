import type { LiveRunForIssue } from "../api/heartbeats";

export function selectDashboardAgentRuns(runs: LiveRunForIssue[], maxAgents: number): LiveRunForIssue[] {
  if (maxAgents <= 0) return [];

  const selected: LiveRunForIssue[] = [];
  const seenAgentIds = new Set<string>();

  for (const run of runs) {
    if (seenAgentIds.has(run.agentId)) continue;
    seenAgentIds.add(run.agentId);
    selected.push(run);
    if (selected.length >= maxAgents) break;
  }

  return selected;
}
