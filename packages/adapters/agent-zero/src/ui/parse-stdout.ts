import type { TranscriptEntry } from "@paperclipai/adapter-utils";

// Simple pass-through for any stdout logs from the adapter 
export function parseAgentZeroStdoutLine(line: string, ts: string): TranscriptEntry[] {
  return [{ kind: "stdout", ts, text: line }];
}
