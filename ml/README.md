# ML pipelines

Four models produce every number the app shows. The backend reads their output files
directly; nothing is uploaded anywhere.

| Pipeline | Entry point | Writes (served by the backend) |
|---|---|---|
| Match prediction | `match_prediction/MatchPredict.py` | `match_prediction/outputs/*.csv` |
| Injury risk | `injury_prediction/main.py` | `injury_prediction/outputs/injury_predictions.csv` |
| Player stat projections | `player_stats/generate_predictions.py` | `player_stats/outputs/*_2025_Predictions.csv` |
| Scouting roles + similarity | `scouting/ml/run_ml_2425.py` | `scouting/data/scouting_bundle.json.gz` (`ml` block) |
| Club reports (Scout Lab) | `scouting/ml/generate_team_reports.py` | `scouting/data/team_reports.json` |

## Setup

```bash
git lfs install && git lfs pull          # raw inputs are stored in Git LFS
python -m venv .venv && .venv/Scripts/activate   # Python 3.10–3.12
pip install -r ml/requirements.txt
```

## Run

```bash
python ml/run_all.py --check            # verify every input/output exists (fast)
python ml/run_all.py                    # re-run all four pipelines
python ml/run_all.py match scouting     # or just some of them
```

Restart the backend afterwards so it reloads the outputs.

## Data manifest

| Path | Source | Used by |
|---|---|---|
| `data/fbref/{YYYY}_PL.csv`, `GK_{YYYY}_PL.csv` | FBref season stats, 2018–2024 | player_stats, injury_prediction |
| `match_prediction/premierleaguedata/{YY_YY}.csv` | football-data.co.uk results, 2015/16–2024/25 | match_prediction |
| `match_prediction/xg/*.csv` | Understat team xG | match_prediction |
| `match_prediction/data/*.csv` | Transfermarkt injuries, players, valuations, managers; FBref lineups; Understat shots | match_prediction, player_stats |
| `injury_prediction/data/*.csv` | Transfermarkt minutes/injuries/profiles, FPL history + API snapshot, international break calendar | injury_prediction |
| `scouting/data/player_profiles.csv` | Transfermarkt granular positions | scouting |
| `scouting/data/scouting_bundle.json.gz` | FBref (5 leagues) + Transfermarkt + Understat shots/match logs | scouting, backend |

Inputs are in LFS; files the backend serves at runtime stay as normal git files so
deploys never depend on LFS (see `.gitattributes`).

## Refreshing to a new season

1. Add the new season's raw files alongside the existing ones (same names/columns,
   e.g. `data/fbref/2025_PL.csv`, `premierleaguedata/25_26.csv`).
2. Update the season constants at the top of each pipeline (target season, train/test split).
3. `python ml/run_all.py`, then restart the backend.
