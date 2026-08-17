/**
 * Liga equipo de proveedor externo a los adicionales que le corresponden.
 *
 * Las piezas se agregan como `obligatorio: false` porque son variantes alternativas
 * (cinco pistas de baile, cinco capacidades de generador): el vendedor marca la que
 * el cliente eligió. Con `true` la cotización bajaría las cinco de golpe.
 *
 * Uso:  npx tsx scripts/ligar-externos-adicionales.ts          (simulación)
 *       npx tsx scripts/ligar-externos-adicionales.ts --aplicar
 */
import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "node:fs";

type Linea = { tipo: string; referenciaId: string; cantidad: number; obligatorio: boolean };

// adicional (nombre exacto) → categoría de equipo externo de la que toma sus piezas.
// `solo` restringe dentro de la categoría cuando otro adicional ya cubre el resto:
// la bazuca y los micrófonos de instrumento tienen el suyo propio.
const MAPA: { adicional: string; categoria: string; solo?: RegExp }[] = [
  { adicional: "Pista de baile", categoria: "Pistas de baile" },
  { adicional: "Planta de luz", categoria: "Corriente Eléctrica" },
  { adicional: "DJ Booth", categoria: "DJ Booths" },
  { adicional: "Chisperos para entrada/vals", categoria: "Efectos especiales", solo: /chispero|pirotecnia/i },
  { adicional: "Pantalla LED", categoria: "Pantalla / Video" },
  { adicional: "Monitoreo in-ear", categoria: "Monitoreo In-Ear" },
  { adicional: "Reproductores y mixer DJ", categoria: "Consolas/Equipo para DJ" },
  { adicional: "Microfonos", categoria: "Sistemas de Microfonía", solo: /inal[áa]mbric/i },
  { adicional: "Microfonos para instrumentos", categoria: "Sistemas de Microfonía", solo: /condensador|boundary|bombo/i },
  { adicional: "Entarimado", categoria: "Entarimado", solo: /entarimado/i },
  { adicional: "Pinspot para iluminacion puntual en mesas", categoria: "Equipo de Iluminación", solo: /pinspot/i },
];

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  const sql = neon(process.env.DATABASE_URL!);

  const adics = (await sql`SELECT id, nombre, composicion FROM adicionales WHERE activo ORDER BY orden`) as
    { id: string; nombre: string; composicion: string | null }[];

  const externos = (await sql`
    SELECT e.id, e.descripcion, e."precioRenta", c.nombre cat
    FROM equipos e JOIN categoria_equipos c ON c.id = e."categoriaId"
    WHERE e.tipo = 'EXTERNO' AND e.activo AND e."estadoMigracion" IS NULL`) as
    { id: string; descripcion: string; precioRenta: number; cat: string }[];

  const respaldo = adics.map((a) => ({ id: a.id, nombre: a.nombre, composicion: a.composicion }));
  const ruta = `scripts/_backup-adicionales-composicion-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(ruta, JSON.stringify(respaldo, null, 2));
  console.log(`Respaldo: ${ruta}\n`);

  let totalPzas = 0;
  const cambios: { id: string; nombre: string; comp: Linea[]; nuevas: string[] }[] = [];

  for (const a of adics) {
    const regla = MAPA.find((m) => m.adicional === a.nombre);
    if (!regla) continue;

    let comp: Linea[] = [];
    try { comp = JSON.parse(a.composicion || "[]"); } catch { comp = []; }
    const yaEsta = new Set(comp.filter((c) => c.tipo === "equipo").map((c) => c.referenciaId));

    const candidatos = externos.filter(
      (e) => e.cat === regla.categoria && !yaEsta.has(e.id) && (regla.solo?.test(e.descripcion) ?? true),
    );
    if (!candidatos.length) continue;

    const nuevas = candidatos.map((e) => `${e.descripcion} ($${e.precioRenta})`);
    comp.push(...candidatos.map((e) => ({ tipo: "equipo", referenciaId: e.id, cantidad: 1, obligatorio: false })));
    cambios.push({ id: a.id, nombre: a.nombre, comp, nuevas });
    totalPzas += candidatos.length;
  }

  for (const c of cambios) {
    console.log(`${c.nombre}  (+${c.nuevas.length})`);
    for (const n of c.nuevas) console.log(`    + ${n}`);
  }
  console.log(`\n${cambios.length} adicionales · ${totalPzas} piezas externas`);

  if (!aplicar) { console.log("\nSimulación. Corre con --aplicar para escribir."); return; }

  for (const c of cambios) {
    await sql`UPDATE adicionales SET composicion = ${JSON.stringify(c.comp)}, "updatedAt" = now() WHERE id = ${c.id}`;
  }
  console.log("\nAplicado.");
}
main();
