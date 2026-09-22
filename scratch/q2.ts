import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const empresa = await prisma.empresa.findFirst({
    where: { nombre: { contains: "Conexzion", mode: "insensitive" } }
  });
  
  const cxc = await prisma.cuentaCobrar.findMany({
    where: { 
      OR: [
        { empresaId: empresa!.id },
        { cliente: { empresaId: empresa!.id } }
      ]
    },
    include: { proyecto: true }
  });

  const cxp = await prisma.cuentaPagar.findMany({
    where: { 
      OR: [
        { empresaId: empresa!.id },
        { proveedor: { empresaId: empresa!.id } }
      ]
    },
    include: { proyecto: true }
  });

  let sumCxc = 0, sumCxp = 0;
  for (const c of cxc) {
      if (new Date(c.proyecto?.fechaEvento || c.createdAt) <= new Date("2026-06-27T23:59:59Z")) {
         sumCxc += c.monto - c.montoCobrado - Number(c.montoCompensado || 0);
      }
  }
  for (const c of cxp) {
      if (new Date(c.proyecto?.fechaEvento || c.createdAt) <= new Date("2026-06-27T23:59:59Z")) {
         sumCxp += c.monto - c.montoPagado - Number(c.montoCompensado || 0);
      }
  }
  
  console.log(`CxC Pendiente: ${sumCxc}`);
  console.log(`CxP Pendiente: ${sumCxp}`);
}
main().catch(console.error).finally(() => process.exit(0));
