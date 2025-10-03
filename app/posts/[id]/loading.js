// app/posts/[id]/loading.js
export default function Loading() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 animate-pulse">
      <div className="h-8 w-2/3 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-1/2 rounded bg-slate-200" />
      <div className="mt-6 h-80 w-full rounded-2xl bg-slate-200" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 w-full rounded bg-slate-200" />
        ))}
      </div>
    </div>
  )
}
