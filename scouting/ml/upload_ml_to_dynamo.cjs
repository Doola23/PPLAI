// Uploads the regenerated ML (roles + similarity + roleProfiles + modelInfo) from
// scouting_bundle.json to the scouting-ml DynamoDB table. Re-keys player entries to
// the frontend lookup format (Player.toLowerCase().trim(), accents preserved) and
// also writes the accent-stripped key as a fallback. Loads backend/.env at runtime
// and never prints any credential value.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const BUNDLE = 'C:/Users/DELL/Desktop/public/scoutlab/public/scouting_bundle.json';
const TABLE = 'scouting-ml';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
});
const doc = DynamoDBDocumentClient.from(client);

// Mirror the pipeline's norm_name: drop trailing "(n)", strip accents, lowercase.
function normName(s) {
  if (typeof s !== 'string') return '';
  s = s.replace(/\s*\(\d+\)\s*$/, '').trim();
  s = s.normalize('NFD').replace(/\p{Mn}/gu, '');
  return s.toLowerCase().trim();
}
const frontKey = (s) => (s || '').toLowerCase().trim();

(async () => {
  const bundle = JSON.parse(fs.readFileSync(BUNDLE, 'utf8'));
  const ml = bundle.ml || {};
  const players = [...(bundle.current || []), ...(bundle.previous || [])];

  // name_norm -> display Player name (current wins; first seen kept)
  const nnToPlayer = new Map();
  for (const p of players) {
    if (!p.Player) continue;
    const nn = normName(p.Player);
    if (!nnToPlayer.has(nn)) nnToPlayer.set(nn, p.Player);
  }

  // Build the full list of items to write, de-duped by model_key.
  const items = new Map();
  const addPlayerEntry = (prefix, nnKey, value) => {
    const player = nnToPlayer.get(nnKey) || nnKey;
    const accentKey = frontKey(player);          // matches frontend lookup
    items.set(`${prefix}_${accentKey}`, { model_key: `${prefix}_${accentKey}`, value });
    if (nnKey !== accentKey) items.set(`${prefix}_${nnKey}`, { model_key: `${prefix}_${nnKey}`, value }); // stripped fallback
  };

  for (const [nn, v] of Object.entries(ml.roles || {}))      addPlayerEntry('roles', nn, v);
  for (const [nn, v] of Object.entries(ml.similarity || {})) addPlayerEntry('similarity', nn, v);
  for (const [cid, v] of Object.entries(ml.roleProfiles || {})) items.set(`roleProfiles_${cid}`, { model_key: `roleProfiles_${cid}`, value: v });
  if (ml.modelInfo) items.set('modelInfo', { model_key: 'modelInfo', value: ml.modelInfo });

  const all = [...items.values()];
  console.log(`Prepared ${all.length} items (roles+similarity re-keyed, +roleProfiles/modelInfo).`);

  let written = 0;
  for (let i = 0; i < all.length; i += 25) {
    const batch = all.slice(i, i + 25);
    let req = { RequestItems: { [TABLE]: batch.map((Item) => ({ PutRequest: { Item } })) } };
    // Handle UnprocessedItems with simple retry
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await doc.send(new BatchWriteCommand(req));
      const un = res.UnprocessedItems && res.UnprocessedItems[TABLE];
      if (!un || un.length === 0) break;
      req = { RequestItems: { [TABLE]: un } };
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
    written += batch.length;
    if (written % 500 < 25) console.log(`  written ${written}/${all.length}`);
  }
  console.log(`\nDONE. Wrote ${written} items to ${TABLE}.`);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
