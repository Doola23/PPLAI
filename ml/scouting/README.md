# Scouting System

A tactical player-search engine over **2,168 players across five leagues** (Premier League,
La Liga, Serie A, Bundesliga, Ligue 1). It ranks players by how well they fit a scout's brief
rather than by a single global rating.

## How it works

- **Filtering** — position, age, budget/market value, preferred foot, contract status,
  nationality, league, plus hard *knockout* thresholds on any attribute.
- **Match score** — for each attribute you prioritise, the player's value is turned into a
  **z-score against their positional peer group**, scaled to 0–100, and combined as a
  **weighted average** by the priority you set (Required / High / Medium / Low). So the ranking
  reflects fit to your exact requirements, not overall fame.
- **Roles & similarity** — players are KMeans-clustered **within their position** and assigned
  role labels; "similar players" is a **within-position cosine similarity** so a winger is
  compared to wingers, not to centre-backs.
- **Reports** — each player gets a full report: radar profile, percentile bars vs positional
  peers, shot map, recent form, strengths/weaknesses, and a head-to-head comparison.

## Layout

| Path | What it is |
|---|---|
| `data/scouting_bundle.json` | Player pool (current + previous season), match logs, shot maps and the `ml` block. Served as-is by the backend `/api/scouting/*` routes. |
| `data/player_profiles.csv` | Transfermarkt positions used by the ML pipeline (local only, git-ignored). |
| `ml/` | Python pipeline that regenerates role clustering + similarity into the bundle. See [`ml/README.md`](./ml/README.md). |

The scouting UI is `frontend/src/components/scouting/ScoutLab.jsx`.

## Regenerating the ML

See [`ml/README.md`](./ml/README.md). Re-run the pipeline, then restart the backend.
