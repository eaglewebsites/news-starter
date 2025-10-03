// components/HomeHero.js
import Image from "next/image";
import Link from "next/link";

export default function HomeHero({ story }) {
  if (!story) return null;

  // Be defensive about the image key
  const imageUrl =
    story.featured_image ||
    story.featured_image_thumbnail ||
    story.image ||
    null;

  const href = story.href || (story.id ? `/posts/${story.id}` : "#");

  return (
    <article className="relative overflow-hidden rounded-md bg-black">
      {/* Image */}
      {imageUrl ? (
        <div className="relative h-[480px] w-full">
          <Image
            src={imageUrl}
            alt={story.title || "Featured image"}
            fill
            sizes="(min-width: 1024px) 852px, 100vw"
            priority
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex h-[480px] w-full items-center justify-center bg-gray-200 text-gray-600">
          No image available
        </div>
      )}

      {/* Overlay gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Badge + Title */}
      <div className="absolute left-0 top-0 w-full p-4 sm:p-6">
        {/* “Top Story” badge — exact Sandhills blue */}
        <span className="inline-block rounded-[4px] bg-[#1E99D0] px-3 py-1 text-[14px] font-bold leading-none text-white">
          Top Story
        </span>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6">
        <Link href={href} className="pointer-events-auto block hover:underline">
  <h1 className="font-sourcesans font-bold text-[24px] sm:text-[28px] md:text-[32px] leading-tight drop-shadow text-white">
    {story.title}
  </h1>
</Link>



        {/* optional meta line under title */}
        {story.published && (
          <div className="mt-1 text-[14px] text-white/90">
            Updated: {new Date(story.published).toLocaleDateString()}
          </div>
        )}
      </div>
    </article>
  );
}
