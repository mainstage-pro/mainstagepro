import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const mov1Id = "cmuooj4it0006sm01btbjhkwc";
  const mov2Id = "cmuooj4k20008sm017cl3culg";
  const mov3Id = "cmuooj4l6000asm01y2ufwjty";
  const mov4Id = "cmuopvmpf00027guq6cxql99c";

  // Mov1: 1500 Efectivo -> stays 1500 Efectivo
  // Mov2: 1500 Efectivo -> change to 750 Efectivo
  await prisma.movimientoFinanciero.update({
    where: { id: mov2Id },
    data: { monto: 750 }
  });

  // Mov3: 1250 Transferencia -> change to 2000 Transferencia
  await prisma.movimientoFinanciero.update({
    where: { id: mov3Id },
    data: { monto: 2000, cuentaOrigenId: "cmnrpg65l000rzmizc039imjd", metodoPago: "TRANSFERENCIA" }
  });

  // Delete Mov4 if it's not linked to ProyectoPersonal
  const mov4 = await prisma.movimientoFinanciero.findUnique({
    where: { id: mov4Id },
    include: { proyectoPersonal: true }
  });
  if (mov4 && !mov4.proyectoPersonal) {
    await prisma.movimientoFinanciero.delete({ where: { id: mov4Id } });
    console.log("Deleted mov4");
  } else {
    console.log("Could not delete mov4, linked to PP or not found");
  }

  // Update CxP values to match Mov3
  await prisma.cuentaPagar.updateMany({
    where: { movimientoId: mov3Id },
    data: { montoPagado: 2000 }
  });

  console.log("Done!");
}
main().catch(console.error).finally(() => prisma.$disconnect());
