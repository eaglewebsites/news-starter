// app/posts/[id]/page.js

import { headers } from "next/headers";
import ShareRow from "@/components/ShareRow";
import { getApiBase, NO_STORE } from "@/lib/api-base";

function root(obj) {
  return obj && typeof obj === "object" && obj.data && typeof obj === "object" ? obj.data : obj;
}
function pick(obj, paths = []) {
  const o = root(obj);
  for (const p of paths) {
    const v = p.split(".").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), o);
    if (v != null && v !== "") return v;
  }
  return undefined;
}
function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

async function fetchPostByIdOrSlug(idOrSlug, siteKey = "sandhills") {
  const BASE = getApiBase();
  const tries = [
    `${BASE}/posts?slug=${encodeURIComponent(idOrSlug)}&public=true&status=published&sites=${siteKey}&limit=5`,
    `${BASE}/posts/${encodeURIComponent(idOrSlug)}?public=true&status=published&sites=${siteKey}`,
    `${BASE}/posts?id=${encodeURIComponent(idOrSlug)}&public=true&status=published&sites=${siteKey}&limit=5`,
    `${BASE}/posts?search=${encodeURIComponent(idOrSlug)}&public=true&status=published&sites=${siteKey}&limit=10`,
  ];

  let lastErr = null;
  for (const url of tries) {
    const res = await fetch(url, NO_STORE);
    if (!res.ok) { lastErr = new Error(`[post] ${res.status} ${res.statusText}`); continue; }
    const data = await res.json();
    if (data && typeof data === "object" && !Array.isArray(data) && data.data) {
      const arr = Array.isArray(data.data) ? data.data : [data.data];
      if (arr.length) return arr[0];
    }
    if (Array.isArray(data) && data.length) return data[0];
  }
  throw lastErr || new Error("[post] Not Found");
}

export const dynamic = "force-dynamic";

export default async function PostPage({ params }) {
  const resolved = await params;
  const idOrSlug = resolved?.id;

  // Optional: pick site key from host header if you add multi-site later
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const siteKey = /sandhills/i.test(host) ? "sandhills" : "sandhills";

  let post = null;
  try {
    post = await fetchPostByIdOrSlug(idOrSlug, siteKey);
  } catch (e) {
    console.error("[post] initial fetch failed:", e);
    post = null;
  }

  if (!post) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-bold">Post not found</h1>
        <p className="mt-2 text-neutral-600">We couldn’t find that story.</p>
      </main>
    );
  }

  const title = pick(post, ["title", "headline"]) || "Untitled";
  const featured = pick(post, ["featured_image_url", "image", "photo", "og_image"]) || null;
  const bodyHtml = sanitizeHtml(pick(post, ["body", "content", "html"]) || "");

  return (
    <main className="mx-auto w-full max-w-4xl px-4">
      <article className="py-8">
        <a href="/" className="text-sm underline underline-offset-2">← Back</a>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-black">{title}</h1>

        {featured ? (
          <div className="mt-4">
            <img src={featured} alt={title} className="w-full h-auto rounded" />
          </div>
        ) : null}

        <div
          className="prose prose-neutral max-w-none mt-6"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        <ShareRow className="mt-8" />
      </article>
    </main>
  );
}
