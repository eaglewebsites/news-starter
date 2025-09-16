import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function ArticlePage({ params }) {
  const session = await getServerSession(authOptions);
  const isPaid = session?.user?.subscription === "paid";

  // Mock content — replace with your external API call
  const article = {
    title: `Example: ${params.slug}`,
    preview: "This is the free preview of the article.",
    content:
      "Full article content for paid users goes here. Replace with your API content.",
  };

  return (
    <main style={{maxWidth:720, margin:'40px auto'}}>
      <h1 style={{marginBottom:12}}>{article.title}</h1>
      <div style={{fontSize:18, lineHeight:1.6}}>
        {isPaid ? (
          <p>{article.content}</p>
        ) : (
          <>
            <p>{article.preview}</p>
            <div className="mt-6 border rounded p-4" style={{background:'#fffbe6', borderColor:'#ffe58f'}}>
              <p style={{marginBottom:12, fontWeight:600}}>
                Subscribe to read the full article.
              </p>
              <Link href="/subscribe" className="p-2 rounded" style={{background:'#000', color:'#fff'}}>
                Go to Subscription Page
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
