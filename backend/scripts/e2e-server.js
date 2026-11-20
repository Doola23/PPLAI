// Starts the API for end-to-end tests: throwaway JWT secrets and a temp JSON user store,
// so it never touches backend/.env or real accounts.
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.JWT_SECRET = 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret';
process.env.STORE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'plai-e2e-'));
delete process.env.DATABASE_URL;

const app = require('../src/app');
const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`e2e API on http://localhost:${port}`));
