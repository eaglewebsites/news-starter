// components/Byline.js
export default function Byline({ author, updatedISO, updatedLabel, updated }) {
  // Backwards-compat: if only `updated` is provided, treat it as the label.
  const label = updatedLabel || updated || null

  // Use a valid ISO string for the machine-readable datetime (if provided).
  const dateTime = updatedISO || undefined

  if (!author && !label) return null

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
      {author && (
        <span>
          By <span className="font-medium text-slate-800">{author}</span>
        </span>
      )}
      {author && label && <span aria-hidden="true">•</span>}
      {label && <time dateTime={dateTime}>{label}</time>}
    </div>
  )
}
