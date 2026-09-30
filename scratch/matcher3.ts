import { PrismaClient } from '@prisma/client';
const fs = require('fs');

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

  const bankAmountsDateFull = JSON.parse(fs.readFileSync('scratch/bank_data.json', 'utf8'));
  const bankAmountsDate = bankAmountsDateFull.filter(b => b.date >= '2026-04-21');

  const usedDbIndices = new Set();
  const matchedBank = [];
  const unmatchedBank = [];

  // Match against DB first
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

  // Find pairs of IN/OUT for same amount in unmatchedBank
  const trulyMissingBank = [];
  const selfCancelingPairs = [];
  const usedUnmatchedIndices = new Set();

  for (let i = 0; i < unmatchedBank.length; i++) {
    if (usedUnmatchedIndices.has(i)) continue;
    let foundPair = false;
    for (let j = i + 1; j < unmatchedBank.length; j++) {
      if (usedUnmatchedIndices.has(j)) continue;
      if (Math.abs(unmatchedBank[i].amount - unmatchedBank[j].amount) < 0.01 && unmatchedBank[i].type !== unmatchedBank[j].type) {
        selfCancelingPairs.push({
          inRecord: unmatchedBank[i].type === 'IN' ? unmatchedBank[i] : unmatchedBank[j],
          outRecord: unmatchedBank[i].type === 'OUT' ? unmatchedBank[i] : unmatchedBank[j]
        });
        usedUnmatchedIndices.add(i);
        usedUnmatchedIndices.add(j);
        foundPair = true;
        break;
      }
    }
    if (!foundPair) {
      trulyMissingBank.push(unmatchedBank[i]);
    }
  }

  console.log("=== AUTO-CANCELADOS EN BANCO (REBOTES/SPEI DEVUELTOS) ===");
  selfCancelingPairs.forEach(p => console.log(`$${p.inRecord.amount} -> IN: ${p.inRecord.date} ${p.inRecord.desc} | OUT: ${p.outRecord.date} ${p.outRecord.desc}`));

  console.log("\n=== FALTANTES EN PLATAFORMA (21 ABR - 8 MAY) ===");
  trulyMissingBank.forEach(b => console.log(`${b.date} | $${b.amount} | ${b.type} | ${b.desc}`));

  console.log("\n=== MOVIMIENTOS EN PLATAFORMA NO ENCONTRADOS EN BANCO (21 ABR - 8 MAY) ===");
  unmatchedDb.forEach(d => console.log(`${d.date} | $${d.amount} | ${d.desc}`));

}

main().catch(console.error).finally(() => prisma.$disconnect());
