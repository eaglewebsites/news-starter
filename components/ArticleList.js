'use client';

import { useEffect, useState } from "react";
import { safeHref } from '@/lib/link-helpers'
import Link from "next/link";


function formatDate(input) {
  try {
    const d = new Date(input);
    if (isNaN(d)) return null;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

export default function ArticleList() {
  const [articles, setArticles] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/articles?limit=20")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => setArticles(Array.isArray(data) ? data : []))
      .catch((e) => setErr(e.message || "Failed to load articles"))
      .finally(() => setLoading(false));
  }, []);

  if (err) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <strong className="font-semibold">Error:</strong> {err}
      </div>
    );
  }

  if (loading) {
    return (
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-gray-100" />
            <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-gray-100" />
            <div className="mt-4 h-3 w-24 animate-pulse rounded bg-gray-200" />
          </li>
        ))}
      </ul>
    );
  }

  if (!articles.length) {
    return (
      <div className="rounded-md border border-gray-200 bg-white p-6 text-center text-gray-600">
        No articles found.
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((a) => {
        const published = formatDate(a.publishedAt || a.date || a.createdAt);
        return (
          <li
            key={a.id || a.slug}
            className="group rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <Link href={safeHref(`/articles/${a.slug}`)} className="block">
              <h2 className="text-lg font-semibold leading-snug tracking-tight group-hover:underline">
                {a.title}
              </h2>
              {a.summary ? (
                <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                  {a.summary}
                </p>
              ) : null}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                {published && <span>{published}</span>}
                {/* Optional tag/badge spot */}
                {a.category && (
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">
                    {a.category}
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
