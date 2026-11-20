const { Router } = require('express');
const { readCsv, memo } = require('../lib/dataFiles');
const { paginate } = require('../lib/pagination');
const { INJURY_PREDICTIONS_FILE } = require('../config/paths');

const router = Router();

// The predictions CSV carries ~93 raw feature columns; only these reach the UI.
const PREDICTION_FIELDS = [
  'player_name', 'match_date', 'team', 'position_group',
  'injury_probability', 'risk_tier', 'predicted_high_risk',
  'currently_injured', 'chance_of_playing',
  'fpl_status_injured', 'fpl_status_doubtful',
  'age', 'muscle_injury_history', 'hamstring_history',
  'injuries_last_6m', 'injuries_last_12m', 'season',
  'minutes_played_this_match',
];

const HIGH_RISK = 'High Risk';
const byProbability = (a, b) => (b.injury_probability || 0) - (a.injury_probability || 0);

const getPredictions = () => memo('injury-predictions', () => readCsv(INJURY_PREDICTIONS_FILE).map((row) => {
  const out = {};
  for (const f of PREDICTION_FIELDS) if (row[f] !== undefined) out[f] = row[f];
  out.match_date = String(row.match_date ?? '');
  return out;
}));

const getIndex = () => memo('injury-index', () => {
  const rows = getPredictions();
  const datesByTeam = new Map();
  const latestByPlayer = new Map();
  let highRiskFlags = 0;

  for (const r of rows) {
    if (!datesByTeam.has(r.team)) datesByTeam.set(r.team, new Set());
    datesByTeam.get(r.team).add(r.match_date);
    const prev = latestByPlayer.get(r.player_name);
    if (!prev || r.match_date > prev.match_date) latestByPlayer.set(r.player_name, r);
    if (r.risk_tier === HIGH_RISK) highRiskFlags++;
  }

  const teamDates = {};
  for (const [team, dates] of datesByTeam) teamDates[team] = [...dates].sort();

  // Every PL team plays 38 matches, so the team with the fullest date coverage gives a
  // reliable GW1..GW38 calendar; teams with data gaps are nearest-matched against it.
  const referenceDates = Object.values(teamDates).reduce((best, d) => (d.length > best.length ? d : best), []);

  return {
    teams: Object.keys(teamDates).sort(),
    teamDates,
    referenceDates,
    latest: [...latestByPlayer.values()].sort(byProbability),
    highRiskFlags,
    total: rows.length,
  };
});

// GET /api/injuries/summary — season-level counts + team list + gameweek calendar
router.get('/summary', (_req, res) => {
  const { teams, referenceDates, highRiskFlags, total } = getIndex();
  res.json({ teams, referenceDates, highRiskFlags, total });
});

// GET /api/injuries/teams/:team/dates — match dates available for one team
router.get('/teams/:team/dates', (req, res) => {
  const dates = getIndex().teamDates[decodeURIComponent(req.params.team)];
  if (!dates) return res.status(404).json({ error: 'Team not found' });
  res.json({ dates });
});

// GET /api/injuries/top?limit=4&team=Arsenal — highest-risk players, latest match per player
router.get('/top', (req, res) => {
  const { team } = req.query;
  let rows = getIndex().latest;
  if (team) {
    const needle = String(team).toLowerCase();
    rows = rows.filter((r) => String(r.team).toLowerCase().includes(needle));
  }
  res.json(paginate(rows, req.query, { defaultLimit: 10, maxLimit: 100 }));
});

// GET /api/injuries/predictions?team=&date=&playerName=&limit=&offset=
router.get('/predictions', (req, res) => {
  const { team, date, playerName, matchDate } = req.query;
  let rows = getPredictions();

  if (team) rows = rows.filter((r) => r.team === team);
  if (date) rows = rows.filter((r) => r.match_date === date);
  if (playerName) rows = rows.filter((r) => r.player_name === playerName);

  if (playerName && matchDate) {
    const item = rows.find((r) => r.match_date === matchDate);
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json(item);
  }
  res.json(paginate(rows, req.query));
});

module.exports = router;
