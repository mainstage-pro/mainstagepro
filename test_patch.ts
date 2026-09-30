import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const movId = "cmuooj4l6000asm01y2ufwjty";
  const mov = await prisma.movimientoFinanciero.findUnique({ where: { id: movId } });
  console.log("Before:", mov?.cuentaOrigenId);

  // simulate PATCH with a VALID account ID (Banorte Persona Física)
  const data = { cuentaOrigenId: "cmnrpg65l000rzmizc039imjd" }; 
  const updated = await prisma.movimientoFinanciero.update({ where: { id: movId }, data });
  console.log("After:", updated.cuentaOrigenId);
}
main().catch(console.error).finally(() => prisma.$disconnect());
