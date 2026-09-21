import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cxp = await prisma.cuentaPagar.findMany({
    where: {
      OR: [
        { concepto: { contains: 'expo supraterra', mode: 'insensitive' } },
        { concepto: { contains: 'marco', mode: 'insensitive' } },
        { concepto: { contains: 'pantalla', mode: 'insensitive' } }
      ]
    },
    select: { 
      id: true, 
      concepto: true, 
      monto: true, 
      montoPagado: true,
      estado: true,
      abonos: {
        select: {
          id: true,
          monto: true,
          fecha: true,
          movimiento: {
            select: { id: true, concepto: true, monto: true }
          }
        }
      },
      movimiento: {
        select: { id: true, concepto: true, monto: true }
      }
    }
  });
  console.log("=== Detalles de Pagos y Abonos ===");
  console.log(JSON.stringify(cxp, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
