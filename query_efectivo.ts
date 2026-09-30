import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const movs = await prisma.movimientoFinanciero.findMany({
    where: { fecha: { gte: new Date(new Date().setHours(0,0,0,0)) } },
    include: { cuentaOrigen: true, cuentaDestino: true }
  });
  console.log("Movimientos hoy:", movs.length);
  movs.slice(0, 5).forEach(m => console.log(m.id, m.concepto, m.cuentaOrigen?.nombre, m.metodoPago));
}
main().catch(console.error).finally(() => prisma.$disconnect());
