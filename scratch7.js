const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cxc = await prisma.cuentaCobrar.findMany({
    include: { proyecto: true },
    where: {
      proyecto: {
          nombre: { contains: 'conexion', mode: 'insensitive' }
      }
    }
  });
  console.log("Found in projects:", cxc.length);
  for (const c of cxc) {
    console.log(`ID: ${c.id}, Concepto: ${c.concepto}, Monto: ${c.monto}, Cobrado: ${c.montoCobrado}, Proyecto: ${c.proyecto?.nombre}`);
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
