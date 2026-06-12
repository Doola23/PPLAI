const { DynamoDBClient, CreateTableCommand, DescribeTableCommand, ResourceNotFoundException } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function ensureTable(name, schema) {
  try {
    await client.send(new DescribeTableCommand({ TableName: name }));
  } catch (err) {
    if (err.name === 'ResourceNotFoundException' || err.__type?.includes('ResourceNotFoundException')) {
      console.log(`Creating DynamoDB table: ${name}`);
      await client.send(new CreateTableCommand(schema));
      console.log(`Table ${name} created`);
    } else {
      throw err;
    }
  }
}

async function setupTables() {
  await ensureTable('plai_users', {
    TableName: 'plai_users',
    KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'email', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
  });

  await ensureTable('plai_audit_log', {
    TableName: 'plai_audit_log',
    KeySchema: [{ AttributeName: 'logId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'logId', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
  });
}

module.exports = setupTables;
