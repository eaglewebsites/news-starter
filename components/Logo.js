'use client';

import { useEffect, useState } from "react";

const logoMap = {
  "hayspost.com": "/logos/hayspost.svg",
  // Add your other domains here, each with its own logo path
};

export default function Logo() {
  const [src, setSrc] = useState("/logos/default.svg");

  useEffect(() => {
    const host = window.location.hostname.replace(/^www\./, "");
    if (logoMap[host]) setSrc(logoMap[host]);
  }, []);

  return <img src={src} alt="Site Logo" style={{height:40}} />;
}
