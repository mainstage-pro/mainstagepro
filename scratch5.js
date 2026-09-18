const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cxc = await prisma.cuentaCobrar.findMany({
    include: { cliente: true, empresa: true },
    where: {
      OR: [
        { cliente: { nombre: { contains: 'conexion', mode: 'insensitive' } } },
        { empresa: { nombre: { contains: 'conexion', mode: 'insensitive' } } },
        { cliente: { nombre: { contains: 'conexión', mode: 'insensitive' } } },
        { empresa: { nombre: { contains: 'conexión', mode: 'insensitive' } } },
        { cliente: { empresa: { contains: 'conexion', mode: 'insensitive' } } }
      ]
    }
  });
  console.log("Found:", cxc.length);
  for (const c of cxc) {
    console.log(`ID: ${c.id}, Concepto: ${c.concepto}, Monto: ${c.monto}, Cobrado: ${c.montoCobrado}, Cliente: ${c.cliente?.nombre}, Empresa: ${c.empresa?.nombre}`);
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
