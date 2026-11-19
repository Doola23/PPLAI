const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./helpers');

let api;
before(async () => { api = await startServer(); });
after(async () => { await api.close(); });

test('GET /health', async () => {
  const res = await api.get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('unknown route returns 404 JSON', async () => {
  const res = await api.get('/api/nope');
  assert.equal(res.status, 404);
  assert.equal(res.body.error, 'Not found');
});

describe('scouting', () => {
  test('primary returns the full pool without similarity lists', async () => {
    const res = await api.get('/api/scouting/primary');
    assert.equal(res.status, 200);
    assert.ok(res.body.current.length > 1000);
    assert.ok(res.body.previous.length > 1000);
    assert.ok(Object.keys(res.body.ml.roles).length > 1000);
    assert.equal(res.body.ml.similarity, undefined);
    assert.equal(res.body.shotMaps, undefined);

    const saka = res.body.current.find((p) => p.Player === 'Bukayo Saka');
    assert.equal(saka.player_squad, 'Bukayo Saka_Arsenal');
    assert.ok(saka.shot_count > 0);
    assert.ok(saka.shot_avg_y > 0 && saka.shot_avg_y < 1);
    assert.ok(!Object.values(saka).includes(null));
  });

  test('current is paginated and filterable', async () => {
    const res = await api.get('/api/scouting/current?team=Arsenal&limit=5');
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 5);
    assert.ok(res.body.total >= 5);
    assert.ok(res.body.items.every((p) => p.Squad === 'Arsenal'));
  });

  test('current/:playerSquad finds one player or 404s', async () => {
    assert.equal((await api.get('/api/scouting/current/Bukayo%20Saka_Arsenal')).body.Player, 'Bukayo Saka');
    assert.equal((await api.get('/api/scouting/current/Nobody_Nowhere')).status, 404);
  });

  test('per-player shot map, match log and similarity', async () => {
    const [shots, logs, similar] = await Promise.all([
      api.get('/api/scouting/shot-maps/Bukayo%20Saka'),
      api.get('/api/scouting/match-logs/Bukayo%20Saka'),
      api.get('/api/scouting/similar/Bukayo%20Saka'),
    ]);
    assert.ok(shots.body.items[0].shots.sh.length > 0);
    assert.ok(logs.body.items[0].logs.m.length > 0);
    assert.ok(similar.body.items.length > 0);
    assert.ok(similar.body.items.every((s) => s.similarity > 0 && s.similarity <= 1));

    assert.deepEqual((await api.get('/api/scouting/shot-maps/nobody')).body.items, []);
  });

  test('bulk extras endpoint is gone', async () => {
    assert.equal((await api.get('/api/scouting/extras')).status, 404);
  });
});

describe('injuries', () => {
  test('summary has teams, gameweek calendar and flag count', async () => {
    const { body } = await api.get('/api/injuries/summary');
    assert.equal(body.teams.length, 20);
    assert.equal(body.referenceDates.length, 38);
    assert.ok(body.highRiskFlags > 0 && body.highRiskFlags < body.total);
  });

  test('team dates are sorted', async () => {
    const { body } = await api.get('/api/injuries/teams/Arsenal/dates');
    assert.ok(body.dates.length > 30);
    assert.deepEqual(body.dates, [...body.dates].sort());
    assert.equal((await api.get('/api/injuries/teams/Nowhere%20FC/dates')).status, 404);
  });

  test('top returns one row per player, highest risk first', async () => {
    const { body } = await api.get('/api/injuries/top?limit=10');
    const names = body.items.map((r) => r.player_name);
    assert.equal(new Set(names).size, names.length);
    const probs = body.items.map((r) => r.injury_probability);
    assert.deepEqual(probs, [...probs].sort((a, b) => b - a));
  });

  test('top filters by team substring', async () => {
    const { body } = await api.get('/api/injuries/top?limit=4&team=arsenal');
    assert.ok(body.items.length > 0);
    assert.ok(body.items.every((r) => r.team === 'Arsenal'));
  });

  test('predictions for one squad + date', async () => {
    const { body: dates } = await api.get('/api/injuries/teams/Arsenal/dates');
    const date = dates.dates.at(-1);
    const { body } = await api.get(`/api/injuries/predictions?team=Arsenal&date=${date}`);
    assert.ok(body.items.length >= 11 && body.items.length <= 30);
    assert.ok(body.items.every((r) => r.team === 'Arsenal' && r.match_date === date));
  });

  test('unfiltered predictions are paginated', async () => {
    const { body } = await api.get('/api/injuries/predictions');
    assert.equal(body.items.length, 100);
    assert.ok(body.total > 10000);
  });
});

describe('matches', () => {
  test('all fixture predictions', async () => {
    const { body } = await api.get('/api/matches/predictions');
    assert.equal(body.items.length, 380);
    for (const m of body.items.slice(0, 20)) {
      const sum = m.home_win_pct + m.draw_pct + m.away_win_pct;
      assert.ok(Math.abs(sum - 100) < 1, `probabilities sum to ${sum}`);
    }
  });

  test('single fixture lookup', async () => {
    const ok = await api.get('/api/matches/predictions?homeTeam=Arsenal&awayTeam=Chelsea');
    assert.equal(ok.body.home_team, 'Arsenal');
    const missing = await api.get('/api/matches/predictions?homeTeam=Arsenal&awayTeam=Arsenal');
    assert.equal(missing.status, 404);
  });

  test('standings outputs have 20 teams', async () => {
    for (const kind of ['actual', 'predicted', 'comparison']) {
      const { body } = await api.get(`/api/matches/output/standings/${kind}`);
      assert.equal(body.items.length, 20, kind);
    }
  });

  test('fans are blocked from match predictions', async () => {
    const signup = await api.post('/api/auth/signup', {
      name: 'Fan User', email: 'fan@test.dev', password: 'Password1', role: 'fan',
    });
    const res = await api.get('/api/matches/predictions', { token: signup.body.token });
    assert.equal(res.status, 403);
  });
});

test('team reports, player stats, player predictions', async () => {
  assert.equal((await api.get('/api/team-reports')).body.items.length, 20);
  assert.equal((await api.get('/api/player-stats?limit=3')).body.items.length, 3);
  const preds = (await api.get('/api/player-predictions')).body;
  assert.ok(preds.items.length > 300);
  assert.equal(new Set(preds.items.map((p) => p.Player)).size, preds.items.length);
});

test('large responses are gzip-compressed', async () => {
  const res = await api.get('/api/matches/predictions');
  assert.equal(res.headers.get('content-encoding'), 'gzip');
});
