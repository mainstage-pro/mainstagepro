import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.cuentaCobrar.findMany({
    where: {
      OR: [
        { concepto: { contains: 'conexion', mode: 'insensitive' } },
        { cliente: { nombre: { contains: 'conexion', mode: 'insensitive' } } },
        { empresa: { nombre: { contains: 'conexion', mode: 'insensitive' } } }
      ]
    },
    include: {
      cliente: true,
      empresa: true
    }
  });
  
  console.log("Found:", accounts.length);
  for (const acc of accounts) {
      console.log(`ID: ${acc.id} | Concepto: ${acc.concepto} | Monto: ${acc.monto} | Cobrado: ${acc.montoCobrado} | Cliente: ${acc.cliente?.nombre} | Empresa: ${acc.empresa?.nombre} | Estado: ${acc.estado}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
