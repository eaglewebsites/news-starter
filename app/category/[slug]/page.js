// app/category/[slug]/page.js

import CategoryListWithLoadMore from "@/components/CategoryListWithLoadMore";
import { getCurrentSiteKey } from "@/lib/site-detection-server";
import { getApiBase, NO_STORE } from "@/lib/api-base";

/* helpers */
function root(obj) {
  return obj && typeof obj === "object" && obj.data && typeof obj.data === "object" ? obj.data : obj;
}
function pick(obj, paths = []) {
  const o = root(obj);
  for (const p of paths) {
    const v = p.split(".").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), o);
    if (v != null && v !== "") return v;
  }
  return undefined;
}
function toPlainText(htmlLike) {
  if (!htmlLike || typeof htmlLike !== "string") return "";
  const text = htmlLike
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}
function makeSnippetFromPost(post, maxLen = 180) {
  const blocksJson = pick(post, ["blocks"]);
  if (blocksJson && typeof blocksJson === "string") {
    try {
      const blocks = JSON.parse(blocksJson);
      const para = Array.isArray(blocks) ? blocks.find(b => b?.type === "paragraph" && b?.data?.text) : null;
      if (para?.data?.text) {
        const s = toPlainText(para.data.text);
        if (s) return s.length > maxLen ? s.slice(0, maxLen - 1).trimEnd() + "…" : s;
      }
    } catch {}
  }
  const bodyHtml = pick(post, ["body", "content", "html"]);
  const text = toPlainText(bodyHtml);
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen - 1).trimEnd() + "…" : text;
}
function titleCase(s = "") {
  return s
    .split(/[-_ ]+/)
    .map(w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

async function fetchCategoryPage({ slug, site, limit = 24, offset = 0 }) {
  if (!slug) throw new Error("[category] Missing required param: slug");

  const BASE = getApiBase();
  const siteKey = (site ?? (await getCurrentSiteKey()) ?? "").toLowerCase();

  const qs = new URLSearchParams();
  qs.set("categories", slug);
  qs.set("public", "true");
  if (siteKey) qs.set("sites", siteKey); // only send if we have one
  qs.set("status", "published");
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));

  const url = `${BASE}/posts?${qs.toString()}`;
  console.log("[category][fetch]", url);

  const res = await fetch(url, NO_STORE);
  if (!res.ok) throw new Error(`[category] ${res.status} ${res.statusText}`);
  const data = await res.json();

  // be flexible about shapes
  const arr =
    Array.isArray(data) ? data
    : Array.isArray(data?.items) ? data.items
    : Array.isArray(data?.results) ? data.results
    : Array.isArray(data?.posts) ? data.posts
    : Array.isArray(data?.data?.items) ? data.data.items
    : Array.isArray(data?.data) ? data.data
    : [];

  const withSnippets = arr.map((item) => {
    const post = root(item);
    const _snippet = makeSnippetFromPost(post);
    return { ...item, _snippet };
  });

  return { items: withSnippets, siteKey };
}

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }) {
  const slug = (await params)?.slug;
  const PAGE_SIZE = 24;

  const siteKey = await getCurrentSiteKey();
  const sectionTitle = titleCase(String(slug || "Category"));

  let initialItems = [];
  try {
    const { items } = await fetchCategoryPage({ slug, site: siteKey, limit: PAGE_SIZE, offset: 0 });
    initialItems = items; // <-- use the array only
  } catch (e) {
    console.error("[category] initial fetch failed:", e);
    initialItems = [];
  }

  const isObits = /obit/i.test(String(slug || ""));
  const listProps = isObits
    ? {
        showControls: true,
        searchPlaceholder: "Search obituaries…",
        categoryLabel: "Filter",
        noCropImages: true,
      }
    : {};

  return (
    <main className="mx-auto w-full max-w-7xl px-4">
      <CategoryListWithLoadMore
        slug={slug}
        siteKey={siteKey}          // <-- pass siteKey down to the client component
        pageSize={PAGE_SIZE}
        sectionTitle={sectionTitle}
        initialItems={initialItems} // <-- array, not object
        {...listProps}
      />
    </main>
  );
}
