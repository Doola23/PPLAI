# Deployment

## Frontend (Vite build)

Build: `npm run build` (output in `dist/`). Serve `dist/` as static files.

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

```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
JWT_SECRET=...
FRONTEND_URL=https://your-frontend-domain.com   # required for CORS to allow the live site
PORT=3001                                        # or platform-assigned
FOOTBALL_DATA_API_KEY=...                         # optional: live gameweek mapping
```

CORS allows `FRONTEND_URL`, localhost, and private-LAN origins (dev). Without `FRONTEND_URL`
the deployed frontend's requests will be blocked.

## No-credit-card option: Vercel (frontend) + Koyeb (backend)

**Frontend on Vercel** (`vercel.json` is included):
1. vercel.com → New Project → import `Doola23/PPLAI`.
2. Framework: Vite (auto). Build/output come from `vercel.json` (`npm run build` → `dist`).
3. Add env var `VITE_API_URL` = the Koyeb backend URL → Deploy.
4. (Re-deploy after changing `VITE_API_URL` — it's baked in at build time.)

**Backend on Koyeb** (`backend/Dockerfile` is included, no card required):
1. koyeb.com → Create Service → GitHub → `Doola23/PPLAI`.
2. Builder: **Dockerfile**, Dockerfile path `backend/Dockerfile`, work directory `backend`.
3. Instance: Free. Port: `8000` (Koyeb injects `PORT`; the app reads `process.env.PORT`).
4. Env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `JWT_SECRET`,
   and `FRONTEND_URL` = the Vercel URL.
5. Deploy → copy the service URL → set it as `VITE_API_URL` on Vercel and redeploy the frontend.

## Must serve over HTTPS

Share, clipboard copy, and PDF export rely on a secure context — they work on HTTPS (and
localhost) but are disabled on plain HTTP.
