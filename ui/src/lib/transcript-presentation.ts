import type { TranscriptEntry } from "../adapters";

const BENIGN_PAPERCLIP_NOTICE_PATTERNS = [
  /^No project or prior session workspace was available\. Using fallback workspace ".+" for this run\.$/,
  /^No project workspace directory is currently available for this issue\. Using fallback workspace ".+" for this run\.$/,
  /^Saved session workspace ".+" is not available\. Using fallback workspace ".+" for this run\.$/,
  /^Skipping saved session resume(?: for task ".+?")? because .+\.$/,
];

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripPaperclipPrefix(value: string): string {
  return compactWhitespace(value).replace(/^\[paperclip\]\s*/i, "");
}

export function isBenignPaperclipRuntimeNotice(text: string): boolean {
  const normalized = stripPaperclipPrefix(text);
  return BENIGN_PAPERCLIP_NOTICE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function getStderrEventPresentation(text: string): {
  label: "paperclip" | "stderr";
  text: string;
  tone: "neutral" | "error";
} {
  if (isBenignPaperclipRuntimeNotice(text)) {
    return {
      label: "paperclip",
      text: stripPaperclipPrefix(text),
      tone: "neutral",
    };
  }

  return {
    label: "stderr",
    text: compactWhitespace(text),
    tone: "error",
  };
}

export function filterDashboardTranscriptEntries(entries: TranscriptEntry[]): TranscriptEntry[] {
  return entries.filter((entry) => entry.kind !== "stderr" || !isBenignPaperclipRuntimeNotice(entry.text));
}

export function getTranscriptDisplayState(
  entries: TranscriptEntry[],
  options?: {
    suppressBenignPaperclipNotices?: boolean;
    emptyMessage?: string;
    filteredEmptyMessage?: string;
  },
): {
  entries: TranscriptEntry[];
  emptyMessage: string;
} {
  const suppressBenignPaperclipNotices = options?.suppressBenignPaperclipNotices ?? false;
  const emptyMessage = options?.emptyMessage ?? "No transcript yet.";
  const filteredEmptyMessage = options?.filteredEmptyMessage ?? "No noteworthy transcript.";
  const displayEntries = suppressBenignPaperclipNotices ? filterDashboardTranscriptEntries(entries) : entries;

  return {
    entries: displayEntries,
    emptyMessage: suppressBenignPaperclipNotices && entries.length > 0 && displayEntries.length === 0
      ? filteredEmptyMessage
      : emptyMessage,
  };
}
