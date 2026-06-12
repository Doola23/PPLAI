require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const setupTables = require('./setupTables');
const playersRouter    = require('./routes/players');
const scoutingRouter   = require('./routes/scouting');
const matchesRouter    = require('./routes/matches');
const injuriesRouter   = require('./routes/injuries');
const eloRouter        = require('./routes/elo');
const goalkeepersRouter = require('./routes/goalkeepers');
const teamReportsRouter  = require('./routes/teamReports');
const playerStatsRouter  = require('./routes/playerStats');
const authRouter        = require('./routes/auth');
const fixturesRouter    = require('./routes/fixtures');
const { router: adminRouter } = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' },
});

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/players',      playersRouter);
app.use('/api/scouting',     scoutingRouter);
app.use('/api/matches',      matchesRouter);
app.use('/api/injuries',     injuriesRouter);
app.use('/api/elo',          eloRouter);
app.use('/api/goalkeepers',  goalkeepersRouter);
app.use('/api/team-reports',  teamReportsRouter);
app.use('/api/player-stats', playerStatsRouter);
app.use('/api/fixtures',    fixturesRouter);
app.use('/api/admin',       adminRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await setupTables();
  } catch (err) {
    console.warn('Table setup warning:', err.message);
  }
  app.listen(PORT, () => {
    console.log(`PLAI backend running on http://localhost:${PORT}`);
    console.log(`AWS Region: ${process.env.AWS_REGION}`);
  });
}

start();
