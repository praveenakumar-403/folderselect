# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy application code
COPY . .

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chmod 755 uploads

# Create folders.json file if it doesn't exist
RUN touch folders.json && chmod 644 folders.json

# Expose the port the app runs on
EXPOSE 3000

# Define environment variables with defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOAD_FOLDER=uploads
ENV FOLDER_JSON=folders.json

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Command to run the application
CMD ["npm", "start"]