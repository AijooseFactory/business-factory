declare namespace Express {
  interface Actor {
    type: "board" | "agent" | "none";
    userId?: string;
    isInstanceAdmin?: boolean;
    companyIds?: string[];
    agentId?: string;
    companyId?: string;
    keyId?: string;
    runId?: string;
    source: "local_implicit" | "session" | "agent_jwt" | "agent_key" | "none";
  }

  interface Request {
    actor: Actor;
  }
}
