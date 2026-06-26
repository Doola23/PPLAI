# ScoutLab ML pipeline

Regenerates the scouting role classification + player similarity that power the
ScoutLab UI (position groups, role labels, "similar players", archetypes).

## Files
| File | What it does |
|---|---|
| `run_ml_2425.py` | The pipeline (v4). Position-detects every player (FBref `Pos` + Transfermarkt granular position + stats), KMeans-clusters per position, assigns roles, and computes **within-position cosine similarity**. Writes the result into `scouting_bundle.json`'s `ml` block. |
| `upload_ml_to_dynamo.cjs` | Pushes the bundle's `ml` (roles, similarity, roleProfiles, modelInfo) to the `scouting-ml` DynamoDB table. Re-keys player entries to the frontend lookup format (`Player.toLowerCase().trim()`, accents preserved) plus an accent-stripped fallback. |
| `scouting_ml_backup.cjs` | Read-only: backs up the whole `scouting-ml` table to a local JSON before any change. |
| `scouting_ml_reclassify.cjs` | Targeted DB-only reclassification helper (dry-run by default; `--apply` to write). |

## Why similarity is computed per position
Similarity is cosine distance over **position-specific** per-90 features, computed
only *within* a player's position group. So a winger is compared to other wingers,
not to central midfielders. If a player is misclassified (e.g. a winger placed in
MF), their similarity list is wrong — fixing the position fixes the similarity.

## Data inputs (on this machine, not in the repo)
- Bundle: `C:\Users\DELL\Desktop\public\scoutlab\public\scouting_bundle.json`
- TM positions: `C:\Users\DELL\Documents\scouting\player_profiles.csv`

## Re-run
```bash
# 1. Regenerate ml into the bundle (UTF-8 needed on Windows consoles)
PYTHONUTF8=1 python scouting/ml/run_ml_2425.py

# 2. Upload to DynamoDB (uses backend/.env at runtime; never prints credentials)
cd backend && node ../scouting/ml/upload_ml_to_dynamo.cjs   # adjust path if run elsewhere

# 3. Restart the backend so the /primary cache refreshes
```

The DB is backed up to `backend/scouting_ml_backup.json` and the bundle to
`scouting_bundle.json.bak` before changes — both are reversible.
