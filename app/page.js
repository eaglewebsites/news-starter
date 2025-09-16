'use client';

import { useSession } from "next-auth/react";
import AdSlot from "@/components/AdSlot";
import ArticleList from "@/components/ArticleList";

export default function Home() {
  const { data: session } = useSession();
  const isPaid = session?.user?.subscription === "paid";

  return (
    <main>
      <h1 style={{marginBottom:16}}>Latest News</h1>
      {!isPaid && <AdSlot network="taboola" slot="homepage-top" />}
      <ArticleList />
      {!isPaid && <div className="mt-6"><AdSlot network="gam" slot="homepage-bottom" /></div>}
    </main>
  );
}
