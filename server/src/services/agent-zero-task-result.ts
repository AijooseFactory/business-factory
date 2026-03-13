const PAPERCLIP_ISSUE_STATUSES = new Set([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "done",
  "cancelled",
]);

export type PaperclipIssueUpdate = {
  status: string;
  summary: string | null;
  comment: string | null;
};

function parseObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function extractPaperclipIssueUpdate(
  resultJson: Record<string, unknown> | null | undefined,
): PaperclipIssueUpdate | null {
  const parsed = parseObject(resultJson);
  const envelope = parseObject(parsed.paperclipResult);
  const status = nonEmpty(envelope.status);
  if (!status || !PAPERCLIP_ISSUE_STATUSES.has(status)) return null;

  const summary = nonEmpty(envelope.summary);
  const comment = nonEmpty(envelope.comment);
  if (!summary && !comment) return null;

  return {
    status,
    summary,
    comment,
  };
}
