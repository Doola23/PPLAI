import logging
import numpy as np
import optuna
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (roc_auc_score, f1_score, precision_score,
                             recall_score, accuracy_score, confusion_matrix)
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

try:
    from lightgbm import LGBMClassifier
    _LGBM_AVAILABLE = True
except ImportError:
    _LGBM_AVAILABLE = False

try:
    from catboost import CatBoostClassifier
    _CATBOOST_AVAILABLE = True
except ImportError:
    _CATBOOST_AVAILABLE = False

from config import OUTPUT_FILE, SEP
from db import write_predictions

logger = logging.getLogger(__name__)

optuna.logging.set_verbosity(optuna.logging.WARNING)

CV_FOLDS = [
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

OPTUNA_FOLD_DEFS = [
    (['2015-2016','2016-2017','2017-2018','2018-2019','2019-2020','2020-2021'],
     '2021-2022'),
    (['2015-2016','2016-2017','2017-2018','2018-2019','2019-2020','2020-2021','2021-2022'],
     '2022-2023'),
    (['2015-2016','2016-2017','2017-2018','2018-2019','2019-2020',
      '2020-2021','2021-2022','2022-2023'],
     '2023-2024'),
]


def _select_threshold(proba: np.ndarray, y_true: pd.Series) -> tuple[float, float]:
    """Return (best_threshold, best_gmean) that maximises G-mean on a validation set."""
    best_gm, best_t = 0.0, 0.5
    for t in np.arange(0.1, 0.9, 0.02):
        y_pred = (proba >= t).astype(int)
        cm     = confusion_matrix(y_true, y_pred)
        tn, fp, fn, tp = cm.ravel()
        sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        gm   = (sens * spec) ** 0.5
        if gm > best_gm:
            best_gm, best_t = gm, t
    return best_t, best_gm


def _evaluate(proba: np.ndarray, y_true: pd.Series, threshold: float) -> dict:
    """Compute all evaluation metrics at a given threshold."""
    y_pred = (proba >= threshold).astype(int)
    cm     = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()
    spec  = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    rec   = recall_score(y_true, y_pred, zero_division=0)
    return {
        'auc':         roc_auc_score(y_true, proba),
        'f1':          f1_score(y_true, y_pred, zero_division=0),
        'precision':   precision_score(y_true, y_pred, zero_division=0),
        'recall':      rec,
        'accuracy':    accuracy_score(y_true, y_pred),
        'specificity': spec,
        'gmean':       (rec * spec) ** 0.5,
        'cm':          cm,
    }


def _print_metrics(metrics: dict, label: str, threshold: float) -> None:
    print(f"\n  {label} Results (threshold={threshold:.2f}):")
    print(f"    AUC-ROC     : {metrics['auc']:.3f}")
    print(f"    Precision   : {metrics['precision']:.3f}")
    print(f"    Sensitivity : {metrics['recall']:.3f}")
    print(f"    Specificity : {metrics['specificity']:.3f}")
    print(f"    G-mean      : {metrics['gmean']:.3f}")


def cross_validate(df: pd.DataFrame, feature_cols: list) -> list:
    """Run 5-fold expanding time-series cross-validation."""
    print(f"\n{SEP}")
    print(' STEP 9 — TIME-SERIES CROSS VALIDATION')
    print(SEP)

    results = []
    for fold_num, (train_seasons, val_season, test_season) in enumerate(CV_FOLDS, 1):
        train = df[df['season'].isin(train_seasons)]
        val   = df[df['season'] == val_season]
        test  = df[df['season'] == test_season]

        X_train, y_train = train[feature_cols].fillna(0), train['label']
        X_val,   y_val   = val[feature_cols].fillna(0),   val['label']
        X_test,  y_test  = test[feature_cols].fillna(0),  test['label']

        neg, pos   = (y_train == 0).sum(), (y_train == 1).sum()
        scale_pos  = min(neg / pos, 10)

        print(f"\nFold {fold_num}:")
        print(f"  Train: {len(X_train):,} rows (pos: {pos:,}, neg: {neg:,}, "
              f"scale_pos_weight: {scale_pos:.1f})")
        print(f"  Val  : {val_season} -> {len(X_val):,} rows")
        print(f"  Test : {test_season} -> {len(X_test):,} rows")

        model = XGBClassifier(
            n_estimators=300, max_depth=4, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, min_child_weight=10,
            reg_alpha=0.1, reg_lambda=2.0, scale_pos_weight=scale_pos,
            random_state=42, verbosity=0, use_label_encoder=False, eval_metric='auc',
        )
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

        threshold, gm = _select_threshold(model.predict_proba(X_val)[:, 1], y_val)
        print(f"  Optimal threshold (val): {threshold:.2f} (G-mean={gm:.3f})")

        for split_name, X_eval, y_eval in [('Val', X_val, y_val), ('Test', X_test, y_test)]:
            proba   = model.predict_proba(X_eval)[:, 1]
            metrics = _evaluate(proba, y_eval, threshold)
            _print_metrics(metrics, split_name, threshold)
            results.append({
                'fold': fold_num, 'split': split_name, 'threshold': threshold,
                'eval_season': val_season if split_name == 'Val' else test_season,
                **{k: v for k, v in metrics.items() if k != 'cm'},
            })

    print(f"\n{SEP}")
    print(' CV SUMMARY — TEST AVERAGES ACROSS 5 WINDOWS')
    print(SEP)
    test_res = [r for r in results if r['split'] == 'Test']
    for m in ['auc', 'recall', 'specificity', 'gmean', 'precision']:
        vals = [r[m] for r in test_res]
        print(f"  {m:<12}: {np.mean(vals):.3f}  ±  {np.std(vals):.3f}")

    return results


def tune_hyperparameters(df: pd.DataFrame, feature_cols: list) -> dict:
    """Run Optuna TPE search over 60 trials, averaging G-mean across 3 validation windows."""
    print(f"\n{SEP}")
    print(' STEP 9.5 — HYPERPARAMETER TUNING (60 trials)')
    print(SEP)

    folds = []
    for tr_seasons, vl_season in OPTUNA_FOLD_DEFS:
        tr  = df[df['season'].isin(tr_seasons)]
        vl  = df[df['season'] == vl_season]
        neg = (tr['label'] == 0).sum()
        pos = (tr['label'] == 1).sum()
        folds.append((
            tr[feature_cols].values, tr['label'].values,
            vl[feature_cols].values, vl['label'].values,
            min(neg / pos, 10),
        ))
    print(f"Optuna folds: val years = {[d[1] for d in OPTUNA_FOLD_DEFS]}")

    def _objective(trial):
        params = dict(
            n_estimators     = trial.suggest_int('n_estimators', 100, 500, step=50),
            max_depth        = trial.suggest_int('max_depth', 3, 5),
            learning_rate    = trial.suggest_float('learning_rate', 0.01, 0.10, log=True),
            subsample        = trial.suggest_float('subsample', 0.6, 0.95),
            colsample_bytree = trial.suggest_float('colsample_bytree', 0.6, 0.90),
            min_child_weight = trial.suggest_int('min_child_weight', 15, 60),
            reg_alpha        = trial.suggest_float('reg_alpha', 0.3, 2.0),
            reg_lambda       = trial.suggest_float('reg_lambda', 1.0, 5.0),
            random_state=42, verbosity=0, use_label_encoder=False, eval_metric='auc',
        )
        gm_scores = []
        for Xtr, ytr, Xvl, yvl, spw in folds:
            m = XGBClassifier(**params, scale_pos_weight=spw)
            m.fit(Xtr, ytr, eval_set=[(Xvl, yvl)], verbose=False)
            proba  = m.predict_proba(Xvl)[:, 1]
            best_gm = 0.0
            for t in np.arange(0.1, 0.9, 0.02):
                yp  = (proba >= t).astype(int)
                cm  = confusion_matrix(yvl, yp)
                tn, fp, fn, tp_ = cm.ravel()
                sens = tp_ / (tp_ + fn) if (tp_ + fn) > 0 else 0.0
                spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
                best_gm = max(best_gm, (sens * spec) ** 0.5)
            gm_scores.append(best_gm)
        return float(np.mean(gm_scores))

    study = optuna.create_study(direction='maximize',
                                sampler=optuna.samplers.TPESampler(seed=42))
    study.enqueue_trial({
        'n_estimators': 250, 'max_depth': 5, 'learning_rate': 0.028,
        'subsample': 0.876, 'colsample_bytree': 0.816, 'min_child_weight': 31,
        'reg_alpha': 0.786, 'reg_lambda': 1.731,
    })
    study.optimize(_objective, n_trials=60, show_progress_bar=False)

    print(f"Best avg G-mean: {study.best_value:.4f}")
    print(f"Best params: {study.best_params}")
    return study.best_params


def train_final_model(df: pd.DataFrame, feature_cols: list, best_params: dict) -> None:
    """Train final model, tune threshold on 2023-24, evaluate on 2024-25, save predictions."""
    print(f"\n{SEP}")
    print(' STEP 10 — FINAL MODEL')
    print(SEP)

    train  = df[~df['season'].isin(['2023-2024', '2024-2025'])]
    val    = df[df['season'] == '2023-2024']
    test   = df[df['season'] == '2024-2025']

    X_train, y_train = train[feature_cols].fillna(0), train['label']
    X_val,   y_val   = val[feature_cols].fillna(0),   val['label']
    X_test,  y_test  = test[feature_cols].fillna(0),  test['label']

    neg, pos = (y_train == 0).sum(), (y_train == 1).sum()
    scale_f  = min(neg / pos, 10)

    print(f"Final train : {len(X_train):,} rows (scale_pos_weight={scale_f:.1f})")
    print(f"Final val   : {len(X_val):,} rows (2023-24, threshold tuning)")
    print(f"Final test  : {len(X_test):,} rows (2024-25)")

    model = XGBClassifier(
        **best_params, scale_pos_weight=scale_f,
        random_state=42, verbosity=0, use_label_encoder=False, eval_metric='auc',
    )
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

    threshold, gm = _select_threshold(model.predict_proba(X_val)[:, 1], y_val)
    print(f"Optimal threshold: {threshold:.2f} (val G-mean={gm:.3f})")

    proba   = model.predict_proba(X_test)[:, 1]
    metrics = _evaluate(proba, y_test, threshold)

    print(f"\nFinal Model — Test on 2024-25:")
    print(f"  AUC-ROC     : {metrics['auc']:.3f}")
    print(f"  Precision   : {metrics['precision']:.3f}")
    print(f"  Sensitivity : {metrics['recall']:.3f}")
    print(f"  Specificity : {metrics['specificity']:.3f}")
    print(f"  G-mean      : {metrics['gmean']:.3f}")
    cm = metrics['cm']
    print(f"\nConfusion Matrix:")
    print(f"  TN={cm[0,0]:,}  FP={cm[0,1]:,}")
    print(f"  FN={cm[1,0]:,}  TP={cm[1,1]:,}")

    # Feature importance
    print(f"\n{SEP}")
    print(' STEP 11 — FEATURE IMPORTANCE')
    print(SEP)
    imp = pd.DataFrame({
        'feature':    feature_cols,
        'importance': model.feature_importances_,
    }).sort_values('importance', ascending=False)
    print(imp.head(15).to_string(index=False))

    # Benchmark summary
    print(f"\n{SEP}")
    print(' SUMMARY — COMPARISON VS PUBLISHED RESEARCH')
    print(SEP)
    print(f"\n{'Metric':<20} {'Our Model':>12} {'Non-GPS Football':>20}")
    print('-' * 55)
    print(f"{'AUC-ROC':<20} {metrics['auc']:>12.3f} {'0.62 - 0.70':>20}")
    print(f"{'Sensitivity':<20} {metrics['recall']:>12.3f} {'0.55 - 0.78':>20}")
    print(f"{'Specificity':<20} {metrics['specificity']:>12.3f} {'0.65 - 0.85':>20}")
    print(f"{'G-mean':<20} {metrics['gmean']:>12.3f} {'0.60 - 0.72':>20}")
    print(f"{'Positive rate':<20} {'~6.1%':>12} {'varies':>20}")
    print(f"{'Window':<20} {'14 days':>12} {'7-14 days':>20}")

    # Risk tier analysis
    print(f"\n{SEP}")
    print(' RISK TIER ANALYSIS (2024-25)')
    print(SEP)
    p85 = np.percentile(proba, 85)
    print(f"Risk threshold: {p85:.3f} (top 15% = High Risk)")
    out = test.copy()
    out['injury_probability']  = proba
    out['predicted_high_risk'] = (proba >= threshold).astype(int)
    out['actual_injured']      = y_test.values
    out['risk_tier']           = np.where(proba >= p85, 'High Risk', 'Low Risk')

    for tier in ['Low Risk', 'High Risk']:
        t    = out[out['risk_tier'] == tier]
        rate = t['actual_injured'].mean() * 100
        print(f"\n{tier}:")
        print(f"  Players in tier    : {len(t):,}")
        print(f"  Actual injury rate : {rate:.1f}%")
        print(f"  Actual injuries    : {t['actual_injured'].sum()}")

    print(f"\nBaseline injury rate: {out['actual_injured'].mean()*100:.1f}%")

    out.to_csv(OUTPUT_FILE, index=False)
    print(f"\nPredictions saved to local file: {OUTPUT_FILE}")
    write_predictions(out)
    print(f"Predictions written to DynamoDB: injuries-predictions")


def compare_models(df: pd.DataFrame, feature_cols: list, best_xgb_params: dict) -> pd.DataFrame:
    """
    Train multiple classifiers on the same final split and print a comparison table.
    Train = up to 2022-23, Val = 2023-24 (threshold tuning), Test = 2024-25.
    """
    print(f"\n{SEP}")
    print(' MODEL COMPARISON — 2024-25 TEST SET')
    print(SEP)

    train = df[~df['season'].isin(['2023-2024', '2024-2025'])]
    val   = df[df['season'] == '2023-2024']
    test  = df[df['season'] == '2024-2025']

    X_train, y_train = train[feature_cols].fillna(0), train['label']
    X_val,   y_val   = val[feature_cols].fillna(0),   val['label']
    X_test,  y_test  = test[feature_cols].fillna(0),  test['label']

    neg, pos = (y_train == 0).sum(), (y_train == 1).sum()
    scale_f  = min(neg / pos, 10)

    # Scale features once for sklearn models
    scaler   = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train)
    X_val_sc   = scaler.transform(X_val)
    X_test_sc  = scaler.transform(X_test)

    candidates = {
        'Logistic Regression': (
            LogisticRegression(
                max_iter=1000, class_weight='balanced',
                C=0.1, solver='lbfgs', random_state=42,
            ),
            X_train_sc, X_val_sc, X_test_sc,
        ),
        'Random Forest': (
            RandomForestClassifier(
                n_estimators=300, max_depth=12,
                class_weight='balanced', random_state=42, n_jobs=-1,
            ),
            X_train_sc, X_val_sc, X_test_sc,
        ),
        'XGBoost': (
            XGBClassifier(
                **best_xgb_params, scale_pos_weight=scale_f,
                random_state=42, verbosity=0,
                use_label_encoder=False, eval_metric='auc',
            ),
            X_train, X_val, X_test,
        ),
    }

    if _LGBM_AVAILABLE:
        candidates['LightGBM'] = (
            LGBMClassifier(
                n_estimators=500, max_depth=4, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                scale_pos_weight=scale_f,
                random_state=42, verbosity=-1,
            ),
            X_train, X_val, X_test,
        )

    if _CATBOOST_AVAILABLE:
        candidates['CatBoost'] = (
            CatBoostClassifier(
                iterations=500, depth=4, learning_rate=0.05,
                scale_pos_weight=scale_f,
                random_seed=42, verbose=0,
            ),
            X_train, X_val, X_test,
        )

    rows = []
    for name, (model, Xtr, Xvl, Xte) in candidates.items():
        print(f"  Training {name}...", end=' ', flush=True)

        if name == 'XGBoost':
            model.fit(Xtr, y_train, eval_set=[(Xvl, y_val)], verbose=False)
        elif name == 'LightGBM':
            model.fit(Xtr, y_train, eval_set=[(Xvl, y_val)], callbacks=[])
        elif name == 'CatBoost':
            model.fit(Xtr, y_train, eval_set=(Xvl, y_val))
        else:
            model.fit(Xtr, y_train)

        val_proba  = model.predict_proba(Xvl)[:, 1]
        threshold, _ = _select_threshold(val_proba, y_val)

        test_proba = model.predict_proba(Xte)[:, 1]
        m          = _evaluate(test_proba, y_test, threshold)

        # Risk tier separation (top 15%)
        p85      = np.percentile(test_proba, 85)
        high_idx = test_proba >= p85
        high_rate = y_test.values[high_idx].mean() * 100
        low_rate  = y_test.values[~high_idx].mean() * 100

        rows.append({
            'Model':       name,
            'AUC-ROC':     round(m['auc'], 3),
            'Sensitivity': round(m['recall'], 3),
            'Specificity': round(m['specificity'], 3),
            'Precision':   round(m['precision'], 3),
            'G-mean':      round(m['gmean'], 3),
            'High Risk %': f"{high_rate:.1f}%",
            'Low Risk %':  f"{low_rate:.1f}%",
            'Threshold':   round(threshold, 2),
        })
        print(f"done  (AUC={m['auc']:.3f}, G-mean={m['gmean']:.3f})")

    results = pd.DataFrame(rows).set_index('Model')

    print(f"\n{'─' * 90}")
    print(results.to_string())
    print(f"{'─' * 90}")
    print(f"\nBaseline injury rate (all players): {y_test.mean()*100:.1f}%")
    print("High Risk = top 15% of predicted probabilities")

    return results
