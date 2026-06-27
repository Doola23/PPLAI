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
| `ml/` | The Python + Node pipeline that generates the role clustering and similarity, and uploads it to DynamoDB. See [`ml/README.md`](./ml/README.md). |
| `App.jsx` | Standalone reference copy of the scouting UI. |

The live scouting UI used by the app is `src/components/scouting/ScoutLab.jsx`; the backend
serves the player pool from the `scouting-current` / `scouting-ml` DynamoDB tables.

## Regenerating the ML

See [`ml/README.md`](./ml/README.md) for the full re-run steps (clustering → similarity →
DynamoDB upload, with automatic backups).
