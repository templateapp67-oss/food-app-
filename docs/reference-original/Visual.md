# Visual.md — Brand & Visual Identity

## 1. Brand
Working name **Mealora** (placeholder; store in `BrandConfig`). Tone: warm, appetizing, trustworthy, premium-dark.
**Logo:** original wordmark "Mealora" in a rounded geometric sans, with a simple original icon: a stylized **bowl with steam forming an "M"** (or a leaf/spoon motif) — drawn as vector (SVG/Android vector drawable), no references to any existing brand. Provide: wordmark, icon-only, monochrome, adaptive launcher icon (foreground/background/monochrome layers), 512×512 Play icon. **Do a trademark/name availability check before launch.**

## 2. Dark palette (default)
| Token | Hex | Use |
|---|---|---|
| background | #101114 | app background |
| surface | #191B20 | sections, bottom nav |
| card | #22252B | cards, sheets |
| primary | #FF7138 | CTAs, active states |
| secondary | #FFC15A | ratings, highlights, offer tags |
| onBackground | #FFFFFF | main text |
| textSecondary | #B7BBC4 | supporting text |
| border | #343841 | dividers/outlines |
| success | #36B875 | success, veg |
| error | #F06464 | errors, non-veg marker, destructive |

**Contrast rules (verified by calculation):** white text on #FF7138 ≈ 2.7:1 → **fails AA**. Therefore **text/icons on primary buttons use #101114 (≈ 6.9:1)**. #B7BBC4 on #22252B passes AA. Check every pair with a contrast tool in CI/design review; need ≥ 4.5:1 body, ≥ 3:1 large/UI components.

## 3. Light palette (secondary theme, defined to avoid ad-hoc choices)
background #FFF9F5 · surface #FFFFFF · card #FFFFFF with 1 dp border #E8E1DB · primary #C9420F (white text on it = 4.92:1, verified) · secondary #8A5F00 for text (5.41:1, verified) / #FFC15A for fills · onBackground #1B1B1F · textSecondary #5C606A · border #E8E1DB · success #177A48 · error #C93A3A (4.85:1, verified). Initial release ships dark; light behind setting (follow system optional).

## 4. Imagery
Only: (a) photos taken/commissioned by the company, (b) licensed stock with written licence stored in repo `/docs/licences`, (c) restaurant-uploaded images where the restaurant confirms rights in onboarding terms, (d) original illustrations. No scraped or competitor images. Seed/demo images flagged and removed from release. Compress to WebP, max 1280 px wide for covers, 600 px for dishes. Dark gradient scrim (max 40 %) only for text over images.

## 5. Iconography
Material Symbols Rounded (single set). 24 dp default, 2 dp stroke consistency. Veg/non-veg markers follow the Indian convention (green dot / red-brown dot in square) with accessibility labels.

## 6. Cards
Restaurant card: image 16:9 (radius 16), name (Title), rating pill, ETA, cuisines (max 2 + "+N"), price for two, delivery fee, offer tag, status (Closed overlay with text). Do not show a metric if data absent (hide, don't fabricate). Demo data shows "DEMO" ribbon in debug builds only.

## 7. Responsive & accessibility
See Design.md §7. Content descriptions for all images/icons, decorative = null. Focus order logical. Error text + icon, not color alone. Support 200 % font scale and TalkBack.

## 8. Marketing/Play assets
Feature graphic 1024×500, 8 phone screenshots (real app screens, no competitor UI), short/long description, app category Food & Drink. Use original copy.
