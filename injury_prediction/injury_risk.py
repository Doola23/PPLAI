# ============================================================
# PREMIER LEAGUE INJURY RISK MODEL
# XGBoost Binary Classifier
# Target: Will player miss 1+ matches in next 7 days?
# ============================================================

import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

from xgboost import XGBClassifier
from sklearn.metrics import (roc_auc_score, f1_score, precision_score,
                             recall_score, accuracy_score,
                             confusion_matrix, classification_report)
from sklearn.calibration import CalibratedClassifierCV
from imblearn.over_sampling import SMOTE


# Minimum precision floor for threshold selection —
# only accept thresholds where precision >= this value
MIN_PRECISION = 0.12

# ── FILE PATHS ────────────────────────────────────────────────
MINUTES_FILE  = r'C:\Users\DELL\Documents\data\player_minutes.csv'
INJURIES_FILE = r'C:\Users\DELL\Documents\data\injuries_combined_clean.csv'
PLAYERS_FILE  = r'C:\Users\DELL\Documents\data\players_combined_complete.csv'
FPL_FILE      = r'C:\Users\DELL\Documents\data\fpl_historical.csv'
FPL_API_FILE  = r'C:\Users\DELL\Documents\data\fpl_api_data.csv'
BREAKS_FILE   = r'C:\Users\DELL\Documents\data\international_breaks.csv'
OUTPUT_FILE   = r'C:\Users\DELL\Documents\data\injury_predictions.csv'
FBREF_DIR     = r'C:\Users\DELL\Documents\player_ratings'
# ─────────────────────────────────────────────────────────────

import re

def normalise_name(name):
    if pd.isna(name):
        return ''
    name = str(name).lower().strip()
    replacements = {
        'á':'a','à':'a','ä':'a','â':'a','ã':'a',
        'é':'e','è':'e','ë':'e','ê':'e','ę':'e',
        'í':'i','ì':'i','ï':'i','î':'i',
        'ó':'o','ò':'o','ö':'o','ô':'o','õ':'o','ő':'o',
        'ú':'u','ù':'u','ü':'u','û':'u','ű':'u',
        'ñ':'n','ç':'c','ý':'y','ß':'ss',
        'ø':'o','å':'a','æ':'ae','ř':'r',
        'š':'s','ž':'z','č':'c','ě':'e',
        'ğ':'g','ş':'s','ı':'i','ć':'c',
        'đ':'d','ł':'l','ń':'n','ą':'a',
        'ź':'z','ż':'z',
    }
    for k, v in replacements.items():
        name = name.replace(k, v)
    name = re.sub(r'[^a-z\s]', '', name)
    return ' '.join(name.split())

SEP = "=" * 62

# Peak age per position — empirically derived from this dataset
# (age at which injury rate peaks per position group)
POSITION_PEAK_AGE = {
    'GK':      32,
    'DF':      35,
    'MF':      30,
    'FW':      31,
    'Unknown': 31,
}

# Soft tissue injury classification (high recurrence rate vs structural injuries)
SOFT_TISSUE_TYPES = {'Muscle', 'Tendon', 'Ligament'}
SOFT_TISSUE_PARTS = {'Hamstring', 'Thigh', 'Calf', 'Groin', 'Adductor', 'Quadriceps', 'Quad'}

# ── STEP 1: LOAD DATA ─────────────────────────────────────────
print(SEP)
print(" STEP 1 — LOADING DATA")
print(SEP)

minutes  = pd.read_csv(MINUTES_FILE, encoding='utf-8-sig')
injuries = pd.read_csv(INJURIES_FILE, encoding='utf-8-sig')
players  = pd.read_csv(PLAYERS_FILE, encoding='utf-8-sig')
fpl      = pd.read_csv(FPL_FILE, encoding='utf-8-sig', low_memory=False)
fpl_api  = pd.read_csv(FPL_API_FILE, encoding='utf-8-sig')
breaks   = pd.read_csv(BREAKS_FILE, encoding='utf-8-sig')

# Parse dates
minutes['date']          = pd.to_datetime(minutes['date'])
injuries['injury_date']  = pd.to_datetime(injuries['injury_date'], errors='coerce')
injuries['return_date']  = pd.to_datetime(injuries['return_date'], errors='coerce')
players['date_of_birth'] = pd.to_datetime(players['date_of_birth'], errors='coerce')
fpl['match_date']        = pd.to_datetime(fpl['match_date'], errors='coerce')
breaks['date']           = pd.to_datetime(breaks['date'])

# Normalise FPL player names (underscore → space)
fpl['name_norm'] = fpl['name'].str.replace('_', ' ').str.lower().str.strip()
fpl_api['name_norm'] = fpl_api['player_name'].apply(normalise_name)

# Build international break set for fast lookup
break_dates = set(breaks['date'].dt.date)

# Build FPL lookup: name_norm → list of (match_date, row)
fpl_lookup = {}
for _, row in fpl.iterrows():
    n = row['name_norm']
    if n not in fpl_lookup:
        fpl_lookup[n] = []
    fpl_lookup[n].append(row)

# Build FPL API lookup for 2024-25 chance_of_playing
fpl_api_lookup = {}
for _, row in fpl_api.iterrows():
    fpl_api_lookup[row['name_norm']] = row

print(f"Minutes  : {len(minutes):,} rows")
print(f"Injuries : {len(injuries):,} rows")
print(f"Players  : {len(players):,} rows")
print(f"FPL hist : {len(fpl):,} rows")
print(f"FPL API  : {len(fpl_api):,} rows")
print(f"Int breaks: {len(break_dates)} days")

# ── LOAD FBREF SEASON STATS (2018-2024) ───────────────────────
import glob as _glob

FBREF_INTENSITY_COLS = [
    'carry_dist_p90', 'prog_carry_dist_p90', 'carries_p90',
    'aerials_p90', 'tackles_p90', 'fouls_p90',
]

_fbref_frames = []
for _f in sorted(_glob.glob(FBREF_DIR + r'\[0-9]*.csv')):
    _fbref_frames.append(pd.read_csv(_f, encoding='utf-8-sig'))

fbref_stats = pd.concat(_fbref_frames, ignore_index=True)
fbref_stats['name_norm']   = fbref_stats['player'].apply(normalise_name)
fbref_stats['season_year'] = fbref_stats['season'].astype(int)

_n90 = fbref_stats['ninety_mins_played'].replace(0, np.nan)
fbref_stats['carry_dist_p90']      = fbref_stats['total_distance_carried']   / _n90
fbref_stats['prog_carry_dist_p90'] = fbref_stats['progressive_carries_distance'] / _n90
fbref_stats['carries_p90']         = fbref_stats['carries'] / _n90
fbref_stats['aerials_p90']         = (
    fbref_stats['aerials_won'].fillna(0) + fbref_stats['aerials_lost'].fillna(0)
) / _n90
fbref_stats['tackles_p90']  = fbref_stats['tackles'] / _n90
fbref_stats['fouls_p90']    = fbref_stats['fouls']   / _n90

