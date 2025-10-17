// lib/api/post.js
import { getCurrentSiteKey } from "@/lib/site-detection-server";
import { getApiBase, NO_STORE } from "@/lib/api-base";

export const DEBUG = false;

const TITLE_KEYS = ["title","post_title","headline","name","title_plain","post_title_plain","headline_plain","title.rendered"];
const BODY_KEYS  = ["content_html","rendered","html","post_content","contentRendered","body_html","article_html","article","body","content","content.rendered","body.html","article.html"];
const ID_KEYS    = ["id","post_id","ID","uuid","guid","nid","node_id"];
const SLUG_KEYS  = ["slug","post_slug","seo_slug"];

function get(obj, path, fallback=""){ try{ return path.split(".").reduce((a,k)=>a&&a[k]!=null?a[k]:undefined,obj) ?? fallback; }catch{ return fallback; } }
function s(v){ return v==null ? "" : String(v); }
function lc(v){ return s(v).toLowerCase(); }
function hasAnyKey(o, keys){ return keys.some(k => get(o,k) != null && get(o,k) !== ""); }
function isIdMatch(item, token){ const t=s(token); return ID_KEYS.some(k => s(item?.[k])===t); }
function isSlugMatch(item, token){ const t=lc(token); return SLUG_KEYS.some(k => lc(item?.[k])===t); }
function isLikelyId(token){ return /^[a-f0-9-]{16,}$/i.test(String(token)); }

function extractArray(data){
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.posts)) return data.posts;
  if (data.data && Array.isArray(data.data.items)) return data.data.items;
  if (data.data && Array.isArray(data.data)) return data.data;
  return [];
}

const WRAP_KEYS_PRIORITY = ["entry","post","article","story","item","result","data"];

function unwrapDeep(obj, maxSteps=24){
  let cur = obj;
  for (let i=0;i<maxSteps;i++){
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) break;
    if (hasAnyKey(cur, TITLE_KEYS) || hasAnyKey(cur, BODY_KEYS) || hasAnyKey(cur, SLUG_KEYS) || hasAnyKey(cur, ID_KEYS)) {
      return cur;
    }
    let descended = false;
    for (const k of WRAP_KEYS_PRIORITY){
      const v = cur[k];
      if (v && typeof v === "object" && !Array.isArray(v)){ cur = v; descended = true; break; }
    }
    if (descended) continue;
    for (const k of ["results","items","posts"]){
      const arr = cur[k];
      if (Array.isArray(arr) && arr.length){ cur = arr[0]; descended = true; break; }
    }
    if (descended) continue;
    break;
  }
  return cur;
}

function findFirstContentObject(obj, depth=0){
  if (!obj || typeof obj !== "object" || depth>24) return null;
  if (hasAnyKey(obj,TITLE_KEYS) || hasAnyKey(obj,BODY_KEYS) || hasAnyKey(obj,SLUG_KEYS) || hasAnyKey(obj,ID_KEYS)) return obj;
  for (const v of Object.values(obj)){
    if (v && typeof v === "object"){
      if (Array.isArray(v)){
        for (const el of v){ const hit=findFirstContentObject(el,depth+1); if (hit) return hit; }
      } else {
        const hit=findFirstContentObject(v,depth+1); if (hit) return hit;
      }
    }
  }
  return null;
}

function unwrapCandidates(obj){
  if (!obj || typeof obj !== "object") return [];
  const out = new Set();

  out.add(unwrapDeep(obj));
  for (const k of WRAP_KEYS_PRIORITY){ if (obj[k] && typeof obj[k] === "object") out.add(unwrapDeep(obj[k])); }
  for (const k of ["results","items","posts"]){ const arr=obj[k]; if (Array.isArray(arr) && arr[0]) out.add(unwrapDeep(arr[0])); }
  if (obj.data && typeof obj.data === "object"){
    for (const k of ["results","items","posts"]){ const arr=obj.data[k]; if (Array.isArray(arr) && arr[0]) out.add(unwrapDeep(arr[0])); }
  }

  const list = Array.from(out).filter(Boolean);
  if (!list.some(o => hasAnyKey(o,TITLE_KEYS) || hasAnyKey(o,BODY_KEYS) || hasAnyKey(o,SLUG_KEYS) || hasAnyKey(o,ID_KEYS))){
    const hit = findFirstContentObject(obj);
    if (hit) list.unshift(hit);
  }
  return list;
}

