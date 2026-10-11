# Restaurant card

Reusable React + TypeScript component with scoped CSS. Requires React and `lucide-react` (the host project uses 0.468.0). Import `RestaurantCard.tsx`; it imports its own stylesheet.

```tsx
import RestaurantCard from './RestaurantCard';

<RestaurantCard
  restaurant={restaurantFromYourAPI}
  onOpen={id => openRestaurant(id)}
  onFavorite={id => toggleFavorite(id)}
  isFavorite={savedIds.includes(restaurantFromYourAPI.id)}
/>
```

See `RestaurantCard.example.tsx` for a complete fixture showing all six requested content groups. Wrap several cards in `dining-card-grid` for a responsive grid, or use your own grid. The example image is included in the download; copy the `images` folder to your public assets directory. Offers and distances in the example are illustrative and must be replaced with validated data before use.

| Prop field | Value |
| --- | --- |
| `name`, `rating`, `reviewCount` | Restaurant title and bottom-right image star badge; absent/invalid rating shows New |
| `cuisines`, `costForTwoPaise` | Cuisine list and integer paise (100000 = ₹1000) |
| `area`, `city`, `distanceKm` | Exact location and optional nonnegative distance; zero is supported |
| `bookingOffer` | Main green discount badge, optional detail and positive integer moreCount |
| `bankOffer` | Bank offer in the shared pale green secondary banner |
| `promoOffer` | Promo row in the secondary banner, with optional code |
| `tags` | Optional orange/dark top-left ribbons |
| `imageUrl`, `imageAlt` | Lazy image with reserved dimensions and a failure fallback |
| `onOpen`, `onFavorite`, `isFavorite` | Independent actions; omitted callbacks produce a static card with no dead buttons |

Optional values are hidden when missing. Invalid numeric distance and cost are never printed as Infinity or NaN. The component uses visible text for offers and real buttons for actions, supports keyboard focus, and respects reduced motion. CSS variables inherit the host theme, with white-background defaults for standalone use.

Nexora Food now uses this component for its Jaipur restaurant catalogue. No restaurant offers or distances were fabricated in the live catalogue, and no backend booking/payment changes were made. Existing food ordering and favourite actions are retained.

Validation: full web tests, TypeScript check and production build. Browser visual verification is unavailable in this environment.

Layout: three columns above 1000px, two columns from 601–1000px, and one below 601px. The 16:9 photo, bottom-right rating, compact details and stacked offer banners follow the attached dining-card references. No screenshot imagery or Swiggy branding is embedded.


## Tailwind variant

Use `RestaurantCardTailwind.tsx` in a project that already compiles Tailwind CSS (v3 or v4). It has no dependency on the scoped stylesheet and shares the same data type and callbacks. Ensure your Tailwind content/source discovery includes this file.

```tsx
import RestaurantCardTailwind from './RestaurantCardTailwind';

<div className="grid grid-cols-1 gap-5 min-[601px]:grid-cols-2 min-[1001px]:grid-cols-3">
  {restaurants.map(restaurant => (
    <RestaurantCardTailwind key={restaurant.id} restaurant={restaurant} onOpen={openRestaurant} />
  ))}
</div>
```

Nexora itself uses the scoped-CSS React version to preserve its existing light/dark theme. Both variants include the same dynamic fields and image failure fallback.
