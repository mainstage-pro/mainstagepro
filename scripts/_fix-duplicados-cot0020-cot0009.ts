import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "fs";

const envFile = process.env.ENV_FILE || ".env.prod.backup";
const envRaw = readFileSync(envFile, "utf8");
const match = envRaw.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error(`No DATABASE_URL en ${envFile}`);
const raw = match[1].trim().replace(/^["']|["']$/g, "");
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

// Líneas duplicadas exactas (huella del bug de doble-submit de la cotización),
// confirmadas por _audit-duplicados-todas-cotizaciones.ts. En ambos casos son
// líneas OPERACION_TECNICA idénticas (mismo rolTecnicoId/precio/costo), no
// tocan subtotalEquiposBruto/paquetes ni el % de descuento aplicado.
const CASOS = [
  { cotizacionId: "cmohniz5700014u13mmagdg4p", numero: "COT-0020", borrarIds: ["cmoiv7sbt000as26dalw8rscy", "cmoiv7sbt000ds26d54lgrg3t", "cmoiv7sbt000fs26dvh7822d3"] },
  { cotizacionId: "cmoakp9bz0003htx28e3tvu5a", numero: "COT-0009", borrarIds: ["cmohloq5z000v9ays4fmhz4g7"] },
];

(async () => {
  const backups: any[] = [];

  for (const caso of CASOS) {
    const lineasBorrar = (await sql.query(
      `SELECT id, tipo, descripcion, subtotal, "costoUnitario", cantidad, dias FROM cotizacion_lineas WHERE id = ANY($1)`,
      [caso.borrarIds]
    )) as any[];
    if (lineasBorrar.length !== caso.borrarIds.length) {
      throw new Error(`${caso.numero}: se esperaban ${caso.borrarIds.length} líneas a borrar, se encontraron ${lineasBorrar.length}`);
    }

    const cot = (await sql.query(`SELECT * FROM cotizaciones WHERE id = $1`, [caso.cotizacionId]))[0] as any;
    if (!cot) throw new Error(`${caso.numero}: cotización no encontrada`);

    const deltaSubtotal = lineasBorrar.reduce((s, l) => s + Number(l.subtotal), 0);
    const deltaCosto = lineasBorrar.reduce((s, l) => s + Number(l.costoUnitario) * Number(l.cantidad) * Number(l.dias), 0);

    // Solo tocamos subtotalOperacion/total/granTotal/costos — ninguna otra línea
    // ni % de descuento cambia porque las duplicadas son todas OPERACION_TECNICA.
    const subtotalOperacionNew = Number(cot.subtotalOperacion) - deltaSubtotal;
    const totalNew = Number(cot.total) - deltaSubtotal;
    const montoIvaNew = cot.aplicaIva ? Math.round(totalNew * 0.16 * 100) / 100 : 0;
    const granTotalNew = totalNew + montoIvaNew;
    const costosTotalesEstimadosNew = Number(cot.costosTotalesEstimados) - deltaCosto;
    const utilidadEstimadaNew = totalNew - costosTotalesEstimadosNew;
    const porcentajeUtilidadNew = totalNew > 0 ? utilidadEstimadaNew / totalNew : 0;

    backups.push({
      caso: caso.numero,
      lineasBorradas: lineasBorrar,
      cotizacionAntes: {
        subtotalOperacion: cot.subtotalOperacion, total: cot.total, montoIva: cot.montoIva, granTotal: cot.granTotal,
        costosTotalesEstimados: cot.costosTotalesEstimados, utilidadEstimada: cot.utilidadEstimada, porcentajeUtilidad: cot.porcentajeUtilidad,
      },
      cotizacionDespues: {
        subtotalOperacion: subtotalOperacionNew, total: totalNew, montoIva: montoIvaNew, granTotal: granTotalNew,
        costosTotalesEstimados: costosTotalesEstimadosNew, utilidadEstimada: utilidadEstimadaNew, porcentajeUtilidad: porcentajeUtilidadNew,
      },
    });

    await sql.query(`DELETE FROM cotizacion_lineas WHERE id = ANY($1)`, [caso.borrarIds]);
    await sql.query(
      `UPDATE cotizaciones SET
         "subtotalOperacion" = $1, total = $2, "montoIva" = $3, "granTotal" = $4,
         "costosTotalesEstimados" = $5, "utilidadEstimada" = $6, "porcentajeUtilidad" = $7,
         "updatedAt" = now()
       WHERE id = $8`,
      [subtotalOperacionNew, totalNew, montoIvaNew, granTotalNew, costosTotalesEstimadosNew, utilidadEstimadaNew, porcentajeUtilidadNew, caso.cotizacionId]
    );

    console.log(`${caso.numero}: borradas ${lineasBorrar.length} líneas duplicadas (delta $${deltaSubtotal}). granTotal ${cot.granTotal} → ${granTotalNew}`);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = `scripts/_backup-fix-duplicados-cot0020-cot0009-${ts}.json`;
  writeFileSync(backupFile, JSON.stringify(backups, null, 2));
  console.log(`Backup → ${backupFile}`);
})();
