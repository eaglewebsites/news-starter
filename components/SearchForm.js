// components/SearchForm.js
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function SearchForm({ initialQuery = "" }) {
  const [q, setQ] = useState(initialQuery || "");
  const router = useRouter();

  // Keep input in sync if user navigates back/forward
  useEffect(() => setQ(initialQuery || ""), [initialQuery]);

  function onSubmit(e) {
    e.preventDefault(); // submit manually
    const term = (q || "").trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-[720px] gap-2 px-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search stories…"
        aria-label="Search"
        className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-black placeholder-black/50 focus:outline-none focus:ring-2 focus:ring-sky-400"
      />
      <button
        type="submit"
        className="rounded-md bg-[#012A3D] px-4 py-2 font-semibold text-white hover:bg-[#013552]"
      >
        Search
      </button>
    </form>
  );
}
