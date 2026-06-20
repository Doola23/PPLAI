"""
Shared data loading and feature engineering for the player-stats prediction model.
Every other script in this folder (tune.py, validate.py, generate_predictions.py)
imports from here instead of keeping its own copy -- this is the single source of
truth for the data pipeline.

Methodology: per-position (FW/DF/MF) XGBoost regressors predict next-season per-90
stats from each player's last 3 seasons of history, age-curve position, injury
history, and team-relative features. Goalkeepers were tested separately and
excluded -- see README.md.
"""
import os
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd

OUTFIELD_DIR = r'C:\Users\DELL\Documents\player_ratings'
INJURIES_CSV = r'C:\Users\DELL\Documents\PPLAI\match_prediction\data\injuries.csv'
PLAYERS_CSV = r'C:\Users\DELL\Documents\PPLAI\match_prediction\data\players.csv'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TUNED_PARAMS_CSV = os.path.join(BASE_DIR, 'optuna_best_params_per_target.csv')

# Fallback hyperparameters if a target has no tuned entry (e.g. a future new target).
DEFAULT_PARAMS = {
    'n_estimators': 300, 'max_depth': 3, 'learning_rate': 0.01,
    'subsample': 0.7, 'colsample_bytree': 0.8, 'min_child_weight': 8,
    'reg_alpha': 0.1, 'reg_lambda': 2.0,
}

POSITION_TARGETS = {
    'FW': ['goals_per_90', 'assists_per_90', 'xg_per_90', 'shots_per_90'],
    'DF': ['aerials_won_pct', 'pass_completion_pct',
           'interceptions_per90', 'clearances_per90'],
    'MF': ['pass_completion_pct', 'progressive_passes_per90',
           'key_passes_per90', 'tackles_interceptions_per90',
           'ball_recoveries_per90', 'assists_per_90',
           'goals_per_90', 'xg_per_90'],
}
PCT_STATS = ['aerials_won_pct', 'pass_completion_pct']

# Validated held-out MAE per (position, target), from the 2023->2024 fold of validate.py --
# used for confidence-interval width instead of guessing a fixed margin. Keyed by position too
# because the same target (e.g. goals_per_90) has a very different error scale for FW vs MF.
VALIDATED_MAE = {
    ('FW', 'goals_per_90'): 2.64, ('FW', 'assists_per_90'): 1.48, ('FW', 'xg_per_90'): 1.38, ('FW', 'shots_per_90'): 7.16,
    ('DF', 'aerials_won_pct'): 6.87, ('DF', 'pass_completion_pct'): 2.87, ('DF', 'interceptions_per90'): 5.57,
    ('DF', 'clearances_per90'): 19.32,
    ('MF', 'pass_completion_pct'): 2.88, ('MF', 'progressive_passes_per90'): 18.51, ('MF', 'key_passes_per90'): 5.79,
    ('MF', 'tackles_interceptions_per90'): 10.19, ('MF', 'ball_recoveries_per90'): 22.39,
    ('MF', 'assists_per_90'): 1.26, ('MF', 'goals_per_90'): 1.29, ('MF', 'xg_per_90'): 0.93,
}

BASE_FEATURES = [
    'age', 'ninety_mins_played', 'goals_per_90', 'assists_per_90',
    'xg_per_90', 'xag_per_90', 'shots_per_90', 'shots_on_target_pct',
    'take_on_succ_pct', 'pass_completion_pct', 'progressive_passes_per90',
    'tackles_interceptions_per90', 'ball_recoveries_per90',
    'key_passes_per90', 'interceptions_per90', 'clearances_per90',
    'aerials_won_pct', 'tackle_pct',
    'games_missed_last_season', 'injuries_last_12m',
    'career_injury_count', 'hamstring_history',
    'same_bodypart_before', 'returned_from_long_injury',
    'market_value_m', 'height_cm', 'sca_per_90', 'passes_into_penalty_area',
    'crosses_into_penalty_area', 'through_balls', 'aerials_contested_per90',
]


def _simplify_position(pos):
    if pd.isna(pos):
        return 'Unknown'
    pos = str(pos).upper()
    if 'GK' in pos:
        return 'GK'
    elif pos.startswith('DF') or pos in ['DF,MF', 'MF,DF']:
        return 'DF'
    elif pos.startswith('MF') or pos == 'MF,FW':
        return 'MF'
    elif pos.startswith('FW') or pos == 'FW,MF':
        return 'FW'
    return 'Unknown'


