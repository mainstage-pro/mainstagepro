import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const banorteFisicaId = 'cmnrpg65l000rzmizc039imjd';

async function main() {
  const movs = await prisma.movimientoFinanciero.findMany({
    where: {
      fecha: {
        gte: new Date('2026-04-21T00:00:00Z'),
        lte: new Date('2026-05-08T23:59:59.999Z')
      },
      OR: [
        { cuentaOrigenId: banorteFisicaId },
        { cuentaDestinoId: banorteFisicaId }
      ]
    },
    orderBy: { fecha: 'asc' }
  });

  let balance = 60.54; 
  for (const m of movs) {
    if (m.tipo === 'INGRESO') {
      if (m.cuentaDestinoId === banorteFisicaId) balance += m.monto;
    } else if (m.tipo === 'GASTO' || m.tipo === 'RETIRO' || m.tipo === 'INVERSION' || m.tipo === 'EGRESO') {
      if (m.cuentaOrigenId === banorteFisicaId) balance -= m.monto;
    } else if (m.tipo === 'TRANSFERENCIA') {
      if (m.cuentaDestinoId === banorteFisicaId) balance += m.monto;
      if (m.cuentaOrigenId === banorteFisicaId) balance -= m.monto;
    }
  }

  console.log(`Balance del 21-Abr al 8-May: $${balance.toFixed(2)}`);
  
  // Also calculate exactly for all time to see if there's a 5000 somewhere
  
}

main().catch(console.error).finally(() => prisma.$disconnect());
