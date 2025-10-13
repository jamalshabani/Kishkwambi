# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install bash for better shell support
RUN apk add --no-cache bash

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create InspectionPhotos directory with proper permissions
# This will hold all inspection photos in structure: InspectionPhotos/[tripSegment]/ArrivedContainer/
RUN mkdir -p /app/InspectionPhotos && \
    chmod 777 /app/InspectionPhotos

# Expose the port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Create a non-root user but with write access to InspectionPhotos
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "server.js"]

