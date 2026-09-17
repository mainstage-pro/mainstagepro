const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const lineas = await prisma.cotizacionLinea.findMany();
  for (const l of lineas) {
      if (l.subtotal === 2780 || l.precioUnitario === 2780 || l.costoUnitario === 2780) {
          console.log(`Match in CotizacionLinea: ID ${l.id}, Descripcion: ${l.descripcion}, Subtotal: ${l.subtotal}`);
      }
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
