// JSON-file user + audit store. Async API mirrors a DB client so it can be swapped later.
const fs = require('fs');
const path = require('path');
const { STORE_DIR } = require('../config/paths');

const USERS_FILE = path.join(STORE_DIR, 'users.json');
const AUDIT_FILE = path.join(STORE_DIR, 'audit_log.json');
const AUDIT_MAX_ENTRIES = 1000;

function load(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function save(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

let users = load(USERS_FILE, {});
let audit = load(AUDIT_FILE, []);

const userStore = {
  async get(email) {
    return users[email] ? { ...users[email] } : null;
  },

  async put(user) {
    users[user.email] = { ...user };
    save(USERS_FILE, users);
    return { ...user };
  },

  async update(email, fields) {
    if (!users[email]) return null;
    users[email] = { ...users[email], ...fields };
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) delete users[email][k];
    }
    save(USERS_FILE, users);
    return { ...users[email] };
  },

  async remove(email) {
    delete users[email];
    save(USERS_FILE, users);
  },

  async count() {
    return Object.keys(users).length;
  },
};

const auditStore = {
  async add(entry) {
    audit.push(entry);
    if (audit.length > AUDIT_MAX_ENTRIES) audit = audit.slice(-AUDIT_MAX_ENTRIES);
    save(AUDIT_FILE, audit);
  },

  async recent(limit = 50) {
    return [...audit].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  },
};

module.exports = { userStore, auditStore };
