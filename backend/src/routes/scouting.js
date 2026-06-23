const { Router } = require('express');
const { ScanCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../db');

const router = Router();

// In-memory cache — scouting data changes rarely; cache for 10 min per key
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;
function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCached(key, data) { cache.set(key, { data, ts: Date.now() }); }

// Helper: paginated full-table scan
async function scanAll(TableName) {
  const items = [];
  let params = { TableName };
  while (params) {
    const result = await docClient.send(new ScanCommand(params));
    items.push(...(result.Items || []));
    params = result.LastEvaluatedKey
      ? { TableName, ExclusiveStartKey: result.LastEvaluatedKey }
      : null;
  }
  return items;
}

// Parse meta items — each row is {meta_key, value} or a flat object
function parseMeta(items) {
  // Try key-value format first ({meta_key, value} per row)
  const kv = {};
  for (const item of items) {
    if (item.meta_key) kv[item.meta_key] = item.value;
  }
  // Fallback: flat object (single item with all fields)
  const flat = items[0] || {};
  return {
    currentSeason:  kv.currentSeason  ?? kv.current_season  ?? flat.currentSeason  ?? flat.current_season  ?? '2024-25',
    previousSeason: kv.previousSeason ?? kv.previous_season ?? flat.previousSeason ?? flat.previous_season ?? '2023-24',
  };
}

// Assemble ML data — each item: { model_key: "{type}_{playerName}", value: {...} }
function assembleML(mlItems) {
  const ml = { roles: {}, similarity: {}, valuation: {} };
  for (const item of mlItems) {
    const key = item.model_key || '';
    const val = item.value ?? {};
    if (key.startsWith('roles_'))           ml.roles[key.slice(6)]       = val;
    else if (key.startsWith('similarity_')) ml.similarity[key.slice(11)] = val;
    else if (key.startsWith('valuePrediction_')) ml.valuation[key.slice(16)] = val;
    else if (key.startsWith('valuation_'))   ml.valuation[key.slice(10)]  = val;
  }
  return ml;
}

// Build player-keyed lookup — tries player_id, player_squad, player_key, playerKey
function keyedByPlayer(items) {
  const out = {};
  for (const item of items) {
    const k = item.player_id ?? item.player_squad ?? item.player_key ?? item.playerKey;
    if (k) out[String(k).toLowerCase().trim()] = item;
  }
  return out;
}

// GET /api/scouting/debug-sample — get 1 raw item from each extras table + ML
router.get('/debug-sample', async (req, res) => {
  try {
    const [sm, ml, mlT] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: 'scouting-shot-maps', Limit: 1 })),
      docClient.send(new ScanCommand({ TableName: 'scouting-match-logs', Limit: 1 })),
      docClient.send(new ScanCommand({ TableName: 'scouting-ml', Limit: 2 })),
    ]);
    res.json({
      shotMap: { fields: Object.keys(sm.Items?.[0] || {}), sample: sm.Items?.[0] },
      matchLog: { fields: Object.keys(ml.Items?.[0] || {}), sample: ml.Items?.[0] },
      ml: { count: mlT.Count, items: mlT.Items?.map(i => ({ model_key: i.model_key, topKeys: Object.keys(i).slice(0,5) })) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scouting/primary — fast bundle (no shot-maps / match-logs)
router.get('/primary', async (req, res) => {
  const cached = getCached('primary');
  if (cached) {
    res.set('Cache-Control', 'public, max-age=600');
    return res.json(cached);
  }
  try {
    const [current, previous, metaItems, mlItems] = await Promise.all([
      scanAll('scouting-current').catch(() => []),
      scanAll('scouting-previous').catch(() => []),
      scanAll('scouting-meta').catch(() => []),
      scanAll('scouting-ml').catch(() => []),
    ]);
    const payload = {
      current,
      previous,
      meta: parseMeta(metaItems),
      ml: assembleML(mlItems),
      shotMaps: {},
      matchLogs: {},
    };
    setCached('primary', payload);
    res.set('Cache-Control', 'public, max-age=600');
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scouting/extras — shot-maps + match-logs (lazy-loaded after primary)
router.get('/extras', async (req, res) => {
  const cached = getCached('extras');
  if (cached) {
    res.set('Cache-Control', 'public, max-age=600');
    return res.json(cached);
  }
  try {
    const [shotMapItems, matchLogItems] = await Promise.all([
      scanAll('scouting-shot-maps').catch((e) => { console.error('shot-maps scan error:', e.message); return []; }),
      scanAll('scouting-match-logs').catch((e) => { console.error('match-logs scan error:', e.message); return []; }),
    ]);
    // Shot maps: data nested under item.shots — unwrap it
    const shotMaps = {};
    for (const item of shotMapItems) {
      const k = String(item.player_id ?? item.player_squad ?? item.player_key ?? item.playerKey ?? '').toLowerCase().trim();
      if (k) shotMaps[k] = item.shots ?? item;
    }
    // Match logs: data nested under item.logs — unwrap, grab .m array
    const matchLogs = {};
    for (const item of matchLogItems) {
      const k = String(item.player_id ?? item.player_squad ?? item.player_key ?? item.playerKey ?? '').toLowerCase().trim();
      if (k) matchLogs[k] = { m: item.logs?.m ?? item.matches ?? item.m ?? [] };
    }
    const payload = { shotMaps, matchLogs };
    setCached('extras', payload);
    res.set('Cache-Control', 'public, max-age=600');
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scouting/bundle — full data bundle (kept for compatibility)
router.get('/bundle', async (req, res) => {
  try {
    const [current, previous, metaItems, mlItems, shotMapItems, matchLogItems] = await Promise.all([
      scanAll('scouting-current').catch(() => []),
      scanAll('scouting-previous').catch(() => []),
      scanAll('scouting-meta').catch(() => []),
      scanAll('scouting-ml').catch(() => []),
      scanAll('scouting-shot-maps').catch(() => []),
      scanAll('scouting-match-logs').catch(() => []),
    ]);
    const metaItem = metaItems[0] || {};
    const shotMaps = {};
    for (const item of shotMapItems) {
      const k = item.player_id ?? item.player_key ?? item.player_squad ?? item.playerKey;
      if (k) shotMaps[k] = item;
    }
    const matchLogs = {};
    for (const item of matchLogItems) {
      const k = item.player_id ?? item.player_key ?? item.player_squad ?? item.playerKey;
      if (k) matchLogs[k] = { m: item.matches ?? item.m ?? [] };
    }
    res.json({
      current, previous,
      meta: {
        currentSeason:  metaItem.currentSeason  ?? metaItem.current_season  ?? '2024-25',
        previousSeason: metaItem.previousSeason ?? metaItem.previous_season ?? '2023-24',
      },
      ml: assembleML(mlItems),
      shotMaps,
      matchLogs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scouting/current?position=FW&team=Arsenal&limit=20
router.get('/current', async (req, res) => {
  try {
    const { position, team, limit = 50 } = req.query;
    const params = { TableName: 'scouting-current', Limit: parseInt(limit) };

    const filters = [];
    const names = {};
    const vals = {};

    if (position) {
      filters.push('#pos = :pos');
      names['#pos'] = 'Pos';
      vals[':pos'] = position;
    }
    if (team) {
      filters.push('Squad = :team');
      vals[':team'] = team;
    }

    if (filters.length) {
      params.FilterExpression = filters.join(' AND ');
      if (Object.keys(names).length) params.ExpressionAttributeNames = names;
      params.ExpressionAttributeValues = vals;
    }

    const data = await docClient.send(new ScanCommand(params));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scouting/current/:playerSquad  (pk = "PlayerName_Squad")
router.get('/current/:playerSquad', async (req, res) => {
  try {
    const data = await docClient.send(new GetCommand({
      TableName: 'scouting-current',
      Key: { player_squad: decodeURIComponent(req.params.playerSquad) },
    }));
    if (!data.Item) return res.status(404).json({ error: 'Not found' });
    res.json(data.Item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scouting/previous
router.get('/previous', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const data = await docClient.send(new ScanCommand({ TableName: 'scouting-previous', Limit: parseInt(limit) }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scouting/match-logs/:playerName
// Partition key on this table is player_id, keyed by lowercase player name -- not
// player_squad (which doesn't exist on this table at all, hence the prior bug).
router.get('/match-logs/:playerName', async (req, res) => {
  try {
    const data = await docClient.send(new QueryCommand({
      TableName: 'scouting-match-logs',
      KeyConditionExpression: 'player_id = :pid',
      ExpressionAttributeValues: { ':pid': decodeURIComponent(req.params.playerName).toLowerCase().trim() },
    }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scouting/shot-maps/:playerName
router.get('/shot-maps/:playerName', async (req, res) => {
  try {
    const data = await docClient.send(new QueryCommand({
      TableName: 'scouting-shot-maps',
      KeyConditionExpression: 'player_id = :pid',
      ExpressionAttributeValues: { ':pid': decodeURIComponent(req.params.playerName).toLowerCase().trim() },
    }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scouting/meta
router.get('/meta', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: 'scouting-meta' }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scouting/ml/:modelKey
router.get('/ml/:modelKey', async (req, res) => {
  try {
    const data = await docClient.send(new GetCommand({
      TableName: 'scouting-ml',
      Key: { model_key: decodeURIComponent(req.params.modelKey) },
    }));
    if (!data.Item) return res.status(404).json({ error: 'Not found' });
    res.json(data.Item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
