import { neon } from "@neondatabase/serverless";
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

async function main() {
  // ── pt_areas: código estable + bandera transversal (aditivo, idempotente) ──
  await sql.query(`ALTER TABLE pt_areas ADD COLUMN IF NOT EXISTS codigo TEXT`);
  await sql.query(`ALTER TABLE pt_areas ADD COLUMN IF NOT EXISTS transversal BOOLEAN NOT NULL DEFAULT false`);

  // Backfill de código por patrón de nombre (antes de renombrar "Ventas").
  await sql.query(`UPDATE pt_areas SET codigo='DIRECCION'      WHERE codigo IS NULL AND unaccent(lower(nombre)) LIKE '%direcc%'`).catch(async () => {
    // Sin extensión unaccent: fallback por LIKE simple.
    await sql.query(`UPDATE pt_areas SET codigo='DIRECCION' WHERE codigo IS NULL AND lower(nombre) LIKE '%direcc%'`);
  });
  await sql.query(`UPDATE pt_areas SET codigo='ADMINISTRACION' WHERE codigo IS NULL AND lower(nombre) LIKE '%administ%'`);
  await sql.query(`UPDATE pt_areas SET codigo='MARKETING'      WHERE codigo IS NULL AND lower(nombre) LIKE '%marketing%'`);
  await sql.query(`UPDATE pt_areas SET codigo='VENTAS'         WHERE codigo IS NULL AND (lower(nombre) LIKE '%venta%' OR lower(nombre) LIKE '%comercial%')`);
  await sql.query(`UPDATE pt_areas SET codigo='PRODUCCION'     WHERE codigo IS NULL AND lower(nombre) LIKE '%producc%'`);
  await sql.query(`UPDATE pt_areas SET codigo='GENERAL', transversal=true WHERE codigo IS NULL AND lower(nombre) LIKE '%operaciones general%'`);

  // Marcar transversal a Operaciones Generales aunque ya tuviera código.
  await sql.query(`UPDATE pt_areas SET transversal=true WHERE codigo='GENERAL'`);

  // Índice único sobre codigo (coincide con @unique de Prisma).
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS pt_areas_codigo_key ON pt_areas (codigo)`);

  // Reconciliar etiqueta: "Ventas" → "Comercial" (el código VENTAS se mantiene estable).
  await sql.query(`UPDATE pt_areas SET nombre='Comercial' WHERE codigo='VENTAS' AND nombre <> 'Comercial'`);

  // ── puestos: condiciones laborales migradas de puestos_ideales ──
  await sql.query(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS funciones TEXT`);
  await sql.query(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS prestaciones TEXT`);
  await sql.query(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS tipo_contrato TEXT`);
  await sql.query(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS modalidad TEXT`);
  await sql.query(`ALTER TABLE puestos ADD COLUMN IF NOT EXISTS horario TEXT`);

  // Backfill desde el puesto ideal vinculado (solo donde el puesto aún no tiene valor).
  await sql.query(`
    UPDATE puestos p SET
      funciones     = COALESCE(p.funciones, pi.funciones),
      prestaciones  = COALESCE(p.prestaciones, pi.prestaciones),
      tipo_contrato = COALESCE(p.tipo_contrato, pi.tipo_contrato),
      modalidad     = COALESCE(p.modalidad, pi.modalidad),
      horario       = COALESCE(p.horario, pi.horario)
    FROM puestos_ideales pi
    WHERE p.puesto_ideal_id = pi.id
  `);

  // ── Verificación ──
  const areas = await sql.query(`SELECT nombre, codigo, transversal FROM pt_areas ORDER BY orden`);
  console.log("PT_AREAS:", JSON.stringify(areas, null, 2));
  const pcols = await sql.query(`SELECT column_name FROM information_schema.columns WHERE table_name='puestos' AND column_name IN ('funciones','prestaciones','tipo_contrato','modalidad','horario')`);
  console.log("PUESTOS nuevas cols:", pcols.map((r: any) => r.column_name).join(", "));
  const back = await sql.query(`SELECT count(*)::int AS n FROM puestos WHERE funciones IS NOT NULL OR prestaciones IS NOT NULL OR tipo_contrato IS NOT NULL`);
  console.log("Puestos con datos migrados:", back[0].n);
}
main().catch((e) => { console.error(e); process.exit(1); });
