// app/api/category/route.js
import { NextResponse } from "next/server";
import { fetchCategoryPosts } from "@/lib/api/categories";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const limit = Number(searchParams.get("limit") ?? 24);
    const offset = Number(searchParams.get("offset") ?? 0);

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const items = await fetchCategoryPosts({ slug, limit, offset });
    const nextOffset = offset + items.length;
    const hasMore = items.length === limit;

    return NextResponse.json({ items, nextOffset, hasMore });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
