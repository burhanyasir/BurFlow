FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production

EXPOSE 3456

# Create a startup script that ensures the container binds to the right port
RUN cat > /app/start.sh << 'EOF'
#!/bin/sh
# Use the PORT environment variable (defaults to 3456 if not set)
PORT=${PORT:-3456}
# Start the server
node server.js
EOF
RUN chmod +x /app/start.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:$PORT/api/health || exit 1

USER node

CMD ["/app/start.sh"]
