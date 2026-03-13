import { approvals, type Db } from "@paperclipai/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { redactEventPayload } from "../redaction.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export interface PendingHireApprovalAgentSnapshot {
  id: string;
  companyId: string;
  status: string;
  name: string;
  role: string;
  title: string | null;
  icon: string | null;
  reportsTo: string | null;
  capabilities: string | null;
  adapterType: string;
  adapterConfig: Record<string, unknown> | null | undefined;
  runtimeConfig: Record<string, unknown> | null | undefined;
  budgetMonthlyCents: number;
  metadata: Record<string, unknown> | null | undefined;
}

export async function syncPendingHireApprovalForAgent(
  db: Db,
  agent: PendingHireApprovalAgentSnapshot,
) {
  if (agent.status !== "pending_approval") return null;

  const existing = await db
    .select()
    .from(approvals)
    .where(
      and(
        eq(approvals.companyId, agent.companyId),
        eq(approvals.type, "hire_agent"),
        inArray(approvals.status, ["pending", "revision_requested"]),
        sql`${approvals.payload} ->> 'agentId' = ${agent.id}`,
      ),
    )
    .orderBy(desc(approvals.createdAt))
    .then((rows) => rows[0] ?? null);

  if (!existing) return null;

  const redactedAdapterConfig = redactEventPayload(asRecord(agent.adapterConfig)) ?? {};
  const redactedRuntimeConfig = redactEventPayload(asRecord(agent.runtimeConfig)) ?? {};
  const redactedMetadata = redactEventPayload(asRecord(agent.metadata)) ?? {};
  const existingPayload = asRecord(existing.payload) ?? {};

  const nextPayload = {
    ...existingPayload,
    name: agent.name,
    role: agent.role,
    title: agent.title ?? null,
    icon: agent.icon ?? null,
    reportsTo: agent.reportsTo ?? null,
    capabilities: agent.capabilities ?? null,
    adapterType: agent.adapterType,
    adapterConfig: redactedAdapterConfig,
    runtimeConfig: redactedRuntimeConfig,
    budgetMonthlyCents: agent.budgetMonthlyCents,
    metadata: redactedMetadata,
    agentId: agent.id,
    requestedConfigurationSnapshot: {
      adapterType: agent.adapterType,
      adapterConfig: redactedAdapterConfig,
      runtimeConfig: redactedRuntimeConfig,
    },
  };

  return db
    .update(approvals)
    .set({
      payload: nextPayload,
      updatedAt: new Date(),
    })
    .where(eq(approvals.id, existing.id))
    .returning()
    .then((rows) => rows[0] ?? null);
}
