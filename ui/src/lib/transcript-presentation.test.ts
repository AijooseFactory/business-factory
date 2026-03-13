// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { TranscriptEntry } from "../adapters";
import {
  filterDashboardTranscriptEntries,
  getTranscriptDisplayState,
  getStderrEventPresentation,
  isBenignPaperclipRuntimeNotice,
} from "./transcript-presentation";

describe("isBenignPaperclipRuntimeNotice", () => {
  it("matches fallback workspace notices", () => {
    expect(
      isBenignPaperclipRuntimeNotice(
        '[paperclip] No project or prior session workspace was available. Using fallback workspace "/home/node/.paperclip/instances/default/workspaces/90b73309-97aa-4e6a-a225-56bc5a390258" for this run.',
      ),
    ).toBe(true);
  });

  it("matches session-resume skip notices", () => {
    expect(
      isBenignPaperclipRuntimeNotice(
        '[paperclip] Skipping saved session resume because wake source is timer.',
      ),
    ).toBe(true);
    expect(
      isBenignPaperclipRuntimeNotice(
        '[paperclip] Skipping saved session resume for task "AIJ-1" because this is a manual invoke.',
      ),
    ).toBe(true);
  });

  it("does not match real stderr failures", () => {
    expect(isBenignPaperclipRuntimeNotice('[paperclip] No module named "graphrag_agent_zero"')).toBe(false);
  });
});

describe("getStderrEventPresentation", () => {
  it("downgrades benign paperclip notices", () => {
    const presentation = getStderrEventPresentation(
      '[paperclip] Skipping saved session resume because wake source is timer.',
    );

    expect(presentation).toEqual({
      label: "paperclip",
      text: "Skipping saved session resume because wake source is timer.",
      tone: "neutral",
    });
  });

  it("preserves real stderr failures", () => {
    const presentation = getStderrEventPresentation('[paperclip] No module named "graphrag_agent_zero"');

    expect(presentation).toEqual({
      label: "stderr",
      text: '[paperclip] No module named "graphrag_agent_zero"',
      tone: "error",
    });
  });
});

describe("filterDashboardTranscriptEntries", () => {
  it("removes only benign paperclip stderr notices", () => {
    const entries: TranscriptEntry[] = [
      {
        kind: "stderr",
        ts: "2026-03-12T23:00:00.000Z",
        text: '[paperclip] No project or prior session workspace was available. Using fallback workspace "/tmp/workspace" for this run.',
      },
      {
        kind: "stderr",
        ts: "2026-03-12T23:00:01.000Z",
        text: '[paperclip] No module named "graphrag_agent_zero"',
      },
      {
        kind: "assistant",
        ts: "2026-03-12T23:00:02.000Z",
        text: "Heartbeat complete.",
      },
    ];

    expect(filterDashboardTranscriptEntries(entries)).toEqual([
      {
        kind: "stderr",
        ts: "2026-03-12T23:00:01.000Z",
        text: '[paperclip] No module named "graphrag_agent_zero"',
      },
      {
        kind: "assistant",
        ts: "2026-03-12T23:00:02.000Z",
        text: "Heartbeat complete.",
      },
    ]);
  });
});

describe("getTranscriptDisplayState", () => {
  it("uses a no-noteworthy-transcript empty state when only benign notices were filtered", () => {
    const state = getTranscriptDisplayState([
      {
        kind: "stderr",
        ts: "2026-03-12T23:10:00.000Z",
        text: '[paperclip] Skipping saved session resume for task "858c542d-1298-4fd0-b3a3-cd4d5fcd92f8" because wake reason is issue_assigned.',
      },
    ], {
      suppressBenignPaperclipNotices: true,
      emptyMessage: "Waiting for transcript...",
    });

    expect(state).toEqual({
      entries: [],
      emptyMessage: "No noteworthy transcript.",
    });
  });

  it("preserves the default empty message when nothing has been captured yet", () => {
    const state = getTranscriptDisplayState([], {
      suppressBenignPaperclipNotices: true,
      emptyMessage: "Waiting for transcript...",
    });

    expect(state).toEqual({
      entries: [],
      emptyMessage: "Waiting for transcript...",
    });
  });
});
