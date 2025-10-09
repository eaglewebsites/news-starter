// app/posts/[id]/loading.js
export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <div className="animate-pulse">
        <div className="h-8 w-3/4 bg-neutral-200 rounded" />
        <div className="mt-4 h-4 w-1/3 bg-neutral-200 rounded" />
        <div className="mt-6 aspect-[16/9] w-full bg-neutral-200 rounded-xl" />
        <div className="mt-6 space-y-3">
          <div className="h-4 bg-neutral-200 rounded" />
          <div className="h-4 bg-neutral-200 rounded w-5/6" />
          <div className="h-4 bg-neutral-200 rounded w-2/3" />
        </div>
      </div>
    </main>
  );
}
