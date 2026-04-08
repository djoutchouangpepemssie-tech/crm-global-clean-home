# Multi-stage build for Railway
FROM node:22-alpine as builder

WORKDIR /app

# Copy frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --legacy-peer-deps && npm run build

# Final stage
FROM node:22-alpine

WORKDIR /app

# Copy built frontend
COPY --from=builder /app/frontend/build ./frontend/build

# Install serve to serve static files
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Serve the frontend
CMD ["serve", "-s", "frontend/build", "-l", "3000"]
