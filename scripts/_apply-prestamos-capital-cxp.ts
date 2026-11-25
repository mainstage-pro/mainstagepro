// Préstamos de capital históricos → cuenta por pagar.
// - Enlaza (esPrestamo + movimientoOrigenId) las CxP que Mauricio ya había capturado a mano.
// - Crea CxP "por asignar" (fecha 2026-12-31, igual que las manuales) para los préstamos sin CxP.
// - Siembra el tipo DEVOLUCION_DE_PRESTAMO y le pasa la categoría "Pago Préstamo".
// Uso: npx tsx scripts/_apply-prestamos-capital-cxp.ts [--apply]
/* eslint-disable @typescript-eslint/no-explicit-any */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { writeFileSync } from "fs";
config({ path: process.env.ENV_FILE || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const sql = neon(raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, ""));
const APPLY = process.argv.includes("--apply");

// movimiento del préstamo → CxP manual existente
const ENLACES: Record<string, string> = {
  cmsp7vdcs0004y8t3561zp4oa: "cmr9thgr200018rab7zxicqpq", // Renta Carretas Julio 18,700
  cmrjrvg5u000112jko3tqeq27: "cmrjsbfcq000312jkdaqjn74f", // Nómina 13 jul 26,480
  cmrnqn28c000311toc0lc00qp: "cmsjd11dd0003136q57ht9z9u", // Anticipo Marco Supraterra 10,000 (liquidada)
  cmrnqjrnc0001sp41c7ncjb1i: "cmrnqfxvh00095dh789418wux", // Anticipo Pantalla Supraterra 17,750 (liquidada)
  cmrnqof2m0001afed6bj3epuv: "cmtucyphm0001as3v70fclx9o", // Obra de Bodega 15,000
  cms3jv0n50001kktfeiyr0p76: "cmsjd47c300019xl6q3f0euui", // Reparaciones 3,450
  cms3jx7cn0003kktfuwyowizq: "cms3qomib0001tg7x17t207hd", // Nóminas Sem 3 Julio y Renders 27,600
  cms3qbnvn0003oha3oyfzmhci: "cms3qih0j00016kl86ucoyqzi", // Pago freelance 2,000
  cms7xvnb90001vs91mmgk4nz4: "cms7w00me0003pc5cmro71lz0", // Liquidación Pantalla Supraterra 17,500 (liquidada)
  cms7y8lqv000161xhnlpf6jwi: "cms7u90j60001wofoebhiwwcb", // Nóminas Freelance Sem 4 Julio 19,400
  cmsgbtecx0001nc481uvlfxva: "cmsjd631s00039xl6bs2hq2qt", // Nómina Carlos Luna 500
  cmtudykr30001w0507gru54qm: "cmtt8llyf0001uc1okt3ftztt", // Renta Carretas + Agua 19,600 ↔ CxP 18,700 (difiere 900)
  cmuecm8b60009gqk926y81geo: "cmu1s6qxt0003hkh60soqdals", // Viáticos XVs Susana 2,000 ↔ Gastos Operativos Tequis
};

async function main() {
  const movs = (await sql.query(
    `SELECT mf.id, mf.fecha, mf.concepto, mf.monto, mf."proyectoId" FROM movimientos_financieros mf
     JOIN categorias_financieras c ON c.id = mf."categoriaId"
     WHERE c.nombre = 'Préstamo' AND mf.tipo = 'APORTACION_DE_CAPITAL' ORDER BY mf.fecha`,
  )) as any[];
  const cxpIds = Object.values(ENLACES);
  const cxps = (await sql.query(`SELECT * FROM cuentas_pagar WHERE id = ANY($1)`, [cxpIds])) as any[];
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(`scripts/_backup-prestamos-capital-cxp-${stamp}.json`, JSON.stringify({ movs, cxps }, null, 2));

  const ligados = (await sql.query(
    `SELECT "movimientoOrigenId" FROM cuentas_pagar WHERE "movimientoOrigenId" IS NOT NULL`,
  )) as any[];
  const yaLigados = new Set(ligados.map((r) => r.movimientoOrigenId));
  const cat = ((await sql.query(`SELECT id FROM categorias_financieras WHERE nombre = 'Pago Préstamo'`)) as any[])[0];

  console.log(APPLY ? "== APLICANDO ==" : "== SIMULACIÓN (usa --apply) ==");
  if (APPLY) {
    await sql.query(
      `INSERT INTO tipos_movimiento (id, clave, nombre, naturaleza, "afectaResultado", color, orden, sistema, activo)
       VALUES ('tipo_devolucion_prestamo', 'DEVOLUCION_DE_PRESTAMO', 'Devolución de préstamo', 'SALIDA', false, 'teal', 6, false, true)
       ON CONFLICT (clave) DO NOTHING`,
    );
    if (cat) await sql.query(`UPDATE categorias_financieras SET tipo = 'DEVOLUCION_DE_PRESTAMO' WHERE id = $1`, [cat.id]);
  }
  console.log(`tipo DEVOLUCION_DE_PRESTAMO + categoría "Pago Préstamo" pasa a ese tipo`);

  let creadas = 0;
  let total = 0;
  for (const m of movs) {
    if (yaLigados.has(m.id)) {
      console.log(`  ya ligado   ${m.concepto}`);
      continue;
    }
    const cxpId = ENLACES[m.id];
    if (cxpId) {
      const c = cxps.find((x) => x.id === cxpId);
      const aviso = c && c.monto !== m.monto ? "  << montos distintos" : "";
      console.log(`  ENLAZA      ${m.concepto} (${m.monto}) -> CxP "${c?.concepto}" (${c?.monto}, ${c?.estado})${aviso}`);
      if (APPLY) {
        await sql.query(
          `UPDATE cuentas_pagar SET "esPrestamo" = true, "movimientoOrigenId" = $1,
             "tipoAcreedor" = CASE WHEN "proveedorId" IS NOT NULL THEN 'PROVEEDOR' WHEN "socioId" IS NOT NULL THEN 'SOCIO' ELSE "tipoAcreedor" END,
             "categoriaId" = COALESCE("categoriaId", $2), "updatedAt" = NOW()
           WHERE id = $3`,
          [m.id, cat?.id ?? null, cxpId],
        );
      }
    } else {
      creadas++;
      total += m.monto;
      console.log(`  CREA CxP    ${m.concepto} (${m.monto}) - acreedor por asignar, vence 2026-12-31`);
      if (APPLY) {
        await sql.query(
          `INSERT INTO cuentas_pagar (id, "tipoAcreedor", concepto, monto, "montoPagado", "montoCompensado", "fechaCompromiso", estado,
             "esPrestamo", "movimientoOrigenId", "proyectoId", "categoriaId", "esDeuda", "esReparto", "esNomina", "createdAt", "updatedAt")
           VALUES ($1, 'SOCIO', $2, $3, 0, 0, '2026-12-31T06:00:00Z', 'PENDIENTE', true, $4, $5, $6, false, false, false, NOW(), NOW())`,
          [`cxpprest_${m.id}`, `Préstamo — ${String(m.concepto).trim()}`, m.monto, m.id, m.proyectoId, cat?.id ?? null],
        );
      }
    }
  }
  console.log(`\nNuevas CxP: ${creadas} por ${total.toLocaleString("es-MX")}`);
}
main();
