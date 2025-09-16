'use client';

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ArticleList() {
  const [articles, setArticles] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch("/api/mock-articles")
      .then(r => r.json())
      .then(setArticles)
      .catch(() => setErr("Failed to load articles"));
  }, []);

  if (err) return <p className="text-red-600">{err}</p>;

  return (
    <ul style={{display:'grid', gap:16}}>
      {articles.map(a => (
        <li key={a.id} className="border rounded p-4">
          <Link href={`/articles/${a.slug}`}>
            <strong style={{fontSize:18}}>{a.title}</strong>
          </Link>
          <p style={{opacity:0.8}}>{a.summary}</p>
        </li>
      ))}
    </ul>
  );
}
