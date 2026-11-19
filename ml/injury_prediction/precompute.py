import logging
import numpy as np
import pandas as pd

from config import ELO_K, ELO_START, HOME_ADV, LAMBDA_ACUTE, LAMBDA_CHRONIC, SEP

logger = logging.getLogger(__name__)


def run_all_precomputations(data: dict) -> dict:
    """Compute Elo ratings, match metadata, break features, FPL xGC, and EWMA loads."""
    lookups = {}
    lookups.update(_compute_elo(data))
    lookups['match_meta']          = _build_match_meta(data, lookups['elo_history'],
                                                        lookups['elo_ratings'])
    lookups['break_features_cache'] = _build_break_features(data)
    lookups['fpl_xgc_lookup']      = _build_fpl_xgc_lookup(data)
    lookups['ewma_lookup']         = _build_ewma_lookup(data)
    print("All pre-computation complete.\n")
    return lookups


def _compute_elo(data: dict) -> dict:
    print("Computing Elo ratings...")
    pl_minutes = data['pl_minutes']

    match_info = (
        pl_minutes[['match_url', 'date', 'home_team', 'away_team',
                    'home_goals', 'away_goals']]
        .drop_duplicates('match_url')
        .sort_values('date')
        .reset_index(drop=True)
    )

    elo_ratings: dict = {}
    elo_history: dict = {}

    for _, match in match_info.iterrows():
        home, away, date = match['home_team'], match['away_team'], match['date']
        r_home = elo_ratings.get(home, ELO_START)
        r_away = elo_ratings.get(away, ELO_START)

        elo_history[(home, date)] = r_home
        elo_history[(away, date)] = r_away

        exp_home = 1 / (1 + 10 ** ((r_away - r_home - HOME_ADV) / 400))
        exp_away = 1 - exp_home

        hg = match['home_goals'] if pd.notna(match['home_goals']) else 0
        ag = match['away_goals'] if pd.notna(match['away_goals']) else 0

        if hg > ag:
            s_home, s_away = 1.0, 0.0
        elif hg < ag:
            s_home, s_away = 0.0, 1.0
        else:
            s_home, s_away = 0.5, 0.5

        gd     = abs(hg - ag)
        k_mult = 1.0 if gd <= 1 else (1.5 if gd == 2 else 1.75)

        elo_ratings[home] = r_home + ELO_K * k_mult * (s_home - exp_home)
        elo_ratings[away] = r_away + ELO_K * k_mult * (s_away - exp_away)

    top5 = sorted(elo_ratings.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"Elo computed for {len(elo_ratings)} teams")
    print(f"Top 5: {[(t, round(e)) for t, e in top5]}")
    return {'elo_ratings': elo_ratings, 'elo_history': elo_history}


def _build_match_meta(data: dict, elo_history: dict, elo_ratings: dict) -> dict:
    print("Pre-computing match metadata...")
    match_meta = {}
    for _, row in data['pl_matches_unique'].iterrows():
        if row['side'] == 'home':
            opp, own = row['away_team'], row['home_team']
            is_home  = 1
        else:
            opp, own = row['home_team'], row['away_team']
            is_home  = 0

        opp_elo = elo_history.get((opp, row['date']), elo_ratings.get(opp, ELO_START))
        own_elo = elo_history.get((own, row['date']), elo_ratings.get(own, ELO_START))

        match_meta[(row['name_norm'], row['date'])] = {
            'opponent':          opp,
            'is_home':           is_home,
            'opponent_strength': opp_elo,
            'elo_diff':          own_elo - opp_elo,
        }
    return match_meta


def _build_break_features(data: dict) -> dict:
    print("Pre-computing international break features...")
    break_dates        = data['break_dates']
    pl_matches_unique  = data['pl_matches_unique']
    sorted_breaks      = sorted(break_dates)
    cache: dict        = {}

    for d in pl_matches_unique['date'].unique():
        past = [b for b in sorted_breaks if b < d.date()]
        days_since = (d.date() - past[-1]).days if past else 999
        cache[d] = {
            'days_since_intl_break': days_since,
            'is_intl_break_week':    int(days_since <= 7),
        }
    return cache


def _build_fpl_xgc_lookup(data: dict) -> dict:
    print("Pre-computing FPL xGC lookup...")
    fpl    = data['fpl']
    lookup = {}
    for _, row in fpl.iterrows():
        if pd.notna(row['match_date']) and pd.notna(row.get('expected_goals_conceded')):
            lookup[(row['name_norm'], row['match_date'].date())] = float(
                row['expected_goals_conceded']
            )
    return lookup


def _build_ewma_lookup(data: dict) -> dict:
    print("Pre-computing EWMA loads (Murray et al. 2017)...")
    minutes_sorted = data['minutes_sorted']
    lookup: dict   = {}

    for name, grp in minutes_sorted.groupby('name_norm'):
        ea, ec = 0.0, 0.0
        for _, row in grp.sort_values('date').iterrows():
            lookup[(name, row['date'])] = (ea, ec)
            m  = float(row['minutes_played'])
            ea = LAMBDA_ACUTE   * m + (1 - LAMBDA_ACUTE)   * ea
            ec = LAMBDA_CHRONIC * m + (1 - LAMBDA_CHRONIC) * ec

    print(f"EWMA lookup: {len(lookup):,} entries")
    return lookup
