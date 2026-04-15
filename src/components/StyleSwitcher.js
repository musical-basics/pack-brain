"use client";

import Link from "next/link";
import { setStoredStyle } from "@/lib/prefs";

// `classes` lets each page override styles (CSS modules on /home2, global on /).
export default function StyleSwitcher({ currentStyle, listQuery = "", classes = {} }) {
  const root = classes.root || "style-switcher";
  const btn = classes.btn || "style-switcher-btn";
  const active = classes.active || "active";

  const cls = (isActive) => (isActive ? `${btn} ${active}` : btn);

  return (
    <div className={root} role="tablist" aria-label="Style">
      <Link
        href={`/${listQuery}`}
        className={cls(currentStyle === "classic")}
        onClick={() => setStoredStyle("classic")}
        role="tab"
        aria-selected={currentStyle === "classic"}
      >
        🖼 Classic
      </Link>
      <Link
        href={`/home2${listQuery}`}
        className={cls(currentStyle === "modern")}
        onClick={() => setStoredStyle("modern")}
        role="tab"
        aria-selected={currentStyle === "modern"}
      >
        ✨ Modern
      </Link>
    </div>
  );
}
