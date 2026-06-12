const { Router } = require('express');
const requireAuth = require('../middleware/auth');

const router = Router();

// Normalize football-data.org team names → PLAI prediction table names
const FD_TO_PLAI = {
  'Manchester United FC':         'Manchester United',
  'Fulham FC':                    'Fulham',
  'Ipswich Town FC':              'Ipswich',
  'Liverpool FC':                 'Liverpool',
  'Arsenal FC':                   'Arsenal',
  'Wolverhampton Wanderers FC':   'Wolves',
  'Everton FC':                   'Everton',
  'Brighton & Hove Albion FC':    'Brighton',
  'Newcastle United FC':          'Newcastle',
  'Southampton FC':               'Southampton',
  'Nottingham Forest FC':         "Nott'm Forest",
  'AFC Bournemouth':              'Bournemouth',
  'West Ham United FC':           'West Ham',
  'Aston Villa FC':               'Aston Villa',
  'Brentford FC':                 'Brentford',
  'Crystal Palace FC':            'Crystal Palace',
  'Chelsea FC':                   'Chelsea',
  'Manchester City FC':           'Manchester City',
  'Leicester City FC':            'Leicester',
  'Tottenham Hotspur FC':         'Tottenham',
};

function normalizeName(fdName) {
  return FD_TO_PLAI[fdName] ?? fdName.replace(/ FC$/, '');
}

// In-memory cache — expires after 6 hours
let cache = null;
let cacheAt = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000;

async function fetchFixtures() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error('FOOTBALL_DATA_API_KEY not set');

  const season = process.env.FOOTBALL_SEASON ?? '2024';
  const url = `https://api.football-data.org/v4/competitions/PL/matches?season=${season}`;

  const res = await fetch(url, {
    headers: { 'X-Auth-Token': apiKey },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data.org ${res.status}: ${body}`);
  }

  const data = await res.json();

  // Build GW_MAP: "HomeTeam_AwayTeam" -> matchday
  const gwMap = {};
  let currentGW = 1;
  let maxGW = 1;

  const today = new Date();

  for (const m of data.matches) {
    const home = normalizeName(m.homeTeam.name);
    const away = normalizeName(m.awayTeam.name);
    const matchday = m.matchday;
    gwMap[`${home}_${away}`] = matchday;
    if (matchday > maxGW) maxGW = matchday;

    // Current GW = last matchday with a match on or before today
    const matchDate = new Date(m.utcDate);
    if (matchDate <= today && matchday >= currentGW) currentGW = matchday;
  }

  const fixtures = data.matches.map(m => ({
    matchday: m.matchday,
    home:     normalizeName(m.homeTeam.name),
    away:     normalizeName(m.awayTeam.name),
    date:     m.utcDate,
    status:   m.status,
  }));

  return { gwMap, fixtures, currentGW, maxGW };
}

// GET /api/fixtures/pl
router.get('/pl', async (_req, res) => {
  try {
    const now = Date.now();
    if (!cache || now - cacheAt > CACHE_TTL) {
      cache = await fetchFixtures();
      cacheAt = now;
    }
    res.json({ ...cache, cachedAt: new Date(cacheAt).toISOString() });
  } catch (err) {
    console.error('Fixtures error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fixtures/refresh — bust cache (admin only)
router.post('/refresh', requireAuth, (_req, res) => {
  cache = null;
  cacheAt = 0;
  res.json({ ok: true });
});

module.exports = router;
