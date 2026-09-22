import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.personalInterno.findMany({ select: { nombre: true, puesto: true }});
  const t = await prisma.tecnico.findMany({ select: { nombre: true }});
  console.log("Personal:", p);
  console.log("Tecnicos:", t.map(x => x.nombre).join(", "));
}
main().catch(console.error).finally(() => prisma.$disconnect());
