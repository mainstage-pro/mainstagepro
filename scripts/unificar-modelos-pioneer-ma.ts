/**
 * Unifica la nomenclatura y la foto de los equipos que tenemos registrados dos veces
 * (uno por proveedor), siguiendo el precedente de RCF HDL 6A: marca, modelo,
 * descripción y foto IDÉNTICAS entre los dos renglones; lo único que los distingue
 * es `tipo`, `proveedorDefaultId`, `cantidadTotal` y los precios.
 *
 * Criterio elegido por Mauricio (2026-09-29):
 *   - Manda NUESTRA grafía: marca "Pioneer" y modelos con espacios (CDJ 3000, DJM V10…).
 *   - Manda NUESTRA foto (el recorte nobg / el PNG estático que ya traía el renglón).
 *   - "Grand MA" se normaliza a "MA Lighting · grandMA3 Compact XT" (no se fusiona: es
 *     otra consola, solo estaba escrita con otra marca).
 *
 * NO fusiona renglones: cada proveedor conserva el suyo.
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/unificar-modelos-pioneer-ma.ts [--apply]
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "fs";

const APPLY = process.argv.includes("--apply");
const envRaw = readFileSync(process.env.ENV_FILE || ".env.prod.backup", "utf8");
const raw = envRaw.match(/^DATABASE_URL=(.*)$/m)![1].trim().replace(/^["']|["']$/g, "");
const sql = neon(raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?"));

/** Pares gemelos: el renglón `canonId` presta marca, modelo, descripción y foto al `ajustarId`. */
const PARES: { etiqueta: string; canonId: string; ajustarId: string }[] = [
  { etiqueta: "CDJ 3000", canonId: "cmnr07no8002vhc8pu3wmdivd", ajustarId: "3e9c166e-48d3-475f-9bf4-6e9d2f4d0aa2" },
  { etiqueta: "CDJ 3000 X", canonId: "cmnr07no7002thc8pppc7f32j", ajustarId: "1c99ce8c-aa8c-40d7-9fab-d2f3743f02e6" },
  { etiqueta: "DJM A9", canonId: "cmnr07no9002zhc8pas8r9q3p", ajustarId: "daabab14-75fe-48e7-95a2-022670be6bc3" },
  { etiqueta: "DJM V10", canonId: "cmnr07no8002xhc8p2bi8afy1", ajustarId: "48d84fe8-9921-4327-bb1a-62dd5396655c" },
  { etiqueta: "RMX 1000", canonId: "cmnr07noe0035hc8pef76znql", ajustarId: "28ebceee-f820-424b-859f-c97440bd2522" },
];

/** Sin gemelo: solo se corrige la grafía de marca/modelo, conservan su foto y descripción. */
const RENOMBRES: { id: string; marca: string; modelo: string; nota: string }[] = [
  { id: "1a783021-4edd-4809-bcd6-3b8467c234fc", marca: "Pioneer", modelo: "DJM V10 LF", nota: "hermana de la DJM V10, misma familia" },
];

type Row = {
  id: string; marca: string | null; modelo: string | null; descripcion: string; tipo: string;
  imagenUrl: string | null; tratamiento: string | null; cantidadTotal: number;
  precioRenta: string | null; costoProveedor: string | null; proveedor: string | null;
};

const fmt = (r: Row) =>
  `${r.tipo.padEnd(8)} ${String(r.marca).padEnd(12)} ${String(r.modelo).padEnd(14)} ` +
  `cant=${String(r.cantidadTotal).padEnd(3)} renta=${String(r.precioRenta ?? "—").padEnd(7)} ` +
  `costo=${String(r.costoProveedor ?? "—").padEnd(7)} prov=${r.proveedor ?? "—"}`;

(async () => {
  const renombres = [...RENOMBRES];

  // El "Grand MA" se localiza por marca porque su id no estaba a la vista al escribir el script.
  const grandMa = (await sql`
    select id from equipos where activo = true and marca = 'Grand MA' and modelo = 'MA3 Compact XT'
  `) as { id: string }[];
  for (const g of grandMa) {
    renombres.push({ id: g.id, marca: "MA Lighting", modelo: "grandMA3 Compact XT", nota: "marca mal escrita; sigue siendo otra consola" });
  }

  const ids = [...PARES.flatMap((p) => [p.canonId, p.ajustarId]), ...renombres.map((r) => r.id)];
  const rows = (await sql`
    select e.id, e.marca, e.modelo, e.descripcion, e.tipo, e."imagenUrl", e.tratamiento,
           e."cantidadTotal", e."precioRenta", e."costoProveedor", p.nombre as proveedor
      from equipos e left join proveedores p on p.id = e."proveedorDefaultId"
     where e.id = any(${ids})
  `) as Row[];
  const porId = new Map(rows.map((r) => [r.id, r]));

  const faltantes = ids.filter((i) => !porId.has(i));
  if (faltantes.length) {
    console.error(`⚠ No se encontraron estos ids (¿ya cambiaron?): ${faltantes.join(", ")}`);
    process.exit(1);
  }

  console.log("=== PARES A UNIFICAR (nombre + descripción + foto de nuestro renglón) ===");
  for (const p of PARES) {
    const canon = porId.get(p.canonId)!;
    const ajustar = porId.get(p.ajustarId)!;
    console.log(`\n· ${p.etiqueta}`);
    console.log(`   se queda  ${fmt(canon)}`);
    console.log(`   se ajusta ${fmt(ajustar)}`);
    console.log(`             marca  "${ajustar.marca}" → "${canon.marca}"`);
    console.log(`             modelo "${ajustar.modelo}" → "${canon.modelo}"`);
    console.log(`             desc   "${ajustar.descripcion}" → "${canon.descripcion}"`);
    console.log(`             foto   → ${canon.imagenUrl}`);
    if (!canon.imagenUrl) console.log("             ⚠ el renglón canónico no tiene foto");
    if (!Number(ajustar.precioRenta)) console.log(`             ⚠ precioRenta = ${ajustar.precioRenta} (falta capturar el precio de este proveedor)`);
  }

  console.log("\n=== SOLO GRAFÍA (no tienen gemelo, conservan foto y descripción) ===");
  for (const r of renombres) {
    const eq = porId.get(r.id)!;
    console.log(`   ${fmt(eq)}\n      → "${r.marca} · ${r.modelo}"   (${r.nota})`);
  }

  if (!APPLY) {
    console.log("\n(simulación — corre con --apply para escribir)");
    return;
  }

  const respaldo = rows.map((r) => ({
    id: r.id, marca: r.marca, modelo: r.modelo, descripcion: r.descripcion,
    imagenUrl: r.imagenUrl, tratamiento: r.tratamiento,
  }));
  const f = `scripts/_backup-unificar-pioneer-ma-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(f, JSON.stringify(respaldo, null, 2));
  console.log(`\nRespaldo: ${f}`);

  for (const p of PARES) {
    const canon = porId.get(p.canonId)!;
    await sql`
      update equipos
         set marca = ${canon.marca}, modelo = ${canon.modelo}, descripcion = ${canon.descripcion},
             "imagenUrl" = ${canon.imagenUrl}, tratamiento = ${canon.tratamiento}, "updatedAt" = now()
       where id = ${p.ajustarId}`;
    console.log(`  ✓ ${p.etiqueta} unificado`);
  }
  for (const r of renombres) {
    await sql`
      update equipos set marca = ${r.marca}, modelo = ${r.modelo}, "updatedAt" = now() where id = ${r.id}`;
    console.log(`  ✓ ${r.marca} ${r.modelo} renombrado`);
  }
  console.log("\nListo.");
})();
