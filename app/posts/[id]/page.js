// app/posts/[id]/page.js
import { notFound } from 'next/navigation'
import { fetchArticleById } from '@/lib/api/articles'
import { formatInTimeZone } from '@/lib/datetime'
import Byline from '@/components/Byline'
import ArticleBody from '@/components/ArticleBody'
import ShareButtons from '@/components/ShareButtons'
import AdSlot from '@/components/AdSlot'

export const dynamic = 'force-dynamic' // ensures no caching

export async function generateMetadata({ params }) {
  // In newer Next.js, params is async
  const { id } = await params
  try {
    const article = await fetchArticleById(id)
    const title = article?.title || 'Story'
    const description = article?.dek || ''
    const images = article?.image ? [{ url: article.image, alt: article.imageAlt || title }] : []
    return {
      title,
      description,
      alternates: { canonical: article?.canonical || undefined },
      openGraph: { title, description, images, type: 'article' },
      twitter: { card: images.length ? 'summary_large_image' : 'summary', title, description, images },
    }
  } catch {
    return { title: 'Story', description: '' }
  }
}

export default async function StoryPage({ params }) {
  // In newer Next.js, params is async
  const { id } = await params

  let article
  try {
    article = await fetchArticleById(id)
  } catch {
    notFound() // call (do not return) in App Router
  }

  // Human-readable label for users
  const updatedLabel = article?.updated
    ? formatInTimeZone(article.updated, 'America/Chicago', 'MMMM d, yyyy • h:mm a z')
    : null

  // ISO for <time dateTime="..."> (only if valid)
  let updatedISO
  if (article?.updated) {
    const d = new Date(article.updated)
    if (!Number.isNaN(d.getTime())) updatedISO = d.toISOString()
  }

  return (
    <article className="mx-auto max-w-screen-xl px-4 pb-10 sm:pb-12 md:pb-16">
      {/* Top Ad */}
      <div className="mb-6">
        <AdSlot placement="top-banner" />
      </div>

      {/* Headline */}
      <h1 className="font-sans text-3xl leading-tight font-semibold text-slate-900 md:text-4xl">
        {article.title}
      </h1>

      {/* Dek / subhead */}
      {article.dek && <p className="mt-2 text-lg text-slate-700">{article.dek}</p>}

      {/* Byline & Meta */}
      <Byline author={article.author} updatedISO={updatedISO} updatedLabel={updatedLabel} />

      {/* Hero Image */}
      {article.image && (
        <figure className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image}
            alt={article.imageAlt || article.title}
            className="w-full rounded-2xl object-cover"
          />
          {article.imageCaption && (
            <figcaption className="mt-2 text-sm text-slate-500">{article.imageCaption}</figcaption>
          )}
        </figure>
      )}

      {/* Share */}
      <div className="mt-6">
        <ShareButtons title={article.title} />
      </div>

      {/* Body + Right Rail */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ArticleBody html={article.body} />
          <div className="my-8">
            <AdSlot placement="in-article" />
          </div>
          {article.tags?.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <li key={String(tag)} className="text-sm text-slate-600">
                  <a href={`/tags/${encodeURIComponent(tag)}`} className="underline hover:no-underline">
                    #{tag}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <AdSlot placement="right-rail-top" />
            {article.related?.length > 0 && (
              <div>
                <h2 className="mb-3 border-b border-slate-200 pb-2 text-lg font-semibold">Related</h2>
                <ul className="space-y-4">
                  {article.related.map((r) => (
                    <li key={String(r.id)}>
                      <a href={r.href} className="group block">
                        <div className="flex gap-3">
                          {r.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.image} alt="" className="h-16 w-24 rounded object-cover" />
                          )}
                          <span className="text-sm leading-snug text-slate-800 group-hover:underline">
                            {r.title}
                          </span>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <AdSlot placement="right-rail-bottom" />
          </div>
        </aside>
      </div>
    </article>
  )
}
