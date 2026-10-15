# Pack Scanner

A mobile-first packing-list app for organizing trips, bags, and items. Scan an item with your camera to identify it and add it to the selected packing.

## Features

- Create trips with destinations and travel dates.
- Add multiple packings to each trip, such as a suitcase or backpack.
- Add, edit, remove, and mark items packed or unpacked.
- Scan items into a packing. Manual scan mode is the default; automatic scanning is also available.
- Match item names to a shared catalog of line icons, including common aliases.
- Save trips and settings in this browser's `localStorage`. There are no accounts or cross-device sync.
- Install as a PWA on supported devices.

## Requirements

- Node.js (20.19+ or 22.12+ recommended).
- A Vercel account and an AI Gateway API key for scan recognition.

## Run locally

Install dependencies:

```bash
npm install
```

Link the project folder to a Vercel project if it is not already linked:

```bash
npx vercel link
```

Set `AI_GATEWAY_API_KEY` for the linked project's **Development** environment in Vercel, or create a local `.env.local` file in the project root:

```text
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
```

Keep the key private. `.env.local` is Git-ignored. Start the app and API function together:

```bash
npx vercel dev
```

Open the local URL printed by Vercel CLI, usually `http://localhost:3000`. Camera access works on `localhost`; allow the browser to use the camera.

`npm run dev` starts Vite's frontend only. The `/api/analyze` function also needs a serverless runtime, so use `npx vercel dev` for scanning locally.

## Build

Create a production frontend build:

```bash
npm run build
```

Vite writes the static site to `dist/`. To preview that build locally:

```bash
npm run preview
```

The preview serves the frontend only; AI scanning requires the API function.

## Deploy to Vercel

1. Import this GitHub repository as a Vercel project.
2. Use the Vite defaults: build command `npm run build`, output directory `dist`.
3. Add `AI_GATEWAY_API_KEY` under **Project Settings → Environment Variables**. Enable it for each environment you use (Production, Preview, and Development).
4. Deploy. Pushes to the configured production branch can trigger deployments automatically.

The key is read only by `api/analyze.js`, which calls Vercel AI Gateway. Model selection is configured in the app's scan settings. The Vercel project link in `.vercel/` is local-only and is excluded from Git.

## Project layout

```text
api/analyze.js       Vercel serverless endpoint for AI recognition
public/              PWA manifest, service worker, and app icons
src/App.jsx          Trips, packings, items, and browser storage
src/Scanner.jsx      Camera scanning and scan modes
src/ItemIcon.jsx     Item name/alias-to-icon catalog
src/SettingsPanel.jsx Scan model and camera settings
```
