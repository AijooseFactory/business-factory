from __future__ import annotations

import json

from agent import LoopData
from python.helpers import context as context_helper
from python.helpers.extension import Extension

from business_factory.request_flags import (
    PENDING_REQUEST_CONTEXT_KEY,
    should_suppress_initial_message,
)


class InitialMessage(Extension):
    async def execute(self, **kwargs):
        if self.agent.number != 0:
            return

        if self.agent.context.log.logs:
            return

        pending_request = context_helper.get_context_data(PENDING_REQUEST_CONTEXT_KEY, None)
        if should_suppress_initial_message(
            pending_request,
            has_existing_logs=bool(self.agent.context.log.logs),
            config_additional=getattr(self.agent.config, "additional", None),
        ):
            return

        initial_message = self.agent.read_prompt("fw.initial_message.md")

        self.agent.loop_data = LoopData(user_message=None)
        self.agent.hist_add_ai_response(initial_message)

        try:
            initial_message_json = json.loads(initial_message)
            initial_message_text = initial_message_json.get("tool_args", {}).get(
                "text",
                "Hello! How can I help you?",
            )
        except Exception:
            initial_message_text = "Hello! How can I help you?"

        self.agent.context.log.log(
            type="response",
            content=initial_message_text,
            finished=True,
            update_progress="none",
        )
