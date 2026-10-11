# Mahani Builder — Cloud Deployment

This repository can run as a single Node.js web service. The Express server serves `public/index.html` and exposes the `/api/*` endpoints. Android APK compilation remains on GitHub Actions; the web server must not run Flutter builds locally.

## Deploy to Railway

1. Create a Railway project from the GitHub repository `hlab37850-jpg/Mahani-Builder`, branch `main`.
2. Railway detects the repository's `Dockerfile`. The container installs Node.js dependencies, Git, and unzip.
3. Add the required environment variables in Railway's Variables panel:
   - `OPENROUTER_API_KEY`: API key used by the current project-generation endpoint.
   - `GITHUB_OWNER`: GitHub account that owns the generated app repositories.
   - `GITHUB_TOKEN`: token authorized to create/push repositories and dispatch GitHub Actions workflows. Keep it in Railway Variables only; never commit it or paste it into chat.
4. Generate a public domain for the Railway service.
5. Add a Railway Volume mounted at `/app/server/projects`. The generator stores project files, checkpoints, and downloaded APKs there. Without persistent storage, these files may disappear after redeploys or restarts.
6. Open `https://YOUR-DOMAIN/api/health`. A healthy service responds with JSON containing `"success": true` and `"status": "online"`.
7. Open the service's root URL and submit a small test project. Confirm that a generated repository is created, its GitHub Actions workflow succeeds, and the APK download link returns a file.

## Important

- The UI now submits one request to `/api/analyze`. That endpoint already generates the project, pushes it to GitHub, waits for the cloud build, and returns the build result. The UI must not dispatch a second unrelated build.
- APK downloads are served from `/api/project/:name/apk` after the generated APK exists on the persistent volume.
- `server/projects` is excluded from the Docker build context because it is runtime data.
- The existing Vercel deployment is not deleted or changed by this Railway setup. Test the Railway URL before switching any custom domain or changing Vercel settings.
- Do not publish API keys, GitHub tokens, or environment files in the repository.
