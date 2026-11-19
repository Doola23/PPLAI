const path = require('path');
const { Router } = require('express');
const { readCsv } = require('../lib/dataFiles');
const { MATCH_OUTPUTS_DIR } = require('../config/paths');

const router = Router();

// GET /api/team-reports
router.get('/', (_req, res) => {
  const items = readCsv(path.join(MATCH_OUTPUTS_DIR, 'team_reports.csv'));
  res.json({ items, count: items.length });
});

module.exports = router;
