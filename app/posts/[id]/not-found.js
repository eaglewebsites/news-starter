// app/posts/[id]/not-found.js
export default function NotFound() {
  return (
    <div className="mx-auto max-w-screen-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Story not found</h1>
      <p className="mt-2 text-slate-600">
        It may have been removed or the link is incorrect.
      </p>
    </div>
  )
}
