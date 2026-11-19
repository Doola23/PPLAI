"""Local CSV data sources for the injury model."""

import os

import pandas as pd

from config import DATA_DIR

SOURCE_FILES = {
    'minutes':  'player_minutes.csv',
    'injuries': 'injuries_combined_clean.csv',
    'players':  'players_combined_complete.csv',
    'fpl':      'fpl_historical.csv',
    'fpl_api':  'fpl_api_data.csv',
    'breaks':   'international_breaks.csv',
}


def load_source(key: str) -> pd.DataFrame:
    path = os.path.join(DATA_DIR, SOURCE_FILES[key])
    print(f"  Loading {SOURCE_FILES[key]}...", end=' ', flush=True)
    df = pd.read_csv(path, encoding='utf-8-sig', low_memory=False)
    print(f"{len(df):,} rows")
    return df
