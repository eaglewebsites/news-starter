# EaglePost Frontend Checklist

## Navigation & Links
- [ ] Use `<SafeLink>` (not `next/link`) for all app links.
- [ ] External (non-market) domains open in a new tab (`target="_blank"` & `rel="noopener noreferrer"`).
- [ ] Market domains (sandhillspost.com, salinapost.com, etc.) normalize to **relative** paths.
- [ ] Header/Footer links are **white**; body links are `#1E99D0` (except home page body links remain black).
- [ ] No hardcoded `https://sandhillspost.com/...` in app code—use relative `/path`.

## Category & Post Pages
- [ ] Category pages SSR-enrich the first page with snippets (so Back cache keeps them).
- [ ] “Load More” uses batch snippet route.
- [ ] Right rail **scrolls** with page (no `sticky`).
- [ ] 100px bottom padding present on list pages.
- [ ] Post page renders raw HTML body safely (our sanitizer pipeline) and
      removes duplicate featured image from body.

## Styling
- [ ] Headings/underlines match spec tokens.
- [ ] “More Local” / Back / Share buttons: black text → white on hover, navy background.
- [ ] Timestamp row uses dark neutral text `#1F1F1F`.

## Safety & Perf
- [ ] No direct use of external origins in fetches—go through server routes where possible.
- [ ] No use of sync dynamic APIs (e.g., `params.slug` must be awaited if required by Next version).
- [ ] All links in header respect ExternalLinkEnforcer behavior.
