const { Router } = require('express');
const { ScanCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../db');
const { optionalAuth, blockRole } = require('../middleware/auth');

const router = Router();

// Match-level win/draw/loss predictions stay open to anonymous visitors (the public
// landing page teaser needs them) but are blocked for logged-in fan accounts, to keep
// this away from anything that reads as betting-odds access for casual users.
const blockFans = [optionalAuth, blockRole('fan')];

// GET /api/matches/predictions?homeTeam=Arsenal&awayTeam=Chelsea
router.get('/predictions', blockFans, async (req, res) => {
  try {
    const { homeTeam, awayTeam } = req.query;

    if (homeTeam && awayTeam) {
      const data = await docClient.send(new GetCommand({
        TableName: 'Matchpredictions',
        Key: { home_team: homeTeam, away_team: awayTeam },
      }));
      if (!data.Item) return res.status(404).json({ error: 'Prediction not found' });
      return res.json(data.Item);
    }

    if (homeTeam) {
      const data = await docClient.send(new QueryCommand({
        TableName: 'Matchpredictions',
        KeyConditionExpression: 'home_team = :h',
        ExpressionAttributeValues: { ':h': homeTeam },
      }));
      return res.json({ items: data.Items, count: data.Count });
    }

    const data = await docClient.send(new ScanCommand({ TableName: 'Matchpredictions' }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/matches/output/predictions
router.get('/output/predictions', blockFans, async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: 'match-output-predictions' }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/matches/output/standings/actual
router.get('/output/standings/actual', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: 'match-output-standings-actual' }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/matches/output/standings/predicted
router.get('/output/standings/predicted', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: 'match-output-standings-predicted' }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/matches/output/standings/comparison
router.get('/output/standings/comparison', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: 'match-output-standings-comparison' }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/matches/output/draw-risk
router.get('/output/draw-risk', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: 'match-output-draw-risk' }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/matches/output/shap
router.get('/output/shap', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: 'match-output-shap' }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/matches/output/analyst/last5
router.get('/output/analyst/last5', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: 'match-output-analyst-last5' }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/matches/output/analyst/season
router.get('/output/analyst/season', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: 'match-output-analyst-season' }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/matches/output/calibration
router.get('/output/calibration', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: 'match-output-calibration' }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
