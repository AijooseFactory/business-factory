import type { TranscriptEntry } from "@business-factory/adapter-utils";

// Simple pass-through for any stdout logs from the adapter 
export function parseAgentZeroStdoutLine(line: string, ts: string): TranscriptEntry[] {
  return [{ kind: "stdout", ts, text: line }];
}
