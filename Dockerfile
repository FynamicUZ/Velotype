# Production Dockerfile for Velotype
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Bind to 0.0.0.0 for Cloud Run
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# Start server
CMD [ "node", "server.js" ]
