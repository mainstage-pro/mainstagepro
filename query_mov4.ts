import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const m = await prisma.movimientoFinanciero.findUnique({ where: { id: "cmuopvmpf00027guq6cxql99c" } });
  console.log(m?.createdAt);
}
main().catch(console.error).finally(() => prisma.$disconnect());