def _convert_season_inj(s):
    try:
        end = int(str(s).split('/')[1])
        return 2000 + end if end < 50 else 1900 + end
    except Exception:
        return None


def _parse_market_value(v):
    try:
        v = str(v).strip().lower()
        if 'm' in v:
            return float(v.replace('m', '').strip())
        elif 'k' in v:
            return float(v.replace('k', '').strip()) / 1000
        return float(v)
    except Exception:
        return np.nan


def _convert_season_pl(s):
    try:
        end = int(str(s).split('-')[1])
        return 2000 + end if end < 50 else 1900 + end
    except Exception:
        return None


PASSING_PATCH_CSV = os.path.join(BASE_DIR, 'scouting_passing_patch.csv')


def _patch_broken_passing_2024(data):
    """The 2024 season file has passes_completed/passes_attempted/key_passes zeroed
    out for ~40% of players who otherwise have real minutes and real stats elsewhere
    (e.g. Cole Palmer shows 0 key_passes despite 214 progressive passes and 15 goals --
    a source-data merge bug, not a real lack of passing involvement). Patch those rows
    from a separate scouting-data export that doesn't share the bug; if a broken player
    isn't found there, null the two affected columns instead of training on a false zero."""
    if 'passes_completed' not in data.columns or not os.path.exists(PASSING_PATCH_CSV):
        return data
    patch = pd.read_csv(PASSING_PATCH_CSV).drop_duplicates(subset='Player').set_index('Player')
    patch['key_passes_patch'] = patch['KP'] / (patch['Min'] / 90)

    broken = (
        (data['season'] == 2024) &
        (data['passes_completed'] == 0) &
        (data['passes_attempted'] == 0) &
        (data['ninety_mins_played'] >= 5)
    )
    for idx, name in data.loc[broken, 'player'].items():
        if name in patch.index:
            data.at[idx, 'pass_completion_pct'] = patch.at[name, 'pass_completion']
            data.at[idx, 'key_passes'] = patch.at[name, 'key_passes_patch'] * data.at[idx, 'ninety_mins_played']
        else:
            data.at[idx, 'pass_completion_pct'] = np.nan
            data.at[idx, 'key_passes'] = np.nan
    return data


