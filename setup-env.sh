#!/bin/bash
# Script de setup de variables de entorno para Mainstage Pro
# Ejecutar desde la raíz del proyecto: bash setup-env.sh

cat > .env << 'ENVEOF'
DATABASE_URL="postgresql://neondb_owner:npg_0qjmIyDp6kHc@ep-noisy-firefly-an5vzlqv-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=30&pool_timeout=30&connection_limit=1"
DIRECT_URL="postgresql://neondb_owner:npg_0qjmIyDp6kHc@ep-noisy-firefly-an5vzlqv.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
NEXTAUTH_SECRET="mainstage-pro-secret-2026-xK9mP2qL"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_SECRET="msp-admin-2026-Kq7vNx3Rz9Lw"
SEED_SECRET="msp-seed-2026-Jm4Tp8Ys2Hc"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_h3qMXgZ93fcFNngh_ioJunblc6q8eKI0HabA104BajeuMO8"
ANTHROPIC_API_KEY=""
META_WEBHOOK_VERIFY_TOKEN=""
META_PAGE_ACCESS_TOKEN=""
CRON_SECRET="d817e2fb5926e9080bf5b5147b2ed633875ae9b6faf706f0f59c0cfb65547d32"
ENVEOF

echo "✅ .env creado correctamente"
echo ""
echo "Contenido:"
cat .env
