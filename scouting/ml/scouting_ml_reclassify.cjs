// Corrects winger-as-midfielder misclassification in the scouting-ml `roles`.
// Rule (validated): a player the ML clustered as MF but whom FBref lists
// forward-first (Pos starts "FW") with an attacking wide profile is a winger,
// not a central midfielder. Genuine AMs (Pos starts "MF") are untouched.
//
// Dry-run by default (no writes). Pass --apply to write to DynamoDB.
// Loads backend/.env at runtime; never prints any credential value.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const APPLY = process.argv.includes('--apply');
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const doc = DynamoDBDocumentClient.from(client);

const norm = (s) => (s || '').toLowerCase().trim();

async function scanAll(TableName) {
  const items = [];
  let params = { TableName };
  while (params) {
    const r = await doc.send(new ScanCommand(params));
    items.push(...(r.Items || []));
    params = r.LastEvaluatedKey ? { TableName, ExclusiveStartKey: r.LastEvaluatedKey } : null;
  }
  return items;
}

(async () => {
  const [current, ml] = await Promise.all([scanAll('scouting-current'), scanAll('scouting-ml')]);

  // name -> stats needed for the rule
  const stats = new Map();
  for (const p of current) {
    if (!p.Player) continue;
    stats.set(norm(p.Player), {
      pos: (p.Pos || '').trim(),
      takeons: +(p.successful_takeons_per90 || 0),
      crosses: +(p.crosses_per90 || 0),
      progC: +(p.prog_carries_per90 || 0),
      goals: +(p.goals || p.Gls || 0),
      defWork: (+(p.tackles_per90 || 0)) + (+(p.interceptions_per90 || 0)) + (+(p.clearances_per90 || 0)) + (+(p.blocks_per90 || 0)),
    });
  }

  const roleItems = ml.filter((i) => (i.model_key || '').startsWith('roles_'));
  const changes = [];
  for (const it of roleItems) {
    const v = it.value || {};
    const name = it.model_key.slice(6);
    const s = stats.get(name);
    if (!s) continue;

    // Rule 1 — winger clustered as midfielder: FBref lists them forward-first with a
    // wide attacking profile → Winger, not central midfielder.
    if (v.pos_group === 'MF' && /^FW/.test(s.pos) && (s.takeons >= 1.0 || s.crosses >= 1.5 || s.progC >= 3.0)) {
      const newRole = s.goals >= 0.4 ? 'Inverted Winger' : 'Creative Winger';
      changes.push({ model_key: it.model_key, name, from: `${v.pos_group}/${v.role}`, value: { ...v, pos_group: 'WG', role: newRole } });
      continue;
    }
    // Rule 2 — wing-back clustered as winger/forward: FBref lists them defender-first
    // and they carry a real defensive workload → Attacking Full-Back (a defender),
    // not a winger. The defWork gate excludes forwards FBref happened to tag DF.
    if ((v.pos_group === 'WG' || v.pos_group === 'FW') && /^DF/.test(s.pos) && s.defWork >= 5.0) {
      changes.push({ model_key: it.model_key, name, from: `${v.pos_group}/${v.role}`, value: { ...v, pos_group: 'DF', role: 'Attacking Full-Back' } });
      continue;
    }
  }

  const r1 = changes.filter((c) => c.value.pos_group === 'WG').length;
  const r2 = changes.filter((c) => c.value.pos_group === 'DF').length;
  console.log(`Will reclassify: ${changes.length} total  (MF->WG: ${r1}, attacker->DF wing-back: ${r2})`);
  console.log('Sample:', changes.slice(0, 14).map((c) => `${c.name} (${c.from} -> ${c.value.pos_group}/${c.value.role})`).join('; '));

  if (!APPLY) { console.log('\nDRY RUN — no writes. Re-run with --apply to update DynamoDB.'); return; }

  let written = 0;
  for (const c of changes) {
    await doc.send(new PutCommand({ TableName: 'scouting-ml', Item: { model_key: c.model_key, value: c.value } }));
    written++;
    if (written % 10 === 0) console.log(`  written ${written}/${changes.length}`);
  }
  console.log(`\nDONE. Updated ${written} role items in scouting-ml.`);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
