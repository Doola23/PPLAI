// Picks the user/audit store: Postgres when DATABASE_URL is set, JSON file otherwise.
const { STORE_DIR } = require('../config/paths');
const { createFileStore } = require('./stores/fileStore');
const { createPostgresStore } = require('./stores/postgresStore');

function createStore() {
  const url = process.env.DATABASE_URL;
  if (!url) return createFileStore(STORE_DIR);

  const { Pool } = require('pg');
  const local = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
  const pool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
  return createPostgresStore(pool);
}

module.exports = createStore();
