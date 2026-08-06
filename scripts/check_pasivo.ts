import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const cuota = await prisma.cuotaDeuda.findFirst({
    where: { pasivoDeuda: { nombre: { contains: "Amortización Obra de Bodega" } } },
    include: { cuentaPagar: true, pasivoDeuda: true }
  });
  console.log("Cuota encontrada:", cuota?.id, "CXP:", cuota?.cuentaPagarId, "Estado:", cuota?.estado);
  console.log("Pasivo monto pagado antes:", cuota?.pasivoDeuda?.montoPagado);
  
  if (cuota?.cuentaPagarId) {
    // Let's check abonos on that cxp
    const cxp = await prisma.cuentaPagar.findUnique({
      where: { id: cuota.cuentaPagarId },
      include: { abonos: true }
    });
    console.log("CXP estado:", cxp?.estado, "montoPagado:", cxp?.montoPagado);
    console.log("Abonos:", cxp?.abonos);
  }
}
test().finally(() => prisma.$disconnect());
