# ============================================================
# PREMIER LEAGUE MATCH PREDICTOR
# XGBoost model with Elo ratings, xG features, and draw tuning
# ============================================================

import os
import glob
import random
import warnings
from collections import defaultdict

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder, StandardScaler

try:
    from xgboost import XGBClassifier
    from lightgbm import LGBMClassifier
except ImportError:
    print("ERROR: Required libraries missing. Run: pip install xgboost lightgbm")
    exit()

warnings.filterwarnings('ignore')
from sklearn.metrics import mean_squared_error, mean_absolute_error
# ============================================================
# CONFIGURATION
# ============================================================

TRAIN_SEASONS    = ["2017-18", "2018-19", "2019-20", "2020-21", "2021-22", "2022-23"]
VALIDATION_SEASON = "2023-24"
TEST_SEASON       = "2024-25"

BASE_PATH       = r"C:\Users\jana\Desktop\jayjayokocha"

CSV_FOLDER      = BASE_PATH + r"\premierleaguedata"
XG_FILE_MAIN    = BASE_PATH + r"\xg\premier_league_xg_data_2015-2024.csv"
XG_FILE_1415    = BASE_PATH + r"\xg\premier_league_2014-15.csv"
XG_FILE_2425    = BASE_PATH + r"\xg\premier_league_2024-25.csv"
INJURY_FILE     = BASE_PATH + r"\data\injuries.csv"
PLAYERS_FILE    = BASE_PATH + r"\data\players.csv"
LINEUPS_FILE    = BASE_PATH + r"\data\pl_lineups.csv"
VALUATIONS_FILE = BASE_PATH + r"\data\pl_players_valuations.csv"
MANAGERS_FILE   = BASE_PATH + r"\data\pl_managers.csv"
OUTFIELD_STATS_FILE = BASE_PATH + r"\data\2024_PL.csv"
GK_STATS_FILE       = BASE_PATH + r"\data\GK_2024_PL.csv"
# Team name mapping — standardises names across all data sources
TEAM_NAME_MAP = {
    'Man United': 'Manchester United', 'Man Utd': 'Manchester United',
    'Man City': 'Manchester City',     'Manchester C': 'Manchester City',
    'Spurs': 'Tottenham',              'Tottenham Hotspur': 'Tottenham',
    'Brighton & HA': 'Brighton',       'Brighton & Hove Albion': 'Brighton',
    'West Ham United': 'West Ham',     'Newcastle United': 'Newcastle',
    'Leicester City': 'Leicester',     'Norwich City': 'Norwich',
    'Wolves': 'Wolves',                'Wolverhampton': 'Wolves',
    'Wolverhampton Wanderers': 'Wolves',
    'Sheffield United': 'Sheffield United', 'Sheffield Utd': 'Sheffield United',
    'Queens Park Rangers': 'QPR',
}

# Team name mapping for injury/players files (Transfermarkt format → match data format)
INJURY_TEAM_MAP = {
    'Liverpool FC': 'Liverpool',           'Arsenal FC': 'Arsenal',
    'Chelsea FC': 'Chelsea',               'Everton FC': 'Everton',
    'Fulham FC': 'Fulham',                 'Burnley FC': 'Burnley',
    'Southampton FC': 'Southampton',       'Watford FC': 'Watford',
    'Brentford FC': 'Brentford',           'Luton Town': 'Luton',
    'AFC Bournemouth': 'Bournemouth',      'Wolverhampton Wanderers': 'Wolves',
    'West Ham United': 'West Ham',         'Newcastle United': 'Newcastle',
    'Tottenham Hotspur': 'Tottenham',      'Brighton & Hove Albion': 'Brighton',
    'Leicester City': 'Leicester',         'Norwich City': 'Norwich',
    'West Bromwich Albion': 'West Brom',   'Leeds United': 'Leeds',
    'Sheffield United': 'Sheffield United','Ipswich Town': 'Ipswich',
    'Nottingham Forest': 'Nottingham Forest',
    'Manchester City': 'Manchester City',  'Manchester United': 'Manchester United',
    'Aston Villa': 'Aston Villa',          'Crystal Palace': 'Crystal Palace',
}

# ===== DATA LOADING =====
def load_and_combine_data(folder_path, first_season, last_season):
    """
    Scan a folder for Premier League CSV files, parse season labels from
    filenames, and return a combined DataFrame filtered to the required range.
    """
    print("Loading Premier League data...")
    first_year = 2014
    last_year  = int(last_season.split('-')[0])

    # Exclude non-match files
    excluded_keywords = ('cleaned', 'predicted', 'transfer', 'xg')
    csv_files = [
        f for f in glob.glob(os.path.join(folder_path, "*.csv"))
        if not any(kw in os.path.basename(f).lower() for kw in excluded_keywords)
    ]

    all_data = []
    for file_path in csv_files:
        filename = os.path.basename(file_path)
        season = None
        try:
            parts      = filename.split('.')[0].split('_')
            season_str = parts[0]

            if len(season_str) == 4 and season_str.isdigit():
                # Format: YYZZ (e.g. 1920)
                y1_short = int(season_str[:2])
                y2_short = int(season_str[2:])
            elif len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit():
                # Format: YY_ZZ
                y1_short = int(parts[0])
                y2_short = int(parts[1])
            else:
                # Try suffix format e.g. something_2019-20
                suffix = filename.split('_')[-1].split('.')[0]
                if '-' not in suffix:
                    continue
                y_parts = suffix.split('-')
                if len(y_parts) != 2 or not all(p.isdigit() for p in y_parts):
                    continue
                if len(y_parts[0]) == 4:
                    year1    = int(y_parts[0])
                    y1_short = year1 % 100
                else:
                    y1_short = int(y_parts[0])
                    year1    = 2000 + y1_short
                y2_short = int(y_parts[1])
                season   = f"{year1}-{str(y2_short).zfill(2)}"
                if not (first_year <= year1 <= last_year):
                    continue

            if season is None and y1_short != 0:
                year1  = 2000 + y1_short
                season = f"{year1}-{str(y2_short).zfill(2)}"
                if not (first_year <= year1 <= last_year):
                    continue

            if season:
                df = pd.read_csv(file_path, encoding='latin1')
                if 'Season' not in df.columns or df['Season'].isnull().all():
                    df['Season'] = season
                all_data.append(df)
                print(f"   Loaded {season}: {len(df)} matches")
            else:
                print(f"   Skipping (could not parse season): {filename}")

        except Exception as e:
            print(f"   Error processing {filename}: {e}")

    if not all_data:
        print("Error: No match data loaded.")
        return None

    combined = pd.concat(all_data, ignore_index=True)
    if 'Season' in combined.columns:
        try:
            combined['_year'] = combined['Season'].astype(str).str[:4].astype(int)
            combined = combined[
                combined['_year'].between(first_year, last_year)
            ].drop(columns=['_year'])
        except Exception as e:
            print(f"Error during season filtering: {e}")
    else:
        print("Warning: 'Season' column missing — cannot filter by year.")

    print(f"\nTotal matches loaded for relevant seasons: {len(combined)}")
    return combined

# ===== LOAD XG DATA =====
def load_xg_data(xg_file_main, xg_file_1415, xg_file_2425=None):
    """Load and combine xG data files, standardising season format."""
    print("\nLoading xG (Expected Goals) data...")
    xg_data_list = []

    files_to_load = {xg_file_main: "main", xg_file_1415: "1415"}
    if xg_file_2425:
        files_to_load[xg_file_2425] = "2425"

    for file_path, label in files_to_load.items():
        if not os.path.exists(file_path):
            print(f"\nWarning: {label} xG file not found at {file_path}")
            continue
        try:
            xg_df = pd.read_csv(file_path)
            xg_df['Team'] = xg_df['Team'].replace(TEAM_NAME_MAP)
            if label == "1415" and 'Season' not in xg_df.columns:
                xg_df['Season'] = '2014-15'
            xg_df['Season'] = xg_df['Season'].astype(str).str.replace('/', '-')
            xg_data_list.append(xg_df)
            print(f"   Loaded {label} xG file ({os.path.basename(file_path)}): {len(xg_df)} team-seasons")
        except Exception as e:
            print(f"   Error loading {label} xG file: {e}")

    if not xg_data_list:
        print("\nWarning: No xG data loaded. xG features will be zero.")
        return None

    combined = pd.concat(xg_data_list, ignore_index=True)
    combined = (combined
                .drop_duplicates(subset=['Season', 'Team'], keep='last')
                .sort_values(by=['Season', 'Team'])
                .reset_index(drop=True))
    print(f"\nTotal combined xG data loaded: {len(combined)} unique team-seasons")
    print(f"   xG Seasons loaded: {sorted(combined['Season'].unique())}")
    return combined


# ===== LOAD INJURY DATA =====
def load_injury_data(injury_file, players_file):
    """
    Load and merge injury records with player-team mappings.
    Returns a preprocessed DataFrame ready for fast per-match lookups.
    Covers seasons 2019-20 to 2024-25 where team data is available.
    """
    if not os.path.exists(injury_file) or not os.path.exists(players_file):
        print("\nWarning: Injury or players file not found. Injury features will be zero.")
        return None

    print("\nLoading injury data...")

    inj     = pd.read_csv(injury_file,  encoding='utf-8-sig')
    players = pd.read_csv(players_file, encoding='utf-8-sig')

    # Parse market value: "72.00m" → 72.0, "900k" → 0.9
    def parse_mv(val):
        if pd.isna(val): return 0.0
        v = str(val).strip()
        if v.endswith('m'): return float(v[:-1])
        if v.endswith('k'): return float(v[:-1]) / 1000
        return 0.0
    players['market_value_m'] = players['market_value'].apply(parse_mv)

    # Parse dates — handles both ISO and DD/MM/YYYY formats
    def parse_date(d):
        if pd.isna(d): return pd.NaT
        for fmt in ['%Y-%m-%d', '%d/%m/%Y']:
            try: return pd.to_datetime(d, format=fmt)
            except: pass
        return pd.NaT

    inj['injury_date_parsed'] = inj['injury_date'].apply(parse_date)
    inj['return_date_parsed'] = inj['return_date'].apply(parse_date)

    # Standardise season format: "19/20" → "2019-20"
    season_map = {f'{y%100:02d}/{(y+1)%100:02d}': f'{2000+y%100}-{(y+1)%100:02d}'
                  for y in range(7, 26)}
    inj['season_clean'] = inj['season'].replace(season_map)

    # Standardise team names
    players['team_clean'] = players['team'].replace(INJURY_TEAM_MAP)

    # Merge injury records with player-team info
    merged = inj.merge(
        players[['player_id', 'season', 'team_clean', 'market_value_m', 'position']],
        left_on=['player_id', 'season_clean'],
        right_on=['player_id', 'season'],
        how='left'
    )

    # Keep only records with a matched team and valid injury date
    merged = merged[
        merged['team_clean'].notna() &
        merged['injury_date_parsed'].notna()
    ].copy()

    # Fill missing return dates with injury_date + days_out (best estimate)
    mask = merged['return_date_parsed'].isna() & merged['days_out'].notna()
    merged.loc[mask, 'return_date_parsed'] = (
        merged.loc[mask, 'injury_date_parsed'] +
        pd.to_timedelta(merged.loc[mask, 'days_out'], unit='D')
    )

    # Fill missing games_missed with median per injury type
    median_gm = merged['games_missed'].median()
    merged['games_missed'] = merged['games_missed'].fillna(median_gm)

    print(f"   Injury records loaded: {len(merged)} (with team matched)")
    print(f"   Players covered: {merged['player_name'].nunique()}")
    print(f"   Seasons covered: {sorted(merged['season_clean'].unique())}")
    return merged


def get_injury_features(injury_df, team, match_date):
    """
    For a given team and match date, return injury features:
    - Number of players currently injured
    - Number of key players injured (market value > €15m)
    - Total games missed by currently injured players (severity proxy)
    Returns zeros if no injury data available for this team/period.
    """
    if injury_df is None or injury_df.empty:
        return {'injured_count': 0, 'key_injured': 0, 'injured_severity': 0.0}

    # Players injured on this date: injury started before match, return after match
    active = injury_df[
        (injury_df['team_clean'] == team) &
        (injury_df['injury_date_parsed'] <= match_date) &
        (injury_df['return_date_parsed'] >= match_date)
    ]

    if active.empty:
        return {'injured_count': 0, 'key_injured': 0, 'injured_severity': 0.0}

    return {
        'injured_count':    len(active),
        'key_injured':      int((active['market_value_m'] > 15).sum()),
        'injured_severity': float(active['games_missed'].sum()),
    }


# ===== LINEUP DATA =====
def load_lineup_data(lineups_file, valuations_file):
    """
    Load lineup and valuation data, merge them, and index by
    (date_str, home_team, side) for fast per-match lookup.
    """
    if not os.path.exists(lineups_file) or not os.path.exists(valuations_file):
        print("\nWarning: Lineup or valuations file not found. Lineup features will be zero.")
        return None

    print("\nLoading lineup data...")
    lineups    = pd.read_csv(lineups_file,    encoding='utf-8-sig')
    valuations = pd.read_csv(valuations_file, encoding='utf-8-sig')

    lineups['date'] = pd.to_datetime(lineups['date'], errors='coerce')

    # Recover team names from match URL
    import re as _re
    TMAP = {
        'Manchester-United':'Manchester United','Manchester-City':'Manchester City',
        'Tottenham-Hotspur':'Tottenham','West-Ham-United':'West Ham',
        'Newcastle-United':'Newcastle','Leicester-City':'Leicester',
        'Norwich-City':'Norwich','Wolverhampton-Wanderers':'Wolves',
        'Brighton-and-Hove-Albion':'Brighton','West-Bromwich-Albion':'West Brom',
        'Sheffield-United':'Sheffield United','Nottingham-Forest':'Nottingham Forest',
        'Aston-Villa':'Aston Villa','Crystal-Palace':'Crystal Palace',
        'AFC-Bournemouth':'Bournemouth','Ipswich-Town':'Ipswich',
        'Luton-Town':'Luton','Leeds-United':'Leeds','Swansea-City':'Swansea',
        'Stoke-City':'Stoke','Huddersfield-Town':'Huddersfield','Cardiff-City':'Cardiff',
        'Hull-City':'Hull','Brentford':'Brentford','Fulham':'Fulham',
        'Chelsea':'Chelsea','Arsenal':'Arsenal','Liverpool':'Liverpool',
        'Everton':'Everton','Southampton':'Southampton','Burnley':'Burnley',
        'Watford':'Watford','Sunderland':'Sunderland','Bournemouth':'Bournemouth',
        'Middlesbrough':'Middlesbrough',
    }

    def parse_teams(url):
        if not isinstance(url, str): return '', ''
        m = _re.search(r'/en/matches/[a-f0-9]+/(.+)-\w+-\d+-\d{4}-Premier-League', url)
        if not m: return '', ''
        slug = m.group(1)
        home = away = ''
        for hyphen, clean in sorted(TMAP.items(), key=lambda x: -len(x[0])):
            if slug.startswith(hyphen + '-') or slug == hyphen:
                home = clean; slug = slug[len(hyphen)+1:]; break
        for hyphen, clean in sorted(TMAP.items(), key=lambda x: -len(x[0])):
            if slug.startswith(hyphen): away = clean; break
        return home, away

    teams = lineups['match_url'].apply(parse_teams)
    lineups['home_team'] = teams.apply(lambda x: x[0])
    lineups['away_team'] = teams.apply(lambda x: x[1])
    lineups['team']      = lineups.apply(
        lambda r: r['home_team'] if r['side'] == 'home' else r['away_team'], axis=1
    )

    # Fix is_starter
    lineups = lineups.sort_values(['match_url','side','shirt_number']).reset_index(drop=True)
    lineups['row_in_group'] = lineups.groupby(['match_url','side']).cumcount()
    lineups['is_starter']   = lineups['row_in_group'] < 11
    lineups = lineups.drop(columns=['row_in_group'])

    # Season key for valuation lookup
    def date_to_season(d):
        if pd.isna(d): return None
        y = d.year if d.month >= 8 else d.year - 1
        return f"{y}-{str(y+1)[-2:]}"

    lineups['season_key'] = lineups['date'].apply(date_to_season)

    # Starters only
    starters = lineups[lineups['is_starter']].copy()
    starters = starters.rename(columns={'player_id': 'fbref_id'})

    # Merge with valuations
    val = valuations[['fbref_id','season','market_value_m']].copy()
    val = val.rename(columns={'season': 'season_key'})

    merged = starters.merge(val, on=['fbref_id','season_key'], how='left')

    # Fill missing with median
    median_val = merged['market_value_m'].median()
    merged['market_value_m'] = merged['market_value_m'].fillna(median_val)

    # Build lookup dict: (date_str, home_team, side) → list of values
    lookup = {}
    for _, row in merged.iterrows():
        if pd.isna(row['date']): continue
        key = (str(row['date'].date()), row['home_team'], row['side'])
        if key not in lookup:
            lookup[key] = []
        lookup[key].append(row['market_value_m'])

    coverage = merged['market_value_m'].notna().sum()
    print(f"   Lineup records: {len(lineups)} rows, {lineups['match_url'].nunique()} matches")
    print(f"   Starters with valuation: {coverage}/{len(merged)}")
    print(f"   Lookup keys built: {len(lookup)}")
    return lookup


def get_lineup_features(lineup_lookup, home_team, match_date, side):
    """
    Get starting XI quality features using (date, home_team, side) key.
    Returns zeros if match not found in lineup data.
    """
    empty = {'xi_avg_value': 0.0, 'xi_total_value': 0.0,
             'xi_top3_value': 0.0, 'xi_stars': 0}
    if lineup_lookup is None:
        return empty

    date_str = str(match_date.date()) if hasattr(match_date, 'date') else str(match_date)[:10]
    key  = (date_str, home_team, side)
    vals = lineup_lookup.get(key)

    if not vals:
        return empty

    vals_arr = np.array(vals)
    return {
        'xi_avg_value':   float(np.mean(vals_arr)),
        'xi_total_value': float(np.sum(vals_arr)),
        'xi_top3_value':  float(np.sum(sorted(vals_arr, reverse=True)[:3])),
        'xi_stars':       int(np.sum(vals_arr >= 30)),
    }


# ===== MANAGER DATA =====
def load_manager_data(managers_file):
    """
    Load manager appointment history.
    Returns a dict: team → sorted list of (date_appointed, manager_name)
    Used to detect manager changes and calculate days under current manager.
    """
    if not os.path.exists(managers_file):
        print("\nWarning: Managers file not found. Manager features will be zero.")
        return None

    print("\nLoading manager data...")
    df = pd.read_csv(managers_file, encoding='utf-8-sig')
    df['date_appointed'] = pd.to_datetime(df['date_appointed'])
    df = df.sort_values(['team', 'date_appointed'])

    manager_dict = {}
    for team, grp in df.groupby('team'):
        manager_dict[team] = list(zip(grp['date_appointed'], grp['manager']))

    print(f"   Teams covered: {len(manager_dict)}")
    print(f"   Total manager records: {len(df)}")
    return manager_dict


def get_manager_features(manager_dict, team, match_date):
    """
    For a given team and match date, return manager-related features:
    - days_with_manager:    days the current manager has been in charge
    - new_manager_flag:     1 if manager appointed within last 8 matches (~6 weeks)
    - manager_honeymoon:    1 if within first 3 matches (bounce effect)
    Returns zeros if no manager data available.
    """
    empty = {'days_with_manager': 0, 'new_manager_flag': 0, 'manager_honeymoon': 0}
    if manager_dict is None or team not in manager_dict:
        return empty

    appointments = manager_dict[team]

    # Find the manager in charge on match_date
    current_manager_date = None
    for appt_date, _ in appointments:
        if appt_date <= match_date:
            current_manager_date = appt_date
        else:
            break

    if current_manager_date is None:
        return empty

    days = (match_date - current_manager_date).days
    return {
        'days_with_manager': days,
        'new_manager_flag':   1 if days <= 60 else 0,   # ~8 matches
        'manager_honeymoon':  1 if days <= 21 else 0,   # ~3 matches
    }




