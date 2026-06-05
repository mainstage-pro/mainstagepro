import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Step 1: Adding temp int columns...')
  await prisma.$executeRaw`ALTER TABLE tecnicos ADD COLUMN IF NOT EXISTS prioridad_int integer DEFAULT 0`
  await prisma.$executeRaw`ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS prioridad_int integer DEFAULT 0`

  console.log('Step 2: Mapping nivelPrioridad to int...')
  await prisma.$executeRaw`
    UPDATE tecnicos SET prioridad_int = CASE "nivelPrioridad"
      WHEN 'ALTA' THEN 3
      WHEN 'MEDIA' THEN 2
      WHEN 'BAJA' THEN 1
      ELSE 0
    END
  `
  await prisma.$executeRaw`
    UPDATE proveedores SET prioridad_int = CASE "nivelPrioridad"
      WHEN 'ALTA' THEN 3
      WHEN 'MEDIA' THEN 2
      WHEN 'BAJA' THEN 1
      ELSE 0
    END
  `

  console.log('Step 3: Dropping old columns...')
  await prisma.$executeRaw`ALTER TABLE tecnicos DROP COLUMN IF EXISTS prioridad`
  await prisma.$executeRaw`ALTER TABLE tecnicos DROP COLUMN IF EXISTS "nivelPrioridad"`
  await prisma.$executeRaw`ALTER TABLE proveedores DROP COLUMN IF EXISTS prioridad`
  await prisma.$executeRaw`ALTER TABLE proveedores DROP COLUMN IF EXISTS "nivelPrioridad"`

  console.log('Step 4: Renaming int columns to prioridad...')
  await prisma.$executeRaw`ALTER TABLE tecnicos RENAME COLUMN prioridad_int TO prioridad`
  await prisma.$executeRaw`ALTER TABLE proveedores RENAME COLUMN prioridad_int TO prioridad`

  console.log('Migration complete!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