# Build lookup: (name_norm, season_start_year) → intensity features
fbref_lookup: dict = {}
for _, _row in fbref_stats.iterrows():
    fbref_lookup[(_row['name_norm'], int(_row['season_year']))] = {
        col: _row[col] for col in FBREF_INTENSITY_COLS
    }

_NAN_FBREF = {col: np.nan for col in FBREF_INTENSITY_COLS}
print(f"FBref stats : {len(fbref_stats):,} rows, "
      f"{fbref_stats['season_year'].nunique()} seasons, "
      f"{fbref_stats['name_norm'].nunique():,} unique players")

# ── STEP 2: FILTER PL MATCHES ONLY FOR TARGET ──────────────────
# We only predict risk before PL matches
# (but use ALL competition minutes for load features)
pl_minutes = minutes[minutes['competition'] == 'Premier League'].copy()
print(f"\nPL matches only: {pl_minutes['match_url'].nunique():,} unique matches")
print(f"Unique PL player-match rows: {len(pl_minutes):,}")

# ── STEP 3: NORMALISE PLAYER NAMES ────────────────────────────
injuries['name_norm'] = injuries['player_name'].apply(normalise_name)
players['name_norm']  = players['player_name'].apply(normalise_name)
minutes['name_norm']  = minutes['player_name'].apply(normalise_name)
pl_minutes['name_norm'] = pl_minutes['player_name'].apply(normalise_name)

# ── STEP 4: PARSE MARKET VALUE ─────────────────────────────────
def parse_market_value(val):
    if pd.isna(val):
        return np.nan
    s = str(val).replace('€', '').replace(',', '.').strip()
    try:
        if 'm' in s:
            return float(s.replace('m', ''))
        elif 'k' in s:
            return float(s.replace('k', '')) / 1000
        else:
            return float(s)
    except:
        return np.nan

players['market_value_m'] = players['market_value'].apply(parse_market_value)

# Season normalisation for players (2015-16 → 2015)
def season_to_start_year(s):
    s = str(s)
    if '-' in s:
        parts = s.split('-')
        try:
            return int(parts[0])
        except:
            pass
    return np.nan

players['season_year'] = players['season'].apply(season_to_start_year)

# ── STEP 5: BUILD INJURY LABEL LOOKUP ─────────────────────────
# For each player, store all injury dates
print(f"\n{SEP}")
print(" STEP 5 — BUILDING INJURY LABELS")
print(SEP)

# Only use injuries with games_missed >= 1
meaningful_injuries = injuries[
    injuries['games_missed'].fillna(0) >= 1
].copy()

# Comprehensive safe name corrections — confirmed PL players 2015-2025 only
SAFE_NAME_MAP = {
    # Korean name order
    'heungmin son':               'son heungmin',
    'sungyueng ki':               'ki sungyueng',
    'chungyong lee':              'lee chungyong',
    # Single names / nicknames
    'chicharito':                 'javier hernandez',
    'sokratis':                   'sokratis papastathopoulos',
    'naldo':                      'naldo',
    'douglas':                    'douglas',
    'memphis depay':              'memphis',
    # Name format differences
    'alex song':                  'alexandre song',
    'cheik tiote':                'cheick tiote',
    'idrissa gueye':              'idrissa gana gueye',
    'ericmaxim choupomoting':     'eric maxim choupomoting',
    'eric maxim choupo moting':   'eric maxim choupomoting',
    'pierre emile hojbjerg':      'pierre hojbjerg',
    'pierreemile hojbjerg':       'pierre hojbjerg',
    'joel pereira':               'joel castro pereira',
    'mame diouf':                 'mame biram diouf',
    'papiss demba cisse':         'papiss cisse',
    'matt jarvis':                'matthew jarvis',
    'lukasz fabianski':           'lukasz fabiaski',
    'jonny otto':                 'jonny castro',
    'cameron carter vickers':     'cameron cartervickers',
    'florin gardos':              'florin gardo',
    'ben brereton diaz':          'ben brereton',
    'jeff reineadelade':          'jeff reineadelade',
    'jeff reine adelaide':        'jeff reineadelade',
    'baba rahman':                'baba rahman',
    'abdul rahman baba':          'baba rahman',
    'ismal bennacer':             'ismal bennacer',
    'ismael bennacer':            'ismal bennacer',
    # Direct matches confirmed
    'achraf lazaar':              'achraf lazaar',
    'aiden mcgeady':              'aiden mcgeady',
    'bailey peacockfarrell':      'bailey peacockfarrell',
    'bailey peacock farrell':     'bailey peacockfarrell',
    'chuba akpom':                'chuba akpom',
    'dujon sterling':             'dujon sterling',
    'federico fazio':             'federico fazio',
    'filip benkovic':             'filip benkovic',
    'glen kamara':                'glen kamara',
    'joe cole':                   'joe cole',
    'joey obrien':                'joey obrien',
    'krystian bielik':            'krystian bielik',
    'matt macey':                 'matt macey',
    'mike williamson':            'mike williamson',
    'morgan amalfitano':          'morgan amalfitano',
    'ross mccormack':             'ross mccormack',
    'ryan kent':                  'ryan kent',
    'sammy ameobi':               'sammy ameobi',
    'tiago ilori':                'tiago ilori',
    'tomas kalas':                'tomas kalas',
    'tomas rosicky':              'tomas rosicky',
    'tyler blackett':             'tyler blackett',
    'ben sheaf':                  'ben sheaf',
    'marcus edwards':             'marcus edwards',
    'jose enrique':               'jose enrique',
}

def apply_name_map(name):
    return SAFE_NAME_MAP.get(name, name)

injuries['name_norm']     = injuries['name_norm'].apply(apply_name_map)

# Keep only players who have PL minutes — removes ~573 squad-only players
pl_player_names = set(pl_minutes['name_norm'].unique())
injuries = injuries[injuries['name_norm'].isin(pl_player_names)].copy()

meaningful_injuries = injuries[
    injuries['games_missed'].fillna(0) >= 1
].copy()
meaningful_injuries['name_norm'] = meaningful_injuries['name_norm'].apply(apply_name_map)

print(f"Injuries after filtering to PL players: {len(injuries):,}")
print(f"Meaningful (1+ games missed): {len(meaningful_injuries):,}")

# Build dict: player_name_norm → list of injury_dates
injury_lookup = {}
for _, row in meaningful_injuries.iterrows():
    name = row['name_norm']
    if pd.isna(row['injury_date']):
        continue
    if name not in injury_lookup:
        injury_lookup[name] = []
    injury_lookup[name].append(row['injury_date'])

print(f"Players with at least one injury: {len(injury_lookup):,}")

# ── STEP 6: FEATURE ENGINEERING ───────────────────────────────
print(f"\n{SEP}")
print(" STEP 6 — FEATURE ENGINEERING")
print(SEP)

# Sort all minutes by player and date for rolling calculations
minutes_sorted = minutes.sort_values(['name_norm', 'date']).copy()

# Pre-group by player for O(1) lookup — avoids scanning full DataFrame each call
minutes_by_player = {
    name: grp.reset_index(drop=True)
    for name, grp in minutes_sorted.groupby('name_norm')
}

