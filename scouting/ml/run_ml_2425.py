"""
run_ml_2425.py  —  ScoutLab ML v4
==================================
Improvements over v3:
  • Uses TM granular position ("Attack - Right Winger" etc.) to fix FW/WG split
  • Stats-based fallback winger detection (high takeons + low npxg)
  • Combines 24/25 (primary) + 23/24 (fallback) so injured stars like Rodri are included
  • Accent-normalised name keys for reliable lookups
  • Tighter role rules per cluster
"""

import json, re, unicodedata
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
import warnings
warnings.filterwarnings("ignore")

BUNDLE_PATH = r"C:\Users\DELL\Desktop\public\scoutlab\public\scouting_bundle.json"
TM_PROFILES = r"C:\Users\DELL\Documents\scouting\player_profiles.csv"

# ── Helpers ───────────────────────────────────────────────────────────────
def norm_name(s):
    """Lowercase + remove accent marks + strip suffix like (1)."""
    if not isinstance(s, str): return ""
    s = re.sub(r"\s*\(\d+\)\s*$", "", s.strip())
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().strip()

print("=" * 65)
print("  ScoutLab ML v4 — 2024/25 + 2023/24 combined")
print("=" * 65)

# ── Load bundle ───────────────────────────────────────────────────────────
with open(BUNDLE_PATH, encoding="utf-8") as f:
    bundle = json.load(f)

df_cur  = pd.DataFrame(bundle["current"])   # 24/25
df_prev = pd.DataFrame(bundle["previous"])  # 23/24

# Combine: 24/25 takes priority; within same season keep player with most minutes
# (handles duplicate names like "Rodri" where Man City > Betis by minutes)
df_cur["_season"]  = "2425"
df_prev["_season"] = "2324"
df_cur["_min"]  = pd.to_numeric(df_cur.get("Min", 0),  errors="coerce").fillna(0)
df_prev["_min"] = pd.to_numeric(df_prev.get("Min", 0), errors="coerce").fillna(0)
# Sort: 24/25 first, then by minutes desc so highest-minute player wins dedup
df_cur  = df_cur.sort_values("_min",  ascending=False)
df_prev = df_prev.sort_values("_min", ascending=False)
df_combined = pd.concat([df_cur, df_prev], ignore_index=True)
df_combined = df_combined.drop_duplicates(subset="Player", keep="first")  # 24/25 wins, then most minutes
df_combined = df_combined.drop(columns=["_min"], errors="ignore")
df_combined = df_combined.reset_index(drop=True)
print(f"\nPlayers: {len(df_cur)} (24/25) + {len(df_prev)} (23/24) → {len(df_combined)} combined")

# ── Load TM positions ─────────────────────────────────────────────────────
print("Loading TM position data...")
tm = pd.read_csv(TM_PROFILES, low_memory=False)
tm["name_norm"] = tm["player_name"].apply(norm_name)
tm = tm.sort_values("player_id").drop_duplicates("name_norm", keep="last")
tm_pos_lookup = tm.set_index("name_norm")["position"].to_dict()
print(f"  {len(tm_pos_lookup)} TM players loaded")

df_combined["name_norm"] = df_combined["Player"].apply(norm_name)
df_combined["tm_position"] = df_combined["name_norm"].map(tm_pos_lookup).fillna("")

matched_tm = (df_combined["tm_position"] != "").sum()
print(f"  {matched_tm}/{len(df_combined)} bundle players matched to TM position")

