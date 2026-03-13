from __future__ import annotations

import base64
import os
import threading
from datetime import datetime, timedelta

from agent import AgentContext, AgentContextType, UserMessage
from initialize import initialize_agent
from python.helpers import context as context_helper
from python.helpers import files, projects
from python.helpers.api import ApiHandler, Request, Response
from python.helpers.print_style import PrintStyle
from python.helpers.projects import activate_project
from python.helpers.security import safe_filename

from business_factory.request_flags import (
    PENDING_REQUEST_CONTEXT_KEY,
    build_assignment_system_message,
    build_request_snapshot,
    is_paperclip_assigned_request,
)


def _strip_bootstrap_greeting(context: AgentContext) -> None:
    logs = getattr(context.log, "logs", None)
    if isinstance(logs, list) and len(logs) == 1:
      first_log = logs[0]
      if getattr(first_log, "type", None) == "response":
          logs.clear()
          if hasattr(context.log, "updates") and isinstance(context.log.updates, list):
              context.log.updates.clear()
          if hasattr(context.log, "progress"):
              context.log.progress = ""

    agent = context.get_agent()
    history = getattr(agent, "history", None)
    current_topic = getattr(history, "current", None)
    messages = getattr(current_topic, "messages", None)
    if isinstance(messages, list) and len(messages) == 1:
        first_message = messages[0]
        if getattr(first_message, "ai", False):
            messages.clear()
            if hasattr(history, "counter"):
                history.counter = max(0, int(history.counter) - 1)


class ApiMessage(ApiHandler):
    _chat_lifetimes = {}
    _cleanup_lock = threading.Lock()

    @classmethod
    def requires_auth(cls) -> bool:
        return False

    @classmethod
    def requires_csrf(cls) -> bool:
        return False

    @classmethod
    def requires_api_key(cls) -> bool:
        return True

    async def process(self, input: dict, request: Request) -> dict | Response:
        context_id = input.get("context_id", "")
        message = input.get("message", "")
        attachments = input.get("attachments", [])
        lifetime_hours = input.get("lifetime_hours", 24)
        project_name = input.get("project_name", None)
        agent_profile = input.get("agent_profile", None)
        created_new_context = False

        override_settings = {}
        if agent_profile:
            override_settings["agent_profile"] = agent_profile

        if not message:
            return Response(
                '{"error": "Message is required"}',
                status=400,
                mimetype="application/json",
            )

        pending_request = build_request_snapshot(input)
        assigned_request = is_paperclip_assigned_request(pending_request)
        context_helper.set_context_data(PENDING_REQUEST_CONTEXT_KEY, pending_request)

        attachment_paths: list[str] = []
        try:
            if attachments:
                upload_folder_int = "/a0/usr/uploads"
                upload_folder_ext = files.get_abs_path("usr/uploads")
                os.makedirs(upload_folder_ext, exist_ok=True)

                for attachment in attachments:
                    if (
                        not isinstance(attachment, dict)
                        or "filename" not in attachment
                        or "base64" not in attachment
                    ):
                        continue

                    try:
                        filename = safe_filename(attachment["filename"])
                        if not filename:
                            raise ValueError("Invalid filename")

                        file_content = base64.b64decode(attachment["base64"])
                        save_path = os.path.join(upload_folder_ext, filename)
                        with open(save_path, "wb") as file_handle:
                            file_handle.write(file_content)

                        attachment_paths.append(os.path.join(upload_folder_int, filename))
                    except Exception as err:
                        PrintStyle.error(
                            f"Failed to process attachment {attachment.get('filename', 'unknown')}: {err}"
                        )
                        continue

            if context_id:
                context = AgentContext.use(context_id)
                if not context:
                    config = initialize_agent(override_settings=override_settings)
                    config.additional[PENDING_REQUEST_CONTEXT_KEY] = pending_request
                    context = AgentContext(
                        config=config,
                        id=context_id,
                        type=AgentContextType.USER,
                    )
                    AgentContext.use(context.id)
                    created_new_context = True

                if agent_profile and context.agent0.config.profile != agent_profile:
                    return Response(
                        '{"error": "Cannot override agent profile on existing context"}',
                        status=400,
                        mimetype="application/json",
                    )

                existing_project = context.get_data(projects.CONTEXT_DATA_KEY_PROJECT)
                if project_name and existing_project and existing_project != project_name:
                    return Response(
                        '{"error": "Project can only be set on first message"}',
                        status=400,
                        mimetype="application/json",
                    )
            else:
                config = initialize_agent(override_settings=override_settings)
                config.additional[PENDING_REQUEST_CONTEXT_KEY] = pending_request
                context = AgentContext(config=config, type=AgentContextType.USER)
                AgentContext.use(context.id)
                context_id = context.id
                created_new_context = True

            if created_new_context and assigned_request:
                _strip_bootstrap_greeting(context)

            if project_name:
                try:
                    activate_project(context_id, project_name)
                except Exception as err:
                    error_msg = str(err)
                    PrintStyle.error(
                        f"Failed to activate project '{project_name}' for context '{context_id}': {error_msg}"
                    )
                    return Response(
                        f'{{"error": "Failed to activate project \\"{project_name}\\""}}',
                        status=500,
                        mimetype="application/json",
                    )

            with self._cleanup_lock:
                self._chat_lifetimes[context_id] = datetime.now() + timedelta(
                    hours=lifetime_hours
                )

            attachment_filenames = (
                [os.path.basename(path) for path in attachment_paths]
                if attachment_paths
                else []
            )

            PrintStyle(
                background_color="#6C3483",
                font_color="white",
                bold=True,
                padding=True,
            ).print("External API message:")
            PrintStyle(font_color="white", padding=False).print(f"> {message}")
            if attachment_filenames:
                PrintStyle(font_color="white", padding=False).print("Attachments:")
                for filename in attachment_filenames:
                    PrintStyle(font_color="white", padding=False).print(f"- {filename}")

            context.log.log(
                type="user",
                heading="",
                content=message,
                kvps={"attachments": attachment_filenames},
            )

            user_message = UserMessage(message, attachment_paths)
            if assigned_request:
                user_message.system_message.append(build_assignment_system_message())

            task = context.communicate(user_message)
            result = await task.result()

            self._cleanup_expired_chats()

            return {
                "context_id": context_id,
                "response": result,
            }
        except Exception as err:
            PrintStyle.error(f"External API error: {err}")
            return Response(
                f'{{"error": "{str(err)}"}}',
                status=500,
                mimetype="application/json",
            )
        finally:
            context_helper.delete_context_data(PENDING_REQUEST_CONTEXT_KEY)

    @classmethod
    def _cleanup_expired_chats(cls):
        with cls._cleanup_lock:
            now = datetime.now()
            expired_contexts = [
                context_id
                for context_id, expiry in cls._chat_lifetimes.items()
                if now > expiry
            ]

            for context_id in expired_contexts:
                try:
                    context = AgentContext.get(context_id)
                    if context:
                        context.reset()
                        AgentContext.remove(context_id)
                    del cls._chat_lifetimes[context_id]
                    PrintStyle().print(f"Cleaned up expired chat: {context_id}")
                except Exception as err:
                    PrintStyle.error(f"Failed to cleanup chat {context_id}: {err}")
