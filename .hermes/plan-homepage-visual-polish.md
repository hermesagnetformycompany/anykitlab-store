# Homepage visual fixes — 4 issues (Sahil's screenshot, 2026-08-30)

All fixes scoped to `audit-fixes.css` (loads last → wins the cascade) or with `!important` where another late `!important` rule must be beaten. Never touch `scale.css`/`polish.css`/`home-reference.css` rules for these elements.

## Issue 1 — Hero cover images don't fill the covers
- Root cause: `audit-fixes.css:275` `.placeholder-stack > span { padding: 22px 14px; }` (restored for placeholder covers) beats `polish.css:71` `.hero-product-covers > span { padding: 0; }`.
- Evidence: img inset ~15px horizontally / ~23px vertically inside each cover (browser measured).
- Fix: in `audit-fixes.css` add `.hero-product-covers > span { padding: 0 !important; }`.

## Issue 2 — Collection cards: inconsistent padding, text not aligned with image
- Root cause: `audit-fixes.css:330` `.collection-grid > a > div { padding: 16px 0 12px 16px; }` — right/bottom padding missing → text block 160px wide in a 366px card, inconsistent gaps.
- Fix: symmetric padding `padding: 16px;` on `.collection-grid > a > div` (keeps right gap = left gap) and `justify-content: center` on the link grid so text sits centered relative to image, image fills its half.
- Keep `.collection-placeholder { padding: 16px !important; }` (icon-only placeholders get even inset).

## Issue 3 — "How delivery works": 01/02.. number chips overlap the titles
- Root cause: `scale.css:98` `.step-mark > b { bottom: -30px; }` pushes the number chip 30px below the 60px circle (it extends ~30px under the title); `audit-fixes.css` never re-anchors it. `home-reference.css:859` `.step-mark > b { bottom: -8px; }`.
- Fix: in `audit-fixes.css` add `.step-mark > b { bottom: 8px !important; }` — moves the number INSIDE the circle at bottom-right, no overlap with the title below; add `right: 8px;` so it sits neatly.
- Also ensure `.delivery-step h3 { margin-top: 44px }` from scale.css still clears the circle+chip: with chip inside circle there is no overflow, so h3 margin-top can stay.

## Issue 4 — FAQ `+` toggle stuck to question text
- Root cause: `summary` is `display: list-item` (UA default); no CSS anywhere sets flex/space-between for the homepage `.faq summary`; the `+` span sits inline right after the text.
- Fix: in `audit-fixes.css`:
  - `.reference-home .faq summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; }`
  - `.reference-home .faq summary span { flex: none; }`
  - `.reference-home .faq summary::marker { content: none; }` / hide `-webkit-details-marker` too.
- Result: question text left, `+` pushed to the right edge with a guaranteed 16px gap.

## Verification
1. `npm run typecheck && npm run lint && npm test` then `npm run build` (with `.env.local` = production env).
2. Browser check at 1920w + 1366w + mobile: hero covers fill fully (inset 0), collection text/image padding symmetric, number chips inside circles, FAQ `+` at right edge with gap.
3. Vision QA: screenshot before/after, confirm with vision model (gemma4:31b via ollama-cloud, now configured in auxiliary.vision).
4. Push branch → PR → preview → merge after Sahil approves.