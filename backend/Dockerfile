# Backend API container. Build from the repo root so model outputs are included:
#   docker build -f backend/Dockerfile -t plai-api .
FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/src ./src
COPY ml/match_prediction/data/2024_PL.csv ml/match_prediction/data/GK_2024_PL.csv /app/ml/match_prediction/data/
COPY ml/match_prediction/outputs /app/ml/match_prediction/outputs
COPY ml/match_prediction/premierleaguedata/predictions_all_fixtures.csv /app/ml/match_prediction/premierleaguedata/
COPY ml/injury_prediction/outputs /app/ml/injury_prediction/outputs
COPY ml/player_stats/outputs /app/ml/player_stats/outputs
COPY ml/scouting/data/scouting_bundle.json /app/ml/scouting/data/

EXPOSE 3001

CMD ["node", "src/index.js"]
