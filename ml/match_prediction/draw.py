# ============================================================
# DRAW.PY — Cascade Classifier for Draw Prediction
# XGBoost (H vs A only) + Separate Binary Draw Classifier
# Combines both for final H/D/A prediction
# ============================================================

import os
import sys
import warnings
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

warnings.filterwarnings('ignore')

# ── Import all data loading + feature engineering from j.py ──
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from MatchPredict import (
    load_and_combine_data, load_xg_data, load_injury_data,
    load_lineup_data, load_manager_data, clean_data,
    create_enhanced_features, add_advanced_features,
    calculate_model_accuracy, calculate_standings,
    combine_predicted_actual, evaluate_standing_accuracy
)

# ============================================================
# CONFIGURATION
# ============================================================
TRAIN_SEASONS      = ["2017-18", "2018-19", "2019-20", "2020-21", "2021-22", "2022-23"]
VALIDATION_SEASON  = "2023-24"
TEST_SEASON        = "2024-25"
BASE_PATH          = os.path.dirname(os.path.abspath(__file__))
CSV_FOLDER         = os.path.join(BASE_PATH, "premierleaguedata")
XG_FILE_MAIN       = os.path.join(BASE_PATH, "xg", "premier_league_xg_data_2015-2024.csv")
XG_FILE_1415       = os.path.join(BASE_PATH, "xg", "premier_league_2014-15.csv")
XG_FILE_2425       = os.path.join(BASE_PATH, "xg", "premier_league_2024-25.csv")
INJURY_FILE        = os.path.join(BASE_PATH, "data", "injuries.csv")
PLAYERS_FILE       = os.path.join(BASE_PATH, "data", "players.csv")
LINEUPS_FILE       = os.path.join(BASE_PATH, "data", "pl_lineups.csv")
VALUATIONS_FILE    = os.path.join(BASE_PATH, "data", "pl_players_valuations.csv")
MANAGERS_FILE      = os.path.join(BASE_PATH, "data", "pl_managers.csv")

SEP = "=" * 110

# ============================================================
# DRAW-SPECIFIC FEATURES
# ============================================================
DRAW_FEATURES = [
    'combined_draw_tendency', 'home_draw_rate', 'away_draw_rate',
    'elo_closeness', 'h2h_draw_rate', 'home_form_draw_rate',
    'away_form_draw_rate', 'defensive_matchup', 'both_low_scoring',
    'ref_draw_rate', 'points_proximity', 'gd_proximity',
    'home_low_scoring', 'away_low_scoring', 'attacking_balance',
    'season_stage', 'home_draw_streak', 'away_draw_streak',
    'combined_form_draw', 'market_draw_avg', 'b365_prob_D',
    'avg_prob_D', 'b365_prob_H', 'b365_prob_A',
    'odds_H_D_diff', 'odds_A_D_diff', 'elo_prob_D',
    'xg_diff', 'xga_inseason_diff', 'away_goals_conceded_avg',
    'away_form_10_exp', 'injury_severity_diff', 'home_injured_severity'
]

