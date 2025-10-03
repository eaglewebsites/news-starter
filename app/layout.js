// app/layout.js
import "./globals.css";
import TopBanner from "@/components/TopBanner";
import SiteHeader from "@/components/SiteHeader";
import { SITES } from "@/lib/sites";
import { getCurrentSiteKey } from "@/lib/site-detection";
import { fetchSiteMenu } from "@/lib/menu-api";

export default async function RootLayout({ children }) {
  const siteKey = await getCurrentSiteKey(); // ← await it now
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
        <TopBanner stations={siteCfg.stations} />
        <SiteHeader logo={siteCfg.logo} stations={siteCfg.stations} menu={menu} />
        {children}
      </body>
    </html>
  );
}
