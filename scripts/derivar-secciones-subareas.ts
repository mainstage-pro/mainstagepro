import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

// Mapea nombre de proyecto operativo → código de área canónica del maestro.
function areaCodeDeProyecto(nombre: string): string | null {
  const n = nombre.toLowerCase();
  if (n.includes("direcc")) return "DIRECCION";
  if (n.includes("administ")) return "ADMINISTRACION";
  if (n.includes("marketing")) return "MARKETING";
  if (n.includes("comercial") || n.includes("venta")) return "VENTAS";
  if (n.includes("producc")) return "PRODUCCION";
  return null; // p.ej. "6. Optimización App" → sin área canónica, se omite
}

function cuid(): string {
  // cuid-lite suficiente para IDs únicos de fila
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

async function main() {
  // 1. DDL aditivo idempotente (antes de desplegar código que lea la columna).
  await sql.query(`ALTER TABLE tarea_secciones ADD COLUMN IF NOT EXISTS "subAreaId" TEXT`);
  await sql.query(`CREATE INDEX IF NOT EXISTS "tarea_secciones_subAreaId_idx" ON tarea_secciones ("subAreaId")`);
  console.log("DDL aplicado: tarea_secciones.subAreaId + índice");

  // 2. Áreas del maestro: codigo → id
  const areas = await sql.query(`SELECT id, codigo FROM pt_areas`);
  const areaIdPorCodigo = new Map<string, string>();
  for (const a of areas) areaIdPorCodigo.set(a.codigo, a.id);

  // 3. Secciones PLAN con su proyecto.
  const secciones = await sql.query(`
    SELECT s.id, s.nombre, s.descripcion, s.orden, p.nombre AS proyecto
    FROM tarea_secciones s
    JOIN tarea_proyectos p ON p.id = s."proyectoId"
    WHERE s."tipoModulo" = 'PLAN'
    ORDER BY p.nombre, s.orden
  `);

  let creadas = 0, vinculadas = 0, omitidas = 0;

  for (const s of secciones) {
    const code = areaCodeDeProyecto(s.proyecto);
    if (!code) { omitidas++; console.log(`  OMIT (sin área): [${s.proyecto}] ${s.nombre}`); continue; }
    const areaId = areaIdPorCodigo.get(code);
    if (!areaId) { omitidas++; console.log(`  OMIT (área ${code} no existe): ${s.nombre}`); continue; }

    // Buscar subárea existente por nombre exacto (case-insensitive) dentro del área.
    const existentes = await sql.query(
      `SELECT id, descripcion FROM pt_subareas WHERE "areaId" = $1 AND lower(nombre) = lower($2) LIMIT 1`,
      [areaId, s.nombre]
    );

    let subAreaId: string;
    if (existentes.length > 0) {
      subAreaId = existentes[0].id;
      // Copiar objetivo de la sección al maestro si el maestro no tiene descripción.
      if (!existentes[0].descripcion && s.descripcion) {
        await sql.query(`UPDATE pt_subareas SET descripcion = $1 WHERE id = $2`, [s.descripcion, subAreaId]);
      }
      console.log(`  LINK  [${code}] ${s.nombre} → subárea existente`);
    } else {
      subAreaId = cuid();
      // orden: al final del área.
      const maxOrden = await sql.query(`SELECT COALESCE(MAX(orden), -1) + 1 AS next FROM pt_subareas WHERE "areaId" = $1`, [areaId]);
      const orden = Number(maxOrden[0].next) || 0;
      await sql.query(
        `INSERT INTO pt_subareas (id, "areaId", nombre, orden, descripcion, entregables)
         VALUES ($1, $2, $3, $4, $5, '{}')`,
        [subAreaId, areaId, s.nombre, orden, s.descripcion ?? null]
      );
      creadas++;
      console.log(`  NEW   [${code}] ${s.nombre} → subárea creada`);
    }

    // Vincular la sección a la subárea.
    await sql.query(`UPDATE tarea_secciones SET "subAreaId" = $1 WHERE id = $2`, [subAreaId, s.id]);
    vinculadas++;
  }

  console.log(`\nResumen: ${vinculadas} secciones vinculadas · ${creadas} subáreas nuevas · ${omitidas} omitidas`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
