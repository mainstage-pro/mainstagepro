import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const banorteFisicaId = 'cmnrpg65l000rzmizc039imjd';

async function main() {
  const movs = await prisma.movimientoFinanciero.findMany({
    where: {
      OR: [
        { cuentaOrigenId: banorteFisicaId },
        { cuentaDestinoId: banorteFisicaId }
      ]
    },
    orderBy: { fecha: 'asc' }
  });

  let totalIn = 0;
  let totalOut = 0;
  const byMonth = {};

  for (const m of movs) {
    const isOut = (m.tipo === 'GASTO' || m.tipo === 'RETIRO' || m.tipo === 'INVERSION' || m.tipo === 'EGRESO') && m.cuentaOrigenId === banorteFisicaId;
    const isTransferOut = m.tipo === 'TRANSFERENCIA' && m.cuentaOrigenId === banorteFisicaId;
    const isTransferIn = m.tipo === 'TRANSFERENCIA' && m.cuentaDestinoId === banorteFisicaId;
    const isIn = (m.tipo === 'INGRESO' && m.cuentaDestinoId === banorteFisicaId) || isTransferIn;

    const realOut = isOut || isTransferOut;
    
    if (isIn) totalIn += m.monto;
    if (realOut) totalOut += m.monto;

    const month = m.fecha.toISOString().substring(0, 7);
    if (!byMonth[month]) byMonth[month] = { in: 0, out: 0, net: 0, highestExp: [] };
    
    if (isIn) {
      byMonth[month].in += m.monto;
      byMonth[month].net += m.monto;
    }
    if (realOut) {
      byMonth[month].out += m.monto;
      byMonth[month].net -= m.monto;
      byMonth[month].highestExp.push({ date: m.fecha.toISOString().substring(0,10), desc: m.concepto, amt: m.monto });
    }
  }

  console.log(`TOTAL IN: $${totalIn.toLocaleString('en-US', {minimumFractionDigits:2})}`);
  console.log(`TOTAL OUT: $${totalOut.toLocaleString('en-US', {minimumFractionDigits:2})}`);
  console.log(`NET: $${(totalIn - totalOut).toLocaleString('en-US', {minimumFractionDigits:2})}\n`);

  for (const [m, d] of Object.entries(byMonth)) {
    console.log(`- ${m}: IN $${d.in.toLocaleString()} | OUT $${d.out.toLocaleString()} | NET: $${d.net.toLocaleString()}`);
    // top 2 biggest out
    const top = d.highestExp.sort((a,b) => b.amt - a.amt).slice(0,2);
    if (top.length > 0) {
      console.log(`    Mayores gastos: ${top.map(t => `$${t.amt} (${t.desc})`).join(', ')}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
