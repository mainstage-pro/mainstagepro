/**
 * Siembra la línea PREMIUM con el catálogo de G Entertainment (Gabriel Velázquez,
 * Puebla) y arma los productos de audio que salen de sus tres cotizaciones.
 *
 * Precios (decisión de Mauricio, 2026-09-29):
 *   precioRenta    = precio unitario tal como sale en la cotización (precio público)
 *   costoProveedor = ese precio × 0.85 (descuento del 15% de G Entertainment ya aplicado)
 *
 * Idempotente: se identifica cada equipo por (tipo=PREMIUM, marca, modelo).
 *
 *   ENV_FILE=.env.prod.backup npx tsx scripts/seed-premium-g-entertainment.ts [--apply]
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "fs";
import { randomUUID } from "crypto";

const APPLY = process.argv.includes("--apply");
const envRaw = readFileSync(process.env.ENV_FILE || ".env.prod.backup", "utf8");
const raw = envRaw.match(/^DATABASE_URL=(.*)$/m)![1].trim().replace(/^["']|["']$/g, "");
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?");
const sql = neon(url);

const DESCUENTO_G_ENT = 0.85;

const CAT = {
  AUDIO: "cmnrpg62q0001zmiz3ng0wyvb",   // Equipo de Audio
  CONSOLAS: "cmnrpg6360004zmizg97es5ai", // Consolas de Audio
  DJ: "cmnrpg63k0008zmizv1et7seo",       // Consolas/Equipo para DJ
  ILUM: "cmnrpg63a0005zmizqtlam0i4",     // Equipo de Iluminación
  RIGGING: "cmnrpg63g0007zmizdpuod6e0",  // Rigging y Estructuras
  ELEC: "cmnrpg63y000czmizw5qy9hor",     // Corriente Eléctrica
};

type Item = { cat: string; desc: string; marca: string; modelo: string; cant: number; precio: number };

// Lista de Equipos G Entertainment 2026. `precio` = unitario de las cotizaciones;
// 0 = sin precio aún (se captura después). El regulador de voltaje se omite a
// propósito.
const ITEMS: Item[] = [
  // ── Sistema de P.A. ────────────────────────────────────────────────────────
  { cat: CAT.AUDIO, desc: 'Medio 2 x 10" Fuente Puntual 3 Vías Pasivo', marca: "d&b Audiotechnik", modelo: "V7P", cant: 4, precio: 0 },
  { cat: CAT.AUDIO, desc: 'High Power Cardioid Subwoofer 1 x 18" Pasivo', marca: "d&b Audiotechnik", modelo: "VG SUB", cant: 8, precio: 3500 },
  { cat: CAT.AUDIO, desc: "Amplificador 10,400 Watts", marca: "d&b Audiotechnik", modelo: "D40", cant: 2, precio: 3000 },
  { cat: CAT.AUDIO, desc: 'Monitor 1 x 15" Coaxial 2 Vías Pasivo', marca: "d&b Audiotechnik", modelo: "M4", cant: 2, precio: 4000 },
  { cat: CAT.AUDIO, desc: "Procesador de Audio", marca: "L'Acoustics", modelo: "P1", cant: 1, precio: 2500 },
  { cat: CAT.AUDIO, desc: "Procesador de Audio Inmersivo", marca: "L'Acoustics", modelo: "L-ISA II", cant: 1, precio: 0 },
  { cat: CAT.AUDIO, desc: 'Medio 1 x 6" Coaxial Pasivo', marca: "L'Acoustics", modelo: "5XT", cant: 8, precio: 0 },
  { cat: CAT.AUDIO, desc: "Amplificador 4,000 Watts", marca: "L'Acoustics", modelo: "LA4X", cant: 2, precio: 2500 },
  { cat: CAT.AUDIO, desc: 'Medio 2 x 12" Lineal Curvatura Variable Pasivo', marca: "L'Acoustics", modelo: "K3", cant: 18, precio: 3900 },
  { cat: CAT.AUDIO, desc: 'Medio 2 x 8" Lineal Curvatura Variable Pasivo', marca: "L'Acoustics", modelo: "KARA II", cant: 12, precio: 2900 },
  { cat: CAT.AUDIO, desc: 'Medio 1 x 10" Lineal Curvatura Constante Pasivo', marca: "L'Acoustics", modelo: "A10 Wide", cant: 4, precio: 2000 },
  { cat: CAT.AUDIO, desc: 'Medio 1 x 10" Lineal Curvatura Constante Pasivo', marca: "L'Acoustics", modelo: "A10 Focus", cant: 6, precio: 2000 },
  { cat: CAT.AUDIO, desc: 'High Power Subwoofer 1 x 18" Pasivo', marca: "L'Acoustics", modelo: "SB18", cant: 6, precio: 2500 },
  { cat: CAT.AUDIO, desc: 'High Power Subwoofer 1 x 21" Pasivo', marca: "L'Acoustics", modelo: "KS21", cant: 12, precio: 3000 },
  { cat: CAT.AUDIO, desc: 'High Power Subwoofer 2 x 18" Pasivo', marca: "L'Acoustics", modelo: "KS28", cant: 8, precio: 6500 },
  { cat: CAT.AUDIO, desc: 'Medio 6 x 5" Columna Lineal', marca: "L'Acoustics", modelo: "SYVA", cant: 4, precio: 0 },
  { cat: CAT.AUDIO, desc: 'High Power Subwoofer 2 x 12"', marca: "L'Acoustics", modelo: "SYVA LOW", cant: 4, precio: 0 },
  { cat: CAT.AUDIO, desc: "Amplificador 12,000 Watts", marca: "L'Acoustics", modelo: "LA12X", cant: 8, precio: 2900 },
  { cat: CAT.AUDIO, desc: 'Medio 3 Vías 15" x 10" x 1.4" Pasivo', marca: "Funktion One", modelo: "EVO 6E", cant: 2, precio: 0 },
  { cat: CAT.AUDIO, desc: 'Horn Loaded Subwoofer 1 x 21" Pasivo', marca: "Funktion One", modelo: "F121", cant: 6, precio: 0 },
  { cat: CAT.AUDIO, desc: "Procesador de Audio", marca: "Funktion One", modelo: "NST D48S", cant: 1, precio: 0 },
  { cat: CAT.AUDIO, desc: 'Medio 1 x 10" Fuente Puntual Pasivo', marca: "Funktion One", modelo: "F101", cant: 2, precio: 0 },
  { cat: CAT.AUDIO, desc: 'Horn Loaded Subwoofer 2 x 12" Pasivo', marca: "Funktion One", modelo: "MB212", cant: 2, precio: 0 },
  { cat: CAT.AUDIO, desc: "Amplificador 10,000 Watts", marca: "Full Fat Audio", modelo: "FFA10000", cant: 1, precio: 0 },
  { cat: CAT.AUDIO, desc: "Amplificador 9,600 Watts", marca: "Full Fat Audio", modelo: "FFA8000 DSP", cant: 2, precio: 0 },
  { cat: CAT.AUDIO, desc: "Amplificador 4,000 Watts", marca: "Full Fat Audio", modelo: "FFA 6004", cant: 1, precio: 0 },
  { cat: CAT.AUDIO, desc: 'Medio 2 x 10" Fuente Puntual Amplificado', marca: "Amate Audio", modelo: "X102FD", cant: 2, precio: 0 },
  { cat: CAT.AUDIO, desc: 'High Power Double Subwoofer 2 x 18" Amplificado', marca: "Amate Audio", modelo: "X218WFD", cant: 2, precio: 0 },

  // ── Mixer ──────────────────────────────────────────────────────────────────
  { cat: CAT.CONSOLAS, desc: "Mixer 48 Canales Digital (Físicos 24 Preamps)", marca: "DiGiCo", modelo: "S21", cant: 1, precio: 0 },
  { cat: CAT.CONSOLAS, desc: "Mixer 32 Canales Digital (Físicos 16 Preamps)", marca: "Midas", modelo: "M32R", cant: 1, precio: 3500 },

  // ── Iluminación láser ──────────────────────────────────────────────────────
  { cat: CAT.ILUM, desc: "Láser RGB 3.5 Watts", marca: "KVANT", modelo: "CM3400", cant: 4, precio: 0 },
  { cat: CAT.ILUM, desc: "Láser RGBY 30 Watts", marca: "KVANT", modelo: "ATOM XR30", cant: 2, precio: 0 },

  // ── Iluminación arquitectónica ─────────────────────────────────────────────
  { cat: CAT.ILUM, desc: "PAR LED inalámbrico a batería (waterproof)", marca: "Chauvet DJ", modelo: "Freedom Flex H4 IP X6", cant: 24, precio: 0 },
  { cat: CAT.ILUM, desc: "Blinder 1 Ojo LED", marca: "Chauvet DJ", modelo: "STRIKE 1", cant: 10, precio: 0 },

  // ── Sistema DJ ─────────────────────────────────────────────────────────────
  { cat: CAT.DJ, desc: "CDJ 3000 Multi Player", marca: "Pioneer DJ", modelo: "CDJ-3000", cant: 10, precio: 0 },
  { cat: CAT.DJ, desc: "CDJ 3000X Multi Player", marca: "AlphaTheta", modelo: "CDJ-3000X", cant: 8, precio: 0 },
  { cat: CAT.DJ, desc: "Mixer 6 Canales", marca: "Pioneer DJ", modelo: "DJM-V10", cant: 1, precio: 0 },
  { cat: CAT.DJ, desc: "Mixer 6 Canales Long Fader", marca: "Pioneer DJ", modelo: "DJM-V10LF", cant: 1, precio: 0 },
  { cat: CAT.DJ, desc: "Mixer 4 Canales", marca: "AlphaTheta", modelo: "DJM-A9", cant: 1, precio: 0 },
  { cat: CAT.DJ, desc: "Mixer 4 Canales Rotativo", marca: "AlphaTheta", modelo: "Euphonia", cant: 1, precio: 0 },
  { cat: CAT.DJ, desc: "Mixer 4 Canales", marca: "Allen & Heath", modelo: "XONE:96", cant: 1, precio: 0 },
  { cat: CAT.DJ, desc: "Unidad de efectos", marca: "Pioneer DJ", modelo: "RMX-1000", cant: 2, precio: 0 },
  { cat: CAT.DJ, desc: "Unidad de efectos", marca: "AlphaTheta", modelo: "RMX IGNITE", cant: 1, precio: 0 },

  // ── Centro de carga ────────────────────────────────────────────────────────
  { cat: CAT.ELEC, desc: "Centro de Carga Bifásico 110 Amperes", marca: "Motion Laboratories", modelo: "11042kk0510029", cant: 1, precio: 0 },
  { cat: CAT.ELEC, desc: "Centro de Carga Trifásico 180 Amperes", marca: "Maxpower", modelo: "R08UR2311", cant: 1, precio: 1500 },

  // ── Estructuras ────────────────────────────────────────────────────────────
  { cat: CAT.RIGGING, desc: "Elevador para Sistema Lineal de 220 Kg", marca: "VMB", modelo: "TL-A220", cant: 2, precio: 0 },
  { cat: CAT.RIGGING, desc: "Elevador para Sistema Lineal de 420 Kg", marca: "Fantek", modelo: "FT7045", cant: 2, precio: 0 },
];

// Productos armados desde las tres cotizaciones. PA y monitoreo van separados:
// son dos sistemas distintos dentro de la misma cotización. Se dejan fuera la
// consola, el centro de carga, polipastos, staff, mudanza y viáticos.
type Prod = { nombre: string; descripcion: string; dominante: string; items: [string, number][] };
const PRODUCTOS: Prod[] = [
  {
    nombre: "Sistema de audio premium L'Acoustics A10 + KS21",
    descripcion: "4 cajas A10 por lado más 2 A10 de frontfill, con 8 KS21 en arreglo gradiente en línea. Subrenta premium.",
    dominante: "A10 Wide",
    items: [["A10 Wide", 4], ["A10 Focus", 6], ["KS21", 8], ["LA12X", 4], ["P1", 1]],
  },
  {
    nombre: "Sistema de audio premium L'Acoustics KARA II + KS21",
    descripcion: "6 cajas KARA II por lado, con 12 KS21 en arreglo gradiente en línea. Subrenta premium.",
    dominante: "KARA II",
    items: [["KARA II", 12], ["KS21", 12], ["LA12X", 4], ["P1", 1]],
  },
  {
    nombre: "Sistema de audio premium L'Acoustics K3 + KS28",
    descripcion: "6 cajas K3 por lado, con 6 KS28 en arreglo gradiente en línea. Subrenta premium.",
    dominante: "K3",
    items: [["K3", 12], ["KS28", 6], ["LA12X", 4], ["P1", 1]],
  },
  {
    nombre: "Monitoreo de cabina DJ d&b M4 + VG SUB",
    descripcion: "Monitoreo de cabina para DJ con 2 M4 y 2 VG SUB. Subrenta premium.",
    dominante: "M4",
    items: [["M4", 2], ["VG SUB", 2], ["D40", 1]],
  },
  {
    nombre: "Monitoreo de cabina DJ L'Acoustics A10 + SB18",
    descripcion: "Monitoreo de cabina para DJ con 4 A10 y 2 SB18. Subrenta premium.",
    dominante: "A10 Wide",
    items: [["A10 Wide", 4], ["SB18", 2], ["LA4X", 1]],
  },
  {
    nombre: "Monitoreo de cabina DJ L'Acoustics KARA II + SB18",
    descripcion: "Monitoreo de cabina para DJ con 6 KARA II y 4 SB18. Subrenta premium.",
    dominante: "KARA II",
    items: [["KARA II", 6], ["SB18", 4], ["LA4X", 2]],
  },
];

(async () => {
  // ── Proveedor ──────────────────────────────────────────────────────────────
  const existente = await sql`
    select id, nombre, empresa from proveedores
    where lower(empresa) = 'g entertainment' or (lower(nombre) like '%gabriel%vel%')`;

  let proveedorId: string;
  if (existente.length > 0) {
    proveedorId = existente[0].id as string;
    console.log(`Proveedor ya existe: ${existente[0].nombre} / ${existente[0].empresa} (${proveedorId})`);
  } else if (APPLY) {
    proveedorId = randomUUID();
    await sql`
      insert into proveedores (id, nombre, empresa, giro, telefono, notas, activo, prioridad, "createdAt")
      values (${proveedorId}, 'Gabriel Velázquez', 'G Entertainment', 'Renta de equipo',
              '2222999738', 'Catálogo premium: L''Acoustics, d&b, Funktion One, KVANT, Chauvet. Puebla. Descuento del 15% sobre lista.',
              true, 3, now())`;
    console.log(`Proveedor creado: Gabriel Velázquez / G Entertainment (${proveedorId})`);
  } else {
    proveedorId = "(pendiente)";
    console.log("Proveedor a crear: Gabriel Velázquez / G Entertainment · 222 299 9738 · Puebla");
  }

  // ── Equipos ────────────────────────────────────────────────────────────────
  const yaPremium = await sql`
    select id, marca, modelo from equipos where tipo = 'PREMIUM'`;
  const porModelo = new Map<string, string>();
  for (const r of yaPremium) porModelo.set(`${r.marca}|${r.modelo}`, r.id as string);

  let creados = 0;
  for (const it of ITEMS) {
    const key = `${it.marca}|${it.modelo}`;
    if (porModelo.has(key)) {
      console.log(`  = ya existe  ${it.marca} ${it.modelo}`);
      continue;
    }
    const costo = it.precio > 0 ? Math.round(it.precio * DESCUENTO_G_ENT * 100) / 100 : null;
    console.log(`  + ${it.marca} ${it.modelo} · ${it.cant} u · renta ${it.precio} · costo ${costo ?? "—"}`);
    if (!APPLY) continue;
    const id = randomUUID();
    await sql`
      insert into equipos (id, "categoriaId", marca, modelo, descripcion, "cantidadTotal", tipo,
                           "proveedorDefaultId", "precioRenta", "costoProveedor", estado, activo,
                           "createdAt", "updatedAt")
      values (${id}, ${it.cat}, ${it.marca}, ${it.modelo}, ${it.desc}, ${it.cant}, 'PREMIUM',
              ${proveedorId}, ${it.precio}, ${costo}, 'ACTIVO', true, now(), now())`;
    porModelo.set(key, id);
    creados++;
  }
  console.log(`\nEquipos premium creados: ${creados} (de ${ITEMS.length} en la lista)`);

  // ── Productos ──────────────────────────────────────────────────────────────
  const idDe = (modelo: string) => {
    for (const [k, v] of porModelo) if (k.endsWith(`|${modelo}`)) return v;
    return null;
  };
  const precioDe = (modelo: string) => ITEMS.find(i => i.modelo === modelo)?.precio ?? 0;

  for (const p of PRODUCTOS) {
    const dup = await sql`select id from productos where nombre = ${p.nombre}`;
    if (dup.length > 0) { console.log(`  = producto ya existe: ${p.nombre}`); continue; }

    const precioFinal = p.items.reduce((s, [m, c]) => s + c * precioDe(m), 0);
    const costoRef = Math.round(precioFinal * DESCUENTO_G_ENT * 100) / 100;
    console.log(`  + ${p.nombre} → ${precioFinal.toLocaleString("es-MX")} (costo ref ${costoRef.toLocaleString("es-MX")})`);
    for (const [m, c] of p.items) console.log(`      ${c} × ${m}`);
    if (!APPLY) continue;

    const faltan = p.items.filter(([m]) => !idDe(m)).map(([m]) => m);
    if (faltan.length > 0) { console.log(`    ! sin equipo en catálogo: ${faltan.join(", ")} — se omite`); continue; }

    const pid = randomUUID();
    await sql`
      insert into productos (id, nombre, descripcion, categoria, familia, rol, disponibilidad,
                             "proveedorRef", "costoRef", "equipoDominanteId", "precioManual",
                             "precioFinal", activo, orden, "createdAt", "updatedAt")
      values (${pid}, ${p.nombre}, ${p.descripcion}, 'AUDIO',
              ${p.nombre.startsWith("Sistema de audio") ? "sistema-audio" : null},
              'base', 'subrenta', 'Gabriel Velázquez · G Entertainment', ${costoRef},
              ${idDe(p.dominante)}, null, ${precioFinal}, true, 0, now(), now())`;
    let orden = 0;
    for (const [m, c] of p.items) {
      await sql`
        insert into producto_equipos (id, "productoId", "equipoId", cantidad, orden)
        values (${randomUUID()}, ${pid}, ${idDe(m)}, ${c}, ${orden++})`;
    }
  }

  if (!APPLY) console.log("\n(simulación — corre con --apply para escribir)");
  else {
    const resumen = await sql`select tipo, count(*) from equipos group by tipo order by tipo`;
    console.log("\nTIPOS:", JSON.stringify(resumen));
    writeFileSync(
      `scripts/_backup-premium-g-ent-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
      JSON.stringify({ proveedorId, equipos: Object.fromEntries(porModelo) }, null, 2)
    );
  }
})();
