const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const abonos = await prisma.abono.findMany();
  for (const a of abonos) {
      if (a.monto === 2780) {
          console.log(`Match in Abono: ID ${a.id}, Monto: ${a.monto}`);
      }
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
