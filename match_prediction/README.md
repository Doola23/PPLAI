# Match Prediction Model

XGBoost model that predicts Premier League **match outcomes** (home win / draw / away win),
plus a **Monte Carlo season simulation** that turns those per-match probabilities into a full
predicted league table.

## What it produces

- **Per-match probabilities** — home / draw / away for every fixture, with a predicted scoreline.
- **Season standings** — averaged over 2,000 simulated seasons: each team's expected final
  position, points, **title %**, **top-4 %**, and **relegation %**.
- **Analyst tables** — Elo history, calibration, draw-risk, and per-team season/last-5 reports.

## The model

- **Classifier:** XGBoost (`multi:softprob`, 3 classes), draw class up-weighted (the hard class).
- **~149 engineered features**, including:
  - **Elo ratings** (lagged so no leakage) and rolling **form** (last-5 / last-10 results, goals, streaks)
  - **xG-based** attack/defence strength
  - **Days since last match** / fixture congestion
  - **Injuries, lineups, squad valuations, managers**, and head-to-head history
- **Draw modelling:** a Dixon-Coles correction (`draw.py`) improves low-scoring/drawn-game probabilities.
- **Season simulation:** samples each fixture's outcome from the model's probabilities (with a
  small noise term), 2,000 times, and aggregates the final tables.

## Accuracy (walk-forward, honest)

Time-series cross-validation, training on a rolling 6-season window and testing on the next
unseen season:

| Test season | Accuracy | Home | Away | Draw |
|---|---|---|---|---|
| 2022-23 | 47.9% | 59% | 64% | 3% |
| 2023-24 | 58.7% | 79% | 67% | 2% |
| 2024-25 | 53.4% | 85% | 50% | 5% |
| **Average** | **53.4%** | | | |

Strong on decisive games; **draws are the universally hard class** for outcome models (a draw is
rarely the single most-likely result). Numbers are reproduced in `outputs/cross_validation.csv`.

## Files

| File | Purpose |
|---|---|
| `MatchPredict.py` | The full pipeline: load + clean data, feature engineering, train XGBoost, walk-forward CV, Monte Carlo simulation, and write all output CSVs. |
| `draw.py` | Dixon-Coles draw-probability model used to refine drawn/low-scoring games. |
| `upload_outputs.py` | Pushes the generated `outputs/*.csv` to DynamoDB (reads AWS creds from `../backend/.env`; no hardcoded secrets). |
| `premierleaguedata/` | Per-season match results (`15_16.csv` … `24_25.csv`) — the prediction target. |
| `xg/` | xG datasets used for attack/defence strength features. |
| `data/` | Supporting inputs: injuries, players, lineups, valuations, managers, season stats. |
| `outputs/` | Generated CSVs (`match_predictions`, `predicted_standings`, `cross_validation`, calibration, analyst reports, …). |

## Re-run

```bash
# Train, validate, simulate, and write outputs/  (UTF-8 for Windows consoles)
PYTHONUTF8=1 python MatchPredict.py

# Push the generated CSVs to DynamoDB (uses backend/.env at runtime)
python upload_outputs.py
```

## Notes

- Predictions stop at the **2024-25** season — no future results leak into training.
- The season simulation leans on each fixture's **real pre-match form**, so it's a season-long
  retrodictive projection, not a single pre-season forecast.
