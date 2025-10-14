// components/ExternalLinkEnforcer.js
"use client";

import { useEffect } from "react";

const INTERNAL_HOSTS = new Set([
  "sandhillspost.com",
  "salinapost.com",
  "greatbendpost.com",
  "hutchpost.com",
  "hayspost.com",
  "jcpost.com",
  "stjosephpost.com",
  "littleapplepost.com",
  // add others here if needed
]);

function normalizeHost(h) {
  return (h || "").replace(/^www\./i, "").toLowerCase();
}

function isSpecialScheme(href) {
  return /^mailto:|^tel:|^sms:|^geo:/i.test(href);
}

function isExternal(anchor) {
  const href = anchor.getAttribute("href") || "";
  if (!href) return false;
  if (isSpecialScheme(href)) return false;     // don't force new tab for mailto/tel/etc.
  if (/^([./?#]|$)/.test(href)) return false;  // relative/hash/query-only

  let url;
  try {
    // a.href resolves relative URLs against the current document automatically
    url = new URL(href, anchor.baseURI || window.location.href);
  } catch {
    return false;
  }
  const linkHost = normalizeHost(url.hostname);
  const here = normalizeHost(window.location.hostname);

  // Treat current host + known market hosts as internal
  if (linkHost === here) return false;
  if (INTERNAL_HOSTS.has(linkHost)) return false;

  // Everything else is external
  return true;
}

function enforce(container = document) {
  // Scope this to likely nav containers to avoid touching article bodies if you prefer:
  // const scope = container.querySelectorAll("header a, nav a, [data-nav] a, [data-menu] a");
  const scope = container.querySelectorAll("a[href]");

  scope.forEach((a) => {
    // Opt-out: allow same tab by adding data-same-tab on a specific link
    if (a.hasAttribute("data-same-tab")) return;

    if (isExternal(a)) {
      a.setAttribute("target", "_blank");
      // keep noopener for security; add noreferrer to avoid referrer leakage
      const prevRel = (a.getAttribute("rel") || "").toLowerCase();
      const rel = new Set(prevRel.split(/\s+/).filter(Boolean));
      rel.add("noopener");
      rel.add("noreferrer");
      a.setAttribute("rel", Array.from(rel).join(" "));
    }
  });
}

export default function ExternalLinkEnforcer() {
  useEffect(() => {
    // Initial pass
    enforce(document);

    // Observe future DOM changes (menus rendered after user interaction)
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList") {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === 1) enforce(n); // element
          });
        }
      }
    });

    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => mo.disconnect();
  }, []);

  return null;
}
