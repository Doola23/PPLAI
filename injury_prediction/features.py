import logging
import numpy as np
import pandas as pd

from config import (POSITION_PEAK_AGE, SOFT_TISSUE_TYPES, SOFT_TISSUE_PARTS,
                    FBREF_INTENSITY_COLS, SEP)

logger = logging.getLogger(__name__)

_NAN_FBREF = {col: np.nan for col in FBREF_INTENSITY_COLS}


def get_features(player_name_norm: str, match_date: pd.Timestamp,
                 data: dict, lookups: dict) -> dict:
    """Compute all workload, injury history, and context features for one player-match."""
    features: dict = {}

    minutes_by_player   = data['minutes_by_player']
    inj_by_player       = data['inj_by_player']
    meaningful_injuries = data['meaningful_injuries']
    fpl_api_lookup      = data['fpl_api_lookup']
    fbref_lookup        = data['fbref_lookup']
    ewma_lookup         = lookups['ewma_lookup']
    break_features_cache = lookups['break_features_cache']
    match_meta          = lookups['match_meta']
    fpl_xgc_lookup      = lookups['fpl_xgc_lookup']

    _empty = pd.DataFrame(columns=['date', 'minutes_played', 'is_starter', 'competition'])
    _all   = minutes_by_player.get(player_name_norm, _empty)
    player_hist = _all[_all['date'] < match_date]

    # ── LOAD FEATURES ─────────────────────────────────────────────
    for days in [7, 14, 30, 42, 56]:
        cutoff = match_date - pd.Timedelta(days=days)
        recent = player_hist[player_hist['date'] >= cutoff]
        features[f'minutes_last_{days}d'] = recent['minutes_played'].sum()
        features[f'matches_last_{days}d'] = len(recent)

    features['total_load_7d']  = features['minutes_last_7d']
    features['total_load_14d'] = features['minutes_last_14d']

    last5 = player_hist.tail(5)
    features['consecutive_starts'] = int(
        (last5['minutes_played'] >= 60).all() and len(last5) >= 3
    )

    if len(player_hist) > 0:
        features['days_since_last_match'] = (match_date - player_hist['date'].max()).days
    else:
        features['days_since_last_match'] = 30

    # ── ACWR ──────────────────────────────────────────────────────
    mins_28d    = player_hist[
        player_hist['date'] >= match_date - pd.Timedelta(days=28)
    ]['minutes_played'].sum()
    chronic     = mins_28d / 4
    acute       = features['minutes_last_7d']
    features['acwr'] = round(acute / chronic, 3) if chronic > 0 else 1.0

    # ── EWMA ACWR (Murray et al. 2017) ────────────────────────────
    _ea, _ec = ewma_lookup.get((player_name_norm, match_date), (0.0, 0.0))
    features['ewma_acwr'] = round(_ea / _ec, 3) if _ec > 0 else 1.0

    # ── TRAINING MONOTONY & STRAIN (Foster 1998) ──────────────────
    _weekly = []
    for _w in range(4):
        _ws = match_date - pd.Timedelta(days=(_w + 1) * 7)
        _we = match_date - pd.Timedelta(days=_w * 7)
        _wl = player_hist[
            (player_hist['date'] >= _ws) & (player_hist['date'] < _we)
        ]['minutes_played'].sum()
        _weekly.append(float(_wl))
    _wstd  = float(np.std(_weekly))
    _wmean = float(np.mean(_weekly))
    features['monotony'] = _wmean / _wstd if _wstd > 0 else 1.0
    features['strain']   = _wmean * features['monotony']

    # ── CUMULATIVE SEASON MINUTES ──────────────────────────────────
    if match_date.month >= 8:
        season_start_date = pd.Timestamp(match_date.year, 8, 1)
    else:
        season_start_date = pd.Timestamp(match_date.year - 1, 8, 1)

    season_hist = player_hist[player_hist['date'] >= season_start_date]
    features['season_minutes_so_far'] = season_hist['minutes_played'].sum()
    features['season_matches_so_far'] = len(season_hist)

    prev_season_start = pd.Timestamp(season_start_date.year - 1, 8, 1)
    prev_season_hist  = player_hist[
        (player_hist['date'] >= prev_season_start) &
        (player_hist['date'] <  season_start_date)
    ]
    prev_total = prev_season_hist['minutes_played'].sum()
    features['prev_season_minutes'] = prev_total

    curr_rate = (features['season_minutes_so_far'] / features['season_matches_so_far']
                 if features['season_matches_so_far'] > 0 else 0)
    prev_rate = (prev_total / len(prev_season_hist) if len(prev_season_hist) > 0 else 0)
    features['minutes_per_match_change'] = curr_rate - prev_rate

    # ── INJURY HISTORY ─────────────────────────────────────────────
    _inj_empty = pd.DataFrame(columns=meaningful_injuries.columns)
    _all_inj   = inj_by_player.get(player_name_norm, _inj_empty)
    player_injuries = _all_inj[_all_inj['injury_date'] < match_date]

    features['career_injury_count'] = len(player_injuries)

    cutoff_12m = match_date - pd.Timedelta(days=365)
    cutoff_6m  = match_date - pd.Timedelta(days=180)
    features['injuries_last_12m'] = len(player_injuries[player_injuries['injury_date'] >= cutoff_12m])
    features['injuries_last_6m']  = len(player_injuries[player_injuries['injury_date'] >= cutoff_6m])

    if len(player_injuries) > 0:
        features['days_since_last_injury'] = (match_date - player_injuries['injury_date'].max()).days
    else:
        features['days_since_last_injury'] = 999

    features['hamstring_history']    = int((player_injuries['body_part'] == 'Hamstring').any())
    features['muscle_injury_history'] = int((player_injuries['injury_type'] == 'Muscle').any())

    if len(player_injuries) > 0:
        bp_counts = player_injuries['body_part'].value_counts()
        features['recurring_body_part'] = int(len(bp_counts) > 0 and bp_counts.iloc[0] > 1)
    else:
        features['recurring_body_part'] = 0

    cutoff_90d  = match_date - pd.Timedelta(days=90)
    recent_long = player_injuries[
        (player_injuries['injury_date'] >= cutoff_90d) &
        (player_injuries['days_out'].fillna(0) >= 60)
    ]
    features['returned_from_long_injury'] = int(len(recent_long) > 0)

    if len(player_injuries) > 0 and player_injuries['days_out'].notna().any():
        features['avg_injury_severity'] = player_injuries['days_out'].mean()
        features['max_injury_severity'] = player_injuries['days_out'].max()
    else:
        features['avg_injury_severity'] = 0
        features['max_injury_severity'] = 0

    # Season and previous-season injury burden (Ekstrand et al. 2011)
    _season_inj = player_injuries[player_injuries['injury_date'] >= season_start_date]
    features['season_days_missed']  = _season_inj['days_out'].fillna(0).sum()
    features['season_injury_count'] = len(_season_inj)

    _prev_end   = season_start_date
    _prev_start = pd.Timestamp(_prev_end.year - 1, 8, 1)
    _prev_inj   = player_injuries[
        (player_injuries['injury_date'] >= _prev_start) &
        (player_injuries['injury_date'] <  _prev_end)
    ]
    features['prev_season_days_missed'] = _prev_inj['days_out'].fillna(0).sum()

    # ── SOFT TISSUE ────────────────────────────────────────────────
    soft_tissue = player_injuries[
        player_injuries['injury_type'].isin(SOFT_TISSUE_TYPES) |
        player_injuries['body_part'].isin(SOFT_TISSUE_PARTS)
    ]
    features['soft_tissue_injury_count'] = len(soft_tissue)
    features['soft_tissue_last_12m']     = len(
        soft_tissue[soft_tissue['injury_date'] >= cutoff_12m]
    )

    # ── PERSONAL INJURY TRIGGER PROFILE ───────────────────────────
    _pre_matches, _pre_minutes, _pre_consec = [], [], []
    for _, _inj in player_injuries.iterrows():
        _idate = _inj['injury_date']
        if pd.isna(_idate):
            continue
        _pre = player_hist[
            (player_hist['date'] >= _idate - pd.Timedelta(days=14)) &
            (player_hist['date'] <  _idate)
        ]
        if len(_pre) == 0:
            continue
        _pre_matches.append(len(_pre))
        _pre_minutes.append(_pre['minutes_played'].sum())
        _sorted = player_hist[player_hist['date'] < _idate].sort_values('date')
        _consec = 0
        for _, _m in _sorted.iloc[::-1].iterrows():
            if _m['minutes_played'] >= 60:
                _consec += 1
            else:
                break
        _pre_consec.append(_consec)

    if _pre_matches:
        _tm = float(np.mean(_pre_matches))
        _tmin = float(np.mean(_pre_minutes))
        _tc   = float(np.mean(_pre_consec))
        features['personal_trigger_matches_14d'] = _tm
        features['personal_trigger_minutes_14d'] = _tmin
        features['personal_trigger_consecutive']  = _tc
        features['load_vs_trigger_ratio']   = features['matches_last_14d'] / _tm if _tm > 0 else 1.0
        features['minutes_vs_trigger_ratio'] = features['minutes_last_14d'] / _tmin if _tmin > 0 else 1.0
        _curr_c = 0
        for _, _m in player_hist.sort_values('date').iloc[::-1].iterrows():
            if _m['minutes_played'] >= 60:
                _curr_c += 1
            else:
                break
        features['consecutive_vs_trigger'] = _curr_c / _tc if _tc > 0 else 1.0
        features['at_personal_trigger']    = int(features['matches_last_14d'] >= _tm)
    else:
        features['personal_trigger_matches_14d'] = np.nan
        features['personal_trigger_minutes_14d'] = np.nan
        features['personal_trigger_consecutive']  = np.nan
        features['load_vs_trigger_ratio']         = 1.0
        features['minutes_vs_trigger_ratio']      = 1.0
        features['consecutive_vs_trigger']        = 1.0
        features['at_personal_trigger']           = 0

    # ── FIXTURE CONGESTION ─────────────────────────────────────────
    if len(player_hist) >= 2:
        last_dates = player_hist['date'].sort_values().tail(2).values
        features['days_between_last_2'] = (
            pd.Timestamp(last_dates[-1]) - pd.Timestamp(last_dates[-2])
        ).days
    else:
        features['days_between_last_2'] = 7

    features['congestion_flag'] = int(features['days_between_last_2'] < 4)

    _last6 = player_hist.sort_values('date').tail(6)
    if len(_last6) >= 2:
        _d6   = _last6['date'].values
        _gaps = [(pd.Timestamp(_d6[i+1]) - pd.Timestamp(_d6[i])).days
                 for i in range(len(_d6) - 1)]
        features['avg_recovery_days'] = float(np.mean(_gaps))
    else:
        features['avg_recovery_days'] = 7.0

    last10_days = player_hist[player_hist['date'] >= match_date - pd.Timedelta(days=10)]
    features['triple_fixture_flag'] = int(len(last10_days) >= 3)

    europe = ['Champions League', 'Europa League', 'Conference League']
    recent_europe = player_hist[
        (player_hist['date'] >= match_date - pd.Timedelta(days=4)) &
        (player_hist['competition'].isin(europe))
    ]
    features['played_europe_this_week'] = int(len(recent_europe) > 0)

    # ── INTERNATIONAL BREAK ────────────────────────────────────────
    bf = break_features_cache.get(match_date, {})
    features['days_since_intl_break'] = bf.get('days_since_intl_break', 999)
    features['is_intl_break_week']    = bf.get('is_intl_break_week', 0)

    # ── SEASON STAGE ───────────────────────────────────────────────
    features['month']                = match_date.month
    features['is_congestion_period'] = int(match_date.month in [11, 12, 1])
    features['is_early_season']      = int(match_date.month in [8, 9])

    # ── MINUTES SPIKE ──────────────────────────────────────────────
    avg_per_match = player_hist.tail(10)['minutes_played'].mean()
    features['minutes_spike'] = (
        features['minutes_last_7d'] - avg_per_match
        if pd.notna(avg_per_match) and avg_per_match > 0 else 0
    )

    # ── STARTER / ROTATION ─────────────────────────────────────────
    last10_m = player_hist.tail(10)
    features['starter_rate_last5']  = last5['is_starter'].astype(float).mean() if len(last5) > 0 else 0.5
    features['starter_rate_last10'] = last10_m['is_starter'].astype(float).mean() if len(last10_m) > 0 else 0.5

    _starters10 = last10_m[last10_m['is_starter'].astype(bool)]
    features['subbed_off_early_rate'] = (
        (_starters10['minutes_played'] < 70).mean() if len(_starters10) > 0 else 0.0
    )
    features['came_on_as_sub_last5'] = (
        ((last5['is_starter'].astype(bool) == False) & (last5['minutes_played'] > 0)).mean()
        if len(last5) > 0 else 0.0
    )

    # ── UTILIZATION & PERSONAL INJURY RATE ────────────────────────
    features['utilization_rate'] = (
        features['season_minutes_so_far'] / max(features['season_matches_so_far'] * 90, 1)
    )
    features['personal_injury_rate'] = (
        features['career_injury_count'] / max(len(player_hist), 1) * 100
    )

    # ── ACTIVE INJURY ──────────────────────────────────────────────
    p_inj = inj_by_player.get(player_name_norm, pd.DataFrame())
    if len(p_inj) > 0:
        active = p_inj[
            (p_inj['injury_date'] <= match_date) &
            (p_inj['return_date'].fillna(pd.Timestamp('2099-01-01')) >= match_date)
        ]
        features['currently_injured'] = int(len(active) > 0)
        past = p_inj[p_inj['return_date'].fillna(pd.NaT) < match_date]
        features['days_since_return'] = (
            (match_date - past['return_date'].max()).days if len(past) > 0 else 999
        )
    else:
        features['currently_injured'] = 0
        features['days_since_return'] = 999

    features['rushed_return'] = int(0 < features['days_since_return'] < 28)

    # ── FBREF PHYSICAL INTENSITY ───────────────────────────────────
    _curr_sy = match_date.year if match_date.month >= 8 else match_date.year - 1
    _fbref   = (fbref_lookup.get((player_name_norm, _curr_sy - 1))
                or fbref_lookup.get((player_name_norm, _curr_sy))
                or _NAN_FBREF)
    features.update(_fbref)

    # ── FPL API SIGNALS ────────────────────────────────────────────
    fpl_row = fpl_api_lookup.get(player_name_norm)
    if fpl_row is not None and match_date.year >= 2024:
        # DynamoDB returns this field inconsistently typed (str/float/None/'') across rows,
        # which makes the column dtype='object' and breaks XGBoost — coerce to float explicitly.
        # `or 100` would also wrongly turn a real 0% chance into 100%, so use pd.to_numeric instead.
        _cop = pd.to_numeric(fpl_row.get('chance_of_playing_next_round'), errors='coerce')
        features['chance_of_playing']   = float(_cop) if pd.notna(_cop) else 100.0
        features['fpl_status_injured']  = int(str(fpl_row.get('status', 'a')) in ['i', 'u'])
        features['fpl_status_doubtful'] = int(str(fpl_row.get('status', 'a')) == 'd')
    else:
        features['chance_of_playing']   = 100.0
        features['fpl_status_injured']  = 0
        features['fpl_status_doubtful'] = 0

    # ── MATCH METADATA ─────────────────────────────────────────────
    meta = match_meta.get((player_name_norm, match_date), {})
    features['opponent_strength'] = meta.get('opponent_strength', 1500)
    features['elo_diff']          = meta.get('elo_diff', 0)
    features['is_home']           = meta.get('is_home', 0)

    features['fpl_xgc'] = fpl_xgc_lookup.get((player_name_norm, match_date.date()), 1.0)

    return features


