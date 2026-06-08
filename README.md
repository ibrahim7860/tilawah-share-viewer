# Tilawah Share Viewer

A no-login web viewer for a shared Qur'an. A reader opens a link of the form
`https://<host>/#<token>` and sees the shared pages plus their marked mistakes —
no account, no install. The share token lives in the URL fragment (`#...`), so it
never reaches the server as a query string or `Referer`.

This is a static Vite + React single-page app. It talks to the Tilawah backend at
`${VITE_API_BASE}` on the `/api/share/view/*` routes.

## Dev

The `tilawah` app repo must be checked out next to this one (see
[Build-time dependency](#build-time-dependency-on-tilawah)) — the dev server reads
Qur'an page data and fonts that the build step extracts from it.

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

`build` first runs a `prebuild` step (`scripts/extract-quran-assets.mjs`) that
extracts the 604 per-page JSON files and Arabic fonts from the sibling `../tilawah`
app into `public/pages/` and `public/fonts/`. Then `vite build` emits the static
site into `dist/`.

### Build-time dependency on `../tilawah`

The page data and fonts are **not** stored in this repo (`public/pages` and
`public/fonts` are gitignored). They are extracted at build time from the
`tilawah` mobile-app repo, which **must be checked out next to this one**:

```
tilawah-workspace/
├── tilawah/                ← required at build time (page JSON + fonts)
└── tilawah-share-viewer/   ← this repo
```

If `../tilawah` is missing, the `prebuild` step fails and the build will not
produce a working `dist/`.

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
