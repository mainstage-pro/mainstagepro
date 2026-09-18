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
  console.log("CxC detalladas para Conexzion:");
  let totalPendiente = 0;
  for (const c of cxc) {
      const pendiente = c.monto - c.montoCobrado;
      totalPendiente += pendiente;
      console.log(`ID: ${c.id} | Concepto: ${c.concepto} | Monto: ${c.monto} | Cobrado: ${c.montoCobrado} | Pendiente: ${pendiente} | Fecha: ${c.createdAt.toISOString()}`);
  }
  console.log("Total Pendiente Actual:", totalPendiente);
}
main().then(() => prisma.$disconnect()).catch(console.error);
