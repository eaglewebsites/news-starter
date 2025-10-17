// lib/api/pages.js
import { getCurrentSiteKey } from "@/lib/site-detection-server";

const eagleUrl = (slug, siteParam) =>
  `https://api.eaglewebservices.com/v3/pages?slug=${encodeURIComponent(slug)}&site=${encodeURIComponent(siteParam)}`;

async function getJson(url) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "EWS-NextApp/1.0 (+pages)" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

// Extract a single page object from common shapes
function pickPageObject(json) {
  if (!json || typeof json !== "object") return null;
  const d = json.data ?? json;

  if (Array.isArray(d?.pages) && d.pages.length) return d.pages[0];
  if (d?.page && typeof d.page === "object") return d.page;
  if (Array.isArray(d) && d.length) return d[0];
  if (Array.isArray(json.pages) && json.pages.length) return json.pages[0];
  if (json.page && typeof json.page === "object") return json.page;

  // Fallback: treat `data` as the page object if it looks like one
  if (d && typeof d === "object" && (d.title || d.body || d.body_html || d.html)) return d;

  return null;
}

function normalizePage(p) {
  if (!p || typeof p !== "object") return null;

  const title = p.title || p.name || "Untitled Page";
  const bodyHtml = p.body_html || p.html || p.body || "";
  const image =
    p.featured_image || p.image || p.hero?.src || null;
  const imageCaption =
    p.image_caption || p.hero?.caption || p.caption || null;
  const updated = p.updated_at || p.published || p.created_at || null;

  if (!title && !bodyHtml) return null;
  return { title, bodyHtml, image, imageCaption, updated };
}

export async function fetchPageBySlug(slug) {
  const siteKey = (await getCurrentSiteKey()) || "sandhills";

  // Try the siteKey first (e.g., "sandhills", "salina"), then a conservative fallback.
  const siteParams = [siteKey, `${siteKey}post`];

  for (const sp of siteParams) {
    const json = await getJson(eagleUrl(slug, sp));
    if (!json) continue;
    const picked = pickPageObject(json);
    const page = normalizePage(picked);
    if (page) return page;
  }

  return null;
}
