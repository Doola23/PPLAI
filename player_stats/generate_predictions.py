"""
Generates the live 2025-26 player stat predictions. Trains on ALL data through
2024 (no held-out season -- that's validate.py's job) using the per-target tuned
hyperparameters from optuna_best_params_per_target.csv, and writes one CSV per
sub-position (Strikers, Wingers, Centre_Backs, Fullbacks, Defensive/Central/
Attacking_Midfielders).

Goalkeepers are not generated -- see validate.py's GK section for why.
"""
import os
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
from xgboost import XGBRegressor

from pipeline import (
    load_data, add_subposition_clustering, create_multi_season_features, build_dataset,
    get_trend_explanation, get_confidence_interval, predict_minutes,
    POSITION_TARGETS, load_tuned_params, get_params_for,
)

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

SUBPOS_FILE_MAP = {
    'ST': 'Strikers', 'W': 'Wingers', 'CB': 'Centre_Backs', 'FB': 'Fullbacks',
    'DM': 'Defensive_Midfielders', 'CM': 'Central_Midfielders', 'AM': 'Attacking_Midfielders',
}

RENAME_MAP = {
    'player': 'Player', 'squad': 'Team', 'age': 'Age', 'position': 'Position',
    'subposition': 'Role', 'explanation': 'Analysis & Trend',
    'actual_2024_minutes': '2024 Minutes Played', 'predicted_2025_minutes': '2025 Predicted Minutes',
    'actual_2024_goals': '2024 Goals', 'predicted_2025_goals': '2025 Predicted Goals',
    'predicted_2025_goals_low': '2025 Goals (Low Estimate)', 'predicted_2025_goals_high': '2025 Goals (High Estimate)',
    'actual_2024_assists': '2024 Assists', 'predicted_2025_assists': '2025 Predicted Assists',
    'actual_2024_xg': '2024 Expected Goals (xG)', 'predicted_2025_xg': '2025 Predicted xG',
    'actual_2024_shots': '2024 Shots', 'predicted_2025_shots': '2025 Predicted Shots',
    'actual_2024_goals_per90': '2024 Goals per 90', 'predicted_2025_goals_per90': '2025 Predicted Goals per 90',
    'actual_2024_assists_per90': '2024 Assists per 90', 'predicted_2025_assists_per90': '2025 Predicted Assists per 90',
    'actual_2024_xg_per90': '2024 xG per 90', 'predicted_2025_xg_per90': '2025 Predicted xG per 90',
    'actual_2024_shots_per90': '2024 Shots per 90', 'predicted_2025_shots_per90': '2025 Predicted Shots per 90',
    'actual_2024_aerials_won_pct': '2024 Aerial Duels Won %', 'predicted_2025_aerials_won_pct': '2025 Predicted Aerial Duels Won %',
    'actual_2024_pass_completion_pct': '2024 Pass Completion %', 'predicted_2025_pass_completion_pct': '2025 Predicted Pass Completion %',
    'actual_2024_interceptions': '2024 Interceptions', 'predicted_2025_interceptions': '2025 Predicted Interceptions',
    'actual_2024_interceptions_per90': '2024 Interceptions per 90', 'predicted_2025_interceptions_per90': '2025 Predicted Interceptions per 90',
    'actual_2024_clearances': '2024 Clearances', 'predicted_2025_clearances': '2025 Predicted Clearances',
    'actual_2024_clearances_per90': '2024 Clearances per 90', 'predicted_2025_clearances_per90': '2025 Predicted Clearances per 90',
    'actual_2024_progressive_passes': '2024 Progressive Passes', 'predicted_2025_progressive_passes': '2025 Predicted Progressive Passes',
    'actual_2024_progressive_passes_per90': '2024 Progressive Passes per 90', 'predicted_2025_progressive_passes_per90': '2025 Predicted Progressive Passes per 90',
    'actual_2024_key_passes': '2024 Key Passes', 'predicted_2025_key_passes': '2025 Predicted Key Passes',
    'actual_2024_key_passes_per90': '2024 Key Passes per 90', 'predicted_2025_key_passes_per90': '2025 Predicted Key Passes per 90',
    'actual_2024_tackles_interceptions': '2024 Tackles+Interceptions', 'predicted_2025_tackles_interceptions': '2025 Predicted Tackles+Interceptions',
    'actual_2024_tackles_interceptions_per90': '2024 Tackles+Interceptions per 90', 'predicted_2025_tackles_interceptions_per90': '2025 Predicted Tackles+Interceptions per 90',
    'actual_2024_ball_recoveries': '2024 Ball Recoveries', 'predicted_2025_ball_recoveries': '2025 Predicted Ball Recoveries',
    'actual_2024_ball_recoveries_per90': '2024 Ball Recoveries per 90', 'predicted_2025_ball_recoveries_per90': '2025 Predicted Ball Recoveries per 90',
}

