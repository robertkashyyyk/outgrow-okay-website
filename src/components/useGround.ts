import { useEffect } from "react";

// Switches the page ground by toggling `.dark` on <html>.
// dark = ink (homepage); light = bone (long-read/secondary pages).
// All surfaces share one token set — this only flips the semantic vars.
export function useGround(mode: "dark" | "light") {
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", mode === "dark");
  }, [mode]);
}
