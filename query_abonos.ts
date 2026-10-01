import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const abonos = await prisma.abonoPago.findMany({
    where: { cuentaPagarId: "cmud6v9sz0001wreh3rbqt79z" },
    include: { movimiento: true }
  });
  console.log("Abonos Pago:", abonos);
}
main().catch(console.error).finally(() => prisma.$disconnect());
