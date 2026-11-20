"""Re-run every ML pipeline and check the files the backend serves were produced.

    python ml/run_all.py                    # all pipelines
    python ml/run_all.py match scouting     # a subset
    python ml/run_all.py --check            # only verify inputs/outputs exist

Restart the backend afterwards so it reloads the refreshed outputs.
"""
import argparse
import os
import subprocess
import sys
import time

ML = os.path.dirname(os.path.abspath(__file__))


def p(*parts):
    return os.path.join(ML, *parts)


PIPELINES = {
    'match': {
        'cwd': p('match_prediction'),
        'scripts': ['MatchPredict.py'],
        'inputs': [p('match_prediction', 'data', 'pl_lineups.csv'), p('match_prediction', 'premierleaguedata', '24_25.csv'),
                   p('match_prediction', 'xg', 'premier_league_xg_data_2015-2024.csv')],
        'outputs': [p('match_prediction', 'outputs', f) for f in (
            'match_predictions.csv', 'predicted_standings.csv', 'actual_standings.csv', 'standings_comparison.csv',
            'analyst_reports_season.csv', 'analyst_reports_last5.csv', 'team_reports.csv')],
    },
    'injury': {
        'cwd': p('injury_prediction'),
        'scripts': ['main.py'],
        'inputs': [p('injury_prediction', 'data', f) for f in (
            'player_minutes.csv', 'injuries_combined_clean.csv', 'players_combined_complete.csv',
            'fpl_historical.csv', 'fpl_api_data.csv', 'international_breaks.csv')] + [p('data', 'fbref', '2024_PL.csv')],
        'outputs': [p('injury_prediction', 'outputs', 'injury_predictions.csv')],
    },
    'player_stats': {
        'cwd': p('player_stats'),
        'scripts': ['generate_predictions.py'],
        'inputs': [p('data', 'fbref', '2024_PL.csv'), p('match_prediction', 'data', 'injuries.csv'),
                   p('player_stats', 'optuna_best_params_per_target.csv')],
        'outputs': [p('player_stats', 'outputs', 'Strikers_2025_Predictions.csv')],
    },
    'scouting': {
        'cwd': p('scouting', 'ml'),
        'scripts': ['run_ml_2425.py', 'generate_team_reports.py'],
        'inputs': [p('scouting', 'data', 'scouting_bundle.json.gz'), p('scouting', 'data', 'player_profiles.csv'),
                   p('match_prediction', 'outputs', 'analyst_reports_season.csv')],
        'outputs': [p('scouting', 'data', 'scouting_bundle.json.gz'), p('scouting', 'data', 'team_reports.json')],
    },
}


def lfs_pointer(path):
    with open(path, 'rb') as f:
        return f.read(40).startswith(b'version https://git-lfs')


def check(name, files, kind):
    missing = [f for f in files if not os.path.exists(f)]
    pointers = [f for f in files if os.path.exists(f) and lfs_pointer(f)]
    for f in missing:
        print(f'  [{name}] missing {kind}: {os.path.relpath(f, ML)}')
    for f in pointers:
        print(f'  [{name}] {kind} is an un-fetched LFS pointer (run `git lfs pull`): {os.path.relpath(f, ML)}')
    return not missing and not pointers


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('pipelines', nargs='*', help=f'subset to run: {", ".join(PIPELINES)} (default: all)')
    ap.add_argument('--check', action='store_true', help='only verify inputs and outputs exist')
    args = ap.parse_args()
    unknown = [n for n in args.pipelines if n not in PIPELINES]
    if unknown:
        ap.error(f'unknown pipeline(s): {", ".join(unknown)}')
    names = args.pipelines or list(PIPELINES)

    ok = all([check(n, PIPELINES[n]['inputs'], 'input') for n in names])
    if args.check:
        ok = all([check(n, PIPELINES[n]['outputs'], 'output') for n in names]) and ok
        print('All inputs and outputs present.' if ok else 'Some files are missing.')
        return 0 if ok else 1
    if not ok:
        return 1

    env = {**os.environ, 'PYTHONUTF8': '1'}
    for n in names:
        cfg = PIPELINES[n]
        print(f'\n=== {n} ===')
        start = time.time()
        for script in cfg['scripts']:
            result = subprocess.run([sys.executable, script], cwd=cfg['cwd'], env=env)
            if result.returncode != 0:
                print(f'{n}: {script} failed (exit {result.returncode}).')
                return result.returncode
        if not check(n, cfg['outputs'], 'output'):
            return 1
        print(f'{n} done in {time.time() - start:.0f}s')

    print('\nAll pipelines finished. Restart the backend to serve the new outputs.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
