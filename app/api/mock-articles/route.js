export async function GET() {
  return Response.json([
    { id: 1, slug: "breaking-news-1", title: "Breaking News 1", summary: "Mock summary for article 1." },
    { id: 2, slug: "latest-update-2", title: "Latest Update 2", summary: "Mock summary for article 2." }
  ]);
}
