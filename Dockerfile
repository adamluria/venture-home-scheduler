# ─── Build stage ──────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
# Install ALL deps (including dev) so Vite is available for build
RUN npm install --include=dev
COPY . .
RUN npm run build

# ─── Runtime stage ────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

# Only production deps for runtime
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built frontend + server code
COPY --from=build /app/dist ./dist
COPY server.js ./
COPY sfdcAuth.js ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
