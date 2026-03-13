import { useEffect } from "react";
import type { AdapterConfigFieldProps } from "./types.js";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function AgentZeroConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldProps) {
  useEffect(() => {
    if (isCreate && set && !values?.url) {
      set({ url: "http://ajf-einstein:8090/" });
    }
  }, [isCreate, set, values?.url]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Agent Zero API URL</label>
      <input
        type="text"
        value={
          isCreate
            ? values!.url || ""
            : eff("adapterConfig", "url", String(config.url ?? "http://ajf-einstein:8090/"))
        }
        onChange={(e) =>
          isCreate && set
            ? set({ url: e.target.value })
            : mark("adapterConfig", "url", e.target.value || undefined)
        }
        className={inputClass}
        placeholder="http://ajf-einstein:8090/"
      />
      <p className="text-xs text-muted-foreground">The endpoint for your Agent Zero instance.</p>

      <label className="text-sm font-medium mt-2">API Key (optional)</label>
      <input
        type="password"
        value={
          isCreate
            ? values!.apiKey || ""
            : eff("adapterConfig", "apiKey", String(config.apiKey ?? ""))
        }
        onChange={(e) =>
          isCreate && set
            ? set({ apiKey: e.target.value })
            : mark("adapterConfig", "apiKey", e.target.value || undefined)
        }
        className={inputClass}
        placeholder="Enter API Key"
      />
      <p className="text-xs text-muted-foreground">Required if your Agent Zero API is protected by a token.</p>
    </div>
  );
}
