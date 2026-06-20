const { Router } = require('express');
const { ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../db');

const router = Router();

// Each row now carries ~93 raw ML feature columns. A single un-projected Scan hits DynamoDB's
// 1MB-per-page cap after only a few hundred rows, silently truncating the result. Project down
// to just the fields the UI needs and paginate fully so all ~11k rows come back.
const PREDICTION_FIELDS = [
  'player_name', 'match_date', 'team', 'position_group',
  'injury_probability', 'risk_tier', 'predicted_high_risk',
  'currently_injured', 'chance_of_playing',
  'fpl_status_injured', 'fpl_status_doubtful',
  'age', 'muscle_injury_history', 'hamstring_history',
  'injuries_last_6m', 'injuries_last_12m', 'season',
  'minutes_played_this_match',
];

async function scanAllPredictions() {
  const names = {};
  PREDICTION_FIELDS.forEach((f, i) => { names[`#f${i}`] = f; });
  const projectionExpression = PREDICTION_FIELDS.map((_, i) => `#f${i}`).join(', ');
  const items = [];
  let params = {
    TableName: 'injuries-predictions',
    ProjectionExpression: projectionExpression,
    ExpressionAttributeNames: names,
  };
  while (params) {
    const result = await docClient.send(new ScanCommand(params));
    items.push(...(result.Items || []));
    params = result.LastEvaluatedKey
      ? { ...params, ExclusiveStartKey: result.LastEvaluatedKey }
      : null;
  }
  return items;
}

// GET /api/injuries/predictions?playerName=Haaland
router.get('/predictions', async (req, res) => {
  try {
    const { playerName, matchDate } = req.query;

    if (playerName && matchDate) {
      const { GetCommand } = require('@aws-sdk/lib-dynamodb');
      const data = await docClient.send(new GetCommand({
        TableName: 'injuries-predictions',
        Key: { player_name: playerName, match_date: matchDate },
      }));
      if (!data.Item) return res.status(404).json({ error: 'Not found' });
      return res.json(data.Item);
    }

    if (playerName) {
      const data = await docClient.send(new QueryCommand({
        TableName: 'injuries-predictions',
        KeyConditionExpression: 'player_name = :n',
        ExpressionAttributeValues: { ':n': playerName },
      }));
      return res.json({ items: data.Items, count: data.Count });
    }

    const items = await scanAllPredictions();
    res.json({ items, count: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/injuries/combined
router.get('/combined', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const data = await docClient.send(new ScanCommand({
      TableName: 'injuries-combined-clean',
      Limit: parseInt(limit),
    }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/injuries/players-combined
router.get('/players-combined', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const data = await docClient.send(new ScanCommand({
      TableName: 'injuries-players-combined',
      Limit: parseInt(limit),
    }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/injuries/player-minutes
router.get('/player-minutes', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const data = await docClient.send(new ScanCommand({
      TableName: 'injuries-player-minutes',
      Limit: parseInt(limit),
    }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/injuries/fpl
router.get('/fpl', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const data = await docClient.send(new ScanCommand({
      TableName: 'injuries-fpl-api',
      Limit: parseInt(limit),
    }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/injuries/international-breaks
router.get('/international-breaks', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: 'injuries-international-breaks' }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
