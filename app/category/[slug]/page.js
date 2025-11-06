// app/category/[slug]/page.js

import CategoryListWithLoadMore from "@/components/CategoryListWithLoadMore";
import RightRailAds from "@/components/RightRailAds";
import { getCurrentSiteKey } from "@/lib/site-detection-server";
import { getApiBase, NO_STORE } from "@/lib/api-base";

/* tiny helpers */
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

/* text helpers */
function toPlainText(htmlLike) {
  if (!htmlLike || typeof htmlLike !== "string") return "";
  const text = htmlLike
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}
function makeSnippetFromPostHtml(html = "", maxLen = 180) {
  const text = toPlainText(html);
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen - 1).trimEnd() + "…" : text;
}
function extractFirstAllowedEmbed(html = "") {
  if (!html) return "";
  const twBlock = html.match(/<blockquote[^>]*class=["'][^"']*twitter-tweet[^"']*["'][\s\S]*?<\/blockquote>/i);
  if (twBlock) {
    const hasTwScript = /<script[^>]*src=["']https?:\/\/platform\.twitter\.com\/widgets\.js["'][^>]*><\/script>/i.test(html);
    const script = hasTwScript ? "" : `<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`;
    return `${twBlock[0]}${script}`;
  }
  const scoreDiv = html.match(/<div[^>]*class=["'][^"']*scorestream-widget-container[^"']*["'][^>]*>[\s\S]*?<\/div>/i);
  if (scoreDiv) {
    const hasScoreScript = /<script[^>]*src=["']https?:\/\/scorestream\.com\/apiJsCdn\/widgets\/embed\.js["'][^>]*><\/script>/i.test(html);
    const script = hasScoreScript ? "" : `<script async type="text/javascript" src="https://scorestream.com/apiJsCdn/widgets/embed.js"></script>`;
    return `${scoreDiv[0]}${script}`;
  }
  const aptivadaDiv = html.match(/<div[^>]*class=["'][^"']*aptivada-widget[^"']*["'][^>]*>[\s\S]*?<\/div>/i);
  if (aptivadaDiv) {
    const hasAptScript = /<script[^>]*src=["']https?:\/\/xp\.audience\.io\/widget\.js["'][^>]*><\/script>/i.test(html);
    const script = hasAptScript ? "" : `<script src="https://xp.audience.io/widget.js"></script>`;
    return `${aptivadaDiv[0]}${script}`;
  }
  return "";
}
function titleCase(s = "") {
  return s
    .split(/[-_ ]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

/* fetcher */
async function fetchCategoryPage({ slug, site, limit = 24, offset = 0 }) {
  if (!slug) throw new Error("[category] Missing required param: slug");
  const BASE = getApiBase();
  const siteKey = (site ?? (await getCurrentSiteKey()) ?? "").toLowerCase();

  const qs = new URLSearchParams();
  qs.set("categories", slug);
  qs.set("public", "true");
  if (siteKey) qs.set("sites", siteKey);
  qs.set("status", "published");
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));

  const url = `${BASE}/posts?${qs.toString()}`;
  const res = await fetch(url, NO_STORE);
  if (!res.ok) throw new Error(`[category] ${res.status} ${res.statusText}`);
  const data = await res.json();

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
    const bodyHtml =
      pick(post, ["body", "content", "html", "article_html", "body_html", "content_html"]) || "";
    const _embedHtml = extractFirstAllowedEmbed(bodyHtml);
    const _snippet = makeSnippetFromPostHtml(bodyHtml);
    return { ...item, _snippet, _embedHtml };
  });

  return { items: withSnippets, siteKey };
}

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }) {
  const resolved = await params;
  const slug = resolved?.slug;
  const PAGE_SIZE = 24;

  const siteKey = await getCurrentSiteKey();
  const sectionTitle = titleCase(String(slug || "Category"));

  let initialItems = [];
  try {
    const { items } = await fetchCategoryPage({ slug, site: siteKey, limit: PAGE_SIZE, offset: 0 });
    initialItems = items;
  } catch (e) {
    console.error("[category] initial fetch failed:", e);
    initialItems = [];
  }

  const isObits = /obit/i.test(String(slug || ""));
  const listProps = isObits
    ? { showControls: true, searchPlaceholder: "Search obituaries…", categoryLabel: "Filter", noCropImages: true }
    : {};

  return (
    <section className="not-prose mx-auto w-full max-w-6xl px-4 pb-[100px]">
      <h2 className="section-underline-local text-xl font-bold tracking-tight text-black mb-3">
        {sectionTitle}
      </h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left: initial SSR + Load More (no rail inside) */}
        <div>
          <CategoryListWithLoadMore
            slug={slug}
            siteKey={siteKey}
            pageSize={PAGE_SIZE}
            sectionTitle={sectionTitle}
            initialItems={initialItems}
            {...listProps}
          />
        </div>

        {/* Right: the ONLY right rail for this page */}
        <aside className="hidden lg:block">
          <RightRailAds
            pageType="category"
            slotIds={[
              "gam-rr-top",
              "taboola-right-rail-1",
              "gam-rr-mid",
              "taboola-right-rail-2",
              "gam-rr-bottom",
              "gam-rr-extra",
            ]}
          />
        </aside>
      </div>
    </section>
  );
}
