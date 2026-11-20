const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

let api;
before(async () => { api = await startServer(); });
after(async () => { await api.close(); });

const user = { name: 'Scout User', email: 'scout@test.dev', password: 'Password1', role: 'scout' };

test('signup → login → me → patch → delete', async () => {
  const signup = await api.post('/api/auth/signup', user);
  assert.equal(signup.status, 201);
  assert.ok(signup.body.token);
  assert.equal(signup.body.user.role, 'scout');
  assert.equal(signup.body.user.passwordHash, undefined);

  assert.equal((await api.post('/api/auth/signup', user)).status, 409);

  const login = await api.post('/api/auth/login', { email: user.email, password: user.password });
  assert.equal(login.status, 200);
  const token = login.body.token;

  const me = await api.get('/api/auth/me', { token });
  assert.equal(me.body.user.email, user.email);

  const patch = await api.patch('/api/auth/me', { favoriteClub: 'Arsenal', onboardingComplete: true }, { token });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.user.favoriteClub, 'Arsenal');
  assert.equal(patch.body.user.onboardingComplete, true);

  assert.equal((await api.patch('/api/auth/me', { role: 'king' }, { token })).status, 400);
  assert.equal((await api.patch('/api/auth/me', { age: 5 }, { token })).status, 400);

  assert.equal((await api.del('/api/auth/me', { token })).status, 200);
  assert.equal((await api.get('/api/auth/me', { token })).status, 404);
});

test('login rejects wrong password and unknown user', async () => {
  await api.post('/api/auth/signup', { ...user, email: 'pw@test.dev' });
  assert.equal((await api.post('/api/auth/login', { email: 'pw@test.dev', password: 'Wrong1234' })).status, 401);
  assert.equal((await api.post('/api/auth/login', { email: 'ghost@test.dev', password: 'Password1' })).status, 401);
});

test('signup validates input', async () => {
  const weak = await api.post('/api/auth/signup', { ...user, email: 'weak@test.dev', password: 'short' });
  assert.equal(weak.status, 400);
  const badEmail = await api.post('/api/auth/signup', { ...user, email: 'not-an-email' });
  assert.equal(badEmail.status, 400);
});

test('protected routes require a valid token', async () => {
  assert.equal((await api.get('/api/auth/me')).status, 401);
  assert.equal((await api.get('/api/admin/stats', { token: 'garbage' })).status, 401);
});

test('admin endpoints report store + data health', async () => {
  const { body } = await api.post('/api/auth/signup', { ...user, email: 'admin@test.dev' });
  const token = body.token;

  const health = await api.get('/api/admin/health', { token });
  assert.equal(health.body.healthy, true);

  const stats = await api.get('/api/admin/stats', { token });
  assert.ok(stats.body.users >= 1);
  assert.equal(stats.body.predictions, 380);

  const activity = await api.get('/api/admin/activity', { token });
  assert.ok(activity.body.activity.some((a) => a.action === 'Signed up'));
});