def get_features(player_name_norm, match_date, current_team):
    """
    Compute all features for a player before a specific match.
    Uses ALL competition minutes (not just PL) for load features.
    """
    features = {}

    # ── Player match history ──────────────────────────────────
    _all = minutes_by_player.get(player_name_norm, pd.DataFrame(columns=minutes_sorted.columns))
    player_hist = _all[_all['date'] < match_date]

    # ── LOAD FEATURES ─────────────────────────────────────────
    # Minutes in last 7, 14, 30 days
    for days in [7, 14, 30]:
        cutoff = match_date - pd.Timedelta(days=days)
        recent = player_hist[player_hist['date'] >= cutoff]
        features[f'minutes_last_{days}d']  = recent['minutes_played'].sum()
        features[f'matches_last_{days}d']  = len(recent)

    # Minutes in last 7 days across all comps (fixture congestion)
    features['total_load_7d']  = features['minutes_last_7d']
    features['total_load_14d'] = features['minutes_last_14d']

    # Consecutive starts (last 5 matches)
    last5 = player_hist.tail(5)
    features['consecutive_starts'] = int(
        (last5['minutes_played'] >= 60).all() and len(last5) >= 3
    )

    # Days since last match
    if len(player_hist) > 0:
        last_match_date = player_hist['date'].max()
        features['days_since_last_match'] = (match_date - last_match_date).days
    else:
        features['days_since_last_match'] = 30

    # ── ACWR (Acute:Chronic Workload Ratio) ───────────────────
    # Acute = last 7 days, Chronic = 28-day weekly average
    # Risk spikes when > 1.5 (load spike) or < 0.8 (underload/rust)
    mins_28d = player_hist[
        player_hist['date'] >= match_date - pd.Timedelta(days=28)
    ]['minutes_played'].sum()
    chronic_load = mins_28d / 4  # weekly average over 4 weeks
    acute_load   = features['minutes_last_7d']
    features['acwr'] = round(acute_load / chronic_load, 3) if chronic_load > 0 else 1.0

    # ── CUMULATIVE SEASON MINUTES ─────────────────────────────
    if match_date.month >= 8:
        season_start_date = pd.Timestamp(match_date.year, 8, 1)
    else:
        season_start_date = pd.Timestamp(match_date.year - 1, 8, 1)
    season_hist = player_hist[player_hist['date'] >= season_start_date]
    features['season_minutes_so_far'] = season_hist['minutes_played'].sum()
    features['season_matches_so_far'] = len(season_hist)

    # ── SEASON-ON-SEASON MINUTES CHANGE ──────────────────────
    prev_season_start = pd.Timestamp(season_start_date.year - 1, 8, 1)
    prev_season_hist  = player_hist[
        (player_hist['date'] >= prev_season_start) &
        (player_hist['date'] <  season_start_date)
    ]
    prev_season_total   = prev_season_hist['minutes_played'].sum()
    features['prev_season_minutes'] = prev_season_total
    curr_matches = features['season_matches_so_far']
    prev_matches = len(prev_season_hist)
    curr_rate = features['season_minutes_so_far'] / curr_matches if curr_matches > 0 else 0
    prev_rate = prev_season_total / prev_matches if prev_matches > 0 else 0
    features['minutes_per_match_change'] = curr_rate - prev_rate  # positive = playing more per game

    # ── INJURY HISTORY FEATURES ───────────────────────────────
    _all_inj = inj_by_player.get(player_name_norm, pd.DataFrame(columns=meaningful_injuries.columns))
    player_injuries = _all_inj[_all_inj['injury_date'] < match_date]

    # Career injury count
    features['career_injury_count'] = len(player_injuries)

    # Injuries in last 12 months
    cutoff_12m = match_date - pd.Timedelta(days=365)
    inj_12m = player_injuries[player_injuries['injury_date'] >= cutoff_12m]
    features['injuries_last_12m'] = len(inj_12m)

    # Injuries in last 6 months
    cutoff_6m = match_date - pd.Timedelta(days=180)
    inj_6m = player_injuries[player_injuries['injury_date'] >= cutoff_6m]
    features['injuries_last_6m'] = len(inj_6m)

    # Days since last injury
    if len(player_injuries) > 0:
        last_inj = player_injuries['injury_date'].max()
        features['days_since_last_injury'] = (match_date - last_inj).days
    else:
        features['days_since_last_injury'] = 999

    # Hamstring history
    features['hamstring_history'] = int(
        (player_injuries['body_part'] == 'Hamstring').any()
    )

    # Muscle injury history
    features['muscle_injury_history'] = int(
        (player_injuries['injury_type'] == 'Muscle').any()
    )

    # Same body part injured before (most common)
    if len(player_injuries) > 0:
        body_parts = player_injuries['body_part'].value_counts()
        features['recurring_body_part'] = int(
            len(body_parts) > 0 and body_parts.iloc[0] > 1
        )
    else:
        features['recurring_body_part'] = 0

    # Returned from long injury recently (60+ days)
    cutoff_90d = match_date - pd.Timedelta(days=90)
    recent_long = player_injuries[
        (player_injuries['injury_date'] >= cutoff_90d) &
        (player_injuries['days_out'].fillna(0) >= 60)
    ]
    features['returned_from_long_injury'] = int(len(recent_long) > 0)

    # Average severity of past injuries
    if len(player_injuries) > 0 and player_injuries['days_out'].notna().any():
        features['avg_injury_severity'] = player_injuries['days_out'].mean()
        features['max_injury_severity'] = player_injuries['days_out'].max()
    else:
        features['avg_injury_severity'] = 0
        features['max_injury_severity'] = 0

    # ── SOFT TISSUE INJURY COUNT ──────────────────────────────
    # Muscle/tendon/ligament injuries recur at 2-3x the rate of structural ones
    soft_tissue = player_injuries[
        player_injuries['injury_type'].isin(SOFT_TISSUE_TYPES) |
        player_injuries['body_part'].isin(SOFT_TISSUE_PARTS)
    ]
    features['soft_tissue_injury_count'] = len(soft_tissue)
    features['soft_tissue_last_12m']     = len(
        soft_tissue[soft_tissue['injury_date'] >= cutoff_12m]
    )

    # ── FIXTURE CONGESTION FEATURES ───────────────────────────
    # Days between last two matches
    if len(player_hist) >= 2:
        last_dates = player_hist['date'].sort_values().tail(2).values
        features['days_between_last_2'] = (
            pd.Timestamp(last_dates[-1]) - pd.Timestamp(last_dates[-2])
        ).days
    else:
        features['days_between_last_2'] = 7

    features['congestion_flag'] = int(
        features['days_between_last_2'] < 4)

    # 3 matches in last 10 days
    last10 = player_hist[
        player_hist['date'] >= match_date - pd.Timedelta(days=10)]
    features['triple_fixture_flag'] = int(len(last10) >= 3)

    # European fixture in last 4 days
    europe = ['Champions League', 'Europa League', 'Conference League']
    recent_europe = player_hist[
        (player_hist['date'] >= match_date - pd.Timedelta(days=4)) &
        (player_hist['competition'].isin(europe))
    ]
    features['played_europe_this_week'] = int(len(recent_europe) > 0)

    # ── INTERNATIONAL BREAK (pre-computed) ───────────────────
    bf = break_features_cache.get(match_date, {})
    features['days_since_intl_break'] = bf.get('days_since_intl_break', 999)
    features['is_intl_break_week']    = bf.get('is_intl_break_week', 0)

    # ── SEASON STAGE ──────────────────────────────────────────
    features['month']                = match_date.month
    features['is_congestion_period'] = int(match_date.month in [11, 12, 1])
    features['is_early_season']      = int(match_date.month in [8, 9])

    # ── MINUTES SPIKE ─────────────────────────────────────────
    avg_per_match = player_hist.tail(10)['minutes_played'].mean()
    features['minutes_spike'] = (
        features['minutes_last_7d'] - avg_per_match
        if pd.notna(avg_per_match) and avg_per_match > 0 else 0
    )

    # ── ACTIVE INJURY ─────────────────────────────────────────
    p_inj = inj_by_player.get(player_name_norm, pd.DataFrame())
    if len(p_inj) > 0:
        active = p_inj[
            (p_inj['injury_date'] <= match_date) &
            (p_inj['return_date'].fillna(pd.Timestamp('2099-01-01')) >= match_date)
        ]
        features['currently_injured'] = int(len(active) > 0)
        past = p_inj[p_inj['return_date'].fillna(pd.NaT) < match_date]
        if len(past) > 0:
            features['days_since_return'] = (
                match_date - past['return_date'].max()).days
        else:
            features['days_since_return'] = 999
    else:
        features['currently_injured']  = 0
        features['days_since_return']  = 999

    # ── FBREF PHYSICAL INTENSITY (previous season per-90 rates) ─
    if match_date.month >= 8:
        _curr_sy = match_date.year
    else:
        _curr_sy = match_date.year - 1
    _fbref = fbref_lookup.get((player_name_norm, _curr_sy - 1)) \
          or fbref_lookup.get((player_name_norm, _curr_sy)) \
          or _NAN_FBREF
    features.update(_fbref)

    # ── FPL API (2024-25) ─────────────────────────────────────
    fpl_row = fpl_api_lookup.get(player_name_norm)
    if fpl_row is not None and match_date.year >= 2024:
        features['chance_of_playing']  = fpl_row.get('chance_of_playing_next_round', 100) or 100
        features['fpl_status_injured'] = int(str(fpl_row.get('status','a')) in ['i','u'])
        features['fpl_status_doubtful']= int(str(fpl_row.get('status','a')) == 'd')
    else:
        features['chance_of_playing']  = 100
        features['fpl_status_injured'] = 0
        features['fpl_status_doubtful']= 0

    # ── MATCH METADATA (pre-computed) ─────────────────────────
    meta = match_meta.get((player_name_norm, match_date), {})
    features['opponent_strength'] = meta.get('opponent_strength', 1500)
    features['elo_diff']          = meta.get('elo_diff', 0)
    features['is_home']           = meta.get('is_home', 0)

    # ── FPL xGC (pre-computed) ────────────────────────────────
    features['fpl_xgc'] = fpl_xgc_lookup.get(
        (player_name_norm, match_date.date()), 1.0)

    return features

