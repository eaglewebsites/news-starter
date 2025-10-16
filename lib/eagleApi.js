// lib/eagleApi.js
import { getApiBase, NO_STORE } from "@/lib/api-base";
import { getCurrentSiteKey } from "./site-detection.js";

/* ----------------------------- small helpers ----------------------------- */

async function getSiteLower(site) {
  const detected = site ?? (await getCurrentSiteKey()) ?? "";
  return String(detected).toLowerCase();
}

function mapApiPostToArticle(post) {
  if (!post) return null;
  return {
    id: post.id ?? null,
    slug: post.slug || null,
    title: post.title || "",
    body: post.body || "", // HTML
    image: post.featured_image || post.featured_image_thumbnail || null,
    updated: post.published
      ? new Date(post.published).toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null,
  };
}

function timeAgo(iso) {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - then);
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } catch {
    return "";
  }
}

function mapHomeCategoriesJson(json) {
  const cats = json?.data?.categories ?? [];
  return cats.flatMap((cat) =>
    (cat?.data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      href: `/posts/${item.id}`,
      category: (item.categories && item.categories[0]) || cat.title || "News",
      published: item.published,
    }))
  );
}

/* ------------------------------ home sections ----------------------------- */

export async function fetchHomeLocal({ site, limit = 12 } = {}) {
  const BASE = getApiBase();
  const siteKey = await getSiteLower(site);
  const url = `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=local`;

  try {
    const res = await fetch(url, NO_STORE);
    if (!res.ok) throw new Error(`fetchHomeLocal HTTP ${res.status}`);
    const json = await res.json();

    const categories = json?.data?.categories || [];
    const localArr =
      categories.find((c) => (c?.title || "").toLowerCase() === "local")?.data || [];

    return localArr
      .filter(Boolean)
      .sort((a, b) => new Date(b?.published || 0) - new Date(a?.published || 0))
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        title: p.title,
        image: p.featured_image_thumbnail || p.featured_image,
        updated: p.published,
        href: `/posts/${p.id}`,
      }));
  } catch (err) {
    console.error("[fetchHomeLocal]", err);
    return [];
  }
}

export async function fetchHomePodcasts({ site, limit = 12, debug = false } = {}) {
  const BASE = getApiBase();
  const siteKey = await getSiteLower(site);
  const tries = [
    `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=podcast`,
    `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=podcasts`,
  ];

  let items = [];

  for (const url of tries) {
    try {
      debug && console.log("[fetchHomePodcasts] URL:", url);
      const res = await fetch(url, NO_STORE);
      if (!res.ok) {
        debug && console.warn("[fetchHomePodcasts] non-OK:", res.status);
        continue;
      }
      const json = await res.json();

      const categories = json?.data?.categories || [];
      const podArr =
        categories.find((c) => {
          const t = (c?.title || "").toLowerCase();
          return t === "podcast" || t === "podcasts";
        })?.data || [];

      items = podArr
        .filter(Boolean)
        .sort((a, b) => new Date(b?.published || 0) - new Date(a?.published || 0))
        .slice(0, limit)
        .map((p) => ({
          id: p.id,
          title: p.title,
          image: p.featured_image_thumbnail || p.featured_image,
          updated: p.published,
          href: `/posts/${p.id}`,
        }));

      if (items.length) break;
    } catch (err) {
      console.error("[fetchHomePodcasts]", err);
    }
  }

  debug && console.log("[fetchHomePodcasts] items:", items.length);
  return items;
}

export async function fetchHomeRegional({ site, limit = 12 } = {}) {
  const BASE = getApiBase();
  const siteKey = await getSiteLower(site);
  const url = `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=state`;

  try {
    const res = await fetch(url, NO_STORE);
    if (!res.ok) throw new Error(`fetchHomeRegional HTTP ${res.status}`);
    const json = await res.json();

    const categories = json?.data?.categories || [];
    const regionalArr =
      categories.find((c) => (c?.title || "").toLowerCase() === "state")?.data || [];

    return regionalArr
      .filter(Boolean)
      .sort((a, b) => new Date(b?.published || 0) - new Date(a?.published || 0))
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        title: p.title,
        image: p.featured_image_thumbnail || p.featured_image,
        updated: p.published,
        href: `/posts/${p.id}`,
      }));
  } catch (err) {
    console.error("[fetchHomeRegional]", err);
    return [];
  }
}

export async function fetchHomeSports({ site, limit = 12 } = {}) {
  const BASE = getApiBase();
  const siteKey = await getSiteLower(site);
  const url = `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=sports`;

  try {
    const res = await fetch(url, NO_STORE);
    if (!res.ok) throw new Error(`fetchHomeSports HTTP ${res.status}`);
    const json = await res.json();

    const categories = json?.data?.categories || [];
    const sportsArr =
      categories.find((c) => (c?.title || "").toLowerCase() === "sports")?.data || [];

    return sportsArr
      .filter(Boolean)
      .sort((a, b) => new Date(b?.published || 0) - new Date(a?.published || 0))
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        title: p.title,
        image: p.featured_image_thumbnail || p.featured_image,
        updated: p.published,
        href: `/posts/${p.id}`,
      }));
  } catch (err) {
    console.error("[fetchHomeSports]", err);
    return [];
  }
}

