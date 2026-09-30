// Siembra el catálogo de venues desde la lista canónica y enlaza los registros
// históricos (tratos, cotizaciones, proyectos) por alias. Idempotente: se puede
// correr varias veces. Uso: npx tsx scripts/_seed-venues.ts [--apply]
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { VENUES_CANONICOS, NO_ES_VENUE, MAPA_ALIAS, normalizar } from "./_venues-canonicos";

const APPLY = process.argv.includes("--apply");
const envRaw = readFileSync(".env.prod.backup", "utf8");
const m = envRaw.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m)!;
const url = m[1].replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const NO_ES_VENUE_NORM = new Set([...NO_ES_VENUE].map(normalizar));

(async () => {
  // ── 1. Upsert del catálogo por nombre ────────────────────────────────────
  const existentes = await sql.query(`SELECT id, nombre FROM venues`);
  const porNombre = new Map<string, string>(existentes.map((r: any) => [normalizar(r.nombre), r.id]));
  let creados = 0, actualizados = 0;

  for (const v of VENUES_CANONICOS) {
    const id = porNombre.get(normalizar(v.nombre));
    if (id) {
      if (APPLY) {
        await sql.query(
          `UPDATE venues SET tipo=COALESCE(tipo,$1), ciudad=COALESCE(ciudad,$2), estado=COALESCE(estado,$3),
             direccion=COALESCE(direccion,$4), contacto=COALESCE(contacto,$5), notas=COALESCE(notas,$6),
             "updatedAt"=now() WHERE id=$7`,
          [v.tipo, v.ciudad ?? null, v.estado ?? null, v.direccion ?? null, v.contacto ?? null, v.notas ?? null, id]
        );
      }
      actualizados++;
    } else {
      if (APPLY) {
        const r = await sql.query(
          `INSERT INTO venues (id, nombre, tipo, ciudad, estado, direccion, contacto, notas, activo, "createdAt", "updatedAt")
           VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7, true, now(), now()) RETURNING id`,
          [v.nombre, v.tipo, v.ciudad ?? null, v.estado ?? null, v.direccion ?? null, v.contacto ?? null, v.notas ?? null]
        );
        porNombre.set(normalizar(v.nombre), r[0].id);
      }
      creados++;
    }
  }
  console.log(`Catálogo: ${creados} nuevos, ${actualizados} ya existían (${VENUES_CANONICOS.length} canónicos).`);

  if (!APPLY) {
    console.log("\n[DRY RUN] Nada se escribió. Corre con --apply.\n");
  }

  // ── 2. Backfill de venueId por alias ─────────────────────────────────────
  const tablas: Array<{ tabla: string; campo: string }> = [
    { tabla: "tratos", campo: "lugarEstimado" },
    { tabla: "cotizaciones", campo: "lugarEvento" },
    { tabla: "proyectos", campo: "lugarEvento" },
  ];

  const sinMapear = new Map<string, number>();

  for (const { tabla, campo } of tablas) {
    const filas = await sql.query(
      `SELECT id, "${campo}" AS txt FROM "${tabla}" WHERE "${campo}" IS NOT NULL AND trim("${campo}") <> ''`
    );
    let ligados = 0, descartados = 0, huerfanos = 0;

    for (const f of filas as any[]) {
      const norm = normalizar(f.txt);
      if (NO_ES_VENUE_NORM.has(norm)) { descartados++; continue; }
      const canonico = MAPA_ALIAS.get(norm);
      if (!canonico) {
        huerfanos++;
        sinMapear.set(f.txt, (sinMapear.get(f.txt) ?? 0) + 1);
        continue;
      }
      const venueId = porNombre.get(normalizar(canonico));
      if (!venueId) { huerfanos++; continue; }
      if (APPLY) {
        // El texto se re-escribe al nombre canónico: queda como espejo del venue.
        await sql.query(`UPDATE "${tabla}" SET "venueId"=$1, "${campo}"=$2 WHERE id=$3`, [venueId, canonico, f.id]);
      }
      ligados++;
    }
    console.log(`${tabla}.${campo}: ${ligados} ligados · ${descartados} no-son-venue · ${huerfanos} sin mapear (de ${filas.length}).`);
  }

  if (sinMapear.size) {
    console.log("\n⚠ Valores sin mapear (revisar):");
    for (const [k, n] of [...sinMapear].sort((a, b) => b[1] - a[1])) console.log(`   ${n}×  ${JSON.stringify(k)}`);
  } else {
    console.log("\n✓ Todos los valores quedaron clasificados.");
  }
})();