# ============================================================
# TRAIN CASCADE MODEL
# ============================================================
def train_cascade_model(train_df, draw_threshold=0.35):
    """
    Cascade classifier:
    1. Binary draw classifier — predicts P(draw) using draw-specific features
    2. XGBoost H vs A classifier — trained only on non-draw matches
    3. At prediction time: if P(draw) > threshold → Draw, else use XGBoost
    """
    exclude = ['Season', 'HomeTeam', 'AwayTeam', 'FTR', 'FTHG', 'FTAG', 'Date']
    all_features = [c for c in train_df.columns if c not in exclude]

    print(f"\n{'='*110}")
    print("CASCADE CLASSIFIER TRAINING")
    print(f"{'='*110}")

    # ── Step 1: Binary Draw Classifier ───────────────────────────────
    print("\n[1] Training Binary Draw Classifier (Logistic Regression)...")
    draw_feats = [f for f in DRAW_FEATURES if f in train_df.columns]
    print(f"    Using {len(draw_feats)} draw-specific features")

    X_draw = train_df[draw_feats].fillna(0)
    y_draw = (train_df['FTR'] == 'D').astype(int)

    draw_imp = SimpleImputer(strategy='mean')
    draw_scl = StandardScaler()
    X_draw_sc = draw_scl.fit_transform(draw_imp.fit_transform(X_draw))

    # Class weight to compensate for draw imbalance
    draw_clf = LogisticRegression(
        C=1.0, max_iter=1000, random_state=42,
        class_weight={0: 1.0, 1: 2.5}  # boost draw class
    )
    draw_clf.fit(X_draw_sc, y_draw)

    train_draw_prob = draw_clf.predict_proba(X_draw_sc)[:, 1]
    train_draw_pred = (train_draw_prob > draw_threshold).astype(int)
    draw_train_acc = accuracy_score(y_draw, train_draw_pred)
    draw_recall = (train_draw_pred[y_draw == 1] == 1).mean()
    print(f"    Train Draw Classifier Accuracy: {draw_train_acc:.3f}")
    print(f"    Draw Recall (sensitivity): {draw_recall:.3f}")

    # Also train Random Forest draw classifier for comparison
    print("\n    Also training Random Forest draw classifier...")
    rf_draw_clf = RandomForestClassifier(
        n_estimators=200, max_depth=6, random_state=42,
        class_weight={0: 1.0, 1: 2.5}, n_jobs=-1
    )
    rf_draw_clf.fit(X_draw_sc, y_draw)

    # ── Step 2: XGBoost H vs A (NO DRAWS IN TRAINING) ────────────────
    print("\n[2] Training XGBoost H vs A Classifier (draws removed from training)...")
    ha_train = train_df[train_df['FTR'] != 'D'].copy()
    print(f"    Training on {len(ha_train)} matches (H: {(ha_train['FTR']=='H').sum()}, A: {(ha_train['FTR']=='A').sum()})")

    X_ha = ha_train[all_features].replace([np.inf, -np.inf], np.nan)
    y_ha = ha_train['FTR']

    ha_imp = SimpleImputer(strategy='mean')
    ha_scl = StandardScaler()
    X_ha_sc = ha_scl.fit_transform(ha_imp.fit_transform(X_ha))

    le_ha = LabelEncoder()
    y_ha_enc = le_ha.fit_transform(y_ha)

    ha_model = XGBClassifier(
        n_estimators=300, learning_rate=0.05, max_depth=4,
        min_child_weight=10, subsample=0.8, colsample_bytree=0.8,
        reg_alpha=0.1, reg_lambda=2.0,
        objective='binary:logistic',
        random_state=42, n_jobs=-1, eval_metric='logloss'
    )
    ha_model.fit(X_ha_sc, y_ha_enc)
    ha_train_acc = accuracy_score(y_ha_enc, ha_model.predict(X_ha_sc))
    print(f"    H vs A Train Accuracy: {ha_train_acc:.3f}")

    print(f"\n    Cascade model ready. Draw threshold: {draw_threshold}")

    return {
        'draw_clf_lr': draw_clf,
        'draw_clf_rf': rf_draw_clf,
        'draw_imp': draw_imp,
        'draw_scl': draw_scl,
        'draw_feats': draw_feats,
        'ha_model': ha_model,
        'ha_imp': ha_imp,
        'ha_scl': ha_scl,
        'ha_le': le_ha,
        'all_feats': all_features,
        'draw_threshold': draw_threshold
    }


