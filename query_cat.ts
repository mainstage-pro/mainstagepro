import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const mov = await prisma.movimientoFinanciero.findUnique({ where: { id: "cmuopvmpf00027guq6cxql99c" } });
  console.log("Categoria:", mov?.categoriaId);
}
main().catch(console.error).finally(() => prisma.$disconnect());
