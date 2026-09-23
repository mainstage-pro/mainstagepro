import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";

const envFile = process.env.ENV_FILE || ".env.prod.backup";
const envRaw = readFileSync(envFile, "utf8");
const match = envRaw.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error(`No DATABASE_URL en ${envFile}`);
const raw = match[1].trim().replace(/^["']|["']$/g, "");
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const PROYECTO_ID = "cmsgbz3ke0004lg1p0zqtt5za"; // PRY-2026-082 Lazy Sunday
const MOVIMIENTO_ID = "cmtorr4wa0035j646lqqmvqat"; // INGRESO $10,100 sin abono
const GAP = 10100;

function cuid() {
  // No es un cuid real, pero es único y suficiente como PK cuid() string.
  return "c" + randomBytes(12).toString("hex");
}

(async () => {
  const proyectoRows = (await sql.query(
    `SELECT id, "clienteId", "cotizacionId", "numeroProyecto", nombre FROM proyectos WHERE id = $1`,
    [PROYECTO_ID]
  )) as any[];
  const proyecto = proyectoRows[0];
  if (!proyecto) throw new Error("Proyecto no encontrado");

  const movRows = (await sql.query(
    `SELECT id, fecha, monto, "metodoPago", "cuentaDestinoId", "creadoPor" FROM movimientos_financieros WHERE id = $1`,
    [MOVIMIENTO_ID]
  )) as any[];
  const mov = movRows[0];
  if (!mov) throw new Error("Movimiento no encontrado");
  if (Number(mov.monto) !== GAP) throw new Error(`Monto del movimiento (${mov.monto}) no coincide con el gap esperado (${GAP})`);

  // Verificar que el movimiento sigue sin Abono (no correr dos veces)
  const abonoExistente = (await sql.query(`SELECT id FROM abonos WHERE "movimientoId" = $1`, [MOVIMIENTO_ID])) as any[];
  if (abonoExistente.length > 0) throw new Error("El movimiento ya tiene un Abono — no se debe correr de nuevo");

  // Verificar que el gap sigue existiendo (granTotal vs suma CxC)
  const cxcActuales = (await sql.query(
    `SELECT COALESCE(SUM(monto),0) AS suma FROM cuentas_cobrar WHERE "proyectoId" = $1`,
    [PROYECTO_ID]
  )) as any[];
  const cotizacionRows = (await sql.query(`SELECT "granTotal" FROM cotizaciones WHERE id = $1`, [proyecto.cotizacionId])) as any[];
  const granTotal = Number(cotizacionRows[0]?.granTotal ?? 0);
  const sumaActual = Number(cxcActuales[0].suma);
  const gapActual = Math.round((granTotal - sumaActual) * 100) / 100;
  if (Math.abs(gapActual - GAP) > 0.5) throw new Error(`Gap actual (${gapActual}) ya no coincide con el esperado (${GAP}) — revisar antes de continuar`);

  const backup = { proyecto, movimiento: mov, granTotal, sumaActual, gapActual };
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = `scripts/_backup-reconcile-lazy-sunday-${ts}.json`;
  writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`Backup → ${backupFile}`);

  const cxcId = cuid();
  const abonoId = cuid();

  await sql.query(
    `INSERT INTO cuentas_cobrar
      (id, "clienteId", "proyectoId", "cotizacionId", concepto, "tipoPago", monto, "fechaCompromiso", "fechaCobroReal", estado, "montoCobrado", "cuentaDestinoId", notas, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'OTRO', $6, $7, $7, 'LIQUIDADO', $6, $8, $9, now(), now())`,
    [
      cxcId,
      proyecto.clienteId,
      PROYECTO_ID,
      proyecto.cotizacionId,
      `Ajuste de granTotal — ${proyecto.numeroProyecto} ${proyecto.nombre}`,
      GAP,
      mov.fecha,
      mov.cuentaDestinoId,
      "Reconciliación 2026-09-22: el granTotal de la cotización subió después de que todas las CxC originales quedaran LIQUIDADO, dejando un ingreso ya cobrado (movimiento existente) sin CxC que lo respaldara. Ver scripts/_reconcile-lazy-sunday-cxc.ts.",
    ]
  );

  await sql.query(
    `INSERT INTO abonos
      (id, "cuentaCobrarId", monto, fecha, "metodoPago", notas, "cuentaDestinoId", "movimientoId", "creadoPor", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
    [
      abonoId,
      cxcId,
      GAP,
      mov.fecha,
      mov.metodoPago,
      "Enlazado retroactivamente a movimiento ya existente para reconciliar el gap de granTotal (ver scripts/_reconcile-lazy-sunday-cxc.ts).",
      mov.cuentaDestinoId,
      MOVIMIENTO_ID,
      mov.creadoPor,
    ]
  );

  console.log(`CxC creada: ${cxcId}`);
  console.log(`Abono creado: ${abonoId}, enlazado a movimiento ${MOVIMIENTO_ID}`);
  console.log("Listo. Verificando resultado...");

  const verif = (await sql.query(
    `SELECT COALESCE(SUM(monto),0) AS suma, COALESCE(SUM("montoCobrado"),0) AS cobrado FROM cuentas_cobrar WHERE "proyectoId" = $1`,
    [PROYECTO_ID]
  )) as any[];
  console.log(`Suma CxC ahora: ${verif[0].suma} (granTotal: ${granTotal})`);
  console.log(`Suma cobrado ahora: ${verif[0].cobrado}`);
})();
