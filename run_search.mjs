import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const movs = await prisma.movimientoFinanciero.findMany({
    where: {
      OR: [
        { concepto: { contains: 'expo supraterra', mode: 'insensitive' } },
        { concepto: { contains: 'marco', mode: 'insensitive' } },
        { concepto: { contains: 'pantalla', mode: 'insensitive' } }
      ]
    },
    select: { id: true, concepto: true, monto: true, fecha: true }
  });
  console.log("=== Movimientos Financieros ===");
  console.log(JSON.stringify(movs, null, 2));

  const cxp = await prisma.cuentaPagar.findMany({
    where: {
      OR: [
        { concepto: { contains: 'expo supraterra', mode: 'insensitive' } },
        { concepto: { contains: 'marco', mode: 'insensitive' } },
        { concepto: { contains: 'pantalla', mode: 'insensitive' } }
      ]
    },
    select: { id: true, concepto: true, total: true, fecha: true, estado: true }
  });
  console.log("=== Cuentas por Pagar (CXP) ===");
  console.log(JSON.stringify(cxp, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
