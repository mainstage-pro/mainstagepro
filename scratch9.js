const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const movs = await prisma.movimientoFinanciero.findMany();
  const diffs = movs.filter(m => m.monto === 2780 || m.monto === 26320);
  console.log("Matches:", diffs.length);
  for (const m of diffs) {
    console.log(`ID: ${m.id}, Concepto: ${m.concepto}, Monto: ${m.monto}, Tipo: ${m.tipo}`);
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
