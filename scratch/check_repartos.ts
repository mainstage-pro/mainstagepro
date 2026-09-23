import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const r = await prisma.repartoUtilidad.findFirst({
    where: { nombre: { contains: 'Susana' } },
    include: { cuotas: true }
  });
  console.log(r?.cuotas.map(c => ({ id: c.id, per: c.periodo, est: c.estado })));
  
  const cxp = await prisma.cuentaPagar.findMany({
    where: { concepto: { contains: 'Susana' } },
    include: { abonos: true }
  });
  console.log("Cuentas por pagar Susana:", cxp.map(c => ({ id: c.id, per: c.concepto, est: c.estado, abonos: c.abonos.length })));
}
run();
