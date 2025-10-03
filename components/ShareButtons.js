// components/ShareButtons.js
'use client'

export default function ShareButtons({ title }) {
  const share = () => {
    if (navigator.share) {
      navigator
        .share({ title, url: window.location.href })
        .catch(() => {})
    } else {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => alert('Link copied to clipboard'))
        .catch(() => {})
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={share}
        className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        Share
      </button>
    </div>
  )
}
