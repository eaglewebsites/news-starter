// app/section/[slug]/page.js
import { notFound } from 'next/navigation';
import { getCurrentSiteKey } from '@/lib/site-detection-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const slug = params?.slug ?? '';
  const title = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Section';
  return {
    title,
    description: `Latest ${slug || 'section'} news.`,
  };
}

export default async function SectionPage({ params }) {
  const slug = params?.slug;
  if (!slug) notFound();

  // server-side site detection (safe here)
  const site = await getCurrentSiteKey();

  // TODO: replace with real fetch, e.g. fetchSectionPosts(site, slug)
  const placeholderStories = [
    { id: 1, title: `Sample ${slug} Story`, href: `/posts/example-id` },
    { id: 2, title: `Another ${slug} Headline`, href: `/posts/example-id` },
  ];

  return (
    <main className="mx-auto max-w-screen-xl px-4 pb-10 sm:pb-12 md:pb-16">
      <h1 className="text-3xl font-semibold capitalize">{slug}</h1>
      <p className="mt-2 text-slate-600">Site: {site || '(unknown)'}</p>

      <ul className="mt-6 space-y-3">
        {placeholderStories.map((story) => (
          <li key={story.id}>
            <a
              href={story.href}
              className="block rounded-lg border px-4 py-3 hover:bg-slate-50"
            >
              {story.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
