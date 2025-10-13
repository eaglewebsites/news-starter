// app/page.js
import HomeHero from "@/components/HomeHero";
import MoreStories from "@/components/MoreStories";
import AdSlot from "@/components/AdSlot";
import WeatherCard from "@/components/WeatherCard";
import RegionalSection from "@/components/RegionalSection";
import SportsSection from "@/components/SportsSection";
import PodcastsSection from "@/components/PodcastSection";
import LocalSection from "@/components/LocalSection";

import { fetchHomeFeatured, fetchHomeSports, fetchHomeMore, fetchHomeLocal, fetchHomeRegional, fetchHomePodcasts } from "@/lib/eagleApi";

export default async function Home() {
  // 1) Featured hero (auto-detects site inside the function)
  const hero = await fetchHomeFeatured();

  // 2) Sports list (auto-detects site inside the function)
  const sportsItems = await fetchHomeSports();

  // 3) “More Stories this week” (auto-detects site inside the function)
  const more = await fetchHomeMore({
    // categories are a suggestion; adjust as you like
    categories: ["local", "regional", "state"],
    limit: 8,
    // excludeId: hero?.id, // uncomment to avoid duplicating the hero
  });

  // 4) Local list
  const localItems = await fetchHomeLocal();

  // 5) Regional list
  const regionalItems = await fetchHomeRegional();

  // 6) Podcasts list
  const podcastsItems = await fetchHomePodcasts();

  // Quick Links (still hard-coded for now)
  const quickLinks = [
    { label: "Weather Radar", href: "#" },
    { label: "Sports News", href: "#" },
    { label: "Contest Giveaways", href: "#" },
    { label: "Exclusive Members", href: "#" },
  ];

  const regional = []; // fill later
  const podcasts = []; // fill later

  return (
    <main className="home-page mx-auto max-w-[1300px] px-4 py-6">
      {/* Top narrow ad */}
      <div className="mb-6">
        <AdSlot network="gam" slot="top-leader" />
      </div>

      {/* Hero + More Stories + Weather rail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[852px_401px] lg:justify-between">
        <div>
          {hero ? (
            <HomeHero story={hero} />
          ) : (
            <div className="rounded-md border border-gray-200 bg-white p-6 text-gray-600">
              No featured story available.
            </div>
          )}
        </div>

        <div className="space-y-6">
          

          {/* ✅ If stories exist, show them */}
          
          {more?.length ? (
              <MoreStories items={more} />
            ) : (
              <div className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-900 text-sm">
                No items returned from API yet.
              </div>
            )}

          <WeatherCard />
        </div>
      </div>

      {/* Wide ad under hero */}
      <div className="my-8">
        <AdSlot network="gam" slot="mid-leader" />
      </div>

      {/* Quick Links */}
      <section className="mt-10 pb-20">
        <h2 className="section-underline-quick font-bold text-[32px]">Quick Links</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((q) => (
            <a key={q.label} href={q.href} className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-[2px]">
                <span className="text-[--color-sky] text-[18px]" aria-hidden>▸</span>
              </span>
              <span className="font-bold text-[24px] text-[--color-ink]">{q.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Local */}
      <LocalSection items={localItems || []} />

      {/* Ad */}
      <div className="my-8">
        <AdSlot network="gam" slot="between-local-and-regional" />
      </div>

      {/* Regional */}
      <RegionalSection items={regionalItems || []} />

      <div className="my-8">
        <AdSlot network="gam" slot="between-regional-and-sports" />
      </div>

      {/* Sports */}
      <SportsSection items={sportsItems || []} />

      <div className="my-8">
        <AdSlot network="gam" slot="between-sports-and-podcast" />
      </div>

      {/* Podcasts*/}
      <PodcastsSection items={podcastsItems || []} />
    </main>
  );
}
