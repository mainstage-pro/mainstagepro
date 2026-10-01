import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const mov = await prisma.movimientoFinanciero.create({
    data: {
      id: "cmuopvmpf00027guq6cxql99c",
      tipo: "GASTO",
      fecha: new Date("2026-09-30T12:00:00.000Z"),
      concepto: "Abono CxP: Consola Andrés",
      monto: 2000,
      metodoPago: "TRANSFERENCIA",
      cuentaOrigenId: "cmnrpg65l000rzmizc039imjd",
      proyectoId: "cmu2l2xsp004xzvcfez7tlqwn",
      creadoPor: "cmo7ikcc00000oqfsqwzys8g4",
      createdAt: new Date("2026-09-30T23:08:54.579Z")
    }
  });

  await prisma.abonoPago.update({
    where: { id: "cmuopvmpj00047guquz1blylm" },
    data: { movimientoId: "cmuopvmpf00027guq6cxql99c" }
  });

  console.log("Restored mov4:", mov.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
