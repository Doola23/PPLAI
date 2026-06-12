const { Router } = require('express');
const { ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../db');

const router = Router();

// GET /api/injuries/predictions?playerName=Haaland
router.get('/predictions', async (req, res) => {
  try {
    const { playerName, matchDate, limit = 50 } = req.query;

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

    const data = await docClient.send(new ScanCommand({
      TableName: 'injuries-predictions',
      Limit: parseInt(limit),
    }));
    res.json({ items: data.Items, count: data.Count });
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
