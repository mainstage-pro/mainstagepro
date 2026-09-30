import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cuentas = await prisma.cuentaBancaria.findMany();
  console.log(cuentas.map(c => ({ id: c.id, nombre: c.nombre })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
