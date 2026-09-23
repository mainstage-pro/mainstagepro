import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const roles = await prisma.rolTecnico.findMany();
  console.log(roles.map(r => r.nombre));
}
run();
