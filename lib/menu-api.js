// lib/menu-api.js
const API_BASE = "https://api.eaglewebservices.com/v3";

// Map our internal site keys -> API site param (preferred case first)
const SITE_PARAM = {
  sandhills: ["Sandhills", "sandhills"],
  // add others as needed, preferred casing first:
  // northplatte: ["NorthPlatte", "northplatte"],
};

function toBool(v) {
  return v === true || v === "true";
}

function normalizeLink(link) {
  return {
    title: link?.title ?? "",
    link: link?.link ?? "#",
    external: toBool(link?.external),
    target: link?.target || (toBool(link?.external) ? "_blank" : "_self"),
    sublinks: Array.isArray(link?.sublinks)
      ? link.sublinks.map((s) => ({
          title: s?.title ?? "",
          link: s?.link ?? "#",
          external: toBool(s?.external),
          target: s?.target || (toBool(s?.external) ? "_blank" : "_self"),
        }))
      : [],
  };
}

const FALLBACK_MENU = {
  links: [
    { title: "Local", link: "/category/local" },
    { title: "Sports", link: "/category/sports" },
    { title: "Obituaries", link: "/category/obituaries" },
    {
      title: "Listen Live",
      link: "#",
      sublinks: [
        { title: "Flatrock 100.7", link: "https://flatrock1007.com/", external: true },
        { title: "Z 93.5 Country", link: "https://z935country.com/", external: true },
        { title: "Mix 97 One", link: "https://mix97one.com/", external: true },
        { title: "Q Country Classics, 107.3", link: "https://knpqcountry.com/", external: true },
        { title: "FM 98.1 & AM 1410", link: "https://kooqfm981.com/", external: true },
      ],
    },
    { title: "Sandhills Spotlight", link: "/pages/sandhills-spotlight" },
    { title: "Lake Mac Report", link: "/category/lake-mac-report" },
    { title: "Contests", link: "/category/contests" },
    { title: "Big Deals Store", link: "https://northplatte.bigdealsmedia.net/", external: true },
    {
      title: "More",
      link: "#",
      sublinks: [
        { title: "Contact Us", link: "/pages/contact-us" },
        { title: "Privacy Policy", link: "/pages/privacy-policy" },
      ],
    },
  ],
};

export async function fetchSiteMenu(siteKey = "sandhills") {
  const candidates = SITE_PARAM[siteKey] || [siteKey];

  // Try each candidate until one returns links
  for (const siteParam of candidates) {
    const url = `${API_BASE}/menus?site=${encodeURIComponent(siteParam)}`;

    try {
      //if (process.env.NODE_ENV !== "production") {
        //console.log("[menu] fetching:", url);
      //}

      const res = await fetch(url, {
        // server-side fetch; no CORS concerns
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "EWS-NextApp/1.0 (+menu-fetch)",
        },
      });

      if (!res.ok) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[menu] non-200:", res.status, await res.text());
        }
        continue; // try next candidate
      }

      const json = await res.json();
      const rawLinks = json?.data?.[0]?.links ?? [];
      

      if (rawLinks.length > 0) {
        return {
          links: rawLinks.map(normalizeLink),
        };
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[menu] fetch error for", siteParam, err);
      }
      // try next candidate
    }
  }

  // Nothing worked — return a safe fallback so UI is never empty
  if (process.env.NODE_ENV !== "production") {
    console.warn("[menu] using FALLBACK_MENU");
  }
  return FALLBACK_MENU;
}
