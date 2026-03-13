import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function ensureWritableLogDir(preferredDir: string): string {
  try {
    fs.mkdirSync(preferredDir, { recursive: true });
    return preferredDir;
  } catch (error) {
    const fallbackDir = path.resolve(os.tmpdir(), "paperclip", "logs");
    fs.mkdirSync(fallbackDir, { recursive: true });
    console.warn(
      `[paperclip] Failed to create log directory "${preferredDir}". Falling back to "${fallbackDir}".`,
      error,
    );
    return fallbackDir;
  }
}
