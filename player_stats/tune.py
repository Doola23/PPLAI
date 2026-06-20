"""
Per-target Optuna hyperparameter tuning. Run this when you want to re-tune (e.g.
after adding a new season of data) -- it's slow (~80 min for 14 targets x 30
trials x 2 folds) so it's kept separate from validate.py, which just re-evaluates
the already-tuned params and runs in a couple of minutes.

Methodology: 2-fold light rolling validation per target (train<=2022/test 2023,
train<=2023/test 2024), scored on the average R^2 across both folds so the tuned
hyperparameters generalize across two different test years instead of overfitting
to whichever one happens to be held out. A full 5-fold expanding-window scheme
(like injury_prediction uses) was considered but rejected -- this dataset only has
83-666 rows per position, and splitting into more folds shrinks training sets to
the point where tuning would mostly be fitting noise (see the GK model's negative
R^2 for a preview of what happens when this approach runs out of data).

Output: optuna_best_params_per_target.csv, consumed by validate.py and
generate_predictions.py.
"""
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
import optuna
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, r2_score

from pipeline import (
    load_data, create_multi_season_features, build_dataset,
    POSITION_TARGETS, PCT_STATS,
)

optuna.logging.set_verbosity(optuna.logging.WARNING)
N_TRIALS = 30


def fit_and_score(params, train_df, target, test_season, full_df, position):
    target_col = f'target_{target}'
    feature_cols = [c for c in train_df.columns if c not in ['player', 'season'] and not c.startswith('target_')]
    subset = train_df[feature_cols + [target_col]].dropna(subset=[target_col])
    if len(subset) < 10:
        return None, None
    X = subset[feature_cols].fillna(0)
    y = subset[target_col]
    model = XGBRegressor(**params, random_state=42, verbosity=0)
    model.fit(X, y)

    test_rows = full_df[(full_df['position_group'] == position) & (full_df['season'] == test_season)]
    hist = full_df[(full_df['position_group'] == position) & (full_df['season'] < test_season)]
    preds, actuals = [], []
    for player in test_rows['player'].unique():
        feat = create_multi_season_features(hist, player, test_season)
        if feat is None:
            continue
        ar = test_rows[test_rows['player'] == player]
        if len(ar) == 0:
            continue
        ar = ar.iloc[0]
        if target not in ar or pd.isna(ar[target]):
            continue
        a90 = ar['ninety_mins_played']
        fr = pd.DataFrame([feat])
        for col in feature_cols:
            if col not in fr.columns:
                fr[col] = 0
        fr = fr[feature_cols].fillna(0)
        pv = max(0, float(model.predict(fr)[0]))
        if target in PCT_STATS:
            pred_val, actual_val = pv, ar[target]
        else:
            pred_val, actual_val = pv * a90, ar[target] * a90
        preds.append(pred_val)
        actuals.append(actual_val)
    if len(preds) < 5:
        return None, None
    mae = mean_absolute_error(actuals, preds)
    r2 = r2_score(actuals, preds) if len(set(actuals)) > 1 else float('nan')
    return mae, r2


def make_objective(data_clean, position, target):
    train_a = build_dataset(data_clean, position, up_to_season=2022, targets=[target])
    train_b = build_dataset(data_clean, position, up_to_season=2023, targets=[target])

    def objective(trial):
        params = {
            'n_estimators': trial.suggest_int('n_estimators', 50, 400),
            'max_depth': trial.suggest_int('max_depth', 2, 5),
            'learning_rate': trial.suggest_float('learning_rate', 0.005, 0.1, log=True),
            'subsample': trial.suggest_float('subsample', 0.5, 1.0),
            'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
            'min_child_weight': trial.suggest_int('min_child_weight', 1, 20),
            'reg_alpha': trial.suggest_float('reg_alpha', 0.0, 5.0),
            'reg_lambda': trial.suggest_float('reg_lambda', 0.5, 10.0),
        }
        _, r2_a = fit_and_score(params, train_a, target, 2023, data_clean, position)
        _, r2_b = fit_and_score(params, train_b, target, 2024, data_clean, position)
        scores = [s for s in [r2_a, r2_b] if s is not None and not pd.isna(s)]
        return float(np.mean(scores)) if scores else -10.0

    return objective


def main():
    print("Loading data...")
    data_clean = load_data()

    print(f"\nTuning {sum(len(t) for t in POSITION_TARGETS.values())} targets "
          f"({N_TRIALS} trials each, scored on avg R2 across 2023+2024 folds)")
    best_params_all = []
    for position in ['FW', 'DF', 'MF']:
        for target in POSITION_TARGETS[position]:
            print(f"  Tuning {position} / {target} ...")
            objective = make_objective(data_clean, position, target)
            study = optuna.create_study(direction='maximize', sampler=optuna.samplers.TPESampler(seed=42))
            study.optimize(objective, n_trials=N_TRIALS, show_progress_bar=False)
            print(f"    best avg R2: {study.best_value:.3f}")
            best_params_all.append({'position': position, 'target': target, **study.best_params})

    out = pd.DataFrame(best_params_all)
    out.to_csv('optuna_best_params_per_target.csv', index=False)
    print("\nSaved optuna_best_params_per_target.csv -- run validate.py to see the resulting accuracy.")


if __name__ == '__main__':
    main()
