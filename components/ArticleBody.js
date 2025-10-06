// components/ArticleBody.js
export default function ArticleBody({ html }) {
  if (!html) return null;
  return (
    <article
      className="
        mx-auto w-full max-w-[880px] px-4
        font-normal text-[20px] leading-[175%]
        [&_p]:mb-4 [&_ul]:mb-4 [&_ol]:mb-4 [&_li]:mb-2
        [&_a]:text-[#1e99d0] [&_a:hover]:underline
        [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-[22px] [&_h2]:font-bold
        [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-[20px] [&_h3]:font-bold
        [&_img]:rounded-[6px] [&_figcaption]:text-black/70
      "
      // Safe because this is your own CMS output—keep any sanitizer upstream.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
