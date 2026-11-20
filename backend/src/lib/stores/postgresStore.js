// Postgres store, used when DATABASE_URL is set. Users are kept as one JSONB document
// per email so profile fields can grow without migrations.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    email      TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    log_id     TEXT PRIMARY KEY,
    ts         TIMESTAMPTZ NOT NULL,
    entry      JSONB NOT NULL
  );
  CREATE INDEX IF NOT EXISTS audit_log_ts_idx ON audit_log (ts DESC);
`;

const AUDIT_RETENTION_DAYS = 30;

function createPostgresStore(pool) {
  let ready = null;
  const init = () => (ready ??= pool.query(SCHEMA).catch((err) => { ready = null; throw err; }));
  const query = async (sql, params) => { await init(); return pool.query(sql, params); };

  const userStore = {
    kind: 'postgres',
    async get(email) {
      const { rows } = await query('SELECT data FROM users WHERE email = $1', [email]);
      return rows[0]?.data ?? null;
    },
    async put(user) {
      await query(
        'INSERT INTO users (email, data) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET data = EXCLUDED.data',
        [user.email, JSON.stringify(user)],
      );
      return { ...user };
    },
    async update(email, fields) {
      const current = await userStore.get(email);
      if (!current) return null;
      const next = { ...current, ...fields };
      for (const [k, v] of Object.entries(fields)) if (v === undefined) delete next[k];
      await query('UPDATE users SET data = $2 WHERE email = $1', [email, JSON.stringify(next)]);
      return next;
    },
    async remove(email) {
      await query('DELETE FROM users WHERE email = $1', [email]);
    },
    async count() {
      const { rows } = await query('SELECT COUNT(*)::int AS n FROM users');
      return rows[0].n;
    },
    async ping() {
      await query('SELECT 1');
      return true;
    },
  };

  const auditStore = {
    async add(entry) {
      await query('INSERT INTO audit_log (log_id, ts, entry) VALUES ($1, $2, $3)', [
        entry.logId, entry.timestamp, JSON.stringify(entry),
      ]);
      await query(`DELETE FROM audit_log WHERE ts < now() - interval '${AUDIT_RETENTION_DAYS} days'`);
    },
    async recent(limit = 50) {
      const { rows } = await query('SELECT entry FROM audit_log ORDER BY ts DESC LIMIT $1', [limit]);
      return rows.map((r) => r.entry);
    },
  };

  return { userStore, auditStore };
}

module.exports = { createPostgresStore };
