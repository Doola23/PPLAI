"""
Premier League Injury Risk Model
XGBoost binary classifier — predicts whether a player will miss 1+ matches in next 14 days.

Usage:
    python main.py
"""

import logging
import warnings
warnings.filterwarnings('ignore')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s  %(message)s',
    datefmt='%H:%M:%S',
)

from config import FEATURE_COLS
from data_loader import load_all_data
from precompute import run_all_precomputations
from features import build_dataset, prepare_features
from model import cross_validate, tune_hyperparameters, train_final_model


if __name__ == '__main__':
    data    = load_all_data()
    lookups = run_all_precomputations(data)

    df = build_dataset(data, lookups)
    df = prepare_features(df, FEATURE_COLS)

    cross_validate(df, FEATURE_COLS)
    best_params = tune_hyperparameters(df, FEATURE_COLS)
    train_final_model(df, FEATURE_COLS, best_params)
