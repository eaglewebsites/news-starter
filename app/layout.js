// app/layout.js
import "./globals.css";
import TopBanner from "@/components/TopBanner";
import SiteHeader from "@/components/SiteHeader";
import ExternalLinkEnforcer from "@/components/ExternalLinkEnforcer";
import { SITES } from "@/lib/sites";
import { getCurrentSiteKey } from "@/lib/site-detection-server";
import { fetchSiteMenu } from "@/lib/menu-api";
import Script from "next/script";

export default async function RootLayout({ children }) {
  const siteKey = await getCurrentSiteKey(); // server-side OK to await
  const siteCfg = SITES[siteKey] || SITES.sandhills;

  let menu = { links: [] };
  try {
    menu = await fetchSiteMenu(siteKey);
  } catch (e) {
    console.error("Failed to load site menu:", e);
  }

  return (
    <html lang="en">
      <body className="antialiased">
        

        <Script
          id="audience-bootstrap"
          src="https://xp.audience.io/widget.js"
          strategy="afterInteractive"
        />

        {/* Ensures true external domains open in a new tab across the site */}
        <ExternalLinkEnforcer />

        <TopBanner stations={siteCfg.stations} />
        <SiteHeader logo={siteCfg.logo} stations={siteCfg.stations} menu={menu} />
        {children}
      </body>
    </html>
  );
}