# ── Build player profile lookup ────────────────────────────────
# Build a fast lookup dict: name_norm → {season_year: row}
players_lookup = {}
for _, row in players.iterrows():
    name = row['name_norm']
    yr   = row['season_year']
    if name not in players_lookup:
        players_lookup[name] = {}
    players_lookup[name][yr] = row

def get_player_profile(player_name_norm, match_date):
    """
    Get age, market value, value trend and position for a player.
    Uses exact season value rather than closest approximation.
    """
    match_year = match_date.year
    # Season start year: Aug-Dec = current year, Jan-Jul = previous year
    if match_date.month >= 8:
        season_year = match_year
    else:
        season_year = match_year - 1

    player_seasons = players_lookup.get(player_name_norm, {})

    if not player_seasons:
        return {
            'age': np.nan,
            'market_value_m': np.nan,
            'market_value_prev_m': np.nan,
            'value_change_m': np.nan,
            'value_pct_change': np.nan,
            'position_group': 'Unknown',
            'age_vs_peak': np.nan,
            'years_past_peak': 0,
            'is_past_peak': 0,
            'is_veteran': 0,
        }

    # Get exact season row, fallback to closest
    if season_year in player_seasons:
        current_row = player_seasons[season_year]
    else:
        closest_yr = min(player_seasons.keys(),
                         key=lambda y: abs(y - season_year))
        current_row = player_seasons[closest_yr]

    # Previous season value
    prev_season_year = season_year - 1
    if prev_season_year in player_seasons:
        prev_row = player_seasons[prev_season_year]
        prev_value = prev_row['market_value_m']
    else:
        prev_value = np.nan

    current_value = current_row['market_value_m']

    # Value change features
    if pd.notna(current_value) and pd.notna(prev_value) and prev_value > 0:
        value_change  = current_value - prev_value
        value_pct     = value_change / prev_value  # negative = decline
    else:
        value_change  = np.nan
        value_pct     = np.nan

    # Age from DOB
    if pd.notna(current_row['date_of_birth']):
        age = (match_date - current_row['date_of_birth']).days / 365.25
    else:
        age = np.nan

    # Position group
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

    # Aging curve relative to empirical peak injury age per position
    peak_age = POSITION_PEAK_AGE[pos_group]
    if pd.notna(age):
        age_vs_peak     = round(age - peak_age, 1)
        years_past_peak = max(0.0, age_vs_peak)
        is_past_peak    = int(age_vs_peak > 0)
        is_veteran      = int(age >= 32)
    else:
        age_vs_peak     = np.nan
        years_past_peak = 0
        is_past_peak    = 0
        is_veteran      = 0

    return {
        'age':                 round(age, 1) if pd.notna(age) else np.nan,
        'market_value_m':      current_value,
        'market_value_prev_m': prev_value,
        'value_change_m':      value_change,
        'value_pct_change':    value_pct,
        'position_group':      pos_group,
        'age_vs_peak':         age_vs_peak,
        'years_past_peak':     years_past_peak,
        'is_past_peak':        is_past_peak,
        'is_veteran':          is_veteran,
    }

# ── STEP 7: BUILD DATASET ─────────────────────────────────────
print(f"\n{SEP}")
print(" STEP 7 — BUILDING DATASET (this takes a few minutes...)")
print(SEP)

# Use PL matches from 2017-18 onwards (where we have good data coverage)
pl_matches = pl_minutes[
    pl_minutes['season'].isin([
        '2015-2016', '2016-2017',
        '2017-2018', '2018-2019', '2019-2020', '2020-2021',
        '2021-2022', '2022-2023', '2023-2024', '2024-2025'
    ])
].copy()

# Get unique player-match combinations
pl_matches_unique = pl_matches[
    ['match_url', 'date', 'name_norm', 'player_name',
     'team', 'season', 'minutes_played',
     'side', 'home_team', 'away_team']
].drop_duplicates(subset=['match_url', 'name_norm'])

