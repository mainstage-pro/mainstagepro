import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const socios = await prisma.socio.findMany({ where: { nombre: { contains: 'Mauricio' } } });
  console.log('Socios:', socios);

  const cxp = await prisma.cuentaPagar.findMany({
    where: {
      OR: [
        { tecnico: { nombre: { contains: 'Mauricio' } } },
        { proveedor: { nombre: { contains: 'Mauricio' } } },
        { socio: { nombre: { contains: 'Mauricio' } } },
      ]
    },
    include: { tecnico: true, proveedor: true, socio: true, abonos: true }
  });
  console.log('CXP for Mauricio:', JSON.stringify(cxp, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
