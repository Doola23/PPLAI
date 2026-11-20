"""
generate_team_reports.py
========================
Two-phase report builder:

Phase 1 — Core insights (always regenerated from scouting_bundle.json + team stats):
    attack quality, defence quality, results, goal dependence, striker deficit,
    underperforming forward, creative deficit, injury risk.

Phase 2 — Matchpreds additions (only ADDED if they don't contradict Phase 1):
    save %, carries into box, passes into box, tackles, interceptions, aerials won.

Run after run_ml_2425.py (ml/run_all.py does this).
"""
import gzip, json, os, re
import pandas as pd
from collections import defaultdict

ML_DIR         = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
BUNDLE_PATH    = os.path.join(ML_DIR, "scouting", "data", "scouting_bundle.json.gz")
REPORTS_PATH   = os.path.join(ML_DIR, "scouting", "data", "team_reports.json")
MATCHPREDS_CSV = os.path.join(ML_DIR, "match_prediction", "outputs", "analyst_reports_season.csv")

TEAM_MAP = {
    "Nott'ham Forest": "Nott'm Forest",
    "Ipswich Town":    "Ipswich",
    "Leicester City":  "Leicester",
    "Manchester Utd":  "Manchester United",
    "Newcastle Utd":   "Newcastle",
}

def norm_team(t):
    return TEAM_MAP.get(t, t)

def v(p, field, default=0.0):
    try:
        x = p.get(field)
        return float(x) if x is not None else default
    except Exception:
        return default

def pos_group(pos_str):
    if not pos_str: return "UNK"
    s = str(pos_str).upper()
    if "GK" in s: return "GK"
    primary = s.split(",")[0].strip()
    if primary == "FW": return "FW"
    if primary == "MF": return "MF"
    if primary == "DF": return "DF"
    if "FW" in s: return "FW"
    if "MF" in s: return "MF"
    if "DF" in s: return "DF"
    return "UNK"

# ── Load data ─────────────────────────────────────────────────────────────────
print("Loading bundle...")
with gzip.open(BUNDLE_PATH, "rt", encoding="utf-8") as f:
    bundle = json.load(f)

print("Loading team reports...")
with open(REPORTS_PATH, encoding="utf-8") as f:
    reports = json.load(f)

pl_players = [
    p for p in bundle["current"]
    if norm_team(p.get("Squad", "")) in reports and v(p, "Min") >= 450
]
print(f"PL players 450+ min: {len(pl_players)}")

team_players = defaultdict(list)
for p in pl_players:
    team_players[norm_team(p.get("Squad", ""))].append(p)
for t in team_players:
    team_players[t].sort(key=lambda p: -v(p, "Min"))

# ── Load matchpreds stats ─────────────────────────────────────────────────────
print("Loading matchpreds stats...")
mp_stats = {}
mp_avgs = {}
try:
    mp = pd.read_csv(MATCHPREDS_CSV)
    mp_avgs = {c: mp[c].astype(float).mean() for c in
               ["Save_%","Carries_Box","Passes_Box","Tackles","Interceptions","Aerials_Won"]}

    def rank_desc(val, col): return int((mp[col].astype(float) > val).sum()) + 1
    def ordinal(k): return {1:"1st",2:"2nd",3:"3rd"}.get(k, f"{k}th")

    for _, row in mp.iterrows():
        t = str(row["Team"]).strip()
        mp_stats[t] = {
            "save_pct":    float(row["Save_%"]),
            "carries_box": int(row["Carries_Box"]),
            "passes_box":  int(row["Passes_Box"]),
            "tackles":     int(row["Tackles"]),
            "interceptions": int(row["Interceptions"]),
            "aerials_won": int(row["Aerials_Won"]),
            "save_rank":   rank_desc(float(row["Save_%"]),      "Save_%"),
            "carries_rank":rank_desc(int(row["Carries_Box"]),   "Carries_Box"),
            "passes_rank": rank_desc(int(row["Passes_Box"]),    "Passes_Box"),
            "tackles_rank":rank_desc(int(row["Tackles"]),       "Tackles"),
            "int_rank":    rank_desc(int(row["Interceptions"]), "Interceptions"),
            "aerials_rank":rank_desc(int(row["Aerials_Won"]),   "Aerials_Won"),
        }
    print(f"  Loaded {len(mp_stats)} teams")
