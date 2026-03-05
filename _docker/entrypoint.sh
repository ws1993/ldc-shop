#!/bin/sh

echo "Starting LDC Shop (Docker)..."

# Auto-set AUTH_URL from APP_URL so NextAuth uses the correct external origin
# (Docker sets HOSTNAME=0.0.0.0 which would make NextAuth generate wrong callback URLs)
if [ -z "$AUTH_URL" ] && [ -n "$APP_URL" ]; then
    export AUTH_URL="$APP_URL"
    echo "AUTH_URL auto-set to $APP_URL"
fi

# Ensure data directory exists and is writable
mkdir -p /app/data 2>/dev/null || true
if [ ! -w /app/data ]; then
    echo "WARNING: /app/data is not writable, SQLite may fail."
    echo "Fix: ensure the host volume directory is writable (chmod 777 ./data)"
fi

# Run database migrations
echo "Running database migrations..."
npx drizzle-kit push 2>&1 || echo "WARNING: drizzle-kit push failed, tables will be created at runtime"

# Start the cron job in background
echo "Starting cron scheduler..."
node cron.mjs &

# Start the Next.js server
echo "Starting Next.js server..."
node server.js
