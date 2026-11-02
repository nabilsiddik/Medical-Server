#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "==========================================="
echo "   🚀 Medical Backend - Render Build Script "
echo "==========================================="

# If invoked with 'start' argument, start the server
if [ "$1" = "start" ]; then
  echo "==> Starting production server..."
  exec npm run start
fi

# Step 1: Install Dependencies
echo "==> [1/4] Installing dependencies..."
npm install

# Step 2: Generate Prisma Client
echo "==> [2/4] Generating Prisma Client..."
npx prisma generate

# Step 3: Run Database Migrations
echo "==> [3/4] Applying database migrations..."
if npx prisma migrate deploy; then
  echo "==> Migrations applied cleanly."
else
  echo "==> Note: migrate deploy exited with error, running prisma db push fallback..."
  npx prisma db push --accept-data-loss
fi

# Step 4: Build TypeScript
echo "==> [4/4] Building TypeScript project..."
npm run build

# Step 5: Optional Database Seeding
if [ "$SEED_DATABASE" = "true" ] || [ "$AUTO_SEED" = "true" ]; then
  echo "==> [Optional] Seeding database..."
  npm run prisma:seed || echo "==> Seeding skipped or completed with warnings."
fi

echo "==========================================="
echo "   ✅ Render Build Completed Successfully   "
echo "==========================================="

