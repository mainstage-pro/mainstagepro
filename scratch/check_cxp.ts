import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const cxps = await prisma.cuentaPagar.findMany({
    where: {
      concepto: { contains: 'Susana' }
    }
  });
  console.log(`Found ${cxps.length} Cuentas por Pagar for Susana`);
  
  const pendientes = cxps.filter(c => c.estado === 'PENDIENTE' || c.estado === 'VENCIDO');
  const pagadas = cxps.filter(c => c.estado === 'PAGADO');
  
  console.log(`${pendientes.length} pending/vencidas, ${pagadas.length} pagadas`);
  
  // also let's look at cuotas de reparto
  const cuotas = await prisma.cuotaReparto.findMany({
    where: { reparto: { nombre: { contains: 'Susana' } } }
  });
  console.log(`Found ${cuotas.length} Cuotas de Reparto`);
}
run();
