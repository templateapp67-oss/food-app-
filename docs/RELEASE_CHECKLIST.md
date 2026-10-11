# Release checklist

- [ ] Dedicated Food staging project selected; migrations applied cleanly and advisors reviewed.
- [ ] pgTAP isolation and full state-machine/concurrency tests pass.
- [ ] Customer Web, Restaurant and Super Admin flows verified with real data.
- [ ] Native parity gaps in ANDROID.md completed; APK builds and device tests pass.
- [ ] Razorpay sandbox order/capture/webhook/refund flows verified; replay and mismatch tests pass.
- [ ] SMS/DLT, FCM client registration, dispatch and retry verified.
- [ ] Real restaurants, business hours, delivery zones, fees and tax reviewed.
- [ ] Legal entity, FSSAI/GST, Terms/Privacy/Refund policy and grievance contact supplied and reviewed.
- [ ] Account deletion/anonymization and retention job implemented/tested.
- [ ] Loyalty FIFO expiry, settlement reporting, serviceability/search pagination gaps completed.
- [ ] Accessibility/mobile/font-scale/visual QA, dependency audit and secret scan completed.
- [ ] Demo disabled/removed for release; no privileged secret in Web/APK.
- [ ] Production backup/restore, monitoring, key rotation and operational runbooks verified.
- [ ] Keystore protected, signed release AAB/APK, Play Data Safety and listing completed.