# Which actual_2024_*/predicted_2025_* stat columns are genuinely relevant per sub-position.
# Without this, every position CSV ends up with every other position's columns too -- present
# in the dataframe (as NaN, since pd.DataFrame(list_of_dicts) unions all keys across rows) and
# accidentally included by the old "is this column in RENAME_MAP" filter.
SUBPOS_STAT_COLS = {
    'ST': ['goals', 'xg', 'shots', 'assists', 'goals_per90', 'xg_per90', 'shots_per90', 'assists_per90'],
    'W':  ['goals', 'xg', 'shots', 'assists', 'goals_per90', 'xg_per90', 'shots_per90', 'assists_per90'],
    'CB': ['aerials_won_pct', 'clearances', 'interceptions', 'pass_completion_pct',
           'clearances_per90', 'interceptions_per90'],
    'FB': ['pass_completion_pct', 'interceptions', 'clearances', 'aerials_won_pct',
           'interceptions_per90', 'clearances_per90'],
    'DM': ['tackles_interceptions', 'ball_recoveries', 'pass_completion_pct', 'progressive_passes',
           'tackles_interceptions_per90', 'ball_recoveries_per90', 'progressive_passes_per90'],
    'CM': ['progressive_passes', 'key_passes', 'pass_completion_pct', 'tackles_interceptions', 'assists', 'goals', 'xg',
           'progressive_passes_per90', 'key_passes_per90', 'tackles_interceptions_per90', 'assists_per90', 'goals_per90', 'xg_per90'],
    'AM': ['key_passes', 'assists', 'goals', 'xg', 'progressive_passes', 'pass_completion_pct',
           'key_passes_per90', 'assists_per90', 'goals_per90', 'xg_per90', 'progressive_passes_per90'],
}


def train_final_models(data_clean, tuned_params):
    datasets = {pos: build_dataset(data_clean, pos, up_to_season=2024,
                                    targets=POSITION_TARGETS[pos] + ['ninety_mins'])
                for pos in ['FW', 'DF', 'MF']}
    models = {}
    for position, dataset in datasets.items():
        feature_cols = [c for c in dataset.columns
                         if c not in ['player', 'season', 'position_group'] and not c.startswith('target_')]
        models[position] = {}
        for target in POSITION_TARGETS[position] + ['ninety_mins']:
            target_col = f'target_{target}'
            if target_col not in dataset.columns:
                continue
            valid_cols = [c for c in feature_cols if c in dataset.columns]
            subset = dataset[valid_cols + [target_col]].dropna(subset=[target_col])
            if len(subset) < 10:
                continue
            X = subset[valid_cols].fillna(0)
            y = subset[target_col]
            params = get_params_for(position, target, tuned_params)
            model = XGBRegressor(**params, random_state=42, verbosity=0)
            model.fit(X, y)
            models[position][target] = {'model': model, 'feature_cols': valid_cols}
        print(f"  {position}: {len(models[position])} models trained on {len(dataset)} rows")
    return models