def load_data(include_gk=False):
    """Loads + cleans outfield (and optionally GK) season stats, merges in
    injury history, market value, and height. Returns one DataFrame with
    position_group already assigned."""
    all_seasons = []
    for file in sorted(os.listdir(OUTFIELD_DIR)):
        if file.endswith('_PL.csv') and not file.startswith('GK'):
            season = int(file.split('_')[0])
            df = pd.read_csv(os.path.join(OUTFIELD_DIR, file))
            df['season'] = season
            # Some season files don't include a direct age column (or have it missing/stale) --
            # derive it from birth year when needed, same fix the original notebook applied to 2024.
            if 'age' not in df.columns or df['age'].isna().any():
                derived_age = season - df['born']
                df['age'] = df['age'].fillna(derived_age) if 'age' in df.columns else derived_age
            all_seasons.append(df)
    data = pd.concat(all_seasons, ignore_index=True)
    data = _patch_broken_passing_2024(data)
    data = data[data['ninety_mins_played'] >= 5].copy()

    data['position_group'] = data['position'].apply(_simplify_position)
    data = data[data['position_group'] != 'Unknown'].copy()

    counting_stats = ['interceptions', 'clearances', 'progressive_passes',
                       'key_passes', 'tackles_interceptions', 'ball_recoveries',
                       'shots', 'goals', 'assists']
    for col in counting_stats:
        if col in data.columns:
            data[f'{col}_per90'] = (data[col] / data['ninety_mins_played']).round(3)
    data['aerials_contested_per90'] = ((data['aerials_won'].fillna(0) + data['aerials_lost'].fillna(0))
                                        / data['ninety_mins_played']).round(3)
    data = data.sort_values(['player', 'season']).reset_index(drop=True)

    injuries = pd.read_csv(INJURIES_CSV)
    players_df = pd.read_csv(PLAYERS_CSV)

    injuries['season_year'] = injuries['season'].apply(_convert_season_inj)
    injuries_pl = injuries[injuries['season_year'] >= 2017].copy()
    injuries_pl['player_name_clean'] = injuries_pl['player_name'].str.strip().str.lower()

    players_df['market_value_m'] = players_df['market_value'].apply(_parse_market_value)
    players_df['player_name_clean'] = players_df['player_name'].str.strip().str.lower()
    players_df['season_year'] = players_df['season'].apply(_convert_season_pl)
    height_lookup = (players_df.dropna(subset=['height_cm'])
                      .drop_duplicates('player_name_clean')
                      .set_index('player_name_clean')['height_cm'])

    def injury_features(player_name, season_year):
        nc = str(player_name).strip().lower()
        pi = injuries_pl[injuries_pl['player_name_clean'] == nc]
        f = {'games_missed_last_season': 0, 'injuries_last_12m': 0,
             'career_injury_count': 0, 'hamstring_history': 0,
             'same_bodypart_before': 0, 'returned_from_long_injury': 0}
        if len(pi) == 0:
            return f
        f['career_injury_count'] = len(pi)
        ls = pi[pi['season_year'] == season_year - 1]
        f['games_missed_last_season'] = ls['games_missed'].sum()
        recent = pi[pi['season_year'].isin([season_year - 1, season_year])]
        f['injuries_last_12m'] = len(recent)
        ham = pi[pi['body_part'].str.lower().str.contains('hamstring|thigh', na=False)]
        f['hamstring_history'] = 1 if len(ham) > 0 else 0
        li = pi[(pi['season_year'] >= season_year - 2) & (pi['days_out'] >= 90)]
        f['returned_from_long_injury'] = 1 if len(li) > 0 else 0
        if len(pi) >= 2:
            bp = pi['body_part'].dropna().str.lower().values
            f['same_bodypart_before'] = 1 if len(set(bp)) < len(bp) else 0
        return f

    for col in ['games_missed_last_season', 'injuries_last_12m', 'career_injury_count',
                'hamstring_history', 'same_bodypart_before', 'returned_from_long_injury',
                'market_value_m', 'height_cm']:
        data[col] = np.nan

    for idx, row in data.iterrows():
        inj = injury_features(row['player'], row['season'])
        for col, val in inj.items():
            data.at[idx, col] = val
        nc = str(row['player']).strip().lower()
        pv = players_df[players_df['player_name_clean'] == nc]
        if len(pv) > 0:
            sm = pv[pv['season_year'] == row['season']]
            if len(sm) > 0:
                data.at[idx, 'market_value_m'] = sm.iloc[0]['market_value_m']
            else:
                cl = pv.iloc[(pv['season_year'] - row['season']).abs().argsort()[:1]]
                data.at[idx, 'market_value_m'] = cl.iloc[0]['market_value_m']
        if nc in height_lookup.index:
            data.at[idx, 'height_cm'] = height_lookup.loc[nc]

    return data


