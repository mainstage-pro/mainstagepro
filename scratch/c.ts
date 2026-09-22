import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.cuentaPagar.deleteMany({
    where: {
      esReparto: true,
      estado: { in: ["PENDIENTE", "PARCIAL"] }
    }
  });
  console.log("Cuentas eliminadas:", result.count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
