const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const empresa = await prisma.empresa.findFirst({ where: { nombre: { contains: 'conexzion', mode: 'insensitive' } } });
  const clientes = await prisma.cliente.findMany({ where: { empresaId: empresa.id } });
  const cotizaciones = await prisma.cotizacion.findMany({
      where: {
          OR: [
              { clienteId: { in: clientes.map(c => c.id) } }
          ]
      }
  });
  console.log("Cotizaciones para Conexzion:");
  for (const c of cotizaciones) {
      console.log(`ID: ${c.id}, Total: ${c.total}, Gran Total: ${c.granTotal}, IVA: ${c.aplicaIva}, Monto IVA: ${c.montoIva}, Descuento: ${c.montoDescuento}`);
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
