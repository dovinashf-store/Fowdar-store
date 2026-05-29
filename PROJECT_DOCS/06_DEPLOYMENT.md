# Deployment

The app is a single HTML file hosted on Netlify.

---

## How to deploy (manual drag-and-drop)

1. Open [app.netlify.com](https://app.netlify.com)
2. Navigate to the Fowdar Store site
3. Go to **Deploys** tab
4. Drag `index_1.html` from the project folder onto the deploy area
5. Wait ~10 seconds for deploy to complete
6. The live URL updates automatically

---

## What to deploy

Only `index_1.html` needs to be deployed. Everything else (`CLAUDE.md`, `PROJECT_DOCS/`, `INVOICE_PROCESSING_PROMPT.md`) stays local.

There is also a `manifest.json` file referenced in the HTML (`<link rel="manifest" href="/manifest.json">`). This enables PWA install on iOS/Android. If it's not on Netlify, the app still works — the manifest just won't load.

---

## When to deploy

After any change to `index_1.html`, deploy to Netlify to push it live.

Changes that require deployment:
- Any new feature or bug fix in the app
- Any UI change
- Any new supplier-specific rule added to `calcRec()`

Changes that do NOT require deployment:
- Changes to `INVOICE_PROCESSING_PROMPT.md` (used in a separate Claude chat)
- Changes to `CLAUDE.md` (Claude Code instructions only)
- Changes to `PROJECT_DOCS/` (documentation only)
- Adding invoices to Supabase (the app reads from Supabase live)

---

## Supabase changes take effect immediately

Supabase data (adding invoices, updating vatRate, creating tables) does not require a redeploy. The app fetches from Supabase on every load and refresh.

---

## Testing locally

Open `index_1.html` directly in a browser (file:// URL). Supabase CORS allows all origins, so the API calls work from local file:// just like from Netlify.

For iOS testing: deploy to Netlify then open on iPhone/iPad. iOS Safari requires HTTPS for some features (PWA install, safe-area CSS).

---

## PWA / Add to Home Screen

The app has `apple-mobile-web-app-capable` meta tags and a manifest. Users can:
- iPhone: open in Safari → Share → "Add to Home Screen"
- Android: Chrome will prompt to install

The app icon and splash screen follow the manifest configuration.
