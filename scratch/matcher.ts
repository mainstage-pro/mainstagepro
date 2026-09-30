import { PrismaClient } from '@prisma/client';
const fs = require('fs');

const prisma = new PrismaClient();
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

  const bankAmountsDate = JSON.parse(fs.readFileSync('scratch/bank_data.json', 'utf8'));

  const usedDbIndices = new Set();
  const matchedBank = [];
  const unmatchedBank = [];

  for (const ba of bankAmountsDate) {
    let matched = false;
    for (let i = 0; i < dbMovs.length; i++) {
      if (!usedDbIndices.has(i) && Math.abs(dbMovs[i].amount - ba.amount) < 0.01 && dbMovs[i].type === ba.type) {
        matched = true;
        usedDbIndices.add(i);
        matchedBank.push({ ...ba, dbDesc: dbMovs[i].desc, dbDate: dbMovs[i].date });
        break;
      }
    }
    if (!matched) {
      unmatchedBank.push(ba);
    }
  }

  const unmatchedDb = [];
  for (let i = 0; i < dbMovs.length; i++) {
    if (!usedDbIndices.has(i)) {
      unmatchedDb.push(dbMovs[i]);
    }
  }

  console.log("=== MOVIMIENTOS EN BANCO NO REGISTRADOS EN PLATAFORMA (HASTA MAYO 8) ===");
  unmatchedBank.forEach(b => console.log(`${b.date} | $${b.amount} | ${b.desc}`));

  console.log("\n=== MOVIMIENTOS EN PLATAFORMA NO ENCONTRADOS EN BANCO (HASTA MAYO 8) ===");
  unmatchedDb.forEach(d => console.log(`${d.date} | $${d.amount} | ${d.desc}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
