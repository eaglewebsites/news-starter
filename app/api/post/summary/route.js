// app/api/post/summary/route.js
import { NextResponse } from "next/server";

/* ----------------- small utils ----------------- */
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

/* ----- snippet extractors (first meaningful paragraph) ----- */
function snippetFromBlocksFirst(blocksValue) {
  try {
    let parsed = blocksValue;
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    const arr = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.blocks) ? parsed.blocks : null);
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
    const body = post.bodyHtml || post.body_html || post.body || post.content_html || post.content || "";
    text = snippetFromBodyFirst(body);
  }
  text = (text || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxChars ? text.slice(0, maxChars).replace(/\s+\S*$/, "") + "…" : text;
}

/* ----- exact match check against list item context ----- */
function valuesOf(obj, keys = []) {
  const o = unwrap(obj) || {};
  const out = [];
  for (const k of keys) if (o[k] != null && o[k] !== "") out.push(String(o[k]));
  return out;
}
function exactMatchCandidate(cand, ctx) {
  const c = unwrap(cand);
  if (!c) return false;

  // 1) strong id matches
  const candIds = new Set(valuesOf(c, ["id", "uuid", "guid"]));
  for (const k of ["id", "uuid", "guid"]) {
    if (ctx[k] && candIds.has(String(ctx[k]))) return true;
  }

  // 2) slug matches
  const candSlugs = new Set(valuesOf(c, ["slug", "seo_slug", "post_slug"]));
  for (const k of ["slug", "seo_slug", "post_slug"]) {
    if (ctx[k] && candSlugs.has(String(ctx[k]))) return true;
  }

  // 3) title strict equality (normalized). Use only if we have a title in ctx.
  if (ctx.title && (c.title || c.headline)) {
    if (norm(ctx.title) && norm(ctx.title) === norm(c.title || c.headline)) return true;
  }

  return false;
}

/* ----------------- fetch helpers ----------------- */
async function tryFetch(url) {
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    // From client (list item context):
    const site = (searchParams.get("site") || "sandhills").toLowerCase();
    const ctx = {
      id: searchParams.get("id") || null,
      uuid: searchParams.get("uuid") || null,
      guid: searchParams.get("guid") || null,
      slug: searchParams.get("slug") || null,
      seo_slug: searchParams.get("seo_slug") || null,
      post_slug: searchParams.get("post_slug") || null,
      title: searchParams.get("title") || null,
    };

    if (!ctx.id && !ctx.uuid && !ctx.guid && !ctx.slug && !ctx.seo_slug && !ctx.post_slug && !ctx.title) {
      return NextResponse.json({ ok: false, error: "missing identifiers" }, { status: 400 });
    }

    // Build a robust set of attempts
    const attempts = [];

    // A. slug-based lookups first (most reliable)
    for (const s of [ctx.slug, ctx.seo_slug, ctx.post_slug]) {
      if (s) {
        attempts.push(
          new URL(`https://api.eaglewebservices.com/v3/posts?slug=${encodeURIComponent(s)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=5`)
        );
        attempts.push(
          new URL(`https://api.eaglewebservices.com/v3/posts?post_slug=${encodeURIComponent(s)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=5`)
        );
        attempts.push(
          new URL(`https://api.eaglewebservices.com/v3/posts?seo_slug=${encodeURIComponent(s)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=5`)
        );
        attempts.push(
          new URL(`https://api.eaglewebservices.com/v3/posts/${encodeURIComponent(s)}?public=true&status=published&sites=${encodeURIComponent(site)}`)
        );
      }
    }

    // B. id-based lookups
    for (const idlike of [ctx.id, ctx.uuid, ctx.guid]) {
      if (idlike) {
        attempts.push(
          new URL(`https://api.eaglewebservices.com/v3/posts?id=${encodeURIComponent(idlike)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=5`)
        );
        attempts.push(
          new URL(`https://api.eaglewebservices.com/v3/posts?uuid=${encodeURIComponent(idlike)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=5`)
        );
        attempts.push(
          new URL(`https://api.eaglewebservices.com/v3/posts?guid=${encodeURIComponent(idlike)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=5`)
        );
        attempts.push(
          new URL(`https://api.eaglewebservices.com/v3/posts/${encodeURIComponent(idlike)}?public=true&status=published&sites=${encodeURIComponent(site)}`)
        );
      }
    }

    // C. as a last attempt, search by title (tight match later)
    if (ctx.title) {
      attempts.push(
        new URL(`https://api.eaglewebservices.com/v3/posts?search=${encodeURIComponent(ctx.title)}&public=true&status=published&sites=${encodeURIComponent(site)}&limit=10`)
      );
      attempts.push(
        new URL(`https://api.eaglewebservices.com/v3/search?search=${encodeURIComponent(ctx.title)}&sites=${encodeURIComponent(site)}&limit=10`)
      );
    }

    let picked = null;

    // Run attempts and pick exact match only
    for (const url of attempts) {
      const data = await tryFetch(url);
      if (!data) continue;
      const arr = normalizeArray(data);
      for (const cand of arr) {
        if (exactMatchCandidate(cand, ctx)) {
          picked = cand;
          break;
        }
      }
      if (picked) break;
    }

    if (!picked) {
      return NextResponse.json({ ok: false, error: "not found (no exact match)" }, { status: 404 });
    }

    const snippet = deriveSnippetFromDetail(picked);
    return NextResponse.json({ ok: true, snippet });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}
