# NURSE Platform - Session Summary

## Goal
Fix multi-role healthcare platform deployment:
- **Backend** on Render: `https://nurse-wvfe.onrender.com`
- **Frontend** on Netlify: `https://marvelous-dango-21acdf.netlify.app`
- Add venue master CSV upload with dropdown auto-fill
- Fix CORS, cold-start, and deployment issues

## Changes Made

### Backend (`backend/app/`)

| File | Change |
|------|--------|
| `main.py` | Added `https://marvelous-dango-21acdf.netlify.app` to CORS `allow_origins` |
| `main.py` | Added `GET /health` and `HEAD /health` endpoints for UptimeRobot monitoring |
| `routers/admin.py` | Added `POST /admin/venues/upload` — upload Venue Master CSV (replaces all records) |
| `routers/admin.py` | Changed `GET /admin/venues` to return `VenueMaster` records instead of hospitals |
| `routers/admin.py` | Imported `VenueMaster` model |

### Frontend (`frontend/src/`)

| File | Change |
|------|--------|
| `api/axiosInstance.js` | Hardcoded `baseURL: 'https://nurse-wvfe.onrender.com'` |
| `api/axiosInstance.js` | Added request interceptor to delete `Content-Type` header for FormData requests |
| `api/endpoints.js` | Added `getVenues()` and `uploadVenueCsv()` API functions |
| `pages/Interviews.jsx` | Added Venue Master CSV upload section with upload button and format hint |
| `pages/Interviews.jsx` | Added "Download Sample CSV" button |
| `pages/Interviews.jsx` | Venue dropdown (`venue_name`) auto-fills address field on selection |
| `pages/Interviews.jsx` | Upload result display (success/error toasts) |
| `pages/Interviews.jsx` | Fixed controlled/uncontrolled input React error from toast rendering 422 array |
| `pages/SystemIDGeneration.jsx` | Removed stale "Upload Results CSV" UI |

### Config Files

| File | Change |
|------|--------|
| `frontend/netlify.toml` | Added for SPA fallback routing on Netlify |
| `frontend/vercel.json` | Added (from earlier, now deprecated since moving to Netlify) |
| `.gitignore` | Fixed paths to only match root level |

### Infrastructure

| Item | Details |
|------|---------|
| **Backend** | Render `https://nurse-wvfe.onrender.com` — UptimeRobot Port 443 monitor (5-min interval) keeps it awake |
| **Frontend** | Netlify `https://marvelous-dango-21acdf.netlify.app` — drag-and-drop deploy |
| **Netlify Settings** | `Base directory: frontend`, `Build command: npm run build`, `Publish directory: dist` |

## CSV Upload Format

Required columns in the Venue Master CSV:
```
venue_name,room_number,floor,block,branch
```
Case-insensitive column headers (e.g., `Venue Name`, `Room Number` also work).

## Next Steps

1. **Deploy backend**: Click "Deploy Latest Commit" on Render dashboard to push latest code live
2. **Deploy frontend**: Drag-and-drop `frontend\dist` folder to Netlify Deploy page
3. (Optional) Connect Netlify to GitHub for auto-deploy on push
4. Test venue CSV upload from Interviews page
5. Test login flow from Netlify URL

## Git History (latest commits)

```
bfa4d9c fix: remove Content-Type header for FormData requests, handle 422 error display
59b1ea7 fix: remove explicit multipart Content-Type header to let axios set boundary
7eb242b add Sample CSV download to Interviews venue section
b515924 remove results CSV upload from System ID Generation page
18339d0 feat: venue master CSV upload with dropdown auto-fill in interview sessions
05db3ee fix HEAD handler using StarletteResponse
87460b0 add HEAD handler for /health endpoint
de86318 add /health endpoint
ddeb7f2 add Netlify URL to CORS
733ac92 add Netlify config for frontend deployment
4b9beb7 Hardcode Render API URL in axiosInstance to fix 404 on Vercel
```
