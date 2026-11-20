# ScoutLab ML pipeline

Regenerates the scouting role classification + player similarity that power the
ScoutLab UI (position groups, role labels, "similar players", archetypes).

## Files
| File | What it does |
|---|---|
| `run_ml_2425.py` | The pipeline (v4). Position-detects every player (FBref `Pos` + Transfermarkt granular position + stats), KMeans-clusters per position, assigns roles, and computes **within-position cosine similarity**. Writes the result into `../data/scouting_bundle.json`'s `ml` block. |

## Why similarity is computed per position
Similarity is cosine distance over **position-specific** per-90 features, computed
only *within* a player's position group. So a winger is compared to other wingers,
not to central midfielders. If a player is misclassified (e.g. a winger placed in
MF), their similarity list is wrong — fixing the position fixes the similarity.

## Data inputs
- Bundle: `ml/scouting/data/scouting_bundle.json` (tracked)
- TM positions: `ml/scouting/data/player_profiles.csv` (local only, git-ignored)

## Re-run
```bash
# Regenerate ml into the bundle (UTF-8 needed on Windows consoles)
PYTHONUTF8=1 python ml/scouting/ml/run_ml_2425.py

# Restart the backend so it reloads the bundle
```
