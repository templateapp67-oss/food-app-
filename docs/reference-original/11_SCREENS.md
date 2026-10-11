# 11_SCREENS — Screen Inventory

Legend: **States** = L loading skeleton · E empty · R error+retry · O offline · S success. Every screen supports font scaling, TalkBack, small screens.

## Customer Android
| ID | Screen | Purpose / key content | Data | States | Nav |
|---|---|---|---|---|---|
| S-001 | Splash | Logo animation, session check | session | L | → onboarding/login/home |
| S-002 | Onboarding (3) | Discover, Order, Track; Skip/Continue/Get Started | static | – | → S-003 |
| S-003 | Welcome/Auth choice | Login / Create account | – | – | → S-004 |
| S-004 | Phone entry | +91, validation, consent links | – | R | → S-005 |
| S-005 | OTP verify | 6-digit, countdown resend, errors | auth | L R | → S-006/Home |
| S-006 | Profile setup | Name, optional email | profiles | R | → Home |
| S-010 | Home | Address bar, search, bell, profile, banners, 12 categories, 8 sections | restaurants, banners, categories | L E R O | → S-020/S-030 |
| S-011 | Address selector | Saved/new/current location | addresses | L E R | back |
| S-012 | Add/Edit address | Fields + type + instructions | addresses | R | back |
| S-013 | Unserviceable area | Message + change address | zones | – | S-011 |
| S-020 | Search | Recent, suggestions, results, filters, sort, pagination | search_catalog | L E R O | → S-030 |
| S-021 | Filter sheet | Rating, veg, cuisine, price, time, offers, Reset | – | – | |
| S-022 | Category results | Restaurants by category | rpc | L E R | |
| S-030 | Restaurant detail | Cover, info, fav, share, search-in-menu, chips, sections (collapsible), offers | restaurant, menu | L E R O | → S-031, Cart |
| S-031 | Item detail/customize sheet | Image, variants, add-ons (required/optional), qty, instructions, live total | item | L R | → Cart |
| S-032 | Restaurant reviews | Rating distribution, list (paged), report | reviews | L E R | |
| S-040 | Cart | Items, edit, coupon, loyalty, totals, min order, replace-cart dialog | local + quote | E R | → S-041 |
| S-041 | Coupons list | Eligible coupons | rpc | L E R | |
| S-050 | Checkout | Address, summary, payment method, Place order | quote | L R | → S-051/S-052 |
| S-051 | Payment | Gateway SDK handoff, pending verification | payments | L R | |
| S-052 | Order confirmation | Order number, ETA, track | order | S | → S-060 |
| S-060 | Order tracking | Timeline, items, payment status, ETA, cancel, support | orders (realtime) | L R O | |
| S-061 | Orders list | Active/Past/Cancelled tabs | orders | L E R | → S-062 |
| S-062 | Order detail/receipt | Itemized, payment, refund info, reorder, rate | order | L R | |
| S-063 | Cancel order | Reason select, refund info | cancel-order | R | |
| S-070 | Rate order | Restaurant + item stars/text | submit_review | R S | |
| S-080 | Favorites | Restaurants / Items tabs | favorites | L E R | |
| S-090 | Rewards dashboard | Points, tier progress, expiry, how-it-works | loyalty | L E R | → S-091 |
| S-091 | Rewards history | Ledger (paged) | ledger | L E R | |
| S-100 | Profile | Photo, name, phone, email, menu items | profile | L R | |
| S-101 | Edit profile | | profiles | R | |
| S-102 | Notification preferences | Channels toggles | prefs | | |
| S-103 | Help & support | FAQ, tickets list, create ticket | tickets | L E R | |
| S-104 | Legal pages | Terms, Privacy, Refund policy (web view/static) | static | | |
| S-105 | Notifications list | In-app history | user_notifications | L E R | → deep link |
| S-106 | Delete account | Explain retention, OTP confirm | request | R S | |
| S-107 | Force update / maintenance | min version check | app_settings | | |

## Restaurant console (web)
| ID | Page | Notes |
|---|---|---|
| R-001 | Login + restaurant picker | role verified server-side |
| R-002 | Live orders board | realtime + sound, accept/reject, prep time |
| R-003 | Order detail | items, instructions, status buttons |
| R-004 | Order history | filters |
| R-005 | Menu manager | categories, items, variants, add-ons, images, availability toggle |
| R-006 | Restaurant profile & hours | temp close |
| R-007 | Reviews | read, report |
| R-008 | Sales summary | day/week/month |
| R-009 | Promotions (permitted) | restaurant-scoped coupons |

## Rider (web, minimal)
| ID | Page |
|---|---|
| D-001 | Assigned orders list/detail with Picked up / Delivered / COD collected |

## Admin (web)
| ID | Page |
|---|---|
| A-001 | Overview KPIs |
| A-002 | Restaurants list/detail (approve, suspend, assign owner, zones) |
| A-003 | Menu management |
| A-004 | Orders (search, filters, detail, cancel/refund, history) |
| A-005 | Customers (masked sensitive data, tickets) |
| A-006 | Promotions |
| A-007 | Reviews moderation |
| A-008 | Loyalty config & ledger, adjustments with reason |
| A-009 | Notifications templates/announcements |
| A-010 | Settings (zones, fees, tax, commission, payments status, support info, brand, policies) |
| A-011 | Audit logs |
| A-012 | Rider assignment & settlements |
| A-013 | Deletion requests |

## Acceptance (per screen)
Matches `Design.md` tokens; uses `Content.md` strings; has all listed states; accessible; no hardcoded data in release; navigation state preserved across bottom tabs.
