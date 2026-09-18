const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const empresa = await prisma.empresa.findFirst({ where: { nombre: { contains: 'conexzion', mode: 'insensitive' } } });
  if (empresa) {
      const clientes = await prisma.cliente.findMany({ where: { empresaId: empresa.id } });
      console.log("Empresa:", empresa.nombre);
      console.log("Clientes:", clientes.map(c => c.nombre));
      
      const cxc = await prisma.cuentaCobrar.findMany({
          where: {
              OR: [
                  { empresaId: empresa.id },
                  { clienteId: { in: clientes.map(c => c.id) } }
              ]
          }
      });
      console.log("CxC relacionadas:");
      for (const c of cxc) {
          console.log(`ID: ${c.id} | Concepto: ${c.concepto} | Monto: ${c.monto} | Pendiente: ${c.monto - c.montoCobrado}`);
      }
  } else {
      console.log("No se encontró empresa conexzion");
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
