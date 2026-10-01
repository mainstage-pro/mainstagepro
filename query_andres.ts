import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const movs = await prisma.movimientoFinanciero.findMany({
    where: { 
      OR: [
        { concepto: { contains: "andrés", mode: "insensitive" } },
        { notas: { contains: "andrés", mode: "insensitive" } },
        { concepto: { contains: "andres", mode: "insensitive" } },
        { notas: { contains: "andres", mode: "insensitive" } },
        { concepto: { contains: "consola", mode: "insensitive" } },
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 5
  });
  console.log("Movimientos:", movs);

  const cxp = await prisma.cuentaPagar.findMany({
    where: { 
      OR: [
        { concepto: { contains: "andrés", mode: "insensitive" } },
        { notas: { contains: "andrés", mode: "insensitive" } },
        { concepto: { contains: "andres", mode: "insensitive" } },
        { notas: { contains: "andres", mode: "insensitive" } },
        { concepto: { contains: "consola", mode: "insensitive" } },
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 5
  });
  console.log("CxP:", cxp);
}
main().catch(console.error).finally(() => prisma.$disconnect());
