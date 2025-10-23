// components/EmbedIframe.js
"use client";

/**
 * Super-permissive embed iframe that renders arbitrary HTML via srcdoc.
 * We still keep it isolated from your main React tree, but we allow the
 * third-party script enough capabilities to initialize (forms, popups, etc.).
 */
import { useEffect, useMemo, useRef, useState } from "react";

export default function EmbedIframe({
  html = "",
  className = "",
  minHeight = 300,
  maxHeight = 2400,
  title = "Embedded content",
  // If a vendor refuses to run inside a sandboxed iframe, you can set this to true
  // to remove the sandbox entirely for that instance. (Use sparingly.)
  unsafeNoSandbox = false,
}) {
  const [height, setHeight] = useState(minHeight);
  const ref = useRef(null);

  // Wrap the provided HTML with a very small doc that also posts its height to the parent.
  const srcDoc = useMemo(() => {
    const doc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    html,body { margin:0; padding:0; }
    /* Keep a minimum so loaders are visible */
    ._embed-root { min-height: ${Math.max(40, minHeight)}px; }
  </style>
</head>
<body>
  <div class="_embed-root">${html}</div>

  <script>
    (function () {
      function postSize() {
        try {
          var h = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight,
            document.body.clientHeight,
            document.documentElement.clientHeight
          );
          parent.postMessage({ __embedResize: h }, "*");
        } catch (e) {}
      }
      // initial + on various mutations
      postSize();
      var ro = new ResizeObserver(postSize);
      ro.observe(document.body);

      // Some vendors (like Audience/Aptivada) take time; keep pinging for a bit.
      var tries = 0, t = setInterval(function () {
        tries++; postSize();
        if (tries > 50) clearInterval(t); // ~5s
      }, 100);
      window.addEventListener("load", postSize);
      document.addEventListener("DOMContentLoaded", postSize);
    })();
  </script>
</body>
</html>`;
    return doc;
  }, [html, minHeight]);

  useEffect(() => {
    function onMsg(e) {
      const data = e?.data;
      if (data && typeof data === "object" && data.__embedResize) {
        const newH = Math.max(minHeight, Math.min(maxHeight, Number(data.__embedResize) || minHeight));
        setHeight(newH);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [minHeight, maxHeight]);

  // IMPORTANT: for some vendors, we must allow more than just scripts+same-origin.
  // Audience/Aptivada specifically may open internal popups/iframes during init.
  // We keep a reasonably permissive default sandbox; you can turn it off per-instance via unsafeNoSandbox.
  const sandbox = unsafeNoSandbox
    ? undefined
    : [
        "allow-scripts",
        "allow-same-origin",
        "allow-forms",
        "allow-popups",
        "allow-popups-to-escape-sandbox",
        "allow-modals",
        "allow-presentation",
      ].join(" ");

  return (
    <iframe
      ref={ref}
      title={title}
      className={className || "w-full block"}
      style={{ width: "100%", height: `${height}px`, border: 0 }}
      srcDoc={srcDoc}
      // remove sandbox entirely if unsafeNoSandbox is true
      {...(sandbox ? { sandbox } : {})}
      // allow vendor media/popups if they need them
      allow="clipboard-write *; autoplay *; fullscreen *; geolocation *; microphone *; camera *; encrypted-media *; picture-in-picture *"
    />
  );
}
