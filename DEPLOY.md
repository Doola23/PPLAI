# Deployment

## Frontend (Vite build)

Root directory: `frontend/`. Build: `npm run build` (output in `frontend/dist/`). Serve `dist/` as static files.

Required build-time env var **only if** the backend is on a different origin than the
frontend:

```
VITE_API_URL=https://api.your-domain.com
```

- If frontend and backend are served from the **same domain** (e.g. `/api/*` reverse-proxied
  to the backend), leave `VITE_API_URL` unset — the app calls same-origin `/api/...`.
- If the backend is on a **separate domain/port**, you MUST set `VITE_API_URL` to its full URL.
- Local dev needs nothing: the app auto-targets `http://<host>:3001` (works for LAN/mobile).

## Backend (Node/Express, port 3001)

Set these in the hosting platform's environment (never committed):

The backend reads model outputs from `ml/` in the repo, so it must be deployed with the
whole repo (Render) or built from the repo root (Docker). User accounts are written to
`backend/data/users.json` — on hosts with an ephemeral disk they reset on each redeploy
(attach a persistent disk and point `STORE_DIR` at it, or move to a database).

```
JWT_SECRET=...
JWT_REFRESH_SECRET=...
STORE_DIR=/var/data                               # optional: persistent folder for users.json
FRONTEND_URL=https://your-frontend-domain.com   # required for CORS to allow the live site
PORT=3001                                        # or platform-assigned
FOOTBALL_DATA_API_KEY=...                         # optional: live gameweek mapping
```

CORS allows `FRONTEND_URL`, localhost, and private-LAN origins (dev). Without `FRONTEND_URL`
the deployed frontend's requests will be blocked.

## No-credit-card option: Vercel (frontend) + Koyeb (backend)

**Frontend on Vercel** (`vercel.json` is included):
1. vercel.com → New Project → import `Doola23/PPLAI`.
2. Leave Root Directory as the repo root. Install/build/output come from the root `vercel.json` (builds `frontend/` → `frontend/dist`).
3. Add env var `VITE_API_URL` = the Koyeb backend URL → Deploy.
4. (Re-deploy after changing `VITE_API_URL` — it's baked in at build time.)

**Backend on Koyeb** (`backend/Dockerfile` is included, no card required):
1. koyeb.com → Create Service → GitHub → `Doola23/PPLAI`.
2. Builder: **Dockerfile**, Dockerfile path `backend/Dockerfile`, work directory: repo root.
3. Instance: Free. Port: `8000` (Koyeb injects `PORT`; the app reads `process.env.PORT`).
4. Env vars: `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `FRONTEND_URL` = the Vercel URL.
5. Deploy → copy the service URL → set it as `VITE_API_URL` on Vercel and redeploy the frontend.

## Must serve over HTTPS

Share, clipboard copy, and PDF export rely on a secure context — they work on HTTPS (and
localhost) but are disabled on plain HTTP.
