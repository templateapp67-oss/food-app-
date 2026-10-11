# Jaipur Food launch scope

Only Nexora Food is offered in the current UI. Grocery and dineout reference sections are reserved for future work; no inactive or pretend services have been added.

The customer home uses an orange food hero, food categories, restaurant cards and 18 Jaipur neighbourhood links. Links filter the current catalogue by the restaurant address text. Empty neighbourhoods show an honest empty result. The neighbourhood list does not certify delivery coverage or represent real partnered restaurants.

New customer addresses use Jaipur, Rajasthan with a required locality choice. Admin restaurant creation fixes Jaipur and includes the selected locality in the street address. The customer catalogue hides other cities. Previously saved records are preserved; non-Jaipur delivery addresses cannot be selected or used for checkout in the web client. Web quote and order submission both check city. Native source fixes Jaipur/Rajasthan, offers the same locality choices and checks address/restaurant city before checkout. Exact delivery zones remain a backend check.

These launch restrictions are client-side scope controls, not a replacement for server validation. Before real launch, the Food backend must enforce service area/coordinates and restaurant zones in quote and order RPCs. No remote database was changed for this revision.

Web automated checks cover locality filtering, empty locality results, fixed city/state inputs and exclusion of non-Jaipur restaurant records. Browser visual verification is unavailable in this environment. Native Android compilation remains unverified because the Android SDK/Gradle download is unavailable; this revision produces source, not an APK.