# ── PRE-COMPUTE ELO RATINGS ───────────────────────────────────
print("Computing Elo ratings from match history...")
match_info = pl_minutes[['match_url','date','home_team','away_team',
                          'home_goals','away_goals']].drop_duplicates('match_url').copy()
match_info = match_info.sort_values('date').reset_index(drop=True)

# Elo parameters
ELO_K        = 20    # update rate
ELO_START    = 1500  # starting rating
HOME_ADV     = 60    # home advantage in Elo points

# Initialise all teams at 1500
elo_ratings = {}
# (team, date) → Elo before that match
elo_history = {}  # (team, match_date) → elo

for _, match in match_info.iterrows():
    home = match['home_team']
    away = match['away_team']
    date = match['date']

    r_home = elo_ratings.get(home, ELO_START)
    r_away = elo_ratings.get(away, ELO_START)

    # Store pre-match Elo
    elo_history[(home, date)] = r_home
    elo_history[(away, date)] = r_away

    # Expected score
    exp_home = 1 / (1 + 10 ** ((r_away - r_home - HOME_ADV) / 400))
    exp_away = 1 - exp_home

    # Actual score from goals
    hg = match['home_goals'] if pd.notna(match['home_goals']) else 0
    ag = match['away_goals'] if pd.notna(match['away_goals']) else 0

    if hg > ag:
        s_home, s_away = 1.0, 0.0
    elif hg < ag:
        s_home, s_away = 0.0, 1.0
    else:
        s_home, s_away = 0.5, 0.5

    # Goal difference multiplier
    gd = abs(hg - ag)
    k_mult = 1.0 if gd <= 1 else (1.5 if gd == 2 else 1.75)

    elo_ratings[home] = r_home + ELO_K * k_mult * (s_home - exp_home)
    elo_ratings[away] = r_away + ELO_K * k_mult * (s_away - exp_away)

print(f"Elo computed for {len(elo_ratings)} teams")
top5 = sorted(elo_ratings.items(), key=lambda x: x[1], reverse=True)[:5]
print(f"Top 5: {[(t, round(e)) for t,e in top5]}")

# Build match metadata with Elo
print("Pre-computing match metadata...")
match_meta = {}
for _, row in pl_matches_unique.iterrows():
    key = (row['name_norm'], row['date'])
    if row['side'] == 'home':
        opp      = row['away_team']
        own_team = row['home_team']
        is_home  = 1
    else:
        opp      = row['home_team']
        own_team = row['away_team']
        is_home  = 0

    opp_elo  = elo_history.get((opp, row['date']),
               elo_ratings.get(opp, ELO_START))
    own_elo  = elo_history.get((own_team, row['date']),
               elo_ratings.get(own_team, ELO_START))

    match_meta[key] = {
        'opponent':          opp,
        'is_home':           is_home,
        'opponent_strength': opp_elo,           # Elo of opponent
        'elo_diff':          own_elo - opp_elo, # positive = stronger team
    }

# Pre-compute international break features per date
print("Pre-computing break features...")
all_dates_in_data = pl_matches_unique['date'].unique()
break_features_cache = {}
sorted_break_dates = sorted(break_dates)
for d in all_dates_in_data:
    past_breaks = [b for b in sorted_break_dates if b < d.date()]
    if past_breaks:
        days_since = (d.date() - past_breaks[-1]).days
    else:
        days_since = 999
    break_features_cache[d] = {
        'days_since_intl_break': days_since,
        'is_intl_break_week': int(days_since <= 7)
    }

print("Pre-computation done!")

# Pre-compute FPL xGC lookup: (name_norm, date) → xgc
print("Pre-computing FPL xGC lookup...")
fpl_xgc_lookup = {}
for _, row in fpl.iterrows():
    if pd.notna(row['match_date']) and pd.notna(
            row.get('expected_goals_conceded')):
        key = (row['name_norm'], row['match_date'].date())
        fpl_xgc_lookup[key] = float(row['expected_goals_conceded'])

print("All pre-computation complete!\n")

# Pre-group injuries by player for fast lookup
inj_by_player = {
    name: grp for name, grp in meaningful_injuries.groupby('name_norm')
}

# Build feature rows
all_rows = []
total = len(pl_matches_unique)

for i, (_, row) in enumerate(pl_matches_unique.iterrows()):
    if i % 5000 == 0:
        print(f"  Processing {i:,}/{total:,} ({i/total*100:.0f}%)...")

    name_norm  = row['name_norm']
    match_date = row['date']
    team       = row['team']

    # Get features
    feat = get_features(name_norm, match_date, team)

    # Get player profile
    profile = get_player_profile(name_norm, match_date)
    feat.update(profile)

    # Create label: injury in next 14 days (games_missed >= 1)
    window_end = match_date + pd.Timedelta(days=14)
    player_inj = meaningful_injuries[
        (meaningful_injuries['name_norm'] == name_norm) &
        (meaningful_injuries['injury_date'] > match_date) &
        (meaningful_injuries['injury_date'] <= window_end)
    ]
    label = int(len(player_inj) > 0)

    feat['label']        = label
    feat['player_name']  = row['player_name']
    feat['team']         = team
    feat['season']       = row['season']
    feat['match_date']   = match_date
    feat['minutes_played_this_match'] = row['minutes_played']

    all_rows.append(feat)

df = pd.DataFrame(all_rows)
print(f"\nDataset built: {len(df):,} rows")
print(f"Positive class (injured): {df['label'].sum():,} ({df['label'].mean()*100:.1f}%)")
print(f"Negative class (not injured): {(df['label']==0).sum():,} ({(df['label']==0).mean()*100:.1f}%)")

# ── EMPIRICAL PEAK AGE DIAGNOSTIC ─────────────────────────────
print(f"\n{SEP}")
print(" EMPIRICAL PEAK AGE BY POSITION (from this dataset)")
print(SEP)

# Debug: show position_group distribution to catch mapping issues
print("  Position group counts in dataset:")
print(df['position_group'].value_counts().to_string())
print()

_MIN_SAMPLES_PER_BIN = 100   # age bins with fewer rows are excluded (noise)
print(f"  {'Pos':<6} {'Empirical peak':>14}  {'Hardcoded':>10}  {'Match?':>8}  {'Bins used':>10}")
print(f"  {'-'*56}")
_age_diag = df[df['age'].notna() & df['position_group'].notna()].copy()
_age_diag['age_bin'] = _age_diag['age'].round(0).astype(int)
_empirical_peaks = {}
for _pos in ['GK', 'DF', 'MF', 'FW']:
    _pos_data = _age_diag[
        (_age_diag['position_group'] == _pos) &
        (_age_diag['age_bin'] >= 17) &
        (_age_diag['age_bin'] <= 40)
    ]
    if len(_pos_data) == 0:
        print(f"  {_pos:<6} {'NO DATA — check position mapping':>44}")
        continue
    # Only keep age bins with enough samples to be reliable
    _counts = _pos_data.groupby('age_bin')['label'].count()
    _valid_bins = _counts[_counts >= _MIN_SAMPLES_PER_BIN].index
    _pos_data_filtered = _pos_data[_pos_data['age_bin'].isin(_valid_bins)]
    if len(_pos_data_filtered) == 0:
        print(f"  {_pos:<6} {'NO BINS with 100+ samples':>44}")
        continue
    _rates = (_pos_data_filtered.groupby('age_bin')['label']
                                .mean()
                                .rolling(3, center=True, min_periods=1)
                                .mean())
    _peak = int(_rates.idxmax())
    _empirical_peaks[_pos] = _peak
    _hardcoded = POSITION_PEAK_AGE[_pos]
    _match = "OK" if abs(_peak - _hardcoded) <= 1 else "UPDATE"
    print(f"  {_pos:<6} {_peak:>14}  {_hardcoded:>10}  {_match:>8}  {len(_valid_bins):>10}")
