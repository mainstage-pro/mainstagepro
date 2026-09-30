import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mov = await prisma.movimientoFinanciero.findFirst({
    where: { concepto: { contains: "Juan Carlos Herrera" } },
    orderBy: { createdAt: 'desc' },
    include: { pagoNomina: true, cuentaPagar: true, proyectoPersonal: true }
  });
  console.log(mov);
}
main().catch(console.error).finally(() => prisma.$disconnect());
