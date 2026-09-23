import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const cuotas = await prisma.cuotaReparto.findMany({
    where: { reparto: { nombre: { contains: 'Susana' } }, estado: 'PENDIENTE' }
  });
  
  const cxps = await prisma.cuentaPagar.findMany({
    where: { concepto: { contains: 'Susana' }, estado: 'LIQUIDADO' },
    include: { abonos: true }
  });
  
  let updated = 0;
  for (const c of cuotas) {
    // Find matching cxp
    const cxp = cxps.find(x => x.concepto.includes(c.periodo) || (x.createdAt.toISOString().slice(0, 10) === c.createdAt.toISOString().slice(0, 10)));
    if (cxp) {
      console.log(`Matching cuota ${c.periodo} to cxp ${cxp.concepto}`);
      await prisma.cuotaReparto.update({
        where: { id: c.id },
        data: { estado: 'PAGADO', cuentaPagarId: cxp.id }
      });
      updated++;
    }
  }
  console.log(`Updated ${updated} cuotas to PAGADO`);
  
  // also delete the pending ones from the other module that are repartos
  const pending = await prisma.cuentaPagar.findMany({
    where: { concepto: { contains: 'Reparto Susana' }, estado: 'PENDIENTE' }
  });
  for (const p of pending) {
    console.log(`Deleting pending CxP: ${p.concepto}`);
    await prisma.cuentaPagar.delete({ where: { id: p.id } });
  }
}
run();
