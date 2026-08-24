import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const res = await prisma.cuentaPagar.findFirst({
      include: { categoria: { select: { id: true, nombre: true } } }
    });
    console.log("Success", res?.id);
  } catch (e) {
    console.error("Error", e);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