def generate_predictions(data_clean, models):
    data_2024 = data_clean[data_clean['season'] == 2024].copy()
    predictions = []
    for _, row in data_2024.iterrows():
        player = row['player']
        position = row['position_group']
        if position not in models:
            continue
        features = create_multi_season_features(data_clean, player, 2025)
        if features is None:
            continue

        age = int(float(row['age'])) if pd.notna(row['age']) else 0
        pred_row = {'player': player, 'squad': row['squad'], 'age': age,
                    'position': position, 'subposition': row['subposition']}

        pred_90s = row['ninety_mins_played']
        if 'ninety_mins' in models[position]:
            pred_90s = predict_minutes(player, position, features, models[position]['ninety_mins'], data_clean)
        pred_row['predicted_minutes'] = int(pred_90s * 90)

        for target in POSITION_TARGETS[position]:
            if target not in models[position]:
                continue
            mi = models[position][target]
            fr = pd.DataFrame([features])
            for col in mi['feature_cols']:
                if col not in fr.columns:
                    fr[col] = 0
            fr = fr[mi['feature_cols']].fillna(0)
            pv = max(0, float(mi['model'].predict(fr)[0]))
            pred_row[target] = round(pv, 3)
            if target == 'goals_per_90':
                low, high = get_confidence_interval(position, target, pv, pred_90s)
                pred_row['goals_low'] = low
                pred_row['goals_high'] = high

        pred_row['explanation'] = get_trend_explanation(data_clean, player, row['subposition'])
        predictions.append(pred_row)
    return pd.DataFrame(predictions)


