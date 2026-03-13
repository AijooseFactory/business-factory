import { describe, expect, it } from "vitest";
import { extractPaperclipIssueUpdate } from "../services/agent-zero-task-result.ts";

describe("extractPaperclipIssueUpdate", () => {
  it("returns a valid Paperclip issue update from adapter result json", () => {
    const result = extractPaperclipIssueUpdate({
      context_id: "ctx-123",
      paperclipResult: {
        status: "done",
        summary: "Implemented the requested GraphRAG fix.",
        comment: "The Agent Zero project now exists and the task completed successfully.",
      },
    });

    expect(result).toEqual({
      status: "done",
      summary: "Implemented the requested GraphRAG fix.",
      comment: "The Agent Zero project now exists and the task completed successfully.",
    });
  });

  it("rejects invalid statuses", () => {
    const result = extractPaperclipIssueUpdate({
      paperclipResult: {
        status: "finished",
        summary: "Not a valid Paperclip status.",
      },
    });

    expect(result).toBeNull();
  });

  it("requires at least one non-empty summary or comment field", () => {
    const result = extractPaperclipIssueUpdate({
      paperclipResult: {
        status: "done",
      },
    });

    expect(result).toBeNull();
  });
});
