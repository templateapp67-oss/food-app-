# Food image assets

Created with the built-in imagegen tool: 24 individual dish photographs and 6 fictional restaurant exterior concepts, based on the user's natural-light, clearly visible ingredients and welcoming daytime exterior brief.

The complete final prompt set, names and asset paths are in `IMAGE_PROMPTS.json`. Web assets are in `web/public/images/*.webp`. Matching native resources are in `android/app/src/main/res/drawable/photo_*.webp`.

WebP exports are 960 × 640, quality 82. The hero uses the biryani image, category tiles use representative dish photos, all seeded restaurant covers and dishes use their own image. Existing saved demo records receive missing seed images by matching both stable ID and unchanged name; owner-entered URLs and other edits are preserved. The live workspace never receives invented demo business imagery. Broken URLs fall back to the existing illustration.

Restaurant exteriors are generated concepts for fictional demo listings, visibly marked on their cards. They do not document real Jaipur businesses. Native demo cards use bundled image resources without introducing a network or image-loader dependency. Native compilation is still unverified in this environment.

The image outputs were visually reviewed for dish matching, facade names and composition. The loaded-fries asset was regenerated to ensure the vegetarian photo shows only potato, cheese, jalapenos and spring onions. Browser layout verification is unavailable; web tests and production build cover integration.
