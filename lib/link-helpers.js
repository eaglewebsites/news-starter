// lib/link-helpers.js

/**
 * Removes only "sandhillspost.dev" from a string, leaving other domains untouched.
 */
export function stripDevDomain(str) {
  if (typeof str !== "string") return str
  return str
    .replace(/https?:\/\/sandhillspost\.dev/gi, "")
    .replace(/sandhillspost\.dev/gi, "")
}

/**
 * Accepts either a string/object (href) or a menu item object.
 * Always returns something valid for <Link href={...}> (string or object).
 * Falls back to "/" if nothing usable exists.
 */
export function safeHref(valOrItem) {
  // Handle menu item objects
  if (valOrItem && typeof valOrItem === "object" && !("pathname" in valOrItem)) {
    const candidates = [
      valOrItem.href,
      valOrItem.url,
      valOrItem.path,
      valOrItem.link,
      valOrItem.permalink,
    ]
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return stripDevDomain(c.trim())
      if (c && typeof c === "object") return c // Next.js href object
    }
    return "/" // fallback if nothing usable
  }

  // Handle direct href strings
  if (typeof valOrItem === "string" && valOrItem.trim())
    return stripDevDomain(valOrItem.trim())

  // Handle already-valid href objects (Next.js style)
  if (valOrItem && typeof valOrItem === "object") return valOrItem

  // Last resort fallback
  return "/"
}

/**
 * Builds a stable, unique key for React list items.
 * Prevents duplicate-key warnings in mapped lists,
 * even if multiple items resolve to the same href (like "/").
 */
export function keyOf(item, idx) {
  // Prefer explicit identifiers if available
  const explicit =
    item?.id ??
    item?.slug ??
    item?.uid ??
    item?.key ??
    null
  if (explicit != null && String(explicit).trim() !== "") {
    return String(explicit)
  }

  // Combine text and link fields for uniqueness
  const title =
    item?.title ||
    item?.label ||
    item?.name ||
    item?.text ||
    "item"

  const linkish =
    item?.href ||
    item?.url ||
    item?.path ||
    item?.link ||
    "nohref"

  // Append index to guarantee uniqueness
  return `${title}::${linkish}::${idx}`
}
