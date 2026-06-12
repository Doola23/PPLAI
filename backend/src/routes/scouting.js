const { Router } = require('express');
const { ScanCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../db');

const router = Router();

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

// GET /api/scouting/match-logs/:playerSquad
router.get('/match-logs/:playerSquad', async (req, res) => {
  try {
    const data = await docClient.send(new QueryCommand({
      TableName: 'scouting-match-logs',
      KeyConditionExpression: 'player_squad = :ps',
      ExpressionAttributeValues: { ':ps': decodeURIComponent(req.params.playerSquad) },
    }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scouting/shot-maps/:playerSquad
router.get('/shot-maps/:playerSquad', async (req, res) => {
  try {
    const data = await docClient.send(new QueryCommand({
      TableName: 'scouting-shot-maps',
      KeyConditionExpression: 'player_squad = :ps',
      ExpressionAttributeValues: { ':ps': decodeURIComponent(req.params.playerSquad) },
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
