// components/SnippetEmbed.js
"use client";

/**
 * SnippetEmbed
 *
 * For Audience/Aptivada blocks, we don't iframe their public page (which often
 * sets X-Frame-Options). Instead, we create a sandboxed inline document (srcDoc)
 * that includes their <script src="https://xp.audience.io/widget.js"> and the
 * required <div class="aptivada-widget" data-widget-id="..."> markup. Their JS
 * then boots inside that iframe, reliably and without hydration churn.
 *
 * For anything else, we fall back to plain text.
 */

import { useMemo } from "react";

function extractAudienceWidgetId(html = "") {
  try {
    const m = String(html).match(/data-widget-id=["'](\d+)["']/i);
    return m ? m[1] : "";
  } catch {
    return "";
  }
}

function extractAudienceHref(html = "") {
  try {
    const m = String(html).match(
      /href=["'](https?:\/\/(?:xp\.)?audience\.io\/[^\s"'<>]+)["']/i
    );
    return m ? m[1] : "";
  } catch {
    return "";
  }
}

export default function SnippetEmbed({
  html = "",
  text = "",
  className = "",
  height = 620, // Typical Audience widgets need ~500-700px
}) {
  const trimmed = useMemo(() => String(html || "").trim(), [html]);

  const isAudience = useMemo(
    () => /aptivada-widget|xp\.audience\.io|cdn3\.aptivada\.com|audience\.io/i.test(trimmed),
    [trimmed]
  );

  if (isAudience) {
    const wid = extractAudienceWidgetId(trimmed);
    const fallbackHref = extractAudienceHref(trimmed);

    if (wid) {
      // Minimal HTML host that mirrors their typical embed markup
      const srcDoc = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    html,body { margin:0; padding:0; }
    .frame-host { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body class="frame-host">
  <div class="aptivada-widget" data-widget-id="${wid}" data-widget-type="app">
    <div>
      <div style="background:#ffffff url('https://cdn3.aptivada.com/images/iframeLoader.gif') no-repeat center; min-height:500px;"></div>
      <a style="display:block; max-width:fit-content; margin-left:auto; margin-right:auto;" target="_blank" href="${fallbackHref || `https://xp.audience.io/gallery/${wid}`}">Campaign not loading? Click here</a>
    </div>
  </div>
  <script async src="https://xp.audience.io/widget.js"></script>
</body>
</html>`.trim();

      return (
        <div className={className}>
          <div className="rounded border border-neutral-200 overflow-hidden">
            <iframe
              title={`Audience contest ${wid}`}
              // Inline document that boots their JS
              srcDoc={srcDoc}
              style={{ width: "100%", height: `${height}px`, border: 0 }}
              // Allow their script to execute inside the sandbox
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              loading="lazy"
            />
          </div>

          {/* Accessible fallback link (and iframes disabled case) */}
          <div className="mt-2 text-sm">
            <a
              href={fallbackHref || `https://xp.audience.io/gallery/${wid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-sky-700 hover:text-sky-800"
            >
              Open this contest in a new tab
            </a>
          </div>
        </div>
      );
    }

    // Couldn’t find a widget id — just show text fallback
    return <p className={className}>{text || "Contest"}</p>;
  }

  // Non-Audience: plain text snippet
  return <p className={className}>{text}</p>;
}
