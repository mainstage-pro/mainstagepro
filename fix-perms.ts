import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findFirst({ where: { name: { contains: "Rodrigo", mode: "insensitive" } } });
  if (user) { await prisma.moduloAcceso.create({ data: { userId: user.id, moduloKey: "inv-maestro" } }).catch(()=>console.log("Already has it")); console.log("Added for Rodrigo"); }
}
run();
