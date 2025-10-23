// components/TwitterEmbeds.js
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function TwitterEmbeds() {
  const pathname = usePathname();

  useEffect(() => {
    // Inject the script once
    const SCRIPT_ID = 'x-platform-widgets';
    function load() {
      // Ask the library to (re)scan the DOM for <blockquote class="twitter-tweet">…
      // Guard for SSR/first paint
      if (typeof window !== 'undefined' && window.twttr && window.twttr.widgets) {
        window.twttr.widgets.load(document);
      }
    }

    // If script already present, just load()
    if (document.getElementById(SCRIPT_ID)) {
      load();
      return;
    }

    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.async = true;
    s.src = 'https://platform.twitter.com/widgets.js';
    s.charset = 'utf-8';
    s.onload = load;
    document.body.appendChild(s);

    // No cleanup needed; we keep it for the whole session
  }, [pathname]); // re-run on route change so newly-rendered tweets get upgraded

  return null;
}
