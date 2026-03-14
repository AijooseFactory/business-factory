import type { AdapterExecutionContext, AdapterExecutionResult } from "@business-factory/adapter-utils";
import {
  asString,
  asNumber,
  deriveAgentZeroProjectName,
  nonEmpty,
  parseObject,
  parseBusinessFactoryResultFromResponse,
} from "./utils.js";

function getIssueContext(context: Record<string, unknown>) {
  return parseObject(context.issue);
}

function getProjectContext(context: Record<string, unknown>) {
  return parseObject(context.project);
}

function getWorkspaceContext(context: Record<string, unknown>) {
  return parseObject(context.businessFactoryWorkspace);
}

function buildPaperclipBridgeText(input: {
  hasProjectContext: boolean;
  hasIssueContext: boolean;
}) {
  if (!input.hasProjectContext) return null;

  const lines = [
    "Business Factory bridge:",
    "The active Agent Zero project exposes BUSINESS_FACTORY_API_URL, BUSINESS_FACTORY_API_KEY, BUSINESS_FACTORY_COMPANY_ID, BUSINESS_FACTORY_AGENT_ID, and BUSINESS_FACTORY_PROJECT_ID.",
    "During a live Business Factory-assigned run, BUSINESS_FACTORY_RUN_ID and the current BUSINESS_FACTORY_TASK_ID / BUSINESS_FACTORY_ISSUE_ID variables are also available.",
    "Treat the assigned Business Factory issue title and description above as the task to execute.",
    "Do not ask the user what task to execute or ask them to restate the issue unless the issue title and description are both missing or contradictory.",
    "Treat the current Business Factory issue text as authoritative even if prior memory, prior runs, or repo-local agent notes mention the same issue or a different agent roster.",
    "Do not claim the task is already complete unless you actually perform the work in this run or verify the completed changes directly from the current workspace and Business Factory state.",
    "If your current shell or tool runtime does not already expose those values directly, read them from the active project's .a0proj/variables.env and .a0proj/secrets.env files.",
    "Never invent or substitute a Business Factory API base URL. Read BUSINESS_FACTORY_API_URL from .a0proj/variables.env instead of assuming a public business-factory.technology endpoint.",
    "Use Authorization: Bearer $BUSINESS_FACTORY_API_KEY on Business Factory API requests.",
    "If BUSINESS_FACTORY_RUN_ID is set for the current assigned issue, include X-Business-Factory-Run-Id: $BUSINESS_FACTORY_RUN_ID on mutating issue calls for that run.",
    "To create a new Business Factory task: POST /api/companies/$BUSINESS_FACTORY_COMPANY_ID/issues.",
    "To create a new Business Factory project: POST /api/companies/$BUSINESS_FACTORY_COMPANY_ID/projects.",
  ];

  if (input.hasIssueContext) {
    lines.push(
      "When closing the assigned issue from chat, still end your response with BUSINESS_FACTORY_RESULT_JSON so Business Factory can reconcile the run summary.",
    );
  }

  return lines.join("\n");
}