def build_comparison(data_clean, predictions_df):
    data_2024 = data_clean[data_clean['season'] == 2024]
    rows = []
    for _, pred_row in predictions_df.iterrows():
        player = pred_row['player']
        subpos = pred_row['subposition']
        position = pred_row['position']
        actual = data_2024[data_2024['player'] == player]
        row = {'player': player, 'squad': pred_row['squad'], 'age': pred_row['age'],
               'position': position, 'subposition': subpos}
        if len(actual) > 0:
            a = actual.iloc[0]
            row['actual_2024_minutes'] = int(a['ninety_mins_played'] * 90)
            if subpos in ['ST', 'W']:
                row['actual_2024_goals'] = round(float(a.get('goals') or 0), 1)
                row['actual_2024_assists'] = round(float(a.get('assists') or 0), 1)
                row['actual_2024_xg'] = round(float(a.get('xg') or 0), 1)
                row['actual_2024_shots'] = round(float(a.get('shots') or 0), 1)
                row['actual_2024_goals_per90'] = round(float(a.get('goals_per_90') or 0), 2)
                row['actual_2024_assists_per90'] = round(float(a.get('assists_per_90') or 0), 2)
                row['actual_2024_xg_per90'] = round(float(a.get('xg_per_90') or 0), 2)
                row['actual_2024_shots_per90'] = round(float(a.get('shots_per_90') or 0), 2)
            elif subpos in ['CB', 'FB']:
                row['actual_2024_aerials_won_pct'] = round(float(a.get('aerials_won_pct') or 0), 1)
                row['actual_2024_pass_completion_pct'] = round(float(a.get('pass_completion_pct') or 0), 1)
                row['actual_2024_interceptions'] = round(float(a.get('interceptions') or 0), 1)
                row['actual_2024_interceptions_per90'] = round(float(a.get('interceptions_per90') or 0), 2)
                row['actual_2024_clearances'] = round(float(a.get('clearances') or 0), 1)
                row['actual_2024_clearances_per90'] = round(float(a.get('clearances_per90') or 0), 2)
            elif subpos in ['DM', 'CM', 'AM']:
                row['actual_2024_assists'] = round(float(a.get('assists') or 0), 1)
                row['actual_2024_assists_per90'] = round(float(a.get('assists_per_90') or 0), 2)
                row['actual_2024_progressive_passes'] = round(float(a.get('progressive_passes') or 0), 1)
                row['actual_2024_progressive_passes_per90'] = round(float(a.get('progressive_passes_per90') or 0), 2)
                row['actual_2024_key_passes'] = round(float(a.get('key_passes') or 0), 1)
                row['actual_2024_key_passes_per90'] = round(float(a.get('key_passes_per90') or 0), 2)
                row['actual_2024_tackles_interceptions'] = round(float(a.get('tackles_interceptions') or 0), 1)
                row['actual_2024_tackles_interceptions_per90'] = round(float(a.get('tackles_interceptions_per90') or 0), 2)
                row['actual_2024_pass_completion_pct'] = round(float(a.get('pass_completion_pct') or 0), 1)
                row['actual_2024_ball_recoveries'] = round(float(a.get('ball_recoveries') or 0), 1)
                row['actual_2024_ball_recoveries_per90'] = round(float(a.get('ball_recoveries_per90') or 0), 2)
                if subpos in ['CM', 'AM']:
                    row['actual_2024_goals'] = round(float(a.get('goals') or 0), 1)
                    row['actual_2024_xg'] = round(float(a.get('xg') or 0), 1)
                    row['actual_2024_goals_per90'] = round(float(a.get('goals_per_90') or 0), 2)
                    row['actual_2024_xg_per90'] = round(float(a.get('xg_per_90') or 0), 2)

        row['predicted_2025_minutes'] = pred_row.get('predicted_minutes', '')
        a90 = pred_row.get('predicted_minutes', 0) / 90 if pred_row.get('predicted_minutes') else 0
        if subpos in ['ST', 'W']:
            row['predicted_2025_goals'] = round(pred_row.get('goals_per_90', 0) * a90, 1)
            row['predicted_2025_goals_low'] = pred_row.get('goals_low', '')
            row['predicted_2025_goals_high'] = pred_row.get('goals_high', '')
            row['predicted_2025_assists'] = round(pred_row.get('assists_per_90', 0) * a90, 1)
            row['predicted_2025_xg'] = round(pred_row.get('xg_per_90', 0) * a90, 1)
            row['predicted_2025_shots'] = round(pred_row.get('shots_per_90', 0) * a90, 1)
            row['predicted_2025_goals_per90'] = pred_row.get('goals_per_90', '')
            row['predicted_2025_assists_per90'] = pred_row.get('assists_per_90', '')
            row['predicted_2025_xg_per90'] = pred_row.get('xg_per_90', '')
            row['predicted_2025_shots_per90'] = pred_row.get('shots_per_90', '')
        elif subpos in ['CB', 'FB']:
            row['predicted_2025_aerials_won_pct'] = pred_row.get('aerials_won_pct', '')
            row['predicted_2025_pass_completion_pct'] = pred_row.get('pass_completion_pct', '')
            row['predicted_2025_interceptions'] = round(pred_row.get('interceptions_per90', 0) * a90, 1)
            row['predicted_2025_interceptions_per90'] = pred_row.get('interceptions_per90', '')
            row['predicted_2025_clearances'] = round(pred_row.get('clearances_per90', 0) * a90, 1)
            row['predicted_2025_clearances_per90'] = pred_row.get('clearances_per90', '')
        elif subpos in ['DM', 'CM', 'AM']:
            row['predicted_2025_assists'] = round(pred_row.get('assists_per_90', 0) * a90, 1)
            row['predicted_2025_assists_per90'] = pred_row.get('assists_per_90', '')
            row['predicted_2025_progressive_passes'] = round(pred_row.get('progressive_passes_per90', 0) * a90, 1)
            row['predicted_2025_progressive_passes_per90'] = pred_row.get('progressive_passes_per90', '')
            row['predicted_2025_key_passes'] = round(pred_row.get('key_passes_per90', 0) * a90, 1)
            row['predicted_2025_key_passes_per90'] = pred_row.get('key_passes_per90', '')
            row['predicted_2025_tackles_interceptions'] = round(pred_row.get('tackles_interceptions_per90', 0) * a90, 1)
            row['predicted_2025_tackles_interceptions_per90'] = pred_row.get('tackles_interceptions_per90', '')
            row['predicted_2025_pass_completion_pct'] = pred_row.get('pass_completion_pct', '')
            row['predicted_2025_ball_recoveries'] = round(pred_row.get('ball_recoveries_per90', 0) * a90, 1)
            row['predicted_2025_ball_recoveries_per90'] = pred_row.get('ball_recoveries_per90', '')
            if subpos in ['CM', 'AM']:
                row['predicted_2025_goals'] = round(pred_row.get('goals_per_90', 0) * a90, 1)
                row['predicted_2025_xg'] = round(pred_row.get('xg_per_90', 0) * a90, 1)
                row['predicted_2025_goals_per90'] = pred_row.get('goals_per_90', '')
                row['predicted_2025_xg_per90'] = pred_row.get('xg_per_90', '')

        row['explanation'] = pred_row.get('explanation', '')
        rows.append(row)
    return pd.DataFrame(rows)