def add_subposition_clustering(data):
    """Leak-free-ish display grouping: FW->ST/W, DF->CB/FB, MF->DM/CM/AM.
    Used only to decide which output CSV a player belongs in -- the underlying
    models are still trained at the FW/DF/MF level (subposition splitting was
    tested and made target accuracy worse due to halved training data)."""
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler

    fw_feats = ['xg_per_90', 'take_on_succ_pct', 'aerials_won_pct',
                'shots_per_90', 'assists_per_90', 'progressive_carries']
    df_feats = [f for f in ['clearances_per90', 'aerials_won_pct',
                'progressive_passes_per90', 'interceptions_per90',
                'tackles_interceptions_per90'] if f in data.columns]
    mf_feats = ['key_passes_per90', 'assists_per_90', 'tackles_interceptions_per90',
                'progressive_passes_per90', 'xg_per_90', 'ball_recoveries_per90']

    pos_feats = {'FW': fw_feats, 'DF': df_feats, 'MF': mf_feats}
    pos_clusters = {'FW': 2, 'DF': 2, 'MF': 3}
    data['subposition'] = data['position_group']

    for position in ['FW', 'DF', 'MF']:
        feats = pos_feats[position]
        n = pos_clusters[position]
        pos_all = data[data['position_group'] == position]
        valid = pos_all[feats].dropna()
        scaler = StandardScaler()
        X = scaler.fit_transform(valid)
        km = KMeans(n_clusters=n, random_state=42, n_init=10)
        c = km.fit_predict(X)
        data.loc[valid.index, 'cluster_raw'] = c
        pwc = valid.copy()
        pwc['cluster'] = c
        if position == 'FW':
            xgm = pwc.groupby('cluster')['xg_per_90'].mean()
            st_c, w_c = int(xgm.idxmax()), int(xgm.idxmin())
            pp = data[data['position_group'] == position]
            data.loc[pp[pp['cluster_raw'] == st_c].index, 'subposition'] = 'ST'
            data.loc[pp[pp['cluster_raw'] == w_c].index, 'subposition'] = 'W'
        elif position == 'DF':
            clm = pwc.groupby('cluster')['clearances_per90'].mean()
            cb_c, fb_c = int(clm.idxmax()), int(clm.idxmin())
            pp = data[data['position_group'] == position]
            data.loc[pp[pp['cluster_raw'] == cb_c].index, 'subposition'] = 'CB'
            data.loc[pp[pp['cluster_raw'] == fb_c].index, 'subposition'] = 'FB'
        elif position == 'MF':
            kpm = pwc.groupby('cluster')['key_passes_per90'].mean()
            sc = kpm.sort_values()
            dm_c, cm_c, am_c = int(sc.index[0]), int(sc.index[1]), int(sc.index[2])
            lmap = {dm_c: 'DM', cm_c: 'CM', am_c: 'AM'}
            pp = data[data['position_group'] == position]
            for cid, lab in lmap.items():
                data.loc[pp[pp['cluster_raw'] == cid].index, 'subposition'] = lab

    overrides = {'Antonee Robinson': 'FB', 'John Mcginn': 'CM',
                 'Mario Lemina': 'DM', 'Lewis Cook': 'DM',
                 'Keane Lewis-Potter': 'W', 'Ismaila Sarr': 'W'}
    for player, sp in overrides.items():
        data.loc[data['player'] == player, 'subposition'] = sp

    return data


def create_multi_season_features(df, player, current_season):
    """Rolling features from a player's seasons strictly before current_season --
    never includes the season being predicted, so this is leak-free by construction."""
    all_data = df[(df['player'] == player) & (df['season'] < current_season)].sort_values('season')
    if len(all_data) == 0:
        return None
    recent = all_data.tail(3)
    features = {'seasons_available': len(recent), 'total_pl_seasons': len(all_data)}
    for feat in BASE_FEATURES:
        if feat not in all_data.columns:
            continue
        av = all_data[feat].values
        rv = recent[feat].values
        features[f'{feat}_s1'] = rv[-1] if len(rv) >= 1 else np.nan
        features[f'{feat}_s2'] = rv[-2] if len(rv) >= 2 else np.nan
        features[f'{feat}_s3'] = rv[-3] if len(rv) >= 3 else np.nan
        features[f'{feat}_trend'] = (rv[-1] - rv[-2]) if len(rv) >= 2 else np.nan
        features[f'{feat}_avg'] = np.nanmean(av)
        vv = av[~np.isnan(av.astype(float))]
        features[f'{feat}_longterm_trend'] = (vv[-1] - vv[0]) if len(vv) >= 2 else np.nan
        features[f'{feat}_career_best'] = np.nanmax(av) if len(av) > 0 else np.nan
    features['age'] = all_data['age'].values[-1]
    features['last_season_minutes'] = all_data['ninety_mins_played'].values[-1]
    return features


def build_dataset(df, position, up_to_season, targets):
    """One training row per (player, season) with that season's actual target
    value as the label and prior-seasons-only features as X."""
    rows = []
    pos_df = df[(df['position_group'] == position) & (df['season'] <= up_to_season)].copy()
    for player in pos_df['player'].unique():
        for season in sorted(pos_df[pos_df['player'] == player]['season'].unique()):
            features = create_multi_season_features(pos_df, player, season)
            if features is None:
                continue
            actual = pos_df[(pos_df['player'] == player) & (pos_df['season'] == season)]
            if len(actual) == 0:
                continue
            actual = actual.iloc[0]
            for target in targets:
                if target in actual:
                    features[f'target_{target}'] = actual[target]
            features['target_ninety_mins'] = actual['ninety_mins_played']
            features['player'] = player
            features['season'] = season
            rows.append(features)
    return pd.DataFrame(rows)


