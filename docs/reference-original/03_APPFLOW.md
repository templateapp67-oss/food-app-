# 03_APPFLOW — User Journeys (happy path + failure paths)

## J1 First launch → Auth
Splash → (onboarding done? no) 3 onboarding pages (Skip/Continue) → Get Started → Login/Create account → phone (+91) → OTP → (new user) name + optional email + terms/privacy consent → Home.
Failures: invalid phone (inline error) · wrong OTP (error, attempts counted) · expired OTP (Resend after 30 s) · rate limited (message + wait time) · offline (retry banner) · backend error (never fake success).
Session: tokens stored securely; restored on launch; invalid session → login with message.

## J2 Location
Home header → address selector → saved addresses / add new / use current location (permission asked here) → serviceability check → "We don't deliver here yet" state with notify-me (P2) if unserviceable.

## J3 Discover → Restaurant
Home sections (paginated, from Supabase) → restaurant card → detail. Closed restaurant: browse allowed, add disabled with reason + opening time.

## J4 Search
Tap search → recent + suggestions → type (debounce 300 ms) → results (Restaurants | Dishes tabs) → filters sheet (rating, veg, cuisine, price, delivery time, offers) + sort → Reset. Empty → suggestions. Error → retry.

## J5 Item → Cart
Add (simple item: +1) · customizable item: bottom sheet → choose variant/add-ons → validation of required groups → qty + instructions → Add. Different restaurant in cart → replace dialog. Cart badge updates.

## J6 Cart → Checkout
Cart: edit qty/customization, coupon, loyalty toggle, totals (from `quote-cart`). Proceed → select/add address (serviceability) → payment method (COD if enabled / Online) → review → Place order (button disabled while in-flight; idempotency key per attempt).
Failures: item unavailable → list affected items, offer remove/replace · price changed → show diff, require re-confirm · restaurant closed → block · coupon invalid → remove w/ message · payment failed → retry/switch method (order stays pending_payment up to 15 min) · network drop mid-checkout → on return check order by idempotency key (no duplicate).

## J7 Tracking
Confirmation screen (only after backend state = placed) → tracking timeline (Realtime + 15 s fallback). Cancel button visible only while allowed. Rejected/cancelled → reason + refund info (status per refunds table).

## J8 Orders & reorder
Orders tab: Active / Past / Cancelled → detail (receipt, payment, status history) → Reorder (re-validates availability/prices, shows diff) → Rate order (if eligible).

## J9 Reviews
Rate order → restaurant stars + text → item stars/text → submit → confirmation. Duplicate → "Already reviewed", edit allowed within 24 h. Report review action on others' reviews.

## J10 Favorites
Heart on restaurant/item → Favorites screen (tabs) → empty state CTA.

## J11 Rewards
Rewards tab: points, tier progress, how it works, ledger history, expiry. At checkout: redeem slider/stepper in multiples of 100, shows ₹ discount and points deducted.

## J12 Profile
Edit profile/photo, addresses, notifications prefs, help/support (ticket), legal pages, logout (unregister FCM token), delete-account request (confirmation + explanation of retention).

## J13 Notifications
Permission prompt after first order (rationale first). Push tap → deep link to order (auth check; if different user → ignore safely). Bell icon → in-app list.

## J14 Restaurant console (web)
Login → pick restaurant (if multiple) → Live orders board (New / Preparing / Ready / Past) with audible alert → Accept (set prep time) / Reject (reason) → status buttons → Menu manager (availability toggle fast) → Hours / temp close → Reviews → Sales summary.

## J15 Rider view (web, minimal, D-004)
Login → assigned orders → Picked up → Delivered (+ COD collected amount confirm).

## J16 Admin
Login (role verified server-side) → Overview → Restaurants (approve/suspend/assign owner) → Orders (search, detail, cancel/refund w/ reason) → Customers → Promotions → Reviews moderation → Loyalty config/ledger → Notifications → Settings (zones, fees, tax, commission) → Audit log.

## J17 Account deletion
Profile → Delete account → explain → confirm with OTP → request recorded → status "processing" → completion notice. Also web page for deletion request (Play policy).