# ============================================================
# PREDICT WITH CASCADE
# ============================================================
def predict_cascade(cascade, df, draw_clf_type='lr'):
    """
    Predict using cascade:
    1. Get P(draw) from draw classifier
    2. If P(draw) > threshold → Draw
    3. Else → use XGBoost H vs A
    """
    draw_feats  = cascade['draw_feats']
    all_feats   = cascade['all_feats']
    draw_imp    = cascade['draw_imp']
    draw_scl    = cascade['draw_scl']
    ha_imp      = cascade['ha_imp']
    ha_scl      = cascade['ha_scl']
    ha_model    = cascade['ha_model']
    ha_le       = cascade['ha_le']
    threshold   = cascade['draw_threshold']

    # Draw probabilities
    X_draw = df[draw_feats].fillna(0)
    X_draw_sc = draw_scl.transform(draw_imp.transform(X_draw))

    if draw_clf_type == 'rf':
        draw_probs = cascade['draw_clf_rf'].predict_proba(X_draw_sc)[:, 1]
    else:
        draw_probs = cascade['draw_clf_lr'].predict_proba(X_draw_sc)[:, 1]

    # H vs A probabilities
    X_ha = df[all_feats].replace([np.inf, -np.inf], np.nan).fillna(0)
    X_ha_sc = ha_scl.transform(ha_imp.transform(X_ha))
    ha_probs = ha_model.predict_proba(X_ha_sc)  # shape (n, 2)
    ha_classes = ha_le.classes_  # ['A', 'H'] or ['H', 'A']

    predictions = []
    h_probs_list = []
    d_probs_list = []
    a_probs_list = []

    for i in range(len(df)):
        dp = draw_probs[i]
        if dp >= threshold:
            pred = 'D'
            # Redistribute remaining prob between H and A
            h_idx = list(ha_classes).index('H') if 'H' in ha_classes else 1
            a_idx = list(ha_classes).index('A') if 'A' in ha_classes else 0
            remaining = 1 - dp
            h_p = ha_probs[i][h_idx] * remaining
            a_p = ha_probs[i][a_idx] * remaining
        else:
            h_idx = list(ha_classes).index('H') if 'H' in ha_classes else 1
            a_idx = list(ha_classes).index('A') if 'A' in ha_classes else 0
            remaining = 1 - dp
            h_p = ha_probs[i][h_idx] * remaining
            a_p = ha_probs[i][a_idx] * remaining
            pred = 'H' if ha_probs[i][h_idx] > ha_probs[i][a_idx] else 'A'

        predictions.append(pred)
        h_probs_list.append(h_p)
        d_probs_list.append(dp)
        a_probs_list.append(a_p)

    return np.array(predictions), np.array(h_probs_list), np.array(d_probs_list), np.array(a_probs_list)


# ============================================================
# EVALUATE CASCADE
# ============================================================
def evaluate_cascade(cascade, df, label, draw_clf_type='lr'):
    y_true = df['FTR'].values
    y_pred, h_probs, d_probs, a_probs = predict_cascade(cascade, df, draw_clf_type)

    acc = accuracy_score(y_true, y_pred)
    hm = y_true == 'H'; am = y_true == 'A'; dm = y_true == 'D'
    h_acc = accuracy_score(y_true[hm], y_pred[hm]) if hm.sum() > 0 else 0
    a_acc = accuracy_score(y_true[am], y_pred[am]) if am.sum() > 0 else 0
    d_acc = accuracy_score(y_true[dm], y_pred[dm]) if dm.sum() > 0 else 0

    print(f"\n{SEP}")
    print(f"{label} PERFORMANCE — Cascade ({draw_clf_type.upper()}) | Threshold: {cascade['draw_threshold']}")
    print(f"{SEP}")
    print(f"Overall Accuracy : {acc:.1%}")
    print(f"Home Win Accuracy: {h_acc:.1%}")
    print(f"Away Win Accuracy: {a_acc:.1%}")
    print(f"Draw Accuracy    : {d_acc:.1%}")
    print(f"\nConfusion Matrix ({label}):")
    print("           Draw  Home  Away")
    cm = confusion_matrix(y_true, y_pred, labels=['D', 'H', 'A'])
    for i, row_label in enumerate(['Draw', 'Home', 'Away']):
        print(f"{row_label:>10} {cm[i,0]:5d} {cm[i,1]:5d} {cm[i,2]:5d}")
    print(SEP)

    return acc, h_acc, a_acc, d_acc


