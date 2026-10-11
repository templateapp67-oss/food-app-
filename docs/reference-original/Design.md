# Design.md — Design System Rules

Reconciled with `Visual.md`: Visual defines *what it looks like* (brand, color, imagery); this file defines *how components are built and behave*. Single token source: `core/theme` (Android) and `tokens.css` (web), both generated from the table in Visual.md.

## 1. Layout & spacing
Base unit 4 dp. Scale: 4, 8, 12, 16, 20, 24, 32. Screen horizontal padding 16 dp. Section gap 24 dp. Card inner padding 12–16 dp.
Corner radii: chips 12, cards 16, hero/sheets 20, buttons 14, avatar full. Min touch target 48×48 dp. Elevation: use tonal surface (Material 3), minimal shadows.

## 2. Typography (Material 3 roles)
Modern sans-serif (e.g., Plus Jakarta Sans or Inter — **license check, bundle as font resource**; fallback system sans).
Display (hero numbers) 32/40 Bold · Headline 24/32 Bold · Title 18/24 SemiBold · Body 14–16/20–24 Regular · Label 12–14 Medium. Use `sp`, never clip at 200% scale; allow wrapping, avoid fixed heights.

## 3. Components (reusable, one implementation each)
`MealoraTopBar`, `BottomNav(5)`, `RestaurantCard`, `DishCard`, `CategoryChip/Circle`, `FilterChip`, `RatingBadge`, `VegIndicator` (square with dot, green/red **plus** content description), `PriceText`, `QuantityStepper`, `PrimaryButton/SecondaryButton/TextButton`, `AddButton`, `OfferTag`, `StatusPill` (icon + text, never color only), `OrderTimeline`, `SkeletonShimmer`, `EmptyState`, `ErrorState(retry)`, `OfflineBanner`, `ConfirmDialog`, `BottomSheetScaffold`, `OtpInput`, `AddressCard`, `PointsProgress`, `Snackbar host`.

## 4. States
Every list/screen: Loading (skeleton matching layout) · Empty (illustration/icon + message + CTA) · Error (message from Content.md + Retry) · Offline (banner, cached content if available) · Success.
Buttons: default, pressed (ripple/scale 0.98), disabled, loading (spinner, width stable).

## 5. Navigation
Bottom nav: Home, Search, Orders, Rewards, Profile; active = filled icon + accent indicator + label (not color alone). Each tab keeps its back stack (`saveState/restoreState`). Cart is a floating bar on restaurant/home when cart non-empty ("2 items · ₹320 · View cart").

## 6. Motion
Splash logo 600–900 ms. Screen transitions fade/slide 200–300 ms. Respect system "remove animations". No looping decorative animation. Shimmer for skeletons only.

## 7. Adaptive
Phone portrait primary; landscape/tablet: constrain content width (max ~600 dp lists, 2-column grids ≥ 600 dp via `WindowSizeClass`). Handle `enableEdgeToEdge`, `WindowInsets` (status/nav bars, cutouts, IME), `imePadding` on forms.

## 8. Web dashboard
Collapsible sidebar (drawer on mobile), data tables with horizontal scroll + sticky header + row action menu on mobile, forms single-column on small screens, same tokens.

## 9. Images
Coil with placeholder (blurhash/solid), crossfade, memory/disk cache, request size = view size. Aspect ratios: restaurant card 16:9, dish 1:1, category circle 1:1.

## 10. Do / Don't
Do reuse components; Don't create per-screen one-off styles; Don't use color alone; Don't exceed 2 font weights per component; Don't use heavy gradients.
