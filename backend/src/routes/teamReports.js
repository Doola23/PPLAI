const { Router } = require('express');
const { readJson, memo } = require('../lib/dataFiles');
const { TEAM_REPORTS_FILE } = require('../config/paths');

const router = Router();

// team_reports.json is keyed by club; the API returns it as a list with a Team field.
const getReports = () => memo('team-reports', () => (
  Object.entries(readJson(TEAM_REPORTS_FILE) || {}).map(([Team, report]) => ({ Team, ...report }))
));

// GET /api/team-reports
router.get('/', (_req, res) => {
  const items = getReports();
  res.json({ items, count: items.length });
});

module.exports = router;
