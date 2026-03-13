from __future__ import annotations

from python.api import api_message as api_message_module
from python.helpers.extension import Extension

from business_factory.api_message import ApiMessage as BusinessFactoryApiMessage


class BusinessFactoryApiMessagePatch(Extension):
    async def execute(self, **kwargs):
        # Compatibility shim: the real bootstrap happens through the
        # mounted /a0/python/api/api_message.py import. Keeping this alias
        # in place prevents extension-tree drift inside Agent Zero.
        api_message_module.ApiMessage = BusinessFactoryApiMessage
