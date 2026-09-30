import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const movs = await prisma.movimientoFinanciero.findMany({
    where: {
      fecha: {
        gte: new Date('2026-04-01T00:00:00Z'),
        lte: new Date('2026-06-30T23:59:59Z')
      }
    },
    include: {
      proyecto: { select: { nombre: true } }
    },
    orderBy: { fecha: 'asc' }
  });

  console.log(`Encontrados ${movs.length} movimientos en la base de datos.`);
  for (const m of movs) {
    console.log(`${m.fecha.toISOString().split('T')[0]} | ${m.tipo} | ${m.monto} | ${m.concepto} | ${m.metodoPago}`);
  }
}
main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
