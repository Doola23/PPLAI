# Player Stats Prediction Model

Predicts each player's 2025-26 season stats (goals, assists, defensive actions,
etc.) from their 2024-25 (and earlier) Premier League history. Per-position
XGBoost regressors trained on 7 seasons (2018-2024) of FBref-style data.

## Files

| File | Purpose |
|---|---|
| `pipeline.py` | Shared data loading + feature engineering. Every other script imports from here -- it's the single source of truth, so a fix here applies everywhere. |
| `tune.py` | Per-target Optuna hyperparameter search. Slow (~80 min). Run only when re-tuning (e.g. after adding a new season). Writes `optuna_best_params_per_target.csv`. |
| `validate.py` | The one validation script. Reports held-out accuracy on both the 2023 and 2024 test seasons, using the tuned hyperparameters. Run this to check the model still works after any change. |
| `generate_predictions.py` | The production script. Trains on all data through 2024 (no held-out season) and writes the live prediction CSVs. |
| `player ratings.ipynb` | Original Colab notebook from early development. Kept for reference -- `pipeline.py` is the maintained version of this logic. |
| `optuna_best_params_per_target.csv` | Tuned hyperparameters per (position, target), produced by `tune.py`, consumed by `validate.py` and `generate_predictions.py`. |
| `validation_report.csv` | Output of `validate.py` -- the current accuracy numbers. |
| `*_2025_Predictions.csv` / `*_Predictions_Only.csv` | The actual deliverable: one file pair per sub-position (Strikers, Wingers, Centre_Backs, Fullbacks, Defensive/Central/Attacking_Midfielders). |

## To regenerate everything from scratch

```
python tune.py                 # ~80 min, only needed after a data/feature change
python validate.py             # ~3 min, confirms accuracy before trusting the predictions
python generate_predictions.py # ~3 min, writes the final CSVs
```

## Current accuracy (held-out 2024 season, trained only on data through 2023)

| Tier | Targets | R² | Notes |
|---|---|---|---|
| Strong | xG/90, Shots/90, Clearances/90, Progressive Passes/90, Key Passes/90, Tackles+Interceptions/90, Pass Completion% | 0.57-0.80 | |
| Decent | Goals/90, Ball Recoveries/90 | 0.52-0.60 | |
| Weaker but real signal | Assists/90 (FW & MF), Interceptions/90, Aerials Won% | 0.33-0.44 | Assists depend on teammate finishing, not just the player's own skill; interceptions/aerials are heavily shaped by team tactics not currently modeled |

Run `python validate.py` for the exact current numbers (per-target tuning periodically improves these).

## Goalkeepers are excluded

GK predictions were built and tested with the same methodology, but 3 of 4 GK
targets (save%, clean sheet%, post-shot xG−GA) scored **worse than just
predicting the league average** (negative R²) -- only 83 GK player-season rows
exist vs 301-666 for outfield positions, not enough for the model to learn
real signal instead of noise. `validate.py` re-confirms this and documents it
rather than silently omitting GK with no explanation.

## Known limitations

- **Small dataset**: only 2018-2024 player-level data exists locally (7
  seasons). No 2015-17 player-level FBref-style files exist anywhere in this
  project -- only match-level betting-odds data in a different schema -- so
  the training set can't currently be extended further back.
- **Tuning was validated on the same two folds it's reported on** (2023, 2024).
  A third, never-touched holdout season would be the more rigorous way to
  fully rule out the hyperparameter search overfitting to those two specific
  years, but there isn't a spare season available to hold out.
- **Predictions are forecasts only.** No real 2025-26 results were used to
  build them -- they're generated purely from 2024-25-and-earlier data, the
  same way the match-prediction and injury-risk models stop at 2024-25.
