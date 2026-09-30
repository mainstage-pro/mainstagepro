import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const fs = require('fs');

const banorteFisicaId = 'cmnrpg65l000rzmizc039imjd';

async function main() {
  const movs = await prisma.movimientoFinanciero.findMany({
    where: {
      fecha: {
        gte: new Date('2026-04-07T00:00:00Z'),
        lte: new Date('2026-05-08T23:59:59.999Z')
      },
      OR: [
        { cuentaOrigenId: banorteFisicaId },
        { cuentaDestinoId: banorteFisicaId }
      ]
    },
    orderBy: { fecha: 'asc' }
  });

  const dbMovs = movs.map(m => {
    let type = 'OUT';
    if (m.tipo === 'INGRESO' && m.cuentaDestinoId === banorteFisicaId) type = 'IN';
    else if (m.tipo === 'TRANSFERENCIA' && m.cuentaDestinoId === banorteFisicaId) type = 'IN';
    return {
      date: m.fecha.toISOString().split('T')[0],
      amount: m.monto,
      desc: m.concepto,
      type
    };
  });

  const bankText = fs.readFileSync('scratch/concile_up_to_may8.js', 'utf8');
  // It prints the JSON. We can just execute the script and grab output.
}

main().catch(console.error).finally(() => prisma.$disconnect());
