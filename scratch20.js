const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const empresa = await prisma.empresa.findFirst({ where: { nombre: { contains: 'conexzion', mode: 'insensitive' } } });
  const clientes = await prisma.cliente.findMany({ where: { empresaId: empresa.id } });
  const cxc = await prisma.cuentaCobrar.findMany({
      where: {
          OR: [
              { empresaId: empresa.id },
              { clienteId: { in: clientes.map(c => c.id) } }
          ]
      },
      include: {
          abonos: true
      }
  });
  console.log("Abonos para Conexzion:");
  for (const c of cxc) {
      for (const a of c.abonos) {
          console.log(`CxC ID: ${c.id}, Abono ID: ${a.id}, Monto: ${a.monto}, Fecha: ${a.fecha}`);
      }
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
