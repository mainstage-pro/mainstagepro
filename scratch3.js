const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cxc = await prisma.cuentaCobrar.findMany({
    where: {
      monto: { in: [2780, 26320] }
    }
  });
  console.log(cxc);
}
main().then(() => prisma.$disconnect()).catch(console.error);
