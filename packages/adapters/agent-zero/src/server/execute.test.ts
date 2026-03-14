import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdapterExecutionContext } from "@business-factory/adapter-utils";
import { execute } from "./execute.js";

function buildContext(
  config: Record<string, unknown>,
  overrides?: Partial<AdapterExecutionContext>,
): AdapterExecutionContext {
  return {
    runId: "run-123",
    agent: {
      id: "agent-123",
      companyId: "company-123",
      name: "einstein",
      adapterType: "agent_zero",
      adapterConfig: {},
    },
    runtime: {
      sessionId: null,
      sessionParams: null,
      sessionDisplayId: null,
      taskKey: "issue:AIJ-4",
    },
    config,
    context: {
      issue: {
        identifier: "AIJ-4",
        title: "Create a new agent",
        description: "Add memory_save_before and memory_save_after hooks.",
      },
      project: {
        id: "project-123",
        name: "Hybrid GraphRAG for Agent Zero",
      },
      businessFactoryWorkspace: {
        cwd: "/Users/george/Mac/data/usr/projects/ai_joose_factory/.a0proj/_projects/internal/graphrag-agent-zero",
        repoUrl: "https://github.com/AijooseFactory/graphrag-agent-zero",
        repoRef: "main",
      },
    },
    onLog: async () => {},
    ...overrides,
  };
}

function createMockAgentZeroServer(responseBody: Record<string, unknown> = { context_id: "ctx-123", response: "done" }) {
  const requests: Array<{ headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers ?? {});
    requests.push({
      headers: Object.fromEntries(headers.entries()),
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  vi.stubGlobal("fetch", fetchMock);
  return {
    url: "http://agent-zero.test",
    getRequests: () => requests,
    close: async () => {
      vi.unstubAllGlobals();
    },
  };
}

describe("agent zero execute", () => {
  const servers: Array<{ close: () => Promise<void> }> = [];

  afterEach(async () => {
    vi.useRealTimers();
    while (servers.length > 0) {
      await servers.pop()!.close();
    }
  });

  it("preserves Business Factory project context in the message and persists the returned context id", async () => {
    const server = await createMockAgentZeroServer();
    servers.push(server);
    const result = await execute(
      buildContext({
        url: server.url,
        apiKey: "token-123",
      }),
    );

    const request = server.getRequests()[0];
    expect(request.headers["x-api-key"]).toBe("token-123");
    expect(request.body.context_id).toBeUndefined();
    expect(request.body.project_name).toBe("graphrag-agent-zero");
    expect(request.body.agent_profile).toBe("einstein");
    expect(String(request.body.message)).toContain("AIJ-4 - Create a new agent");
    expect(String(request.body.message)).toContain("memory_save_before");
    expect(String(request.body.message)).toContain("Project: Hybrid GraphRAG for Agent Zero");
    expect(String(request.body.message)).toContain("Workspace: /Users/george/Mac/data/usr/projects/ai_joose_factory/.a0proj/_projects/internal/graphrag-agent-zero");
    expect(String(request.body.message)).toContain("Repository: https://github.com/AijooseFactory/graphrag-agent-zero");
    expect(String(request.body.message)).toContain("BUSINESS_FACTORY_API_KEY");
    expect(String(request.body.message)).toContain("Treat the assigned Business Factory issue title and description above as the task to execute.");
    expect(String(request.body.message)).toContain("Do not ask the user what task to execute");
    expect(String(request.body.message)).toContain("Treat the current Business Factory issue text as authoritative even if prior memory");
    expect(String(request.body.message)).toContain("Do not claim the task is already complete unless you actually perform");
    expect(String(request.body.message)).toContain("Never invent or substitute a Business Factory API base URL");
    expect(String(request.body.message)).toContain(".a0proj/variables.env");
    expect(String(request.body.message)).toContain("POST /api/companies/$BUSINESS_FACTORY_COMPANY_ID/issues");
    expect(String(request.body.message)).toContain("POST /api/companies/$BUSINESS_FACTORY_COMPANY_ID/projects");
    expect(String(request.body.message)).toContain(".a0proj/secrets.env");

    expect(result.sessionId).toBe("ctx-123");
    expect(result.sessionParams).toEqual({ sessionId: "ctx-123" });
    expect(result.sessionDisplayId).toBe("ctx-123");
  });

  it("reuses an existing agent zero context without trying to re-activate the project", async () => {
    const server = await createMockAgentZeroServer();
    servers.push(server);
    await execute(
      buildContext(
        { url: server.url, apiKey: "token-123" },
        {
          runtime: {
            sessionId: "ctx-existing",
            sessionParams: { sessionId: "ctx-existing" },
            sessionDisplayId: "ctx-existing",
            taskKey: "issue:AIJ-4",
          },
        },
      ),
    );

    const request = server.getRequests()[0];
    expect(request.body.context_id).toBe("ctx-existing");
    expect(request.body.project_name).toBeUndefined();
  });

  it("supports explicit project activation when the operator configures one", async () => {
    const server = await createMockAgentZeroServer();
    servers.push(server);
    await execute(
      buildContext({
        url: server.url,
        apiKey: "token-123",
        payloadTemplate: {
          project_name: "hybrid-graphrag",
        },
      }),
    );

    const request = server.getRequests()[0];
    expect(request.body.project_name).toBe("hybrid-graphrag");
  });

  it("derives the agent zero project name from the workspace when none is configured", async () => {
    const server = await createMockAgentZeroServer();
    servers.push(server);
    await execute(
      buildContext({
        url: server.url,
        apiKey: "token-123",
      }),
    );

    const request = server.getRequests()[0];
    expect(request.body.project_name).toBe("graphrag-agent-zero");
  });

  it("does not derive a project activation name from fallback agent-home workspaces without project context", async () => {
    const server = await createMockAgentZeroServer();
    servers.push(server);
    await execute(
      buildContext(
        {
          url: server.url,
          apiKey: "token-123",
        },
        {
          context: {
            paperclipWorkspace: {
              cwd: "/home/node/.paperclip/instances/default/workspaces/90b73309-97aa-4e6a-a225-56bc5a390258",
              source: "agent_home",
            },
          },
        },
      ),
    );

    const request = server.getRequests()[0];
    expect(request.body.project_name).toBeUndefined();
  });

  it("extracts a Business Factory issue result envelope from the agent response", async () => {
    const server = createMockAgentZeroServer({
      context_id: "ctx-123",
      response: [
        "Task complete.",
        "BUSINESS_FACTORY_RESULT_JSON",
        "```json",
        JSON.stringify({
          status: "done",
          summary: "Created the missing Agent Zero project and verified the workspace.",
          comment: "Projection is in place and the issue is complete.",
        }),
        "```",
      ].join("\n"),
    });
    servers.push(server);

    const result = await execute(
      buildContext({
        url: server.url,
        apiKey: "token-123",
      }),
    );

    expect(result.resultJson).toMatchObject({
      context_id: "ctx-123",
      businessFactoryResult: {
        status: "done",
        summary: "Created the missing Agent Zero project and verified the workspace.",
        comment: "Projection is in place and the issue is complete.",
      },
    });
  });

  it("honors legacy timeoutSec when timeoutMs is not configured", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          reject(new DOMException("This operation was aborted", "AbortError"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const execution = execute(
      buildContext({
        url: "http://agent-zero.test",
        apiKey: "token-123",
        timeoutSec: 1,
      }),
    ).catch((error) => error);

    await vi.advanceTimersByTimeAsync(1000);

    await expect(execution).resolves.toMatchObject({
      name: "AbortError",
    });
  });
});
