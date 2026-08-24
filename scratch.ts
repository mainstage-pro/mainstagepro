import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.categoriaFinanciera.findMany();
  console.log(cats);
  
  const cxpCats = await prisma.cuentaPagar.findMany({ select: { tipoAcreedor: true, categoriaId: true }, take: 10 });
  console.log(cxpCats);
}
main().catch(console.error).finally(() => prisma.$disconnect());
