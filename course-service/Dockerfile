# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy app files
COPY . .

# Expose the port
EXPOSE 5001

# Start the application
CMD ["node", "server.js"]
