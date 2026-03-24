FROM node:18-slim

WORKDIR /app

# Install system dependencies for Prisma/PostgreSQL if needed
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files from backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy prisma schema and generate client
COPY backend/prisma ./backend/prisma
RUN cd backend && npx prisma generate

# Copy the rest of the backend
COPY backend ./backend

# Copy frontend and icons
COPY frontend ./frontend
COPY icons ./icons

# Change directory to backend for runtime context if needed, 
# but server.js is written to expect paths relative to its location.
# Based on server.js refactor: path.join(__dirname, "../frontend")

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

# Start the server
CMD ["node", "backend/server.js"]
