import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { name: true, email: true }});
  console.log("Users:", users);
  const clientes = await prisma.cliente.findMany({ select: { nombre: true } });
  console.log("Clientes:", clientes.filter(c => c.nombre.toLowerCase().includes("marco")));
}
main().catch(console.error).finally(() => prisma.$disconnect());
