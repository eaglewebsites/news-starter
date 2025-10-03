// components/ArticleBody.js
export default function ArticleBody({ html }) {
  if (!html) return null

  return (
    <div
      className="prose prose-slate max-w-none prose-img:rounded-xl prose-a:text-sky-700 hover:prose-a:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
