# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend and run
FROM node:22-alpine
WORKDIR /app

# Setup backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

# Copy backend source
COPY backend/ ./

# Copy built frontend from Stage 1 to the location expected by backend
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3500

# Create uploads directory and set permissions for node user
RUN mkdir -p /app/uploads && chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 3500

CMD ["npm", "start"]