export async function fetchHomeFeatured({ site } = {}) {
  const BASE = getApiBase();
  const siteKey = await getSiteLower(site);
  const url = `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=featured`;

  try {
    const res = await fetch(url, NO_STORE);
    if (!res.ok) throw new Error(`fetchHomeFeatured HTTP ${res.status}`);
    const json = await res.json();

    const hero = json?.data?.featured_post;
    if (hero) {
      return {
        id: hero.id,
        title: hero.title,
        featured_image: hero.featured_image,
        featured_image_thumbnail: hero.featured_image_thumbnail,
        published: hero.published,
        categories: hero.categories,
        href: `/posts/${hero.id}`,
      };
    }

    const cats = json?.data?.categories || [];
    const featuredArr =
      cats.find((c) => (c?.title || "").toLowerCase() === "featured")?.data || [];
    const first = featuredArr[0];
    return first
      ? {
          id: first.id,
          title: first.title,
          featured_image: first.featured_image,
          featured_image_thumbnail: first.featured_image_thumbnail,
          published: first.published,
          categories: first.categories,
          href: `/posts/${first.id}`,
        }
      : null;
  } catch (err) {
    console.error("[fetchHomeFeatured]", err);
    return null;
  }
}

/* ---------------------------- “More stories” lane --------------------------- */

export async function fetchHomeMore({
  site,
  categories = ["local", "regional", "state"],
  limit = 8,
  excludeId,
  debug = false,
} = {}) {
  const BASE = getApiBase();
  const siteLower = await getSiteLower(site);
  const cats = categories.map((c) => `${c}`.toLowerCase());

  if (debug) {
    console.log(`[fetchHomeMore] site="${siteLower}", cats=[${cats.join(", ")}]`);
  }

  let all = [];

  // 1) multi-category attempt
  try {
    const multiUrl = new URL(`${BASE}/home`);
    multiUrl.searchParams.set("site", siteLower);
    multiUrl.searchParams.set("categories", cats.join(","));
    if (debug) console.log("[fetchHomeMore] multi URL:", multiUrl.toString());

    const res = await fetch(multiUrl.toString(), NO_STORE);
    if (res.ok) {
      const json = await res.json();
      all = mapHomeCategoriesJson(json);
      if (debug) console.log("[fetchHomeMore] multi got", all.length, "items");
    } else if (debug) {
      console.warn("[fetchHomeMore] multi non-OK:", res.status);
    }
  } catch (e) {
    if (debug) console.warn("[fetchHomeMore] multi error:", e);
  }

  // 2) fallback per-category if empty
  if (!all || all.length === 0) {
    const perCat = await Promise.allSettled(
      cats.map(async (cat) => {
        const url = new URL(`${BASE}/home`);
        url.searchParams.set("site", siteLower);
        url.searchParams.set("categories", cat);

        const res = await fetch(url.toString(), NO_STORE);
        if (!res.ok) throw new Error(`${cat} ${res.status}`);
        const json = await res.json();
        return mapHomeCategoriesJson(json);
      })
    );
    all = perCat
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);
  }

  if (excludeId) {
    all = all.filter((i) => i.id !== excludeId);
  }

  const seen = new Set();
  all.sort((a, b) => new Date(b.published) - new Date(a.published));
  const unique = [];
  for (const item of all) {
    const key = item.id || item.href || `${item.title}-${item.published}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  const sliced = unique.slice(0, limit);

  return sliced.map((i) => ({
    slug: i.id,
    title: i.title,
    meta: `${i.category} • ${timeAgo(i.published)}`,
    href: i.href,
  }));
}

/* ----------------------------- single article ------------------------------ */

export async function fetchArticleById({ id, site } = {}) {
  const BASE = getApiBase();
  const siteKey = (site ?? (await getCurrentSiteKey()) ?? "sandhills").toLowerCase();

  const urls = [
    `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=featured`,
    `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=sports`,
  ];

  for (const url of urls) {
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) continue;
    const json = await res.json();

    const fp = json?.data?.featured_post;
    if (fp?.id === id) return mapApiPostToArticle(fp);

    const cats = Array.isArray(json?.data?.categories) ? json.data.categories : [];
    for (const c of cats) {
      const found = (c?.data || []).find((p) => p.id === id);
      if (found) return mapApiPostToArticle(found);
    }
  }

  // If your API supports a direct endpoint, you can switch to it:
  // const res = await fetch(`${BASE}/post?id=${encodeURIComponent(id)}`, { next: { revalidate: 30 } });
  // if (res.ok) {
  //   const json = await res.json();
  //   return mapApiPostToArticle(json?.data || json?.post);
  // }

  return null;
}
