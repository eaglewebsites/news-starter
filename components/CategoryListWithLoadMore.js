// components/CategoryListWithLoadMore.js
"use client";

import { useMemo, useState } from "react";
import StoryListWithAds from "@/components/StoryListWithAds";
import CategoryLoadMore from "@/components/CategoryLoadMore";

/**
 * Server passes initialItems (SSR set), slug (e.g. "obituaries"), and site (e.g. "sandhills").
 * This component renders the grid and uses <CategoryLoadMore> as the footer.
 */
export default function CategoryListWithLoadMore({
  slug,
  site,
  pageSize = 24,
  sectionTitle = "Category",
  initialItems = [],
  ...listProps
}) {
  // local state only for the grid we render immediately
  const [items] = useState(initialItems);

  // For "contests" category, hide the snippet region entirely
  const hideSnippet =
    String(slug || "").toLowerCase() === "contests" ||
    String(sectionTitle || "").toLowerCase().includes("contest");

  // If we’re hiding snippets, pass a renderer that returns null
  const renderSnippet = hideSnippet ? () => null : undefined;

  // Build a footer that mounts our robust client-loader and seeds it with what's already on screen
  const footer = useMemo(
    () => (
      <CategoryLoadMore
        slug={slug}
        siteKey={site || "sandhills"}
        pageSize={pageSize}
        initialOffset={items.length} // start AFTER the SSR items
        seedFromItems={items}        // seed dedupe from what is already rendered
      />
    ),
    [slug, site, pageSize, items]
  );

  return (
    <StoryListWithAds
      items={items}
      sectionTitle={sectionTitle}
      footer={footer}
      loading={false}
      loadingMode="append"
      renderSnippet={renderSnippet}
      {...listProps}
    />
  );
}
