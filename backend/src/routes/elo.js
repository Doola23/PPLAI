const { Router } = require('express');
const { ScanCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../db');

const router = Router();

// GET /api/elo/final?season=2024-25
router.get('/final', async (req, res) => {
  try {
    const { season, limit = 100 } = req.query;
    const params = { TableName: 'elo-final-per-season', Limit: parseInt(limit) };

    if (season) {
      params.FilterExpression = 'season = :s';
      params.ExpressionAttributeValues = { ':s': season };
    }

    const data = await docClient.send(new ScanCommand(params));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/elo/history?team=Arsenal
router.get('/history', async (req, res) => {
  try {
    const { team, limit = 200 } = req.query;
    const params = { TableName: 'elo-history', Limit: parseInt(limit) };

    if (team) {
      params.FilterExpression = 'team = :t';
      params.ExpressionAttributeValues = { ':t': team };
    }

    const data = await docClient.send(new ScanCommand(params));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
