from __future__ import annotations

import importlib.util
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parent.parent
    / "usr-extensions/Business Factory/business_factory/request_flags.py"
)


def load_module():
    if not MODULE_PATH.exists():
        raise AssertionError(f"expected Business Factory request flags module at {MODULE_PATH}")

    spec = importlib.util.spec_from_file_location("business_factory_request_flags", MODULE_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError(f"failed to load module spec from {MODULE_PATH}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_detects_paperclip_assigned_issue_message():
    module = load_module()

    assert module.is_paperclip_assigned_request(
        {
            "message": (
                "AIJ-4 - Create a new agent\n\n"
                "Paperclip context:\n"
                "- Project: Hybrid GraphRAG for Agent Zero\n"
                "- Workspace: /Users/george/Mac/data/usr/projects/ai_joose_factory/.a0proj/_projects/internal/graphrag-agent-zero\n"
                "- Paperclip run: run-123\n\n"
                "Treat the assigned Paperclip issue title and description above as the task to execute."
            ),
            "project_name": "graphrag-agent-zero",
            "agent_profile": "Einstein",
        }
    )


def test_does_not_flag_normal_human_chat_message():
    module = load_module()

    assert not module.is_paperclip_assigned_request(
        {
            "message": "Hello Einstein, help me brainstorm adapter ideas.",
            "agent_profile": "Einstein",
        }
    )


def test_assignment_system_message_marks_current_issue_as_authoritative():
    module = load_module()

    message = module.build_assignment_system_message()

    assert "current Paperclip issue text as authoritative" in message
    assert "Do not claim the task is already complete" in message


def test_suppresses_initial_message_for_paperclip_assigned_request_even_for_einstein():
    module = load_module()

    pending_request = {
        "message": (
            "AIJ-9 - Fix the startup flow\n\n"
            "Paperclip context:\n"
            "- Project: Hybrid GraphRAG for Agent Zero\n"
            "- Workspace: /Users/george/Mac/data/usr/projects/ai_joose_factory/.a0proj/_projects/internal/graphrag-agent-zero\n"
            "- Paperclip run: run-456\n\n"
            "Treat the assigned Paperclip issue title and description above as the task to execute."
        ),
        "agent_profile": "Einstein",
    }

    assert module.should_suppress_initial_message(pending_request, has_existing_logs=False)


def test_does_not_suppress_initial_message_for_normal_chat():
    module = load_module()

    pending_request = {
        "message": "Hello Einstein, help me review the current roadmap.",
        "agent_profile": "Einstein",
    }

    assert not module.should_suppress_initial_message(pending_request, has_existing_logs=False)


def test_suppresses_initial_message_when_request_is_only_available_in_agent_config_additional():
    module = load_module()

    assert module.should_suppress_initial_message(
        None,
        has_existing_logs=False,
        config_additional={
            module.PENDING_REQUEST_CONTEXT_KEY: {
                "message": (
                    "AIJ-10 - Build the bridge\n\n"
                    "Paperclip context:\n"
                    "- Project: Hybrid GraphRAG for Agent Zero\n"
                    "- Paperclip run: run-789\n\n"
                    "Treat the assigned Paperclip issue title and description above as the task to execute."
                ),
                "agent_profile": "Einstein",
            }
        },
    )