except Exception as e:
    print(f"  WARNING: {e}")

PL_AVG_GF = 1.47
MIN_WINS   = 4

# ── Helper: contradiction / duplicate check ───────────────────────────────────
def has_keyword(text_list, *keywords):
    """Return True if any existing insight contains any of the keywords."""
    combined = " ".join(text_list).upper()
    return any(kw.upper() in combined for kw in keywords)

def safe_add(candidate_text, candidate_is_positive, pos_list, neg_list,
             block_if_pos=(), block_if_neg=()):
    """
    Add candidate only if:
    - Its lead keyword isn't already present (no duplicate)
    - None of the block_if_pos keywords are in positives (would contradict)
    - None of the block_if_neg keywords are in negatives (would contradict)
    """
    lead = candidate_text.split(":")[0].strip().upper()
    target = pos_list if candidate_is_positive else neg_list

    # Duplicate check
    if has_keyword(target, lead):
        return

    # Contradiction check
    if block_if_pos and has_keyword(pos_list, *block_if_pos):
        return
    if block_if_neg and has_keyword(neg_list, *block_if_neg):
        return

    target.append(candidate_text)

# ── Phase 1: Core insights ────────────────────────────────────────────────────
for team_key, data in reports.items():
    squad  = team_players.get(team_key, [])
    wins   = data.get("w", 0)
    losses = data.get("l", 0)
    draws  = data.get("d", 0)
    gf_pg  = data.get("gfPerGame", 0)
    ga_pg  = data.get("gaPerGame", 0)
    cs     = data.get("cleanSheets", 0)
    errs   = data.get("errors", 0)
    total_goals = data.get("gf", 0)

    m = re.match(r"^(.+?)\s*\((\d+)g\)$", data.get("topScorer", ""))
    top_scorer_name  = m.group(1).strip() if m else ""
    top_scorer_goals = int(m.group(2)) if m else 0

    ma = re.match(r"^(.+?)\s*\(\d+a\)$", data.get("topAssister", ""))
    top_assister_name = ma.group(1).strip() if ma else ""

    by_pos = defaultdict(list)
    for p in squad:
        by_pos[pos_group(p.get("Pos", ""))].append(p)
    fws = by_pos["FW"]
    mfs = by_pos["MF"]
    dfs = by_pos["DF"]

    pos = []
    neg = []

    # ── Attack ────────────────────────────────────────────────────────────────
    if wins > MIN_WINS:
        if gf_pg >= 1.75:
            pos.append(f"PROLIFIC ATTACK: Scoring {gf_pg} goals per game — one of the most dangerous attacks in the league, consistently threatening in every match")
        elif gf_pg >= PL_AVG_GF:
            pos.append(f"EFFECTIVE ATTACK: {gf_pg} goals per game — above the league average, the team creates and converts chances regularly")
        elif gf_pg >= 1.35:
            pos.append(f"CONSISTENT SCORER: {gf_pg} goals per game — close to the league standard, the team scores with reliable regularity and rarely goes long spells without a goal")

    if gf_pg < 1.0:
        neg.append(f"ATTACK CRISIS: Only {gf_pg} goals per game — the attack cannot manufacture or convert chances; a fundamental structural problem that demands urgent transfer window action")
    elif gf_pg < 1.35:
        neg.append(f"WEAK ATTACK: {gf_pg} goals per game — below the {PL_AVG_GF} league average. Struggling to create and convert consistently")

    # Striker deficit — team scores well but top forward barely contributes
    if gf_pg >= 1.5 and top_scorer_goals > 0 and wins > MIN_WINS:
        if top_scorer_goals < gf_pg * 38 * 0.20:
            neg.append(f"STRIKER DEFICIT: {top_scorer_name}'s {top_scorer_goals} goals is the best forward return — in a side scoring {gf_pg} goals per game the number 9 position is underfilled. Goals are spread across the squad rather than produced by a reliable centre-forward, which becomes a major vulnerability when the team needs a goal")

    # ── Defence ───────────────────────────────────────────────────────────────
    if wins > MIN_WINS:
        if ga_pg <= 1.0:
            pos.append(f"DEFENSIVE SOLIDITY: Conceding only {ga_pg} goals per game — one of the hardest defences to break down in the division")
        elif ga_pg <= 1.25:
            pos.append(f"SOLID DEFENCE: {ga_pg} goals conceded per game — a well-organised backline that keeps the team competitive across the season")
        elif ga_pg <= 1.45 and cs >= 7:
            pos.append(f"ORGANISED DEFENCE: {ga_pg} goals conceded per game — close to the league average, the defence is structured and competitive without being a significant liability")

        if cs >= 12:
            pos.append(f"DEFENSIVE DOMINANCE: {cs} clean sheets — keeping opponents out in {int(cs/38*100)}% of matches, a mark of elite defensive organisation")
        elif cs >= 10:
            pos.append(f"RELIABLE BACKLINE: {cs} clean sheets this season — the defence regularly shuts opponents out, a strong foundation for results")

    if ga_pg >= 1.8:
        neg.append(f"DEFENSIVE CRISIS: Conceding {ga_pg} goals per game — the backline is routinely exposed and cannot handle sustained attacking pressure. A defensive rebuild is necessary")
    elif ga_pg >= 1.5:
        neg.append(f"DEFENSIVE FRAGILITY: {ga_pg} goals conceded per game — the defence shows recurring vulnerabilities that better opponents consistently exploit")

    if errs >= 35:
        neg.append(f"RECKLESS DEFENCE: {errs} defensive errors — the most in the league. The team gifts opponents direct shooting opportunities through individual mistakes at an alarming rate")
    elif errs >= 28:
        neg.append(f"COSTLY ERRORS: {errs} defensive errors — well above the 25 league average. Individual mistakes regularly cost points in games that should be controlled")

    # ── Results ───────────────────────────────────────────────────────────────
    if wins > MIN_WINS and wins / 38 >= 0.58:
        pos.append(f"WINNING MENTALITY: {int(wins/38*100)}% win rate — converting performances into three points consistently, the hallmark of a title-challenging side")

    if draws >= 12:
        neg.append(f"DRAW PROBLEM: {draws} drawn matches — consistently failing to convert dominant performances into wins. These dropped points are the difference between the top 4 and mid-table")

    if cs <= 9 and wins > 8 and ga_pg > 1.0:
        neg.append(f"CLEAN SHEET SHORTAGE: Only {cs} clean sheets — the team concedes in {int((38-cs)/38*100)}% of matches. The defence is too easy to score against and cannot consistently protect leads")

    if losses / 38 >= 0.60:
        neg.append(f"RELEGATION FORM: Losing {int(losses/38*100)}% of matches — the team cannot compete at Premier League level. Results are nowhere near what survival demands")
    elif losses / 38 >= 0.45:
        neg.append(f"INCONSISTENCY: Losing {int(losses/38*100)}% of games — unable to string results together. The team has moments of quality but cannot sustain them across a campaign")
    elif losses >= 10 and wins < 20:
        neg.append(f"RESULTS VOLATILITY: {losses} defeats this season — the team cannot consistently protect results. Too many winnable games are being lost, costing points at crucial moments in the table")

    # ── Goal dependence ───────────────────────────────────────────────────────
    goal_share = top_scorer_goals / total_goals if total_goals > 0 else 0
    same_player = top_scorer_name and top_assister_name and top_scorer_name == top_assister_name

    if goal_share >= 0.30:
        neg.append(f"ONE-MAN ATTACK: {top_scorer_name} supplies {int(goal_share*100)}% of all goals — a dangerous over-reliance on a single player. Any injury, suspension or loss of form collapses the entire attack")
    elif goal_share >= 0.20:
        neg.append(f"GOAL CONCENTRATION: {top_scorer_name} accounts for {int(goal_share*100)}% of the team's goals — too much weight on one individual for a consistent full-season campaign")

    if same_player and goal_share < 0.30:
        neg.append(f"SINGLE CREATIVE FORCE: {top_scorer_name} is both the top scorer and top assister — the team's attack runs almost entirely through one player. Opposition scouts will plan around him and any absence leaves the attack without a primary creative outlet")

    # ── Player-level: underperforming forward ─────────────────────────────────
    for fw in fws[:2]:
        xg_fw  = v(fw, "npxg_per90")
        g_fw   = v(fw, "goals_per90")
        mins_fw = v(fw, "Min")
        if xg_fw >= 0.28 and g_fw < xg_fw * 0.60 and mins_fw >= 1500:
            wasted = round((xg_fw - g_fw) * mins_fw / 90, 1)
            neg.append(
                f"UNDERPERFORMING FORWARD: {fw['Player']} is scoring {g_fw:.2f} goals per 90 against an xG of {xg_fw:.2f} — "
                f"approximately {wasted} expected goals wasted this season. A more clinical finisher would add significant goals "
                f"to the same system and the same chances being created"
            )
            break

    # ── Player-level: creative deficit in midfield ────────────────────────────
    mf_with_mins = [p for p in mfs if v(p, "Min") >= 900]
    if mf_with_mins and wins > MIN_WINS:
        avg_kp = sum(v(p, "key_passes_per90") for p in mf_with_mins) / len(mf_with_mins)
        if avg_kp < 0.7:
            neg.append(
                f"CREATIVE DEFICIT: Midfielders averaging only {avg_kp:.1f} key passes per 90 — the team struggles to "
                f"generate consistent chance creation through central areas. A creative midfielder would unlock a higher-performing attack"
            )

    # ── Player-level: injury risk ─────────────────────────────────────────────
    for p in squad[:6]:
        days = v(p, "recent_days_missed")
        inj  = v(p, "recent_injuries")
        mins = v(p, "Min")
        if days >= 30 and inj >= 2 and mins >= 900 and (mins / 3420 * 100) < 80:
            neg.append(
                f"INJURY RISK: {p['Player']} has missed {int(days)} days through injury in the last two seasons "
                f"({int(inj)} separate spells) — a genuine availability concern for a player the team relies on. "
                f"Cover at this position must be a recruitment priority"
            )
            break

    # ── Phase 2: Add matchpreds stats — only if no contradiction ─────────────
    mp = mp_stats.get(team_key, {})
    if mp and wins > MIN_WINS:
        save_pct    = mp["save_pct"]
        carries_box = mp["carries_box"]
        passes_box  = mp["passes_box"]
        tackles     = mp["tackles"]
        ints        = mp["interceptions"]
        aerials     = mp["aerials_won"]

        # Goalkeeper save %
        if save_pct >= 73.0:
            safe_add(
                f"ELITE GOALKEEPER: {save_pct:.1f}% save rate — {ordinal(mp['save_rank'])} in the Premier League. The goalkeeper is regularly bailing out the defence and earning points single-handedly",
                True, pos, neg,
                block_if_neg=("DEFENSIVE CRISIS","GOALKEEPING CONCERN")
            )
        elif save_pct >= 70.0:
            safe_add(
                f"RELIABLE GOALKEEPER: {save_pct:.1f}% save rate ({ordinal(mp['save_rank'])} in the league) — a dependable last line that saves the team points on a regular basis",
                True, pos, neg,
                block_if_neg=("DEFENSIVE CRISIS","DEFENSIVE FRAGILITY","GOALKEEPING")
            )
        elif save_pct < 64.0:
            safe_add(
                f"GOALKEEPING CONCERN: Only {save_pct:.1f}% save rate — {ordinal(mp['save_rank'])} in the league. The goalkeeper is failing to stop shots that peers would save, costing the team points directly",
                False, pos, neg,
                block_if_pos=("DEFENSIVE SOLIDITY","DEFENSIVE DOMINANCE","RELIABLE BACKLINE")
            )
        elif save_pct < 67.0:
            safe_add(
                f"BELOW-AVERAGE GOALKEEPER: {save_pct:.1f}% save rate ({ordinal(mp['save_rank'])} in the league) — not converting enough saves into clean sheets",
                False, pos, neg,
                block_if_pos=("DEFENSIVE SOLIDITY","DEFENSIVE DOMINANCE","RELIABLE BACKLINE")
            )

        # Carries into box — attacking penetration
        if carries_box >= 320:
            safe_add(
                f"DIRECT AND PENETRATING: {carries_box} carries into the penalty box ({ordinal(mp['carries_rank'])} in the league) — the attack consistently drives into dangerous areas, creating high-quality chances",
                True, pos, neg,
                block_if_neg=("ATTACK CRISIS","WEAK ATTACK")
            )
        elif carries_box >= 250:
            safe_add(
                f"GOOD ATTACKING MOVEMENT: {carries_box} carries into the box ({ordinal(mp['carries_rank'])} in the league) — regularly getting into dangerous positions with the ball",
                True, pos, neg,
                block_if_neg=("ATTACK CRISIS","WEAK ATTACK")
            )
        elif carries_box < 140:
            safe_add(
                f"ATTACK LACKS PENETRATION: Only {carries_box} carries into the penalty box ({ordinal(mp['carries_rank'])} in the league) — the team rarely drives into dangerous areas, making it easy for opponents to defend",
                False, pos, neg,
                block_if_pos=("PROLIFIC ATTACK","EFFECTIVE ATTACK")
            )

        # Passes into box — creative delivery
        if passes_box >= 250:
            safe_add(
                f"CREATIVE DELIVERY: {passes_box} passes into the penalty area ({ordinal(mp['passes_rank'])} in the league) — consistently delivering the ball into dangerous positions, creating an abundance of goalscoring opportunities",
                True, pos, neg,
                block_if_neg=("ATTACK CRISIS","WEAK ATTACK","CREATIVE DEFICIT")
            )
        elif passes_box < 110:
            # Not blocked by attack positives — low pass-into-box can coexist with
            # a carry-based prolific attack (e.g. Arsenal 4th in carries, 19th in passes)
            safe_add(
                f"LIMITED BOX DELIVERY: Only {passes_box} passes into the penalty area ({ordinal(mp['passes_rank'])} in the league) — the attack relies on individual carries rather than passing combinations to create chances. Opponents who nullify the ball-carriers leave the team with limited alternatives",
                False, pos, neg,
                block_if_neg=("ATTACK CRISIS","WEAK ATTACK")
            )

        # Tackles — pressing / defensive work rate
        if tackles >= 700:
            safe_add(
                f"PRESSING MACHINE: {tackles} tackles this season ({ordinal(mp['tackles_rank'])} in the league) — one of the most defensively active sides, winning the ball back constantly and giving opponents no time on the ball",
                True, pos, neg
            )
        elif tackles < 530:
            safe_add(
                f"PASSIVE DEFENCE: Only {tackles} tackles ({ordinal(mp['tackles_rank'])} in the league) — not actively winning the ball back. The team surrenders possession too easily and relies on opponents making mistakes",
                False, pos, neg,
                block_if_pos=("DEFENSIVE SOLIDITY","DEFENSIVE DOMINANCE","SOLID DEFENCE","RELIABLE BACKLINE")
            )

        # Interceptions — reading of the game
        if ints >= 310:
            safe_add(
                f"INTELLIGENT DEFENDING: {ints} interceptions ({ordinal(mp['int_rank'])} in the league) — excellent reading of the game, cutting out attacks before they develop and disrupting opposition build-up",
                True, pos, neg,
                block_if_neg=("DEFENSIVE CRISIS","DEFENSIVE FRAGILITY")
            )
        elif ints < 230 and ga_pg > 1.1 and cs < 12:
            safe_add(
                f"POOR ANTICIPATION: Only {ints} interceptions ({ordinal(mp['int_rank'])} in the league) — failing to read attacking movements. Opponents are able to develop dangerous attacks that a more switched-on defence would cut out earlier",
                False, pos, neg,
                block_if_pos=("DEFENSIVE SOLIDITY","DEFENSIVE DOMINANCE","RELIABLE BACKLINE","SOLID DEFENCE")
            )

        # Aerial duels
        if aerials >= 530:
            safe_add(
                f"AERIAL DOMINANCE: {aerials} aerial duels won ({ordinal(mp['aerials_rank'])} in the league) — dominant in the air at both ends of the pitch. Dangerous from set pieces and effective at dealing with crosses and long balls",
                True, pos, neg
            )
        elif aerials < 340:
            safe_add(
                f"AERIAL WEAKNESS: Only {aerials} aerial duels won ({ordinal(mp['aerials_rank'])} in the league) — vulnerable to crosses, long balls and set pieces. Opponents will target this weakness repeatedly",
                False, pos, neg,
                block_if_pos=("AERIAL DOMINANCE",)
            )

    # ── Recruitment priorities — derived from weaknesses ─────────────────────
    neg_text = " ".join(neg).upper()
    mp_neg   = mp_stats.get(team_key, {})
    prio = []

    def add_prio(position, reason):
        if not any(p["position"] == position for p in prio):
            prio.append({"position": position, "reason": reason})

    # Striker deficit → need a reliable centre-forward
    if "STRIKER DEFICIT" in neg_text:
        add_prio("Centre-Forward", f"{top_scorer_name} leads with only {top_scorer_goals} goals — no reliable #9 in a team scoring {gf_pg}/game")

    # Underperforming forward → need a clinical striker
    if "UNDERPERFORMING FORWARD" in neg_text:
        add_prio("Clinical Striker", "Current forward regularly underperforming xG — need a more efficient finisher")

    # One-man attack / single creative force → need a second goal/creative threat
    if "ONE-MAN ATTACK" in neg_text or "SINGLE CREATIVE FORCE" in neg_text:
        add_prio("Attacking Forward / Winger", f"Over-reliance on {top_scorer_name} — squad needs a second genuine attacking threat")

    # Goalkeeping concern → need GK upgrade
    if "GOALKEEPING CONCERN" in neg_text or "BELOW-AVERAGE GOALKEEPER" in neg_text:
        save = mp_neg.get("save_pct", 0)
        add_prio("Goalkeeper", f"{save:.1f}% save rate ({ordinal(mp_neg.get('save_rank',20))} in the league) — upgrade between the posts is necessary")

    # Injury risk → cover for the injured position
    inj_player_found = None
    for p in squad[:6]:
        if v(p,"recent_days_missed") >= 30 and v(p,"recent_injuries") >= 2 and v(p,"Min") >= 900 and (v(p,"Min")/3420*100) < 80:
            inj_player_found = p
            break
    if inj_player_found:
        pg_inj = pos_group(inj_player_found.get("Pos",""))
        pos_label = {"FW":"Forward / Winger","MF":"Midfielder","DF":"Defender","GK":"Goalkeeper"}.get(pg_inj,"Player")
        add_prio(pos_label, f"Cover for {inj_player_found['Player']} — {int(v(inj_player_found,'recent_days_missed'))} days missed across {int(v(inj_player_found,'recent_injuries'))} spells")

    # Creative deficit → creative midfielder
    if "CREATIVE DEFICIT" in neg_text:
        add_prio("Creative Midfielder", "Midfield averaging below 0.7 key passes per 90 — need a playmaker to unlock the attack")

    # Defensive fragility / crisis → centre-back
    if "DEFENSIVE CRISIS" in neg_text or "DEFENSIVE FRAGILITY" in neg_text:
        add_prio("Centre-Back", f"Conceding {ga_pg} goals per game — defensive reinforcement is essential")

    # Aerial weakness → aerial centre-back
    if "AERIAL WEAKNESS" in neg_text:
        aerials_val = mp_neg.get("aerials_won", 0)
        add_prio("Aerial Centre-Back", f"Only {aerials_val} aerial duels won — vulnerable to set pieces and long balls")

    # Clean sheet shortage + poor GK → could also need GK
    if "CLEAN SHEET SHORTAGE" in neg_text and "GOALKEEPING" not in neg_text and mp_neg.get("save_pct",99) < 68:
        add_prio("Goalkeeper", f"Only {cs} clean sheets and {mp_neg.get('save_pct',0):.1f}% save rate — GK upgrade would directly improve results")

    data["positives"] = pos
    data["negatives"] = neg
    data["recruitmentPriorities"] = prio
    flag = " [NO PLAYERS]" if not squad else ""
    print(f"  {team_key}: {len(pos)}S / {len(neg)}W / {len(prio)} priorities{flag}")

# ── Save ──────────────────────────────────────────────────────────────────────
print("\nSaving team_reports.json...")
with open(REPORTS_PATH, "w", encoding="utf-8") as f:
    json.dump(reports, f, indent=2, ensure_ascii=False)
print("Done.")
