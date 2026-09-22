import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const empresa = await prisma.empresa.findFirst({
    where: { nombre: { contains: "Conexzion", mode: "insensitive" } }
  });
  if (!empresa) {
    console.log("No se encontró Conexzion");
    return;
  }
  
  // We need to fetch just like getCuentasScope does
  // Fetch CxC
  const cxc = await prisma.cuentaCobrar.findMany({
    where: { 
      OR: [
        { empresaId: empresa.id },
        { cliente: { empresaId: empresa.id } }
      ]
    },
    include: { proyecto: true }
  });

  const cxp = await prisma.cuentaPagar.findMany({
    where: { 
      OR: [
        { empresaId: empresa.id },
        { proveedor: { empresaId: empresa.id } }
      ]
    },
    include: { proyecto: true }
  });

  const limite = new Date("2026-06-27T23:59:59Z");

  const cxcFilt = cxc.filter(c => {
    const f = c.proyecto?.fechaEvento || c.createdAt;
    return f <= limite;
  });

  const cxpFilt = cxp.filter(c => {
    const f = c.proyecto?.fechaEvento || c.createdAt;
    return f <= limite;
  });

  console.log(`\n--- CxC (A Favor) hasta ${limite.toISOString()} ---`);
  for (const c of cxcFilt) {
    const pdte = c.monto - c.montoCobrado - Number(c.montoCompensado || 0);
    const f = c.proyecto?.fechaEvento || c.createdAt;
    console.log(`- [${f.toISOString().slice(0,10)}] ${c.concepto} | Monto: ${c.monto} | Pagado: ${c.montoCobrado} | Pdte: ${pdte}`);
  }
  const totalCxcPdte = cxcFilt.reduce((a, b) => a + (b.monto - b.montoCobrado - Number(b.montoCompensado || 0)), 0);
  console.log(`Total CxC Pendiente: ${totalCxcPdte}`);

  console.log(`\n--- CxP (En Contra) hasta ${limite.toISOString()} ---`);
  for (const c of cxpFilt) {
    const pdte = c.monto - c.montoPagado - Number(c.montoCompensado || 0);
    const f = c.proyecto?.fechaEvento || c.createdAt;
    console.log(`- [${f.toISOString().slice(0,10)}] ${c.concepto} | Monto: ${c.monto} | Pagado: ${c.montoPagado} | Pdte: ${pdte}`);
  }
  const totalCxpPdte = cxpFilt.reduce((a, b) => a + (b.monto - b.montoPagado - Number(b.montoCompensado || 0)), 0);
  console.log(`Total CxP Pendiente: ${totalCxpPdte}`);

}
main().catch(console.error).finally(() => process.exit(0));
