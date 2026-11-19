const fs = require('fs');
const { parse } = require('csv-parse/sync');

const cache = new Map();

function castValue(value) {
  if (value === '') return undefined;
  if (value === 'True' || value === 'true') return true;
  if (value === 'False' || value === 'false') return false;
  if (/^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(value)) return Number(value);
  return value;
}

function parseCsv(file) {
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const rows = parse(content, { columns: true, skip_empty_lines: true });
  return rows.map((row) => {
    const out = {};
    for (const [key, raw] of Object.entries(row)) {
      if (!key || key.startsWith('Unnamed')) continue;
      const value = castValue(raw);
      if (value !== undefined) out[key] = value;
    }
    return out;
  });
}

function memo(key, loader) {
  if (!cache.has(key)) cache.set(key, loader());
  return cache.get(key);
}

const readCsv = (file) => memo(`csv:${file}`, () => parseCsv(file));

const readJson = (file) => memo(`json:${file}`, () => (
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')) : null
));

module.exports = { readCsv, readJson, memo };
