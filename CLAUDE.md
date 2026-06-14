# Grocery List App

Expo (SDK 50) app — React Native for iOS/Android + React Native Web for the browser.
Single shared codebase in `src/`; platform differences are handled inline with `Platform.OS`.

## Deploying the web app

The web app is **not** redeployed automatically with mobile builds — it is a separate,
manual step served by Firebase Hosting from the `dist/` folder.

```bash
npm run deploy:web   # expo export --platform web  +  firebase deploy --only hosting
```

Live URL: https://groceries-945a8.web.app (Firebase project `groceries-945a8`).

**Always run `npm run deploy:web` after merging any fix that should reach the web app.**
A source fix alone does nothing on the web until it is re-exported and redeployed —
the deployed site is a frozen build artifact, not live source. (This is how the
"completed items not sorted alphabetically" bug lingered on web: the fix was merged
but the web build was never regenerated.)

Note: `expo export --platform web` overwrites `dist/`, dropping any native bundles
there. To regenerate native exports use `expo export --platform ios,android`.
