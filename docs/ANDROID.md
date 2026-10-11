# Native Android source and APK build

This is Kotlin/Jetpack Compose source, not a WebView wrapper. It is an implementation baseline; the SDK 36 debug APK and JVM unit tests passed on GitHub Actions. Emulator smoke results are recorded in TEST_REPORT.md.

## Prerequisites
Android Studio, JDK 17, Android SDK 36 and a network that can fetch Gradle and Google/Maven dependencies.

Pinned baseline: AGP 8.13.2, Gradle 8.13, Kotlin 2.2.20, Compose UI 1.8.2, Material3 1.3.2, Activity 1.10.1, Lifecycle 2.9.0, Coroutines 1.10.2. These are deliberate stable baseline pins, not a claim that they are the newest versions. The Gradle wrapper was retrieved from Gradle's official v8.13.0 repository.

Primary compatibility references:
- https://developer.android.com/build/releases/agp-8-13-0-release-notes
- https://kotlinlang.org/docs/releases.html
- https://developer.android.com/develop/ui/compose/bom/bom-mapping
- https://developer.android.com/jetpack/androidx/releases/activity
- https://developer.android.com/jetpack/androidx/releases/lifecycle

## Build debug APK
Open `android/` and let Android Studio sync. Or:
```bash
cd android
./gradlew testDebugUnitTest assembleDebug
```
Windows:
```powershell
cd android
.\gradlew.bat testDebugUnitTest assembleDebug
```
Output after a successful build: `android/app/build/outputs/apk/debug/app-debug.apk`. Do not distribute an unverified debug build as a production APK.

`.github/workflows/ci.yml` includes an Android runner that installs SDK 36 and uploads a debug APK artifact. Run 38129495300 compiled the debug APK and uploaded it as `nexora-food-debug-apk`.

## Connect to the same backend
The source defaults to the connected shared project and its public publishable key. Optional public build overrides (never service keys):
```bash
./gradlew assembleDebug -PSUPABASE_URL=https://YOUR-FOOD-PROJECT.supabase.co -PSUPABASE_PUBLISHABLE_KEY=YOUR-PUBLIC-KEY
```
Use the same project and RPC contract as the Web app. Debug uses sample content only if public backend config is missing. Release always disables demo.

## Implementation limits
- COD customer flow source is included; native online Razorpay SDK integration is pending.
- Email/password signup and sign-in are wired to the Food account contract; native compilation passed; actual account credentials and end-to-end native login remain unverified.
- Auth sessions are AES-GCM encrypted with Android Keystore. Expired sessions use the refresh token; refresh failure requires sign-in.
- Cart uses device-local SharedPreferences in this baseline. The reference architecture's Room/DataStore/Hilt migration is pending.
- Orders have a 15-second polling fallback on the Orders screen. Native Realtime subscription is pending.
- Native variants/add-ons, favorites, reviews, coupons discovery, FCM/Crashlytics, localization and full support/deletion flow need completion and device tests.
- The order deep link opens the authenticated Orders tab; precise order detail routing remains to be implemented.
- Address form uses manual coordinates; current-location permissions/geocoding are pending.

## Release
Complete staging tests and outstanding parity first. Build/sign with your private keystore using Android Studio's Generate Signed Bundle/APK wizard. Keep keystore and passwords outside Git. Prepare Play privacy/deletion URLs, Data Safety, FSSAI/GST and policy content before public launch. No release signature or Play readiness is claimed.

## Final CI result
All five jobs passed in [run 38129902657](https://github.com/templateapp67-oss/food-app-/actions/runs/38129902657): Web, database, browser, Android debug build and Android device. Native UI Automator: 2/2 smoke tests passed on an API 35 Android emulator (email sign-in/signup fields and Orders/Rewards navigation after rotation). The rotation test now waits for recreated UI elements before tapping. This checks screen reachability, not actual account sign-in or complete native fulfillment.
