import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cuentas = await prisma.cuentaBancaria.findMany({
    where: { activa: true }
  });

  const movs = await prisma.movimientoFinanciero.findMany();

  console.log("=== SALDOS DE CUENTAS BANCARIAS ===");

  for (const cuenta of cuentas) {
    let balance = 0;
    
    for (const m of movs) {
      if (m.tipo === 'INGRESO') {
        if (m.cuentaDestinoId === cuenta.id) balance += m.monto;
      } else if (m.tipo === 'GASTO' || m.tipo === 'RETIRO' || m.tipo === 'INVERSION' || m.tipo === 'EGRESO') {
        if (m.cuentaOrigenId === cuenta.id) balance -= m.monto;
      } else if (m.tipo === 'TRANSFERENCIA') {
        if (m.cuentaDestinoId === cuenta.id) balance += m.monto;
        if (m.cuentaOrigenId === cuenta.id) balance -= m.monto;
      }
    }

    console.log(`- **${cuenta.nombre}**: $${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
