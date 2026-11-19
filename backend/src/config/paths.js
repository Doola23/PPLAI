const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const ML_DIR = process.env.ML_DIR || path.join(ROOT, 'ml');

module.exports = {
  ML_DIR,
  MATCH_DATA_DIR: path.join(ML_DIR, 'match_prediction', 'data'),
  MATCH_OUTPUTS_DIR: path.join(ML_DIR, 'match_prediction', 'outputs'),
  MATCH_FIXTURES_FILE: path.join(ML_DIR, 'match_prediction', 'premierleaguedata', 'predictions_all_fixtures.csv'),
  INJURY_PREDICTIONS_FILE: path.join(ML_DIR, 'injury_prediction', 'outputs', 'injury_predictions.csv'),
  PLAYER_PREDICTIONS_DIR: path.join(ML_DIR, 'player_stats', 'outputs'),
  SCOUTING_BUNDLE_FILE: path.join(ML_DIR, 'scouting', 'data', 'scouting_bundle.json'),
  STORE_DIR: process.env.STORE_DIR || path.resolve(__dirname, '../../data'),
};
