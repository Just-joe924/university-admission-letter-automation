# Backend (Express + Puppeteer) container for Render / any Docker host.
FROM node:20-bookworm-slim

# System libraries required by the Chromium that Puppeteer downloads.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Keep Puppeteer's Chromium inside the image so it's present at runtime.
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer
ENV NODE_ENV=production

# Install dependencies first (better layer caching).
COPY package*.json ./
RUN npm install --omit=dev

# Ensure the matching Chromium is downloaded into PUPPETEER_CACHE_DIR.
RUN npx puppeteer browsers install chrome

# Copy the rest of the backend source.
COPY . .

# Render provides $PORT at runtime; the app reads process.env.PORT.
EXPOSE 5000
CMD ["npm", "start"]
