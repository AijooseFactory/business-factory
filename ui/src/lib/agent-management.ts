import type { Agent } from "@business-factory/shared";

export function getAgentManagerForCreation(agents: Agent[]): Agent | null {
  return (
    agents.find((agent) => agent.role === "ceo")
    ?? agents.find((agent) => agent.role === "chief_of_staff")
    ?? agents.find((agent) => agent.permissions?.canCreateAgents)
    ?? null
  );
}