# ===== DATA PREPROCESSING (WITH DATE FIX) =====
def clean_data(df):
    """Clean and prepare match data with robust multi-format date parsing."""
    if df is None or df.empty:
        print("Error: Input DataFrame for cleaning is empty.")
        return None

    print("\nCleaning match data...")

    # Keep only essential and optional columns, drop everything else
    essential_cols = ['Season', 'Date', 'HomeTeam', 'AwayTeam', 'FTHG', 'FTAG', 'FTR']
    optional_cols  = ['HS', 'AS', 'HST', 'AST', 'HF', 'AF', 'HC', 'AC', 'HY', 'AY', 'HR', 'AR', 'Referee', 'B365H', 'B365D', 'B365A', 'AvgH', 'AvgD', 'AvgA']
    cols_to_keep   = [c for c in essential_cols if c in df.columns] + [c for c in optional_cols if c in df.columns]
    dropped = len(df.columns) - len(cols_to_keep)
    df = df[cols_to_keep].copy()
    if dropped:
        print(f"   Dropped {dropped} non-essential/missing columns.")

    # Drop rows missing critical values
    before = len(df)
    df = df.dropna(subset=['HomeTeam', 'AwayTeam', 'FTR'])
    if len(df) < before:
        print(f"   Dropped {before - len(df)} rows with missing Team or FTR data.")

    # Standardise team names
    df['HomeTeam'] = df['HomeTeam'].replace(TEAM_NAME_MAP)
    df['AwayTeam'] = df['AwayTeam'].replace(TEAM_NAME_MAP)

    # Parse dates — try multiple formats in order
    print("   Parsing dates (trying multiple formats)...")
    date_col = df['Date'].copy()
    parsed = pd.to_datetime(date_col, format='%d/%m/%Y', errors='coerce')
    for fmt in ['%d/%m/%y', '%m/%d/%Y', '%m/%d/%y']:
        mask = parsed.isna()
        if mask.any():
            parsed[mask] = pd.to_datetime(date_col[mask], format=fmt, errors='coerce')
    mask = parsed.isna()
    if mask.any():
        parsed[mask] = pd.to_datetime(date_col[mask], errors='coerce')

    df['Date'] = parsed
    unparseable = df['Date'].isna().sum()
    if unparseable:
        print(f"   Dropping {unparseable} rows with unparseable dates.")
        df = df.dropna(subset=['Date'])
    df = df.drop(columns=['Date_Parsed'], errors='ignore')

    df['FTHG'] = pd.to_numeric(df['FTHG'], errors='coerce')
    df['FTAG'] = pd.to_numeric(df['FTAG'], errors='coerce')
    invalid_scores = df[['FTHG', 'FTAG']].isna().any(axis=1).sum()
    if invalid_scores:
        print(f"   Dropping {invalid_scores} rows with invalid score data.")
        df = df.dropna(subset=['FTHG', 'FTAG'])
    df['FTHG'] = df['FTHG'].astype(int)
    df['FTAG'] = df['FTAG'].astype(int)

    invalid_ftr = ~df['FTR'].isin(['H', 'D', 'A'])
    if invalid_ftr.any():
        print(f"   Warning: Dropping {invalid_ftr.sum()} rows with invalid FTR values.")
        df = df[~invalid_ftr]

    print(f"   Cleaned data contains: {len(df)} matches")
    if not df.empty:
        print(f"   Date range: {df['Date'].min().date()} to {df['Date'].max().date()}")
    return df


def calculate_h2h_features(df_slice, home_team, away_team, lookback_matches=10):
    """Calculate head-to-head statistics between two teams from historical data."""
    mask = (
        ((df_slice['HomeTeam'] == home_team) & (df_slice['AwayTeam'] == away_team)) |
        ((df_slice['HomeTeam'] == away_team) & (df_slice['AwayTeam'] == home_team))
    )
    h2h = df_slice[mask].tail(lookback_matches)

    empty_result = {
        'h2h_home_wins': 0, 'h2h_away_wins': 0, 'h2h_draws': 0,
        'h2h_home_goals_avg': 0.0, 'h2h_away_goals_avg': 0.0,
        'h2h_matches_count': 0, 'h2h_home_win_rate': 0.0,
    }
    if h2h.empty:
        return empty_result

    home_wins = away_wins = draws = home_goals = away_goals = 0
    for _, match in h2h.iterrows():
        if match['HomeTeam'] == home_team:
            home_goals += match['FTHG']
            away_goals += match['FTAG']
        else:
            home_goals += match['FTAG']
            away_goals += match['FTHG']

        if   (match['HomeTeam'] == home_team and match['FTR'] == 'H') or \
             (match['AwayTeam'] == home_team and match['FTR'] == 'A'):
            home_wins += 1
        elif (match['HomeTeam'] == away_team and match['FTR'] == 'H') or \
             (match['AwayTeam'] == away_team and match['FTR'] == 'A'):
            away_wins += 1
        else:
            draws += 1

    n = len(h2h)
    return {
        'h2h_home_wins':      home_wins,
        'h2h_away_wins':      away_wins,
        'h2h_draws':          draws,
        'h2h_home_goals_avg': home_goals / n,
        'h2h_away_goals_avg': away_goals / n,
        'h2h_matches_count':  n,
        'h2h_home_win_rate':  home_wins / n,
    }

# ===== DAYS SINCE LAST MATCH =====
def calculate_rest_days(df_slice, team, current_date):
    team_matches = df_slice[(df_slice['HomeTeam'] == team) | (df_slice['AwayTeam'] == team)]
    if team_matches.empty: return 7
    last_match_date = team_matches['Date'].iloc[-1]; days_rest = (current_date - last_match_date).days
    return max(0, days_rest)

# ===== GET XG STATISTICS =====
def get_xg_stats(xg_df, team, season, is_target_season): # Renamed param for clarity
    if xg_df is None or xg_df.empty: return {'xg': 0.0, 'xga': 0.0, 'xpts': 0.0}
    try:
        season_year = int(season.split('-')[0]); prev_season_year = season_year - 1
        prev_season_end_yy = str(season_year % 100).zfill(2)
        prev_season_lookup = f"{prev_season_year}-{prev_season_end_yy}"
    except Exception as e: print(f"DEBUG: Error parsing season '{season}' in get_xg_stats: {e}"); return {'xg': 0.0, 'xga': 0.0, 'xpts': 0.0}
    
    team_xg = xg_df[(xg_df['Team'] == team) & (xg_df['Season'] == prev_season_lookup)]
    
    if team_xg.empty:
        prev_season_data = xg_df[xg_df['Season'] == prev_season_lookup]
        if len(prev_season_data) >= 3:
            relegated = prev_season_data.sort_values('xPTS', ascending=True).head(3)
            avg_xg = relegated['xG'].mean(skipna=True); avg_xga = relegated['xGA'].mean(skipna=True); avg_xpts = relegated['xPTS'].mean(skipna=True)
            if pd.isna(avg_xg) or pd.isna(avg_xga) or pd.isna(avg_xpts): return {'xg': 0.0, 'xga': 0.0, 'xpts': 0.0}
            return {'xg': avg_xg, 'xga': avg_xga, 'xpts': avg_xpts}
        else:
             return {'xg': 0.0, 'xga': 0.0, 'xpts': 0.0}
    stats = team_xg.iloc[0]; return {'xg': float(stats.get('xG', 0.0)), 'xga': float(stats.get('xGA', 0.0)), 'xpts': float(stats.get('xPTS', 0.0))}

# ===== REFEREE STATISTICS =====
def get_referee_stats(df_slice, referee_name):
    default_stats = {'ref_avg_home_cards': 2.0, 'ref_avg_away_cards': 2.0, 'ref_home_win_rate': 0.45}
    if pd.isna(referee_name) or referee_name == '' or 'Referee' not in df_slice.columns: return default_stats
    ref_matches = df_slice[df_slice['Referee'] == referee_name]
    if len(ref_matches) < 5: return default_stats
    home_yellow = ref_matches['HY'].fillna(0) if 'HY' in ref_matches else 0; home_red = ref_matches['HR'].fillna(0) if 'HR' in ref_matches else 0
    away_yellow = ref_matches['AY'].fillna(0) if 'AY' in ref_matches else 0; away_red = ref_matches['AR'].fillna(0) if 'AR' in ref_matches else 0
    home_cards = home_yellow + home_red * 2; away_cards = away_yellow + away_red * 2
    home_wins = (ref_matches['FTR'] == 'H').sum()
    draws = (ref_matches['FTR'] == 'D').sum()
    return {
        'ref_avg_home_cards': home_cards.mean(),
        'ref_avg_away_cards': away_cards.mean(),
        'ref_home_win_rate': home_wins / len(ref_matches),
        'ref_draw_rate': draws / len(ref_matches)
    }

# ===== EVALUATE POINTS PREDICTION WITH RMSE =====
def evaluate_points_prediction(predicted_standings, actual_standings):
    """Evaluate predicted points using RMSE, MAE, Correlation."""
    pred_df, actual_df = predicted_standings, actual_standings
    if 'Team' not in pred_df.columns or 'Team' not in actual_df.columns: print("Error: 'Team' missing."); return {k:np.nan for k in ['RMSE','MAE','Max Error','Correlation','details']}
    merged = pred_df.merge(actual_df[['Team', 'Points']], on='Team', suffixes=('_pred', '_actual'), how='inner')
    if merged.empty: print("Error: No common teams."); return {k:np.nan for k in ['RMSE','MAE','Max Error','Correlation','details']}
    
    pred_pts_col = 'Avg Pts' if 'Avg Pts' in merged.columns else 'Avg Points' if 'Avg Points' in merged.columns else None
    if pred_pts_col is None: print("Error: Cannot find 'Avg Pts' or 'Avg Points'."); return {k:np.nan for k in ['RMSE','MAE','Max Error','Correlation','details']}
    
    predicted_points_raw = merged[pred_pts_col]
    actual_points_raw = merged['Points']
    
    valid = ~np.isnan(predicted_points_raw) & ~np.isnan(actual_points_raw)
    if not valid.any(): print("Error: No valid pts."); return {k:np.nan for k in ['RMSE','MAE','Max Error','Correlation','details']}
    
    predicted_points = predicted_points_raw[valid]
    actual_points = actual_points_raw[valid]
    
    rmse=np.sqrt(mean_squared_error(actual_points, predicted_points))
    mae=mean_absolute_error(actual_points, predicted_points)

    max_err = np.max(np.abs(actual_points-predicted_points)) if not merged.empty else np.nan
    corr = np.corrcoef(actual_points,predicted_points)[0,1] if len(actual_points)>1 else np.nan
    
    details = merged[['Team', pred_pts_col, 'Points']].rename(columns={pred_pts_col:'Predicted Points','Points':'Actual Points'})
    return {'RMSE':rmse,'MAE':mae,'Max Error':max_err,'Correlation':corr,'details':details}

# ===== ELO RATING SYSTEM (K=20) =====
def calculate_elo_update(home_elo, away_elo, home_goals, away_goals, k_factor=20): # K-FACTOR SET TO 20
    """Calculate new Elo ratings using a K-factor of 20."""
    expected_home = 1.0 / (1.0 + 10**((away_elo - home_elo) / 400.0))
    expected_away = 1.0 - expected_home
    if home_goals > away_goals: actual_home, actual_away = 1.0, 0.0
    elif away_goals > home_goals: actual_home, actual_away = 0.0, 1.0
    else: actual_home, actual_away = 0.5, 0.5
    gd_multiplier = 1.0; goal_diff = abs(home_goals - away_goals)
    if goal_diff == 2: gd_multiplier = 1.5
    elif goal_diff >= 3: gd_multiplier = 1.75
    home_update = k_factor * (actual_home - expected_home); away_update = k_factor * (actual_away - expected_away)
    new_home_elo = home_elo + home_update * gd_multiplier; new_away_elo = away_elo + away_update * gd_multiplier
    return new_home_elo, new_away_elo

# ===== CALCULATE TEAM STRENGTH RATING (Using Historical Norm) =====
def calculate_team_strength(team_stats, norm_factors):
    """Calculate strength using pre-calculated normalization factors."""
    matches = team_stats.get('matches', 0)
    if matches == 0: return 50.0
    ppg = team_stats.get('points', 0) / matches; gd = team_stats.get('goals_for', 0) - team_stats.get('goals_against', 0)
    gf_pm = team_stats.get('goals_for', 0) / matches; ga_pm = team_stats.get('goals_against', 0) / matches
    min_p,p_rng = norm_factors.get('min_ppg',0.5), norm_factors.get('ppg_range',2.0)
    min_g,g_rng = norm_factors.get('min_gd',-50), norm_factors.get('gd_range',100)
    min_gf,gf_rng = norm_factors.get('min_gf',0.5), norm_factors.get('gf_range',2.0)
    min_ga,ga_rng = norm_factors.get('min_ga',0.5), norm_factors.get('ga_range',2.0)
    ppg_n=((ppg-min_p)/p_rng)*40 if p_rng>0 else 0; gd_n=((gd-min_g)/g_rng)*25 if g_rng>0 else 0
    gf_n=((gf_pm-min_gf)/gf_rng)*20 if gf_rng>0 else 0; ga_n=(1-((ga_pm-min_ga)/ga_rng))*15 if ga_rng>0 else 15
    strength = ppg_n+gd_n+gf_n+ga_n; return min(100, max(0, strength))

