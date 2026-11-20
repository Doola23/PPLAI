const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { newDb } = require('pg-mem');
const { createFileStore } = require('../src/lib/stores/fileStore');
const { createPostgresStore } = require('../src/lib/stores/postgresStore');

function pgMemPool() {
  const { Pool } = newDb().adapters.createPg();
  return new Pool();
}

const backends = {
  file: () => createFileStore(fs.mkdtempSync(path.join(os.tmpdir(), 'plai-store-'))),
  postgres: () => createPostgresStore(pgMemPool()),
};

for (const [name, make] of Object.entries(backends)) {
  describe(`${name} store`, () => {
    test('put / get / update / remove / count', async () => {
      const { userStore } = make();
      const user = { email: 'a@test.dev', userId: 'u1', name: 'A', role: 'scout', refreshHash: 'h' };

      assert.equal(await userStore.get(user.email), null);
      await userStore.put(user);
      assert.deepEqual(await userStore.get(user.email), user);
      assert.equal(await userStore.count(), 1);

      const updated = await userStore.update(user.email, { favoriteClub: 'Arsenal', refreshHash: undefined });
      assert.equal(updated.favoriteClub, 'Arsenal');
      assert.equal('refreshHash' in updated, false);
      assert.deepEqual(await userStore.get(user.email), updated);

      assert.equal(await userStore.update('missing@test.dev', { name: 'x' }), null);

      await userStore.remove(user.email);
      assert.equal(await userStore.get(user.email), null);
      assert.equal(await userStore.count(), 0);
      assert.equal(await userStore.ping(), true);
    });

    test('audit log returns newest first', async () => {
      const { auditStore } = make();
      const now = Date.now();
      for (let i = 0; i < 3; i++) {
        await auditStore.add({ logId: `l${i}`, action: `a${i}`, timestamp: new Date(now + i * 1000).toISOString() });
      }
      const recent = await auditStore.recent(2);
      assert.deepEqual(recent.map((e) => e.action), ['a2', 'a1']);
    });
  });
}
