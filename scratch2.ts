import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const proys = await prisma.proyecto.findMany({
    where: {
      nombre: { contains: 'expo supraterra', mode: 'insensitive' }
    },
    select: { id: true, nombre: true }
  });
  console.log("Proyectos:", proys);
  
  if (proys.length > 0) {
    const id = proys[0].id;
    const movs = await prisma.movimientoFinanciero.findMany({
      where: { proyectoId: id },
      select: { id: true, concepto: true, monto: true }
    });
    console.log("Movimientos del proyecto:", movs);
    
    const cxps = await prisma.cuentaPagar.findMany({
      where: { proyectoId: id },
      select: { id: true, concepto: true, total: true }
    });
    console.log("CXP del proyecto:", cxps);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
