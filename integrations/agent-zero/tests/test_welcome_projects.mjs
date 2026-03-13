import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_PROJECT_LIMIT,
  isProjectLaunchDisabled,
  selectWelcomeProjects,
} from "../webui-overrides/components/welcome/welcome-projects.mjs";


test("selectWelcomeProjects pins the preferred project first and limits the list", () => {
  const projects = [
    { name: "zeta", title: "Zeta", description: "Last alphabetically" },
    { name: "graphrag-agent-zero", title: "Hybrid GraphRAG for Agent Zero", description: "Primary working project" },
    { name: "alpha", title: "Alpha", description: "First alphabetically" },
    { name: "beta", title: "Beta", description: "Second alphabetically" },
    { name: "gamma", title: "Gamma", description: "Third alphabetically" },
  ];

  const selected = selectWelcomeProjects(projects, {
    preferredProjectName: "graphrag-agent-zero",
  });

  assert.equal(selected.length, DEFAULT_PROJECT_LIMIT);
  assert.equal(selected[0].name, "graphrag-agent-zero");
  assert.deepEqual(
    selected.map((project) => project.name),
    ["graphrag-agent-zero", "alpha", "beta", "gamma"],
  );
});


test("selectWelcomeProjects filters invalid rows, deduplicates by name, and normalizes text", () => {
  const projects = [
    null,
    {},
    { name: "hybrid", title: "  Hybrid   GraphRAG  ", description: "  Primary\nproject  " },
    { name: "hybrid", title: "Ignored duplicate", description: "Ignored duplicate" },
    { name: "paperclip-only", title: "", description: "   " },
  ];

  const selected = selectWelcomeProjects(projects, {
    preferredProjectName: "missing-project",
    limit: 5,
  });

  assert.equal(selected.length, 2);
  assert.deepEqual(selected[0], {
    name: "hybrid",
    title: "Hybrid GraphRAG",
    summary: "Primary project",
  });
  assert.deepEqual(selected[1], {
    name: "paperclip-only",
    title: "paperclip-only",
    summary: "",
  });
});


test("isProjectLaunchDisabled only disables other project buttons while a launch is in flight", () => {
  assert.equal(isProjectLaunchDisabled("", "graphrag-agent-zero"), false);
  assert.equal(
    isProjectLaunchDisabled("graphrag-agent-zero", "graphrag-agent-zero"),
    false,
  );
  assert.equal(
    isProjectLaunchDisabled("graphrag-agent-zero", "mac-agent-project"),
    true,
  );
});
