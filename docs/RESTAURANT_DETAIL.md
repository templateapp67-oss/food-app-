# Restaurant detail page

The selected restaurant now has breadcrumb navigation, section navigation (Dineout, Photos, Menu), a split photo/overview hero, photo modal, offer categories and carousel, bank/promo panels, QR link to the responsive web app, location directions, related Jaipur restaurants and brand shortcuts. Existing food ordering and favourites remain available.

RestaurantDetail receives the menu as children so cart controls and ordering logic remain in App. Changing restaurants remounts the detail component to reset tabs and gallery state. Native dialog supplies modal focus containment and Escape behavior; image failures render a placeholder. Header search returns to the filtered catalogue.

Optional Restaurant display fields: phone, opening_text, distance_km, gallery_urls, menu_pages (images), amenities, dining_offers (id/title/kind/detail/code), booking_offer, bank_offer and promo_offer. Empty fields do not fabricate a phone, closing time, distance or amenities. Uploaded menu-page counts follow actual array length rather than claiming twelve pages. Directions open an OpenStreetMap address search.

Demo dining offers and bank codes are explicitly marked as non-redeemable examples. Live records do not receive these examples. This change adds presentation and navigation; no dining reservation, bank redemption or dine-in payment backend is implemented. Digital food ordering remains separate.

QR encodes https://nexora-food.templateapp67.chatgpt.site and opens the web app. Android source exists elsewhere in this repository, but no installable APK or verified store listing exists. The sidebar does not present fake store download buttons. No Apple app is claimed.

No Swiggy logo, SwiggyPay affiliation, copyrighted restaurant screenshots, invented social profiles, or unverified real restaurant listings are inserted. Nexora branding and existing footer actions are retained, with an About Nexora modal added.

Display fields need verified restaurant data and backend/dashboard persistence before real-world use. Browser visual QA is unavailable in the managed environment; web flow tests and production TypeScript/build checks are performed.

## Related sections and progressive mock removal

Recommended options in Casual Dining, Near [current restaurant], More North Indian restaurants, and Brands near you always render. Twelve fictional Jaipur examples provide empty-slot fallback. Cards and brands visibly identify samples; clicking a sample opens a non-orderable preview rather than passing its ID into food ordering. No fallback records are written to storage, the database or the cart.

Recommendations are recomputed on each catalogue update. Eligible real records occupy slots first (three in each card section and twelve brand links). Matching mock names are suppressed with case/whitespace normalization, including across sections. With enough eligible records, a section contains no mocks. Real fields are kept intact; mock prices, distances and offers are never copied to them.

Eligible records must be active, open, Jaipur-based and not demo records. The near section selects the current restaurant's matching Jaipur locality, rather than presenting arbitrary city restaurants as nearby. North Indian requires a matching cuisine. Casual dining uses records with casual_dining or no specified dining type. Demo catalogue entries remain samples. Existing live catalogue polling provides updates when live mode/backend is active; this does not provision a backend or automatically exit an explicitly selected demo workspace.
