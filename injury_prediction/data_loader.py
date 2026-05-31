import glob as _glob
import logging
import numpy as np
import pandas as pd

from config import FBREF_DIR, FBREF_INTENSITY_COLS, SEP
from db import scan_table
from utils import normalise_name, parse_market_value, season_to_start_year

logger = logging.getLogger(__name__)

SAFE_NAME_MAP = {
    'heungmin son': 'son heungmin',
    'sungyueng ki': 'ki sungyueng',
    'chungyong lee': 'lee chungyong',
    'chicharito': 'javier hernandez',
    'sokratis': 'sokratis papastathopoulos',
    'naldo': 'naldo',
    'douglas': 'douglas',
    'memphis depay': 'memphis',
    'alex song': 'alexandre song',
    'cheik tiote': 'cheick tiote',
    'idrissa gueye': 'idrissa gana gueye',
    'ericmaxim choupomoting': 'eric maxim choupomoting',
    'eric maxim choupo moting': 'eric maxim choupomoting',
    'pierre emile hojbjerg': 'pierre hojbjerg',
    'pierreemile hojbjerg': 'pierre hojbjerg',
    'joel pereira': 'joel castro pereira',
    'mame diouf': 'mame biram diouf',
    'papiss demba cisse': 'papiss cisse',
    'matt jarvis': 'matthew jarvis',
    'lukasz fabianski': 'lukasz fabiaski',
    'jonny otto': 'jonny castro',
    'cameron carter vickers': 'cameron cartervickers',
    'florin gardos': 'florin gardo',
    'ben brereton diaz': 'ben brereton',
    'jeff reineadelade': 'jeff reineadelade',
    'jeff reine adelaide': 'jeff reineadelade',
    'baba rahman': 'baba rahman',
    'abdul rahman baba': 'baba rahman',
    'ismal bennacer': 'ismal bennacer',
    'ismael bennacer': 'ismal bennacer',
    'achraf lazaar': 'achraf lazaar',
    'aiden mcgeady': 'aiden mcgeady',
    'bailey peacockfarrell': 'bailey peacockfarrell',
    'bailey peacock farrell': 'bailey peacockfarrell',
    'chuba akpom': 'chuba akpom',
    'dujon sterling': 'dujon sterling',
    'federico fazio': 'federico fazio',
    'filip benkovic': 'filip benkovic',
    'glen kamara': 'glen kamara',
    'joe cole': 'joe cole',
    'joey obrien': 'joey obrien',
    'krystian bielik': 'krystian bielik',
    'matt macey': 'matt macey',
    'mike williamson': 'mike williamson',
    'morgan amalfitano': 'morgan amalfitano',
    'ross mccormack': 'ross mccormack',
    'ryan kent': 'ryan kent',
    'sammy ameobi': 'sammy ameobi',
    'tiago ilori': 'tiago ilori',
    'tomas kalas': 'tomas kalas',
    'tomas rosicky': 'tomas rosicky',
    'tyler blackett': 'tyler blackett',
    'ben sheaf': 'ben sheaf',
    'marcus edwards': 'marcus edwards',
    'jose enrique': 'jose enrique',
}


def _apply_name_map(name: str) -> str:
    return SAFE_NAME_MAP.get(name, name)


