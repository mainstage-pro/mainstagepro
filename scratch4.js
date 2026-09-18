const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cxc = await prisma.cuentaCobrar.findMany({
    where: {
      OR: [
        { concepto: { contains: 'conexion', mode: 'insensitive' } },
        { concepto: { contains: 'conexión', mode: 'insensitive' } }
      ]
    }
  });
  console.log("Cuentas por cobrar con 'conexion':", cxc.length);
  for (const c of cxc) console.log(c);
}
main().then(() => prisma.$disconnect()).catch(console.error);
