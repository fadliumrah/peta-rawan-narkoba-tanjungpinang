Server setup and troubleshooting

Environment variables:
- `MONGODB_URI`: MongoDB connection string (Atlas or local). Example: `mongodb://localhost:27017/peta-rawan-narkoba` or Atlas connection string.
- `PORT`: port the server listens on (default `5000`).
- `WAIT_FOR_DB=1` (optional): if set, server will wait for MongoDB to be reachable before starting; if it cannot connect after retries, the process will exit. When not set, server starts immediately and will continue background retries — write API requests may return 503 until DB is ready.
- `TRUST_PROXY` (optional): set to `1` to trust the first proxy (recommended on PaaS like Railway). Avoid setting `TRUST_PROXY=true` (boolean) because express-rate-limit treats a plain `true` as overly permissive and will raise `ERR_ERL_PERMISSIVE_TRUST_PROXY`. If unset, the server defaults to `1` when `NODE_ENV=production` (recommended).

Common issues & fixes:
- Port already in use: check which process is using the port and terminate it.
  - Windows:
    ```powershell
    netstat -ano | findstr :5000
    taskkill /PID <pid> /F
    ```
  - Linux/macOS:
    ```bash
    lsof -i :5000
    kill -9 <pid>
    ```

- MongoDB connection failures:
  - Ensure `MONGODB_URI` is valid and includes correct user/password and database name.
  - If using MongoDB Atlas, ensure your IP is whitelisted and credentials are correct.
  - Enable `WAIT_FOR_DB=1` to have the server block until DB is available during startup (useful for deterministic deployment setups).

Uploads migration and cleanup:
- The project used to persist uploads to `server/uploads/` before uploading to Cloudinary. We now upload directly from memory to Cloudinary and no longer serve `/uploads`.
- To safely migrate existing local files to Cloudinary, use the migration script:

  ```bash
  cd server
  node scripts/migrate-uploads-to-cloudinary.js --dry-run    # preview
  node scripts/migrate-uploads-to-cloudinary.js --confirm    # perform migration and backup
  ```

- After migrating and verifying, you can remove `server/uploads/` or keep a local backup in `server/uploads_backup/`.

Logs & debugging:
- Startup will attempt to connect to MongoDB with retries and exponential backoff; errors are logged with attempt count and messages.
- Use `/api/health` to check runtime status of the API and DB connectivity.

Client builds during install:
- The server `postinstall` script will attempt to build the `client` folder (if present) by running `npm ci --omit=dev` and `npm run build` inside `client`. This ensures the server can serve a production SPA when deployed. If you don't want automatic client builds, remove the `postinstall` script from `server/package.json` or set CI-specific flags.

Railway (Deploy) notes:
- To avoid npm printing the `Use --omit=dev` warning in startup logs, set the Railway Service "Install Command" and "Start Command" explicitly:
  - Install Command: `npm ci --omit=dev`
  - Start Command: `node server.js`  (or `npm run start:node` if you prefer an npm script)
- Alternatively, set environment variables in Railway:
  - `NPM_CONFIG_OMIT=dev` and/or `NPM_CONFIG_PRODUCTION=false`
- After changing these settings, redeploy and check logs; the npm production warning should disappear.

If you still have trouble connecting, paste the connection error messages from the server logs and I'll help diagnose further.
