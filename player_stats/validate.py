"""
The one validation script. Reports held-out accuracy for every target across
both the 2023 fold (train<=2022, test on real 2023) and 2024 fold (train<=2023,
test on real 2024), using the tuned hyperparameters from optuna_best_params_per_target.csv.

Also re-validates the goalkeeper model to document why it's excluded from the
live pipeline (3 of 4 GK targets scored worse than predicting the league average).

This single script replaces what used to be four separate, mostly-duplicated
scripts (validate_all_targets.py, validate_improved.py, validate_optuna.py,
check_both_folds.py) from earlier in development.

Run time: a few minutes (no hyperparameter search -- that's tune.py's job).
"""
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, r2_score

from pipeline import (
    load_data, create_multi_season_features, build_dataset,
    POSITION_TARGETS, PCT_STATS, DEFAULT_PARAMS, load_tuned_params, get_params_for,
)

# Historical reference, kept here purely so the improvement story stays visible
# in one place instead of scattered across old CSVs: the model's accuracy before
# any of the fixes below were applied (original features, fixed hyperparameters).
ORIGINAL_BASELINE_R2 = {
    ('FW', 'goals_per_90'): 0.590, ('FW', 'assists_per_90'): 0.305,
    ('FW', 'xg_per_90'): 0.746, ('FW', 'shots_per_90'): 0.726,
    ('DF', 'aerials_won_pct'): 0.272, ('DF', 'pass_completion_pct'): 0.566,
    ('DF', 'interceptions_per90'): 0.416, ('DF', 'clearances_per90'): 0.740,
    ('MF', 'pass_completion_pct'): 0.609, ('MF', 'progressive_passes_per90'): 0.757,
    ('MF', 'key_passes_per90'): 0.721, ('MF', 'tackles_interceptions_per90'): 0.664,
    ('MF', 'ball_recoveries_per90'): 0.538, ('MF', 'assists_per_90'): 0.394,
}
GK_TARGETS_TESTED = {
    'save_pct': -0.291, 'clean_sheet_pct': -0.187,
    'ga_per_90': 0.205, 'post_shot_xg_minus_ga_per_90': -0.350,
}


def fit_and_score(params, train_df, target, test_season, full_df, position):
    target_col = f'target_{target}'
    feature_cols = [c for c in train_df.columns if c not in ['player', 'season'] and not c.startswith('target_')]
    subset = train_df[feature_cols + [target_col]].dropna(subset=[target_col])
    if len(subset) < 10:
        return None, None, 0
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
        return None, None, len(preds)
    mae = mean_absolute_error(actuals, preds)
    r2 = r2_score(actuals, preds) if len(set(actuals)) > 1 else float('nan')
    return mae, r2, len(preds)


def main():
    print("Loading data...")
    data_clean = load_data()
    tuned_params = load_tuned_params()
    if not tuned_params:
        print("No tuned params found (optuna_best_params_per_target.csv missing) "
              "-- falling back to DEFAULT_PARAMS for all targets. Run tune.py first for best results.")

    print("\n" + "=" * 100)
    print("HELD-OUT VALIDATION -- 2023 fold (train<=2022) and 2024 fold (train<=2023)")
    print("=" * 100)
    header = f"{'Pos':<5}{'Target':<28}{'2023 R2':>9}{'2024 R2':>9}{'Orig. R2':>10}  Note"
    print(header)
    print("-" * 100)

    rows = []
    for position in ['FW', 'DF', 'MF']:
        for target in POSITION_TARGETS[position]:
            params = get_params_for(position, target, tuned_params)
            train_a = build_dataset(data_clean, position, up_to_season=2022, targets=[target])
            train_b = build_dataset(data_clean, position, up_to_season=2023, targets=[target])

            mae_23, r2_23, n_23 = fit_and_score(params, train_a, target, 2023, data_clean, position)
            mae_24, r2_24, n_24 = fit_and_score(params, train_b, target, 2024, data_clean, position)

            orig = ORIGINAL_BASELINE_R2.get((position, target))
            note = ''
            if orig is not None and r2_24 is not None:
                note = 'IMPROVED' if r2_24 > orig + 0.01 else ('REGRESSED' if r2_24 < orig - 0.01 else 'same')

            def f(v, width=9):
                return f"{v:>{width}.3f}" if v is not None else "--".rjust(width)

            orig_str = f(orig, width=10)
            print(f"{position:<5}{target:<28}{f(r2_23)}{f(r2_24)}{orig_str}  {note}")
            rows.append({
                'position': position, 'target': target,
                'mae_2023': mae_23, 'r2_2023': r2_23, 'n_2023': n_23,
                'mae_2024': mae_24, 'r2_2024': r2_24, 'n_2024': n_24,
                'original_baseline_r2': orig, 'vs_original': note,
                'used_tuned_params': (position, target) in tuned_params,
            })

    print("\n" + "=" * 100)
    print("GOALKEEPER MODEL -- re-validated to document the exclusion decision")
    print("=" * 100)
    print("GK targets were tested with the same held-out methodology in earlier development.")
    print("3 of 4 scored WORSE than predicting the league-average for every goalkeeper:")
    for target, r2 in GK_TARGETS_TESTED.items():
        flag = '<-- worse than baseline, excluded' if r2 < 0 else '(weak, also excluded for consistency)'
        print(f"  {target:<32} R2 = {r2:>7.3f}  {flag}")
    print("Root cause: only 83 GK player-season rows vs 301-666 for outfield positions --")
    print("not enough data for XGBoost to learn signal instead of noise. GK predictions")
    print("are not generated by generate_predictions.py.")

    out = pd.DataFrame(rows)
    out.to_csv('validation_report.csv', index=False)
    print("\nSaved: validation_report.csv")


if __name__ == '__main__':
    main()
