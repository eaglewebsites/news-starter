// app/api/post/summary/batch/route.js
import { NextResponse } from "next/server";

/* ----------------- utilities ----------------- */
const NO_STORE = { cache: "no-store" };

function stripHtml(html = "") {
  return String(html)
    .replace(/&nbsp;/g, " ")
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function normalizeArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return [payload];
  }
  return [];
}
function unwrap(obj) {
  return obj && obj.data && typeof obj.data === "object" ? obj.data : obj;
}
function norm(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/['’"“”`]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ----- snippet extractors ----- */
function snippetFromBlocksFirst(blocksValue) {
  try {
    let parsed = blocksValue;
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    const arr = Array.isArray(parsed)
      ? parsed
      : parsed && Array.isArray(parsed.blocks)
      ? parsed.blocks
      : null;
    if (!arr) return "";
    for (const b of arr) {
      if (!b || !b.type || !b.data) continue;
      if ((b.type === "paragraph" || b.type === "text" || b.type === "p") && typeof b.data.text === "string") {
        const t = stripHtml(b.data.text);
        if (t) return t;
      }
    }
    const raw = arr.find((b) => b && b.type === "raw" && b.data && typeof b.data.html === "string");
    return raw ? stripHtml(raw.data.html) : "";
  } catch {
    return "";
  }
}
function snippetFromBodyFirst(html = "") {
  if (!html) return "";
  const cleaned = String(html).replace(/&nbsp;/g, " ");
  const noFigures = cleaned.replace(/<figure[\s\S]*?<\/figure>/gi, " ");
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(noFigures))) {
    const text = stripHtml(m[1] || "");
    if (text) return text;
  }
  return stripHtml(noFigures);
}
function deriveSnippetFromDetail(detail, maxChars = 220) {
  const post = unwrap(detail);
  let text = "";
  if (post.blocks) text = snippetFromBlocksFirst(post.blocks);
  if (!text) {
    const body =
      post.bodyHtml || post.body_html || post.body || post.content_html || post.content || "";
    text = snippetFromBodyFirst(body);
  }
  text = (text || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxChars ? text.slice(0, maxChars).replace(/\s+\S*$/, "") + "…" : text;
}

/* ----- strict match helpers ----- */
function valuesOf(obj, keys = []) {
  const o = unwrap(obj) || {};
  const out = [];
  for (const k of keys) if (o[k] != null && o[k] !== "") out.push(String(o[k]));
  return out;
}
function exactMatchCandidate(cand, ctx) {
  const c = unwrap(cand);
  if (!c) return false;

  // ids
  const candIds = new Set(valuesOf(c, ["id", "uuid", "guid"]));
  for (const k of ["id", "uuid", "guid"]) {
    if (ctx[k] && candIds.has(String(ctx[k]))) return true;
  }

  // slugs
  const candSlugs = new Set(valuesOf(c, ["slug", "seo_slug", "post_slug"]));
  for (const k of ["slug", "seo_slug", "post_slug"]) {
    if (ctx[k] && candSlugs.has(String(ctx[k]))) return true;
  }

  // exact title (normalized)
  if (ctx.title && (c.title || c.headline)) {
    if (norm(ctx.title) && norm(ctx.title) === norm(c.title || c.headline)) return true;
  }

  return false;
}
async function tryFetch(url) {
  const res = await fetch(url.toString(), NO_STORE);
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

/* ----------------- batch route ----------------- */
export async function POST(req) {
  try {
    const payload = await req.json().catch(() => ({}));
    const site = (payload.site || "sandhills").toLowerCase();
    const items = Array.isArray(payload.items) ? payload.items : [];

    if (!items.length) {
      return NextResponse.json({ ok: false, error: "no items" }, { status: 400 });
    }

    // Prepare contexts
    const ctxs = items.map((item) => {
      const ctx = {
        id: item.id ?? null,
        uuid: item.uuid ?? null,
        guid: item.guid ?? null,
        slug: item.slug ?? item.seo_slug ?? item.post_slug ?? null,
        seo_slug: item.seo_slug ?? null,
        post_slug: item.post_slug ?? null,
        title: item.title ?? item.headline ?? null,
      };
      const key = ctx.slug || ctx.id || ctx.uuid || ctx.guid || ctx.title || Math.random().toString(36).slice(2);
      return { key, ctx };
    });

    // Build attempts per ctx
    function attemptsForCtx(ctx) {
      const urls = [];

      // slug-like
      for (const s of [ctx.slug, ctx.seo_slug, ctx.post_slug]) {
        if (s) {
          urls.push(new URL(`https://api.eaglewebservices.com/v3/posts?slug=${encodeURIComponent(s)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=5`));
          urls.push(new URL(`https://api.eaglewebservices.com/v3/posts?post_slug=${encodeURIComponent(s)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=5`));
          urls.push(new URL(`https://api.eaglewebservices.com/v3/posts?seo_slug=${encodeURIComponent(s)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=5`));
          urls.push(new URL(`https://api.eaglewebservices.com/v3/posts/${encodeURIComponent(s)}?public=true&status=published&sites=${encodeURIComponent(site)}`));
        }
      }
      // id-like
      for (const idlike of [ctx.id, ctx.uuid, ctx.guid]) {
        if (idlike) {
          urls.push(new URL(`https://api.eaglewebservices.com/v3/posts?id=${encodeURIComponent(idlike)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=5`));
          urls.push(new URL(`https://api.eaglewebservices.com/v3/posts?uuid=${encodeURIComponent(idlike)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=5`));
          urls.push(new URL(`https://api.eaglewebservices.com/v3/posts?guid=${encodeURIComponent(idlike)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=5`));
          urls.push(new URL(`https://api.eaglewebservices.com/v3/posts/${encodeURIComponent(idlike)}?public=true&status=published&sites=${encodeURIComponent(site)}`));
        }
      }
      // title search last
      if (ctx.title) {
        urls.push(new URL(`https://api.eaglewebservices.com/v3/posts?search=${encodeURIComponent(ctx.title)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=10`));
        urls.push(new URL(`https://api.eaglewebservices.com/v3/search?search=${encodeURIComponent(ctx.title)}&sites=${encodeURIComponent(site)}&limit=10`));
      }
      return urls;
    }

    // Concurrency
    const MAX = 8;
    const queue = [...ctxs];
    const resultMap = {};

    async function worker() {
      while (queue.length) {
        const { key, ctx } = queue.shift();
        let picked = null;

        for (const url of attemptsForCtx(ctx)) {
          const data = await tryFetch(url);
          if (!data) continue;
          const arr = normalizeArray(data);
          for (const cand of arr) {
            if (exactMatchCandidate(cand, ctx)) { picked = cand; break; }
          }
          if (picked) break;
        }

        let snippet = "";
        if (picked) snippet = deriveSnippetFromDetail(picked);
        resultMap[key] = snippet || "";
      }
    }

    await Promise.all(Array.from({ length: Math.min(MAX, ctxs.length) }, worker));
    return NextResponse.json({ ok: true, map: resultMap });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}
