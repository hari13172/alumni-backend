# Use a stable base image with glibc support
FROM node:20-slim AS builder

# Create a non-root user
RUN addgroup --system alumni && adduser --system --ingroup alumni alumni

# Set working directory
WORKDIR /home/alumni/backend

# Copy project files
COPY . .

# Optional: update npm globally (not strictly needed in prod)
RUN npm install -g npm@latest

# Change ownership for safe non-root access
RUN chown -R alumni:alumni /home/alumni/backend

# Switch to non-root user
USER alumni

# Install dependencies
RUN npm install

# Expose the app port
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
