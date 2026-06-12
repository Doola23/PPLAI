const { Router } = require('express');
const { ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../db');
const requireAuth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = Router();

const AUDIT_TABLE = 'plai_audit_log';

// ── Audit log writer (used by other routes) ────────────────────────────────
async function writeAuditLog({ userId, userEmail, userName, actionType, action }) {
  try {
    await docClient.send(new PutCommand({
      TableName: AUDIT_TABLE,
      Item: {
        logId:     uuidv4(),
        userId:    userId ?? 'system',
        userEmail: userEmail ?? '',
        userName:  userName ?? 'Unknown',
        actionType,
        action,
        timestamp: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30-day TTL
      },
    }));
  } catch (err) {
    // Non-fatal — never block a request because of audit logging
    console.warn('Audit log write failed:', err.message);
  }
}

// GET /api/admin/health — real service health
router.get('/health', requireAuth, async (_req, res) => {
  const services = [];

  // 1. API Server — always reachable (we're responding)
  services.push({ label: 'API Server', ok: true, status: 'Operational', latency: null });

  // 2. Database — ping DynamoDB with a lightweight scan(limit 1) on plai_users
  const dbStart = Date.now();
  try {
    await docClient.send(new ScanCommand({ TableName: 'plai_users', Limit: 1 }));
    services.push({ label: 'Database', ok: true, status: 'Operational', latency: `${Date.now() - dbStart}ms` });
  } catch {
    services.push({ label: 'Database', ok: false, status: 'Down', latency: null });
  }

  // 3. Prediction Model — ping Matchpredictions table
  const modelStart = Date.now();
  try {
    await docClient.send(new ScanCommand({ TableName: 'Matchpredictions', Limit: 1 }));
    services.push({ label: 'Prediction Model', ok: true, status: 'Operational', latency: `${Date.now() - modelStart}ms` });
  } catch {
    services.push({ label: 'Prediction Model', ok: false, status: 'Unavailable', latency: null });
  }

  // 4. Injury Pipeline — ping InjuryPredictions table
  const injuryStart = Date.now();
  try {
    await docClient.send(new ScanCommand({ TableName: 'InjuryPredictions', Limit: 1 }));
    services.push({ label: 'Data Pipeline', ok: true, status: 'Operational', latency: `${Date.now() - injuryStart}ms` });
  } catch {
    services.push({ label: 'Data Pipeline', ok: false, status: 'Unavailable', latency: null });
  }

  const degraded = services.filter(s => !s.ok);
  const alerts = degraded.map(s => ({
    severity: 'Critical',
    message:  `${s.label} is unreachable — check DynamoDB table or AWS credentials.`,
    time:     'just now',
  }));

  res.json({ services, alerts, healthy: degraded.length === 0 });
});

// GET /api/admin/activity — last 50 audit log entries, sorted newest first
router.get('/activity', requireAuth, async (_req, res) => {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: AUDIT_TABLE }));
    const items = (result.Items ?? [])
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 50);
    res.json({ activity: items });
  } catch (err) {
    console.error('Activity fetch error:', err.message);
    res.status(500).json({ error: 'Could not fetch activity log' });
  }
});

// GET /api/admin/stats — real counts from DynamoDB tables
router.get('/stats', requireAuth, async (_req, res) => {
  async function countTable(name) {
    try {
      const r = await docClient.send(new ScanCommand({ TableName: name, Select: 'COUNT' }));
      return r.Count ?? 0;
    } catch { return null; }
  }

  const [users, predictions, injuries] = await Promise.all([
    countTable('plai_users'),
    countTable('Matchpredictions'),
    countTable('InjuryPredictions'),
  ]);

  res.json({ users, predictions, injuries });
});

module.exports = { router, writeAuditLog };
