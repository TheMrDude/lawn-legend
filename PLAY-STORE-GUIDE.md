# Lawn Legend → Google Play (Trusted Web Activity)

The game ships to Google Play as a **Trusted Web Activity (TWA)**: a thin, signed
Android package that opens `lawn-legend.vercel.app` fullscreen. The Play "app" is
the live site — every Vercel deploy updates it instantly, with no store
re-submission (only icon/name/version changes need a new upload).

Everything code-side is already in this repo:

| File | Purpose |
|---|---|
| `manifest.json` + `/icons/` | PWA install metadata (Play reads name/colors/icons from it) |
| `sw.js` | Offline support — a Play requirement for TWAs in practice |
| `twa-manifest.json` | Bubblewrap build config, ready to use |
| `.well-known/assetlinks.json` | Domain↔app trust — **needs the real fingerprint (Step 4)** |
| `privacy.html` | Privacy policy — Play requires the URL at submission |

## One-time setup

1. **Play Console account** — https://play.google.com/console, $25 one-time.
2. **Node 18+** and a **JDK 17** locally (Bubblewrap can download the Android SDK itself).

## Step 1 — Build the package

Option A (CLI, uses the checked-in config):

```bash
npm i -g @bubblewrap/cli
bubblewrap build          # reads twa-manifest.json; creates android.keystore on first run
```

> Say yes when it offers to create a signing keystore. **Back up
> `android.keystore` and its passwords somewhere safe** (password manager) —
> it is NOT committed to git. Losing it means you can't update the app
> (unless Play App Signing is on, which Step 3 enables — do it).

Option B (no local toolchain): go to **https://www.pwabuilder.com**, enter
`https://lawn-legend.vercel.app`, and download the Android package it generates.
Use package ID `com.themrdude.lawnlegend` to stay consistent with
`assetlinks.json`.

Either way you end up with an `.aab` file.

## Step 2 — Create the app in Play Console

- Create app → name **Lawn Legend**, type **Game**, free.
- Store listing: short + full description, at least 2 phone screenshots
  (portrait — screenshot the installed PWA), 512×512 icon (use
  `icons/icon-512.png`), 1024×500 feature graphic.
- **Privacy policy URL:** `https://lawn-legend.vercel.app/privacy.html`
- Content rating questionnaire (it's a casual sim — no violence/gambling),
  target audience, and the **Data safety** form. Answer the data form to match
  privacy.html: collects optional email (user-provided, deletable), optional
  public display name + scores, anonymous cloud saves; no ads, no data sold.

## Step 3 — Upload with Play App Signing ON

Upload the `.aab` to an **Internal testing** track first. Accept **Play App
Signing** when offered (Google holds the production key — protects you from
keystore loss).

## Step 4 — Fix the fingerprint (critical)

Without this, the app opens with a browser address bar instead of fullscreen.

1. Play Console → **Setup → App integrity → App signing key certificate** →
   copy the **SHA-256 certificate fingerprint**.
2. Paste it into `.well-known/assetlinks.json` in this repo, replacing
   `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT`
   (format: `AA:BB:CC:...` — keep the colons).
3. If you built with Bubblewrap and did NOT enable Play App Signing, also add
   your local keystore's fingerprint
   (`keytool -list -v -keystore android.keystore` → SHA256). Both can be listed.
4. Commit, push, let Vercel deploy, then verify:
   `https://lawn-legend.vercel.app/.well-known/assetlinks.json` returns the
   fingerprint, and Google's checker at
   https://developers.google.com/digital-asset-links/tools/generator passes.

## Step 5 — Test, then promote

Install from the Internal testing link on a real phone. Check: fullscreen (no
URL bar — if there is one, Step 4 isn't right yet), offline launch works,
cloud sync dot goes green. Then promote the release to **Production**. First
review typically takes 1–7 days.

## Updating later

- **Game changes:** just deploy the site (bump `CACHE_VERSION` in `sw.js` as
  usual). The Play app updates itself — nothing to upload.
- **Icon/name/color changes:** bump `appVersionCode`/`appVersionName` in
  `twa-manifest.json`, run `bubblewrap update && bubblewrap build`, upload the
  new `.aab`.
