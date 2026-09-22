import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const socio = await prisma.socio.findFirst({ where: { nombre: { contains: "Susana" } } });
  if (socio) {
    const repartos = await prisma.repartoUtilidad.findMany({ where: { socioId: socio.id } });
    const series = await prisma.serieRecurrente.findMany({ where: { socioId: socio.id } });
    console.log("Repartos:", repartos);
    console.log("Series:", series);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
