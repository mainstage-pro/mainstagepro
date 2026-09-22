import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const empresa = await prisma.empresa.findFirst({
    where: { nombre: { contains: "Conexzion", mode: "insensitive" } }
  });
  
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
  console.log("=== CXC (A favor de Mainstage) ===");
  for (const c of cxc) {
    if (new Date(c.proyecto?.fechaEvento || c.createdAt) <= limite) {
      console.log(`[${(c.proyecto?.fechaEvento || c.createdAt).toISOString().slice(0,10)}] ${c.monto} - ${c.concepto}`);
    }
  }

  console.log("\n=== CXP (A favor de Conexzion) ===");
  for (const c of cxp) {
    if (new Date(c.proyecto?.fechaEvento || c.createdAt) <= limite) {
      console.log(`[${(c.proyecto?.fechaEvento || c.createdAt).toISOString().slice(0,10)}] ${c.monto} - ${c.concepto}`);
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
