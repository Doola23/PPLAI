// JSON-file store for local development (no database needed).
const fs = require('fs');
const path = require('path');

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

function createFileStore(dir) {
  const usersFile = path.join(dir, 'users.json');
  const auditFile = path.join(dir, 'audit_log.json');
  const users = load(usersFile, {});
  let audit = load(auditFile, []);

  const userStore = {
    kind: 'file',
    async get(email) {
      return users[email] ? { ...users[email] } : null;
    },
    async put(user) {
      users[user.email] = { ...user };
      save(usersFile, users);
      return { ...user };
    },
    async update(email, fields) {
      if (!users[email]) return null;
      users[email] = { ...users[email], ...fields };
      for (const [k, v] of Object.entries(fields)) if (v === undefined) delete users[email][k];
      save(usersFile, users);
      return { ...users[email] };
    },
    async remove(email) {
      delete users[email];
      save(usersFile, users);
    },
    async count() {
      return Object.keys(users).length;
    },
    async ping() {
      return true;
    },
  };

  const auditStore = {
    async add(entry) {
      audit.push(entry);
      if (audit.length > AUDIT_MAX_ENTRIES) audit = audit.slice(-AUDIT_MAX_ENTRIES);
      save(auditFile, audit);
    },
    async recent(limit = 50) {
      return [...audit].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
    },
  };

  return { userStore, auditStore };
}

module.exports = { createFileStore };
