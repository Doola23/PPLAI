const fs = require('fs');
const { Router } = require('express');
const { randomUUID } = require('crypto');
const requireAuth = require('../middleware/auth');
const { userStore, auditStore } = require('../lib/userStore');
const { readCsv } = require('../lib/dataFiles');
const { MATCH_FIXTURES_FILE, INJURY_PREDICTIONS_FILE } = require('../config/paths');

const router = Router();

async function writeAuditLog({ userId, userEmail, userName, actionType, action }) {
  try {
    await auditStore.add({
      logId: randomUUID(),
      userId: userId ?? 'system',
      userEmail: userEmail ?? '',
      userName: userName ?? 'Unknown',
      actionType,
      action,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Audit log write failed:', err.message);
  }
}

function fileService(label, file) {
  const ok = fs.existsSync(file);
  return { label, ok, status: ok ? 'Operational' : 'Unavailable', latency: null };
}

async function storeService() {
  const start = Date.now();
  try {
    await userStore.ping();
    return { label: `User Store (${userStore.kind})`, ok: true, status: 'Operational', latency: `${Date.now() - start}ms` };
  } catch {
    return { label: `User Store (${userStore.kind})`, ok: false, status: 'Down', latency: null };
  }
}

// GET /api/admin/health
router.get('/health', requireAuth, async (_req, res) => {
  const services = [
    { label: 'API Server', ok: true, status: 'Operational', latency: null },
    await storeService(),
    fileService('Prediction Model', MATCH_FIXTURES_FILE),
    fileService('Data Pipeline', INJURY_PREDICTIONS_FILE),
  ];
  const degraded = services.filter((s) => !s.ok);
  const alerts = degraded.map((s) => ({
    severity: 'Critical',
    message: `${s.label} is unavailable — data file missing on the server.`,
    time: 'just now',
  }));
  res.json({ services, alerts, healthy: degraded.length === 0 });
});

// GET /api/admin/activity — last 50 audit log entries, newest first
router.get('/activity', requireAuth, async (_req, res) => {
  res.json({ activity: await auditStore.recent(50) });
});

// GET /api/admin/stats
router.get('/stats', requireAuth, async (_req, res) => {
  res.json({
    users: await userStore.count(),
    predictions: readCsv(MATCH_FIXTURES_FILE).length,
    injuries: readCsv(INJURY_PREDICTIONS_FILE).length,
  });
});

module.exports = { router, writeAuditLog };
