"use client";

import { useMemo } from "react";

export default function ShareRow({ title, url }) {
  // Use the server-provided url; do NOT change it on the client to avoid hydration mismatches.
  const shareUrl = url || "";
  const shareTitle = title || "";

  const { twitter, facebook, mailto } = useMemo(() => {
    const encUrl = encodeURIComponent(shareUrl);
    const encTitle = encodeURIComponent(shareTitle);

    return {
      twitter: `https://twitter.com/intent/tweet?text=${encTitle}&url=${encUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
      mailto: `mailto:?subject=${encTitle}&body=${encUrl}`,
    };
  }, [shareUrl, shareTitle]);

  // Base buttons: black text by default, white on hover (brand bg)
  const baseBtn =
    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium no-underline " +
    "border border-neutral-200 text-neutral-900 " +
    "hover:bg-[#012A3D] hover:!text-white visited:hover:!text-white transition-colors " +
    "dark:border-neutral-700";

  // Brand button: dark brand background, white text
  const brandBtn =
    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium no-underline " +
    "bg-[#012A3D] text-white hover:opacity-90 transition-colors";

  async function copyLink(e) {
    e.preventDefault();
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Optional: toast/snackbar could go here
    } catch {}
  }

  async function nativeShare(e) {
    e.preventDefault();
    if (navigator.share && shareUrl) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
      } catch {}
    } else {
      copyLink(e);
    }
  }

  return (
    <div className="not-prose mt-10 flex flex-wrap items-center gap-3">
      <a href={twitter} target="_blank" rel="noopener noreferrer" className={baseBtn} aria-label="Share on X">
        <span>Share on X</span>
      </a>
      <a href={facebook} target="_blank" rel="noopener noreferrer" className={baseBtn} aria-label="Share on Facebook">
        <span>Facebook</span>
      </a>
      <a href={mailto} className={baseBtn} aria-label="Share by email">
        <span>Email</span>
      </a>
      <button onClick={copyLink} className={baseBtn} aria-label="Copy link">
        <span>Copy Link</span>
      </button>
      <button onClick={nativeShare} className={brandBtn} aria-label="Share">
        <span>Share</span>
      </button>
    </div>
  );
}
