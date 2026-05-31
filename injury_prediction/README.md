# Premier League Injury Risk Model

An XGBoost binary classifier that predicts whether a Premier League player will miss 1 or more matches due to injury in the next 14 days. Trained on 10 seasons of data (2015–16 to 2024–25) and connected to a live AWS DynamoDB database.

## Overview

**Prediction target:** Will this player miss 1+ matches in the next 14 days?  
**Algorithm:** XGBoost with Optuna hyperparameter tuning  
**Validation:** 5-fold expanding time-series cross-validation (no data leakage)  
**Positive class rate:** ~6.1%

## Results (2024–25 Test Season)

| Metric | Our Model | Non-GPS Football Research |
|---|---|---|
| AUC-ROC | **0.672** | 0.62 – 0.70 |
| Sensitivity | **0.693** | 0.55 – 0.78 |
| Specificity | 0.566 | 0.65 – 0.85 |
| G-mean | **0.626** | 0.60 – 0.72 |
| Prediction window | 14 days | 7–14 days |

### Risk Tier Analysis

| Tier | Players | Actual Injury Rate |
|---|---|---|
| Low Risk (bottom 85%) | 9,361 | 5.3% |
| High Risk (top 15%) | 1,652 | **11.0%** |
| Baseline | 11,013 | 6.1% |

High-risk players injure at **1.8× the baseline rate**.

## Features (89 total)

| Category | Features |
|---|---|
| Workload | Minutes & matches in last 7/14/30/42/56 days, ACWR, EWMA ACWR (Murray et al. 2017), season minutes, utilization rate |
| Monotony & Strain | Training monotony and strain (Foster 1998) |
| Fixture congestion | Days between matches, triple-fixture flag, average recovery time, European fixture flag |
| Injury history | Career injury count, injuries in last 6/12 months, days since last injury, soft-tissue count, avg/max severity |
| Season burden | Days missed this season, days missed previous season (Ekstrand et al. 2011) |
| Re-injury risk | Rushed return flag — returned within 28 days (Verrall et al. 2006) |
| Personal trigger profile | Player's own pre-injury load threshold — compares current conditions to their historical injury triggers |
| Active injury | Currently injured flag, days since return |
| Player profile | Age, market value, value trend, position, height, aging curve vs empirical peak |
| FPL signals | Chance of playing, injury/doubt status |
| Rotation signals | Starter rate, subbed off early rate, came on as sub rate |
| Match context | Opponent Elo rating, home/away, FPL expected goals conceded |
| Physical intensity | Per-90 carry distance, progressive carries, tackles, aerials, fouls (FBref) |
| Interactions | Age × ACWR, Age × minutes last 30 days |

## Model Architecture

- **Algorithm:** XGBoost (`XGBClassifier`)
- **Class imbalance:** `scale_pos_weight` capped at 10×
- **Threshold selection:** G-mean maximisation on validation set
- **Hyperparameter tuning:** Optuna TPE sampler, 60 trials, averaged G-mean over 3 validation windows

## Validation Strategy

```
Fold 1: Train 2015-19 → Val 2019-20 → Test 2020-21
Fold 2: Train 2015-20 → Val 2020-21 → Test 2021-22
Fold 3: Train 2015-21 → Val 2021-22 → Test 2022-23
Fold 4: Train 2015-22 → Val 2022-23 → Test 2023-24
Fold 5: Train 2015-23 → Val 2023-24 → Test 2024-25
```

## Project Structure

```
injury_model/
├── main.py          — Entry point, orchestrates the full pipeline
├── config.py        — Constants, hyperparameters, feature list
├── utils.py         — Name normalisation, value parsing helpers
├── data_loader.py   — Loads all data from DynamoDB
├── db.py            — DynamoDB connection, scan and write utilities
├── precompute.py    — Elo ratings, EWMA, match metadata, break features
├── features.py      — Feature engineering and dataset building
└── model.py         — Cross-validation, Optuna tuning, final model, evaluation
```

## Usage

```bash
python main.py
```

The pipeline will:
1. Load all data from DynamoDB
2. Run pre-computations (Elo, EWMA, match metadata)
3. Engineer 89 features per player-match
4. Run 5-fold time-series cross-validation
5. Tune hyperparameters with Optuna (60 trials)
6. Train the final model and evaluate on 2024–25
7. Write predictions back to the `injuries-predictions` DynamoDB table

## Output

Each row in the predictions output contains:
- `injury_probability` — model probability score (0–1)
- `predicted_high_risk` — binary flag at the G-mean-optimal threshold
- `actual_injured` — ground truth label
- `risk_tier` — High Risk / Low Risk (top 15% threshold)

## Limitations

- No GPS or biometric data — physical load approximated from match minutes
- Injury labels based on publicly reported games missed — unreported minor injuries are missing
- Personal injury trigger features require 2+ past injuries to be meaningful
