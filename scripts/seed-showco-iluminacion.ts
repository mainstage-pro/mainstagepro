/**
 * Siembra el catálogo de iluminación de SHOWCO SAPI de CV (almacén en Naucalpan,
 * Edo. de México) desde su cotización "EQUIPOS RENTA" del 23 de enero.
 *
 * Decisiones de Mauricio (2026-09-29):
 *   - El precio unitario de la cotización es el que ShowCo nos da a nosotros, y
 *     es el mismo que manejamos: precioRenta = costoProveedor = ese precio.
 *   - La línea se separa por marca: ROBE, Avolites, MA Lighting y Smoke Factory
 *     son PREMIUM; las marcas de casa de ShowCo e HILUX son gama de entrada y
 *     entran como EXTERNO. ShowCo queda de proveedor en los dos casos.
 *   - La cotización no dice cuántas unidades tiene ShowCo, así que cantidad = 0.
 *
 * Idempotente: identifica cada equipo por (marca, modelo).
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/seed-showco-iluminacion.ts [--apply]
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "fs";
import { randomUUID } from "crypto";

const APPLY = process.argv.includes("--apply");
const envRaw = readFileSync(process.env.ENV_FILE || ".env.prod.backup", "utf8");
const raw = envRaw.match(/^DATABASE_URL=(.*)$/m)![1].trim().replace(/^["']|["']$/g, "");
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?");
const sql = neon(url);

const CAT = {
  ILUM: "cmnrpg63a0005zmizqtlam0i4",      // Equipo de Iluminación
  CONS_ILUM: "cmnrpg63d0006zmiz4cve5ru7", // Consolas de Iluminación
  EFECTOS: "cmsq5d75i0000drhy78uf7tlc",   // Efectos especiales
  VIDEO: "cmnrpg63n0009zmiza4xd4lzt",     // Pantalla / Video
};

type Item = { cat: string; desc: string; marca: string; modelo: string; precio: number; tipo: "PREMIUM" | "EXTERNO" };

// Las 20 partidas de la cotización. `precio` = unitario por día.
const ITEMS: Item[] = [
  // ── ROBE (premium) ─────────────────────────────────────────────────────────
  { cat: CAT.ILUM, desc: "Cabeza móvil híbrida beam/spot de descarga", marca: "ROBE", modelo: "MegaPointe", precio: 1900, tipo: "PREMIUM" },
  { cat: CAT.ILUM, desc: "Cabeza móvil wash LED con efecto flower, para exterior (IP)", marca: "ROBE", modelo: "iSpiider", precio: 1500, tipo: "PREMIUM" },
  { cat: CAT.ILUM, desc: "Barra LED motorizada de pixeles", marca: "ROBE", modelo: "Tetra X", precio: 1350, tipo: "PREMIUM" },
  { cat: CAT.ILUM, desc: "Barra LED motorizada de pixeles", marca: "ROBE", modelo: "Tetra 2", precio: 1350, tipo: "PREMIUM" },
  { cat: CAT.ILUM, desc: "Cabeza móvil híbrida beam/spot, para exterior (IP)", marca: "ROBE", modelo: "iPointe", precio: 1900, tipo: "PREMIUM" },
  { cat: CAT.ILUM, desc: "Cabeza móvil spot LED de alta potencia", marca: "ROBE", modelo: "Forte", precio: 1800, tipo: "PREMIUM" },
  { cat: CAT.ILUM, desc: "Cabeza móvil spot LED de alta potencia, para exterior (IP)", marca: "ROBE", modelo: "iForte LTX", precio: 2200, tipo: "PREMIUM" },
  { cat: CAT.ILUM, desc: "Cabeza móvil beam LED de alta potencia, para exterior (IP)", marca: "ROBE", modelo: "iBolt", precio: 2200, tipo: "PREMIUM" },
  { cat: CAT.ILUM, desc: "Sistema de seguimiento remoto para cabezas móviles", marca: "ROBE", modelo: "RoboSpot", precio: 7500, tipo: "PREMIUM" },

  // ── Consolas y control (premium) ───────────────────────────────────────────
  { cat: CAT.CONS_ILUM, desc: "Consola de iluminación Diamond 7", marca: "Avolites", modelo: "D7-215", precio: 11000, tipo: "PREMIUM" },
  { cat: CAT.CONS_ILUM, desc: "Consola de iluminación Diamond 9", marca: "Avolites", modelo: "D9-330", precio: 18000, tipo: "PREMIUM" },
  { cat: CAT.CONS_ILUM, desc: "Interface Titan Net para universos DMX adicionales", marca: "Avolites", modelo: "T3", precio: 4000, tipo: "PREMIUM" },
  { cat: CAT.CONS_ILUM, desc: "Consola de iluminación grandMA3 Light", marca: "MA Lighting", modelo: "grandMA3 Light", precio: 13600, tipo: "PREMIUM" },
  { cat: CAT.CONS_ILUM, desc: "Consola de iluminación grandMA3 Full", marca: "MA Lighting", modelo: "grandMA3 Full", precio: 14000, tipo: "PREMIUM" },

  // ── Efectos (premium) ──────────────────────────────────────────────────────
  { cat: CAT.EFECTOS, desc: "Máquina de haze de tour", marca: "Smoke Factory", modelo: "Tour Hazer II", precio: 1650, tipo: "PREMIUM" },

  // ── Marca de casa de ShowCo e HILUX (gama de entrada → externo) ────────────
  { cat: CAT.ILUM, desc: "Cabeza móvil", marca: "ShowCo", modelo: "Saeta 500", precio: 1200, tipo: "EXTERNO" },
  { cat: CAT.ILUM, desc: "Cabeza móvil beam", marca: "ShowCo", modelo: "Saphira Beam", precio: 650, tipo: "EXTERNO" },
  { cat: CAT.ILUM, desc: "Cabeza móvil", marca: "ShowCo", modelo: "Scorpio 760", precio: 800, tipo: "EXTERNO" },
  { cat: CAT.ILUM, desc: "Cabeza móvil", marca: "HILUX", modelo: "Cyclops II", precio: 700, tipo: "EXTERNO" },
  { cat: CAT.VIDEO, desc: "Pantalla de LED pitch 8.9, sección de 6 m", marca: "HILUX", modelo: "IORN", precio: 950, tipo: "EXTERNO" },
];

(async () => {
  // ── Proveedor ──────────────────────────────────────────────────────────────
  const existente = await sql`
    select id, nombre, empresa from proveedores
    where lower(empresa) like '%showco%' or lower(nombre) like '%showco%'`;

  let proveedorId: string;
  if (existente.length > 0) {
    proveedorId = existente[0].id as string;
    console.log(`Proveedor ya existe: ${existente[0].nombre} / ${existente[0].empresa} (${proveedorId})`);
  } else if (APPLY) {
    proveedorId = randomUUID();
    await sql`
      insert into proveedores (id, nombre, empresa, giro, notas, activo, prioridad, "createdAt")
      values (${proveedorId}, 'ShowCo', 'SHOWCO SAPI de CV', 'Renta de equipo',
              'Especialistas en audio, iluminación y video. Almacén en Naucalpan, Edo. de México. Precios de renta POR DÍA, LAB en su almacén: envío y riesgos de traslado corren por cuenta nuestra. Sujeto a disponibilidad, hay que apartar fecha con anticipación. Falta capturar contacto y teléfono.',
              true, 2, now())`;
    console.log(`Proveedor creado: ShowCo / SHOWCO SAPI de CV (${proveedorId})`);
  } else {
    proveedorId = "(pendiente)";
    console.log("Proveedor a crear: ShowCo / SHOWCO SAPI de CV · Naucalpan · sin contacto");
  }

  // ── Equipos ────────────────────────────────────────────────────────────────
  const marcas = [...new Set(ITEMS.map(i => i.marca))];
  const yaExisten = await sql`
    select id, marca, modelo, tipo from equipos where marca = any(${marcas})`;
  const porModelo = new Map<string, string>();
  for (const r of yaExisten) porModelo.set(`${r.marca}|${r.modelo}`, r.id as string);

  const respaldo: unknown[] = [];
  let creados = 0;
  for (const it of ITEMS) {
    const key = `${it.marca}|${it.modelo}`;
    if (porModelo.has(key)) {
      console.log(`  = ya existe  ${it.marca} ${it.modelo}`);
      continue;
    }
    console.log(`  + [${it.tipo}] ${it.marca} ${it.modelo} · renta ${it.precio} · costo ${it.precio}`);
    if (!APPLY) continue;
    const id = randomUUID();
    await sql`
      insert into equipos (id, "categoriaId", marca, modelo, descripcion, "cantidadTotal", tipo,
                           "proveedorDefaultId", "precioRenta", "costoProveedor", estado, activo,
                           "createdAt", "updatedAt")
      values (${id}, ${it.cat}, ${it.marca}, ${it.modelo}, ${it.desc}, 0, ${it.tipo},
              ${proveedorId}, ${it.precio}, ${it.precio}, 'ACTIVO', true, now(), now())`;
    porModelo.set(key, id);
    respaldo.push({ id, ...it });
    creados++;
  }

  console.log(`\nEquipos creados: ${creados} de ${ITEMS.length}`);
  console.log(`  PREMIUM: ${ITEMS.filter(i => i.tipo === "PREMIUM").length} · EXTERNO: ${ITEMS.filter(i => i.tipo === "EXTERNO").length}`);

  if (APPLY && respaldo.length > 0) {
    const f = `scripts/_backup-showco-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    writeFileSync(f, JSON.stringify({ proveedorId, equipos: respaldo }, null, 2));
    console.log(`Respaldo: ${f}`);
  }
  if (!APPLY) console.log("\n(simulación — corre con --apply para escribir)");
})();
