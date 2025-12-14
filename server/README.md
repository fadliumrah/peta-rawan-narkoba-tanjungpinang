Server setup and troubleshooting

Environment variables:
- `MONGODB_URI`: MongoDB connection string (Atlas or local). Example: `mongodb://localhost:27017/peta-rawan-narkoba` or Atlas connection string.
- `PORT`: port the server listens on (default `5000`).
- `WAIT_FOR_DB=1` (optional): if set, server will wait for MongoDB to be reachable before starting; if it cannot connect after retries, the process will exit. When not set, server starts immediately and will continue background retries — write API requests may return 503 until DB is ready.

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
- Migration verification: a dry-run found no local uploads to migrate, so no migration was required.
- The one-time migration script has been removed from the repository. If you have local files to migrate in the future, keep a backup and contact me and I can re-add a migration tool.
- After verifying, you can remove `server/uploads/` or keep a local backup in `server/uploads_backup/`.

Client build changes:
- The repository no longer performs an automatic client build during `npm install` in the `server/` folder. If you need to build the client, run:

  ```bash
  cd client
  npm ci
  npm run build
  ```

  Or integrate the client build in your CI pipeline.

Logs & debugging:
- Startup will attempt to connect to MongoDB with retries and exponential backoff; errors are logged with attempt count and messages.
- Use `/api/health` to check runtime status of the API and DB connectivity.

If you still have trouble connecting, paste the connection error messages from the server logs and I'll help diagnose further.
