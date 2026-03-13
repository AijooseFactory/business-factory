from python.helpers.extension import Extension
from python.helpers.print_style import PrintStyle
import os


PATCH_MARKER = "_business_factory_local_host_patch_applied"
ORIGINAL_ATTR = "__business_factory_original__"
SKIP_DIRECTORIES = {".trash", ".gemini"}


def _directory_name(directory: str) -> str:
    return os.path.basename(directory.rstrip(os.sep)).lower()


def _wrap_file_tree(module):
    if getattr(module, PATCH_MARKER, False):
        return False

    original_list_dir = getattr(module._list_directory_children, ORIGINAL_ATTR, module._list_directory_children)
    original_has_visible = getattr(
        module._directory_has_visible_entries,
        ORIGINAL_ATTR,
        module._directory_has_visible_entries,
    )

    def patched_list_dir(directory, root_abs_path, ignore_spec, *, max_depth_remaining, cache):
        if _directory_name(directory) in SKIP_DIRECTORIES:
            return ([], [])
        return original_list_dir(
            directory,
            root_abs_path,
            ignore_spec,
            max_depth_remaining=max_depth_remaining,
            cache=cache,
        )

    def patched_has_visible(directory, root_abs_path, ignore_spec, cache, max_depth_remaining):
        if _directory_name(directory) in SKIP_DIRECTORIES:
            cache[directory] = False
            return False
        return original_has_visible(
            directory,
            root_abs_path,
            ignore_spec,
            cache,
            max_depth_remaining,
        )

    setattr(patched_list_dir, ORIGINAL_ATTR, original_list_dir)
    setattr(patched_has_visible, ORIGINAL_ATTR, original_has_visible)

    module._list_directory_children = patched_list_dir
    module._directory_has_visible_entries = patched_has_visible
    setattr(module, PATCH_MARKER, True)
    return True


class LocalHostSystemPatch(Extension):
    async def execute(self, **kwargs):
        PrintStyle(font_color="green", bold=True).print(
            "Initializing Business Factory local host overrides..."
        )

        try:
            import python.helpers.memory_consolidation as mc

            mc.ConsolidationConfig.processing_timeout_seconds = 3600
            PrintStyle(font_color="green").print("  ✓ Consolidation timeout locked to 3600s")
        except Exception as e:
            PrintStyle(font_color="red").print(
                f"  ✗ Failed to patch ConsolidationConfig: {e}"
            )

        try:
            import python.helpers.file_tree as ft

            patched = _wrap_file_tree(ft)
            message = (
                "  ✓ file_tree.py safety patched (.Trash/.gemini excluded)"
                if patched
                else "  ✓ file_tree.py safety patch already active"
            )
            PrintStyle(font_color="green").print(message)
        except Exception as e:
            PrintStyle(font_color="red").print(f"  ✗ Failed to patch file_tree: {e}")

        PrintStyle(font_color="green", bold=True).print(
            "Business Factory local host patch is active."
        )
