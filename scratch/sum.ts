import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const banorteFisicaId = 'cmnrpg65l000rzmizc039imjd';

async function main() {
  const movs = await prisma.movimientoFinanciero.findMany({
    where: {
      fecha: {
        lte: new Date('2026-05-07T23:59:59.999Z')
      },
      OR: [
        { cuentaOrigenId: banorteFisicaId },
        { cuentaDestinoId: banorteFisicaId }
      ]
    },
    orderBy: { fecha: 'asc' }
  });

  let balance = 0;
  let ingresos = 0;
  let egresos = 0;
  for (const m of movs) {
    if (m.tipo === 'INGRESO') {
      if (m.cuentaDestinoId === banorteFisicaId) { balance += m.monto; ingresos += m.monto; }
    } else if (m.tipo === 'GASTO' || m.tipo === 'RETIRO' || m.tipo === 'INVERSION' || m.tipo === 'EGRESO') {
      if (m.cuentaOrigenId === banorteFisicaId) { balance -= m.monto; egresos += m.monto; }
    } else if (m.tipo === 'TRANSFERENCIA') {
      if (m.cuentaDestinoId === banorteFisicaId) { balance += m.monto; ingresos += m.monto; }
      if (m.cuentaOrigenId === banorteFisicaId) { balance -= m.monto; egresos += m.monto; }
    }
  }

  console.log(`Balance hasta el 7 de Mayo: $${balance.toFixed(2)}`);
  console.log(`Ingresos acumulados: $${ingresos.toFixed(2)}`);
  console.log(`Egresos acumulados: $${egresos.toFixed(2)}`);
  console.log(`Total Movimientos: ${movs.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
