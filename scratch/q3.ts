import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const cxc = await prisma.cuentaCobrar.findMany({
    where: { monto: { in: [31400, 13200, 11400, 17300, 8400, 6000] } },
    include: { cliente: true, empresa: true, proyecto: true }
  });
  console.log("CxC:", cxc.map(c => ({ id: c.id, monto: c.monto, concepto: c.concepto, cliente: c.cliente?.nombre, empresa: c.empresa?.nombre })));

  const cxp = await prisma.cuentaPagar.findMany({
    where: { monto: { in: [31400, 13200, 11400, 17300, 8400, 6000] } },
    include: { proveedor: true, empresa: true, proyecto: true }
  });
  console.log("CxP:", cxp.map(c => ({ id: c.id, monto: c.monto, concepto: c.concepto, proveedor: c.proveedor?.nombre, empresa: c.empresa?.nombre })));
}
main().catch(console.error).finally(() => process.exit(0));