# ── Position detection ────────────────────────────────────────────────────
def detect_position(row):
    pos    = str(row.get("Pos", "") or "")       # FBref
    tm_pos = str(row.get("tm_position", "") or "") # Transfermarkt granular

    if "GK" in pos or "Goalkeeper" in tm_pos:
        return "GK"

    winger_tm  = ("Right Winger" in tm_pos or "Left Winger" in tm_pos or
                  "Right Midfield" in tm_pos or "Left Midfield" in tm_pos)
    striker_tm = ("Centre-Forward" in tm_pos or "Second Striker" in tm_pos)

    # FBref pure DF — never a winger regardless of TM
    if "DF" in pos and "FW" not in pos:
        return "DF"

    # FBref pure MF — TM winger/forward label likely a wrong name match; ignore it.
    # Only promote to WG if TM says attacking/wide midfield (not "Winger")
    if pos in ("MF", "MF,DF", "DF,MF"):
        # Wide midfielders are wingers; a central "Attacking Midfield" stays MF.
        if "Right Midfield" in tm_pos or "Left Midfield" in tm_pos:
            return "WG"
        return "MF"

    # From here on the player is FW or FW/MF hybrid — TM winger label is reliable
    if winger_tm:
        return "WG"

    # FBref hybrid positions: use TM or stats to distinguish WG vs FW/MF
    if pos in ("MF,FW", "FW,MF"):
        if striker_tm:   return "FW"
        # Central attacking midfielders (De Bruyne, Wirtz) are MF, not wingers.
        if "Attacking Midfield" in tm_pos: return "MF"
        takeons = float(row.get("successful_takeons_per90") or 0)
        carries = float(row.get("prog_carries_per90") or 0)
        npxg    = float(row.get("npxg_per90") or 0)
        if takeons > 1.5 or (carries > 2.5 and npxg < 0.25): return "WG"
        return "MF"

    if pos in ("DF,FW", "FW,DF"):
        return "WG"

    # FBref pure FW
    if pos == "FW":
        if striker_tm:  return "FW"
        if "Attacking Midfield" in tm_pos: return "MF"
        takeons = float(row.get("successful_takeons_per90") or 0)
        npxg    = float(row.get("npxg_per90") or 0)
        carries = float(row.get("prog_carries_per90") or 0)
        if takeons > 1.5 or (carries > 2.5 and npxg < 0.25): return "WG"
        return "FW"

    # Generic TM fallback
    if "Winger" in tm_pos:   return "WG"
    if "Forward" in tm_pos:  return "FW"
    if "Midfield" in tm_pos: return "MF"
    if "Defender" in tm_pos: return "DF"

    return "UNK"

df_combined["pos_group"] = df_combined.apply(detect_position, axis=1)
print("\nPosition distribution:")
for pg, cnt in df_combined["pos_group"].value_counts().items():
    print(f"  {pg}: {cnt}")

# Spot-check
for check_name in ["Lamine Yamal", "Vinicius Junior", "Vinicius Júnior",
                   "Erling Haaland", "Rodri", "Pedri", "Virgil van Dijk"]:
    row = df_combined[df_combined["Player"].str.lower().str.strip() == check_name.lower().strip()]
    if row.empty:
        row = df_combined[df_combined["name_norm"] == norm_name(check_name)]
    if not row.empty:
        r = row.iloc[0]
        print(f"  {r['Player']:25s} Pos={r['Pos']:8s} TM={r['tm_position']:35s} → {r['pos_group']}")
    else:
        print(f"  {check_name}: NOT IN DATASET")

# ── Feature sets ──────────────────────────────────────────────────────────
FEATURES_BY_POS = {
    "FW": ["goals_per90", "npxg_per90", "shots_per90", "sot_per90",
           "assists_per90", "xag_per90", "key_passes_per90",
           "prog_carries_per90", "carries_into_box_per90", "aerial_won_pct"],
    "WG": ["goals_per90", "npxg_per90", "assists_per90", "xag_per90",
           "key_passes_per90", "sca_per90", "shots_per90", "sot_per90",
           "prog_carries_per90", "successful_takeons_per90", "carries_into_box_per90"],
    "MF": ["goals_per90", "npxg_per90", "shots_per90", "assists_per90",
           "xag_per90", "key_passes_per90", "sca_per90",
           "prog_passes_per90", "passes_into_box_per90", "prog_carries_per90",
           "tackles_per90", "interceptions_per90", "recoveries_per90"],
    "DF": ["tackles_per90", "interceptions_per90", "aerial_won_pct",
           "clearances_per90", "blocks_per90", "fouls_per90",
           "prog_passes_per90", "passes_into_box_per90",
           "prog_carries_per90", "tkl_plus_int_per90"],
    "GK": ["GA90", "Save%", "CS%"],
}

