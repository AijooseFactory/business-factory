import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureWritableLogDir } from "../log-dir.ts";

const createdPaths: string[] = [];

afterEach(() => {
  while (createdPaths.length > 0) {
    const target = createdPaths.pop();
    if (target) fs.rmSync(target, { recursive: true, force: true });
  }
});

describe("ensureWritableLogDir", () => {
  it("uses the preferred directory when it can be created", () => {
    const preferredRoot = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-log-dir-"));
    createdPaths.push(preferredRoot);
    const preferredDir = path.join(preferredRoot, "logs");

    const result = ensureWritableLogDir(preferredDir);

    expect(result).toBe(preferredDir);
    expect(fs.existsSync(result)).toBe(true);
  });

  it("falls back to tmp when the preferred directory is invalid", () => {
    const blockerRoot = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-log-blocker-"));
    createdPaths.push(blockerRoot);
    fs.writeFileSync(path.join(blockerRoot, "blocked"), "not-a-directory");
    const invalidPreferredDir = path.join(blockerRoot, "blocked", "logs");

    const result = ensureWritableLogDir(invalidPreferredDir);

    expect(result).toBe(path.resolve(os.tmpdir(), "paperclip", "logs"));
    expect(fs.existsSync(result)).toBe(true);
  });
});
