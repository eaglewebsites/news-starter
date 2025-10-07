// components/FeaturedMedia.js
export default function FeaturedMedia({ src, alt, photoFrom, caption }) {
  if (!src) return null;

  const hasCaption = Boolean(caption) || Boolean(photoFrom);

  return (
    // ✅ added bottom spacing so body text isn't flush with the image/caption
    <figure className="mx-auto mt-5 mb-[40px] w-full max-w-[880px] px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || ""}
        className="h-auto w-full rounded-[6px] border border-black/10"
      />

      {hasCaption && (
        <figcaption className="mt-2 mb-[30px] text-center italic font-light text-[16px] leading-[100%] text-black/70">
          {caption ? caption : `Photo from: ${photoFrom}`}
        </figcaption>
      )}
    </figure>
  );
}
