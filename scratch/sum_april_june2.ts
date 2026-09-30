import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const banorteFisicaId = 'cmnrpg65l000rzmizc039imjd';

async function main() {
  const movs = await prisma.movimientoFinanciero.findMany({
    where: {
      fecha: {
        gte: new Date('2026-04-01T00:00:00Z'),
        lte: new Date('2026-06-30T23:59:59.999Z')
      },
      OR: [
        { cuentaOrigenId: banorteFisicaId },
        { cuentaDestinoId: banorteFisicaId }
      ]
    }
  });

  let balance = 0;
  let inn = 0;
  let out = 0;
  for (const m of movs) {
    if (m.tipo === 'INGRESO') {
      if (m.cuentaDestinoId === banorteFisicaId) { balance += m.monto; inn+=m.monto; }
    } else if (m.tipo === 'GASTO' || m.tipo === 'RETIRO' || m.tipo === 'INVERSION' || m.tipo === 'EGRESO') {
      if (m.cuentaOrigenId === banorteFisicaId) { balance -= m.monto; out+=m.monto; }
    } else if (m.tipo === 'TRANSFERENCIA') {
      if (m.cuentaDestinoId === banorteFisicaId) { balance += m.monto; inn+=m.monto; }
      if (m.cuentaOrigenId === banorteFisicaId) { balance -= m.monto; out+=m.monto; }
    }
  }

  console.log(`IN: $${inn.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
  console.log(`OUT: $${out.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
  console.log(`NET: $${balance.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
