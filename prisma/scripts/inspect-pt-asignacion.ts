import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('== tipoAsignacion x puestoDefault (templates activas) ==')
  console.log(await sql.query(`
    SELECT "tipoAsignacion", "puestoDefault", "areaAsignada",
           COUNT(*)::int AS n,
           COUNT("responsableId")::int AS con_resp
    FROM "pt_tarea_templates" WHERE activa = true
    GROUP BY "tipoAsignacion", "puestoDefault", "areaAsignada"
    ORDER BY n DESC
  `))

  console.log('== PTArea nombres ==')
  console.log(await sql.query(`SELECT id, nombre FROM "pt_areas" ORDER BY nombre`))

  console.log('== user.area distinct (activos) ==')
  console.log(await sql.query(`SELECT area, COUNT(*)::int AS n FROM "users" WHERE active = true GROUP BY area`))

  console.log('== templates activas: area relation nombre ==')
  console.log(await sql.query(`
    SELECT a.nombre AS area, COUNT(*)::int AS n
    FROM "pt_tarea_templates" t JOIN "pt_areas" a ON a.id = t."areaId"
    WHERE t.activa = true GROUP BY a.nombre ORDER BY n DESC
  `))

  console.log('== instancias abiertas por estado ==')
  console.log(await sql.query(`
    SELECT estado, COUNT(*)::int AS n FROM "pt_tarea_instancias"
    GROUP BY estado ORDER BY n DESC
  `))
}
main().catch(e => { console.error(e); process.exit(1) })