CLUSTERS_PER_GROUP = {"FW": 5, "WG": 5, "MF": 8, "DF": 5, "GK": 2}

ROLE_RULES = {
    "FW": [
        ("Goal Poacher",      lambda z: z.get("npxg_per90", 0) > 0.6 and z.get("key_passes_per90", 0) < 0),
        ("Target Man",        lambda z: z.get("aerial_won_pct", 0) > 0.5),
        ("Complete Forward",  lambda z: z.get("key_passes_per90", 0) > 0.3 or z.get("carries_into_box_per90", 0) > 0.4),
        ("Pressing Forward",  lambda z: z.get("assists_per90", 0) > 0.1 and z.get("npxg_per90", 0) < 0.2),
        ("Centre Forward",    lambda z: z.get("npxg_per90", 0) > 0.2),
        ("Advanced Forward",  lambda z: True),
    ],
    "WG": [
        ("Inside Forward",    lambda z: z.get("goals_per90", 0) > 0.5 and z.get("npxg_per90", 0) > 0.3),
        ("Creative Winger",   lambda z: z.get("xag_per90", 0) > 0.4 and z.get("key_passes_per90", 0) > 0.3),
        ("Wide Playmaker",    lambda z: z.get("sca_per90", 0) > 0.6 and z.get("prog_carries_per90", 0) > 0.3),
        ("Dynamic Winger",    lambda z: z.get("successful_takeons_per90", 0) > 0.4 and z.get("prog_carries_per90", 0) > 0.4),
        ("Traditional Winger",lambda z: z.get("prog_carries_per90", 0) > 0),
        ("Wide Forward",      lambda z: True),
    ],
    "MF": [
        # Holding/Regista (Rodri, Xhaka, Rice): elite passing + some defensive presence, NOT a shooter
        # shots z-score < 1.5 is the key gate — attacking mids always shoot more than holding mids
        ("Holding Midfielder",      lambda z: z.get("prog_passes_per90", 0) > 0.5 and z.get("shots_per90", 0) < 1.5 and z.get("npxg_per90", 0) < 0.8 and (z.get("tackles_per90", 0) > 0.0 or z.get("interceptions_per90", 0) > 0.1)),
        # Pure destroyer: high tackles + interceptions, limited passing output
        ("Defensive Midfielder",    lambda z: z.get("tackles_per90", 0) > 0.4 and z.get("interceptions_per90", 0) > 0.3 and z.get("prog_passes_per90", 0) < 0.0),
        # Ball-Winner: high pressing + recoveries, limited distribution
        ("Ball-Winner",             lambda z: z.get("tackles_per90", 0) > 0.4 and z.get("recoveries_per90", 0) > 0.3 and z.get("prog_passes_per90", 0) < 0.5),
        # Deep Playmaker: exceptional passer, no shot involvement (Pedri, Xabi Alonso type)
        ("Deep Playmaker",          lambda z: z.get("prog_passes_per90", 0) > 0.4 and z.get("passes_into_box_per90", 0) > 0.2 and z.get("shots_per90", 0) < 0.3),
        # Goal-Scoring MF: high xG/shots, NOT primarily a creator (key_passes caps it to exclude playmakers)
        ("Goal-Scoring Midfielder", lambda z: z.get("npxg_per90", 0) > 1.0 and z.get("shots_per90", 0) > 1.0 and z.get("key_passes_per90", 0) < 1.5),
        # Attacking MF: chance creation + offensive production (Bruno, Pedri type)
        ("Attacking Midfielder",    lambda z: (z.get("sca_per90", 0) > 0.5 and z.get("key_passes_per90", 0) > 0.4) or z.get("goals_per90", 0) > 0.6),
        # Box-to-Box: carries + defensive work
        ("Box-to-Box",              lambda z: z.get("prog_carries_per90", 0) > 0.2 and z.get("tackles_per90", 0) > 0.1),
        # Creative Midfielder: chance creation without primary scoring role
        ("Creative Midfielder",     lambda z: z.get("key_passes_per90", 0) > 0.3 or z.get("xag_per90", 0) > 0.2),
        ("Central Midfielder",      lambda z: True),
    ],
    "DF": [
        ("Ball-Playing CB",    lambda z: z.get("prog_passes_per90", 0) > 0.6 and z.get("passes_into_box_per90", 0) > 0.2),
        ("Aggressive CB",      lambda z: z.get("tackles_per90", 0) > 0.5 and z.get("fouls_per90", 0) > 0.2),
        ("Aerial CB",          lambda z: z.get("aerial_won_pct", 0) > 0.5 and z.get("clearances_per90", 0) > 0.3),
        ("Attacking Full-Back",lambda z: z.get("prog_carries_per90", 0) > 0.5 or z.get("passes_into_box_per90", 0) > 0.5),
        ("Defensive Full-Back",lambda z: True),
    ],
    "GK": [
        ("Sweeper-Keeper", lambda z: z.get("CS%", 0) > 0 and z.get("Save%", 0) > 0),
        ("Shot-Stopper",   lambda z: True),
    ],
}

