## Summary
<!-- What changed and why -->

## Checklist
- [ ] I used **components/SafeLink** (or `<a>`) for links; avoided raw `next/link` unless intentionally internal.
- [ ] External non-market links open in a new tab; market links are relative.
- [ ] No hardcoded market domains (except tests/fixtures).
- [ ] Category page SSR snippet enrichment remains intact.
- [ ] Right rail scrolls; 100px bottom padding preserved on lists.
- [ ] Post page: duplicate featured image not rendered in body; HTML sanitized.
- [ ] Timestamp row color is correct; share/back hover colors correct.
- [ ] I ran `npm run verify:links` and it passed.

## Screenshots
<!-- Before / After if UI -->