def load_all_data() -> dict:
    """Load all data from DynamoDB, parse dates, normalise names, build lookup structures."""
    print(SEP)
    print(' STEP 1 — LOADING DATA FROM DYNAMODB')
    print(SEP)

    minutes  = scan_table('minutes')
    injuries = scan_table('injuries')
    players  = scan_table('players')
    fpl      = scan_table('fpl')
    fpl_api  = scan_table('fpl_api')
    breaks   = scan_table('breaks')

    # Convert numeric columns that DynamoDB returns as strings
    minutes['minutes_played'] = pd.to_numeric(minutes['minutes_played'], errors='coerce')
    minutes['home_goals']     = pd.to_numeric(minutes['home_goals'],     errors='coerce')
    minutes['away_goals']     = pd.to_numeric(minutes['away_goals'],     errors='coerce')
    minutes['is_starter']     = pd.to_numeric(minutes['is_starter'],     errors='coerce')
    injuries['days_out']      = pd.to_numeric(injuries['days_out'],      errors='coerce')
    injuries['games_missed']  = pd.to_numeric(injuries['games_missed'],  errors='coerce')

    # Parse dates
    minutes['date']          = pd.to_datetime(minutes['date'])
    injuries['injury_date']  = pd.to_datetime(injuries['injury_date'], errors='coerce')
    injuries['return_date']  = pd.to_datetime(injuries['return_date'], errors='coerce')
    players['date_of_birth'] = pd.to_datetime(players['date_of_birth'], errors='coerce')
    fpl['match_date']        = pd.to_datetime(fpl['match_date'], errors='coerce')
    breaks['date']           = pd.to_datetime(breaks['date'])

    # Normalise names
    fpl['name_norm']      = fpl['name'].str.replace('_', ' ').str.lower().str.strip()
    fpl_api['name_norm']  = fpl_api['player_name'].apply(normalise_name)
    injuries['name_norm'] = injuries['player_name'].apply(normalise_name)
    players['name_norm']  = players['player_name'].apply(normalise_name)
    minutes['name_norm']  = minutes['player_name'].apply(normalise_name)

    # Load FBref season stats
    fbref_frames = [pd.read_csv(f, encoding='utf-8-sig')
                    for f in sorted(_glob.glob(FBREF_DIR + r'\[0-9]*.csv'))]
    fbref_stats = pd.concat(fbref_frames, ignore_index=True)
    fbref_stats['name_norm']   = fbref_stats['player'].apply(normalise_name)
    fbref_stats['season_year'] = fbref_stats['season'].astype(int)

    _n90 = fbref_stats['ninety_mins_played'].replace(0, np.nan)
    fbref_stats['carry_dist_p90']      = fbref_stats['total_distance_carried'] / _n90
    fbref_stats['prog_carry_dist_p90'] = fbref_stats['progressive_carries_distance'] / _n90
    fbref_stats['carries_p90']         = fbref_stats['carries'] / _n90
    fbref_stats['aerials_p90']         = (
        fbref_stats['aerials_won'].fillna(0) + fbref_stats['aerials_lost'].fillna(0)
    ) / _n90
    fbref_stats['tackles_p90'] = fbref_stats['tackles'] / _n90
    fbref_stats['fouls_p90']   = fbref_stats['fouls']   / _n90

    print(f"FBref stats : {len(fbref_stats):,} rows, "
          f"{fbref_stats['season_year'].nunique()} seasons")

    # Filter to PL matches only
    pl_minutes = minutes[minutes['competition'] == 'Premier League'].copy()
    pl_minutes['name_norm'] = pl_minutes['player_name'].apply(normalise_name)
    print(f"\nPL matches only: {pl_minutes['match_url'].nunique():,} unique matches")

    # Parse player market value and season year
    players['market_value_m'] = players['market_value'].apply(parse_market_value)
    players['season_year']    = players['season'].apply(season_to_start_year)

    # Apply name corrections and filter injuries to PL players only
    injuries['name_norm'] = injuries['name_norm'].apply(_apply_name_map)
    pl_player_names = set(pl_minutes['name_norm'].unique())
    injuries = injuries[injuries['name_norm'].isin(pl_player_names)].copy()

    meaningful_injuries = injuries[injuries['games_missed'].fillna(0) >= 1].copy()
    meaningful_injuries['name_norm'] = meaningful_injuries['name_norm'].apply(_apply_name_map)

    print(f"\nMeaningful injuries (1+ games missed): {len(meaningful_injuries):,}")

    # Build lookup structures
    break_dates = set(breaks['date'].dt.date)

    fpl_api_lookup = {row['name_norm']: row for _, row in fpl_api.iterrows()}

    fbref_lookup = {
        (row['name_norm'], int(row['season_year'])): {
            col: row[col] for col in FBREF_INTENSITY_COLS
        }
        for _, row in fbref_stats.iterrows()
    }

    players_lookup: dict = {}
    for _, row in players.iterrows():
        players_lookup.setdefault(row['name_norm'], {})[row['season_year']] = row

    minutes_sorted    = minutes.sort_values(['name_norm', 'date']).copy()
    minutes_by_player = {
        name: grp.reset_index(drop=True)
        for name, grp in minutes_sorted.groupby('name_norm')
    }
    inj_by_player = {
        name: grp for name, grp in meaningful_injuries.groupby('name_norm')
    }

    pl_matches_unique = pl_minutes[
        pl_minutes['season'].isin([
            '2015-2016', '2016-2017', '2017-2018', '2018-2019', '2019-2020',
            '2020-2021', '2021-2022', '2022-2023', '2023-2024', '2024-2025'
        ])
    ][['match_url', 'date', 'name_norm', 'player_name', 'team', 'season',
       'minutes_played', 'side', 'home_team', 'away_team']
    ].drop_duplicates(subset=['match_url', 'name_norm'])

    return {
        'minutes':            minutes,
        'injuries':           injuries,
        'players':            players,
        'fpl':                fpl,
        'fpl_api':            fpl_api,
        'breaks':             breaks,
        'fbref_stats':        fbref_stats,
        'meaningful_injuries': meaningful_injuries,
        'pl_minutes':         pl_minutes,
        'pl_matches_unique':  pl_matches_unique,
        'minutes_sorted':     minutes_sorted,
        'minutes_by_player':  minutes_by_player,
        'inj_by_player':      inj_by_player,
        'players_lookup':     players_lookup,
        'fpl_api_lookup':     fpl_api_lookup,
        'fbref_lookup':       fbref_lookup,
        'break_dates':        break_dates,
    }
