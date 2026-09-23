import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
const envRaw = readFileSync(".env.prod.backup", "utf8");
const m = envRaw.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m)!;
const url = m[1].replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

(async () => {
  // 1. Proyectos donde el granTotal de la cotización enlazada ya no cuadra con
  //    la suma de sus CuentaCobrar (el gap tipo "Lazy Sunday": todas LIQUIDADO
  //    pero el total subió después sin crear una CxC nueva para la diferencia).
  console.log("=== GAP granTotal vs suma CuentaCobrar (por proyecto) ===");
  const gaps = await sql.query(`
    SELECT
      p.id AS "proyectoId", p."numeroProyecto", p.nombre,
      c."numeroCotizacion", c."granTotal",
      COALESCE(SUM(cc.monto), 0) AS "sumaCxc",
      COALESCE(SUM(cc."montoCobrado"), 0) AS "sumaCobrado",
      c."granTotal" - COALESCE(SUM(cc.monto), 0) AS "gap",
      bool_and(cc.estado = 'LIQUIDADO') AS "todasLiquidadas",
      count(cc.id) AS "numCxc"
    FROM proyectos p
    JOIN cotizaciones c ON c.id = p."cotizacionId"
    LEFT JOIN cuentas_cobrar cc ON cc."proyectoId" = p.id OR cc."cotizacionId" = c.id
    GROUP BY p.id, p."numeroProyecto", p.nombre, c."numeroCotizacion", c."granTotal"
    HAVING ABS(c."granTotal" - COALESCE(SUM(cc.monto), 0)) > 1
    ORDER BY ABS(c."granTotal" - COALESCE(SUM(cc.monto), 0)) DESC
  `);
  console.log(JSON.stringify(gaps, null, 2));

  // 2. Movimientos de tipo INGRESO ligados a un proyecto que NUNCA se
  //    convirtieron en Abono (dinero "suelto" invisible para el proyecto).
  console.log("\n=== MOVIMIENTOS INGRESO con proyectoId y SIN abono ===");
  const sueltos = await sql.query(`
    SELECT
      mf.id, mf.fecha, mf.concepto, mf.monto, mf."proyectoId",
      p."numeroProyecto", p.nombre
    FROM movimientos_financieros mf
    JOIN proyectos p ON p.id = mf."proyectoId"
    LEFT JOIN abonos a ON a."movimientoId" = mf.id
    WHERE mf.tipo = 'INGRESO' AND mf."proyectoId" IS NOT NULL AND a.id IS NULL
    ORDER BY mf.fecha DESC
  `);
  console.log(JSON.stringify(sueltos, null, 2));

  console.log("\n=== TOTALES ===");
  console.log(`Proyectos con gap: ${gaps.length}`);
  console.log(`Movimientos sueltos: ${sueltos.length}, suma: ${sueltos.reduce((s: number, r: { monto: number }) => s + Number(r.monto), 0)}`);
})();
