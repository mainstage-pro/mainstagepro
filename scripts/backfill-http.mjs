import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_0qjmIyDp6kHc@ep-noisy-firefly-an5vzlqv-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=30&pool_timeout=30&connection_limit=1";

const sql = neon(DATABASE_URL);

async function main() {
  console.log("🔍 Buscando líneas sin modelo...");

  const lineas = await sql`
    SELECT 
      cl.id,
      cl."equipoId",
      cl.marca        AS cl_marca,
      cl.descripcion,
      e.marca         AS eq_marca,
      e.modelo        AS eq_modelo
    FROM cotizacion_lineas cl
    JOIN equipos e ON e.id = cl."equipoId"
    WHERE cl."equipoId" IS NOT NULL
      AND cl.modelo IS NULL
      AND cl.tipo = 'EQUIPO_PROPIO'
  `;

  console.log(`📦 Total a corregir: ${lineas.length}`);

  if (lineas.length === 0) {
    console.log("✅ No hay líneas pendientes.");
    return;
  }

  console.log("\nMuestra (primeros 3):");
  lineas.slice(0, 3).forEach(l => {
    console.log(`  - ${l.descripcion} | marca_inv=${l.eq_marca} modelo_inv=${l.eq_modelo}`);
  });

  let actualizadas = 0;
  let sinDatos = 0;

  for (const linea of lineas) {
    const nuevaMarca = linea.cl_marca || linea.eq_marca || null;
    const nuevoModelo = linea.eq_modelo || null;

    if (!nuevoModelo && !nuevaMarca) { sinDatos++; continue; }

    await sql`
      UPDATE cotizacion_lineas
      SET
        marca  = ${nuevaMarca},
        modelo = ${nuevoModelo}
      WHERE id = ${linea.id}
    `;
    console.log(`  ✓ ${linea.descripcion} → ${nuevaMarca ?? ""} ${nuevoModelo ?? ""}`);
    actualizadas++;
  }

  console.log("\n✅ Backfill completo.");
  console.log(`   Actualizadas: ${actualizadas}`);
  console.log(`   Sin datos en inventario: ${sinDatos}`);
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