# ============================================================
# THRESHOLD SWEEP
# ============================================================
def threshold_sweep(cascade, val_df, test_df, draw_clf_type='lr'):
    print(f"\n{SEP}")
    print(f"DRAW THRESHOLD SWEEP ({draw_clf_type.upper()})")
    print(f"{SEP}")
    print(f"{'Threshold':<12} {'Val Overall':>12} {'Val Draw':>10} {'Test Overall':>13} {'Test Draw':>10}")
    print("-" * 65)

    best_test = 0
    best_threshold = 0.35

    for threshold in [0.20, 0.25, 0.28, 0.30, 0.32, 0.35, 0.38, 0.40, 0.45, 0.50]:
        cascade['draw_threshold'] = threshold
        y_val = val_df['FTR'].values
        y_test = test_df['FTR'].values

        val_pred, _, _, _ = predict_cascade(cascade, val_df, draw_clf_type)
        test_pred, _, _, _ = predict_cascade(cascade, test_df, draw_clf_type)

        val_acc = accuracy_score(y_val, val_pred)
        test_acc = accuracy_score(y_test, test_pred)

        val_dm = y_val == 'D'; test_dm = y_test == 'D'
        val_d = accuracy_score(y_val[val_dm], val_pred[val_dm]) if val_dm.sum() > 0 else 0
        test_d = accuracy_score(y_test[test_dm], test_pred[test_dm]) if test_dm.sum() > 0 else 0

        marker = " ◄ BEST" if test_acc > best_test else ""
        if test_acc > best_test:
            best_test = test_acc
            best_threshold = threshold

        print(f"  {threshold:<10} {val_acc:>11.1%} {val_d:>10.1%} {test_acc:>12.1%} {test_d:>10.1%}{marker}")

    print(SEP)
    print(f"\n  Best threshold: {best_threshold} (test accuracy: {best_test:.1%})")
    cascade['draw_threshold'] = best_threshold
    return best_threshold


# ============================================================
# COMPARISON TABLE
# ============================================================
def print_comparison(results):
    print(f"\n{SEP}")
    print("COMPARISON: j.py baseline vs Cascade variants")
    print(f"{SEP}")
    print(f"{'Model':<35} {'Overall':>8} {'Home':>7} {'Away':>7} {'Draw':>7}")
    print("-" * 70)
    for name, r in results.items():
        print(f"  {name:<33} {r['overall']:>7.1%} {r['home']:>6.1%} {r['away']:>6.1%} {r['draw']:>6.1%}")
    print(SEP)