def get_player_profile(player_name_norm: str, match_date: pd.Timestamp,
                       data: dict) -> dict:
    """Return age, market value, position, and physical profile for a player."""
    players_lookup = data['players_lookup']

    season_year    = match_date.year if match_date.month >= 8 else match_date.year - 1
    player_seasons = players_lookup.get(player_name_norm, {})

    _empty_profile = {
        'age': np.nan, 'market_value_m': np.nan, 'market_value_prev_m': np.nan,
        'value_change_m': np.nan, 'value_pct_change': np.nan,
        'position_group': 'Unknown', 'age_vs_peak': np.nan,
        'years_past_peak': 0, 'is_past_peak': 0, 'is_veteran': 0, 'height_cm': np.nan,
    }
    if not player_seasons:
        return _empty_profile

    current_row = (player_seasons[season_year]
                   if season_year in player_seasons
                   else player_seasons[min(player_seasons, key=lambda y: abs(y - season_year))])

    prev_row    = player_seasons.get(season_year - 1)
    prev_value  = prev_row['market_value_m'] if prev_row is not None else np.nan
    curr_value  = current_row['market_value_m']

    if pd.notna(curr_value) and pd.notna(prev_value) and prev_value > 0:
        value_change = curr_value - prev_value
        value_pct    = value_change / prev_value
    else:
        value_change = np.nan
        value_pct    = np.nan

    age = ((match_date - current_row['date_of_birth']).days / 365.25
           if pd.notna(current_row['date_of_birth']) else np.nan)

    pos = str(current_row['position']).lower()
    if 'goalkeeper' in pos:
        pos_group = 'GK'
    elif 'back' in pos or 'defender' in pos:
        pos_group = 'DF'
    elif 'midfield' in pos:
        pos_group = 'MF'
    elif 'forward' in pos or 'winger' in pos or 'striker' in pos:
        pos_group = 'FW'
    else:
        pos_group = 'Unknown'

    peak_age = POSITION_PEAK_AGE[pos_group]
    if pd.notna(age):
        age_vs_peak     = round(age - peak_age, 1)
        years_past_peak = max(0.0, age_vs_peak)
        is_past_peak    = int(age_vs_peak > 0)
        is_veteran      = int(age >= 32)
    else:
        age_vs_peak, years_past_peak, is_past_peak, is_veteran = np.nan, 0, 0, 0

    height = current_row.get('height_cm', np.nan)
    return {
        'age':                 round(age, 1) if pd.notna(age) else np.nan,
        'market_value_m':      curr_value,
        'market_value_prev_m': prev_value,
        'value_change_m':      value_change,
        'value_pct_change':    value_pct,
        'position_group':      pos_group,
        'age_vs_peak':         age_vs_peak,
        'years_past_peak':     years_past_peak,
        'is_past_peak':        is_past_peak,
        'is_veteran':          is_veteran,
        'height_cm':           float(height) if pd.notna(height) else np.nan,
    }


