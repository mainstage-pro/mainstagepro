/**
 * Foto de los pagos a personal antes/después de tocar el tabulador.
 *
 *   npx tsx scripts/foto-pagos-personal.ts            → escribe la foto y la resume
 *   npx tsx scripts/foto-pagos-personal.ts <archivo>  → compara contra una foto previa
 *
 * Sirve para demostrar que un cambio de tarifas no movió ningún monto ya
 * comprometido: compara renglón por renglón por id, no por totales.
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

config({ path: process.env.ENVF || ".env.prod.backup" });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

type Fila = {
  id: string;
  proyecto: string;
  fechaEvento: string | null;
  estadoProyecto: string;
  tecnico: string | null;
  rol: string | null;
  participacion: string | null;
  jornada: string | null;
  tarifaAcordada: number | null;
  estadoPago: string;
  tieneMovimiento: boolean;
};

async function leer(): Promise<Fila[]> {
  const rows = await sql`
    select pp.id, p.nombre proyecto, p."fechaEvento", p.estado "estadoProyecto",
           t.nombre tecnico, r.nombre rol, pp.participacion, pp.jornada,
           pp."tarifaAcordada", pp."estadoPago", (pp."movimientoId" is not null) "tieneMovimiento"
    from proyecto_personal pp
    join proyectos p on p.id = pp."proyectoId"
    left join tecnicos t on t.id = pp."tecnicoId"
    left join roles_tecnicos r on r.id = pp."rolTecnicoId"
    order by pp.id`;
  return rows.map((r: Record<string, unknown>) => ({
    ...r,
    fechaEvento: r.fechaEvento ? new Date(r.fechaEvento as string).toISOString().slice(0, 10) : null,
    tarifaAcordada: r.tarifaAcordada == null ? null : Number(r.tarifaAcordada),
  })) as Fila[];
}

function comprometida(f: Fila): boolean {
  return f.estadoPago !== "PENDIENTE" || f.tieneMovimiento;
}

async function comparar(archivo: string) {
  const antes: Fila[] = JSON.parse(fs.readFileSync(archivo, "utf8")).filas;
  const ahora = await leer();
  const porId = new Map(ahora.map(f => [f.id, f]));

  const movidos: string[] = [];
  const perdidos: string[] = [];
  for (const a of antes) {
    const b = porId.get(a.id);
    if (!b) { perdidos.push(`${a.tecnico ?? "sin técnico"} · ${a.proyecto} · $${a.tarifaAcordada}`); continue; }
    if (a.tarifaAcordada !== b.tarifaAcordada) {
      const sello = comprometida(a) ? "⚠ COMPROMETIDA" : "pendiente";
      movidos.push(`${sello} | ${a.tecnico ?? "sin técnico"} · ${a.proyecto} · ${a.tarifaAcordada} → ${b.tarifaAcordada}`);
    }
  }
  const nuevos = ahora.filter(f => !antes.some(a => a.id === f.id));

  console.log(`Comparando contra ${path.basename(archivo)} (${antes.length} renglones)`);
  console.log(`  renglones nuevos: ${nuevos.length}`);
  console.log(`  renglones borrados: ${perdidos.length}`);
  console.log(`  montos movidos: ${movidos.length}`);
  for (const m of movidos) console.log(`    ${m}`);
  for (const p of perdidos) console.log(`    BORRADO: ${p}`);
  const graves = movidos.filter(m => m.startsWith("⚠")).length + perdidos.length;
  console.log(graves === 0 ? "\n✓ Nada comprometido se movió." : `\n✗ ${graves} cambios sobre renglones ya comprometidos.`);
}

async function main() {
  const archivo = process.argv[2];
  if (archivo) return comparar(archivo);

  const filas = await leer();
  const dir = path.join(process.cwd(), "scripts", "data");
  fs.mkdirSync(dir, { recursive: true });
  const destino = path.join(dir, `foto-pagos-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(destino, JSON.stringify({ tomada: new Date().toISOString(), filas }, null, 2));

  const hoy = new Date().toISOString().slice(0, 10);
  const vivas = filas.filter(f => !comprometida(f) && (f.fechaEvento === null || f.fechaEvento >= hoy));
  const total = (fs_: Fila[]) => fs_.reduce((s, f) => s + (f.tarifaAcordada ?? 0), 0);

  console.log(`Foto guardada: ${path.relative(process.cwd(), destino)}`);
  console.log(`  ${filas.length} renglones · ${filas.filter(comprometida).length} comprometidos ($${total(filas.filter(comprometida)).toLocaleString("es-MX")})`);
  console.log(`\nRenglones vivos (pendientes con evento de hoy en adelante): ${vivas.length} · $${total(vivas).toLocaleString("es-MX")}`);
  for (const f of vivas) {
    console.log(`  ${f.fechaEvento ?? "sin fecha"} | ${f.proyecto} | ${f.tecnico ?? "SIN ASIGNAR"} | ${f.rol ?? "sin rol"} | ${f.participacion ?? "-"}/${f.jornada ?? "-"} | ${f.tarifaAcordada == null ? "SIN TARIFA" : "$" + f.tarifaAcordada.toLocaleString("es-MX")}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
