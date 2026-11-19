const fs = require('fs');
const os = require('os');
const path = require('path');

// Must run before the app (and userStore) is required.
process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.STORE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'plai-test-'));

const app = require('../src/app');

async function startServer() {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function request(method, url, { body, token } = {}) {
    const res = await fetch(base + url, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, headers: res.headers, body: json };
  }

  return {
    get: (url, opts) => request('GET', url, opts),
    post: (url, body, opts) => request('POST', url, { ...opts, body }),
    patch: (url, body, opts) => request('PATCH', url, { ...opts, body }),
    del: (url, opts) => request('DELETE', url, opts),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

module.exports = { startServer };