def build_dataset(data: dict, lookups: dict) -> pd.DataFrame:
    """Build the full feature matrix by iterating over all PL player-match rows."""
    print(f"\n{SEP}")
    print(' STEP 7 — BUILDING DATASET (this takes a few minutes...)')
    print(SEP)

    pl_matches_unique   = data['pl_matches_unique']
    meaningful_injuries = data['meaningful_injuries']
    total               = len(pl_matches_unique)
    all_rows            = []

    for i, (_, row) in enumerate(pl_matches_unique.iterrows()):
        if i % 5000 == 0:
            print(f"  Processing {i:,}/{total:,} ({i/total*100:.0f}%)...")

        name_norm  = row['name_norm']
        match_date = row['date']
        team       = row['team']

        feat = get_features(name_norm, match_date, data, lookups)
        feat.update(get_player_profile(name_norm, match_date, data))

        window_end = match_date + pd.Timedelta(days=14)
        injured    = meaningful_injuries[
            (meaningful_injuries['name_norm'] == name_norm) &
            (meaningful_injuries['injury_date'] > match_date) &
            (meaningful_injuries['injury_date'] <= window_end)
        ]
        feat['label']                      = int(len(injured) > 0)
        feat['player_name']                = row['player_name']
        feat['team']                       = team
        feat['season']                     = row['season']
        feat['match_date']                 = match_date
        feat['minutes_played_this_match']  = row['minutes_played']
        all_rows.append(feat)

    df = pd.DataFrame(all_rows)
    print(f"\nDataset built: {len(df):,} rows")
    print(f"Positive class: {df['label'].sum():,} ({df['label'].mean()*100:.1f}%)")
    return df


def prepare_features(df: pd.DataFrame, feature_cols: list) -> pd.DataFrame:
    """Add derived columns (position encoding, interaction terms) and fill missing values."""
    df = df.copy()
    df['pos_GK'] = (df['position_group'] == 'GK').astype(int)
    df['pos_DF'] = (df['position_group'] == 'DF').astype(int)
    df['pos_MF'] = (df['position_group'] == 'MF').astype(int)
    df['pos_FW'] = (df['position_group'] == 'FW').astype(int)

    df['age_x_acwr']        = df['age'] * df['acwr']
    df['age_x_minutes_30d'] = df['age'] * df['minutes_last_30d']

    for col in feature_cols:
        if col in df.columns:
            df[col] = df[col].fillna(df[col].median())

    print(f"Features prepared: {len(feature_cols)}")
    return df
