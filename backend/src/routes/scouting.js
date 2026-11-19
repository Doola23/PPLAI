const { Router } = require('express');
const { readJson, memo } = require('../lib/dataFiles');
const { paginate } = require('../lib/pagination');
const { SCOUTING_BUNDLE_FILE } = require('../config/paths');

const router = Router();

const playerKey = (name) => String(name ?? '').toLowerCase().trim();

function withSquadKey(p) {
  const out = {};
  for (const [k, v] of Object.entries(p)) if (v !== null && v !== '') out[k] = v;
  out.player_squad = `${p.Player}_${p.Squad}`;
  return out;
}

// ScoutLab's fullback/winger side detection only needs the mean lateral shot position,
// so ship that per player instead of every shot map.
function withShotSummary(p, shotMaps) {
  const shots = shotMaps[playerKey(p.Player)]?.sh || [];
  if (!shots.length) return p;
  const avgY = shots.reduce((s, sh) => s + sh.y, 0) / shots.length;
  return { ...p, shot_count: shots.length, shot_avg_y: Math.round(avgY * 1000) / 1000 };
}

const getBundle = () => memo('scouting-bundle', () => {
  const b = readJson(SCOUTING_BUNDLE_FILE) || {};
  const current = (b.current || []).map((p) => withShotSummary(withSquadKey(p), b.shotMaps || {}));
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

// GET /api/scouting/primary — full player pool + ML roles. The scouting engine ranks players
// against positional peer groups client-side, so it needs the whole pool in one go.
// Shot maps, match logs and similarity lists are fetched per player via the routes below.
router.get('/primary', (_req, res) => {
  const { current, previous, meta, ml } = getBundle();
  const { similarity, ...mlWithoutSimilarity } = ml;
  cacheHeaders(res);
  res.json({ current, previous, meta, ml: mlWithoutSimilarity });
});

// GET /api/scouting/similar/:playerName — ML similarity list for one player
router.get('/similar/:playerName', (req, res) => {
  const id = playerKey(decodeURIComponent(req.params.playerName));
  res.json({ items: getBundle().ml.similarity?.[id] || [] });
});

// GET /api/scouting/current?position=FW&team=Arsenal&limit=20&offset=0
router.get('/current', (req, res) => {
  const { position, team } = req.query;
  let rows = getBundle().current;
  if (position) rows = rows.filter((p) => p.Pos === position);
  if (team) rows = rows.filter((p) => p.Squad === team);
  res.json(paginate(rows, req.query, { defaultLimit: 50 }));
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
