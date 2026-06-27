# PLAI — Football Analytics & Prediction Platform

PLAI is a full-stack football analytics platform that turns raw Premier League and
top-five-league data into match predictions, season-table forecasts, player stat
projections, injury-risk flags, and a tactical scouting engine — wrapped in a polished,
fully responsive web app.

It combines a **React/TypeScript** frontend, a **Node/Express + DynamoDB** backend, and a
set of **Python machine-learning pipelines** (XGBoost, scikit-learn, Optuna), all validated
with honest, walk-forward backtesting rather than headline-friendly cherry-picked numbers.

---

## Features

| Feature | What it does | Model |
|---|---|---|
| **Match Predictions** | Win / draw / loss probabilities for every fixture, ranked by confidence | XGBoost classifier, 149 engineered features |
| **Table Predictions** | Full season standings with title %, top-4 %, and relegation % | 2,000-run Monte Carlo simulation over the match model |
| **Player Stat Projections** | Next-season forecasts (goals, assists, xG, defensive output) with low/high ranges | Per-position XGBoost regressors, Optuna-tuned |
| **Injury Risk** | High / Low injury-risk tier per player from workload, age, and history | Gradient-boosted classifier |
| **Scout Search** | Filter 2,168 players across 5 leagues by position, budget, foot, and tactical fit; ranked by a weighted match score | KMeans role clustering + within-position cosine similarity + z-score scoring |

---

## Model accuracy (honest, walk-forward validated)

These come from real held-out evaluation, not in-sample fits:

- **Match outcome model** — walk-forward cross-validation across three Premier League
  seasons: **53.4% average** test accuracy (2022-23: 47.9%, 2023-24: 58.7%, 2024-25: 53.4%).
  Strong on decisive games (home/away ≈ 70–85%); draws are the known hard class for all such models.
- **Injury-risk model** — **AUC 0.672**, 69.3% sensitivity on held-out data (no GPS/biomechanical
  data available, which is the real accuracy ceiling).
- **Player stat projections** — per-target **R² 0.33–0.80** on a held-out season; goalkeepers
  excluded because the GK sample is too small to beat predicting the league average.

Each model's folder documents its own numbers, methodology, and limitations.

---

## Tech stack

**Frontend** — React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · Recharts · Spline (3D) · React Router

**Backend** — Node.js · Express · AWS DynamoDB (`@aws-sdk`) · JWT auth (access + refresh) · bcrypt

**Machine learning** — Python · XGBoost · scikit-learn · Optuna · pandas · NumPy

**Data sources** — FBref (player/match stats) · Transfermarkt (positions, valuations) · football-data.org (fixtures) · FotMob (player imagery)

---

## Repository structure

```
src/                  React/TypeScript frontend (the app)
backend/              Node/Express API + DynamoDB access + JWT auth
match_prediction/     XGBoost match-outcome model + Monte Carlo season simulation
player_stats/         Per-position player stat projection models
injury_prediction/    Injury-risk classifier
scouting/             Scouting role-clustering + similarity ML pipeline
public/               Static assets
DEPLOY.md             Deployment guide (Render / Vercel+Koyeb)
```

Each ML folder has its own README with the pipeline, how to re-run it, and current accuracy.

---

## Running locally

**Frontend**
```bash
npm install
npm run dev          # http://localhost:5173
```

**Backend**
```bash
cd backend
npm install
npm run dev          # http://localhost:3001  (needs AWS + JWT env vars, see DEPLOY.md)
```

The frontend auto-targets the backend in dev (including over your LAN for mobile testing).
Secrets live only in `backend/.env` (git-ignored) — never in the repo.

## Deployment

See [`DEPLOY.md`](./DEPLOY.md) for the full guide. The app deploys cleanly to **Render**
(included `render.yaml` blueprint) or **Vercel + Koyeb** — the frontend is a static SPA
and the backend is a small containerized Node service.

---

## Notes

- Predictions are **forecasts** built from data through the 2024-25 season — no future
  results leak into training.
- All credentials are environment-based; the repo contains no secrets.
