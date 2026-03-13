import { ONBOARDING_AGENT_PERSONA_BILLING_CODE } from "@paperclipai/shared";

const OPEN_ISSUE_STATUSES = new Set([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
]);

const LEGACY_BOOTSTRAP_TITLES_BY_ROLE = {
  ceo: "Create your CEO HEARTBEAT.md",
  chief_of_staff: "Create your Chief of Staff HEARTBEAT.md",
} as const;

const REQUIRED_BOOTSTRAP_DOC_NAMES = [
  "agents.md",
  "heartbeat.md",
  "soul.md",
  "tools.md",
];

interface OnboardingBootstrapIssueLike {
  title: string;
  description: string | null;
  status: string;
  billingCode: string | null;
}

interface OnboardingBootstrapAgentLike {
  role: string;
}

function looksLikeLegacyBootstrapDescription(
  description: string,
  role: keyof typeof LEGACY_BOOTSTRAP_TITLES_BY_ROLE,
) {
  if (!REQUIRED_BOOTSTRAP_DOC_NAMES.every((docName) => description.includes(docName))) {
    return false;
  }

  if (role === "chief_of_staff") {
    return (
      description.includes("chief of staff") ||
      description.includes("chief-of-staff") ||
      description.includes("chief_of_staff")
    );
  }

  return description.includes("ceo");
}

export function isOnboardingBootstrapIssueForAgent(
  issue: OnboardingBootstrapIssueLike,
  agent: OnboardingBootstrapAgentLike,
) {
  if (!OPEN_ISSUE_STATUSES.has(issue.status)) return false;

  if (issue.billingCode === ONBOARDING_AGENT_PERSONA_BILLING_CODE) {
    return true;
  }

  const role = agent.role as keyof typeof LEGACY_BOOTSTRAP_TITLES_BY_ROLE;
  const expectedTitle = LEGACY_BOOTSTRAP_TITLES_BY_ROLE[role];
  if (!expectedTitle) return false;
  if (issue.title.trim() !== expectedTitle) return false;

  return looksLikeLegacyBootstrapDescription(
    (issue.description ?? "").trim().toLowerCase(),
    role,
  );
}
