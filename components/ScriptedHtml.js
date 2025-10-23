// components/ScriptedHtml.js
"use client";

import { useEffect, useRef } from "react";

/**
 * Renders raw HTML and (safely) executes a small allowlist of <script src="…"> tags
 * AFTER mount, to avoid hydration mismatch. We do NOT mutate the HTML string during
 * render — React sees the same markup SSR and on the first client paint.
 *
 * Only add sources you trust to ALLOWLIST. Inline scripts are ignored by default.
 */
const ALLOWLIST = new Set([
  // X/Twitter is handled by TwitterEmbeds component, so not needed here
  "https://xp.audience.io/widget.js",        // Aptivada / Audience
  // add more allowed script src URLs here if needed
]);

function isAllowedSrc(src) {
  if (!src) return false;
  try {
    const u = new URL(src, typeof window !== "undefined" ? window.location.href : "http://localhost");
    const full = u.href;
    if (ALLOWLIST.has(full)) return true;
    // also allow bare origin match if you prefer:
    const originMatch = Array.from(ALLOWLIST).some((s) => {
      try { return new URL(s).origin === u.origin; } catch { return false; }
    });
    return originMatch;
  } catch {
    return false;
  }
}

export default function ScriptedHtml({ html = "", className = "" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Prevent double-running in React StrictMode/dev refreshes
    if (el.dataset.scriptsExecuted === "1") return;
    el.dataset.scriptsExecuted = "1";

    // Find any <script> tags that were part of the HTML
    const scripts = Array.from(el.querySelectorAll("script"));

    scripts.forEach((oldScript) => {
      const src = oldScript.getAttribute("src");
      const type = (oldScript.getAttribute("type") || "").trim().toLowerCase();

      // We only support allowed external scripts; ignore inline JS by default.
      if (src && isAllowedSrc(src)) {
        const newScript = document.createElement("script");
        // Copy attributes we care about
        newScript.src = src;
        if (oldScript.async) newScript.async = true;
        if (oldScript.defer) newScript.defer = true;
        if (type) newScript.type = type;

        // Replace in DOM to trigger execution
        oldScript.parentNode?.insertBefore(newScript, oldScript);
        oldScript.remove();
      } else {
        // Remove disallowed/inline scripts so they don't hang around inert
        oldScript.remove();
      }
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={className}
      // Render the EXACT html we got. We don't massage/normalize here.
      dangerouslySetInnerHTML={{ __html: html }}
      // Tell React it's okay if the DOM under here mutates after hydration.
      suppressHydrationWarning
    />
  );
}
