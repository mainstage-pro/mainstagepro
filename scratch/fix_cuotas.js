const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const cuotas = await prisma.cuotaReparto.findMany({
    where: { reparto: { nombre: { contains: 'Susana' } }, estado: 'PENDIENTE' },
    include: { cuentaPagar: true }
  });
  
  let updated = 0;
  for (const c of cuotas) {
    if (c.cuentaPagar && c.cuentaPagar.estado === 'LIQUIDADO') {
      console.log(`Matching cuota ${c.periodo} already has cxp which is LIQUIDADO`);
      await prisma.cuotaReparto.update({
        where: { id: c.id },
        data: { estado: 'PAGADO' }
      });
      updated++;
    }
  }
  console.log(`Updated ${updated} cuotas to PAGADO`);
  
  const pending = await prisma.cuentaPagar.findMany({
    where: { concepto: { contains: 'Susana' }, estado: 'PENDIENTE' }
  });
  for (const p of pending) {
    if (p.concepto.includes("Viáticos")) continue;
    console.log(`Deleting pending CxP: ${p.concepto}`);
    await prisma.cuentaPagar.delete({ where: { id: p.id } });
  }
}
run();
