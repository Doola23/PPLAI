const { Router } = require('express');
const { readCsv, memo } = require('../lib/dataFiles');
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

const getPredictions = () => memo('injury-predictions', () => readCsv(INJURY_PREDICTIONS_FILE).map((row) => {
  const out = {};
  for (const f of PREDICTION_FIELDS) if (row[f] !== undefined) out[f] = row[f];
  out.match_date = String(row.match_date ?? '');
  return out;
}));

// GET /api/injuries/predictions?playerName=Haaland&matchDate=2025-01-01
router.get('/predictions', (req, res) => {
  const { playerName, matchDate } = req.query;
  let items = getPredictions();

  if (playerName) items = items.filter((r) => r.player_name === playerName);
  if (playerName && matchDate) {
    const item = items.find((r) => r.match_date === matchDate);
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json(item);
  }
  res.json({ items, count: items.length });
});

module.exports = router;
