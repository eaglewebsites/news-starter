// app/dev/embed-test/page.js
"use client";

import { useEffect, useRef, useState } from "react";
import EmbedIframe from "@/components/EmbedIframe"; // the one we added
import ScriptedHtml from "@/components/ScriptedHtml"; // the page-level one that worked on story pages

export default function EmbedTestPage() {
  // ⬇️ Paste ONE of your raw widget HTML blocks here between backticks
  const [html] = useState(`
<!-- PASTE YOUR RAW SNIPPET HERE (exactly as CMS stores it) -->
  `);

  // Inline mount area (same strategy used on article pages)
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = ""; // reset
  }, [html]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold mb-4">Embed Test</h1>

      <h2 className="font-semibold mt-6 mb-2">A) Iframe (srcdoc)</h2>
      <EmbedIframe html={html} minHeight={240} maxHeight={2400} />

      <h2 className="font-semibold mt-8 mb-2">B) Inline ScriptedHtml (same DOM as parent)</h2>
      <div className="border rounded p-3">
        <ScriptedHtml html={html} containerProps={{ className: "min-h-[200px]" }} />
      </div>

      <p className="mt-6 text-sm text-neutral-600">
        Tell me which one renders correctly (if either). That tells us whether the vendor blocks iframes or requires parent-window context.
      </p>
    </main>
  );
}