function buildMessageText(input: {
  runId: string;
  context: Record<string, unknown>;
}): string {
  const issue = getIssueContext(input.context);
  const project = getProjectContext(input.context);
  const workspace = getWorkspaceContext(input.context);

  const issueIdentifier = nonEmpty(issue.identifier);
  const issueTitle = nonEmpty(issue.title);
  const issueDescription = nonEmpty(issue.description);
  const projectName = nonEmpty(project.name);
  const workspaceCwd = nonEmpty(workspace.cwd);
  const repoUrl = nonEmpty(workspace.repoUrl);
  const repoRef = nonEmpty(workspace.repoRef);

  const header =
    [issueIdentifier, issueTitle].filter((value): value is string => Boolean(value)).join(" - ") ||
    issueTitle ||
    issueIdentifier ||
    "Assigning task to agent";

  const contextLines = [
    projectName ? `- Project: ${projectName}` : null,
    workspaceCwd ? `- Workspace: ${workspaceCwd}` : null,
    repoUrl ? `- Repository: ${repoUrl}` : null,
    repoRef ? `- Repository ref: ${repoRef}` : null,
    `- Paperclip run: ${input.runId}`,
  ].filter((value): value is string => Boolean(value));

  const completionContract =
    issueIdentifier || issueTitle
      ? [
          "Paperclip completion contract:",
          "When you finish this assigned issue, end your response with the exact marker `PAPERCLIP_RESULT_JSON` followed by a fenced JSON block.",
          'Use a Paperclip issue status for `status`: backlog, todo, in_progress, in_review, blocked, done, or cancelled.',
          'Include at least one of `summary` or `comment`.',
          "Example:",
          "PAPERCLIP_RESULT_JSON",
          "```json",
          JSON.stringify(
            {
              status: "done",
              summary: "Short factual summary of what you completed.",
              comment: "Markdown note explaining the completed work or any follow-up.",
            },
            null,
            2,
          ),
          "```",
        ].join("\n")
      : null;

  const bridgeText = buildPaperclipBridgeText({
    hasProjectContext: Boolean(projectName || workspaceCwd || repoUrl),
    hasIssueContext: Boolean(issueIdentifier || issueTitle),
  });

  return [
    header,
    issueDescription,
    contextLines.length > 0 ? ["Paperclip context:", ...contextLines].join("\n") : null,
    bridgeText,
    completionContract,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { config, runId, agent, context, runtime } = ctx;
  const baseUrl = asString(config.url, "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("Agent Zero adapter requires a URL");

  const url = `${baseUrl}/api_message`;
  const method = "POST";
  const configuredTimeoutMs = asNumber(config.timeoutMs, 0);
  const timeoutSec = asNumber(config.timeoutSec, 0);
  const timeoutMs = configuredTimeoutMs > 0 ? configuredTimeoutMs : timeoutSec > 0 ? timeoutSec * 1000 : 0;
  const apiKey = asString(config.apiKey, "");
  const payloadTemplate = parseObject(config.payloadTemplate);
  const existingContextId = nonEmpty(runtime.sessionParams?.sessionId) ?? nonEmpty(runtime.sessionId);
  const configuredProjectName = nonEmpty(payloadTemplate.project_name) ?? nonEmpty(payloadTemplate.project);
  const project = getProjectContext(context);
  const workspace = getWorkspaceContext(context);
  const workspaceSource = nonEmpty(workspace.source);
  const derivedProjectName = deriveAgentZeroProjectName({
    workspaceCwd: workspace.cwd,
    repoUrl: workspace.repoUrl,
    projectName: project.name,
  });
  const hasResolvableProjectContext = Boolean(nonEmpty(project.id) || nonEmpty(project.name) || nonEmpty(workspace.repoUrl));
  const resolvedProjectName =
    configuredProjectName ?? (workspaceSource === "agent_home" && !hasResolvableProjectContext ? null : derivedProjectName);
  const configuredAgentProfile = nonEmpty(payloadTemplate.agent_profile);
  const agentProfile = configuredAgentProfile ?? agent.name;
  const messageText = buildMessageText({ runId, context });

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (apiKey) {
    headers["X-API-KEY"] = apiKey;
  }

  const body: Record<string, unknown> = {
    ...payloadTemplate,
    message: messageText,
    agent_profile: agentProfile,
  };
  if (existingContextId) {
    body.context_id = existingContextId;
  } else if (resolvedProjectName) {
    body.project_name = resolvedProjectName;
  }

  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
      ...(timer ? { signal: controller.signal } : {}),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Agent API failed with status ${res.status}: ${errorText}`);
    }

    const result = await res.json();
    const responseText = typeof result.response === "string" ? result.response : "Check logs";
    const nextContextId = nonEmpty(result.context_id);
    const businessFactoryResult = parseBusinessFactoryResultFromResponse(responseText);
    const resultJson =
      businessFactoryResult
        ? {
            ...result,
            businessFactoryResult,
          }
        : result;

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: `Agent request to ${url} succeeded. Response: ${responseText.substring(0, 100)}`,
      resultJson,
      sessionId: nextContextId,
      sessionParams: nextContextId ? { sessionId: nextContextId } : null,
      sessionDisplayId: nextContextId,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
