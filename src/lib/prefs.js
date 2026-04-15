// Client-side preferences persisted to localStorage.
// Keep this module tiny and SSR-safe (all accessors check for window).

const STYLE_KEY = "packbrain.style";

// Returns "classic" | "modern" | null (null = user hasn't chosen yet)
export function getStoredStyle() {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STYLE_KEY);
    return v === "classic" || v === "modern" ? v : null;
  } catch {
    return null;
  }
}

export function setStoredStyle(style) {
  if (typeof window === "undefined") return;
  try {
    if (style === "classic" || style === "modern") {
      localStorage.setItem(STYLE_KEY, style);
    } else {
      localStorage.removeItem(STYLE_KEY);
    }
  } catch {}
}
