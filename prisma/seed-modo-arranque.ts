import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Upsert the flag using Prisma (schema already has all needed columns)
  const existing = await prisma.appConfig.findFirst({ where: { key: 'plan-trabajo.modo-arranque' } })
  if (existing) {
    await prisma.appConfig.update({
      where: { key: 'plan-trabajo.modo-arranque' },
      data: {
        value: 'true',
        section: 'plan-trabajo',
        label: 'Modo Arranque',
        description: 'Oculta compromisos atrasados en Mi día y pendientes en el Reporte Semanal. Desactiva cuando el equipo esté listo para operar al 100%.',
        type: 'boolean',
        defaultValue: 'false',
        orden: 1,
      },
    })
    console.log('Updated existing plan-trabajo.modo-arranque → true')
  } else {
    await prisma.appConfig.create({
      data: {
        key: 'plan-trabajo.modo-arranque',
        value: 'true',
        section: 'plan-trabajo',
        label: 'Modo Arranque',
        description: 'Oculta compromisos atrasados en Mi día y pendientes en el Reporte Semanal. Desactiva cuando el equipo esté listo para operar al 100%.',
        type: 'boolean',
        defaultValue: 'false',
        orden: 1,
      },
    })
    console.log('Created plan-trabajo.modo-arranque = true')
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
