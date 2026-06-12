import os

# ── FILE PATHS ─────────────────────────────────────────────────
# Main data loaded from DynamoDB — see db.py
# FBref data still loaded from local CSV files (not in database)
OUTPUT_FILE = r'C:\Users\DELL\Documents\data\injury_predictions.csv'
FBREF_DIR   = r'C:\Users\DELL\Documents\player_ratings'

# ── MODEL CONSTANTS ────────────────────────────────────────────
MIN_PRECISION = 0.12

# ── ELO PARAMETERS ────────────────────────────────────────────
ELO_K     = 20
ELO_START = 1500
HOME_ADV  = 60

# ── EWMA PARAMETERS (Murray et al. 2017) ──────────────────────
LAMBDA_ACUTE   = 2 / (7 + 1)
LAMBDA_CHRONIC = 2 / (28 + 1)

# ── POSITION PEAK INJURY AGE (empirically derived) ────────────
POSITION_PEAK_AGE = {
    'GK':      32,
    'DF':      35,
    'MF':      30,
    'FW':      31,
    'Unknown': 31,
}

# ── INJURY CLASSIFICATION ──────────────────────────────────────
SOFT_TISSUE_TYPES = {'Muscle', 'Tendon', 'Ligament'}
SOFT_TISSUE_PARTS = {'Hamstring', 'Thigh', 'Calf', 'Groin', 'Adductor', 'Quadriceps', 'Quad'}

# ── FBREF INTENSITY COLUMNS ────────────────────────────────────
FBREF_INTENSITY_COLS = [
    'carry_dist_p90', 'prog_carry_dist_p90', 'carries_p90',
    'aerials_p90', 'tackles_p90', 'fouls_p90',
]

# ── FEATURE COLUMNS ────────────────────────────────────────────
FEATURE_COLS = [
    # Load
    'minutes_last_7d', 'minutes_last_14d', 'minutes_last_30d',
    'minutes_last_42d', 'minutes_last_56d',
    'matches_last_7d', 'matches_last_14d', 'matches_last_30d',
    'matches_last_42d', 'matches_last_56d',
    'total_load_7d', 'total_load_14d',
    'consecutive_starts', 'days_since_last_match',
    # Congestion
    'days_between_last_2', 'congestion_flag',
    'triple_fixture_flag', 'played_europe_this_week',
    'avg_recovery_days',
    # International break
    'days_since_intl_break', 'is_intl_break_week',
    # Season stage
    'month', 'is_congestion_period', 'is_early_season',
    # Workload
    'minutes_spike',
    'acwr', 'ewma_acwr',
    'monotony', 'strain',
    # Cumulative load
    'season_minutes_so_far', 'season_matches_so_far',
    'prev_season_minutes', 'minutes_per_match_change',
    # Injury history
    'career_injury_count', 'injuries_last_12m', 'injuries_last_6m',
    'days_since_last_injury', 'hamstring_history', 'muscle_injury_history',
    'recurring_body_part', 'returned_from_long_injury',
    'avg_injury_severity', 'max_injury_severity',
    'season_days_missed', 'season_injury_count', 'prev_season_days_missed',
    'rushed_return',
    'soft_tissue_injury_count', 'soft_tissue_last_12m',
    # Active injury
    'currently_injured', 'days_since_return',
    # FPL signals
    'chance_of_playing', 'fpl_status_injured', 'fpl_status_doubtful',
    # Player profile
    'age', 'market_value_m', 'market_value_prev_m',
    'value_change_m', 'value_pct_change',
    'age_vs_peak', 'years_past_peak', 'is_past_peak', 'is_veteran',
    'height_cm',
    # Match difficulty
    'opponent_strength', 'is_home', 'fpl_xgc', 'elo_diff',
    # FBref physical intensity
    *FBREF_INTENSITY_COLS,
    # Rotation signals
    'starter_rate_last5', 'starter_rate_last10',
    'subbed_off_early_rate', 'came_on_as_sub_last5',
    # Utilization
    'utilization_rate', 'personal_injury_rate',
    # Age interactions
    'age_x_acwr', 'age_x_minutes_30d',
    # Position encoding
    'pos_GK', 'pos_DF', 'pos_MF', 'pos_FW',
    # Personal injury trigger profile
    'personal_trigger_matches_14d', 'personal_trigger_minutes_14d',
    'personal_trigger_consecutive',
    'load_vs_trigger_ratio', 'minutes_vs_trigger_ratio',
    'consecutive_vs_trigger', 'at_personal_trigger',
]

SEP = '=' * 62
