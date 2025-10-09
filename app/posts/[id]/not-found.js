"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">We couldn’t load this story</h1>
      <p className="mt-2 text-sm text-neutral-600">
        It may have been unpublished or moved.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border px-4 py-2"
        >
          Go Back
        </button>
        <Link href="/" className="rounded-lg bg-black text-white px-4 py-2">
          Go Home
        </Link>
      </div>
    </main>
  );
}
