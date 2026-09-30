import { PrismaClient } from '@prisma/client';
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

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
    },
    orderBy: { fecha: 'asc' }
  });

  const doc = new jsPDF('landscape');
  doc.setFontSize(16);
  doc.text('Movimientos Banorte Persona Fisica (Abril - Junio 2026)', 14, 15);

  const tableData = movs.map(m => {
    let type = 'SALIDA';
    if (m.tipo === 'INGRESO' && m.cuentaDestinoId === banorteFisicaId) type = 'ENTRADA';
    else if (m.tipo === 'TRANSFERENCIA' && m.cuentaDestinoId === banorteFisicaId) type = 'ENTRADA';
    
    return [
      m.fecha.toISOString().split('T')[0],
      type,
      m.concepto,
      '$' + m.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 }),
      m.referencia || '-'
    ];
  });

  doc.autoTable({
    startY: 25,
    head: [['Fecha', 'Tipo', 'Concepto', 'Monto', 'Referencia']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185] }
  });

  const path = '/Users/mac/.gemini/antigravity/brain/fa006854-76d5-49d9-8d63-bf062fb70c78/Movimientos_Banorte_Abril_Junio.pdf';
  doc.save(path);
  console.log('PDF guardado en', path);
}

main().catch(console.error).finally(() => prisma.$disconnect());
