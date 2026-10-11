# Content.md — Copy Deck (English; Hindi keys optional P2)

> Strings live in `strings.xml` (Android) and `i18n/en.json` (web). Keys below are suggested. Legal text is a **placeholder structure only — must be written/reviewed by a lawyer (D-010)**.

## Brand
`app_name` = Mealora · tagline: "Good food, delivered right."

## Onboarding
1. "Discover great food" — "Browse restaurants and dishes near you." 
2. "Order in a few taps" — "Customize, pay, and confirm quickly and safely."
3. "Track every step" — "Know when your food is prepared and on its way."
Buttons: Skip · Continue · Get Started · Log in · Create account

## Auth
Phone hint "Enter mobile number" · "We'll send a 6-digit code." · "Verify" · "Resend code in {s}s" · "Resend code"
Errors: "Enter a valid 10-digit mobile number." · "That code isn't right. Try again." · "This code has expired. Request a new one." · "Too many attempts. Try again in {m} min." · "No internet connection. Check and retry." · "Something went wrong. Please try again."
Consent: "By continuing you agree to our Terms and Privacy Policy."

## Home / Search
Search hint "Search dishes or restaurants" · sections: Popular Near You · Top Rated · Fast Delivery · Budget Meals · Offers for You · Recommended for You · Order Again · New on Mealora
Empty: "No restaurants deliver here yet." / "No results for “{q}”. Try a different dish or cuisine."
Filters: Rating 4.0+ · Veg only · Cuisine · Price · Delivery time · Offers · Reset · Apply

## Restaurant
"Closed now · Opens at {time}" · "Temporarily closed" · "Minimum order ₹{n}" · "Add" · "Customise" · "Currently unavailable" · "Bestseller" · "Search in menu"

## Cart & Checkout
"Replace cart?" — "Your cart has items from {a}. Start a new cart with items from {b}?" · Buttons: Keep current · Replace
"Prices were updated. Please review your cart." · "Some items are unavailable: {list}." · "Add items worth ₹{n} more to place this order." · "Coupon not valid: {reason}" · "Use {n} points (−₹{x})" · "Place order" · "Pay ₹{amount}" · "Cash on delivery"
Payment: "Payment failed. You haven't been charged, or any amount will be refunded." (only use if verified) · "Confirming your payment…"

## Tracking statuses
Order placed · Confirmed · Preparing · Ready for pickup · Out for delivery · Delivered · Rejected · Cancelled · Refund pending · Refunded
Cancel: "Cancel this order?" · "You can't cancel after the restaurant starts preparing."

## Reviews & Rewards
"How was your order?" · "Thanks for your review!" · "You've already reviewed this order." · "Report review"
"Mealora Rewards" · "{n} points" · "Earn 1 point for every ₹100 on food." (render from config values) · "Redeem points" · "Points expire on {date}"

## Empty/Error generic
"Nothing here yet" · "Couldn't load. Retry" · "You're offline. Showing saved data."

## Notifications (title / body; no sensitive details)
- order_confirmed: "Order confirmed" / "{restaurant} accepted your order."
- preparing: "Being prepared" / "Your food is being prepared."
- ready: "Ready for pickup" / "Your order is ready."
- out_for_delivery: "On the way" / "Your order is out for delivery."
- delivered: "Delivered" / "Enjoy your meal! Tell us how it was."
- cancelled/rejected: "Order update" / "Your order #{no} was cancelled. Refund details inside."
- refund: "Refund update" / "Open the app to see your refund status."

## Account
"Delete account" — "This starts a request. We may keep order and payment records as required by law. Your personal profile data will be removed or anonymised." · "Request deletion" 

## Legal placeholders
Terms of Service · Privacy Policy (DPDP Act 2023: data collected, purpose, retention, rights, grievance officer contact) · Refund & Cancellation Policy · Contact/Support email & phone `{TBD}` · Grievance officer `{TBD}`. **Do not publish without legal review.**
