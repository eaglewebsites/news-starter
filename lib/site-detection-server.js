// lib/site-detection-server.js
import 'server-only';
import { headers } from 'next/headers';

/**
 * Explicit map of hostnames -> site keys (fill out all 11 here).
 * Include apex + www + any subdomains you actually serve from.
 */
const HOST_TO_SITE = {
  // Sandhills
  'sandhillspost.com': 'sandhills',
  'www.sandhillspost.com': 'sandhills',

  // Salina
  'salinapost.com': 'salina',
  'www.salinapost.com': 'salina',

  // Great Bend
  'greatbendpost.com': 'greatbend',
  'www.greatbendpost.com': 'greatbend',

  // Dev / local (set to whichever market you prefer while developing)
  'localhost:3000': 'sandhills',
};

/** Normalize a host string. */
function normalizeHost(h) {
  return String(h || '').trim().toLowerCase();
}

/**
 * Heuristic fallback:
 * - take the second-level label (e.g., "salinapost" from "www.salinapost.com")
 * - if it ends with "post", strip it → "salina"
 */
function heuristicSiteKey(host) {
  const bare = host.split(':')[0]; // strip port
  const parts = bare.split('.').filter(Boolean);
  if (parts.length === 0) return '';
  const sld = parts.length === 1 ? parts[0] : parts[parts.length - 2]; // second-level label
  if (!sld) return '';
  return sld.endsWith('post') ? sld.slice(0, -4) : sld; // remove "post"
}

/**
 * Server-side lookup (safe in RSC / server files).
 * Order: explicit map → heuristic → empty string.
 */
export async function getCurrentSiteKey() {
  const h = await headers();
  const host = normalizeHost(h.get('x-forwarded-host') || h.get('host') || '');
  if (!host) return '';
  if (HOST_TO_SITE[host]) return HOST_TO_SITE[host];
  return heuristicSiteKey(host) || '';
}