print(f"\n  NOTE: If 'UPDATE' appears, consider changing POSITION_PEAK_AGE")
print(f"        at the top of this script to the empirical values above.")

# is_high_injury_age removed until empirical peak ages are validated
# ─────────────────────────────────────────────────────────────

# ── STEP 8: PREPARE FEATURES ──────────────────────────────────
print(f"\n{SEP}")
print(" STEP 8 — PREPARING FEATURES")
print(SEP)

FEATURE_COLS = [
    # Load features
    'minutes_last_7d', 'minutes_last_14d', 'minutes_last_30d',
    'matches_last_7d', 'matches_last_14d', 'matches_last_30d',
    'total_load_7d', 'total_load_14d',
    'consecutive_starts', 'days_since_last_match',
    # Congestion features
    'days_between_last_2', 'congestion_flag',
    'triple_fixture_flag', 'played_europe_this_week',
    # International break
    'days_since_intl_break', 'is_intl_break_week',
    # Season stage
    'month', 'is_congestion_period', 'is_early_season',
    # Workload spike
    'minutes_spike',
    # ACWR
    'acwr',
    # Cumulative season load
    'season_minutes_so_far', 'season_matches_so_far',
    'prev_season_minutes', 'minutes_per_match_change',
    # Injury history
    'career_injury_count', 'injuries_last_12m', 'injuries_last_6m',
    'days_since_last_injury', 'hamstring_history', 'muscle_injury_history',
    'recurring_body_part', 'returned_from_long_injury',
    'avg_injury_severity', 'max_injury_severity',
    # Soft tissue
    'soft_tissue_injury_count', 'soft_tissue_last_12m',
    # Active injury
    'currently_injured', 'days_since_return',
    # FPL signals
    'chance_of_playing', 'fpl_status_injured', 'fpl_status_doubtful',
    # Player profile
    'age', 'market_value_m', 'market_value_prev_m',
    'value_change_m', 'value_pct_change',
    # Aging curve (empirical peak ages: GK=32, DF=35, MF=30, FW=31)
    'age_vs_peak', 'years_past_peak', 'is_past_peak', 'is_veteran',
    # Match difficulty
    'opponent_strength', 'is_home', 'fpl_xgc',
    # FBref physical intensity (previous season per-90 rates)
    *FBREF_INTENSITY_COLS,
]

# Position encoding
df['pos_GK'] = (df['position_group'] == 'GK').astype(int)
df['pos_DF'] = (df['position_group'] == 'DF').astype(int)
df['pos_MF'] = (df['position_group'] == 'MF').astype(int)
df['pos_FW'] = (df['position_group'] == 'FW').astype(int)

FEATURE_COLS += ['pos_GK', 'pos_DF', 'pos_MF', 'pos_FW']

# Fill missing values
for col in FEATURE_COLS:
    if col in df.columns:
        df[col] = df[col].fillna(df[col].median())

print(f"Features: {len(FEATURE_COLS)}")
print(f"Feature list: {FEATURE_COLS}")

# ── STEP 9: TIME-SERIES CROSS VALIDATION ──────────────────────
print(f"\n{SEP}")
print(" STEP 9 — TIME-SERIES CROSS VALIDATION")
print(SEP)

cv_folds = [
    # (train seasons, val season, test season) — 5 expanding windows
    (['2015-2016', '2016-2017', '2017-2018', '2018-2019'],
     '2019-2020', '2020-2021'),
    (['2015-2016', '2016-2017', '2017-2018', '2018-2019', '2019-2020'],
     '2020-2021', '2021-2022'),
    (['2015-2016', '2016-2017', '2017-2018', '2018-2019', '2019-2020', '2020-2021'],
     '2021-2022', '2022-2023'),
    (['2015-2016', '2016-2017', '2017-2018', '2018-2019', '2019-2020',
      '2020-2021', '2021-2022'],
     '2022-2023', '2023-2024'),
    (['2015-2016', '2016-2017', '2017-2018', '2018-2019', '2019-2020',
      '2020-2021', '2021-2022', '2022-2023'],
     '2023-2024', '2024-2025'),
]

cv_results = []

for fold_num, (train_seasons, val_season, test_season) in enumerate(cv_folds, 1):
    train = df[df['season'].isin(train_seasons)]
    val   = df[df['season'] == val_season]
    test  = df[df['season'] == test_season]

    X_train = train[FEATURE_COLS].fillna(0)
    y_train = train['label']
    X_val   = val[FEATURE_COLS].fillna(0)
    y_val   = val['label']
    X_test  = test[FEATURE_COLS].fillna(0)
    y_test  = test['label']

    neg = (y_train == 0).sum()
    pos = (y_train == 1).sum()
    scale_pos = min(neg / pos, 10)

    print(f"\nFold {fold_num}:")
    print(f"  Train: {len(X_train):,} rows "
          f"(pos: {pos:,}, neg: {neg:,}, scale_pos_weight: {scale_pos:.1f})")
    print(f"  Val  : {val_season} → {len(X_val):,} rows")
    print(f"  Test : {test_season} → {len(X_test):,} rows")

    model = XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=10,
        reg_alpha=0.1,
        reg_lambda=2.0,
        scale_pos_weight=scale_pos,
        random_state=42,
        verbosity=0,
        use_label_encoder=False,
        eval_metric='auc'
    )

    model.fit(X_train, y_train,
              eval_set=[(X_val, y_val)],
              verbose=False)

    # Threshold: maximise G-mean (consistent with Optuna objective)
    val_proba = model.predict_proba(X_val)[:, 1]
    best_gm_thresh, best_thresh = 0.0, 0.5
    for t in np.arange(0.1, 0.9, 0.02):
        y_pred_t = (val_proba >= t).astype(int)
        cm_t = confusion_matrix(y_val, y_pred_t)
        tn_t, fp_t = cm_t[0, 0], cm_t[0, 1]
        fn_t, tp_t = cm_t[1, 0], cm_t[1, 1]
        sens_t = tp_t / (tp_t + fn_t) if (tp_t + fn_t) > 0 else 0.0
        spec_t = tn_t / (tn_t + fp_t) if (tn_t + fp_t) > 0 else 0.0
        gm_t   = (sens_t * spec_t) ** 0.5
        if gm_t > best_gm_thresh:
            best_gm_thresh = gm_t
            best_thresh    = t
    print(f"  Optimal threshold (val): {best_thresh:.2f} (G-mean={best_gm_thresh:.3f})")

    # Evaluate
    for split_name, X_eval, y_eval in [
        ('Val', X_val, y_val),
        ('Test', X_test, y_test)
    ]:
        y_pred_proba = model.predict_proba(X_eval)[:, 1]
        y_pred = (y_pred_proba >= best_thresh).astype(int)

        auc  = roc_auc_score(y_eval, y_pred_proba)
        f1   = f1_score(y_eval, y_pred, zero_division=0)
        prec = precision_score(y_eval, y_pred, zero_division=0)
        rec  = recall_score(y_eval, y_pred, zero_division=0)
        acc  = accuracy_score(y_eval, y_pred)
        cm_  = confusion_matrix(y_eval, y_pred)
        tn_, fp_ = cm_[0, 0], cm_[0, 1]
        spec = tn_ / (tn_ + fp_) if (tn_ + fp_) > 0 else 0.0
        gmean = (rec * spec) ** 0.5

        print(f"\n  {split_name} Results (threshold={best_thresh:.2f}):")
        print(f"    AUC-ROC     : {auc:.3f}")
        print(f"    Accuracy    : {acc:.3f}")
        print(f"    F1 Score    : {f1:.3f}")
        print(f"    Precision   : {prec:.3f}")
        print(f"    Sensitivity : {rec:.3f}")
        print(f"    Specificity : {spec:.3f}")
        print(f"    G-mean      : {gmean:.3f}")

        cv_results.append({
            'fold': fold_num,
            'split': split_name,
            'threshold': best_thresh,
            'train_seasons': str(train_seasons),
            'eval_season': val_season if split_name == 'Val' else test_season,
            'auc': auc, 'f1': f1,
            'precision': prec, 'recall': rec, 'accuracy': acc,
            'gmean': gmean, 'specificity': spec,
        })

