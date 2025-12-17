# Copilot Instructions for Peta Rawan Narkoba

Purpose: short, actionable guide for AI contributors to be productive quickly (run, debug, add API/UI features, follow project conventions).

## Big picture (quick)
- Monorepo with two main parts: `server/` (Node.js, Express, MongoDB) and `client/` (React, Vite, Tailwind, React-Leaflet).
- The client talks to the API under `/api/*`. In production the server may serve the client build from `server/../client/dist`.
- Auth uses JWT; admin UI uses a token stored in localStorage (see `client/src/services/api.js`).

## Quick start (commands you will use)
- Install: `npm install` at repo root (root scripts call client/server subcommands) or run separately:
  - `cd server && npm ci`
  - `cd client && npm ci`
- Run dev servers (two terminals):
  - Backend: `cd server && npm run dev` (nodemon, default port 5000)
  - Frontend: `cd client && npm run dev` (Vite, default port 3000)
- Useful scripts:
  - `cd server && npm run seed:dev` — seed sample data (logo, banner, location, news, super admin when DB empty)
  - `cd server && npm run smoke-test` — lightweight smoke/end-to-end checks
  - `cd client && npm run test` — run frontend tests (Vitest)
  - Root `npm run build:client` builds client for production (used by server `postinstall`)
  - `node server/createAdmin.js` — create the super admin (KTP 1308162101990001)

## Important environment variables
- `MONGODB_URI` — MongoDB connection string (Atlas or local)
- `JWT_SECRET` — required for auth tokens
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — optional; when set images upload to Cloudinary
- `VITE_API_BASE` — client-side API base (useful in Vercel deployments), e.g. `https://<api>/api`
- `WAIT_FOR_DB=1` — make server wait for DB on startup (useful in CI/deploy pipelines)
- `ALLOWED_ORIGINS` — comma-separated CORS whitelist (optional)
- `LOG_REQUESTS=1` — enable verbose per-request logging for debugging

## Patterns & project conventions (do these)
- Backend uses ES modules (import/export). Add new API modules under `server/routes/*.routes.js` and register them in `server/server.js` with `app.use('/api/<your>', router)`.
- Models live in `server/models/`. Example: `User` uses KTP as `_id` (string, 16-digit validation) — do not change the super admin id `1308162101990001`.
- Uploads: multer uses memory storage (`server/middleware/upload.js`) and images are uploaded via streaming to Cloudinary using `server/utils/cloudinaryUploader.js`. Follow this pattern to avoid writing files to disk.
- Protect admin routes with `authenticateToken` middleware and check roles with `isAdmin` when needed (`server/middleware/auth.js`).
- Client API helpers: update `client/src/services/api.js` for new endpoints. Axios interceptors automatically attach `Authorization: Bearer <token>` and redirect on 401 (auto-logout behaviour).
- Kelurahan/marker colors: predefined list exists in `client/src/components/MapView.jsx` and is reused in `client/src/pages/admin/components/LocationManager.jsx`. When adding location features, keep colors consistent and use `color` field on `Location` model where applicable.

## How to add a feature (example: new resource `events`)
1. Add Mongoose model `server/models/Event.js` (timestamps, schema, indexes as needed).
2. Create `server/routes/event.routes.js` following existing style (public listing, admin protected create/update/delete). Use multer/cloudinary if handling images.
3. Register route in `server/server.js`: `app.use('/api/events', eventRoutes)`.
4. Add API wrapper in `client/src/services/api.js` for the new endpoints.
5. Add UI pages/components under `client/src/pages/` or `client/src/pages/admin/components/` following current patterns (forms, file uploads, toasts). Use `client/src/components/Toast.jsx` and `useToast` for consistent notifications.
6. Add tests: unit/behavior tests in the client with Vitest + MSW; for server you can add a smoke/integration script (follow `server/scripts/*` style).

## Debugging & health checks
- Use `/api/health` and `/api/diagnostics` endpoints for DB and Cloudinary status.
- Enable `LOG_REQUESTS=1` for verbose request logs.
- Server includes retry/backoff for MongoDB connection; set `WAIT_FOR_DB=1` in CI to make failures deterministic.
- For CORS issues, set `ALLOWED_ORIGINS` or run frontend with `VITE_API_BASE` pointing at server.

## Tests & CI notes
- Frontend tests: `client` uses Vitest + testing-library and MSW for network mocking.
- No formal backend test suite currently; use `server/smoke-test` script or add Jest/Mocha as appropriate.
- The `server/postinstall` builds the client so CI/hosting may run `npm ci` in the root and expect the server to embed the client build.

## Files & places to inspect when something breaks
- Server start/connection issues: `server/server.js` (connectDB logic, env flags)
- Uploads/Cloudinary: `server/middleware/upload.js`, `server/utils/cloudinaryUploader.js`, usage in routes (e.g., `server/routes/news.routes.js`)
- Authentication: `server/middleware/auth.js`, login at `server/routes/auth.routes.js` and client token handling in `client/src/services/api.js`
- Map UI and kelurahan list: `client/src/components/MapView.jsx` and `client/src/pages/admin/components/LocationManager.jsx`

## Small rules & gotchas (short)
- Super admin (KTP 1308162101990001) is special: cannot be edited/deleted via UI; use `server/createAdmin.js` for creation if missing.
- `User._id` is KTP (16 digits). Use that format when creating or mocking admin users.
- Prefer Cloudinary uploads from memory buffers; do not add code that writes user-uploaded files to the server disk unless explicitly needed and reviewed.
- Keep API responses consistent (JSON `{ success: true/false, data?, message? }`) following existing routes.

---
If anything is unclear or you'd like me to expand a short example (e.g., a full minimal route+client flow), tell me which area and I’ll add a compact, ready-to-run snippet.
