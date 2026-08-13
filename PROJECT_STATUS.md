# NURSE Platform — Project Status

## Completed

### Core Backend (Render — https://nurse-wvfe.onrender.com)
- CORS allow_origins includes Netlify URL, local dev, Render, Vercel
- `/health` endpoint (GET/HEAD) for uptime monitoring
- Venue Master CSV upload endpoint: `POST /admin/venues/upload`
- Venue Master dropdown endpoint: `GET /admin/venues` (returns `VenueMaster` records)
- UptimeRobot Port 443 monitor configured (5-min interval)

### Core Frontend (Netlify — https://marvelous-dango-21acdf.netlify.app)
- axios baseURL hardcoded to `https://nurse-wvfe.onrender.com`
- Interceptor deletes `Content-Type` header for FormData requests (fixes 422 errors)
- Error toast handles FastAPI 422 array detail (converts to comma-joined string)
- Netlify SPA routing config (`netlify.toml`)
- Venue Master CSV upload section with file input and upload button
- Sample CSV download button in Interviews page
- Venue dropdown in Interview session creation auto-fills address field
- "Upload Results CSV" removed from System ID Generation page

### Deployment
- Netlify connected to GitHub (base: `frontend`, build: `npm run build`, publish: `dist`)
- Render deploys from GitHub repo

## Pending

### Deployment
- [ ] Trigger "Deploy Latest Commit" on Render dashboard
- [ ] Redeploy frontend on Netlify (auto-deploy should trigger on push to `main`)

### Testing
- [ ] Test venue CSV upload from Interviews page
- [ ] Test login from Netlify URL
- [ ] Test interview session creation with venue dropdown and auto-fill
- [ ] Test other core flows (system ID generation, nurse management)

### Remaining Items
- [ ] Any other features or bug fixes requested

## Key URLs

| Service | URL |
|---------|-----|
| Backend (Render) | https://nurse-wvfe.onrender.com |
| Frontend (Netlify) | https://marvelous-dango-21acdf.netlify.app |
| Render Dashboard | https://dashboard.render.com |
| Netlify Dashboard | https://app.netlify.com |
