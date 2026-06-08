# Tilawah Share Viewer

A no-login web viewer for a shared Qur'an. A reader opens a link of the form
`https://<host>/#<token>` and sees the shared pages plus their marked mistakes —
no account, no install. The share token lives in the URL fragment (`#...`), so it
never reaches the server as a query string or `Referer`.

This is a static Vite + React single-page app. It talks to the Tilawah backend at
`${VITE_API_BASE}` on the `/api/share/view/*` routes.

## Dev

The Qur'an page data and fonts are **committed to this repo** (`public/pages/` and
`public/fonts/`, fonts via Git LFS), so the dev server and build work standalone —
no sibling `../tilawah` checkout required. Make sure Git LFS is installed
(`git lfs install`) so the font files are pulled as real `.woff2` files, not LFS
pointers.

```bash
npm install
npm run dev
```

Then open the dev server with a real share token in the fragment:

```
http://localhost:5173/#<token>
```

A share token is created by the mobile app's **"Share my Qur'an"** action, or
directly on the backend via `POST /api/share/link`.

## Build

```bash
npm run build
```

`build` runs only `vite build`, which copies the committed `public/` (604 per-page
JSON files + Arabic fonts) into the static site under `dist/`. **No `../tilawah`
checkout is required at build/deploy time** — the assets ship with this repo.

### Regenerating assets (`npm run extract`)

The page data (`public/pages/p{1..604}.json`) and fonts
(`public/fonts/p{1..604}.woff2`) are **committed to this repo** — page JSON
directly, fonts via **Git LFS**. They are no longer extracted during `build`.

When the source Qur'an data in the `tilawah` mobile app changes, regenerate the
committed assets locally and commit the result:

```bash
npm run extract   # runs scripts/extract-quran-assets.mjs, reads from ../tilawah
git add public/pages public/fonts && git commit -m "chore: regenerate Quran assets"
```

`npm run extract` requires the `tilawah` app repo checked out next to this one:

```
tilawah-workspace/
├── tilawah/                ← only needed for `npm run extract`
└── tilawah-share-viewer/   ← this repo
```

## Deploy

Deployed as a **Render Static Site** via the included [`render.yaml`](./render.yaml)
blueprint:

- Build: `npm install && npm run build`
- Publish directory: `./dist`
- SPA rewrite: all routes (`/*`) serve `index.html` so the fragment-token URLs
  resolve client-side.
- `Referrer-Policy: strict-origin-when-cross-origin` so the fragment token is
  never leaked via the `Referer` header.

### Required configuration

**This site** — set `VITE_API_BASE` to the backend origin (the blueprint already
sets `https://tilawah-backend.onrender.com`).

**The backend** — you must also configure the backend for this site's deployed
origin (e.g. `https://share.tilawah.app`):

- `SHARE_VIEWER_ORIGIN` — set to this site's origin so CORS allows the viewer's
  requests to `/api/share/view/*`.
- `SHARE_BASE_URL` — set to this site's origin so generated share links point
  here.

## Env

| Variable        | Default                                | Purpose                          |
|-----------------|----------------------------------------|----------------------------------|
| `VITE_API_BASE` | `https://tilawah-backend.onrender.com` | Backend origin for share routes. |
