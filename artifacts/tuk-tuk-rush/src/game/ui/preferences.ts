import { useState } from "react";
export type Preferences = {
  audio: boolean;
  quality: "low" | "medium";
  motion: "system" | "reduced";
  controls: "standard" | "large";
  opacity: number;
};
export const defaults: Preferences = {
  audio: true,
  quality: "medium",
  motion: "system",
  controls: "standard",
  opacity: 0.82,
};
export function readPreferences(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem("ttr-interface-v1") ?? "{}");
    return {
      audio: typeof p.audio === "boolean" ? p.audio : true,
      quality: p.quality === "low" ? "low" : "medium",
      motion: p.motion === "reduced" ? "reduced" : "system",
      controls: p.controls === "large" ? "large" : "standard",
      opacity:
        typeof p.opacity === "number" && Number.isFinite(p.opacity)
          ? Math.max(0.55, Math.min(1, p.opacity))
          : 0.82,
    };
  } catch {
    return defaults;
  }
}
export function usePreferences() {
  const [prefs, setPrefs] = useState(readPreferences);
  const update = (patch: Partial<Preferences>) =>
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem("ttr-interface-v1", JSON.stringify(next));
      } catch {
        /* Private browsing keeps session preferences. */
      }
      return next;
    });
  return [prefs, update] as const;
}
