const { Router } = require('express');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../db');

const router = Router();

const SEASONS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];

// GET /api/goalkeepers?year=2024&limit=50
router.get('/', async (req, res) => {
  try {
    const { year, limit = 50 } = req.query;
    const targetYear = year ? parseInt(year) : 2024;

    if (!SEASONS.includes(targetYear)) {
      return res.status(400).json({ error: `Year must be one of: ${SEASONS.join(', ')}` });
    }

    const data = await docClient.send(new ScanCommand({
      TableName: `gk-${targetYear}`,
      Limit: parseInt(limit),
    }));
    res.json({ items: data.Items, count: data.Count, year: targetYear });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/goalkeepers/seasons — list available years
router.get('/seasons', (_req, res) => {
  res.json({ seasons: SEASONS });
});

module.exports = router;
