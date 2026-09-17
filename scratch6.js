const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const models = Object.keys(prisma);
  console.log("Looking for related models...");
  if (prisma.cuentaBancaria) {
      const cuentas = await prisma.cuentaBancaria.findMany();
      console.log("Cuentas Bancarias:", cuentas.map(c => c.nombre + " - " + c.banco).join(", "));
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
