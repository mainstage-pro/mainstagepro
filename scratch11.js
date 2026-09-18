const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cxc = await prisma.cuentaCobrar.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { cliente: true, empresa: true }
  });
  console.log("Most recent 20 Cuentas por Cobrar:");
  for (const c of cxc) {
    console.log(`ID: ${c.id} | Concepto: ${c.concepto} | Monto: ${c.monto} | Pendiente: ${c.monto - c.montoCobrado} | Notas: ${c.notas} | Cliente: ${c.cliente?.nombre} | Empresa: ${c.empresa?.nombre}`);
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
