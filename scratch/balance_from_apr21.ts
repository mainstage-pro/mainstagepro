import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const banorteFisicaId = 'cmnrpg65l000rzmizc039imjd';

async function main() {
  const movs = await prisma.movimientoFinanciero.findMany({
    where: {
      fecha: {
        gte: new Date('2026-04-21T00:00:00Z')
      },
      OR: [
        { cuentaOrigenId: banorteFisicaId },
        { cuentaDestinoId: banorteFisicaId }
      ]
    },
    orderBy: { fecha: 'asc' }
  });

  let balance = 60.54; // Saldo inicial indicado por el usuario
  
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

  console.log(`Balance desde 21-Abril (iniciando con $60.54): $${balance.toFixed(2)}`);
  
  // What if we don't include the 60.54?
  console.log(`Balance neto de movimientos desde 21-Abril: $${(balance - 60.54).toFixed(2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