# ── CV SUMMARY — AVERAGE ACROSS ALL 5 WINDOWS ────────────────
print(f"\n{SEP}")
print(" CV SUMMARY — TEST AVERAGES ACROSS 5 WINDOWS")
print(SEP)
_test_res = [r for r in cv_results if r['split'] == 'Test']
for _m in ['auc', 'recall', 'specificity', 'gmean', 'f1', 'precision']:
    _vals = [r[_m] for r in _test_res]
    print(f"  {_m:<12}: {np.mean(_vals):.3f}  ±  {np.std(_vals):.3f}")

# ── STEP 9.5: HYPERPARAMETER TUNING (Optuna) ──────────────────
import optuna
optuna.logging.set_verbosity(optuna.logging.WARNING)

print(f"\n{SEP}")
print(" STEP 9.5 — HYPERPARAMETER TUNING (60 trials, avg G-mean over 3 val windows)")
print(SEP)

# Pre-build 3 train/val folds for Optuna (windows 3-5 — most data-rich)
_optuna_fold_defs = [
    (['2015-2016','2016-2017','2017-2018','2018-2019','2019-2020','2020-2021'],
     '2021-2022'),
    (['2015-2016','2016-2017','2017-2018','2018-2019','2019-2020','2020-2021','2021-2022'],
     '2022-2023'),
    (['2015-2016','2016-2017','2017-2018','2018-2019','2019-2020','2020-2021','2021-2022','2022-2023'],
     '2023-2024'),
]
_optuna_folds = []
for _tr_s, _vl_s in _optuna_fold_defs:
    _tr = df[df['season'].isin(_tr_s)]
    _vl = df[df['season'] == _vl_s]
    _neg = (_tr['label'] == 0).sum()
    _pos = (_tr['label'] == 1).sum()
    _spw = min(_neg / _pos, 10)
    _optuna_folds.append((
        _tr[FEATURE_COLS].values, _tr['label'].values,
        _vl[FEATURE_COLS].values, _vl['label'].values,
        _spw,
    ))
print(f"Optuna folds: val years = {[d[1] for d in _optuna_fold_defs]}")

def _objective(trial):
    base_params = dict(
        n_estimators      = trial.suggest_int('n_estimators', 100, 500, step=50),
        max_depth         = trial.suggest_int('max_depth', 3, 5),
        learning_rate     = trial.suggest_float('learning_rate', 0.01, 0.10, log=True),
        subsample         = trial.suggest_float('subsample', 0.6, 0.95),
        colsample_bytree  = trial.suggest_float('colsample_bytree', 0.6, 0.90),
        min_child_weight  = trial.suggest_int('min_child_weight', 15, 60),
        reg_alpha         = trial.suggest_float('reg_alpha', 0.3, 2.0),
        reg_lambda        = trial.suggest_float('reg_lambda', 1.0, 5.0),
        random_state      = 42,
        verbosity         = 0,
        use_label_encoder = False,
        eval_metric       = 'auc',
    )
    gm_scores = []
    for _Xtr, _ytr, _Xvl, _yvl, _spw in _optuna_folds:
        m = XGBClassifier(**base_params, scale_pos_weight=_spw)
        m.fit(_Xtr, _ytr, eval_set=[(_Xvl, _yvl)], verbose=False)
        proba = m.predict_proba(_Xvl)[:, 1]
        best_gm = 0.0
        for t in np.arange(0.1, 0.9, 0.02):
            y_p = (proba >= t).astype(int)
            cm_ = confusion_matrix(_yvl, y_p)
            tn_, fp_ = cm_[0, 0], cm_[0, 1]
            fn_, tp_ = cm_[1, 0], cm_[1, 1]
            sens = tp_ / (tp_ + fn_) if (tp_ + fn_) > 0 else 0.0
            spec = tn_ / (tn_ + fp_) if (tn_ + fp_) > 0 else 0.0
            gm   = (sens * spec) ** 0.5
            if gm > best_gm:
                best_gm = gm
        gm_scores.append(best_gm)
    return float(np.mean(gm_scores))

study = optuna.create_study(direction='maximize',
                             sampler=optuna.samplers.TPESampler(seed=42))

# Seed from previously known-good params so TPE explores the right region first
study.enqueue_trial({
    'n_estimators': 250, 'max_depth': 5,
    'learning_rate': 0.028, 'subsample': 0.876,
    'colsample_bytree': 0.816, 'min_child_weight': 31,
    'reg_alpha': 0.786, 'reg_lambda': 1.731,
})

study.optimize(_objective, n_trials=60, show_progress_bar=False)

best_params = study.best_params
print(f"Best avg G-mean (3 val windows): {study.best_value:.4f}")
print(f"Best params: {best_params}")

# ── STEP 10: FINAL MODEL (ALL DATA EXCEPT 2024-25) ────────────
print(f"\n{SEP}")
print(" STEP 10 — FINAL MODEL")
print(SEP)

train_final = df[~df['season'].isin(['2023-2024', '2024-2025'])]
val_final   = df[df['season'] == '2023-2024']   # true holdout for threshold tuning
test_final  = df[df['season'] == '2024-2025']

