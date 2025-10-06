// app/section/[slug]/page.js
import { notFound } from 'next/navigation'
import { getCurrentSiteKey } from '@/lib/site-detection'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { slug } = params
  return {
    title: slug.charAt(0).toUpperCase() + slug.slice(1),
    description: `Latest ${slug} news.`,
  }
}

export default async function SectionPage({ params }) {
  const { slug } = params
  const site = await getCurrentSiteKey()

  // Later this will fetch data like:
  // const stories = await fetchSectionPosts(site, slug)
  // For now, we’ll use a placeholder
  const placeholderStories = [
    { id: 1, title: `Sample ${slug} Story`, href: `/posts/example-id` },
    { id: 2, title: `Another ${slug} Headline`, href: `/posts/example-id` },
  ]

  if (!slug) notFound()

  return (
    <main className="mx-auto max-w-screen-xl px-4 pb-10 sm:pb-12 md:pb-16">
      <h1 className="text-3xl font-semibold capitalize">{slug}</h1>
      <p className="mt-2 text-slate-600">Site: {site}</p>

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
  )
}