# ===== ENHANCED FEATURE ENGINEERING (LAGGED ELO) =====
def create_enhanced_features(df, xg_df, all_train_seasons_list, validation_season, test_season, season_weights_map, injury_df=None, lineup_df=None, manager_dict=None):
    """Create features using LAGGED Elo ratings (NO betting odds)."""
    print(f"\nCreating enhanced features (using LAGGED ELO, NO ODDS)...")
    df = df.sort_values('Date').reset_index(drop=True); features = []
    all_teams = sorted(list(set(df['HomeTeam'].unique())|set(df['AwayTeam'].unique())))
    
    live_elo_ratings = {t:1500 for t in all_teams}
    final_elo_by_season = {}

    target_seasons = [validation_season, test_season]
    
    def get_season_weight(s, t_list_map):
        return t_list_map.get(s, 1.0)

    def _calculate_normalization_factors(data_df, season):
        # print(f"   Calculating norm factors using {season} final stats...") # Verbose
        season_df = data_df[data_df['Season'] == season]
        defaults = {'min_ppg':0.6, 'ppg_range':(2.5-0.6), 'min_gd':-40, 'gd_range':(60 - -40),'min_gf':0.7, 'gf_range':(2.5-0.7), 'min_ga':0.8, 'ga_range':(2.0-0.8)}
        if season_df.empty: print(f"   Warning: No data for {season}. Using defaults."); return defaults
        final_standings = calculate_standings(season_df);
        if final_standings.empty: print(f"   Warning: Empty standings for {season}. Using defaults."); return defaults
        if 'Played' not in final_standings.columns or (final_standings['Played'] <= 0).any(): print(f"   Warning: Invalid 'Played' in {season}. Using defaults."); return defaults
        final_standings['PPG'] = final_standings['Points']/final_standings['Played']; final_standings['GF_pm']=final_standings['GF']/final_standings['Played']; final_standings['GA_pm']=final_standings['GA']/final_standings['Played']
        final_standings = final_standings.replace([np.inf,-np.inf], np.nan).dropna(subset=['PPG','GD','GF_pm','GA_pm'])
        if final_standings.empty: print(f"   Warning: NaN standings metrics for {season}. Using defaults."); return defaults
        min_p,max_p=final_standings['PPG'].min(),final_standings['PPG'].max(); min_g,max_g=final_standings['GD'].min(),final_standings['GD'].max()
        min_gf,max_gf=final_standings['GF_pm'].min(),final_standings['GF_pm'].max(); min_ga,max_ga=final_standings['GA_pm'].min(),final_standings['GA_pm'].max()
        factors={'min_ppg':min_p,'ppg_range':max(max_p-min_p,1e-6),'min_gd':min_g,'gd_range':max(max_g-min_g,1e-6),'min_gf':min_gf,'gf_range':max(max_gf-min_gf,1e-6),'min_ga':min_ga,'ga_range':max(max_ga-min_ga,1e-6)};
        # print(f"   Norm factors based on {season}: {factors}") # Verbose
        return factors

    team_stats = {team: {
        'matches': 0, 'wins': 0, 'draws': 0, 'losses': 0,'goals_for': 0, 'goals_against': 0, 'points': 0,
        'home_wins': 0, 'home_draws': 0, 'home_losses': 0,'home_goals_for': 0, 'home_goals_against': 0, 'home_matches': 0,
        'away_wins': 0, 'away_draws': 0, 'away_losses': 0,'away_goals_for': 0, 'away_goals_against': 0, 'away_matches': 0,
        'last_5_results': [], 'last_5_goals_for': [], 'last_5_goals_against': [],'last_10_results': [],
        'win_streak': 0, 'unbeaten_streak': 0, 'loss_streak': 0,'clean_sheets': 0, 'failed_to_score': 0,
        'weighted_points': 0.0, 'weighted_matches': 0.0,
        'shots_for': 0, 'shots_against': 0, 'shots_on_target_for': 0, 'shots_on_target_against': 0
    } for team in all_teams}

    # Season points tracker for live league position calculation
    # Resets each season: {team: {'pts': 0, 'gd': 0, 'gf': 0}}
    season_pts = {team: {'pts': 0, 'gd': 0, 'gf': 0} for team in all_teams}
    current_tracking_season = ""

    # In-season xG tracker — resets each season
    # Tracks shots on target to build a cumulative xG proxy
    # xG_per_shot_on_target = 0.33 (PL average)
    XG_PER_SOT = 0.33
    season_sot = {team: {'sot_for': 0, 'sot_against': 0, 'matches': 0} for team in all_teams}

    all_loaded_seasons = sorted(df['Season'].unique())
    first_loaded_season = all_loaded_seasons[0] # e.g., '2014-15'
    first_train_yr = int(first_loaded_season.split('-')[0])
    
    prev_season_start_yr = first_train_yr - 1
    prev_season_end_yy = str(first_train_yr % 100).zfill(2)
    season_before_lookup = f"{prev_season_start_yr}-{prev_season_end_yy}" # e.g. 2013-14
    
    print(f"Calculating initial norm factors using season: {season_before_lookup}")
    norm_factors = _calculate_normalization_factors(df, season_before_lookup); last_season = ""

    for idx, row in df.iterrows():
        c_season, c_date = row['Season'], row['Date']
        
        if c_season != last_season:
            print(f"\n--- Processing Season: {c_season} ---")
            if last_season:
                print(f"   Storing final Elo ratings for {last_season}...")
                final_elo_by_season[last_season] = live_elo_ratings.copy()
                norm_factors = _calculate_normalization_factors(df, last_season)
            last_season = c_season
            # Reset league table tracker for new season
            season_pts = {team: {'pts': 0, 'gd': 0, 'gf': 0} for team in all_teams}
            current_tracking_season = c_season
            # Reset in-season xG tracker for new season
            season_sot = {team: {'sot_for': 0, 'sot_against': 0, 'matches': 0} for team in all_teams}
        
        if idx % 500 == 0 and idx > 0: print(f"   Match {idx}/{len(df)}...")
        
        ht, at = row['HomeTeam'], row['AwayTeam']
        try: hg, ag = int(row['FTHG']), int(row['FTAG'])
        except: continue
        
        df_slice = df.iloc[:idx];
        
        try:
            season_year = int(c_season.split('-')[0]); prev_season_year = season_year - 1
            prev_season_end_yy = str(season_year % 100).zfill(2)
            prev_season_lookup = f"{prev_season_year}-{prev_season_end_yy}"
        except Exception as e:
            print(f"Error parsing season {c_season} for lagged elo: {e}"); prev_season_lookup = ""
            
        prev_season_ratings = final_elo_by_season.get(prev_season_lookup, {})

        # --- IMPROVED ELO: Regression to mean between seasons ---
        # 25% regression accounts for summer transfers, manager changes, squad turnover
        # Promoted teams get 1450 (slightly below average) instead of 1500
        ELO_MEAN = 1500; ELO_REGRESSION = 0.25; PROMOTED_ELO = 1450
        raw_home = prev_season_ratings.get(ht, None)
        raw_away = prev_season_ratings.get(at, None)
        home_elo_lagged = (ELO_MEAN + (raw_home - ELO_MEAN) * (1 - ELO_REGRESSION)) if raw_home else PROMOTED_ELO
        away_elo_lagged = (ELO_MEAN + (raw_away - ELO_MEAN) * (1 - ELO_REGRESSION)) if raw_away else PROMOTED_ELO
        elo_diff_lagged = home_elo_lagged - away_elo_lagged

        h_stats, a_stats = team_stats.get(ht,{}).copy(), team_stats.get(at,{}).copy()
        if not h_stats: h_stats = {'matches': 0, 'points': 0, 'goals_for': 0, 'goals_against':0, 'home_matches':0, 'home_goals_for':0,'home_goals_against':0, 'weighted_points':0, 'weighted_matches':0,'wins':0,'home_wins':0,'last_5_results':[], 'last_10_results':[], 'last_5_goals_for':[], 'last_5_goals_against':[], 'win_streak':0, 'unbeaten_streak':0,'clean_sheets':0,'shots_for':0, 'shots_on_target_for':0}
        if not a_stats: a_stats = {'matches': 0, 'points': 0, 'goals_for': 0, 'goals_against':0, 'away_matches':0, 'away_goals_for':0,'away_goals_against':0, 'weighted_points':0, 'weighted_matches':0,'wins':0,'away_wins':0,'last_5_results':[], 'last_10_results':[], 'last_5_goals_for':[], 'last_5_goals_against':[], 'loss_streak':0, 'win_streak':0, 'failed_to_score':0,'shots_for':0, 'shots_on_target_for':0}

        h2h   = calculate_h2h_features(df_slice, ht, at)
        hr_d  = calculate_rest_days(df_slice, ht, c_date)
        ar_d  = calculate_rest_days(df_slice, at, c_date)
        ref   = row.get('Referee')
        ref_s = get_referee_stats(df_slice, ref)
        
        is_target = c_season in target_seasons
        h_xg  = get_xg_stats(xg_df, ht, c_season, is_target)
        a_xg  = get_xg_stats(xg_df, at, c_season, is_target)

        # Injury features — only available from 2019-20 onwards
        h_inj = get_injury_features(injury_df, ht, c_date)
        a_inj = get_injury_features(injury_df, at, c_date)

        # --- In-season cumulative xG (from current season shots on target) ---
        # Uses shots on target as xG proxy: xG ≈ shots_on_target × 0.33
        # Resets every August — captures current-season style, not history
        # Zero for the first 3 matches (not enough data yet)
        MIN_MATCHES_XG = 3
        h_sot_s = season_sot.get(ht, {'sot_for': 0, 'sot_against': 0, 'matches': 0})
        a_sot_s = season_sot.get(at, {'sot_for': 0, 'sot_against': 0, 'matches': 0})
        h_m = max(h_sot_s['matches'], 1); a_m = max(a_sot_s['matches'], 1)

        h_xg_inseason  = (h_sot_s['sot_for']     * XG_PER_SOT / h_m) if h_sot_s['matches'] >= MIN_MATCHES_XG else 0.0
        h_xga_inseason = (h_sot_s['sot_against']  * XG_PER_SOT / h_m) if h_sot_s['matches'] >= MIN_MATCHES_XG else 0.0
        a_xg_inseason  = (a_sot_s['sot_for']      * XG_PER_SOT / a_m) if a_sot_s['matches'] >= MIN_MATCHES_XG else 0.0
        a_xga_inseason = (a_sot_s['sot_against']   * XG_PER_SOT / a_m) if a_sot_s['matches'] >= MIN_MATCHES_XG else 0.0

        # Lineup quality features — from actual starting XI market values
        h_lineup = get_lineup_features(lineup_df, ht, c_date, 'home')
        a_lineup = get_lineup_features(lineup_df, at, c_date, 'away')


        # Manager features
        h_mgr = get_manager_features(manager_dict, ht, c_date)
        a_mgr = get_manager_features(manager_dict, at, c_date)

        # --- League position (live table before this match) ---
        # Sort all teams by pts, then GD, then GF — standard PL tiebreakers
        all_season_teams = [t for t in season_pts if season_pts[t]['pts'] > 0 or
                           team_stats.get(t, {}).get('matches', 0) > 0]
        n_teams = max(len(all_season_teams), 1)

        def get_position(team):
            s = season_pts.get(team, {'pts': 0, 'gd': 0, 'gf': 0})
            return s['pts'], s['gd'], s['gf']

        if all_season_teams:
            sorted_teams = sorted(
                all_season_teams,
                key=lambda t: (season_pts[t]['pts'], season_pts[t]['gd'], season_pts[t]['gf']),
                reverse=True
            )
            pos_map = {t: i+1 for i, t in enumerate(sorted_teams)}
            home_pos = pos_map.get(ht, n_teams // 2)
            away_pos = pos_map.get(at, n_teams // 2)
        else:
            home_pos = away_pos = 10  # mid-table default at start of season

        home_pos_norm = home_pos / max(n_teams, 20)   # normalise to 0-1
        away_pos_norm = away_pos / max(n_teams, 20)
        pos_diff      = away_pos - home_pos            # positive = home team higher

        season_weight = get_season_weight(c_season, season_weights_map)
        home_strength = calculate_team_strength(h_stats, norm_factors)
        away_strength = calculate_team_strength(a_stats, norm_factors)

        # Weighted form (points per game × season weight)
        home_weighted_form = (h_stats.get('weighted_points', 0) / max(h_stats.get('weighted_matches', 0), 1)) * season_weight
        away_weighted_form = (a_stats.get('weighted_points', 0) / max(a_stats.get('weighted_matches', 0), 1)) * season_weight

        # Goals averages
        home_goals_avg     = h_stats.get('goals_for', 0)    / max(h_stats.get('matches', 0), 1)
        away_goals_avg     = a_stats.get('goals_for', 0)    / max(a_stats.get('matches', 0), 1)
        home_conceded_avg  = h_stats.get('goals_against', 0) / max(h_stats.get('matches', 0), 1)
        away_conceded_avg  = a_stats.get('goals_against', 0) / max(a_stats.get('matches', 0), 1)
        home_home_goals    = h_stats.get('home_goals_for', 0)    / max(h_stats.get('home_matches', 0), 1)
        home_home_conceded = h_stats.get('home_goals_against', 0) / max(h_stats.get('home_matches', 0), 1)
        away_away_goals    = a_stats.get('away_goals_for', 0)    / max(a_stats.get('away_matches', 0), 1)
        away_away_conceded = a_stats.get('away_goals_against', 0) / max(a_stats.get('away_matches', 0), 1)

        # Recent form (last 5 and last 10) — exponentially weighted so most recent match counts most
        # Weights decay by 0.5 per step: most recent = 0.5, next = 0.25, next = 0.125 etc.
        def exp_weighted_form(results):
            """Exponentially weighted average — most recent result weighted highest."""
            if not results:
                return 0.0
            weights = [0.5 ** (len(results) - i) for i in range(len(results))]
            total_w = sum(weights)
            return sum(r * w for r, w in zip(results, weights)) / total_w

        home_last5  = h_stats.get('last_5_results', [])[-5:]
        away_last5  = a_stats.get('last_5_results', [])[-5:]
        home_last10 = h_stats.get('last_10_results', [])[-10:]
        away_last10 = a_stats.get('last_10_results', [])[-10:]

        # Exponentially weighted form (primary — recency-sensitive)
        home_form5_exp  = exp_weighted_form(home_last5)
        away_form5_exp  = exp_weighted_form(away_last5)
        home_form10_exp = exp_weighted_form(home_last10)
        away_form10_exp = exp_weighted_form(away_last10)

        # Simple average form (kept for comparison — captures longer trend)
        home_form5  = sum(home_last5)  / max(len(home_last5), 1)
        away_form5  = sum(away_last5)  / max(len(away_last5), 1)
        home_form10 = sum(home_last10) / max(len(home_last10), 1)
        away_form10 = sum(away_last10) / max(len(away_last10), 1)

        # Recent goals (last 5) — also exponentially weighted
        home_recent_gf_list = h_stats.get('last_5_goals_for', [])[-5:]
        home_recent_ga_list = h_stats.get('last_5_goals_against', [])[-5:]
        away_recent_gf_list = a_stats.get('last_5_goals_for', [])[-5:]
        away_recent_ga_list = a_stats.get('last_5_goals_against', [])[-5:]
        home_recent_gf = exp_weighted_form(home_recent_gf_list)
        home_recent_ga = exp_weighted_form(home_recent_ga_list)
        away_recent_gf = exp_weighted_form(away_recent_gf_list)
        away_recent_ga = exp_weighted_form(away_recent_ga_list)

        # Shots averages (if shot data available)
        home_shots_avg  = h_stats.get('shots_for', 0) / max(h_stats.get('matches', 0), 1) if 'HS' in df else 0
        away_shots_avg  = a_stats.get('shots_for', 0) / max(a_stats.get('matches', 0), 1) if 'AS' in df else 0
        home_sot_avg    = h_stats.get('shots_on_target_for', 0) / max(h_stats.get('matches', 0), 1) if 'HST' in df else 0
        away_sot_avg    = a_stats.get('shots_on_target_for', 0) / max(a_stats.get('matches', 0), 1) if 'AST' in df else 0

        # Build the feature row for this match
        feature_row = {
            # --- Identity ---
            'Season': c_season, 'HomeTeam': ht, 'AwayTeam': at,
            'FTHG': hg, 'FTAG': ag, 'FTR': row['FTR'],

            # --- Elo ratings (lagged = previous season end, with regression) ---
            'home_elo_lagged':  home_elo_lagged,
            'away_elo_lagged':  away_elo_lagged,
            'elo_diff_lagged':  elo_diff_lagged,
            'elo_diff_abs':     abs(elo_diff_lagged),

            # --- Team strength ---
            'home_team_strength':   home_strength,
            'away_team_strength':   away_strength,
            'strength_difference':  home_strength - away_strength,

            # --- Goals averages ---
            'home_goals_avg':           home_goals_avg,
            'away_goals_avg':           away_goals_avg,
            'home_goals_conceded_avg':  home_conceded_avg,
            'away_goals_conceded_avg':  away_conceded_avg,
            'home_home_goals_avg':      home_home_goals,
            'home_home_conceded_avg':   home_home_conceded,
            'away_away_goals_avg':      away_away_goals,
            'away_away_conceded_avg':   away_away_conceded,
            'goals_avg_difference':     home_goals_avg - away_goals_avg,
            'attacking_strength_diff':  home_home_goals - away_away_conceded,
            'defensive_strength_diff':  home_home_conceded - away_away_goals,

            # --- Points and form ---
            'home_points':          h_stats.get('points', 0),
            'away_points':          a_stats.get('points', 0),
            'points_diff':          h_stats.get('points', 0) - a_stats.get('points', 0),
            'home_weighted_form':   home_weighted_form,
            'away_weighted_form':   away_weighted_form,
            'weighted_form_diff':   home_weighted_form - away_weighted_form,
            # Simple form (captures longer trend)
            'home_form_5':          home_form5,
            'away_form_5':          away_form5,
            'home_form_10':         home_form10,
            'away_form_10':         away_form10,
            'form_diff':            home_form5 - away_form5,
            # Exponential form (recency-sensitive — most recent match weighted highest)
            'home_form_5_exp':      home_form5_exp,
            'away_form_5_exp':      away_form5_exp,
            'home_form_10_exp':     home_form10_exp,
            'away_form_10_exp':     away_form10_exp,
            'form_diff_exp':        home_form5_exp - away_form5_exp,

            # --- Goal difference ---
            'home_goal_diff':       h_stats.get('goals_for', 0) - h_stats.get('goals_against', 0),
            'away_goal_diff':       a_stats.get('goals_for', 0) - a_stats.get('goals_against', 0),
            'goal_diff_advantage': (h_stats.get('goals_for', 0) - h_stats.get('goals_against', 0)) -
                                   (a_stats.get('goals_for', 0) - a_stats.get('goals_against', 0)),

            # --- Win rates ---
            'home_win_rate':      h_stats.get('wins', 0)       / max(h_stats.get('matches', 0), 1),
            'away_win_rate':      a_stats.get('wins', 0)       / max(a_stats.get('matches', 0), 1),
            'home_home_win_rate': h_stats.get('home_wins', 0)  / max(h_stats.get('home_matches', 0), 1),
            'away_away_win_rate': a_stats.get('away_wins', 0)  / max(a_stats.get('away_matches', 0), 1),

            # --- Recent goals ---
            'home_recent_goals_for':     home_recent_gf,
            'home_recent_goals_against': home_recent_ga,
            'away_recent_goals_for':     away_recent_gf,
            'away_recent_goals_against': away_recent_ga,

            # --- Streaks ---
            'home_win_streak':      h_stats.get('win_streak', 0),
            'home_unbeaten_streak': h_stats.get('unbeaten_streak', 0),
            'away_loss_streak':     a_stats.get('loss_streak', 0),
            'away_win_streak':      a_stats.get('win_streak', 0),

            # --- Defensive stats ---
            'home_clean_sheet_rate':    h_stats.get('clean_sheets', 0)   / max(h_stats.get('matches', 0), 1),
            'away_failed_to_score_rate': a_stats.get('failed_to_score', 0) / max(a_stats.get('matches', 0), 1),

            # --- Home/away specific goals ---
            'home_home_goals_for':     h_stats.get('home_goals_for', 0),
            'home_home_goals_against': h_stats.get('home_goals_against', 0),
            'away_away_goals_for':     a_stats.get('away_goals_for', 0),
            'away_away_goals_against': a_stats.get('away_goals_against', 0),

            # --- Match count ---
            'home_matches_played': h_stats.get('matches', 0),
            'away_matches_played': a_stats.get('matches', 0),

            # --- Head-to-head, rest, referee, shots ---
            **h2h,
            'home_rest_days':       hr_d,
            'away_rest_days':       ar_d,
            'rest_days_advantage':  hr_d - ar_d,
            **ref_s,
            'home_shots_avg':           home_shots_avg,
            'away_shots_avg':           away_shots_avg,
            'home_shots_on_target_avg': home_sot_avg,
            'away_shots_on_target_avg': away_sot_avg,

            # --- Expected Goals (xG) from previous season ---
            'home_xg':   h_xg['xg'],  'away_xg':   a_xg['xg'],
            'home_xga':  h_xg['xga'], 'away_xga':  a_xg['xga'],
            'home_xpts': h_xg['xpts'],'away_xpts': a_xg['xpts'],
            'xg_diff':   h_xg['xg']  - a_xg['xg'],
            'xga_diff':  h_xg['xga'] - a_xg['xga'],
            'xpts_diff': h_xg['xpts']- a_xg['xpts'],

            # --- Draw-specific features ---
            'h2h_draw_rate':         h2h.get('h2h_draws', 0) / max(h2h.get('h2h_matches_count', 0), 1),
            'elo_closeness':         1.0 / (1.0 + abs(elo_diff_lagged) / 100.0),
            'home_draw_rate':        h_stats.get('draws', 0) / max(h_stats.get('matches', 0), 1),
            'away_draw_rate':        a_stats.get('draws', 0) / max(a_stats.get('matches', 0), 1),
            'combined_draw_tendency':(h_stats.get('draws', 0) + a_stats.get('draws', 0)) /
                                     max(h_stats.get('matches', 0) + a_stats.get('matches', 0), 1),
            'home_low_scoring':      1.0 / (1.0 + home_goals_avg),
            'away_low_scoring':      1.0 / (1.0 + away_goals_avg),
            'points_proximity':      1.0 / (1.0 + abs(h_stats.get('points', 0) - a_stats.get('points', 0))),
            'gd_proximity':          1.0 / (1.0 + abs(
                                         (h_stats.get('goals_for', 0) - h_stats.get('goals_against', 0)) -
                                         (a_stats.get('goals_for', 0) - a_stats.get('goals_against', 0)))),
            # --- Manager features ---
            'home_days_with_manager':  h_mgr['days_with_manager'],
            'away_days_with_manager':  a_mgr['days_with_manager'],
            'home_new_manager':        h_mgr['new_manager_flag'],
            'away_new_manager':        a_mgr['new_manager_flag'],
            'home_manager_honeymoon':  h_mgr['manager_honeymoon'],
            'away_manager_honeymoon':  a_mgr['manager_honeymoon'],

            # --- League position features ---
            'home_league_position':  home_pos,
            'away_league_position':  away_pos,
            'home_pos_normalised':   home_pos_norm,
            'away_pos_normalised':   away_pos_norm,
            'position_diff':         pos_diff,   # positive = home team ranked higher
            'home_injured_count':    h_inj['injured_count'],
            'away_injured_count':    a_inj['injured_count'],
            'injury_count_diff':     h_inj['injured_count'] - a_inj['injured_count'],
            'home_key_injured':      h_inj['key_injured'],
            'away_key_injured':      a_inj['key_injured'],
            'key_injury_diff':       h_inj['key_injured'] - a_inj['key_injured'],
            'home_injured_severity': h_inj['injured_severity'],
            'away_injured_severity': a_inj['injured_severity'],
            'injury_severity_diff':  h_inj['injured_severity'] - a_inj['injured_severity'],

            # --- In-season cumulative xG features ---
            'home_xg_inseason':   h_xg_inseason,
            'away_xg_inseason':   a_xg_inseason,
            'xg_inseason_diff':   h_xg_inseason  - a_xg_inseason,
            'home_xga_inseason':  h_xga_inseason,
            'away_xga_inseason':  a_xga_inseason,
            'xga_inseason_diff':  h_xga_inseason - a_xga_inseason,

            # --- Lineup quality features (starting XI market values) ---
            'home_xi_avg_value':     h_lineup['xi_avg_value'],
            'away_xi_avg_value':     a_lineup['xi_avg_value'],
            'xi_avg_value_diff':     h_lineup['xi_avg_value']   - a_lineup['xi_avg_value'],
            'home_xi_total_value':   h_lineup['xi_total_value'],
            'away_xi_total_value':   a_lineup['xi_total_value'],
            'xi_total_value_diff':   h_lineup['xi_total_value'] - a_lineup['xi_total_value'],
            'home_xi_top3_value':    h_lineup['xi_top3_value'],
            'away_xi_top3_value':    a_lineup['xi_top3_value'],
            'xi_top3_value_diff':    h_lineup['xi_top3_value']  - a_lineup['xi_top3_value'],
            'home_xi_stars':         h_lineup['xi_stars'],
            'away_xi_stars':         a_lineup['xi_stars'],
            'xi_stars_diff':         h_lineup['xi_stars']       - a_lineup['xi_stars'],
        }

        # Betting odds implied probabilities
        def odds_to_prob(h, d, a):
            try:
                h,d,a = float(h or 0),float(d or 0),float(a or 0)
                if h<=0 or d<=0 or a<=0: return 0.45,0.27,0.28
                total = 1/h+1/d+1/a
                return round((1/h)/total,4),round((1/d)/total,4),round((1/a)/total,4)
            except: return 0.45,0.27,0.28

        b365_hp,b365_dp,b365_ap = odds_to_prob(
            row.get('B365H'), row.get('B365D'), row.get('B365A')
        )
        avg_hp,avg_dp,avg_ap = odds_to_prob(
            row.get('AvgH'), row.get('AvgD'), row.get('AvgA')
        )
        feature_row['b365_prob_H']     = b365_hp
        feature_row['b365_prob_D']     = b365_dp
        feature_row['b365_prob_A']     = b365_ap
        feature_row['avg_prob_H']      = avg_hp
        feature_row['avg_prob_D']      = avg_dp
        feature_row['avg_prob_A']      = avg_ap
        feature_row['market_draw_avg'] = round((b365_dp+avg_dp)/2,4)
        feature_row['odds_H_D_diff']   = round(b365_hp-b365_dp,4)
        feature_row['odds_A_D_diff']   = round(b365_ap-b365_dp,4)

        # --- Draw enhancements ---
        feature_row['home_draw_streak']    = sum(1 for r in reversed(home_last5) if r == 1)
        feature_row['away_draw_streak']    = sum(1 for r in reversed(away_last5) if r == 1)
        feature_row['home_form_draw_rate'] = sum(1 for r in home_last5 if r == 1) / max(len(home_last5), 1)
        feature_row['away_form_draw_rate'] = sum(1 for r in away_last5 if r == 1) / max(len(away_last5), 1)
        feature_row['combined_form_draw']  = (sum(1 for r in home_last5 if r == 1) +
                                               sum(1 for r in away_last5 if r == 1)) / \
                                               max(len(home_last5) + len(away_last5), 1)
        feature_row['defensive_matchup']   = (1 / (1 + home_goals_avg)) * (1 / (1 + away_goals_avg))
        feature_row['attacking_balance']   = abs(home_goals_avg - away_goals_avg)
        feature_row['season_stage']        = idx / max(len(df), 1)
        feature_row['both_low_scoring']    = 1 if home_goals_avg < 1.2 and away_goals_avg < 1.2 else 0
        feature_row['ref_draw_rate']       = ref_s.get('ref_draw_rate', 0.27)

        features.append(feature_row)
        result = row['FTR']

        # Update live league table after recording features (no lookahead)
        if ht not in season_pts: season_pts[ht] = {'pts': 0, 'gd': 0, 'gf': 0}
        if at not in season_pts: season_pts[at] = {'pts': 0, 'gd': 0, 'gf': 0}
        gd_h = hg - ag
        if result == 'H':
            season_pts[ht]['pts'] += 3
        elif result == 'D':
            season_pts[ht]['pts'] += 1
            season_pts[at]['pts'] += 1
        else:
            season_pts[at]['pts'] += 3
        season_pts[ht]['gd'] += gd_h;  season_pts[ht]['gf'] += hg
        season_pts[at]['gd'] -= gd_h;  season_pts[at]['gf'] += ag

        # Update in-season shots on target tracker (no lookahead)
        h_sot_val = int(row.get('HST', 0)) if not pd.isna(row.get('HST', np.nan)) else 0
        a_sot_val = int(row.get('AST', 0)) if not pd.isna(row.get('AST', np.nan)) else 0
        if ht not in season_sot: season_sot[ht] = {'sot_for': 0, 'sot_against': 0, 'matches': 0}
        if at not in season_sot: season_sot[at] = {'sot_for': 0, 'sot_against': 0, 'matches': 0}
        season_sot[ht]['sot_for']     += h_sot_val
        season_sot[ht]['sot_against'] += a_sot_val
        season_sot[ht]['matches']     += 1
        season_sot[at]['sot_for']     += a_sot_val
        season_sot[at]['sot_against'] += h_sot_val
        season_sot[at]['matches']     += 1

        def update_stats(team_name, goals_for, goals_against, is_home, result, weight, shots, shots_on_target):
            """Update running stats for a team after a match."""
            st = team_stats[team_name]
            st['matches']         += 1
            st['goals_for']       += goals_for
            st['goals_against']   += goals_against
            st['weighted_matches']+= weight
            st['last_5_goals_for']     = (st.get('last_5_goals_for', [])     + [goals_for])[-5:]
            st['last_5_goals_against'] = (st.get('last_5_goals_against', []) + [goals_against])[-5:]

            if shots is not None and not pd.isna(shots):
                st['shots_for'] += int(shots)
            if shots_on_target is not None and not pd.isna(shots_on_target):
                st['shots_on_target_for'] += int(shots_on_target)

            if is_home:
                st['home_matches']     += 1
                st['home_goals_for']   += goals_for
                st['home_goals_against']+= goals_against
            else:
                st['away_matches']     += 1
                st['away_goals_for']   += goals_for
                st['away_goals_against']+= goals_against

            won = (is_home and result == 'H') or (not is_home and result == 'A')
            lost = (is_home and result == 'A') or (not is_home and result == 'H')

            if won:
                points_earned, result_points = 3, 3
                st['wins'] += 1
                st['win_streak'] += 1
                st['unbeaten_streak'] += 1
                st['loss_streak'] = 0
                if is_home: st['home_wins'] += 1
                else:       st['away_wins'] += 1
            elif result == 'D':
                points_earned, result_points = 1, 1
                st['draws'] += 1
                st['win_streak'] = 0
                st['unbeaten_streak'] += 1
                st['loss_streak'] = 0
                if is_home: st['home_draws'] += 1
                else:       st['away_draws'] += 1
            else:
                points_earned, result_points = 0, 0
                st['losses'] += 1
                st['win_streak'] = 0
                st['unbeaten_streak'] = 0
                st['loss_streak'] += 1
                if is_home: st['home_losses'] += 1
                else:       st['away_losses'] += 1

            st['points']           += points_earned
            st['weighted_points']  += points_earned * weight
            st['last_5_results']   = (st.get('last_5_results',  []) + [result_points])[-5:]
            st['last_10_results']  = (st.get('last_10_results', []) + [result_points])[-10:]
            if goals_against == 0: st['clean_sheets'] += 1
            if goals_for == 0:     st['failed_to_score'] += 1

        home_shots, away_shots     = row.get('HS'),  row.get('AS')
        home_sot,   away_sot       = row.get('HST'), row.get('AST')
        update_stats(ht, hg, ag, True,  result, season_weight, home_shots, home_sot)
        update_stats(at, ag, hg, False, result, season_weight, away_shots, away_sot)

        # Update live Elo ratings
        new_home_elo, new_away_elo = calculate_elo_update(
            live_elo_ratings.get(ht, 1500),
            live_elo_ratings.get(at, 1500),
            hg, ag
        )
        live_elo_ratings[ht] = new_home_elo
        live_elo_ratings[at] = new_away_elo

    # --- Store final Elo ratings for the *last* season processed ---
    final_season_in_df = df['Season'].iloc[-1]
    print(f"   Storing final Elo ratings for {final_season_in_df}...")
    final_elo_by_season[final_season_in_df] = live_elo_ratings.copy()
    # -------------------------------------------------------------

    features_df = pd.DataFrame(features)
    num_core_features = len([c for c in features_df.columns if c not in ['Season','HomeTeam','AwayTeam','FTR','FTHG','FTAG','Date']])
    print(f"\n   Feature creation complete. Features: {num_core_features}. Total matches processed: {len(features_df)}")
    return features_df

# ===== (!!!) UPDATED: ADD ADVANCED FEATURES (LAGGED ELO + ODDS) (!!!) =====
def add_advanced_features(features_df):
    """Add sophisticated interaction features, using LAGGED Elo and Odds."""
    print("   Adding advanced features (LAGGED ELO + ODDS)...")
    
    # --- (!!!) NEW FEATURE: Absolute Odds Difference (!!!) ---
    if 'b365_prob_H' in features_df.columns and 'b365_prob_A' in features_df.columns:
        features_df['odds_H_A_diff_abs'] = (features_df['b365_prob_H'] - features_df['b365_prob_A']).abs()
    # --------------------------------------------------------

    required = ['home_form_5','home_form_10','away_form_5','away_form_10','home_goals_avg','home_xg','away_goals_avg','away_xg','home_clean_sheet_rate','home_goals_conceded_avg','away_failed_to_score_rate','away_goals_conceded_avg',
                'home_elo_lagged', 'away_elo_lagged', 'b365_prob_H', 'b365_prob_D', 'b365_prob_A',
                'away_team_strength','home_team_strength','home_win_streak','home_unbeaten_streak','away_win_streak','home_xg','home_xga','away_xg','away_xga','home_home_win_rate','home_win_rate','away_away_win_rate','away_win_rate','home_home_goals_avg','home_shots_avg','away_away_goals_avg','away_shots_avg']
    missing = [c for c in required if c not in features_df];
    if missing: print(f"Warning: Missing cols for adv features: {missing}")
    def safe_calc(df, col1, col2, new_col, operation):
        if col1 in df and col2 in df:
             c1 = pd.to_numeric(df[col1], errors='coerce'); c2 = pd.to_numeric(df[col2], errors='coerce')
             if operation == 'subtract': df[new_col] = c1 - c2
             elif operation == 'divide': df[new_col] = c1 / (c2 + 1e-6)
    
    safe_calc(features_df, 'home_form_5', 'home_form_10', 'home_form_momentum', 'subtract')
    safe_calc(features_df, 'away_form_5', 'away_form_10', 'away_form_momentum', 'subtract')
    if 'home_goals_avg' in features_df and 'home_xg' in features_df: features_df['home_xg_overperformance'] = pd.to_numeric(features_df['home_goals_avg'],errors='coerce')-pd.to_numeric(features_df['home_xg'],errors='coerce').fillna(0)
    if 'away_goals_avg' in features_df and 'away_xg' in features_df: features_df['away_xg_overperformance'] = pd.to_numeric(features_df['away_goals_avg'],errors='coerce')-pd.to_numeric(features_df['away_xg'],errors='coerce').fillna(0)
    if 'home_clean_sheet_rate' in features_df and 'home_goals_conceded_avg' in features_df: features_df['home_def_rating'] = pd.to_numeric(features_df['home_clean_sheet_rate'],errors='coerce')*.5+(1/(1+pd.to_numeric(features_df['home_goals_conceded_avg'],errors='coerce')+1e-6))*.5
    if 'away_failed_to_score_rate' in features_df and 'away_goals_conceded_avg' in features_df: features_df['away_def_rating']=(1-pd.to_numeric(features_df['away_failed_to_score_rate'],errors='coerce'))*.5+(1/(1+pd.to_numeric(features_df['away_goals_conceded_avg'],errors='coerce')+1e-6))*.5
    
    safe_calc(features_df, 'away_elo_lagged', 'home_elo_lagged', 'fixture_difficulty_elo_lagged', 'subtract')
    safe_calc(features_df, 'away_team_strength', 'home_team_strength', 'fixture_difficulty_strength', 'subtract')
    
    if all(c in features_df for c in ['home_win_streak','home_unbeaten_streak','home_form_5']):
        features_df['home_momentum']=pd.to_numeric(features_df['home_win_streak'],errors='coerce')*.4+pd.to_numeric(features_df['home_unbeaten_streak'],errors='coerce')*.3+pd.to_numeric(features_df['home_form_5'],errors='coerce')*.3
    if all(c in features_df for c in ['away_win_streak','away_form_5']):
        features_df['away_momentum']=pd.to_numeric(features_df['away_win_streak'],errors='coerce')*.4+pd.to_numeric(features_df['away_form_5'],errors='coerce')*.6
    
    if 'home_xg' in features_df and 'home_xga' in features_df: features_df['home_xg_bal']=pd.to_numeric(features_df['home_xg'],errors='coerce').fillna(0)-pd.to_numeric(features_df['home_xga'],errors='coerce').fillna(0)
    if 'away_xg' in features_df and 'away_xga' in features_df: features_df['away_xg_bal']=pd.to_numeric(features_df['away_xg'],errors='coerce').fillna(0)-pd.to_numeric(features_df['away_xga'],errors='coerce').fillna(0)
    safe_calc(features_df, 'home_xg_bal', 'away_xg_bal', 'xg_balance_diff', 'subtract')
    safe_calc(features_df, 'home_home_win_rate', 'home_win_rate', 'home_ha_bias', 'subtract')
    safe_calc(features_df, 'away_away_win_rate', 'away_win_rate', 'away_aa_bias', 'subtract')
    safe_calc(features_df, 'home_home_goals_avg', 'home_shots_avg', 'home_scoring_eff', 'divide')
    safe_calc(features_df, 'away_away_goals_avg', 'away_shots_avg', 'away_scoring_eff', 'divide')
    
    # Calculate Elo-based probabilities (independent of betting odds)
    if all(c in features_df for c in ['home_elo_lagged','away_elo_lagged']):
        features_df['elo_prob_H'] = 1.0 / (1.0 + 10**((features_df['away_elo_lagged'] - features_df['home_elo_lagged']) / 400.0))
        features_df['elo_prob_A'] = 1.0 / (1.0 + 10**((features_df['home_elo_lagged'] - features_df['away_elo_lagged']) / 400.0))
        features_df['elo_prob_D'] = 1.0 - features_df['elo_prob_H'] - features_df['elo_prob_A']
        # Odds-based value features removed for academic integrity
    
    print("   Advanced features added."); return features_df
# ==========================================================
# ===== DIXON-COLES GOAL MODEL =====
from scipy.optimize import minimize
from scipy.stats import poisson

class DixonColesModel:
    def __init__(self):
        self.attack  = {}
        self.defence = {}
        self.home_adv = 1.0
        self.rho      = -0.1
        self.teams    = []
        self.fitted   = False

    def _dc_correction(self, x, y, mu, lam, rho):
        if x == 0 and y == 0:   return 1 - mu * lam * rho
        elif x == 1 and y == 0: return 1 + lam * rho
        elif x == 0 and y == 1: return 1 + mu * rho
        elif x == 1 and y == 1: return 1 - rho
        else:                   return 1.0

    def _neg_log_likelihood(self, params, matches, teams):
        n = len(teams)
        attack   = {t: params[i]     for i, t in enumerate(teams)}
        defence  = {t: params[n + i] for i, t in enumerate(teams)}
        home_adv = params[2 * n]
        rho      = params[2 * n + 1]
        log_lik  = 0.0
        for _, row in matches.iterrows():
            ht, at = row['HomeTeam'], row['AwayTeam']
            hg, ag = int(row['FTHG']), int(row['FTAG'])
            if ht not in attack or at not in attack: continue
            mu  = attack[ht]  * defence[at] * home_adv
            lam = attack[at]  * defence[ht]
            if mu <= 0 or lam <= 0: return 1e9
            tau = self._dc_correction(hg, ag, mu, lam, rho)
            if tau <= 0: return 1e9
            log_lik += np.log(tau) + poisson.logpmf(hg, mu) + poisson.logpmf(ag, lam)
        return -log_lik

    def fit(self, matches_df):
        print("\n   Fitting Dixon-Coles model...")
        self.teams = sorted(list(set(matches_df['HomeTeam']) | set(matches_df['AwayTeam'])))
        n  = len(self.teams)
        x0 = np.array([1.0] * n + [1.0] * n + [1.1, -0.1])
        bounds = [(0.1, 5.0)] * n + [(0.1, 5.0)] * n + [(0.5, 2.0), (-0.99, 0.99)]
        result = minimize(self._neg_log_likelihood, x0, args=(matches_df, self.teams),
                          method='L-BFGS-B', bounds=bounds, options={'maxiter': 500})
        if result.success or result.fun < 1e8:
            params = result.x
            self.attack   = {t: params[i]     for i, t in enumerate(self.teams)}
            self.defence  = {t: params[n + i] for i, t in enumerate(self.teams)}
            self.home_adv = params[2 * n]
            self.rho      = params[2 * n + 1]
            self.fitted   = True
            print(f"   Dixon-Coles fitted. Home adv: {self.home_adv:.3f}, Rho: {self.rho:.4f}")
        else:
            print(f"   WARNING: Dixon-Coles failed: {result.message}")
            self.fitted = False

    def draw_probability(self, home_team, away_team, max_goals=6):
        if not self.fitted: return 0.0
        if home_team not in self.attack or away_team not in self.attack: return 0.0
        mu  = self.attack[home_team] * self.defence[away_team] * self.home_adv
        lam = self.attack[away_team] * self.defence[home_team]
        return sum(self._dc_correction(k, k, mu, lam, self.rho) *
                   poisson.pmf(k, mu) * poisson.pmf(k, lam) for k in range(max_goals + 1))


# ===== TRAIN/ANALYZE/SIMULATE/EVALUATE/SAVE =====
def train_ensemble_model(train_df, draw_weight=1.5):
    """Trains XGBoost with manually tuned hyperparameters."""
    print(f"\nTraining XGBoost model on {len(train_df)} matches..."); from collections import Counter; from sklearn.impute import SimpleImputer; from sklearn.preprocessing import LabelEncoder
    exclude=['Season','HomeTeam','AwayTeam','FTR','FTHG','FTAG','Date']; f_cols=[c for c in train_df if c not in exclude]
    X=train_df[f_cols].replace([np.inf,-np.inf],np.nan); y=train_df['FTR']; imp=None
    if X.isnull().sum().sum()>0:
        print(f"   Warning: NaNs found in training features. Imputing with mean.")
        imp=SimpleImputer(strategy='mean'); X_imp=imp.fit_transform(X); X=pd.DataFrame(X_imp, columns=f_cols, index=X.index)
    cnt=Counter(y); tot=sum(cnt.values()); print(f"   Dist: H={cnt.get('H',0)}({cnt.get('H',0)/tot:.1%}), D={cnt.get('D',0)}({cnt.get('D',0)/tot:.1%}), A={cnt.get('A',0)}({cnt.get('A',0)/tot:.1%})")
    scl=StandardScaler(); X_sc=scl.fit_transform(X)

    le=LabelEncoder(); y_enc=le.fit_transform(y)

    xgb_model=XGBClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=4,
        min_child_weight=10,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=2.0,
        objective='multi:softprob',
        num_class=3,
        random_state=42,
        n_jobs=-1,
        eval_metric='mlogloss'
    )

    print("   Fitting...")
    try:
        # Draw weights: boost draw samples to improve draw prediction
        sample_weights = np.where(y == 'D', draw_weight, 1.0)
        xgb_model.fit(X_sc, y_enc, sample_weight=sample_weights)
    except Exception as e:

        print(f"   Error during model fitting: {e}"); return None, None, None, None

    # Wrapper so the rest of the code (predict/predict_proba) gets H/D/A string labels back
    class LabelWrappedXGB:
        def __init__(self, model, encoder):
            self._model = model; self._le = encoder
            self.classes_ = encoder.classes_
        def predict(self, X):
            return self._le.inverse_transform(self._model.predict(X).astype(int))
        def predict_proba(self, X):
            return self._model.predict_proba(X)
        @property
        def feature_importances_(self):
            return self._model.feature_importances_

    model = LabelWrappedXGB(xgb_model, le)
    y_p=model.predict(X_sc); acc=accuracy_score(y,y_p); print(f"   Train Acc: {acc:.3f}"); return model, f_cols, scl, imp

def analyze_feature_importance(model, f_cols, top_n=30):
    """Analyzes and prints feature importances from XGBoost."""
    print("\nAnalyzing feature importance..."); imp_df = None
    if model is None or f_cols is None: print("   Model/features missing."); return None
    try:
        imps, valid = [], 0
        if hasattr(model, 'estimators_') and model.estimators_:
            for est in model.estimators_:
                if hasattr(est,'feature_importances_'):
                    imp=est.feature_importances_
                    if imp.sum()>0: imps.append(imp/imp.sum()); valid+=1
        if valid > 0: avg_imp = np.mean(imps, axis=0)
        elif hasattr(model,'feature_importances_'):
            avg_imp=model.feature_importances_
            if avg_imp.sum()>0: avg_imp=avg_imp/avg_imp.sum()
            else: print("   Warning: Direct importances sum to zero."); return None
        else: print("   Cannot get importances."); return None
        
        f_cols_actual = f_cols
        if len(f_cols_actual) != len(avg_imp):
             model_features_in = getattr(model, 'feature_names_in_', None)
             if model_features_in is not None and len(model_features_in) == len(avg_imp):
                 f_cols_actual = model_features_in
             else:
                print(f"   ERROR: Feature/importance length mismatch. Feats={len(f_cols_actual)}, Imps={len(avg_imp)}.");
                return None
        
        imp_df=pd.DataFrame({'Feature':f_cols_actual,'Importance':avg_imp}).sort_values('Importance',ascending=False)
        print(f"\n{'='*110}\nTOP {top_n} Features (XGBoost)\n{'='*110}");
        print(imp_df.head(top_n).to_string(index=False,float_format='{:.4f}'.format));
        print(f"{'='*110}");
    except Exception as e: print(f"   Error analyzing: {e}")
    return imp_df


def simulate_season_monte_carlo(model, f_cols, scaler, imputer, test_df, n_sim=2000):
    """Runs the Monte Carlo simulation."""
    print(f"\nRunning {n_sim} simulations...")
    if model is None or f_cols is None or scaler is None or test_df.empty: print(" Missing inputs."); return (None,)*6
    X = test_df[f_cols].replace([np.inf,-np.inf],np.nan)
    if imputer and X.isnull().sum().sum()>0: X_imp = imputer.transform(X); X = pd.DataFrame(X_imp, columns=f_cols, index=X.index)
    try: X_sc=scaler.transform(X)
    except Exception as e: print(f" Scaling error: {e}"); return (None,)*6
    try: probs_all=model.predict_proba(X_sc); classes=model.classes_; assert probs_all.shape[0]==len(test_df); assert len(classes)==3
    except Exception as e: print(f" Probability error: {e}"); return (None,)*6
    teams=sorted(list(set(test_df['HomeTeam'])|set(test_df['AwayTeam']))); n_t=len(teams)
    wins,pts_all,pos_c=defaultdict(int),defaultdict(list),defaultdict(lambda:defaultdict(int))
    UF,MIN_P=0.08,0.02; print(f" Simulating {len(test_df)} matches...")
    for s in range(n_sim):
        if (s+1)%(n_sim//5 or 1)==0: print(f"  Sim {s+1}/{n_sim}...") # Print more often
        pts,gd,gf={t:0 for t in teams},{t:0 for t in teams},{t:0 for t in teams}
        for i,(_,r) in enumerate(test_df.iterrows()):
            ht,at=r['HomeTeam'],r['AwayTeam']; p=probs_all[i].copy()
            if np.random.random()<UF: nse=np.random.dirichlet([.8,1,1.2])*.3; p=p*.7+nse; p/=p.sum()
            p=np.maximum(p,MIN_P); p/=p.sum();
            try: out=np.random.choice(classes, p=p)
            except ValueError: out = classes[np.argmax(p)] # Fallback
            if out=='H': hg=np.random.choice([1,2,3,4],p=[.35,.35,.2,.1]);ag=np.random.choice([0,1,2],p=[.6,.3,.1]); hg=max(hg,ag+1); pts[ht]+=3
            elif out=='A': hg=np.random.choice([0,1,2],p=[.6,.3,.1]);ag=np.random.choice([1,2,3,4],p=[.35,.35,.2,.1]); ag=max(ag,hg+1); pts[at]+=3
            else: sc=np.random.choice([0,1,2,3],p=[.25,.4,.25,.1]); hg=ag=sc; pts[ht]+=1; pts[at]+=1
            gd[ht]+=(hg-ag); gd[at]+=(ag-hg); gf[ht]+=hg; gf[at]+=ag
        stnd=sorted(teams,key=lambda t:(pts.get(t,0),gd.get(t,0),gf.get(t,0)),reverse=True)
        if stnd: wins[stnd[0]]+=1;
        for pos,t in enumerate(stnd,1): pos_c[t][pos]+=1
        for t in teams: pts_all[t].append(pts.get(t,0))
    print(" Aggregating..."); win_p,avg_p,std_p,avg_pos,t4_p,rel_p={},{},{},{},{},{}
    for t in teams: win_p[t]=(wins.get(t,0)/n_sim)*100; p_l=pts_all.get(t,[0]); avg_p[t]=np.mean(p_l); std_p[t]=np.std(p_l); pc=pos_c.get(t,{}); avg_pos[t]=sum(p*c for p,c in pc.items())/sum(pc.values()) if pc else n_t; t4_p[t]=(sum(c for p,c in pc.items() if p<=4)/n_sim)*100; rel_p[t]=(sum(c for p,c in pc.items() if p>n_t-3)/n_sim)*100
    print(" Aggregation done."); return win_p,avg_p,std_p,avg_pos,t4_p,rel_p

def create_win_probability_standings(wp,ap,sp,apos,t4p,rp):
    """Creates the predicted standings DataFrame."""
    if not all([wp,ap,sp,apos,t4p,rp]): return pd.DataFrame()
    t=list(ap.keys()); nt=len(t);
    data=[{'Team':x,'Win Probability (%)':wp.get(x,0),'Top 4 Prob (%)':t4p.get(x,0),'Avg Points':ap.get(x,0),'Points Std Dev':sp.get(x,0),'Avg Position':apos.get(x,nt),'Relegation Prob (%)':rp.get(x,0)} for x in t]
    df=pd.DataFrame(data).sort_values(['Avg Points','Win Probability (%)'],ascending=[False,False]).reset_index(drop=True); df.index+=1; return df

def display_win_probability_standings(df):
    """Displays the predicted standings."""
    if df is None or df.empty: print("\nNo standings."); return
    print("\n"+"="*110+"\nPREDICTED STANDINGS\n"+"="*110);
    header = f"{'Pos':<5} {'Team':<25} {'Win %':<10} {'Top 4%':<10} {'Avg Pts':<10} {'+/-Std':<8} {'Avg Pos':<10} {'Rel %':<8}"
    print(header); print("-"*len(header))
    for i,r in df.iterrows(): print(f"{i:<5} {r['Team']:<25} {r['Win Probability (%)']:>6.2f}%   {r['Top 4 Prob (%)']:>6.2f}%   {r['Avg Points']:>6.1f}    +/-{r['Points Std Dev']:>4.1f}   {r['Avg Position']:>6.1f}    {r['Relegation Prob (%)']:>5.2f}%")
    print("="*len(header))

def calculate_model_accuracy(model, f_cols, scaler, imputer, df, name="Dataset"):
    """Calculates match outcome accuracy."""
    print(f"\nCalculating {name} Accuracy...")
    if model is None or f_cols is None or scaler is None or df.empty: print(" Missing inputs."); return {'overall_accuracy':0,'home_win_accuracy':0,'away_win_accuracy':0,'draw_accuracy':0,'total_matches':0}
    X = df[f_cols].replace([np.inf,-np.inf],np.nan); y=df['FTR']
    if imputer and X.isnull().sum().sum()>0: X_imp=imputer.transform(X); X=pd.DataFrame(X_imp,columns=f_cols,index=X.index)
    try: X_sc=scaler.transform(X)
    except Exception as e: print(f" Scaling error: {e}"); return {'overall_accuracy':0,'home_win_accuracy':0,'away_win_accuracy':0,'draw_accuracy':0,'total_matches':0}
    try: y_p=model.predict(X_sc)
    except Exception as e: print(f" Prediction error: {e}"); return {'overall_accuracy':0,'home_win_accuracy':0,'away_win_accuracy':0,'draw_accuracy':0,'total_matches':0}
    acc=accuracy_score(y,y_p); hm,am,dm=(y=='H'),(y=='A'),(y=='D')
    h_acc=accuracy_score(y[hm],y_p[hm]) if hm.sum()>0 else 0; a_acc=accuracy_score(y[am],y_p[am]) if am.sum()>0 else 0; d_acc=accuracy_score(y[dm],y_p[dm]) if dm.sum()>0 else 0
    print(f"   {name} - N:{len(y)} Acc:{acc:.3f} | H:{h_acc:.3f}({hm.sum()}) A:{a_acc:.3f}({am.sum()}) D:{d_acc:.3f}({dm.sum()})")
    return {'overall_accuracy':acc,'home_win_accuracy':h_acc,'away_win_accuracy':a_acc,'draw_accuracy':d_acc,'total_matches':len(y)}

def calculate_standings(matches_df):
    """Calculates actual standings from a match DataFrame."""
    if matches_df is None or matches_df.empty: print("Warning: No match data for standings."); return pd.DataFrame()
    req = ['HomeTeam', 'AwayTeam', 'FTHG', 'FTAG', 'FTR'];
    if not all(c in matches_df.columns for c in req): print(f"Error: Missing cols for standings: {req}"); return pd.DataFrame()
    teams = sorted(list(set(matches_df['HomeTeam'].unique())|set(matches_df['AwayTeam'].unique()))); standings=[]
    for team in teams:
        home, away = matches_df[matches_df['HomeTeam']==team], matches_df[matches_df['AwayTeam']==team]
        pts, W, D, L, GF, GA = 0,0,0,0,0,0
        for _, m in home.iterrows():
            try: gf,ga,res=int(m['FTHG']),int(m['FTAG']),m['FTR']; GF+=gf; GA+=ga
            except: continue
            if res=='H': pts+=3; W+=1
            elif res=='D': pts+=1; D+=1
            else: L+=1
        for _, m in away.iterrows():
            try: gf,ga,res=int(m['FTAG']),int(m['FTHG']),m['FTR']; GF+=gf; GA+=ga
            except: continue
            if res=='A': pts+=3; W+=1
            elif res=='D': pts+=1; D+=1
            else: L+=1
        standings.append({'Team':team,'Played':len(home)+len(away),'Won':W,'Draw':D,'Lost':L,'GF':GF,'GA':GA,'GD':GF-GA,'Points':pts})
    df = pd.DataFrame(standings).sort_values(['Points','GD','GF'],ascending=[False,False,False]).reset_index(drop=True); df.index+=1; return df

def combine_predicted_actual(pred_df, actual_df):
    """Combines predicted and actual standings."""
    if pred_df is None or pred_df.empty or actual_df is None or actual_df.empty: return pd.DataFrame()
    actual = actual_df[['Team','Points','GD']].copy(); actual['Final Position']=actual_df.index
    actual.columns=['Team','Final Points','Goal Difference','Final Position']
    pred = pred_df[['Team']].copy(); pred['Predicted Position']=pred_df.index
    merged = actual.merge(pred, on='Team', how='left'); n_teams=len(actual)
    merged['Predicted Position']=merged['Predicted Position'].fillna(n_teams)
    merged['Final Position']=pd.to_numeric(merged['Final Position'],errors='coerce')
    merged['Predicted Position']=pd.to_numeric(merged['Predicted Position'],errors='coerce')
    merged['Difference +/-']=merged['Predicted Position']-merged['Final Position']
    merged = merged[['Team','Final Position','Final Points','Goal Difference','Predicted Position','Difference +/-']].sort_values('Final Position').reset_index(drop=True)
    return merged

def evaluate_standing_accuracy(comp_table):
    """Evaluates standings accuracy."""
    if comp_table is None or comp_table.empty: return {'Top 4 Accuracy':"N/A",'Relegation Accuracy':"N/A",'Within +/-2 Positions':"N/A"}
    n=len(comp_table); top4_act=set(comp_table.loc[comp_table['Final Position'].dropna()<=4,'Team']); top4_pred=set(comp_table.loc[comp_table['Predicted Position'].dropna()<=4,'Team'])
    top4_corr=len(top4_act.intersection(top4_pred)); top4_str=f"{top4_corr}/4 ({(top4_corr/4)*100:.1f}%)"
    rel_pos=n-2; rel_act=set(comp_table.loc[comp_table['Final Position'].dropna()>=rel_pos,'Team']); rel_pred=set(comp_table.loc[comp_table['Predicted Position'].dropna()>=rel_pos,'Team'])
    rel_corr=len(rel_act.intersection(rel_pred)); rel_str=f"{rel_corr}/3 ({(rel_corr/3)*100:.1f}%)"
    comp_table['Difference +/-']=pd.to_numeric(comp_table['Difference +/-'],errors='coerce')
    within_2=(comp_table['Difference +/-'].dropna().abs()<=2).sum(); within_2_str=f"{within_2}/{n} ({(within_2/n)*100:.1f}%)"
    return {'Top 4 Accuracy':top4_str,'Relegation Accuracy':rel_str,'Within +/-2 Positions':within_2_str}

# ===== TIME-SERIES CROSS-VALIDATION =====
def run_cross_validation(master_df):
    """
    Walk-forward cross-validation with rolling 6-season Train / Val / Test splits.
    Each fold trains on exactly 6 seasons, giving 3 folds total.

    Fold 1: Train 2015-16 to 2020-21  |  Val 2021-22  |  Test 2022-23
    Fold 2: Train 2016-17 to 2021-22  |  Val 2022-23  |  Test 2023-24
    Fold 3: Train 2017-18 to 2022-23  |  Val 2023-24  |  Test 2024-25  ← matches main split
    """
    from sklearn.impute import SimpleImputer
    from sklearn.preprocessing import LabelEncoder

    all_seasons = ['2015-16','2016-17','2017-18','2018-19','2019-20','2020-21','2021-22','2022-23','2023-24','2024-25']
    exclude = ['Season','HomeTeam','AwayTeam','FTR','FTHG','FTAG','Date']
    TRAIN_WINDOW = 6
    folds = []
    for i in range(len(all_seasons) - TRAIN_WINDOW - 1):
        train_seasons = all_seasons[i : i + TRAIN_WINDOW]
        val_season    = all_seasons[i + TRAIN_WINDOW]
        test_season   = all_seasons[i + TRAIN_WINDOW + 1]
        folds.append((train_seasons, val_season, test_season))

    print("\n" + "="*110)
    print("TIME-SERIES CROSS-VALIDATION (Rolling 6-Season Window — Train / Val / Test)")
    print("="*110)
    print(f"{'Fold':<6} {'Train Seasons':<35} {'Val':<12} {'Test':<12} {'Val Acc':>8} {'Test Acc':>9} {'H Acc':>7} {'A Acc':>7} {'D Acc':>7}")
    print("-"*110)

    fold_results = []

    for fold_num, (train_seasons, val_season, test_season) in enumerate(folds, 1):
        train_df = master_df[master_df['Season'].isin(train_seasons)].copy()
        val_df   = master_df[master_df['Season'] == val_season].copy()
        test_df  = master_df[master_df['Season'] == test_season].copy()

        if train_df.empty or val_df.empty or test_df.empty:
            print(f"  Fold {fold_num}: Skipped (insufficient data)")
            continue

        feature_cols = [c for c in train_df.columns if c not in exclude]

        # Impute
        X_train = train_df[feature_cols].replace([np.inf,-np.inf], np.nan)
        X_val   = val_df[feature_cols].replace([np.inf,-np.inf], np.nan)
        X_test  = test_df[feature_cols].replace([np.inf,-np.inf], np.nan)

        imp = SimpleImputer(strategy='mean')
        X_train = pd.DataFrame(imp.fit_transform(X_train), columns=feature_cols)
        X_val   = pd.DataFrame(imp.transform(X_val),   columns=feature_cols)
        X_test  = pd.DataFrame(imp.transform(X_test),  columns=feature_cols)

        # Scale
        scl = StandardScaler()
        X_train_sc = scl.fit_transform(X_train)
        X_val_sc   = scl.transform(X_val)
        X_test_sc  = scl.transform(X_test)

        # Encode labels
        y_train = train_df['FTR']; y_val = val_df['FTR']; y_test = test_df['FTR']
        le = LabelEncoder(); y_train_enc = le.fit_transform(y_train)

        # Train XGBoost (same config as main model)
        fold_model = XGBClassifier(
            n_estimators=300, learning_rate=0.05, max_depth=4,
            min_child_weight=10, subsample=0.8, colsample_bytree=0.8,
            reg_alpha=0.1, reg_lambda=2.0,
            objective='multi:softprob', num_class=3,
            random_state=42, n_jobs=-1, eval_metric='mlogloss'
        )
        # Draw weight fixed at 1.5— consistent with main model
        draw_sw = np.where(y_train == 'D', 1.5, 1.0)
        fold_model.fit(X_train_sc, y_train_enc, sample_weight=draw_sw)

        def predict_labels(model, le, X_sc):
            return le.inverse_transform(model.predict(X_sc).astype(int))

        # Evaluate
        val_pred  = predict_labels(fold_model, le, X_val_sc)
        test_pred = predict_labels(fold_model, le, X_test_sc)

        val_acc  = accuracy_score(y_val,  val_pred)
        test_acc = accuracy_score(y_test, test_pred)

        hm = (y_test == 'H'); am = (y_test == 'A'); dm = (y_test == 'D')
        h_acc = accuracy_score(y_test[hm], test_pred[hm]) if hm.sum() > 0 else 0
        a_acc = accuracy_score(y_test[am], test_pred[am]) if am.sum() > 0 else 0
        d_acc = accuracy_score(y_test[dm], test_pred[dm]) if dm.sum() > 0 else 0

        train_str = f"{train_seasons[0]} to {train_seasons[-1]}"
        print(f"  {fold_num:<4} {train_str:<35} {val_season:<12} {test_season:<12} {val_acc:>7.1%} {test_acc:>8.1%} {h_acc:>6.1%} {a_acc:>6.1%} {d_acc:>6.1%}")

        fold_results.append({
            'fold': fold_num, 'train': train_str,
            'val_season': val_season, 'test_season': test_season,
            'val_acc': val_acc, 'test_acc': test_acc,
            'h_acc': h_acc, 'a_acc': a_acc, 'd_acc': d_acc
        })

    if fold_results:
        avg_val  = np.mean([r['val_acc']  for r in fold_results])
        avg_test = np.mean([r['test_acc'] for r in fold_results])
        avg_h    = np.mean([r['h_acc']    for r in fold_results])
        avg_a    = np.mean([r['a_acc']    for r in fold_results])
        avg_d    = np.mean([r['d_acc']    for r in fold_results])
        std_test = np.std([r['test_acc']  for r in fold_results])

        print("-"*110)
        print(f"  {'AVG':<4} {'':<35} {'':<12} {'':<12} {avg_val:>7.1%} {avg_test:>8.1%} {avg_h:>6.1%} {avg_a:>6.1%} {avg_d:>6.1%}")
        print(f"  {'STD':<4} {'':<35} {'':<12} {'':<12} {'':>7} {std_test:>8.1%}")
        print("="*110)
        print(f"\n  ✓ Average Test Accuracy across {len(fold_results)} folds: {avg_test:.1%} ± {std_test:.1%}")
        print(f"  ✓ Average Validation Accuracy:                          {avg_val:.1%}")
        print(f"  ✓ Each fold trains on exactly 6 seasons — more training data per fold.")
        print("="*110)

    return fold_results



# ===== LOAD PLAYER STATS =====
def load_player_stats(outfield_file, gk_file):
    """Load outfield and goalkeeper stats for 2024-25 analytics."""
    SQUAD_MAP = {
        'Manchester Utd':  'Manchester United',
        'Newcastle Utd':   'Newcastle',
        "Nott'ham Forest": "Nott'm Forest",
        'Ipswich Town':    'Ipswich',
        'Leicester City':  'Leicester',
    }

    out_df, gk_df = None, None

    if os.path.exists(outfield_file):
        out_df = pd.read_csv(outfield_file, encoding='utf-8-sig')
        for col in ['goals','assists','xg','tackles','tackles_won','interceptions',
                    'clearances','errors','aerials_won','aerials_won_pct',
                    'pass_completion_pct','take_ons_successful','take_on_succ_pct',
                    'shot_creating_actions','goal_creating_actions','progressive_carries',
                    'progressive_passes','yellow_cards','red_cards','mins_played','mp',
                    'sca_per_90','ninety_mins_played','fouls','fouls_drawn','shots',
                    'shots_on_target','carries_into_penalty_area','passes_into_penalty_area',
                    'tackles_interceptions','progressive_passes_received']:
            if col in out_df.columns:
                out_df[col] = pd.to_numeric(out_df[col], errors='coerce').fillna(0)
        out_df['squad'] = out_df['squad'].replace(SQUAD_MAP)
        print(f"   Outfield stats loaded: {len(out_df)} players")
    else:
        print(f"   Warning: Outfield stats file not found.")

    if os.path.exists(gk_file):
        gk_df = pd.read_csv(gk_file, encoding='utf-8-sig')
        for col in ['save_pct','clean_sheets','clean_sheet_pct','post_shot_xg_minus_ga',
                    'crosses_stopped_pct','defensive_opa_per_90','saves','goals_against',
                    'mp','min','ga_per_90','launch_pct','avg_pass_length',
                    'post_shot_xg_minus_ga_per_90']:
            if col in gk_df.columns:
                gk_df[col] = pd.to_numeric(gk_df[col], errors='coerce').fillna(0)
        gk_df['squad'] = gk_df['squad'].replace(SQUAD_MAP)
        print(f"   Goalkeeper stats loaded: {len(gk_df)} goalkeepers")
    else:
        print(f"   Warning: GK stats file not found.")

    return out_df, gk_df


# ===== PLAYER ANALYTICS =====
def get_player_analytics(out_df, gk_df, team):
    strengths, weaknesses = [], []

    # ── GOALKEEPER ────────────────────────────────────────────────────────────
    if gk_df is not None:
        gk_team = gk_df[gk_df['squad'] == team].copy()
        if not gk_team.empty:
            min_col = 'min' if 'min' in gk_team.columns else 'mp'
            main_gk  = gk_team.loc[gk_team[min_col].idxmax()]
            name     = main_gk['player'].split()[-1]  # surname only
            sp       = float(main_gk.get('save_pct', 0))
            xg_diff  = float(main_gk.get('post_shot_xg_minus_ga', 0))
            sweeper  = float(main_gk.get('defensive_opa_per_90', 0))
            _raw_crosses = float(main_gk.get('crosses_stopped_pct', 0))
            crosses  = min(_raw_crosses, 100.0)
            crosses_valid = (_raw_crosses <= 100.0)  # False when data is corrupt

            if sp >= 72 and xg_diff >= 2:
                strengths.append(f"{name} — elite shot-stopper, consistently saves more than expected")
            elif sp >= 70:
                strengths.append(f"{name} — reliable presence between the posts, solid throughout")
            elif sp < 65:
                weaknesses.append(f"{name} — unconvincing between the posts, below par this season")

            if xg_diff <= -3:
                weaknesses.append(f"{name} — conceding more than he should, poor on shot-stopping")

            if sweeper >= 1.5:
                strengths.append(f"{name} — aggressive sweeper keeper, commands his area well")

            if crosses >= 12:
                strengths.append(f"{name} — commanding in the air, deals well with crosses")
            elif crosses <= 5:
                weaknesses.append(f"{name} — unconvincing when dealing with crosses into the box")

    # ── OUTFIELD ──────────────────────────────────────────────────────────────
    if out_df is None:
        return strengths, weaknesses

    squad = out_df[out_df['squad'] == team].copy()
    if squad.empty:
        return strengths, weaknesses

    reg = squad[squad['mins_played'] >= 500].copy()
    if reg.empty:
        reg = squad[squad['mp'] >= 8].copy()
    if reg.empty:
        return strengths, weaknesses

    def sname(full): return full.split()[-1]

    # ── DEFENDERS ─────────────────────────────────────────────────────────────
    defn = reg[reg['position'].str.contains('DF', na=False) &
               ~reg['position'].str.contains('FW', na=False)]

    if not defn.empty:
        top_aerial = defn.loc[defn['aerials_won'].idxmax()]
        if top_aerial['aerials_won'] >= 80:
            strengths.append(
                f"{sname(top_aerial['player'])} — dominant aerially, rarely beaten in the air")
        elif top_aerial['aerials_won_pct'] < 45 and top_aerial['aerials_won'] >= 30:
            weaknesses.append(
                f"Defensive line weak in the air — {sname(top_aerial['player'])} struggles in aerial duels")

        total_errors = int(defn['errors'].sum())
        worst_err = defn.loc[defn['errors'].idxmax()]
        if total_errors >= 8:
            weaknesses.append(
                f"Defensive errors a persistent concern — {sname(worst_err['player'])} most culpable")

        def_reds = int(defn['red_cards'].sum())
        def_yellows = int(defn['yellow_cards'].sum())
        if def_reds >= 2:
            weaknesses.append("Defensive discipline a problem — reckless challenges costing the team")
        elif def_yellows >= 25:
            weaknesses.append("Back line prone to rash challenges — poor discipline throughout")

        top_carry = defn.loc[defn['progressive_carries'].idxmax()]
        if top_carry['progressive_carries'] >= 40:
            strengths.append(
                f"{sname(top_carry['player'])} — carries the ball confidently from deep, a constant outlet")

        avg_pass = defn['pass_completion_pct'].mean()
        if avg_pass >= 85:
            strengths.append("Back line composed in possession — rarely gives the ball away cheaply")
        elif avg_pass < 72:
            weaknesses.append("Sloppy in possession from the back — defenders prone to misplaced passes")

    # ── MIDFIELDERS ───────────────────────────────────────────────────────────
    mids = reg[reg['position'].str.contains('MF', na=False)]

    if not mids.empty:
        top_creator = mids.loc[mids['goal_creating_actions'].idxmax()]
        if top_creator['goal_creating_actions'] >= 8:
            strengths.append(
                f"{sname(top_creator['player'])} — creative force, constantly unlocking defences")

        top_tackle = mids.loc[mids['tackles_won'].idxmax()]
        if top_tackle['tackles_won'] >= 50:
            strengths.append(
                f"{sname(top_tackle['player'])} — tireless in the press, wins the ball back constantly")
        elif mids['tackles_won'].sum() < 60:
            weaknesses.append("Midfield too easy to bypass — limited defensive work rate")

        top_prog = mids.loc[mids['progressive_passes'].idxmax()]
        if top_prog['progressive_passes'] >= 100:
            strengths.append(
                f"{sname(top_prog['player'])} — dictates tempo, consistently moves the ball forward")

        top_dribble = mids.loc[mids['take_ons_successful'].idxmax()]
        if top_dribble['take_ons_successful'] >= 30:
            strengths.append(
                f"{sname(top_dribble['player'])} — dangerous with the ball, takes players on with confidence")

    # ── ATTACKERS ─────────────────────────────────────────────────────────────
    fwds = reg[reg['position'].str.contains('FW', na=False) | 
           reg['position'].str.contains('MF,FW|FW,MF', na=False)]

    if not fwds.empty:
        top_scorer = fwds.loc[fwds['goals'].idxmax()]
        xg_diff    = top_scorer['goals'] - top_scorer['xg']

        if top_scorer['goals'] >= 15:
            if xg_diff > 2:
                strengths.append(
                    f"{sname(top_scorer['player'])} — clinical in front of goal, finishes above expectation")
            else:
                strengths.append(
                    f"{sname(top_scorer['player'])} — prolific and consistent, reliable goal threat all season")
        elif top_scorer['goals'] >= 8:
            strengths.append(
                f"{sname(top_scorer['player'])} — productive forward, consistent contributor up front")
        else:
            total_team_goals = int(squad['goals'].sum()) if 'goals' in squad.columns else 0
            if total_team_goals < 45:
                weaknesses.append(
                    f"Forwards struggle to convert — attack lacks a reliable goalscorer")

        if xg_diff <= -4:
            weaknesses.append(
                f"{sname(top_scorer['player'])} — wasteful in front of goal, missing chances he should score")

        top_sca = fwds.loc[fwds['shot_creating_actions'].idxmax()]
        if top_sca['shot_creating_actions'] >= 60:
            strengths.append(
                f"{sname(top_sca['player'])} — constantly creates danger, difficult to contain")

    # ── SQUAD DEPTH ───────────────────────────────────────────────────────────
    contributors = len(reg[(reg['goals'] + reg['assists']) >= 4])
    if contributors >= 8:
        strengths.append("Goals spread across the squad — opponents cannot focus on one threat")
    elif contributors <= 2:
        weaknesses.append("Over-reliant on individuals — too few players contributing goals and assists")

    def _dedup(lst):
        seen, out = set(), []
        for item in lst:
            key = item.split(' —')[0].strip()
            if key not in seen:
                out.append(item)
                seen.add(key)
        return out
    # Remove contradictions — same player in both S and W
    s_keys = {s.split(' —')[0].strip() for s in strengths}
    w_keys = {w.split(' —')[0].strip() for w in weaknesses}
    conflicts = s_keys & w_keys
    strengths = [s for s in strengths if s.split(' —')[0].strip() not in conflicts]
    weaknesses = [w for w in weaknesses if w.split(' —')[0].strip() not in conflicts]
    return _dedup(strengths)[:5], _dedup(weaknesses)[:5]


def get_team_scout_report(out_df, gk_df, team, team_cs_actual=None):
    """Generate FM-style scout report sections for dashboard."""
    report = {'attacking': [], 'defensive': [], 'gk': [], 'discipline': []}

    if out_df is not None:
        squad = out_df[out_df['squad'] == team].copy()
        if not squad.empty:
            reg = squad[squad['mins_played'] >= 500].copy()
            if reg.empty:
                reg = squad[squad['mp'] >= 8].copy()

            if not reg.empty:
                def sname(full): return full.split()[-1]

                # ── ATTACKING ────────────────────────────────────────────────
                if 'goals' in reg.columns:
                    top = reg.loc[reg['goals'].idxmax()]
                    g = int(top['goals'])
                    xg = float(top.get('xg', 0) or 0)
                    diff = round(g - xg, 1)
                    if abs(diff) <= 0.5:
                        xg_note = "in line with xG"
                    else:
                        sign = '+' if diff > 0 else ''
                        xg_note = f"{sign}{diff} vs xG"
                    report['attacking'].append(
                        f"Top scorer: {sname(top['player'])} — {g} goals ({xg_note})")

                if 'shots_on_target' in reg.columns and 'goals' in reg.columns:
                    total_sot = reg['shots_on_target'].sum()
                    total_goals = reg['goals'].sum()
                    if total_sot > 0:
                        conv = round(total_goals / total_sot * 100, 1)
                        report['attacking'].append(
                            f"Shot conversion: {conv}% of shots on target converted to goals")

                if 'shot_creating_actions' in reg.columns and 'ninety_mins_played' in reg.columns:
                    total_sca = reg['shot_creating_actions'].sum()
                    total_90s = max(reg['ninety_mins_played'].sum(), 1)
                    sca_p90 = round(total_sca / total_90s, 2)
                    report['attacking'].append(
                        f"Shot-creating actions: {sca_p90} per 90 mins (squad average)")

                if 'carries_into_penalty_area' in reg.columns:
                    top_c = reg.loc[reg['carries_into_penalty_area'].idxmax()]
                    cpa = int(top_c['carries_into_penalty_area'])
                    if cpa >= 5:
                        report['attacking'].append(
                            f"Most dangerous carrier: {sname(top_c['player'])} — {cpa} carries into penalty area")

                if 'passes_into_penalty_area' in reg.columns:
                    top_p = reg.loc[reg['passes_into_penalty_area'].idxmax()]
                    ppa = int(top_p['passes_into_penalty_area'])
                    if ppa >= 5:
                        report['attacking'].append(
                            f"Most threatening passer: {sname(top_p['player'])} — {ppa} passes into penalty area")

                # ── DEFENSIVE ────────────────────────────────────────────────
                if 'tackles' in reg.columns and 'interceptions' in reg.columns:
                    defmid = reg[reg['position'].str.contains('DF|MF', na=False)]
                    if not defmid.empty:
                        total_ti = int(defmid['tackles'].sum() + defmid['interceptions'].sum())
                        report['defensive'].append(
                            f"Tackles + interceptions: {total_ti} total (defenders & midfielders)")

                if 'aerials_won' in reg.columns and 'aerials_won_pct' in reg.columns:
                    aerial_reg = reg[reg['aerials_won'] >= 10]
                    if not aerial_reg.empty:
                        avg_pct = round(aerial_reg['aerials_won_pct'].mean(), 1)
                        total_won = int(reg['aerials_won'].sum())
                        report['defensive'].append(
                            f"Aerial duels: {avg_pct}% win rate — {total_won} won this season")

                if 'errors' in reg.columns:
                    total_errors = int(reg['errors'].sum())
                    report['defensive'].append(
                        f"Errors leading to shots: {total_errors} this season")

                if 'progressive_passes_received' in reg.columns:
                    fwds = reg[reg['position'].str.contains('FW', na=False) | 
           reg['position'].str.contains('MF,FW|FW,MF', na=False)]
                    if not fwds.empty:
                        top_recv = fwds.loc[fwds['progressive_passes_received'].idxmax()]
                        ppr = int(top_recv['progressive_passes_received'])
                        report['defensive'].append(
                            f"Most progressive passes received: {sname(top_recv['player'])} — {ppr}")

                # ── DISCIPLINE ───────────────────────────────────────────────
                if 'yellow_cards' in reg.columns and 'red_cards' in reg.columns:
                    total_y = int(reg['yellow_cards'].sum())
                    total_r = int(reg['red_cards'].sum())
                    fouls_str = ''
                    if 'fouls' in reg.columns:
                        total_f = int(reg['fouls'].sum())
                        fouls_str = f", {total_f} fouls committed"
                    report['discipline'].append(f"Cards: {total_y} yellows, {total_r} reds{fouls_str}")

                if 'fouls_drawn' in reg.columns:
                    top_fd = reg.loc[reg['fouls_drawn'].idxmax()]
                    fd = int(top_fd['fouls_drawn'])
                    if fd >= 20:
                        report['discipline'].append( f"Most fouls won: {sname(top_fd['player'])} — {fd} (dangerous in transition)")

                if 'yellow_cards' in reg.columns:
                    total_matches = 38
                    y_p90 = round(reg['yellow_cards'].sum() / total_matches, 2)
                    report['discipline'].append(f"Disciplinary rate: {y_p90} yellows per match (squad average)")

    # ── GOALKEEPER ───────────────────────────────────────────────────────────
    if gk_df is not None:
        gk_team = gk_df[gk_df['squad'] == team].copy()
        if not gk_team.empty:
            min_col = 'min' if 'min' in gk_team.columns else 'mp'
            main_gk   = gk_team.loc[gk_team[min_col].idxmax()]
            name      = main_gk['player'].split()[-1]
            sp        = float(main_gk.get('save_pct', 0) or 0)
            xg_diff   = float(main_gk.get('post_shot_xg_minus_ga', 0) or 0)
            sweeper   = float(main_gk.get('defensive_opa_per_90', 0) or 0)
            _raw_crosses_val = float(main_gk.get('crosses_stopped_pct', 0) or 0)
            crosses   = min(_raw_crosses_val, 100.0)
            crosses_display = f"{crosses:.1f}%" if _raw_crosses_val <= 100.0 else "—"
            launch    = float(main_gk.get('launch_pct', 0) or 0)
            avg_len   = float(main_gk.get('avg_pass_length', 0) or 0)
            cs        = int(main_gk.get('clean_sheets', 0) or 0)
            cs_pct    = float(main_gk.get('clean_sheet_pct', 0) or 0)
            ga_p90    = float(main_gk.get('ga_per_90', 0) or 0)

            # Check for backup GK clean sheets
            backup = gk_team[gk_team['player'] != main_gk['player']]
            raw_backup_cs = int(backup['clean_sheets'].sum()) if not backup.empty else 0
            gk_cs_total = cs + raw_backup_cs
            # If match data shows more CS than GK records, attribute gap to rotation
            if team_cs_actual is not None and team_cs_actual > gk_cs_total:
                backup_cs = team_cs_actual - cs
            else:
                backup_cs = raw_backup_cs
            cs_note = f" + {backup_cs} from rotation" if backup_cs > 0 else ""
            report['gk'].append(
                f"{name}: {sp:.1f}% save rate — {cs} clean sheets ({cs_pct:.1f}%){cs_note}")
            sign = '+' if xg_diff >= 0 else ''
            report['gk'].append(
                f"Post-shot xG: {sign}{xg_diff:.2f} ({'saving above' if xg_diff >= 0 else 'conceding above'} expectation)")
            report['gk'].append(
                f"Goals allowed: {ga_p90:.2f} per 90 mins")
            report['gk'].append(
                f"Sweeping: {sweeper:.2f} defensive actions outside box per 90")
            report['gk'].append(
                f"Crosses claimed: {crosses_display}  |  Long ball rate: {launch:.1f}%  |  Avg pass: {avg_len:.1f} yds")

    return report
    
def print_team_analyst_report(test_df, dc_model, out_df=None, gk_df=None):
    """Prints unified analyst report — results + style + players all merged."""
    print(f"\n{'='*110}")
    print(f"TEAM ANALYST REPORTS — {TEST_SEASON}")
    print(f"{'='*110}")

    teams = sorted(list(set(test_df['HomeTeam']) | set(test_df['AwayTeam'])))

    for team in teams:
        home = test_df[test_df['HomeTeam'] == team]
        away = test_df[test_df['AwayTeam'] == team]
        total    = len(home) + len(away)
        wins     = int((home['FTR']=='H').sum()) + int((away['FTR']=='A').sum())
        draws    = int((home['FTR']=='D').sum()) + int((away['FTR']=='D').sum())
        losses   = total - wins - draws
        home_gf  = float(home['FTHG'].mean()) if len(home) > 0 else 0
        away_gf  = float(away['FTAG'].mean()) if len(away) > 0 else 0
        home_ga  = float(home['FTAG'].mean()) if len(home) > 0 else 0
        away_ga  = float(away['FTHG'].mean()) if len(away) > 0 else 0
        home_wr  = int((home['FTR']=='H').sum()) / max(len(home), 1)
        away_wr  = int((away['FTR']=='A').sum()) / max(len(away), 1)
        cs_rate  = (int((home['FTAG']==0).sum()) + int((away['FTHG']==0).sum())) / max(total, 1)
        dr_rate  = draws / max(total, 1)
        win_rate = wins / max(total, 1)
        avg_gf   = (float(home['FTHG'].sum()) + float(away['FTAG'].sum())) / max(total, 1)
        avg_ga   = (float(home['FTAG'].sum()) + float(away['FTHG'].sum())) / max(total, 1)
        dc_att   = round(float(dc_model.attack.get(team, 1.0)), 2) if dc_model.fitted else 1.0
        dc_def   = round(float(dc_model.defence.get(team, 1.0)), 2) if dc_model.fitted else 1.0

        # Results S/W
        s1, w1 = [], []
        if home_wr  >= 0.50: s1.append(f"Strong home record ({home_wr:.0%} win rate)")
        if away_wr  >= 0.40: s1.append(f"Solid away form ({away_wr:.0%} win rate)")
        if cs_rate  >= 0.35: s1.append(f"Defensively solid ({cs_rate:.0%} clean sheet rate)")
        if home_gf  >= 1.80: s1.append(f"Clinical at home ({home_gf:.1f} goals/game)")
        if away_gf  >= 1.50: s1.append(f"Goals away from home ({away_gf:.1f} goals/game)")
        if dc_att >= 1.40:
            if avg_gf >= 1.6 and win_rate >= 0.45:
                s1.append(f"Elite attack rating — Dixon-Coles: {dc_att:.2f}")
            else:
                s1.append(f"Strong historical attack rating — Dixon-Coles: {dc_att:.2f}")
        if dc_def   <= 0.80: s1.append(f"Excellent defensive shape — Dixon-Coles: {dc_def:.2f}")
        if win_rate >= 0.55: s1.append(f"Consistently winning ({win_rate:.0%} win rate)")
        if home_wr  <  0.30: w1.append(f"Struggles at home ({home_wr:.0%} win rate)")
        if away_wr  <  0.25: w1.append(f"Poor away record ({away_wr:.0%} win rate)")
        if cs_rate  <  0.20: w1.append(f"Defensive vulnerability ({cs_rate:.0%} clean sheets)")
        if home_ga  >= 1.50: w1.append(f"Concedes heavily at home ({home_ga:.1f}/game)")
        if away_ga  >= 1.80: w1.append(f"Leaky away defence ({away_ga:.1f}/game)")
        if dr_rate  >= 0.30: w1.append(f"Too many draws ({dr_rate:.0%} draw rate)")
        if home_gf  <  1.00: w1.append(f"Struggles to score at home ({home_gf:.1f} goals/game)")
        if away_gf  <  0.80: w1.append(f"Toothless away from home ({away_gf:.1f} goals/game)")
        if win_rate <  0.25: w1.append(f"Inconsistent overall ({win_rate:.0%} win rate)")
        if not s1: s1.append("Competitive performance across the season")
       

        # Style S/W
        s2, w2 = [], []
        if avg_gf >= 2.0:   s2.append(f"Highly attacking — {avg_gf:.1f} goals/game all season")
        elif avg_gf >= 1.6 and avg_gf > avg_ga: s2.append(f"Attack-minded team — {avg_gf:.1f} goals per game")
        elif avg_gf < 1.0:  w2.append(f"Toothless attack — only {avg_gf:.1f} goals per game")
        if avg_ga < 1.0:    s2.append(f"Defensively dominant — conceding just {avg_ga:.1f} goals/game")
        elif avg_ga < 1.3:  s2.append(f"Solid defensive unit — {avg_ga:.1f} goals conceded per game")
        elif avg_ga >= 1.8: w2.append(f"Defensively fragile — conceding {avg_ga:.1f} goals per game")
        had = home_wr - away_wr
        if had >= 0.25:              w2.append(f"Heavy home dependence — {home_wr:.0%} at home vs {away_wr:.0%} away")
        elif had <= -0.15:           s2.append(f"Strong travelling side — better away ({away_wr:.0%}) than home ({home_wr:.0%})")
        elif abs(had) <= 0.10 and win_rate >= 0.45: s2.append("Consistent everywhere — similar results home and away")
        if dr_rate >= 0.32:          w2.append(f"Struggle to convert performances into wins — {dr_rate:.0%} draw rate")
        elif dr_rate <= 0.15 and win_rate >= 0.45: s2.append("Clinical mentality — rarely draws, turns performances into wins")
        if cs_rate >= 0.40:          s2.append(f"Hard to break down — {cs_rate:.0%} clean sheet rate")
        elif cs_rate < 0.15:         w2.append(f"Cannot keep a clean sheet — only {cs_rate:.0%} of games shut out opponents")
        if dc_att >= 1.6 and dc_def <= 0.85:  s2.append(f"Complete team — elite attack ({dc_att}) and defence ({dc_def}) per Dixon-Coles")
        elif dc_att >= 1.6 and dc_def >= 1.1: w2.append(f"Attack-heavy but defensively exposed — DC: att {dc_att} / def {dc_def}")
        if not s2: s2.append("Balanced playing style with no dominant characteristic")
        if not w1: w1.append("Minor inconsistencies in certain areas")
        if not w2 and not w1:  # only fire when there are truly no weaknesses at all
            w2.append("No major tactical weaknesses identified")
        # Player S/W — merged in
        p_str, p_wk = get_player_analytics(out_df, gk_df, team)
        all_strengths = s1 + s2 + p_str
        all_weaknesses = w1 + w2 + p_wk

        # Print
        print(f"\n{'─'*110}")
        print(f"  {team.upper()}")
        print(f"  Record: {wins}W {draws}D {losses}L  |  "
              f"Home: {home_gf:.1f} scored / {home_ga:.1f} conceded  |  "
              f"Away: {away_gf:.1f} scored / {away_ga:.1f} conceded  |  "
              f"Clean Sheets: {cs_rate:.0%}  |  "
              f"DC Attack: {dc_att}  DC Defence: {dc_def}")
        print(f"{'─'*110}")
        print(f"  STRENGTHS")
        for s in all_strengths[:6]:
            print(f"    ✓  {s}")
        print(f"\n  WEAKNESSES")
        for w in all_weaknesses[:6]:
            print(f"    ✗  {w}")

    print(f"\n{'='*110}")



def export_to_csv(model, feature_cols, scaler, imputer,
                  test_df, pred_stand, actual_stand, dc_model,
                  fold_results, out_df, gk_df, base_path,
                  draw_model=None, draw_fcols=None, draw_scl=None, draw_imp=None):
    import os
    print("\nExporting results to CSV files...")
    out = os.path.join(base_path, 'outputs')
    os.makedirs(out, exist_ok=True)

    exclude = ['Season','HomeTeam','AwayTeam','FTR','FTHG','FTAG','Date']

    # ── Match Predictions ─────────────────────────────────────────────────────
    X_test = test_df[feature_cols].replace([np.inf,-np.inf], np.nan)
    if imputer and X_test.isnull().sum().sum() > 0:
        X_test = pd.DataFrame(imputer.transform(X_test), columns=feature_cols, index=X_test.index)
    y_test  = test_df['FTR'].values
    y_pred  = model.predict(scaler.transform(X_test))
    probs   = model.predict_proba(scaler.transform(X_test))
    classes = list(model.classes_)

    match_rows = []
    for i, (_, row) in enumerate(test_df.iterrows()):
        p = probs[i]
        match_rows.append({
            'Home':      row['HomeTeam'],
            'Away':      row['AwayTeam'],
            'Score':     f"{int(row['FTHG'])}-{int(row['FTAG'])}",
            'Actual':    row['FTR'],
            'Predicted': y_pred[i],
            'Correct':   row['FTR'] == y_pred[i],
            'H%':        round(p[classes.index('H')] * 100, 1),
            'D%':        round(p[classes.index('D')] * 100, 1),
            'A%':        round(p[classes.index('A')] * 100, 1),
        })
    pd.DataFrame(match_rows).to_csv(os.path.join(out, 'match_predictions.csv'), index=False)
    print(f"   match_predictions.csv — {len(match_rows)} matches")

    # ── Predicted Standings ───────────────────────────────────────────────────
    if pred_stand is not None and not pred_stand.empty:
        pred_stand.to_csv(os.path.join(out, 'predicted_standings.csv'), index=True)
        print(f"   predicted_standings.csv — {len(pred_stand)} teams")

    # ── Actual Standings ──────────────────────────────────────────────────────
    if actual_stand is not None and not actual_stand.empty:
        actual_stand.to_csv(os.path.join(out, 'actual_standings.csv'), index=True)
        print(f"   actual_standings.csv — {len(actual_stand)} teams")

    # ── Standings Comparison ──────────────────────────────────────────────────
    if pred_stand is not None and actual_stand is not None:
        comp_rows = []
        for i, r in actual_stand.iterrows():
            team = r['Team']
            pred_p = pred_stand[pred_stand['Team'] == team].index[0] if team in pred_stand['Team'].values else len(actual_stand)
            diff = int(pred_p) - int(i)
            comp_rows.append({
                'Team':           team,
                'Actual_Pos':     int(i),
                'Actual_Pts':     int(r['Points']),
                'Predicted_Pos':  int(pred_p),
                'Predicted_Pts':  round(pred_stand[pred_stand['Team'] == team]['Avg Points'].values[0], 1) if team in pred_stand['Team'].values else 0,
                'Diff':           diff,
                'Within_2':       abs(diff) <= 2,
            })
        pd.DataFrame(comp_rows).to_csv(os.path.join(out, 'standings_comparison.csv'), index=False)
        print(f"   standings_comparison.csv — {len(comp_rows)} teams")

    # ── Cross-Validation Results ──────────────────────────────────────────────
    if fold_results:
        cv_rows = []
        for r in fold_results:
            cv_rows.append({
                'Fold':        r['fold'],
                'Train':       r['train'],
                'Val_Season':  r['val_season'],
                'Test_Season': r['test_season'],
                'Val_Acc':     round(r['val_acc']  * 100, 1),
                'Test_Acc':    round(r['test_acc'] * 100, 1),
                'H_Acc':       round(r['h_acc']    * 100, 1),
                'A_Acc':       round(r['a_acc']    * 100, 1),
                'D_Acc':       round(r['d_acc']    * 100, 1),
            })
        pd.DataFrame(cv_rows).to_csv(os.path.join(out, 'cross_validation.csv'), index=False)
        print(f"   cross_validation.csv — {len(cv_rows)} folds")

    # ── Team Reports ──────────────────────────────────────────────────────────
    teams = sorted(list(set(test_df['HomeTeam']) | set(test_df['AwayTeam'])))
    report_rows = []

    for team in teams:
        home = test_df[test_df['HomeTeam'] == team]
        away = test_df[test_df['AwayTeam'] == team]
        total    = len(home) + len(away)
        wins     = int((home['FTR']=='H').sum()) + int((away['FTR']=='A').sum())
        draws    = int((home['FTR']=='D').sum()) + int((away['FTR']=='D').sum())
        losses   = total - wins - draws
        home_gf  = round(float(home['FTHG'].mean()), 2) if len(home) > 0 else 0
        away_gf  = round(float(away['FTAG'].mean()), 2) if len(away) > 0 else 0
        home_ga  = round(float(home['FTAG'].mean()), 2) if len(home) > 0 else 0
        away_ga  = round(float(away['FTHG'].mean()), 2) if len(away) > 0 else 0
        win_rate = wins / max(total, 1)
        home_wr  = int((home['FTR']=='H').sum()) / max(len(home), 1)
        away_wr  = int((away['FTR']=='A').sum()) / max(len(away), 1)
        cs_rate  = (int((home['FTAG']==0).sum()) + int((away['FTHG']==0).sum())) / max(total, 1)
        dr_rate  = draws / max(total, 1)
        avg_gf   = (float(home['FTHG'].sum()) + float(away['FTAG'].sum())) / max(total, 1)
        avg_ga   = (float(home['FTAG'].sum()) + float(away['FTHG'].sum())) / max(total, 1)
        dc_att   = round(float(dc_model.attack.get(team, 1.0)), 2) if dc_model.fitted else 1.0
        dc_def   = round(float(dc_model.defence.get(team, 1.0)), 2) if dc_model.fitted else 1.0

        s1, w1 = [], []
        if home_wr >= 0.50: s1.append(f"Strong home record ({home_wr:.0%} win rate)")
        if away_wr >= 0.40: s1.append(f"Solid away form ({away_wr:.0%} win rate)")
        if cs_rate >= 0.35: s1.append(f"Defensively solid ({cs_rate:.0%} clean sheet rate)")
        if home_gf >= 1.80: s1.append(f"Clinical at home ({home_gf:.1f} goals/game)")
        if away_gf >= 1.50: s1.append(f"Goals away from home ({away_gf:.1f} goals/game)")
        if dc_att  >= 1.40: s1.append(f"Elite attack rating — Dixon-Coles: {dc_att:.2f}")
        if dc_def  <= 0.80: s1.append(f"Excellent defensive shape — Dixon-Coles: {dc_def:.2f}")
        if win_rate>= 0.55: s1.append(f"Consistently winning ({win_rate:.0%} win rate)")
        if home_wr <  0.30: w1.append(f"Struggles at home ({home_wr:.0%} win rate)")
        if away_wr <  0.25: w1.append(f"Poor away record ({away_wr:.0%} win rate)")
        if cs_rate <  0.20: w1.append(f"Defensive vulnerability ({cs_rate:.0%} clean sheets)")
        if home_ga >= 1.50: w1.append(f"Concedes heavily at home ({home_ga:.1f}/game)")
        if away_ga >= 1.80: w1.append(f"Leaky away defence ({away_ga:.1f}/game)")
        if dr_rate >= 0.30: w1.append(f"Too many draws ({dr_rate:.0%} draw rate)")
        if home_gf <  1.00: w1.append(f"Struggles to score at home ({home_gf:.1f} goals/game)")
        if away_gf <  0.80: w1.append(f"Toothless away from home ({away_gf:.1f} goals/game)")
        if win_rate < 0.25: w1.append(f"Inconsistent overall ({win_rate:.0%} win rate)")
        if not s1: s1.append("Competitive performance across the season")
        if not w1: w1.append("Minor inconsistencies in certain areas")

        s2, w2 = [], []
        if avg_gf >= 2.0:   s2.append(f"Highly attacking — {avg_gf:.1f} goals/game all season")
        elif avg_gf >= 1.6: s2.append(f"Attack-minded team — {avg_gf:.1f} goals per game")
        elif avg_gf < 1.0:  w2.append(f"Toothless attack — only {avg_gf:.1f} goals per game")
        if avg_ga < 1.0:    s2.append(f"Defensively dominant — conceding just {avg_ga:.1f} goals/game")
        elif avg_ga < 1.3:  s2.append(f"Solid defensive unit — {avg_ga:.1f} goals conceded per game")
        elif avg_ga >= 1.8: w2.append(f"Defensively fragile — conceding {avg_ga:.1f} goals per game")
        had = home_wr - away_wr
        if had >= 0.25:   w2.append(f"Heavy home dependence — {home_wr:.0%} at home vs {away_wr:.0%} away")
        elif had <= -0.15: s2.append(f"Strong travelling side — better away ({away_wr:.0%}) than home ({home_wr:.0%})")
        elif abs(had) <= 0.10 and win_rate >= 0.45: s2.append("Consistent everywhere — similar results home and away")
        if dr_rate >= 0.32: w2.append(f"Struggle to convert performances into wins — {dr_rate:.0%} draw rate")
        elif dr_rate <= 0.15 and win_rate >= 0.45: s2.append("Clinical mentality — rarely draws, turns performances into wins")
        if cs_rate >= 0.40: s2.append(f"Hard to break down — {cs_rate:.0%} clean sheet rate")
        elif cs_rate < 0.15: w2.append(f"Cannot keep a clean sheet — only {cs_rate:.0%} of games shut out opponents")
        if dc_att >= 1.6 and dc_def <= 0.85: s2.append(f"Complete team — elite attack ({dc_att}) and defence ({dc_def}) per Dixon-Coles")
        elif dc_att >= 1.6 and dc_def >= 1.1: w2.append(f"Attack-heavy but defensively exposed — DC: att {dc_att} / def {dc_def}")
        if not s2: s2.append("Balanced playing style with no dominant characteristic")
        if not w2: w2.append("No major tactical weaknesses identified")
        report_rows.append({
            'Team':       team,
            'Wins':       wins,
            'Draws':      draws,
            'Losses':     losses,
            'Home_GF':    home_gf,
            'Away_GF':    away_gf,
            'Home_GA':    home_ga,
            'Away_GA':    away_ga,
            'Win_Rate':   round(win_rate, 3),
            'CS_Rate':    round(cs_rate, 3),
            'DC_Attack':  dc_att,
            'DC_Defence': dc_def,
            'Strengths':  ' | '.join(s1 + s2),
            'Weaknesses': ' | '.join(w1 + w2),
        })

    pd.DataFrame(report_rows).to_csv(os.path.join(out, 'team_reports.csv'), index=False)
    print(f"   team_reports.csv — {len(report_rows)} teams")

    # ── Analyst Reports (Season + Last 5) ─────────────────────────────────
    analyst_rows = []
    analyst_last5_rows = []

    for team in teams:
        s = compute_team_analyst_data(test_df, out_df, gk_df, team,
                                    raw_match_df=None, n_matches=None)
        l5 = compute_team_analyst_data(test_df, out_df, gk_df, team,
                                    raw_match_df=None, n_matches=5)

        def flatten(data, team_name):
            if not data:
                return {'Team': team_name}
            return {
                'Team':          team_name,
                'Matches':       data.get('total', 0),
                'Wins':          data.get('wins', 0),
                'Draws':         data.get('draws', 0),
                'Losses':        data.get('losses', 0),
                'Goals_For':     data.get('gf', 0),
                'Goals_Against': data.get('ga', 0),
                'GF_Per_Game':   data.get('gf_pm', 0),
                'GA_Per_Game':   data.get('ga_pm', 0),
                'SOT_Per_Game':  data.get('sot_pm', 0),
                'Opp_SOT_Per_Game': data.get('opp_sot_pm', 0),
                'Conversion_%':  data.get('conv_rate', 0),
                'Opp_Conv_%':    data.get('opp_conv', 0),
                'Clean_Sheets':  data.get('clean_sheets', 0),
                'Save_%':        data.get('save_pct', 0),
                'Carries_Box':   data.get('carries_box', 0),
                'Passes_Box':    data.get('passes_box', 0),
                'Errors':        data.get('errors', 0),
                'Tackles':       data.get('tackles', 0),
                'Interceptions': data.get('interceptions', 0),
                'Aerials_Won':   data.get('aerials', 0),
                'Top_Scorer':    data.get('top_scorer', ''),
                'Top_Assister':  data.get('top_assister', ''),
                'GK':            data.get('gk_name', ''),
                'Positives':     ' | '.join(f"{t}: {d}" for t, d in data.get('positives', [])),
                'Negatives':     ' | '.join(f"{t}: {d}" for t, d in data.get('negatives', [])),
            }

        analyst_rows.append(flatten(s, team))
        analyst_last5_rows.append(flatten(l5, team))

    pd.DataFrame(analyst_rows).to_csv(
        os.path.join(out, 'analyst_reports_season.csv'), index=False)
    print(f"   analyst_reports_season.csv — {len(analyst_rows)} teams")

    pd.DataFrame(analyst_last5_rows).to_csv(
        os.path.join(out, 'analyst_reports_last5.csv'), index=False)
    print(f"   analyst_reports_last5.csv — {len(analyst_last5_rows)} teams")
    # ── Draw Risk Predictions ─────────────────────────────────────────────────
    try:
        X_dr = test_df[draw_fcols].replace([np.inf,-np.inf], np.nan)
        if draw_imp and X_dr.isnull().sum().sum() > 0:
            X_dr = pd.DataFrame(draw_imp.transform(X_dr), columns=draw_fcols, index=X_dr.index)
        dr_probs = draw_model.predict_proba(draw_scl.transform(X_dr))
        d_idx = list(draw_model.classes_).index('D')

        dr_rows = []
        for i, (_, row) in enumerate(test_df.iterrows()):
            dp = dr_probs[i][d_idx]
            risk_label, risk_icon = get_draw_risk_label(dp)
            dr_rows.append({
                'Home':            row['HomeTeam'],
                'Away':            row['AwayTeam'],
                'Actual':          row['FTR'],
                'Predicted':       y_pred[i],
                'Correct':         row['FTR'] == y_pred[i],
                'Draw_Risk_Label': risk_label,
                'Draw_Risk_Prob':  round(dp * 100, 1),
                'Was_Draw':        row['FTR'] == 'D',
            })

        pd.DataFrame(dr_rows).to_csv(
            os.path.join(out, 'draw_risk_predictions.csv'), index=False)
        print(f"   draw_risk_predictions.csv — {len(dr_rows)} matches")
    except Exception as e:
        print(f"   Draw risk export failed: {e}")

    print(f"\n   All files saved → {out}")

def compute_team_analyst_data(test_df, out_df, gk_df, team, raw_match_df=None, n_matches=None):
    home = test_df[test_df['HomeTeam'] == team].copy()
    away = test_df[test_df['AwayTeam'] == team].copy()
    home['_gf'] = home['FTHG']; home['_ga'] = home['FTAG']; home['_side'] = 'home'
    away['_gf'] = away['FTAG']; away['_ga'] = away['FTHG']; away['_side'] = 'away'
    combined = pd.concat([home, away]).sort_index()
    if n_matches:
        combined = combined.tail(n_matches)
    total = len(combined)
    if total == 0: return None
    h = combined[combined['_side'] == 'home']
    a = combined[combined['_side'] == 'away']
    gf = int(combined['_gf'].sum()); ga = int(combined['_ga'].sum())
    wins = int((h['FTR']=='H').sum()) + int((a['FTR']=='A').sum())
    draws = int((combined['FTR']=='D').sum()); losses = total - wins - draws
    cs = int((combined['_ga']==0).sum())

    # ── Season total for player-stat per-game calcs (out_df is always full season) ──
    season_home = test_df[test_df['HomeTeam'] == team]
    season_away = test_df[test_df['AwayTeam'] == team]
    ptotal = max(len(season_home) + len(season_away), 1)

    # ── Shots from raw match df (test_df loses HS/HST during feature engineering) ──
    shots = sot = opp_shots = opp_sot = 0

    if raw_match_df is not None:
        rh = raw_match_df[raw_match_df['HomeTeam'] == team].copy()
        ra = raw_match_df[raw_match_df['AwayTeam'] == team].copy()
        if n_matches:
            # Filter to last n matches using match pairs from combined
            # (works without Date column — matches by HomeTeam/AwayTeam instead)
            last_home = combined[combined['_side'] == 'home'][['HomeTeam', 'AwayTeam']]
            last_away = combined[combined['_side'] == 'away'][['HomeTeam', 'AwayTeam']]
            rh = rh.merge(last_home, on=['HomeTeam', 'AwayTeam'], how='inner')
            ra = ra.merge(last_away, on=['HomeTeam', 'AwayTeam'], how='inner')
        def ss(df, col): return int(df[col].fillna(0).sum()) if col in df.columns else 0
        shots     = ss(rh, 'HS')  + ss(ra, 'AS')
        sot       = ss(rh, 'HST') + ss(ra, 'AST')
        opp_shots = ss(rh, 'AS')  + ss(ra, 'HS')
        opp_sot   = ss(rh, 'AST') + ss(ra, 'HST')

    carries_box=passes_box=take_ons=errors=tackles=interceptions=aerials=0
    top_scorer=top_assister=gk_name=''; save_pct=0.0
    if out_df is not None:
        sq = out_df[out_df['squad']==team]
        if not sq.empty:
            reg = sq[sq['mins_played']>=500] if 'mins_played' in sq.columns else sq
            if reg.empty: reg = sq
            def si(d,c): return int(d[c].sum()) if c in d.columns else 0
            carries_box=si(reg,'carries_into_penalty_area'); passes_box=si(reg,'passes_into_penalty_area')
            take_ons=si(reg,'take_ons_successful'); errors=si(reg,'errors')
            tackles=si(reg,'tackles'); interceptions=si(reg,'interceptions'); aerials=si(reg,'aerials_won')
            if 'goals' in reg.columns and not reg.empty:
                ts=reg.loc[reg['goals'].idxmax()]; top_scorer=f"{ts['player'].split()[-1]} ({int(ts['goals'])}g)"
            if 'assists' in reg.columns and not reg.empty:
                ta=reg.loc[reg['assists'].idxmax()]; top_assister=f"{ta['player'].split()[-1]} ({int(ta['assists'])}a)"
    if gk_df is not None:
        gkt=gk_df[gk_df['squad']==team]
        if not gkt.empty:
            mc='min' if 'min' in gkt.columns else 'mp'; gk=gkt.loc[gkt[mc].idxmax()]
            save_pct=float(gk.get('save_pct',0) or 0); gk_name=gk['player'].split()[-1]

    gf_pm      = gf / total
    ga_pm      = ga / total
    sot_pm     = sot / total  if total > 0 else 0.0
    opp_sot_pm = opp_sot / total if total > 0 else 0.0
    conv_rate  = (gf / sot * 100)     if sot > 0     else 0.0   # ← no overflow
    opp_conv   = (ga / opp_sot * 100) if opp_sot > 0 else 0.0   # ← no overflow

    positives=[]
    if conv_rate>=35:                    positives.append(("HIGH CONVERSION RATE",    f"Converting {conv_rate:.0f}% of shots on target — clinical finishing"))
    if sot_pm>=4.5:                      positives.append(("SHOTS ON TARGET",          f"Averaging {sot_pm:.1f} shots on target per match — consistently threatening"))
    if carries_box/ptotal>=3:            positives.append(("PENALTY AREA ENTRIES",    f"{carries_box} carries into the box this season — direct and dangerous in attack"))
    if cs/total>=0.35:                   positives.append(("DEFENSIVE SOLIDITY",       f"Kept {cs} clean sheets ({cs/total:.0%}) — hard to break down"))
    if opp_sot_pm<=3.5 and sot>0:       positives.append(("LIMITING OPPOSITION",      f"Restricting opponents to {opp_sot_pm:.1f} SOT per game"))
    if gf_pm>=1.8:                       positives.append(("PROLIFIC ATTACK",          f"Scoring {gf_pm:.1f} goals per game — one of the league's most dangerous sides"))
    if tackles/ptotal>=18:               positives.append(("PRESSING INTENSITY",       f"{tackles/ptotal:.0f} tackles per game this season — relentless work rate"))
    if aerials/ptotal>=20:               positives.append(("AERIAL DOMINANCE",         f"Winning {aerials/ptotal:.0f} aerial duels per game — physically imposing"))
    if wins/total>=0.55:                 positives.append(("WINNING MENTALITY",        f"{wins/total:.0%} win rate — consistently converting performances to results"))
    if not positives:                    positives.append(("COMPETITIVE SHOWING",      "Solid contributions across the season with moments of quality"))

    negatives=[]
    if errors>=5:                        negatives.append(("COSTLY ERRORS",            f"{errors} defensive errors leading to shots this season — a persistent liability"))
    if opp_conv>=38 and opp_sot>0:       negatives.append(("POOR SHOT-STOPPING",       f"Opponents converting {opp_conv:.0f}% of SOT — goalkeeping a concern"))
    if sot_pm<3.0 and sot>0:            negatives.append(("LACK OF CUTTING EDGE",     f"Only {sot_pm:.1f} shots on target per game — struggles to test keepers"))
    if ga_pm>=1.8:                       negatives.append(("DEFENSIVE FRAGILITY",      f"Conceding {ga_pm:.1f} goals per game — too easy to score against"))
    if conv_rate<25 and sot>0:          negatives.append(("WASTEFUL IN FRONT OF GOAL",f"Converting just {conv_rate:.0f}% of SOT — missing too many chances"))
    if cs/total<0.15:                    negatives.append(("CLEAN SHEET PROBLEM",      f"Only {cs} clean sheets — failing to shut opponents out consistently"))
    if opp_shots/ptotal>=15 and opp_shots>0: negatives.append(("UNDER PRESSURE",      f"Facing {opp_shots/ptotal:.0f} shots per game — opponents create freely"))
    if losses/total>=0.45:               negatives.append(("INCONSISTENCY",            f"Losing {losses/total:.0%} of games — struggling to string results together"))
    if not negatives:                    negatives.append(("FEW WEAKNESSES IDENTIFIED","Consistent performance with no major tactical vulnerabilities identified"))

    return {
        'total':total,'wins':wins,'draws':draws,'losses':losses,
        'gf':gf,'ga':ga,'gf_pm':round(gf_pm,2),'ga_pm':round(ga_pm,2),
        'shots':shots,'sot':sot,'opp_shots':opp_shots,'opp_sot':opp_sot,
        'sot_pm':round(sot_pm,1),'opp_sot_pm':round(opp_sot_pm,1),
        'conv_rate':round(conv_rate,1),'opp_conv':round(opp_conv,1),
        'clean_sheets':cs,'save_pct':round(save_pct,1),
        'carries_box':carries_box,'passes_box':passes_box,'take_ons':take_ons,
        'errors':errors,'tackles':tackles,'interceptions':interceptions,'aerials':aerials,
        'top_scorer':top_scorer,'top_assister':top_assister,'gk_name':gk_name,
        'central_attack':round(min(100,(carries_box+passes_box)/ptotal*5),1),
        'wide_attack':round(min(100,take_ons/ptotal*4),1),
        'shot_intensity':round(min(100,sot_pm*10),1),
        'def_intensity':round(min(100,(tackles+interceptions)/ptotal*1.5),1),
        'positives':positives[:5],'negatives':negatives[:5],
    }

def run_ablation_study(master_df, train_seasons, val_season, test_season):
    """Shows the contribution of each feature group to model accuracy."""
    from sklearn.impute import SimpleImputer
    from sklearn.preprocessing import StandardScaler, LabelEncoder

    print(f"\n{'='*110}\nABLATION STUDY — Feature Group Contribution\n{'='*110}")
    print(f"{'Feature Group':<35} {'Val Acc':>8} {'Test Acc':>9} {'H Acc':>7} {'A Acc':>7} {'D Acc':>7}")
    print("-"*80)

    exclude = ['Season','HomeTeam','AwayTeam','FTR','FTHG','FTAG','Date']
    train_df = master_df[master_df['Season'].isin(train_seasons)]
    val_df   = master_df[master_df['Season'] == val_season]
    test_df  = master_df[master_df['Season'] == test_season]

    # Feature groups to ablate
    injury_cols = [c for c in master_df.columns if 'injur' in c or 'severity' in c]
    odds_cols   = [c for c in master_df.columns if any(x in c for x in ['b365','avg_prob','odds','market'])]
    elo_cols    = [c for c in master_df.columns if 'elo' in c]
    xg_cols     = [c for c in master_df.columns if 'xg' in c or 'xga' in c or 'xpts' in c]
    lineup_cols = [c for c in master_df.columns if 'xi_' in c]

    configs = [
        ("Full model (baseline)",    []),
        ("No injury features",       injury_cols),
        ("No betting odds",          odds_cols),
        ("No ELO features",          elo_cols),
        ("No xG features",           xg_cols),
        ("No lineup/valuation",      lineup_cols),
    ]

    for name, drop_cols in configs:
        f_cols = [c for c in train_df.columns if c not in exclude and c not in drop_cols]

        X_tr = train_df[f_cols].replace([np.inf,-np.inf], np.nan)
        X_va = val_df[f_cols].replace([np.inf,-np.inf], np.nan)
        X_te = test_df[f_cols].replace([np.inf,-np.inf], np.nan)

        imp = SimpleImputer(strategy='mean')
        X_tr = pd.DataFrame(imp.fit_transform(X_tr), columns=f_cols)
        X_va = pd.DataFrame(imp.transform(X_va), columns=f_cols)
        X_te = pd.DataFrame(imp.transform(X_te), columns=f_cols)

        scl = StandardScaler()
        X_tr_sc = scl.fit_transform(X_tr)
        X_va_sc = scl.transform(X_va)
        X_te_sc = scl.transform(X_te)

        le = LabelEncoder()
        y_tr = le.fit_transform(train_df['FTR'])
        y_va = val_df['FTR']; y_te = test_df['FTR']

        m = XGBClassifier(n_estimators=300, learning_rate=0.05, max_depth=4,
                          min_child_weight=10, subsample=0.8, colsample_bytree=0.8,
                          reg_alpha=0.1, reg_lambda=2.0, objective='multi:softprob',
                          num_class=3, random_state=42, n_jobs=-1, eval_metric='mlogloss')
        sw = np.where(train_df['FTR'] == 'D', 1.5, 1.0)
        m.fit(X_tr_sc, y_tr, sample_weight=sw)

        val_pred  = le.inverse_transform(m.predict(X_va_sc).astype(int))
        test_pred = le.inverse_transform(m.predict(X_te_sc).astype(int))

        va = accuracy_score(y_va, val_pred)
        ta = accuracy_score(y_te, test_pred)
        hm = y_te == 'H'; am = y_te == 'A'; dm = y_te == 'D'
        ha = accuracy_score(y_te[hm], test_pred[hm]) if hm.sum() > 0 else 0
        aa = accuracy_score(y_te[am], test_pred[am]) if am.sum() > 0 else 0
        da = accuracy_score(y_te[dm], test_pred[dm]) if dm.sum() > 0 else 0

        print(f"  {name:<33} {va:>7.1%} {ta:>8.1%} {ha:>6.1%} {aa:>6.1%} {da:>6.1%}")

    print("="*110)

def train_draw_risk_model(train_df):
    """Secondary model trained specifically to flag draw risk."""
    exclude = ['Season','HomeTeam','AwayTeam','FTR','FTHG','FTAG','Date']
    f_cols = [c for c in train_df.columns if c not in exclude]
    
    X = train_df[f_cols].replace([np.inf,-np.inf], np.nan)
    y = train_df['FTR']
    
    imp = SimpleImputer(strategy='mean')
    scl = StandardScaler()
    X_sc = scl.fit_transform(imp.fit_transform(X))
    
    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    
    # Higher draw weight — purely for draw sensitivity
    sw = np.where(y == 'D', 3.5, 1.0)
    
    model = XGBClassifier(
        n_estimators=300, learning_rate=0.05, max_depth=4,
        min_child_weight=10, subsample=0.8, colsample_bytree=0.8,
        reg_alpha=0.1, reg_lambda=2.0,
        objective='multi:softprob', num_class=3,
        random_state=42, n_jobs=-1, eval_metric='mlogloss'
    )
    model.fit(X_sc, y_enc, sample_weight=sw)
    
    class LabelWrappedXGB:
        def __init__(self, m, e):
            self._model = m; self._le = e
            self.classes_ = e.classes_
        def predict(self, X):
            return self._le.inverse_transform(self._model.predict(X).astype(int))
        def predict_proba(self, X):
            return self._model.predict_proba(X)
    
    print("   Draw risk model trained.")
    return LabelWrappedXGB(model, le), f_cols, scl, imp


def get_draw_risk_label(draw_prob):
    """Convert draw probability to risk label."""
    if draw_prob >= 0.40:   return "HIGH",   "⚠"
    elif draw_prob >= 0.30: return "MEDIUM", "~"
    else:                   return "LOW",    "✓"


def main():
    np.random.seed(42)
    random.seed(42)

    SEP = "=" * 110
    print(f"{SEP}\nPREMIER LEAGUE PREDICTOR — XGBOOST MODEL")
    print(f" Train: {TRAIN_SEASONS[0]}–{TRAIN_SEASONS[-1]}  |  Val: {VALIDATION_SEASON}  |  Test: {TEST_SEASON}")
    print(SEP)

    # ── Load data ──────────────────────────────────────────────────────────────
    seasons_needed = sorted(set(["2014-15", "2015-16", "2016-17"] + TRAIN_SEASONS + [VALIDATION_SEASON, TEST_SEASON]))
    print(f"Loading data from {seasons_needed[0]} to {seasons_needed[-1]}...")

    raw_df      = load_and_combine_data(CSV_FOLDER, seasons_needed[0], seasons_needed[-1])
    if raw_df is None: return
    xg_df       = load_xg_data(XG_FILE_MAIN, XG_FILE_1415, XG_FILE_2425)
    injury_df   = load_injury_data(INJURY_FILE, PLAYERS_FILE)
    lineup_df   = load_lineup_data(LINEUPS_FILE, VALUATIONS_FILE)
    manager_dict = load_manager_data(MANAGERS_FILE)
    cleaned_df  = clean_data(raw_df)
    if cleaned_df is None: return

    # ── Feature engineering ────────────────────────────────────────────────────
    print(f"\n{SEP}\nCreating master feature set for all seasons...\n{SEP}")

    # Equal weights for all training seasons
    season_weights_map = {s: 1.0 for s in TRAIN_SEASONS}
    print(f"   Season weights: {season_weights_map}")

    master_df = create_enhanced_features(
        cleaned_df, xg_df,
        TRAIN_SEASONS, VALIDATION_SEASON, TEST_SEASON,
        season_weights_map=season_weights_map,
        injury_df=injury_df,
        lineup_df=lineup_df,
        manager_dict=manager_dict
    )
    if master_df is None: return

    master_df = add_advanced_features(master_df)

    n_features = len([c for c in master_df.columns if c not in ['Season', 'HomeTeam', 'AwayTeam', 'FTR', 'FTHG', 'FTAG', 'Date']])
    print(f"   Master feature set complete. Features: {n_features}")

    # ── Cross-validation ───────────────────────────────────────────────────────
    fold_results = run_cross_validation(master_df)
    run_ablation_study(master_df, TRAIN_SEASONS, VALIDATION_SEASON, TEST_SEASON)

    # ── Train / Val / Test split ───────────────────────────────────────────────
    train_df = master_df[master_df['Season'].isin(TRAIN_SEASONS)].copy()
    valid_df = master_df[master_df['Season'] == VALIDATION_SEASON].copy()
    test_df  = master_df[master_df['Season'] == TEST_SEASON].copy()

    if train_df.empty or valid_df.empty or test_df.empty:
        print("Error: One or more data splits are empty. Check CONFIGURATION variables.")
        print(f"  Train: {len(train_df)}, Val: {len(valid_df)}, Test: {len(test_df)}")
        return


    print(f"\n{SEP}\nDATA SPLIT\n{SEP}")
    print(f"Train : {len(train_df)} matches  ({TRAIN_SEASONS[0]}–{TRAIN_SEASONS[-1]})")
    print(f"Val   : {len(valid_df)} matches  ({VALIDATION_SEASON})")
    print(f"Test  : {len(test_df)} matches  ({TEST_SEASON})\n{SEP}\n")



    # ── Train model (draw weight 1.5 — ~3% uplift, consistent with literature) ──
    model, feature_cols, scaler, imputer = train_ensemble_model(train_df, draw_weight=1.5)
    # Train secondary draw risk model
    print("\nTraining draw risk model...")
    draw_model, draw_fcols, draw_scl, draw_imp = train_draw_risk_model(train_df)
    
    if model is None:
        print("Model training failed.")
        return

    analyze_feature_importance(model, feature_cols, top_n=30)

    # ── SHAP Analysis ─────────────────────────────────────────────────────
    print(f"\n{'='*110}\nSHAP FEATURE IMPORTANCE ANALYSIS\n{'='*110}")
    try:
        import shap
        
        # Prepare test data
        X_test_shap = test_df[feature_cols].replace([np.inf,-np.inf], np.nan)
        if imputer and X_test_shap.isnull().sum().sum() > 0:
            X_test_shap = pd.DataFrame(imputer.transform(X_test_shap), 
                                       columns=feature_cols, index=X_test_shap.index)
        X_test_shap_sc = pd.DataFrame(scaler.transform(X_test_shap), 
                                      columns=feature_cols)

        # Calculate SHAP values using the internal XGBoost model
        explainer = shap.TreeExplainer(model._model)
        shap_values = explainer.shap_values(X_test_shap_sc)

        # shap_values shape: (n_samples, n_features, n_classes)
        classes = list(model.classes_)
        class_names = {'H': 'Home Win', 'D': 'Draw', 'A': 'Away Win'}

        # Mean absolute SHAP per feature per class
        shap_df = pd.DataFrame(index=feature_cols)
        for i, cls in enumerate(classes):
            shap_df[class_names[cls]] = np.abs(shap_values[:, :, i]).mean(axis=0)
        shap_df['Overall'] = shap_df.mean(axis=1)
        shap_df = shap_df.sort_values('Overall', ascending=False)

        print(f"\n{'Feature':<40} {'Home Win':>10} {'Draw':>10} {'Away Win':>10} {'Overall':>10}")
        print("-"*80)
        for feat, row in shap_df.head(20).iterrows():
            print(f"{feat:<40} {row['Home Win']:>10.4f} {row['Draw']:>10.4f} {row['Away Win']:>10.4f} {row['Overall']:>10.4f}")
        print("="*110)

        # Save SHAP values to CSV
        shap_out = os.path.join(BASE_PATH, 'outputs', 'shap_importance.csv')
        shap_df.reset_index().rename(columns={'index': 'Feature'}).to_csv(shap_out, index=False)
        print(f"\n   SHAP values saved → {shap_out}")

    except Exception as e:
        print(f"   SHAP analysis failed: {e}")
    # ── End SHAP ──────────────────────────────────────────────────────────

    # ── Helper: prepare features and print confusion matrix ───────────────────
    def evaluate_split(df, label, season_name, draw_model=None, draw_fcols=None, draw_scl=None, draw_imp=None):
        SEP = "=" * 110
        print(f"\n{SEP}\n{label} PERFORMANCE ({season_name})\n{SEP}")
        acc = calculate_model_accuracy(model, feature_cols, scaler, imputer, df, label)
        print(f"Overall Accuracy : {acc['overall_accuracy']:.1%}")
        print(f"Home Win Accuracy: {acc['home_win_accuracy']:.1%}")
        print(f"Away Win Accuracy: {acc['away_win_accuracy']:.1%}")
        print(f"Draw Accuracy    : {acc['draw_accuracy']:.1%}")

        X = df[feature_cols].replace([np.inf, -np.inf], np.nan)
        y = df['FTR']
        if imputer and X.isnull().sum().sum() > 0:
            X = pd.DataFrame(imputer.transform(X), columns=feature_cols, index=X.index)
        y_pred = model.predict(scaler.transform(X))

        print(f"\nConfusion Matrix ({label}):")
        print("           Draw  Home  Away")
        cm = confusion_matrix(y, y_pred, labels=['D', 'H', 'A'])
        for i, row_label in enumerate(['Draw', 'Home', 'Away']):
            print(f"{row_label:>10} {cm[i,0]:5d} {cm[i,1]:5d} {cm[i,2]:5d}")
        print(SEP)
        # ── Draw Risk Evaluation ──────────────────────────────────────
        X_dr = df[draw_fcols].replace([np.inf,-np.inf], np.nan)
        if draw_imp and X_dr.isnull().sum().sum() > 0:
            X_dr = pd.DataFrame(draw_imp.transform(X_dr), columns=draw_fcols, index=X_dr.index)
        draw_probs = draw_model.predict_proba(draw_scl.transform(X_dr))
        d_idx = list(draw_model.classes_).index('D')
        
        # How often does HIGH draw risk actually end in a draw?
        high_risk = draw_probs[:, d_idx] >= 0.40
        med_risk  = (draw_probs[:, d_idx] >= 0.30) & ~high_risk
        
        y_arr = df['FTR'].values
        high_draw_rate = (y_arr[high_risk] == 'D').mean() if high_risk.sum() > 0 else 0
        med_draw_rate  = (y_arr[med_risk]  == 'D').mean() if med_risk.sum()  > 0 else 0
        low_draw_rate  = (y_arr[~high_risk & ~med_risk] == 'D').mean()
        
        print(f"\nDraw Risk Calibration ({label}):")
        print(f"  HIGH risk  matches: {high_risk.sum():3d} → actual draw rate: {high_draw_rate:.1%}")
        print(f"  MEDIUM risk matches: {med_risk.sum():3d} → actual draw rate: {med_draw_rate:.1%}")
        print(f"  LOW risk   matches: {(~high_risk & ~med_risk).sum():3d} → actual draw rate: {low_draw_rate:.1%}")
        # ── End Draw Risk ─────────────────────────────────────────────
        # ── Calibration Plot (saved as CSV for thesis) ─────────────────
        try:
            from sklearn.calibration import calibration_curve
            probs_all = model.predict_proba(scaler.transform(X))
            classes_list = list(model.classes_)
            
            cal_rows = []
            for cls, cls_name in [('H','Home Win'),('D','Draw'),('A','Away Win')]:
                cls_probs = probs_all[:, classes_list.index(cls)]
                actual_bin = (y == cls).astype(int)
                fraction_pos, mean_pred = calibration_curve(
                    actual_bin, cls_probs, n_bins=10, strategy='uniform'
                )
                for fp, mp in zip(fraction_pos, mean_pred):
                    cal_rows.append({
                        'Label': label,
                        'Outcome': cls_name,
                        'Mean_Predicted_Prob': round(mp, 4),
                        'Fraction_Positive': round(fp, 4),
                    })
            
            cal_df = pd.DataFrame(cal_rows)
            cal_path = os.path.join(BASE_PATH, 'outputs', f'calibration_{label.lower()}.csv')
            cal_df.to_csv(cal_path, index=False)
            print(f"\n   Calibration data saved → {cal_path}")

        except Exception as e:
            print(f"   Calibration plot skipped: {e}")
        # ── End Calibration ────────────────────────────────────────────

    evaluate_split(valid_df, "VALIDATION", VALIDATION_SEASON, draw_model, draw_fcols, draw_scl, draw_imp)
    evaluate_split(test_df,  "TEST",       TEST_SEASON,       draw_model, draw_fcols, draw_scl, draw_imp)

    # ── Match prediction examples ──────────────────────────────────────────────
    print(f"\n{'='*110}\nMATCH PREDICTION EXAMPLES\n{'='*110}")

    def predict_match(home_team, away_team):
        """Predict the outcome of a match using the most recent available features."""
        print(f"\n{'='*50}\nPREDICTION: {home_team} vs {away_team}\n{'='*50}")

        # Use most recent row that involves either team
        sample = master_df[master_df['HomeTeam'] == home_team].tail(1)

        if sample.empty:
            sample = master_df[
                (master_df['HomeTeam'] == home_team) |
                (master_df['AwayTeam'] == home_team)
            ].tail(1)

        if sample.empty:
            print(f"No data found for {home_team}")
            return

        X_pred = sample[feature_cols].replace([np.inf, -np.inf], np.nan)
        if imputer:
            X_pred = pd.DataFrame(imputer.transform(X_pred), columns=feature_cols, index=X_pred.index)
        X_pred_scaled = scaler.transform(X_pred)

        probs      = model.predict_proba(X_pred_scaled)[0]
        pred_class = model.predict(X_pred_scaled)[0]
        prob_dict  = {cls: probs[i] for i, cls in enumerate(model.classes_)}

        print(f"\nProbabilities:")
        print(f"  {home_team} Win : {prob_dict.get('H', 0)*100:.1f}%")
        print(f"  Draw            : {prob_dict.get('D', 0)*100:.1f}%")
        print(f"  {away_team} Win : {prob_dict.get('A', 0)*100:.1f}%")

        # Draw risk from secondary model
        X_dr = sample[draw_fcols].replace([np.inf,-np.inf], np.nan)
        if draw_imp:
            X_dr = pd.DataFrame(draw_imp.transform(X_dr), columns=draw_fcols, index=X_dr.index)
        dr_probs = draw_model.predict_proba(draw_scl.transform(X_dr))[0]
        d_idx = list(draw_model.classes_).index('D')
        draw_p = dr_probs[d_idx]
        risk_label, risk_icon = get_draw_risk_label(draw_p)

        outcome = {'H': f'{home_team} Win', 'A': f'{away_team} Win', 'D': 'Draw'}
        print(f"\nPrediction  : {outcome.get(pred_class, pred_class)}")
        print(f"Draw Risk   : {risk_icon} {risk_label} ({draw_p*100:.1f}% draw probability from risk model)")
        print("=" * 50)

    try:
        predict_match("Arsenal",          "Manchester City")
        predict_match("Liverpool",         "Chelsea")
        predict_match("Manchester United", "Tottenham")
    except Exception as e:
        print(f"Prediction examples unavailable: {e}")

    # ── Monte Carlo Season Simulation ─────────────────────────────────────────
    print(f"\n{'='*110}\nMONTE CARLO SEASON SIMULATION (2,000 simulations)\n{'='*110}")

    wp, avg_p, std_p, avg_pos, t4p, rel_p = simulate_season_monte_carlo(
        model, feature_cols, scaler, imputer, test_df, n_sim=2000
    )

    pred_stand = None
    actual_stand = None
    if wp:
        # Build predicted standings table sorted by avg points
        pred_stand = create_win_probability_standings(wp, avg_p, std_p, avg_pos, t4p, rel_p)

        # Build actual standings from test season
        actual_stand = calculate_standings(
            master_df[master_df['Season'] == TEST_SEASON]
        )

        # ── Print predicted standings ────────────────────────────────────────
        print(f"\n{'='*110}")
        print(f"PREDICTED STANDINGS — {TEST_SEASON} (Monte Carlo Average)")
        print(f"{'='*110}")
        hdr = (f"{'Pos':<5} {'Team':<25} {'Avg Pts':>8} {'+/-Std':>7} "
               f"{'Avg Pos':>8} {'Win %':>7} {'Top4 %':>7} {'Rel %':>6}")
        print(hdr)
        print("-" * len(hdr))
        for i, r in pred_stand.iterrows():
            print(f"{i:<5} {r['Team']:<25} {r['Avg Points']:>7.1f}  "
                  f"+/-{r['Points Std Dev']:>4.1f}   {r['Avg Position']:>6.1f}   "
                  f"{r['Win Probability (%)']:>5.1f}%  "
                  f"{r['Top 4 Prob (%)']:>5.1f}%  "
                  f"{r['Relegation Prob (%)']:>4.1f}%")
        print("=" * len(hdr))
 
        if not actual_stand.empty:
            # ── Merge predicted vs actual for comparison ─────────────────────
            comp = combine_predicted_actual(pred_stand, actual_stand)

            # ── Print side-by-side standings comparison ──────────────────────
            print(f"\n{'='*110}")
            print(f"PREDICTED vs ACTUAL STANDINGS — {TEST_SEASON}")
            print(f"{'='*110}")
            hdr2 = (f"{'Act':>4} {'Team':<25} {'Act Pts':>7} {'Pred Pos':>9} "
                    f"{'Diff':>6} {'±2?':>5}")
            print(hdr2)
            print("-" * len(hdr2))
            within_2_teams = []
            for _, r in comp.iterrows():
                diff  = r['Difference +/-']
                flag  = "✓" if abs(diff) <= 2 else " "
                if abs(diff) <= 2:
                    within_2_teams.append(r['Team'])
                diff_str = f"{diff:+.0f}" if not pd.isna(diff) else "N/A"
                print(f"{int(r['Final Position']):>4} {r['Team']:<25} "
                      f"{int(r['Final Points']):>6}  "
                      f"{r['Predicted Position']:>8.1f}   "
                      f"{diff_str:>5}   {flag}")
            print("=" * len(hdr2))

            # ── Season-level accuracy metrics ────────────────────────────────
            stats = evaluate_standing_accuracy(comp)
            n_teams = len(comp)
            within_2_count = len(within_2_teams)

            print(f"\n{'='*110}")
            print(f"SEASON-LEVEL SIMULATION ACCURACY — {TEST_SEASON}")
            print(f"{'='*110}")
            print(f"  Teams within ±2 positions : {within_2_count}/{n_teams} "
                  f"({within_2_count/n_teams*100:.1f}%)")
            print(f"  Top 4 accuracy            : {stats['Top 4 Accuracy']}")
            print(f"  Relegation accuracy        : {stats['Relegation Accuracy']}")

            # Points prediction accuracy
            if not pred_stand.empty and not actual_stand.empty:
                merged_pts = pred_stand[['Team','Avg Points']].merge(
                    actual_stand[['Team','Points']], on='Team', how='inner'
                )
                if not merged_pts.empty:
                    mae  = np.mean(np.abs(merged_pts['Avg Points'] - merged_pts['Points']))
                    rmse = np.sqrt(np.mean((merged_pts['Avg Points'] - merged_pts['Points'])**2))
                    corr = merged_pts['Avg Points'].corr(merged_pts['Points'])
                    print(f"  Points prediction MAE     : {mae:.1f} pts")
                    print(f"  Points prediction RMSE    : {rmse:.1f} pts")
                    print(f"  Points correlation (r)    : {corr:.3f}")

            # Per-team ±2 accuracy
            print(f"\n  Per-team position accuracy (±2):")
            print(f"  {'Team':<25} {'Actual':>6} {'Predicted':>10} {'Diff':>6} {'±2?':>5}")
            print(f"  {'-'*55}")
            for _, r in comp.sort_values('Final Position').iterrows():
                diff = r['Difference +/-']
                ok   = "✓" if abs(diff) <= 2 else "✗"
                diff_str = f"{diff:+.0f}" if not pd.isna(diff) else "N/A"
                print(f"  {r['Team']:<25} {int(r['Final Position']):>6} "
                      f"{r['Predicted Position']:>10.1f} {diff_str:>6}   {ok}")
            print(f"\n  Summary: {within_2_count}/{n_teams} teams predicted within ±2 positions "
                  f"({within_2_count/n_teams*100:.1f}%)")
            print("=" * 110)

    # ── Dixon-Coles + Team Analyst Reports ────────────────────────────────────
    dc_model = DixonColesModel()
    dc_model.fit(train_df[['HomeTeam','AwayTeam','FTHG','FTAG']])
    out_df, gk_df = load_player_stats(OUTFIELD_STATS_FILE, GK_STATS_FILE)
    print_team_analyst_report(test_df, dc_model, out_df, gk_df)
    export_to_csv(model, feature_cols, scaler, imputer,
                  test_df, pred_stand, actual_stand, dc_model,
                  fold_results, out_df, gk_df, BASE_PATH,
                  draw_model, draw_fcols, draw_scl, draw_imp)

if __name__ == "__main__":
    main()