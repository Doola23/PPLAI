const { Router } = require('express');
const { ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../db');

const router = Router();

// GET /api/team-reports
router.get('/', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const data = await docClient.send(new ScanCommand({
      TableName: 'output-team-reports',
      Limit: parseInt(limit),
    }));
    res.json({ items: data.Items, count: data.Count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
