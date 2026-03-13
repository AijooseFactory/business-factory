from __future__ import annotations

import re
from typing import Any, Mapping


PENDING_REQUEST_CONTEXT_KEY = "business_factory_pending_api_request"
ISSUE_KEY_PATTERN = re.compile(r"^[A-Z][A-Z0-9_-]+-\d+\b")
ASSIGNED_TASK_MARKERS = (
    "treat the assigned paperclip issue title and description above as the task to execute",
    "use the assigned issue title and description as the task",
)
PAPERCLIP_CONTEXT_MARKERS = (
    "paperclip context:",
    "paperclip bridge:",
    "paperclip run:",
    "paperclip_api_url",
    "paperclip_issue_id",
)


def _non_empty_string(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    return ""


def build_request_snapshot(payload: Mapping[str, Any] | None) -> dict[str, Any]:
    source = payload or {}
    return {
        "context_id": _non_empty_string(source.get("context_id")),
        "message": _non_empty_string(source.get("message")),
        "project_name": _non_empty_string(source.get("project_name")),
        "agent_profile": _non_empty_string(source.get("agent_profile")),
    }


def resolve_pending_request(
    payload: Mapping[str, Any] | None,
    *,
    config_additional: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    snapshot = build_request_snapshot(payload)
    if snapshot["message"]:
        return snapshot

    if not isinstance(config_additional, Mapping):
        return snapshot

    additional_payload = config_additional.get(PENDING_REQUEST_CONTEXT_KEY)
    if isinstance(additional_payload, Mapping):
        return build_request_snapshot(additional_payload)

    return snapshot


def is_paperclip_assigned_request(payload: Mapping[str, Any] | None) -> bool:
    snapshot = build_request_snapshot(payload)
    message = snapshot["message"]
    if not message:
        return False

    normalized = message.lower()
    header = next((line.strip() for line in message.splitlines() if line.strip()), "")

    has_issue_header = bool(ISSUE_KEY_PATTERN.match(header))
    has_paperclip_context = any(marker in normalized for marker in PAPERCLIP_CONTEXT_MARKERS)
    has_assignment_instruction = any(marker in normalized for marker in ASSIGNED_TASK_MARKERS)

    return (has_issue_header and has_paperclip_context) or (has_paperclip_context and has_assignment_instruction)


def build_assignment_system_message() -> str:
    return (
        "Paperclip already assigned the task in the current message. "
        "Treat the issue title and description you were given as the task to execute. "
        "Treat the current Paperclip issue text as authoritative even if prior memory, prior runs, "
        "or repo-local agent notes mention the same issue or a different agent roster. "
        "Do not claim the task is already complete unless you actually perform the work in this run "
        "or verify the completed changes directly from the current workspace and Paperclip state. "
        "Do not ask the user to restate the task unless the issue text is missing or contradictory."
    )


def should_suppress_initial_message(
    payload: Mapping[str, Any] | None,
    *,
    has_existing_logs: bool,
    config_additional: Mapping[str, Any] | None = None,
) -> bool:
    if has_existing_logs:
        return False

    return is_paperclip_assigned_request(
        resolve_pending_request(
            payload,
            config_additional=config_additional,
        )
    )
