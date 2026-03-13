from __future__ import annotations

import asyncio
import importlib.util
import sys
import types
from pathlib import Path


MODULE_PATH = Path(
    "/Users/george/Mac/data/usr/projects/ai_joose_factory/.a0proj/ajf-business-factory/integrations/agent-zero/usr-extensions/agent_init/00_local_host_system_patch.py"
)


def load_module():
    if not MODULE_PATH.exists():
        raise AssertionError(f"expected local host patch module at {MODULE_PATH}")

    spec = importlib.util.spec_from_file_location("business_factory_local_host_patch", MODULE_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError(f"failed to load module spec from {MODULE_PATH}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def install_fake_agent_zero_modules():
    python_module = types.ModuleType("python")
    helpers_module = types.ModuleType("python.helpers")
    extension_module = types.ModuleType("python.helpers.extension")
    print_style_module = types.ModuleType("python.helpers.print_style")
    memory_module = types.ModuleType("python.helpers.memory_consolidation")
    file_tree_module = types.ModuleType("python.helpers.file_tree")

    class Extension:
        def __init__(self, agent=None):
            self.agent = agent

    class PrintStyle:
        def __init__(self, *args, **kwargs):
            pass

        def print(self, *args, **kwargs):
            return None

    class ConsolidationConfig:
        processing_timeout_seconds = 30

    call_log = []

    def original_list_dir(directory, root_abs_path, ignore_spec, *, max_depth_remaining, cache):
        call_log.append(("list", directory))
        return (["folder"], ["file"])

    def original_has_visible(directory, root_abs_path, ignore_spec, cache, max_depth_remaining):
        call_log.append(("visible", directory))
        return True

    extension_module.Extension = Extension
    print_style_module.PrintStyle = PrintStyle
    memory_module.ConsolidationConfig = ConsolidationConfig
    file_tree_module._list_directory_children = original_list_dir
    file_tree_module._directory_has_visible_entries = original_has_visible

    python_module.helpers = helpers_module
    helpers_module.extension = extension_module
    helpers_module.print_style = print_style_module
    helpers_module.memory_consolidation = memory_module
    helpers_module.file_tree = file_tree_module

    previous_modules = {name: sys.modules.get(name) for name in (
        "python",
        "python.helpers",
        "python.helpers.extension",
        "python.helpers.print_style",
        "python.helpers.memory_consolidation",
        "python.helpers.file_tree",
    )}

    sys.modules["python"] = python_module
    sys.modules["python.helpers"] = helpers_module
    sys.modules["python.helpers.extension"] = extension_module
    sys.modules["python.helpers.print_style"] = print_style_module
    sys.modules["python.helpers.memory_consolidation"] = memory_module
    sys.modules["python.helpers.file_tree"] = file_tree_module

    return file_tree_module, memory_module, call_log, previous_modules


def restore_modules(previous_modules):
    for name, module in previous_modules.items():
        if module is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = module


def test_local_host_patch_is_idempotent_and_skips_hidden_dirs():
    file_tree_module, memory_module, call_log, previous_modules = install_fake_agent_zero_modules()
    try:
        module = load_module()
        patch = module.LocalHostSystemPatch(agent=None)

        asyncio.run(patch.execute())
        first_wrapper = file_tree_module._list_directory_children
        first_visible_wrapper = file_tree_module._directory_has_visible_entries

        asyncio.run(patch.execute())

        assert file_tree_module._list_directory_children is first_wrapper
        assert file_tree_module._directory_has_visible_entries is first_visible_wrapper
        assert memory_module.ConsolidationConfig.processing_timeout_seconds == 3600

        folders, files = file_tree_module._list_directory_children(
            "/tmp/project/.Trash",
            "/tmp/project",
            None,
            max_depth_remaining=1,
            cache={},
        )
        assert folders == []
        assert files == []

        cache = {}
        assert (
            file_tree_module._directory_has_visible_entries(
                "/tmp/project/.gemini",
                "/tmp/project",
                None,
                cache,
                1,
            )
            is False
        )
        assert cache["/tmp/project/.gemini"] is False

        assert (
            file_tree_module._list_directory_children(
                "/tmp/project/src",
                "/tmp/project",
                None,
                max_depth_remaining=1,
                cache={},
            )
            == (["folder"], ["file"])
        )
        assert (
            file_tree_module._directory_has_visible_entries(
                "/tmp/project/src",
                "/tmp/project",
                None,
                {},
                1,
            )
            is True
        )
        assert call_log == [
            ("list", "/tmp/project/src"),
            ("visible", "/tmp/project/src"),
        ]
    finally:
        restore_modules(previous_modules)
