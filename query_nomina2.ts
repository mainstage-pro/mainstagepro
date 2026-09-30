import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const pagos = await prisma.pagoNomina.findMany({
    where: { fechaPago: { gte: new Date(new Date().setHours(0,0,0,0)) } },
    include: { personal: true, tecnico: true }
  });
  console.log("Pagos hoy:", pagos.length);
  pagos.forEach(p => console.log(p.id, p.monto, p.metodoPago, p.estado, p.movimientoId));
}
main().catch(console.error).finally(() => prisma.$disconnect());
