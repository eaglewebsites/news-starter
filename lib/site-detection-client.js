// lib/site-detection-client.js
'use client';

/**
 * Explicit map of hostnames -> site keys (mirror server file).
 * Fill out all 11 here as well so client-only components don’t guess wrong.
 */
const HOST_TO_SITE = {
  'sandhillspost.com': 'sandhills',
  'www.sandhillspost.com': 'sandhills',

  'salinapost.com': 'salina',
  'www.salinapost.com': 'salina',

  'greatbendpost.com': 'greatbend',
  'www.greatbendpost.com': 'greatbend',

  // local dev
  'localhost:3000': 'sandhills',
};

function normalizeHost(h) {
  return String(h || '').trim().toLowerCase();
}

/** Same heuristic as server: second-level label, strip trailing "post". */
function heuristicSiteKey(host) {
  const bare = host.split(':')[0];
  const parts = bare.split('.').filter(Boolean);
  if (parts.length === 0) return '';
  const sld = parts.length === 1 ? parts[0] : parts[parts.length - 2];
  if (!sld) return '';
  return sld.endsWith('post') ? sld.slice(0, -4) : sld;
}

/**
 * Synchronous client-side lookup (safe for client components).
 * Order: explicit map → heuristic → empty string.
 */
export function getSiteKeySync() {
  if (typeof window === 'undefined') return '';
  const host = normalizeHost(window.location.host || '');
  if (!host) return '';
  if (HOST_TO_SITE[host]) return HOST_TO_SITE[host];
  return heuristicSiteKey(host) || '';
}
