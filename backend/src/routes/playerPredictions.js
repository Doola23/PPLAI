const path = require('path');
const { Router } = require('express');
const { readCsv, memo } = require('../lib/dataFiles');
const { PLAYER_PREDICTIONS_DIR } = require('../config/paths');

const router = Router();

const POSITION_FILES = [
  'Strikers_2025_Predictions.csv',
  'Wingers_2025_Predictions.csv',
  'Centre_Backs_2025_Predictions.csv',
  'Fullbacks_2025_Predictions.csv',
  'Defensive_Midfielders_2025_Predictions.csv',
  'Central_Midfielders_2025_Predictions.csv',
  'Attacking_Midfielders_2025_Predictions.csv',
];

// One row per player (last file wins), matching the old Player-keyed table.
const getAll = () => memo('player-predictions', () => {
  const byPlayer = new Map();
  for (const file of POSITION_FILES) {
    for (const row of readCsv(path.join(PLAYER_PREDICTIONS_DIR, file))) {
      if (row.Player) byPlayer.set(row.Player, { ...row, season: '2025-2026' });
    }
  }
  return [...byPlayer.values()];
});

// GET /api/player-predictions — 2025-26 season forecasts for all outfield players
// (goalkeepers excluded — validated separately as unreliable, see ml/player_stats/README.md)
router.get('/', (_req, res) => {
  const items = getAll();
  res.json({ items, count: items.length });
});

// GET /api/player-predictions/:player
router.get('/:player', (req, res) => {
  const name = decodeURIComponent(req.params.player);
  const item = getAll().find((p) => p.Player === name);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

module.exports = router;
