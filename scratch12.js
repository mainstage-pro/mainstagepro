const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const empresas = await prisma.empresa.findMany({ select: { nombre: true } });
  console.log("Empresas:", empresas.map(e => e.nombre).join(", "));
  const clientes = await prisma.cliente.findMany({ select: { nombre: true } });
  console.log("Clientes:", clientes.map(c => c.nombre).join(", "));
}
main().then(() => prisma.$disconnect()).catch(console.error);
