import { neon } from '@neondatabase/serverless'

const rawUrl = process.env.DATABASE_URL!
  .replace('-pooler.', '.')
  .replace('pgbouncer=true&', '')
  .replace('&pgbouncer=true', '')

const sql = neon(rawUrl)

// Add categoriaKARE column to clientes table if it doesn't exist
await sql`
  ALTER TABLE clientes 
  ADD COLUMN IF NOT EXISTS "categoriaKARE" TEXT DEFAULT 'SIN_CATEGORIZAR'
`

console.log('✅ categoriaKARE column added to clientes')

// Verify
const cols = await sql`
  SELECT column_name, data_type, column_default 
  FROM information_schema.columns 
  WHERE table_name = 'clientes' AND column_name = 'categoriaKARE'
`
console.log('Column info:', cols)
