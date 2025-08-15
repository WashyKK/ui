This is a [Next.js](https://nextjs.org/) app.

## Run Locally (UI only)

- Install deps: `npm ci`
- Dev server: `npm run dev` (opens on `http://localhost:3000`)
- Production build: `npm run build`
- Production start: `npm run start`
- Lint: `npm run lint`

Notes:
- Environment variables are loaded from `.env` if present. The app does not require a backend to run; the store page uses mock products.
- To change the dev port: `npm run dev -- -p 4000`.
