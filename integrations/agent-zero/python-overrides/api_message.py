from __future__ import annotations

import sys
from pathlib import Path


BUSINESS_FACTORY_ROOT = Path("/a0/usr/extensions/Business Factory")
if str(BUSINESS_FACTORY_ROOT) not in sys.path:
    sys.path.insert(0, str(BUSINESS_FACTORY_ROOT))

from business_factory.api_message import ApiMessage

__all__ = ["ApiMessage"]
