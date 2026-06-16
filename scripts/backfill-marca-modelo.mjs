import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Buscando líneas de cotización sin modelo...");

  const lineas = await prisma.cotizacionLinea.findMany({
    where: { equipoId: { not: null }, modelo: null, tipo: "EQUIPO_PROPIO" },
    select: {
      id: true,
      equipoId: true,
      marca: true,
      descripcion: true,
      equipo: { select: { marca: true, modelo: true, descripcion: true } },
    },
  });

  console.log(`📦 Total a corregir: ${lineas.length}`);

  if (lineas.length === 0) {
    console.log("✅ No hay líneas pendientes. Todo limpio.");
    return;
  }

  let actualizadas = 0;
  let sinDatos = 0;

  for (const linea of lineas) {
    const equipo = linea.equipo;
    if (!equipo) { sinDatos++; continue; }

    const nuevaMarca = linea.marca || equipo.marca || null;
    const nuevoModelo = equipo.modelo || null;

    if (!nuevoModelo && !nuevaMarca) { sinDatos++; continue; }

    await prisma.cotizacionLinea.update({
      where: { id: linea.id },
      data: { marca: nuevaMarca, modelo: nuevoModelo },
    });

    console.log(`  ✓ ${linea.descripcion} → ${nuevaMarca ?? ""} ${nuevoModelo ?? ""}`);
    actualizadas++;
  }

  console.log("");
  console.log(`✅ Backfill completo.`);
  console.log(`   Actualizadas: ${actualizadas}`);
  console.log(`   Sin datos en inventario: ${sinDatos}`);
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
