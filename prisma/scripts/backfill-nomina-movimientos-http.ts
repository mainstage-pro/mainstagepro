import { neon } from '@neondatabase/serverless'

// Backfill (HTTP/443): crea el MovimientoFinanciero (GASTO) faltante de cada fila de
// nómina marcada PAGADO que quedó sin movimiento (bug: el toggle del proyecto solo
// cambiaba estadoPago). Para NO duplicar pagos hechos por el flujo agregado
// /api/pagos-personal (que ya creó movimientos "Nómina — …"), se SALTAN los proyectos
// que ya tienen algún movimiento de nómina. Dry-run por defecto; aplica con APPLY=1.
const sql = neon(process.env.DATABASE_URL!)
const APPLY = process.env.APPLY === '1'
const SOLO_PROYECTO = process.env.PROYECTO_ID || null

function nuevoId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12)
}

interface Fila {
  id: string
  tecnicoId: string
  tarifaAcordada: number
  proyectoId: string
  proyecto_nombre: string
  tecnico_nombre: string
  rol_evento: string | null
  rol_bd: string | null
}

async function main() {
  console.log(`== Backfill nómina → movimientos (${APPLY ? 'APLICAR' : 'DRY-RUN'}) ==`)

  const filas = (await sql.query(
    `SELECT pp.id, pp."tecnicoId", pp."tarifaAcordada", pp."proyectoId", pp."rolEnEvento" AS rol_evento,
            p.nombre AS proyecto_nombre, t.nombre AS tecnico_nombre, rt.nombre AS rol_bd
     FROM proyecto_personal pp
     JOIN proyectos p ON p.id = pp."proyectoId"
     JOIN tecnicos t ON t.id = pp."tecnicoId"
     LEFT JOIN roles_tecnicos rt ON rt.id = pp."rolTecnicoId"
     WHERE pp."estadoPago" = 'PAGADO' AND pp."movimientoId" IS NULL
       AND pp."tecnicoId" IS NOT NULL AND pp."tarifaAcordada" > 0
       ${SOLO_PROYECTO ? `AND pp."proyectoId" = '${SOLO_PROYECTO}'` : ''}`
  )) as unknown as Fila[]

  if (!filas.length) { console.log('No hay filas pendientes de backfill.'); return }

  // Agrupar por proyecto
  const porProyecto = new Map<string, Fila[]>()
  for (const f of filas) {
    if (!porProyecto.has(f.proyectoId)) porProyecto.set(f.proyectoId, [])
    porProyecto.get(f.proyectoId)!.push(f)
  }

  let creados = 0, saltadosProyectos = 0, totalMonto = 0
  for (const [proyectoId, fs] of porProyecto) {
    const existentes = (await sql.query(
      `SELECT COUNT(*)::int AS n FROM movimientos_financieros
       WHERE "proyectoId" = '${proyectoId}' AND tipo = 'GASTO' AND concepto ILIKE 'Nómina%'`
    )) as unknown as { n: number }[]
    if ((existentes[0]?.n ?? 0) > 0) {
      saltadosProyectos++
      console.log(`  SALTADO proyecto ${fs[0].proyecto_nombre} — ya tiene ${existentes[0].n} movimiento(s) de nómina (revisar manual)`)
      continue
    }

    console.log(`  Proyecto ${fs[0].proyecto_nombre}: ${fs.length} fila(s), $${fs.reduce((s, f) => s + f.tarifaAcordada, 0).toLocaleString()}`)
    for (const f of fs) {
      const rol = f.rol_evento || f.rol_bd || 'Técnico'
      const concepto = `Nómina — ${f.tecnico_nombre} · ${rol} | ${f.proyecto_nombre}`
      console.log(`    - ${f.tecnico_nombre} · ${rol}: $${f.tarifaAcordada.toLocaleString()}`)
      totalMonto += f.tarifaAcordada
      creados++
      if (APPLY) {
        const movId = nuevoId()
        await sql.query(
          `INSERT INTO movimientos_financieros (id, fecha, tipo, concepto, monto, "metodoPago", "proyectoId", "estatusConciliacion", "createdAt")
           VALUES ($1, NOW(), 'GASTO', $2, $3, 'TRANSFERENCIA', $4, 'PENDIENTE', NOW())`,
          [movId, concepto, f.tarifaAcordada, f.proyectoId]
        )
        await sql.query(`UPDATE proyecto_personal SET "movimientoId" = $1 WHERE id = $2`, [movId, f.id])
        // Liquidar una CxP pendiente del técnico en el proyecto, si existe
        await sql.query(
          `UPDATE cuentas_pagar SET estado = 'LIQUIDADO', "movimientoId" = $1, "fechaPagoReal" = NOW(), "montoPagado" = monto
           WHERE id = (
             SELECT id FROM cuentas_pagar
             WHERE "tecnicoId" = $2 AND "proyectoId" = $3 AND "tipoAcreedor" = 'TECNICO'
               AND estado = 'PENDIENTE' AND "movimientoId" IS NULL
             LIMIT 1
           )`,
          [movId, f.tecnicoId, f.proyectoId]
        )
      }
    }
  }

  console.log(`\n== Resumen ==`)
  console.log(`  Movimientos ${APPLY ? 'creados' : 'a crear'}: ${creados}  ($${totalMonto.toLocaleString()})`)
  console.log(`  Proyectos saltados (ya con nómina): ${saltadosProyectos}`)
  if (!APPLY) console.log(`  (dry-run — corre con APPLY=1 para aplicar)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
