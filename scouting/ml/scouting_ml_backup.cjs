// READ-ONLY: backs up the scouting-ml table to a local JSON file so the role
// reclassification is fully reversible. Loads credentials from backend/.env at
// runtime via dotenv — it NEVER prints/logs any env value, only counts.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const doc = DynamoDBDocumentClient.from(client);

(async () => {
  const items = [];
  let params = { TableName: 'scouting-ml' };
  while (params) {
    const r = await doc.send(new ScanCommand(params));
    items.push(...(r.Items || []));
    params = r.LastEvaluatedKey ? { TableName: 'scouting-ml', ExclusiveStartKey: r.LastEvaluatedKey } : null;
  }
  const out = path.join(__dirname, 'scouting_ml_backup.json');
  fs.writeFileSync(out, JSON.stringify(items, null, 2), 'utf8');

  const byType = {};
  for (const it of items) {
    const t = (it.model_key || '').split('_')[0];
    byType[t] = (byType[t] || 0) + 1;
  }
  console.log(`Backed up ${items.length} scouting-ml items to scouting_ml_backup.json`);
  console.log('By type:', JSON.stringify(byType));
  // Show one roles item shape (non-secret) so we can confirm the schema
  const sampleRole = items.find((i) => (i.model_key || '').startsWith('roles_'));
  if (sampleRole) console.log('Sample roles item:', JSON.stringify(sampleRole));
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