def assign_role(pos_group, z_scores):
    for role_name, condition in ROLE_RULES.get(pos_group, []):
        try:
            if condition(z_scores): return role_name
        except: pass
    return pos_group + " Specialist"

# ── Train ─────────────────────────────────────────────────────────────────
print("\n" + "=" * 65)
similarity_results = {}
cluster_results    = {}
cluster_profiles   = {}

for pg in ["FW", "WG", "MF", "DF", "GK"]:
    features = FEATURES_BY_POS[pg]
    K = CLUSTERS_PER_GROUP[pg]
    group = df_combined[df_combined["pos_group"] == pg].copy()

    if len(group) < K * 3:
        print(f"\n{pg}: only {len(group)} — skipping")
        continue

    avail = [f for f in features if f in group.columns and group[f].notna().sum() > 20]
    if len(avail) < 3:
        print(f"\n{pg}: not enough features — skipping")
        continue

    sub = group[["Player", "Squad", "league", "name_norm"] + avail].copy()
    for f in avail:
        sub[f] = pd.to_numeric(sub[f], errors="coerce")
    sub = sub.dropna(subset=avail, thresh=max(3, len(avail) - 3)).fillna(0)
    sub = sub.drop_duplicates("Player").reset_index(drop=True)

    if len(sub) < K * 2:
        print(f"\n{pg}: insufficient clean data — skipping")
        continue

    print(f"\n── {pg} ({len(sub)} players, {K} clusters, {len(avail)} features) ──")

    scaler = StandardScaler()
    X = scaler.fit_transform(sub[avail].values)
    km = KMeans(n_clusters=K, random_state=42, n_init=20, max_iter=500)
    labels = km.fit_predict(X)
    sub["cluster"] = labels

    all_avgs = sub[avail].mean()
    all_stds = sub[avail].std().replace(0, 1)
    cluster_role_map = {}

    for c in range(K):
        members = sub[sub["cluster"] == c]
        z = ((members[avail].mean() - all_avgs) / all_stds).to_dict()
        role = assign_role(pg, z)
        cluster_role_map[c] = role
        cid = f"{pg}_{c}"
        cluster_profiles[cid] = {
            "role": role, "pos_group": pg, "size": len(members),
            "z_scores": {k: round(float(v), 3) for k, v in z.items()},
        }
        top_z = sorted(z.items(), key=lambda x: x[1], reverse=True)[:3]
        top_str = ", ".join(f"{k.replace('_per90','')}:{v:+.1f}σ" for k, v in top_z)
        print(f"  Cluster {c} ({len(members)}p) → {role:25s} | {top_str}")
        print(f"    e.g. {', '.join(members['Player'].head(3).tolist())}")

    for _, row in sub.iterrows():
        c = row["cluster"]
        key = row["name_norm"]
        ind_z = ((row[avail] - all_avgs) / all_stds).to_dict()
        ind_role = assign_role(pg, ind_z)
        cluster_results[key] = {
            "cluster": f"{pg}_{c}",
            "role": ind_role,
            "pos_group": pg,
        }

    # Similarity within clusters
    for c in range(K):
        members = sub[sub["cluster"] == c].reset_index(drop=True)
        if len(members) < 2: continue
        X_c = scaler.transform(members[avail].values)
        sim_matrix = cosine_similarity(X_c)
        for i in range(len(members)):
            key = members.iloc[i]["name_norm"]
            similar = []
            for j, sc in sorted(enumerate(sim_matrix[i]), key=lambda x: x[1], reverse=True):
                if j == i: continue
                if len(similar) >= 10: break
                o = members.iloc[j]
                o_z = ((o[avail] - all_avgs) / all_stds).to_dict()
                similar.append({"name": o["Player"], "team": o["Squad"],
                                 "league": o["league"], "similarity": round(float(sc), 4),
                                 "role": assign_role(pg, o_z)})
            # Pad from other clusters if small
            if len(similar) < 6:
                others = sub[sub["cluster"] != c].reset_index(drop=True)
                if len(others):
                    idx_in_full = sub[sub["cluster"] == c].index[i]
                    p_vec = X[idx_in_full].reshape(1, -1)
                    X_oth = scaler.transform(others[avail].fillna(0).values)
                    for jj, sc in sorted(enumerate(cosine_similarity(p_vec, X_oth)[0]),
                                         key=lambda x: x[1], reverse=True)[:5]:
                        o = others.iloc[jj]
                        o_z = ((o[avail] - all_avgs) / all_stds).to_dict()
                        similar.append({"name": o["Player"], "team": o["Squad"],
                                        "league": o["league"], "similarity": round(float(sc), 4),
                                        "role": assign_role(pg, o_z)})
            similarity_results[key] = similar

