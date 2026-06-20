const { Router } = require('express');
const { ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../db');

const router = Router();

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

// GET /api/player-predictions — 2025-26 season forecasts for all outfield players
// (goalkeepers excluded — validated separately as unreliable, see player_stats/README.md)
router.get('/', async (req, res) => {
  try {
    const items = await scanAll('player-stats-predictions');
    res.json({ items, count: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/player-predictions/:player
router.get('/:player', async (req, res) => {
  try {
    const data = await docClient.send(new GetCommand({
      TableName: 'player-stats-predictions',
      Key: { Player: decodeURIComponent(req.params.player) },
    }));
    if (!data.Item) return res.status(404).json({ error: 'Not found' });
    res.json(data.Item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
