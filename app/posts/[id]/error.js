// app/posts/[id]/error.js
'use client'

export default function Error({ error, reset }) {
  return (
    <div className="mx-auto max-w-screen-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">We couldn’t load this story</h1>
      <p className="mt-2 text-slate-600">
        {error?.message || 'Please try again.'}
      </p>
      <button
        onClick={() => reset?.()}
        className="mt-6 rounded-xl border px-4 py-2 hover:bg-slate-50"
      >
        Retry
      </button>
    </div>
  )
}
