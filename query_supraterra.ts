import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.proyecto.findMany({
    where: { nombre: { contains: 'supraterra', mode: 'insensitive' } },
    include: {
      cuentasCobrar: {
        include: {
          abonos: true
        }
      }
    }
  });
  console.log(JSON.stringify(projects, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