def get_trend_explanation(df, player, subposition, as_of_season=2024):
    ph = df[(df['player'] == player) & (df['season'] <= as_of_season)].tail(3)
    if len(ph) < 2:
        return "Limited data available for trend analysis."
    age = ph['age'].values[-1]
    if pd.isna(age):
        return "Limited data available for trend analysis."
    age = float(age)
    exp = []
    if age <= 23:
        exp.append(f"At {int(age)}, still in development years with room to grow.")
    elif age <= 27:
        exp.append(f"At {int(age)}, entering peak years.")
    elif age <= 30:
        exp.append(f"At {int(age)}, in prime years but may begin to slow.")
    else:
        exp.append(f"At {int(age)}, experience is key but decline is possible.")

    trend_metric = {
        'ST': 'goals_per_90', 'W': 'goals_per_90',
        'CM': 'progressive_passes_per90', 'AM': 'progressive_passes_per90',
        'DM': 'tackles_interceptions_per90',
        'CB': 'clearances_per90', 'FB': 'clearances_per90',
    }.get(subposition)
    if trend_metric and trend_metric in ph.columns:
        v = ph[trend_metric].dropna().values
        if len(v) >= 2:
            t = v[-1] - v[-2]
            label = {
                'goals_per_90': ('Goal rate', 0.05),
                'progressive_passes_per90': ('Progressive passing', 0.5),
                'tackles_interceptions_per90': ('Defensive contribution', 0.3),
                'clearances_per90': ('Defensive output', 0.3),
            }[trend_metric]
            name, thresh = label
            if t > thresh:
                exp.append(f"{name} improving season on season.")
            elif t < -thresh:
                exp.append(f"{name} has declined recently.")
            else:
                exp.append(f"{name} has been consistent.")

    mv = ph['ninety_mins_played'].dropna().values
    if len(mv) >= 2:
        if mv[-1] - mv[-2] > 5:
            exp.append("Playing more minutes each season.")
        elif mv[-1] - mv[-2] < -5:
            exp.append("Minutes dropped recently - injury or form concern.")
    return " ".join(exp)


def get_confidence_interval(position, target, pred_val, pred_90s):
    mae = VALIDATED_MAE.get((position, target), 2.0)
    margin = round(mae * 1.5, 1)
    if target in PCT_STATS:
        return round(max(0, pred_val - margin), 1), round(pred_val + margin, 1)
    total = pred_val * pred_90s
    return round(max(0, total - margin), 1), round(total + margin, 1)


def predict_minutes(player, position, features, model_info, data_df, target_season=2025):
    hist = data_df[(data_df['player'] == player) & (data_df['season'] < target_season)]
    if len(hist) == 0:
        return 15.0
    rm = hist.sort_values('season').tail(3)['ninety_mins_played'].values
    if len(rm) >= 3:
        wa = rm[-1] * 0.70 + rm[-2] * 0.20 + rm[-3] * 0.10
    elif len(rm) == 2:
        wa = rm[-1] * 0.75 + rm[-2] * 0.25
    else:
        wa = rm[-1] * 0.90
    fr = pd.DataFrame([features])
    for col in model_info['feature_cols']:
        if col not in fr.columns:
            fr[col] = 0
    fr = fr[model_info['feature_cols']].fillna(0)
    mp = float(model_info['model'].predict(fr)[0])
    blended = wa * 0.70 + mp * 0.30
    # No separate injury-history penalty here: games_missed_last_season_s1/injuries_last_12m_s1
    # are already in feature_cols, so the regression (mp) learns its own injury discount from
    # training data. A held-out backtest confirmed stacking a second, explicit penalty on top
    # makes minutes predictions worse, not better (2024 fold: R2 -0.01 -> 0.07 once removed).
    pmax = {'FW': 35, 'MF': 36, 'DF': 37}
    return round(max(3, min(pmax.get(position, 35), blended)), 1)


def load_tuned_params():
    """Returns {(position, target): {hyperparam: value}} from the saved Optuna
    results, or an empty dict if tuning hasn't been run (callers should fall
    back to DEFAULT_PARAMS in that case)."""
    if not os.path.exists(TUNED_PARAMS_CSV):
        return {}
    df = pd.read_csv(TUNED_PARAMS_CSV)
    param_cols = [c for c in df.columns if c not in ['position', 'target']]
    int_cols = {'n_estimators', 'max_depth', 'min_child_weight'}
    out = {}
    for _, row in df.iterrows():
        params = {c: (int(row[c]) if c in int_cols else float(row[c])) for c in param_cols}
        out[(row['position'], row['target'])] = params
    return out


def get_params_for(position, target, tuned_params):
    return tuned_params.get((position, target), DEFAULT_PARAMS)
