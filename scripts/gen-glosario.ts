import { neon } from "@neondatabase/serverless";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

const envRaw = readFileSync(".env.prod.backup", "utf8");
const dbUrl = envRaw.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m)![1]
  .replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const apiKey = readFileSync(".env.vercel.prod.tmp", "utf8").match(/^ANTHROPIC_API_KEY=["']?([^"'\n]+)["']?/m)![1];
const sql = neon(dbUrl);
const anthropic = new Anthropic({ apiKey });

function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

const SYSTEM = `Eres un experto en producción técnica de eventos en México (audio, iluminación, video, estructura, DJ).
Recibes una lista JSON de objetos del inventario/catálogo. Para CADA objeto propón TODAS las formas coloquiales
imaginables en que un cliente, vendedor o técnico podría referirse a él al pedir una cotización, para que NUNCA
quede sin reconocer: sinónimos, jerga del gremio, apócopes/abreviaturas ("sub", "cabeza"), singular y plural,
con y sin marca, con y sin modelo, marca+modelo pegado y separado ("ekx12p"/"ekx 12p"), formas con y sin acentos,
y errores de dedo/escritura frecuentes ("bosina", "bafles", "suvwoofer", "iluminacion"). Español de México.
REGLAS CRÍTICAS:
- Devuelve ÚNICAMENTE un objeto JSON (sin markdown): { "<id>": ["termino1","termino2",...], ... }
- Cada término inequívoco para ESE objeto. Un término NO puede aparecer en dos objetos distintos:
  si una palabra podría referirse a varios, NO la incluyas (que el humano desambigüe).
- Evita genéricos que apliquen a varios (ej "luz", "equipo", "cable" a secas). Prefiere específicos.
- Entre 15 y 30 términos por objeto. Minúsculas. Sin duplicados dentro del objeto.`;

function extraerJson(txt: string): Record<string, unknown> | null {
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

type Obj = { id: string; tipo: string; nombre: string; detalle: string; grupo: string };

async function cargarObjetivos(): Promise<Obj[]> {
  const eq = await sql.query(
    `SELECT e.id, e.descripcion, e.marca, e.modelo, c.nombre AS categoria
       FROM equipos e LEFT JOIN categoria_equipos c ON c.id=e."categoriaId"
      WHERE e.activo=true`
  );
  const ac = await sql.query(
    `SELECT id, nombre, marca, modelo, descripcion FROM accesorios WHERE activo=true`
  );
  const rl = await sql.query(
    `SELECT id, nombre, disciplina, descripcion FROM roles_tecnicos WHERE activo=true`
  );
  const objs: Obj[] = [];
  for (const e of eq) objs.push({ id: e.id, tipo: "EQUIPO", nombre: [e.marca, e.modelo].filter(Boolean).join(" ") || e.descripcion, detalle: e.descripcion || "", grupo: e.categoria || "" });
  for (const a of ac) objs.push({ id: a.id, tipo: "ACCESORIO", nombre: a.nombre, detalle: [a.marca, a.modelo, a.descripcion].filter(Boolean).join(" "), grupo: "Accesorios" });
  for (const r of rl) objs.push({ id: r.id, tipo: "ROL_TECNICO", nombre: r.nombre, detalle: [r.disciplina, r.descripcion].filter(Boolean).join(" "), grupo: "Personal" });
  return objs;
}

async function insertar(rows: { termino: string; original: string; tipo: string; objetivoId: string }[]) {
  const CHUNK = 80;
  let creados = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const vals: string[] = [];
    const params: string[] = [];
    chunk.forEach((r, j) => {
      const b = j * 4;
      vals.push(`(gen_random_uuid()::text, $${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, 0, 'ia', true)`);
      params.push(r.termino, r.original, r.tipo, r.objetivoId);
    });
    const res = await sql.query(
      `INSERT INTO glosario_terminos (id, termino, original, "tipoObjetivo", "objetivoId", peso, fuente, activo)
       VALUES ${vals.join(",")} ON CONFLICT (termino) DO NOTHING`,
      params
    );
    creados += (res as unknown as { length?: number }).length ?? 0;
  }
  return creados;
}

(async () => {
  const objetivos = await cargarObjetivos();
  console.log(`Objetos a procesar: ${objetivos.length}`);
  const usados = new Set<string>();
  const nuevos: { termino: string; original: string; tipo: string; objetivoId: string }[] = [];
  let colisiones = 0;

  const LOTE = 20;
  for (let i = 0; i < objetivos.length; i += LOTE) {
    const lote = objetivos.slice(i, i + LOTE);
    const payload = lote.map((o) => ({ id: o.id, nombre: o.nombre, tipo: o.tipo, detalle: o.detalle, grupo: o.grupo }));
    let mapa: Record<string, unknown> | null = null;
    try {
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6", max_tokens: 16000, system: SYSTEM,
        messages: [{ role: "user", content: `Objetos:\n${JSON.stringify(payload)}` }],
      });
      const raw = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
      mapa = extraerJson(raw);
    } catch (e) { console.error("Lote falló:", e); }
    if (!mapa) { console.log(`Lote ${i}-${i + lote.length}: sin respuesta`); continue; }
    for (const o of lote) {
      const arr = mapa[o.id];
      if (!Array.isArray(arr)) continue;
      for (const t of arr) {
        if (typeof t !== "string") continue;
        const termino = normalizar(t);
        if (!termino) continue;
        if (usados.has(termino)) { colisiones++; continue; }
        usados.add(termino);
        nuevos.push({ termino, original: t.trim(), tipo: o.tipo, objetivoId: o.id });
      }
    }
    console.log(`Lote ${i}-${i + lote.length}: acumulados ${nuevos.length} términos`);
  }

  const creados = await insertar(nuevos);
  console.log(`\n✅ Insertados: ${creados} términos · colisiones evitadas: ${colisiones}`);
  const porTipo = await sql.query(`SELECT "tipoObjetivo", COUNT(*)::int AS n FROM glosario_terminos GROUP BY "tipoObjetivo"`);
  console.log("Estado final:", porTipo);
})().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