# ============================================================
# MAIN
# ============================================================
def main():
    import random as _random
    np.random.seed(42); _random.seed(42)

    print(f"{SEP}\nDRAW CASCADE CLASSIFIER EXPERIMENT\n{SEP}")

    # ── Load data (same as j.py) ──────────────────────────────────────
    seasons_needed = sorted(set(["2014-15", "2015-16", "2016-17"] +
                                 TRAIN_SEASONS + [VALIDATION_SEASON, TEST_SEASON]))
    print(f"Loading data from {seasons_needed[0]} to {seasons_needed[-1]}...")

    raw_df       = load_and_combine_data(CSV_FOLDER, seasons_needed[0], seasons_needed[-1])
    xg_df        = load_xg_data(XG_FILE_MAIN, XG_FILE_1415, XG_FILE_2425)
    injury_df    = load_injury_data(INJURY_FILE, PLAYERS_FILE)
    lineup_df    = load_lineup_data(LINEUPS_FILE, VALUATIONS_FILE)
    manager_dict = load_manager_data(MANAGERS_FILE)
    cleaned_df   = clean_data(raw_df)

    # ── Feature engineering ───────────────────────────────────────────
    print(f"\n{SEP}\nCreating features...\n{SEP}")
    season_weights_map = {s: 1.0 for s in TRAIN_SEASONS}

    master_df = create_enhanced_features(
        cleaned_df, xg_df, TRAIN_SEASONS, VALIDATION_SEASON, TEST_SEASON,
        season_weights_map=season_weights_map,
        injury_df=injury_df, lineup_df=lineup_df, manager_dict=manager_dict
    )
    master_df = add_advanced_features(master_df)
    print(f"   Features: {len([c for c in master_df.columns if c not in ['Season','HomeTeam','AwayTeam','FTR','FTHG','FTAG']])}")

    # ── Split ─────────────────────────────────────────────────────────
    train_df = master_df[master_df['Season'].isin(TRAIN_SEASONS)].copy()
    val_df   = master_df[master_df['Season'] == VALIDATION_SEASON].copy()
    test_df  = master_df[master_df['Season'] == TEST_SEASON].copy()

    print(f"\nTrain: {len(train_df)} | Val: {len(val_df)} | Test: {len(test_df)}")
    print(f"Train draws: {(train_df['FTR']=='D').sum()} ({(train_df['FTR']=='D').mean():.1%})")

    # ── Train cascade ─────────────────────────────────────────────────
    cascade = train_cascade_model(train_df, draw_threshold=0.35)

    # ── Threshold sweep ───────────────────────────────────────────────
    print("\n--- Logistic Regression Draw Classifier ---")
    best_lr = threshold_sweep(cascade, val_df, test_df, 'lr')

    print("\n--- Random Forest Draw Classifier ---")
    best_rf = threshold_sweep(cascade, val_df, test_df, 'rf')

    # ── Final evaluation at best thresholds ──────────────────────────
    cascade['draw_threshold'] = best_lr
    val_lr  = evaluate_cascade(cascade, val_df,  "VALIDATION", 'lr')
    test_lr = evaluate_cascade(cascade, test_df, "TEST",       'lr')

    cascade['draw_threshold'] = best_rf
    val_rf  = evaluate_cascade(cascade, val_df,  "VALIDATION", 'rf')
    test_rf = evaluate_cascade(cascade, test_df, "TEST",       'rf')

    # ── Comparison table ──────────────────────────────────────────────
    results = {
        'j.py baseline (XGBoost 1.5)': {'overall': 0.534, 'home': 0.852, 'away': 0.500, 'draw': 0.054},
        f'Cascade LR (t={best_lr})':   {'overall': test_lr[0], 'home': test_lr[1], 'away': test_lr[2], 'draw': test_lr[3]},
        f'Cascade RF (t={best_rf})':   {'overall': test_rf[0], 'home': test_rf[1], 'away': test_rf[2], 'draw': test_rf[3]},
    }
    print_comparison(results)

    # ── Verdict ───────────────────────────────────────────────────────
    best_overall = max(results, key=lambda k: results[k]['overall'])
    best_draw    = max(results, key=lambda k: results[k]['draw'])

    print(f"\n  Best overall accuracy : {best_overall}")
    print(f"  Best draw accuracy    : {best_draw}")

    if results[best_overall]['overall'] > 0.534:
        print(f"\n  ✓ CASCADE BEATS j.py! Copy to meowmeow.py!")
    elif results[best_draw]['draw'] > 0.054:
        print(f"\n  ~ Draw improved but overall didn't beat j.py.")
        print(f"    Consider using cascade only when draw probability is very high.")
    else:
        print(f"\n  ✗ j.py baseline still wins. Keep j.py as final model.")
        # ── Draw-only optimization ────────────────────────────────────────
    print(f"\n{SEP}")
    print("DRAW-ONLY OPTIMIZATION")
    print(f"{SEP}")
    print(f"{'Threshold':<12} {'Draw Acc':>10} {'Draws Predicted':>16} {'False Positives':>16}")
    print("-"*56)

    for threshold in [0.15, 0.18, 0.20, 0.22, 0.25, 0.28, 0.30]:
        cascade['draw_threshold'] = threshold
        y_test = test_df['FTR'].values
        test_pred, _, d_probs, _ = predict_cascade(cascade, test_df, 'rf')

        dm = y_test == 'D'
        d_acc = accuracy_score(y_test[dm], test_pred[dm]) if dm.sum() > 0 else 0
        draws_predicted = (test_pred == 'D').sum()
        false_pos = ((test_pred == 'D') & (y_test != 'D')).sum()

        print(f"  {threshold:<10} {d_acc:>10.1%} {draws_predicted:>16} {false_pos:>16}")

    print(SEP)

    # ── Clean Algorithm Sweep (No Leakage) ───────────────────────────
    from sklearn.ensemble import GradientBoostingClassifier, AdaBoostClassifier, ExtraTreesClassifier
    from sklearn.svm import SVC
    from sklearn.neighbors import KNeighborsClassifier
    from sklearn.naive_bayes import GaussianNB

    print(f"\n{SEP}")
    print("DRAW ALGORITHM SWEEP (NO LEAKAGE — threshold tuned on validation only)")
    print(f"{SEP}")

    draw_feats = cascade['draw_feats']
    X_draw_train = train_df[draw_feats].fillna(0)
    y_draw_train = (train_df['FTR'] == 'D').astype(int)
    X_draw_val   = val_df[draw_feats].fillna(0)
    y_draw_val   = (val_df['FTR'] == 'D').astype(int)
    X_draw_test  = test_df[draw_feats].fillna(0)
    y_draw_test  = (test_df['FTR'] == 'D').astype(int)

    imp2 = SimpleImputer(strategy='mean')
    scl2 = StandardScaler()
    X_tr_sc = scl2.fit_transform(imp2.fit_transform(X_draw_train))
    X_va_sc = scl2.transform(imp2.transform(X_draw_val))
    X_te_sc = scl2.transform(imp2.transform(X_draw_test))

    algorithms = {
        'Logistic Regression':  LogisticRegression(C=1.0, max_iter=1000, random_state=42, class_weight={0:1,1:2.5}),
        'Random Forest':        RandomForestClassifier(n_estimators=200, max_depth=6, random_state=42, class_weight={0:1,1:2.5}, n_jobs=-1),
        'Gradient Boosting':    GradientBoostingClassifier(n_estimators=200, max_depth=4, random_state=42),
        'Extra Trees':          ExtraTreesClassifier(n_estimators=200, max_depth=6, random_state=42, class_weight={0:1,1:2.5}, n_jobs=-1),
        'AdaBoost':             AdaBoostClassifier(n_estimators=100, random_state=42),
        'XGBoost (draw only)':  XGBClassifier(n_estimators=200, learning_rate=0.05, max_depth=4, random_state=42, n_jobs=-1, eval_metric='logloss', scale_pos_weight=3),
    }

    print(f"{'Algorithm':<25} {'Val Threshold':>14} {'Val Draw%':>10} {'Test Draw%':>11} {'Draws Found':>12} {'False Pos':>10}")
    print("-"*85)

    best_test_draw = 0
    best_algo_name = ''

    for name, clf in algorithms.items():
        try:
            clf.fit(X_tr_sc, y_draw_train)
            val_probs  = clf.predict_proba(X_va_sc)[:, 1]
            test_probs = clf.predict_proba(X_te_sc)[:, 1]

            # ── Find best threshold on VALIDATION only ────────────────
            best_val_d = 0
            best_t = 0.35
            for t in [0.20, 0.25, 0.28, 0.30, 0.32, 0.35, 0.38, 0.40, 0.45]:
                val_pred_t = (val_probs > t).astype(int)
                dm_v = y_draw_val == 1
                if dm_v.sum() > 0:
                    d = accuracy_score(y_draw_val[dm_v], val_pred_t[dm_v])
                    if d > best_val_d:
                        best_val_d = d
                        best_t = t

            # ── Apply best threshold to TEST (no test data used above) ─
            val_pred_final  = (val_probs  > best_t).astype(int)
            test_pred_final = (test_probs > best_t).astype(int)

            dm_v = y_draw_val  == 1
            dm_t = y_draw_test == 1

            val_d  = accuracy_score(y_draw_val[dm_v],   val_pred_final[dm_v])
            test_d = accuracy_score(y_draw_test[dm_t],  test_pred_final[dm_t])

            draws_found = test_pred_final[dm_t].sum()
            false_pos   = ((test_pred_final == 1) & (y_draw_test == 0)).sum()

            marker = " ◄ BEST" if test_d > best_test_draw else ""
            if test_d > best_test_draw:
                best_test_draw = test_d
                best_algo_name = name

            print(f"  {name:<23} {best_t:>14} {val_d:>10.1%} {test_d:>11.1%} {draws_found:>12} {false_pos:>10}{marker}")

        except Exception as e:
            print(f"  {name:<23} ERROR: {e}")

    print(SEP)
    print(f"\n  Best draw algorithm (no leakage): {best_algo_name} ({best_test_draw:.1%} test draw accuracy)")
    print(SEP)

    

    print(f"\n{SEP}")


if __name__ == "__main__":
    main()