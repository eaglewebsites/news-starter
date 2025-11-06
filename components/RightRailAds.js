// components/RightRailAds.js
"use client";

import { useEffect, useMemo } from "react";
import { getSiteKeySync } from "@/lib/site-detection-client";

/**
 * Shared right-rail ad stack (non-sticky).
 *
 * Defaults:
 *  - slotIds: ["gam-rr-top","taboola-right-rail-1","gam-rr-mid","taboola-right-rail-2","gam-rr-bottom","gam-rr-extra"]
 *  - Each slot renders a 300x250 placeholder box (CLS-safe). Replace with your ad calls.
 *
 * Props:
 *  - slotIds?: string[]           // explicit IDs per slot (recommended)
 *  - pageType?: "list"|"category"|"post"|string
 *  - siteKey?: string             // overrides detected site key
 *  - className?: string
 */
export default function RightRailAds({
  slotIds,
  pageType = "",
  siteKey,
  className = "",
}) {
  const site = siteKey || getSiteKeySync() || "";

  const ids = useMemo(() => {
    if (Array.isArray(slotIds) && slotIds.length) return slotIds;
    // Default, consistent across all pages
    return [
      "gam-rr-top",
      "taboola-right-rail-1",
      "gam-rr-mid",
      "taboola-right-rail-2",
      "gam-rr-bottom",
      "gam-rr-extra",
    ];
  }, [slotIds]);

  useEffect(() => {
    // --- OPTIONAL bootstrap examples (leave commented until you wire real ads) ---
    // GPT (GAM) refresh example:
    // if (window.googletag?.cmd) {
    //   window.googletag.cmd.push(() => {
    //     try { window.googletag.pubads().refresh(); } catch {}
    //   });
    // }
    //
    // Taboola target example for known containers:
    // if (window._taboola) {
    //   const targets = ids.filter(id => /^taboola-/.test(id));
    //   targets.forEach(id => {
    //     window._taboola.push({
    //       mode: "thumbnails-rr",
    //       container: id,
    //       placement: id.replace(/^taboola-/, "").replace(/-/g, " ").replace(/\b\w/g, s => s.toUpperCase()),
    //       target_type: "mix",
    //     });
    //   });
    // }
  }, [ids, site, pageType]);

  return (
    <div className={["flex flex-col gap-8", className].join(" ").trim()}>
      {ids.map((id) => (
        <div
          key={id}
          id={id}
          data-slot="right-rail"
          data-site={site}
          data-page-type={pageType}
          className="flex h-[250px] w-[300px] items-center justify-center bg-neutral-200 text-neutral-700"
        >
          AD HERE
        </div>
      ))}
    </div>
  );
}
