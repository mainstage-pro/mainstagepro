/**
 * Script de migración: consolida los strings empresa de clientes y proveedores
 * en registros Empresa, deduplicando por nombre exacto.
 * Ejecutar una sola vez: npx tsx prisma/migrate-empresas.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando migración de empresas...\n");

  // 1. Recopilar todos los nombres únicos de empresa
  const clientes = await prisma.cliente.findMany({
    where: { empresa: { not: null } },
    select: { id: true, nombre: true, empresa: true },
  });
  const proveedores = await prisma.proveedor.findMany({
    where: { empresa: { not: null } },
    select: { id: true, nombre: true, empresa: true },
  });

  const empresasMap = new Map<string, string>(); // nombre normalizado → Empresa.id

  const nombresUnicos = new Set([
    ...clientes.map(c => c.empresa!.trim()),
    ...proveedores.map(p => p.empresa!.trim()),
  ]);

  console.log(`Encontradas ${nombresUnicos.size} empresas únicas para crear.\n`);

  // 2. Crear registros Empresa
  for (const nombre of nombresUnicos) {
    const existing = await prisma.empresa.findFirst({ where: { nombre } });
    if (existing) {
      empresasMap.set(nombre, existing.id);
      console.log(`  ⏭  Ya existe: "${nombre}" (${existing.id})`);
    } else {
      const empresa = await prisma.empresa.create({
        data: { nombre, tipo: "AMBOS" },
      });
      empresasMap.set(nombre, empresa.id);
      console.log(`  ✅ Creada: "${nombre}" (${empresa.id})`);
    }
  }

  console.log("\nVinculando clientes...");
  let cLinked = 0;
  for (const c of clientes) {
    const empresaId = empresasMap.get(c.empresa!.trim());
    if (empresaId) {
      await prisma.cliente.update({ where: { id: c.id }, data: { empresaId } });
      cLinked++;
    }
  }
  console.log(`  ${cLinked} clientes vinculados.`);

  console.log("Vinculando proveedores...");
  let pLinked = 0;
  for (const p of proveedores) {
    const empresaId = empresasMap.get(p.empresa!.trim());
    if (empresaId) {
      await prisma.proveedor.update({ where: { id: p.id }, data: { empresaId } });
      pLinked++;
    }
  }
  console.log(`  ${pLinked} proveedores vinculados.`);

  console.log("\n✔ Migración completa.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
