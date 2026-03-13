export const DEFAULT_PROJECT_LIMIT = 4;


function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}


export function isProjectLaunchDisabled(projectLaunchInFlight, projectName) {
  const activeLaunch = normalizeText(projectLaunchInFlight);
  const targetProject = normalizeText(projectName);
  return Boolean(activeLaunch) && activeLaunch !== targetProject;
}


function toProjectRecord(project) {
  if (!project || typeof project !== "object") return null;
  const name = normalizeText(project.name);
  if (!name) return null;

  const title = normalizeText(project.title) || name;
  const summary = normalizeText(project.description);
  const record = {
    name,
    title,
    summary,
  };

  const color = normalizeText(project.color);
  if (color) {
    record.color = color;
  }

  return record;
}


export function selectWelcomeProjects(projects, options = {}) {
  const preferredProjectName = normalizeText(options.preferredProjectName);
  const limit = Number.isInteger(options.limit) && options.limit > 0
    ? options.limit
    : DEFAULT_PROJECT_LIMIT;

  const seen = new Set();
  const records = [];

  for (const project of Array.isArray(projects) ? projects : []) {
    const record = toProjectRecord(project);
    if (!record || seen.has(record.name)) continue;
    seen.add(record.name);
    records.push(record);
  }

  records.sort((left, right) => {
    const leftPinned = left.name === preferredProjectName ? 1 : 0;
    const rightPinned = right.name === preferredProjectName ? 1 : 0;
    if (leftPinned !== rightPinned) return rightPinned - leftPinned;
    return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
  });

  return records.slice(0, limit);
}
