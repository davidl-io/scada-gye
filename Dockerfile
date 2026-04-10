# Base image for building the app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package metadata
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for Vite)
RUN npm install

# Copy source code
COPY . .

# Build the React app via Vite
RUN npm run build

# Base image for the final production runner
FROM node:20-alpine AS runner

WORKDIR /app

# Only copy what's necessary to run the proxy and serve files
COPY package.json package-lock.json* ./
# Install only production dependencies
RUN npm install --production

# Copy the built React app from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the server proxy script
COPY server.cjs ./

EXPOSE 3001

CMD ["node", "server.cjs"]
