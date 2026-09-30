import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const abonoId = "cmuo66usk0004qycaqu9bw55j";
  const movId = "cmuo66usc0002qycaghnwqxvl";
  const cxcId = "cmr3za8n3000muzncmd6ixxr8";

  await prisma.$transaction(async (tx) => {
    // Delete Abono
    const abono = await tx.abono.findUnique({ where: { id: abonoId }});
    if (abono) {
      await tx.abono.delete({ where: { id: abonoId } });
      console.log('Deleted Abono:', abonoId);
    }
    
    // Delete Movimiento
    const mov = await tx.movimientoFinanciero.findUnique({ where: { id: movId }});
    if (mov) {
      await tx.movimientoFinanciero.delete({ where: { id: movId } });
      console.log('Deleted Movimiento:', movId);
    }

    // Update CuentaCobrar
    const updatedCxc = await tx.cuentaCobrar.update({
      where: { id: cxcId },
      data: {
        montoCobrado: 109230.64
      }
    });
    console.log('Updated CuentaCobrar montoCobrado to:', updatedCxc.montoCobrado);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