function pickExact(list, token){
  let hit = list.find(p=>isSlugMatch(p, token));
  if (hit) return hit;
  hit = list.find(p=>isIdMatch(p, token));
  if (hit) return hit;
  if (list.length === 1) return list[0];
  return null;
}

function buildCandidates(BASE, token, siteKey){
  const enc = encodeURIComponent;
  const qp = {
    common: `public=true&status=published`,
    common_old: `public=true&status=publish`,
    site_plural: `sites=${enc(siteKey)}`
  };

  const byId = [
    `${BASE}/posts?id=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?post_id=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?uuid=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?guid=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?nid=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?node_id=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts/${enc(token)}?${qp.common}&${qp.site_plural}`,
    `${BASE}/posts/${enc(token)}?${qp.common_old}&${qp.site_plural}`,
  ];

  const bySlug = [
    `${BASE}/posts?slug=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?post_slug=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?seo_slug=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts/${enc(token)}?${qp.common}&${qp.site_plural}`,
  ];

  const search = [
    `${BASE}/posts?search=${enc(token)}&${qp.common}&${qp.site_plural}&limit=10`,
    `${BASE}/search?search=${enc(token)}&${qp.site_plural}&limit=10`,
  ];

  const urls = isLikelyId(token) ? [...byId, ...bySlug, ...search] : [...bySlug, ...byId, ...search];
  return Array.from(new Set(urls));
}

export function normalizeFullPost(p){
  const slug =
    p.slug || p.post_slug || p.seo_slug ||
    p.id || p.post_id || p.uuid || p.guid || null;

  const title =
    p.title || p.post_title || p.headline || p.name ||
    get(p,"title.rendered") || p.title_plain || p.post_title_plain || p.headline_plain ||
    "Untitled";

  const author =
    (p.author && (p.author.name || p.author.display_name)) ||
    p.byline || p.author_name || p.authorName || p.creator || "";

  const updated =
    p.updated || p.updated_at || p.modified || p.modified_at ||
    p.published_at || p.date || p.created_at || null;

  const image =
    p.image || p.featured_image || p.image_url || p.featured_image_url ||
    get(p,"featured_media.url") || get(p,"featured_media.src") ||
    get(p,"og_image") || get(p,"meta.image") || p.cover_image || p.hero_image || null;

  const caption =
    p.image_caption || get(p,"featured_media.caption") || p.caption || p.photo_credit || "";

  const bodyHtml =
    p.content_html || p.rendered || p.html || p.post_content || p.contentRendered ||
    p.body_html || p.article_html || p.article || p.body || p.content ||
    get(p,"content.rendered") || get(p,"body.html") || get(p,"article.html") || "";

  return {
    id: p.id ?? p.post_id ?? p.uuid ?? p.guid ?? slug ?? null,
    slug,
    title,
    author,
    updated,
    categories: p.categories || p.category || p.tags || [],
    image,
    caption,
    bodyHtml,
    _raw: p,
  };
}

export async function fetchPostByIdOrSlug({ idOrSlug, site }){
  if (!idOrSlug) throw new Error("[post] Missing idOrSlug");

  const siteKey = (site ?? (await getCurrentSiteKey()) ?? "").toLowerCase();
  const BASE = getApiBase();
  const urls = buildCandidates(BASE, idOrSlug, siteKey);

  let lastErr = null;

  for (const url of urls) {
    try {
      if (DEBUG) console.log("[post][fetch]", url);
      const res = await fetch(url, NO_STORE);
      if (!res.ok) { lastErr = new Error(`[post] ${res.status} ${res.statusText}`); continue; }

      let data = null;
      try { data = await res.json(); } catch { data = null; }

      if (data && typeof data === "object" && !Array.isArray(data)) {
        const cands = unwrapCandidates(data);
        const exact = pickExact(cands, idOrSlug);
        if (exact) return normalizeFullPost(exact);
        if (cands.length === 1) return normalizeFullPost(cands[0]);
        continue;
      }

      const arr = extractArray(data);
      if (arr.length > 0) {
        const exact = pickExact(arr, idOrSlug);
        if (exact) return normalizeFullPost(exact);
        if (arr.length === 1) return normalizeFullPost(arr[0]);
        continue;
      }
    } catch (e) {
      lastErr = e;
      continue;
    }
  }

  throw lastErr || new Error(`[post] Not found for: ${idOrSlug}`);
}
