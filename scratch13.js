const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cxc = await prisma.cuentaCobrar.findMany({
    include: { cliente: true, empresa: true },
    where: {
      OR: [
        { empresa: { nombre: { contains: 'conexzion', mode: 'insensitive' } } },
        { cliente: { nombre: { contains: 'conexzion', mode: 'insensitive' } } }
      ]
    }
  });
  console.log("Found Cuentas por Cobrar for Conexzion:", cxc.length);
  for (const c of cxc) {
    console.log(`ID: ${c.id} | Concepto: ${c.concepto} | Monto: ${c.monto} | Cobrado: ${c.montoCobrado} | Pendiente: ${c.monto - c.montoCobrado} | Cliente: ${c.cliente?.nombre} | Empresa: ${c.empresa?.nombre} | Estado: ${c.estado}`);
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
