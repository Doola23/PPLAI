const path = require('path');
const { Router } = require('express');
const { readCsv } = require('../lib/dataFiles');
const { MATCH_OUTPUTS_DIR, MATCH_FIXTURES_FILE } = require('../config/paths');
const { optionalAuth, blockRole } = require('../middleware/auth');

const router = Router();

// Match-level win/draw/loss predictions stay open to anonymous visitors (the public
// landing page teaser needs them) but are blocked for logged-in fan accounts, to keep
// this away from anything that reads as betting-odds access for casual users.
const blockFans = [optionalAuth, blockRole('fan')];

const output = (file) => readCsv(path.join(MATCH_OUTPUTS_DIR, file));
const list = (rows) => ({ items: rows, count: rows.length });

// GET /api/matches/predictions?homeTeam=Arsenal&awayTeam=Chelsea
router.get('/predictions', blockFans, (req, res) => {
  const { homeTeam, awayTeam } = req.query;
  let rows = readCsv(MATCH_FIXTURES_FILE);

  if (homeTeam && awayTeam) {
    const match = rows.find((r) => r.home_team === homeTeam && r.away_team === awayTeam);
    if (!match) return res.status(404).json({ error: 'Prediction not found' });
    return res.json(match);
  }
  if (homeTeam) rows = rows.filter((r) => r.home_team === homeTeam);
  res.json(list(rows));
});

const outputs = {
  '/output/standings/actual': 'actual_standings.csv',
  '/output/standings/predicted': 'predicted_standings.csv',
  '/output/standings/comparison': 'standings_comparison.csv',
  '/output/draw-risk': 'draw_risk_predictions.csv',
  '/output/shap': 'shap_importance.csv',
  '/output/analyst/last5': 'analyst_reports_last5.csv',
  '/output/analyst/season': 'analyst_reports_season.csv',
};

router.get('/output/predictions', blockFans, (_req, res) => res.json(list(output('match_predictions.csv'))));

for (const [route, file] of Object.entries(outputs)) {
  router.get(route, (_req, res) => res.json(list(output(file))));
}

router.get('/output/calibration', (_req, res) => {
  const rows = ['calibration_validation.csv', 'calibration_test.csv'].flatMap((f) => output(f));
  res.json(list(rows));
});

module.exports = router;
