# Backend API container — portable across Koyeb / Fly / Railway / Render / any Docker host.
FROM node:20-alpine

WORKDIR /app

# Install deps first for better layer caching.
COPY package*.json ./
RUN npm install --omit=dev

# App source.
COPY . .

# The app listens on process.env.PORT (the platform injects it); 3001 is the local default.
EXPOSE 3001

CMD ["node", "src/index.js"]