def _relevant_cols_for(subpos):
    """Builds the actual_2024_*/predicted_2025_* column names genuinely relevant to this
    sub-position, instead of trusting "is this in RENAME_MAP" (which is true for every
    stat across every position and was letting other positions' NaN columns leak in)."""
    base = ['player', 'squad', 'age', 'position', 'subposition',
            'actual_2024_minutes', 'predicted_2025_minutes']
    for stat in SUBPOS_STAT_COLS[subpos]:
        base += [f'actual_2024_{stat}', f'predicted_2025_{stat}']
    if subpos in ('ST', 'W'):
        base += ['predicted_2025_goals_low', 'predicted_2025_goals_high']
    base.append('explanation')
    return base


def save_position_files(comparison_df):
    pred_only_prefix = 'predicted_2025_'
    for subpos, fname in SUBPOS_FILE_MAP.items():
        subset = comparison_df[comparison_df['subposition'] == subpos].copy()
        if len(subset) == 0:
            continue
        relevant = _relevant_cols_for(subpos)
        cols_present = [c for c in relevant if c in subset.columns]
        out = subset[cols_present].rename(columns=RENAME_MAP)
        out.to_csv(os.path.join(OUT_DIR, f'{fname}_2025_Predictions.csv'), index=False)

        pred_cols = ['player', 'squad', 'age', 'position', 'subposition'] + \
                    [c for c in cols_present if c.startswith(pred_only_prefix)] + ['explanation']
        pred_cols = [c for c in pred_cols if c in subset.columns]
        out_pred = subset[pred_cols].rename(columns=RENAME_MAP)
        out_pred.to_csv(os.path.join(OUT_DIR, f'{fname}_2025_Predictions_Only.csv'), index=False)
        print(f"  {fname}: {len(subset)} players")


def main():
    print("Loading data...")
    data_clean = load_data()
    data_clean = add_subposition_clustering(data_clean)
    tuned_params = load_tuned_params()
    print(f"Using {'tuned' if tuned_params else 'default'} hyperparameters per target.")

    print("\nTraining final models (all data through 2024)...")
    models = train_final_models(data_clean, tuned_params)

    print("\nGenerating 2025-26 predictions...")
    predictions_df = generate_predictions(data_clean, models)
    print(f"Total predictions: {len(predictions_df)}")
    print(predictions_df['subposition'].value_counts())

    comparison_df = build_comparison(data_clean, predictions_df)

    print("\nSaving per-position files...")
    save_position_files(comparison_df)
    print("\nDone. Goalkeepers excluded -- see validate.py for why.")


if __name__ == '__main__':
    main()
