import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const movId = "cmuooj4it0006sm01btbjhkwc";
  const pago = await prisma.pagoNomina.findFirst({
    where: { movimientoId: movId },
    include: { personal: true, tecnico: true }
  });
  console.log("PagoNomina:", pago);
}
main().catch(console.error).finally(() => prisma.$disconnect());
