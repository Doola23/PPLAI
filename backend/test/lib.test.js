const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readCsv } = require('../src/lib/dataFiles');
const { paginate } = require('../src/lib/pagination');

test('readCsv casts numbers and booleans, drops empty and Unnamed columns', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'plai-csv-')), 'sample.csv');
  fs.writeFileSync(file, '﻿Unnamed: 0,Team,Pts,Rate,Within_2,Note\n0,Arsenal,74,0.526,True,\n1,Spurs,38,-1.5e-2,False,ok\n');

  assert.deepEqual(readCsv(file), [
    { Team: 'Arsenal', Pts: 74, Rate: 0.526, Within_2: true },
    { Team: 'Spurs', Pts: 38, Rate: -0.015, Within_2: false, Note: 'ok' },
  ]);
});

test('readCsv returns [] for a missing file', () => {
  assert.deepEqual(readCsv(path.join(os.tmpdir(), 'does-not-exist.csv')), []);
});

test('paginate applies defaults, offset and limit caps', () => {
  const rows = Array.from({ length: 250 }, (_, i) => i);

  const first = paginate(rows, {});
  assert.equal(first.items.length, 100);
  assert.equal(first.total, 250);

  const last = paginate(rows, { limit: '100', offset: '200' });
  assert.deepEqual([last.items[0], last.count], [200, 50]);

  assert.equal(paginate(rows, { limit: '99999' }, { maxLimit: 120 }).limit, 120);
  assert.equal(paginate(rows, { limit: '-5' }).limit, 1);
  assert.equal(paginate(rows, { offset: '999' }).count, 0);
});
