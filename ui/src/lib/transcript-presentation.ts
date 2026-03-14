import type { TranscriptEntry } from "../adapters";

const BENIGN_BUSINESS_FACTORY_NOTICE_PATTERNS = [
  /^No project or prior session workspace was available\. Using fallback workspace ".+" for this run\.$/,
  /^No project workspace directory is currently available for this issue\. Using fallback workspace ".+" for this run\.$/,
  /^Saved session workspace ".+" is not available\. Using fallback workspace ".+" for this run\.$/,
  /^Skipping saved session resume(?: for task ".+?")? because .+\.$/,
];

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripBusinessFactoryPrefix(value: string): string {
  return compactWhitespace(value).replace(/^\[business[- ]?factory\]\s*/i, "");
}

export function isBenignBusinessFactoryRuntimeNotice(text: string): boolean {
  const normalized = stripBusinessFactoryPrefix(text);
  return BENIGN_BUSINESS_FACTORY_NOTICE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function getStderrEventPresentation(text: string): {
  label: "business-factory" | "stderr";
  text: string;
  tone: "neutral" | "error";
} {
  if (isBenignBusinessFactoryRuntimeNotice(text)) {
    return {
      label: "business-factory",
      text: stripBusinessFactoryPrefix(text),
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
  return entries.filter((entry) => entry.kind !== "stderr" || !isBenignBusinessFactoryRuntimeNotice(entry.text));
}

export function getTranscriptDisplayState(
  entries: TranscriptEntry[],
  options?: {
    suppressBenignBusinessFactoryNotices?: boolean;
    emptyMessage?: string;
    filteredEmptyMessage?: string;
  },
): {
  entries: TranscriptEntry[];
  emptyMessage: string;
} {
  const suppressBenignBusinessFactoryNotices = options?.suppressBenignBusinessFactoryNotices ?? false;
  const emptyMessage = options?.emptyMessage ?? "No transcript yet.";
  const filteredEmptyMessage = options?.filteredEmptyMessage ?? "No noteworthy transcript.";
  const displayEntries = suppressBenignBusinessFactoryNotices ? filterDashboardTranscriptEntries(entries) : entries;

  return {
    entries: displayEntries,
    emptyMessage: suppressBenignBusinessFactoryNotices && entries.length > 0 && displayEntries.length === 0
      ? filteredEmptyMessage
      : emptyMessage,
  };
}
