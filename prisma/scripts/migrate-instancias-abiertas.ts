import { neon } from '@neondatabase/serverless'

// Migración UNA SOLA VEZ (Bloque 2): PTTareaInstancia abiertas -> Tarea (tipoOrigen="PLAN").
// - Solo PENDIENTE / EN_PROGRESO / VENCIDA. COMPLETADA/OMITIDA/NO_REALIZADO se conservan como archivo.
// - Idempotente: WHERE "migradaATareaId" IS NULL. Marca cada instancia migrada.
const sql = neon(process.env.DATABASE_URL!)

const AREA_CASE = `
  CASE
    WHEN a.nombre ILIKE '%venta%' THEN 'VENTAS'
    WHEN a.nombre ILIKE '%marketing%' THEN 'MARKETING'
    WHEN a.nombre ILIKE '%producc%' THEN 'PRODUCCION'
    WHEN a.nombre ILIKE '%administra%' THEN 'ADMINISTRACION'
    WHEN a.nombre ILIKE '%direcc%' THEN 'DIRECCION'
    WHEN a.nombre ILIKE '%rrhh%' OR a.nombre ILIKE '%recursos%' THEN 'RRHH'
    ELSE 'GENERAL'
  END`

async function main() {
  console.log('== Migración de instancias abiertas -> Tarea ==')

  const pre = await sql.query(
    `SELECT COUNT(*)::int AS n FROM "pt_tarea_instancias"
     WHERE estado IN ('PENDIENTE','EN_PROGRESO','VENCIDA') AND "migradaATareaId" IS NULL`
  )
  console.log('  candidatas:', pre[0].n)

  const result = await sql.query(`
    WITH src AS (
      SELECT
        gen_random_uuid()::text AS new_id,
        i.id            AS inst_id,
        i."responsableId",
        i."fechaVencimiento",
        i.notas,
        i.estado,
        t.id            AS tpl_id,
        t.nombre, t.descripcion, t.tipo, t.impacto,
        t."esAccionCampo", t."moduloDestino", t."moduloTexto", t."moduloDisponible",
        t.cuando, t."porqueSeHace", t."estandarMinimo", t."siNoSeHace",
        ${AREA_CASE} AS area_code
      FROM "pt_tarea_instancias" i
      JOIN "pt_tarea_templates" t ON t.id = i."templateId"
      LEFT JOIN "pt_areas" a ON a.id = t."areaId"
      WHERE i.estado IN ('PENDIENTE','EN_PROGRESO','VENCIDA')
        AND i."migradaATareaId" IS NULL
    ),
    ins AS (
      INSERT INTO "tareas" (
        id, titulo, descripcion, prioridad, area, estado, "tipoOrigen",
        "ptTemplateId", "asignadoAId", fecha, "fechaVencimiento", notas, cuando,
        "porqueSeHace", "estandarMinimo", "siNoSeHace", "moduloDestino", "moduloTexto",
        "moduloDisponible", "esAccionCampo", "requiereEvidencia", "tipoEvidencia",
        "estadoVerificacion", "createdAt", "updatedAt"
      )
      SELECT
        s.new_id, s.nombre, s.descripcion,
        CASE s.impacto WHEN 'critico' THEN 'URGENTE' WHEN 'alto' THEN 'ALTA' ELSE 'MEDIA' END,
        s.area_code,
        CASE s.estado WHEN 'EN_PROGRESO' THEN 'EN_PROGRESO' ELSE 'PENDIENTE' END,
        'PLAN', s.tpl_id, s."responsableId", s."fechaVencimiento", s."fechaVencimiento", s.notas, s.cuando,
        s."porqueSeHace", s."estandarMinimo", s."siNoSeHace", s."moduloDestino", s."moduloTexto",
        s."moduloDisponible", s."esAccionCampo",
        true,
        CASE
          WHEN s."esAccionCampo" THEN 'FOTO'
          WHEN s.tipo = 'ENTREGABLE' THEN 'ARCHIVO'
          WHEN s."moduloDestino" IS NOT NULL THEN 'ENLACE_MODULO'
          ELSE 'NOTA'
        END,
        'NO_REQUIERE', now(), now()
      FROM src s
      RETURNING id
    ),
    upd AS (
      UPDATE "pt_tarea_instancias" i
      SET "migradaATareaId" = s.new_id
      FROM src s
      WHERE i.id = s.inst_id
      RETURNING i.id
    )
    SELECT (SELECT COUNT(*)::int FROM ins) AS insertadas,
           (SELECT COUNT(*)::int FROM upd) AS marcadas
  `)
  console.log('  insertadas:', result[0].insertadas, ' marcadas:', result[0].marcadas)

  console.log('== Conteo Tarea por tipoOrigen (post) ==')
  console.log(await sql.query(
    `SELECT "tipoOrigen", COUNT(*)::int AS total FROM "tareas" GROUP BY "tipoOrigen" ORDER BY total DESC`
  ))
  console.log('== Migración completa ==')
}

main().catch((e) => { console.error(e); process.exit(1) })
