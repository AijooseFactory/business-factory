import { Router } from "express";
import type { Db } from "@business-factory/db";
import { agents, issues } from "@business-factory/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../middleware/logger.js";
import { issueService } from "../services/index.js";

/**
 * Agent Zero Webhook Routes
 *
 * These endpoints allow Agent Zero instances to push updates back to Business Factory.
 * This enables 2-way communication without requiring shared filesystem or polling.
 *
 * POST /api/agent-zero/:agentId/webhook - Receive status updates from Agent Zero
 */

export interface AgentZeroWebhookPayload {
  agentId: string;
  runId?: string;
  type: "task_complete" | "status_update" | "approval_request" | "heartbeat";
  data: {
    result?: {
      status: string;
      summary?: string | null;
      comment?: string | null;
    };
    status?: "running" | "paused" | "complete" | "error";
    message?: string;
    approvalRequest?: {
      question: string;
      choices?: string[];
    };
  };
}

export function agentZeroWebhookRoutes(db: Db) {
  const router = Router();
  const issuesSvc = issueService(db);

  /**
   * POST /api/agent-zero/:agentId/webhook
   *
   * Receive updates from Agent Zero instances.
   *
   * Request body: AgentZeroWebhookPayload
   *
   * This endpoint is called by Agent Zero to:
   * - Report task completion with result
   * - Update run status (running/paused/error)
   * - Request human approval for decisions
   * - Send heartbeat/status updates
   */
  router.post("/:agentId/webhook", async (req, res) => {
    const agentId = req.params.agentId;
    const payload = req.body as AgentZeroWebhookPayload;

    // Validate agent ID matches
    if (payload.agentId !== agentId) {
      res.status(400).json({
        error: "Agent ID mismatch",
        message: "Payload agentId must match URL parameter",
      });
      return;
    }

    // Validate payload type
    if (!payload.type || !["task_complete", "status_update", "approval_request", "heartbeat"].includes(payload.type)) {
      res.status(400).json({
        error: "Invalid payload type",
        message: "type must be one of: task_complete, status_update, approval_request, heartbeat",
      });
      return;
    }

    // Verify agent exists
    const agent = await db
      .select({ id: agents.id, companyId: agents.companyId, status: agents.status })
      .from(agents)
      .where(eq(agents.id, agentId))
      .then((rows) => rows[0] ?? null);

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    logger.info(
      {
        agentId,
        type: payload.type,
        runId: payload.runId,
      },
      "Agent Zero webhook received",
    );

    try {
      switch (payload.type) {
        case "task_complete": {
          // Handle task completion - update issue status if result provided
          if (payload.data.result) {
            const { status, summary, comment } = payload.data.result;

            // Find the current issue being executed by this agent
            const runId = payload.runId;
            const runningIssue = runId
              ? await db
                  .select({ id: issues.id, companyId: issues.companyId })
                  .from(issues)
                  .where(
                    and(
                      eq(issues.companyId, agent.companyId),
                      eq(issues.executionRunId, runId),
                    ),
                  )
                  .then((rows) => rows[0] ?? null)
              : null;

            if (runningIssue) {
              await issuesSvc.update(runningIssue.id, {
                status,
              });

              if (comment) {
                await issuesSvc.addComment(runningIssue.id, comment, { agentId });
              }

              logger.info(
                {
                  agentId,
                  issueId: runningIssue.id,
                  status,
                },
                "Agent Zero webhook updated issue",
              );
            }
          }
          break;
        }

        case "status_update": {
          // Handle status update - could update agent status or run status
          logger.info(
            {
              agentId,
              status: payload.data.status,
              message: payload.data.message,
            },
            "Agent Zero status update",
          );
          break;
        }

        case "approval_request": {
          // Handle approval request - create a pending approval in Business Factory
          if (payload.data.approvalRequest) {
            logger.info(
              {
                agentId,
                question: payload.data.approvalRequest.question,
                choices: payload.data.approvalRequest.choices,
              },
              "Agent Zero approval request received",
            );
            // TODO: Create pending approval in Business Factory
            // This would integrate with the existing approval system
          }
          break;
        }

        case "heartbeat": {
          // Handle heartbeat - just acknowledge receipt
          logger.debug({ agentId }, "Agent Zero heartbeat");
          break;
        }
      }

      res.json({ received: true, agentId, type: payload.type });
    } catch (err) {
      logger.error(
        {
          err,
          agentId,
          type: payload.type,
        },
        "Agent Zero webhook processing error",
      );
      res.status(500).json({
        error: "Webhook processing failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  return router;
}