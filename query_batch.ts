import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const movs = await prisma.movimientoFinanciero.findMany({
    where: { createdAt: { gte: new Date("2026-09-30T22:30:00.000Z") } },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`Found ${movs.length} movements.`);
  let total = 0;
  for (const m of movs) {
    console.log(`ID: ${m.id} | Monto: ${m.monto} | Cuenta: ${m.cuentaOrigenId} | Metodo: ${m.metodoPago} | Notas: ${m.notas}`);
    total += m.monto;
  }
  console.log("Total monto:", total);
}
main().catch(console.error).finally(() => prisma.$disconnect());
