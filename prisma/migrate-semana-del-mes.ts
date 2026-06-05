import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  console.log('Changing semanaDeMes from Int? to Int[]...')
  await prisma.$executeRaw`ALTER TABLE pt_tarea_templates DROP COLUMN IF EXISTS "semanaDeMes"`
  await prisma.$executeRaw`ALTER TABLE pt_tarea_templates ADD COLUMN "semanaDeMes" integer[] NOT NULL DEFAULT '{}'`
  console.log('Done')
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
