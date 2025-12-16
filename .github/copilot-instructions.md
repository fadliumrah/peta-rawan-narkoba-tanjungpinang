# Copilot Instructions for Peta Rawan Narkoba

## Project Overview
This is a full-stack GIS web application for mapping drug-prone areas in Tanjungpinang, featuring a public map and an admin dashboard. The backend is Node.js/Express with MongoDB, and the frontend is React (Vite, TailwindCSS, DaisyUI, React-Leaflet).

## Key Architectural Patterns
- **Monorepo**: `server/` (API, DB, auth, uploads) and `client/` (SPA frontend) are separate but tightly coupled.
- **Data Flow**: Frontend communicates with backend via REST API (`/api/*`).
- **Authentication**: JWT-based, with super admin (KTP: 1308162101990001) as root user. Admin management is strictly protected.
- **Map Data**: Locations are managed in MongoDB and visualized with Leaflet on the frontend. Each kelurahan has a unique color.
- **Uploads**: Images (banner, logo, news) are uploaded via Multer and stored locally or on Cloudinary (see `server/utils/cloudinaryUploader.js`).

## Developer Workflows
- **Install**: Run `npm install` in both `server/` and `client/`.
- **Run**: Use two terminals:
  - Backend: `cd server && npm run dev` (http://localhost:5000)
  - Frontend: `cd client && npm run dev` (http://localhost:3000)
- **Seed Data**: `cd server && npm run seed:dev` (see README for super admin setup)
- **Build Frontend**: `cd client && npm run build` (output: `client/dist/`)
- **Deploy**: Frontend is Vercel-ready (see `client/vercel.json`).

## Project-Specific Conventions
- **Super Admin**: Only KTP 1308162101990001 can manage admins. This user cannot be deleted/edited.
- **Kelurahan Colors**: 10 kelurahan, each with a fixed color (see README and frontend logic).
- **Component Structure**: `client/src/pages/admin/` for admin dashboard, `client/src/components/` for shared UI, `client/src/services/api.js` for API calls.
- **Form Patterns**: Admin forms auto-generate usernames, capitalize names, and validate KTP (16 digits).
- **Map Interactions**: Locations can be added by clicking the map, using GPS, or manual input.
- **Rich Text**: News uses React Quill for editing.

## Integration Points
- **API Endpoints**: See README for full list. Public endpoints for map/news, admin endpoints require JWT.
- **Cloudinary**: Used for image uploads if configured in `server/utils/cloudinaryUploader.js`.
- **Vercel**: Frontend deploys from `client/` folder. Set `VITE_API_BASE` env var for API URL.

## Troubleshooting
- **Ports**: Backend (5000), Frontend (3000). See README for port-kill commands.
- **Uploads**: Ensure `server/uploads/` exists and is writable.
- **MongoDB**: Local or Atlas, connection string in `.env`.

## References
- See `README.md` for setup, workflows, and API details.
- Key files: `server/server.js`, `server/models/`, `client/src/pages/admin/`, `client/src/services/api.js`, `client/src/components/`, `client/src/pages/`.

---
For any unclear conventions or missing patterns, consult the README or ask the maintainers.