X_train_f = train_final[FEATURE_COLS]
y_train_f = train_final['label']
X_val_final = val_final[FEATURE_COLS]
y_val_final = val_final['label']
X_test_f  = test_final[FEATURE_COLS]
y_test_f  = test_final['label']

neg_f = (y_train_f == 0).sum()
pos_f = (y_train_f == 1).sum()
scale_f = min(neg_f / pos_f, 10)

print(f"Final train: {len(X_train_f):,} rows (scale_pos_weight={scale_f:.1f})")
print(f"Final val  : {len(X_val_final):,} rows (2023-24, threshold tuning)")
print(f"Final test : {len(X_test_f):,} rows (2024-25)")

final_model = XGBClassifier(
    **{k: v for k, v in best_params.items()},
    scale_pos_weight  = scale_f,
    random_state      = 42,
    verbosity         = 0,
    use_label_encoder = False,
    eval_metric       = 'auc',
)

final_model.fit(X_train_f.fillna(0), y_train_f,
                eval_set=[(X_val_final.fillna(0), y_val_final)],
                verbose=False)

def calibrated_predict_proba(X):
    return final_model.predict_proba(X)[:, 1]

# Threshold: maximise G-mean (consistent with Optuna objective)
val_proba_f = calibrated_predict_proba(X_val_final.fillna(0))
best_gm_f, best_thresh_f = 0.0, 0.5
for t in np.arange(0.1, 0.9, 0.02):
    y_pred_t = (val_proba_f >= t).astype(int)
    cm_t = confusion_matrix(y_val_final, y_pred_t)
    tn_t, fp_t = cm_t[0, 0], cm_t[0, 1]
    fn_t, tp_t = cm_t[1, 0], cm_t[1, 1]
    sens_t = tp_t / (tp_t + fn_t) if (tp_t + fn_t) > 0 else 0.0
    spec_t = tn_t / (tn_t + fp_t) if (tn_t + fp_t) > 0 else 0.0
    gm_t   = (sens_t * spec_t) ** 0.5
    if gm_t > best_gm_f:
        best_gm_f     = gm_t
        best_thresh_f = t
print(f"Optimal threshold: {best_thresh_f:.2f} (val G-mean={best_gm_f:.3f})")

y_pred_proba_f = calibrated_predict_proba(X_test_f.fillna(0))
y_pred_f       = (y_pred_proba_f >= best_thresh_f).astype(int)

auc_f  = roc_auc_score(y_test_f, y_pred_proba_f)
f1_f   = f1_score(y_test_f, y_pred_f, zero_division=0)
prec_f = precision_score(y_test_f, y_pred_f, zero_division=0)
rec_f  = recall_score(y_test_f, y_pred_f, zero_division=0)
acc_f  = accuracy_score(y_test_f, y_pred_f)

cm = confusion_matrix(y_test_f, y_pred_f)
tn_f, fp_f = cm[0, 0], cm[0, 1]
spec_f  = tn_f / (tn_f + fp_f) if (tn_f + fp_f) > 0 else 0.0
gmean_f = (rec_f * spec_f) ** 0.5

print(f"\nFinal Model — Test on 2024-25:")
print(f"  AUC-ROC     : {auc_f:.3f}")
print(f"  Accuracy    : {acc_f:.3f}")
print(f"  F1 Score    : {f1_f:.3f}")
print(f"  Precision   : {prec_f:.3f}")
print(f"  Sensitivity : {rec_f:.3f}")
print(f"  Specificity : {spec_f:.3f}")
print(f"  G-mean      : {gmean_f:.3f}")

print(f"\nConfusion Matrix:")
print(f"  TN={cm[0,0]:,}  FP={cm[0,1]:,}")
print(f"  FN={cm[1,0]:,}  TP={cm[1,1]:,}")

# ── STEP 11: FEATURE IMPORTANCE ───────────────────────────────
print(f"\n{SEP}")
print(" STEP 11 — FEATURE IMPORTANCE")
print(SEP)

importances = pd.DataFrame({
    'feature': FEATURE_COLS,
    'importance': final_model.feature_importances_
}).sort_values('importance', ascending=False)

print(importances.head(15).to_string(index=False))

# ── STEP 12: SUMMARY ──────────────────────────────────────────
print(f"\n{SEP}")
print(" SUMMARY — COMPARISON VS PUBLISHED RESEARCH")
print(SEP)

# AUC is the primary metric for imbalanced classification
# F1 is misleading when positive class is only 2.5%
# Report AUC as headline metric, use risk tiers for practical output

print(f"\n{'Metric':<20} {'Our Model':>12} {'Non-GPS Football':>20}")
print("-" * 55)
print(f"{'AUC-ROC':<20} {auc_f:>12.3f} {'0.62 - 0.70':>20}")
print(f"{'Sensitivity':<20} {rec_f:>12.3f} {'0.55 - 0.78':>20}")
print(f"{'Specificity':<20} {spec_f:>12.3f} {'0.65 - 0.85':>20}")
print(f"{'G-mean':<20} {gmean_f:>12.3f} {'0.60 - 0.72':>20}")
print(f"{'Positive rate':<20} {'~4.8%':>12} {'varies':>20}")
print(f"{'Window':<20} {'14 days':>12} {'7-14 days':>20}")
print(f"{'Note':<20} {'no GPS data':>12}")

# Risk tier output — more useful than binary classification
print(f"\n{SEP}")
print(" RISK TIER ANALYSIS (2024-25)")
print(SEP)

test_out = test_final.copy()
test_out['injury_probability'] = y_pred_proba_f
test_out['actual_injured']     = y_test_f.values

# Define risk tiers — calibrated to actual 4.8% positive rate
# Two-tier risk system — top 15% = High Risk, rest = Low Risk
p85 = np.percentile(y_pred_proba_f, 85)
print(f"Risk threshold: {p85:.3f} (top 15% = High Risk)")

test_out['risk_tier'] = np.where(
    test_out['injury_probability'] >= p85, 'High Risk', 'Low Risk'
)

for tier in ['Low Risk', 'High Risk']:
    tier_data = test_out[test_out['risk_tier'] == tier]
    if len(tier_data) == 0:
        continue
    actual_inj_rate = tier_data['actual_injured'].mean() * 100
    count = len(tier_data)
    injuries = tier_data['actual_injured'].sum()
    print(f"\n{tier}:")
    print(f"  Players in tier     : {count:,}")
    print(f"  Actual injury rate  : {actual_inj_rate:.1f}%")
    print(f"  Actual injuries     : {injuries}")

print(f"\nBaseline injury rate (all players): "
      f"{test_out['actual_injured'].mean()*100:.1f}%")
print(f"\nIf risk tiers show increasing injury rates → model has real discriminative power")

# Save predictions
test_final_out = test_final.copy()
test_final_out['injury_probability'] = y_pred_proba_f
test_final_out['predicted_high_risk'] = y_pred_f
test_final_out['actual_injured'] = y_test_f.values
test_final_out.to_csv(OUTPUT_FILE, index=False)
print(f"\nPredictions saved to: {OUTPUT_FILE}")