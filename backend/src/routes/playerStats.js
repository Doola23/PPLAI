const path = require('path');
const { Router } = require('express');
const { readCsv } = require('../lib/dataFiles');
const { MATCH_DATA_DIR } = require('../config/paths');

const router = Router();

const getOutfield = () => readCsv(path.join(MATCH_DATA_DIR, '2024_PL.csv'));
const getGK = () => readCsv(path.join(MATCH_DATA_DIR, 'GK_2024_PL.csv'));

// GET /api/player-stats?name=&squad=&position=&limit=
router.get('/', (req, res) => {
  const { name, squad, position, limit = 200, gk } = req.query;
  let data = gk === 'true' ? getGK() : getOutfield();

  if (name)     data = data.filter(p => (p.player || '').toLowerCase().includes(name.toLowerCase()));
  if (squad)    data = data.filter(p => (p.squad  || '').toLowerCase().includes(squad.toLowerCase()));
  if (position) data = data.filter(p => (p.position || '').toLowerCase().includes(position.toLowerCase()));

  res.json({ items: data.slice(0, parseInt(limit)), total: data.length });
});

// GET /api/player-stats/:name  — exact name lookup
router.get('/:name', (req, res) => {
  const needle = decodeURIComponent(req.params.name).toLowerCase();
  const outfield = getOutfield().find(p => (p.player || '').toLowerCase() === needle);
  if (outfield) return res.json(outfield);
  const gk = getGK().find(p => (p.player || '').toLowerCase() === needle);
  if (gk)      return res.json(gk);
  res.status(404).json({ error: 'Player not found' });
});

module.exports = router;