print(f"\nTotal classified: {len(cluster_results)}")
print(f"Total with similarity: {len(similarity_results)}")

# ── Validation ────────────────────────────────────────────────────────────
print("\n── Validation ──")
checks = ["Erling Haaland", "Lamine Yamal", "Pedri", "Virgil van Dijk",
          "Rodri", "Vinicius Júnior", "Jude Bellingham", "Bukayo Saka",
          "Declan Rice", "Martín Zubimendi", "Granit Xhaka", "Bruno Fernandes"]
for name in checks:
    key = norm_name(name)
    r = cluster_results.get(key, {})
    s = similarity_results.get(key, [])
    status = f"{r.get('pos_group','?')}/{r.get('role','?'):22s}"
    top3 = ", ".join(x["name"] for x in s[:3]) if s else "—"
    print(f"  {name:22s} → {status} | {top3}")

# ── Inject into bundle ────────────────────────────────────────────────────
print("\nInjecting into bundle...")
bundle["ml"] = {
    "similarity":   similarity_results,
    "roles":        cluster_results,
    "roleProfiles": cluster_profiles,
    "modelInfo": {
        "similarity_features": FEATURES_BY_POS,
        "n_clusters": sum(CLUSTERS_PER_GROUP.values()),
        "pos_groups": list(CLUSTERS_PER_GROUP.keys()),
        "total_players_similarity": len(similarity_results),
        "total_players_clustered": len(cluster_results),
        "architecture": "position_first_role_cluster_similarity_v4",
        "seasons": "2024/25 + 2023/24 combined",
    }
}

with open(BUNDLE_PATH, "w", encoding="utf-8") as f:
    json.dump(bundle, f, separators=(",", ":"), ensure_ascii=False)

from pathlib import Path
mb = Path(BUNDLE_PATH).stat().st_size / 1024 / 1024
print(f"Done. Bundle: {mb:.1f}MB")
with open(BUNDLE_PATH, encoding="utf-8") as f:
    json.load(f)
print("JSON validation: PASSED")
