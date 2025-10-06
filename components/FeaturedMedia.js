// components/FeaturedMedia.js
export default function FeaturedMedia({ src, alt, photoFrom }) {
  if (!src) return null;
  return (
    <figure className="mx-auto mt-5 w-full max-w-[880px] px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt || ""} className="h-auto w-full rounded-[6px] border border-black/10" />
      {photoFrom && (
        <figcaption className="mt-2 italic font-light text-[16px] leading-[100%] text-black/70">
          Photo from: {photoFrom}
        </figcaption>
      )}
    </figure>
  );
}
