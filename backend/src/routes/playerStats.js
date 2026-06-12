const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const DATA_DIR = path.resolve(__dirname, '../../../match_prediction/data');

function loadCsv(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return [];
  const content = fs.readFileSync(filepath, 'utf8').replace(/^﻿/, ''); // strip BOM
  return parse(content, { columns: true, skip_empty_lines: true, cast: true });
}

let _outfield = null;
let _gk = null;

function getOutfield() {
  if (!_outfield) _outfield = loadCsv('2024_PL.csv');
  return _outfield;
}

function getGK() {
  if (!_gk) _gk = loadCsv('GK_2024_PL.csv');
  return _gk;
}

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
