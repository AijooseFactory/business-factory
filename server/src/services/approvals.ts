import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { approvalComments, agentApiKeys, approvals } from "@paperclipai/db";
import { badRequest, conflict, forbidden, notFound, unprocessable } from "../errors.js";
import { agentService } from "./agents.js";
import { notifyHireApproved } from "./hire-hook.js";

const APPROVAL_BOOTSTRAP_CLAIM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createClaimSecret() {
  return `pcp_claim_${randomBytes(24).toString("hex")}`;
}

function tokenHashesMatch(left: string, right: string) {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getOpenClawHireAgentId(payload: unknown): string | null {
  const record = asRecord(payload);
  if (!record) return null;
  if (record.adapterType !== "openclaw_gateway") return null;
  return typeof record.agentId === "string" ? record.agentId : null;
}

export function approvalService(db: Db) {
  const agentsSvc = agentService(db);
  const canResolveStatuses = new Set(["pending", "revision_requested"]);
  const resolvableStatuses = Array.from(canResolveStatuses);
  type ApprovalRecord = typeof approvals.$inferSelect;
  type ResolutionResult = { approval: ApprovalRecord; applied: boolean };

  async function getExistingApproval(id: string) {
    const existing = await db
      .select()
      .from(approvals)
      .where(eq(approvals.id, id))
      .then((rows) => rows[0] ?? null);
    if (!existing) throw notFound("Approval not found");
    return existing;
  }

  async function resolveApproval(
    id: string,
    targetStatus: "approved" | "rejected",
    decidedByUserId: string,
    decisionNote: string | null | undefined,
  ): Promise<ResolutionResult> {
    const existing = await getExistingApproval(id);
    if (!canResolveStatuses.has(existing.status)) {
      if (existing.status === targetStatus) {
        return { approval: existing, applied: false };
      }
      throw unprocessable(
        `Only pending or revision requested approvals can be ${targetStatus === "approved" ? "approved" : "rejected"}`,
      );
    }

    const now = new Date();
    const updated = await db
      .update(approvals)
      .set({
        status: targetStatus,
        decidedByUserId,
        decisionNote: decisionNote ?? null,
        decidedAt: now,
        updatedAt: now,
      })
      .where(and(eq(approvals.id, id), inArray(approvals.status, resolvableStatuses)))
      .returning()
      .then((rows) => rows[0] ?? null);

    if (updated) {
      return { approval: updated, applied: true };
    }

    const latest = await getExistingApproval(id);
    if (latest.status === targetStatus) {
      return { approval: latest, applied: false };
    }

    throw unprocessable(
      `Only pending or revision requested approvals can be ${targetStatus === "approved" ? "approved" : "rejected"}`,
    );
  }

  return {
    list: (companyId: string, status?: string) => {
      const conditions = [eq(approvals.companyId, companyId)];
      if (status) conditions.push(eq(approvals.status, status));
      return db.select().from(approvals).where(and(...conditions));
    },

    getById: (id: string) =>
      db
        .select()
        .from(approvals)
        .where(eq(approvals.id, id))
        .then((rows) => rows[0] ?? null),

    create: (companyId: string, data: Omit<typeof approvals.$inferInsert, "companyId">) =>
      db
        .insert(approvals)
        .values({ ...data, companyId })
        .returning()
        .then((rows) => rows[0]),

    approve: async (id: string, decidedByUserId: string, decisionNote?: string | null) => {
      const { approval: updated, applied } = await resolveApproval(
        id,
        "approved",
        decidedByUserId,
        decisionNote,
      );

      let hireApprovedAgentId: string | null = null;
      const now = new Date();
      if (applied && updated.type === "hire_agent") {
        const payload = updated.payload as Record<string, unknown>;
        const payloadAgentId = typeof payload.agentId === "string" ? payload.agentId : null;
        if (payloadAgentId) {
          await agentsSvc.activatePendingApproval(payloadAgentId);
          hireApprovedAgentId = payloadAgentId;
        } else {
          const created = await agentsSvc.create(updated.companyId, {
            name: String(payload.name ?? "New Agent"),
            role: String(payload.role ?? "general"),
            title: typeof payload.title === "string" ? payload.title : null,
            reportsTo: typeof payload.reportsTo === "string" ? payload.reportsTo : null,
            capabilities: typeof payload.capabilities === "string" ? payload.capabilities : null,
            adapterType: String(payload.adapterType ?? "process"),
            adapterConfig:
              typeof payload.adapterConfig === "object" && payload.adapterConfig !== null
                ? (payload.adapterConfig as Record<string, unknown>)
                : {},
            budgetMonthlyCents:
              typeof payload.budgetMonthlyCents === "number" ? payload.budgetMonthlyCents : 0,
            metadata:
              typeof payload.metadata === "object" && payload.metadata !== null
                ? (payload.metadata as Record<string, unknown>)
                : null,
            status: "idle",
            spentMonthlyCents: 0,
            permissions: undefined,
            lastHeartbeatAt: null,
          });
          hireApprovedAgentId = created?.id ?? null;
        }
        if (hireApprovedAgentId) {
          void notifyHireApproved(db, {
            companyId: updated.companyId,
            agentId: hireApprovedAgentId,
            source: "approval",
            sourceId: id,
            approvedAt: now,
          }).catch(() => {});
        }
      }

      return { approval: updated, applied };
    },

    issueOpenClawBootstrapClaim: async (id: string) => {
      const existing = await getExistingApproval(id);
      if (existing.type !== "hire_agent" || existing.status !== "approved") return null;
      const agentId = getOpenClawHireAgentId(existing.payload);
      if (!agentId) return null;

      const now = new Date();
      const claimSecret = createClaimSecret();
      const updated = await db
        .update(approvals)
        .set({
          claimSecretHash: hashToken(claimSecret),
          claimSecretExpiresAt: new Date(now.getTime() + APPROVAL_BOOTSTRAP_CLAIM_TTL_MS),
          claimSecretConsumedAt: null,
          updatedAt: now,
        })
        .where(and(eq(approvals.id, id), eq(approvals.status, "approved")))
        .returning()
        .then((rows) => rows[0] ?? null);

      if (!updated) {
        throw conflict("Approval bootstrap claim could not be issued");
      }

      return {
        approval: updated,
        claimSecret,
        claimApiKeyPath: `/api/approvals/${id}/claim-api-key`,
      };
    },

    claimApiKey: async (id: string, claimSecret: string) => {
      const approval = await getExistingApproval(id);
      if (approval.type !== "hire_agent") {
        throw badRequest("Only hire approvals can claim API keys");
      }
      if (approval.status !== "approved") {
        throw conflict("Approval must be approved before key claim");
      }

      const agentId = getOpenClawHireAgentId(approval.payload);
      if (!agentId) {
        throw badRequest("Only approved OpenClaw Gateway hire approvals can claim API keys");
      }
      if (!approval.claimSecretHash) {
        throw conflict("Approval is missing claim secret metadata");
      }

      const presentedClaimSecretHash = hashToken(claimSecret);
      if (!tokenHashesMatch(approval.claimSecretHash, presentedClaimSecretHash)) {
        throw forbidden("Invalid claim secret");
      }
      if (approval.claimSecretExpiresAt && approval.claimSecretExpiresAt.getTime() <= Date.now()) {
        throw conflict("Claim secret expired");
      }
      if (approval.claimSecretConsumedAt) {
        throw conflict("Claim secret already used");
      }

      const existingKey = await db
        .select({ id: agentApiKeys.id })
        .from(agentApiKeys)
        .where(eq(agentApiKeys.agentId, agentId))
        .then((rows) => rows[0] ?? null);
      if (existingKey) {
        throw conflict("API key already claimed");
      }

      const consumed = await db
        .update(approvals)
        .set({ claimSecretConsumedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(approvals.id, id), isNull(approvals.claimSecretConsumedAt)))
        .returning({ id: approvals.id })
        .then((rows) => rows[0] ?? null);
      if (!consumed) {
        throw conflict("Claim secret already used");
      }

      const created = await agentsSvc.createApiKey(agentId, "initial-approval-key");
      return {
        keyId: created.id,
        token: created.token,
        agentId,
        createdAt: created.createdAt,
      };
    },

    reject: async (id: string, decidedByUserId: string, decisionNote?: string | null) => {
      const { approval: updated, applied } = await resolveApproval(
        id,
        "rejected",
        decidedByUserId,
        decisionNote,
      );

      if (applied && updated.type === "hire_agent") {
        const payload = updated.payload as Record<string, unknown>;
        const payloadAgentId = typeof payload.agentId === "string" ? payload.agentId : null;
        if (payloadAgentId) {
          await agentsSvc.terminate(payloadAgentId);
        }
      }

      return { approval: updated, applied };
    },

    requestRevision: async (id: string, decidedByUserId: string, decisionNote?: string | null) => {
      const existing = await getExistingApproval(id);
      if (existing.status !== "pending") {
        throw unprocessable("Only pending approvals can request revision");
      }

      const now = new Date();
      return db
        .update(approvals)
        .set({
          status: "revision_requested",
          decidedByUserId,
          decisionNote: decisionNote ?? null,
          decidedAt: now,
          updatedAt: now,
        })
        .where(eq(approvals.id, id))
        .returning()
        .then((rows) => rows[0]);
    },

    resubmit: async (id: string, payload?: Record<string, unknown>) => {
      const existing = await getExistingApproval(id);
      if (existing.status !== "revision_requested") {
        throw unprocessable("Only revision requested approvals can be resubmitted");
      }

      const now = new Date();
      return db
        .update(approvals)
        .set({
          status: "pending",
          payload: payload ?? existing.payload,
          decisionNote: null,
          decidedByUserId: null,
          decidedAt: null,
          updatedAt: now,
        })
        .where(eq(approvals.id, id))
        .returning()
        .then((rows) => rows[0]);
    },

    listComments: async (approvalId: string) => {
      const existing = await getExistingApproval(approvalId);
      return db
        .select()
        .from(approvalComments)
        .where(
          and(
            eq(approvalComments.approvalId, approvalId),
            eq(approvalComments.companyId, existing.companyId),
          ),
        )
        .orderBy(asc(approvalComments.createdAt));
    },

    addComment: async (
      approvalId: string,
      body: string,
      actor: { agentId?: string; userId?: string },
    ) => {
      const existing = await getExistingApproval(approvalId);
      return db
        .insert(approvalComments)
        .values({
          companyId: existing.companyId,
          approvalId,
          authorAgentId: actor.agentId ?? null,
          authorUserId: actor.userId ?? null,
          body,
        })
        .returning()
        .then((rows) => rows[0]);
    },
  };
}
