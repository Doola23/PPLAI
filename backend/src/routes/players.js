const { Router } = require('express');
const { ScanCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../db');

const router = Router();

// GET /api/players?season=2024-25
router.get('/', async (req, res) => {
  try {
    const { season, team, position, limit = 50 } = req.query;
    const params = {
      TableName: 'players',
      Limit: parseInt(limit),
    };

    if (season) {
      params.FilterExpression = 'season = :s';
      params.ExpressionAttributeValues = { ':s': season };
    }
    if (team) {
      params.FilterExpression = (params.FilterExpression ? params.FilterExpression + ' AND ' : '') + 'team = :t';
      params.ExpressionAttributeValues = { ...(params.ExpressionAttributeValues || {}), ':t': team };
    }
    if (position) {
      params.FilterExpression = (params.FilterExpression ? params.FilterExpression + ' AND ' : '') + '#pos = :p';
      params.ExpressionAttributeNames = { '#pos': 'position' };
      params.ExpressionAttributeValues = { ...(params.ExpressionAttributeValues || {}), ':p': position };
    }

    const data = await docClient.send(new ScanCommand(params));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/players/:playerId?season=2024-25
router.get('/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season } = req.query;

    if (season) {
      const data = await docClient.send(new GetCommand({
        TableName: 'players',
        Key: { player_id: playerId, season },
      }));
      if (!data.Item) return res.status(404).json({ error: 'Player not found' });
      return res.json(data.Item);
    }

    // No season — scan all seasons for this player
    const data = await docClient.send(new QueryCommand({
      TableName: 'players',
      KeyConditionExpression: 'player_id = :id',
      ExpressionAttributeValues: { ':id': playerId },
    }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
