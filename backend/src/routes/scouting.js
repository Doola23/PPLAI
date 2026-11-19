const { Router } = require('express');
const { readJson, memo } = require('../lib/dataFiles');
const { SCOUTING_BUNDLE_FILE } = require('../config/paths');

const router = Router();

const playerKey = (name) => String(name ?? '').toLowerCase().trim();
const withSquadKey = (p) => ({ ...p, player_squad: `${p.Player}_${p.Squad}` });

const getBundle = () => memo('scouting-bundle', () => {
  const b = readJson(SCOUTING_BUNDLE_FILE) || {};
  const current = (b.current || []).map(withSquadKey);
  return {
    current,
    previous: (b.previous || []).map(withSquadKey),
    meta: {
      ...(b.meta || {}),
      currentSeason: b.meta?.currentSeason ?? '2024-25',
      previousSeason: b.meta?.previousSeason ?? '2023-24',
    },
    ml: b.ml || { roles: {}, similarity: {} },
    shotMaps: b.shotMaps || {},
    matchLogs: b.matchLogs || {},
    bySquadKey: new Map(current.map((p) => [p.player_squad, p])),
  };
});

const cacheHeaders = (res) => res.set('Cache-Control', 'public, max-age=600');

// GET /api/scouting/primary — player pool + ML (no shot maps / match logs)
router.get('/primary', (_req, res) => {
  const { current, previous, meta, ml } = getBundle();
  cacheHeaders(res);
  res.json({ current, previous, meta, ml, shotMaps: {}, matchLogs: {} });
});

// GET /api/scouting/extras — shot maps + match logs (lazy-loaded after primary)
router.get('/extras', (_req, res) => {
  const { shotMaps, matchLogs } = getBundle();
  cacheHeaders(res);
  res.json({ shotMaps, matchLogs });
});

// GET /api/scouting/current?position=FW&team=Arsenal&limit=20
router.get('/current', (req, res) => {
  const { position, team, limit = 50 } = req.query;
  let items = getBundle().current;
  if (position) items = items.filter((p) => p.Pos === position);
  if (team) items = items.filter((p) => p.Squad === team);
  items = items.slice(0, parseInt(limit, 10) || 50);
  res.json({ items, count: items.length });
});

// GET /api/scouting/current/:playerSquad  (key = "PlayerName_Squad")
router.get('/current/:playerSquad', (req, res) => {
  const item = getBundle().bySquadKey.get(decodeURIComponent(req.params.playerSquad));
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// GET /api/scouting/match-logs/:playerName
router.get('/match-logs/:playerName', (req, res) => {
  const id = playerKey(decodeURIComponent(req.params.playerName));
  const logs = getBundle().matchLogs[id];
  const items = logs ? [{ player_id: id, logs }] : [];
  res.json({ items, count: items.length });
});

// GET /api/scouting/shot-maps/:playerName
router.get('/shot-maps/:playerName', (req, res) => {
  const id = playerKey(decodeURIComponent(req.params.playerName));
  const shots = getBundle().shotMaps[id];
  const items = shots ? [{ player_id: id, shots }] : [];
  res.json({ items, count: items.length });
});

module.exports = router;
