# Browser and Android device testing

The source now includes repeatable desktop/mobile/GPS and Android instrumentation test setup. This is not evidence of execution: no browser, Android SDK, emulator or physical device was available in the managed workspace, and the Sites source repository does not itself run GitHub Actions.

## Browser/mobile Web
`qa/browser` pins Playwright and defines Desktop Chrome, Pixel 7 and iPhone 13 projects. Scenarios cover responsive width, mouse/touch restaurant navigation, local demo checkout, granted Jaipur GPS coordinates and direct cover/gallery/menu image selection. Tests use a labelled local demo and do not place live restaurant orders or send email.

On a workstation or GitHub Actions runner with browser support:
```bash
npm ci
npm run build
cd qa/browser
npm ci
npx playwright install --with-deps chromium webkit
npm test
```
To exercise the deployed build, set `PLAYWRIGHT_BASE_URL=https://nexora-food.templateapp67.chatgpt.site` before `npm test`. Review screenshots, traces, videos and HTML reports under `qa/browser/test-results` and `qa/browser/playwright-report`. Mobile browser emulation does not prove real-phone or native APK behavior.

TinyFish was found as an available browser integration and suggested for connection. It was not connected at the time of this update. No remote browser session has been run through it. The managed environment's `$control-browser` capability is absent; no local preview or improvised browser runner was started here.

## Android APK and emulator
`.github/workflows/ci.yml` now has an `android-device` job that provisions an API 35 emulator, sets Jaipur GPS coordinates, builds the SDK 36 app and runs `connectedDebugAndroidTest`. The job stores test reports, a screenshot and the debug APK as artifacts. Native instrumentation source checks Profile → email sign-in/signup fields and navigation after rotation. Injecting GPS into the emulator alone does not exercise a native location UI: native location permission/GPS UI remains pending.

Run on Android Studio/SDK or an authenticated physical device:
```bash
adb devices
cd android
./gradlew connectedDebugAndroidTest assembleDebug
```
The runner must have JDK 17, SDK 36 and build tools. Allow USB debugging on a physical device; a computer cannot silently grant that hardware permission. Do not expose an ADB port publicly.

To run the workflow remotely, this source must be in a GitHub repository with Actions enabled. Choose **Nexora Food checks → Run workflow** or push a change. No GitHub runner or device session was created here; the workflow is prepared source only.

## Still requiring live test accounts and devices
Actual signup/login/session refresh, real authorized image upload/storage round trip, denied GPS permission, camera/file-picker permissions, complete native COD checkout, delivery tracking, payment providers and physical Android/iPhone touch/accessibility tests remain unverified. Use designated staging accounts/business records for these flows.

References: https://playwright.dev/docs/emulation, https://developer.android.com/training/testing/other-components/ui-automator-legacy, https://github.com/ReactiveCircus/android-emulator-runner
