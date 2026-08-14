import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import { CURRICULO, TEMA_ESTRELLA, type Topic } from "./data/curriculo-capacitacion";

// Siembra el currículo de capacitación (118 temas + tema estrella) en prod.
// - No toca las sesiones existentes (idempotente por título dentro de la categoría).
// - Crea la categoría "Dirección" si no existe; reutiliza el resto.
// - numero de las nuevas sesiones arranca en 101 para no colisionar con las viejas.
const ENV = process.env.ENVF || ".env.prod.backup";
config({ path: ENV });
const raw = process.env.DATABASE_URL!;
const url = raw.replace(/[?&](pgbouncer|connection_limit)=[^&]*/g, "").replace(/\?&/, "?").replace(/\?$/, "");
const sql = neon(url);

const NUMERO_BASE = 101;
const DRY = process.env.DRY === "1";

async function getCategoriaId(slug: string, nombre: string, orden: number): Promise<string> {
  const rows = (await sql.query(`SELECT id FROM categorias_capacitacion WHERE slug = $1 LIMIT 1`, [slug])) as any[];
  if (rows.length) return rows[0].id;
  const id = `cat-${slug}`;
  if (DRY) { console.log(`[dry] crearía categoría ${slug}`); return id; }
  await sql.query(
    `INSERT INTO categorias_capacitacion (id, nombre, slug, color, icono, orden, activo, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,true, now(), now())
     ON CONFLICT (slug) DO NOTHING`,
    [id, nombre, slug, "#B3985B", "GraduationCap", orden],
  );
  console.log(`+ categoría ${slug}`);
  return id;
}

async function existingTitles(categoriaId: string): Promise<Set<string>> {
  const rows = (await sql.query(`SELECT titulo FROM sesiones_capacitacion WHERE "categoriaId" = $1`, [categoriaId])) as any[];
  return new Set(rows.map((r) => String(r.titulo).trim().toLowerCase()));
}

type InsertPayload = {
  numero: number; titulo: string; bloque: string; bloqueLetra: string; descripcion: string;
  objetivos: string[]; puntosBase: string[]; subArea: string; categoriaId: string; duracion: number;
  publicoObjetivo?: string; prerrequisitos?: string[]; procedimiento?: string[];
  erroresComunes?: string[]; checklistAplicacion?: string[]; recursos?: string[];
};

async function insertSesion(p: InsertPayload) {
  const id = `sesc-${randomUUID()}`;
  if (DRY) { console.log(`[dry] ${p.numero} ${p.bloque} › ${p.subArea} · ${p.titulo}`); return; }
  await sql.query(
    `INSERT INTO sesiones_capacitacion
      (id, numero, titulo, bloque, "bloqueLetra", descripcion, objetivos, "puntosBase", "puntosEditados",
       "subArea", "publicoObjetivo", prerrequisitos, procedimiento, "erroresComunes", "checklistAplicacion", recursos,
       duracion, estado, "categoriaId", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, now(), now())`,
    [
      id, p.numero, p.titulo, p.bloque, p.bloqueLetra, p.descripcion,
      p.objetivos, p.puntosBase, [],
      p.subArea, p.publicoObjetivo ?? null, p.prerrequisitos ?? [], p.procedimiento ?? [],
      p.erroresComunes ?? [], p.checklistAplicacion ?? [], p.recursos ?? [],
      p.duracion, "pendiente", p.categoriaId,
    ],
  );
}

async function main() {
  let numero = NUMERO_BASE;
  let created = 0;
  let skipped = 0;

  // Cache de categoría → set de títulos existentes, para idempotencia.
  const seenByCat = new Map<string, Set<string>>();

  for (let a = 0; a < CURRICULO.length; a++) {
    const area = CURRICULO[a];
    const categoriaId = await getCategoriaId(area.categoriaSlug, area.categoriaNombre, a);
    if (!seenByCat.has(categoriaId)) seenByCat.set(categoriaId, await existingTitles(categoriaId));
    const seen = seenByCat.get(categoriaId)!;

    for (const sub of area.subs) {
      for (const topic of sub.topics) {
        const key = topic.t.trim().toLowerCase();
        if (seen.has(key)) { skipped++; numero++; continue; }
        await insertSesion({
          numero, titulo: topic.t, bloque: area.area, bloqueLetra: area.letra,
          descripcion: topic.d, objetivos: topic.obj, puntosBase: topic.pts,
          subArea: sub.sub, categoriaId, duracion: 45,
        });
        seen.add(key);
        created++; numero++;
      }
    }
  }

  // ── Tema estrella (ficha completa) ─────────────────────────────────────────
  {
    const te = TEMA_ESTRELLA;
    const cat = CURRICULO.find((x) => x.categoriaSlug === te.categoriaSlug)!;
    const categoriaId = await getCategoriaId(te.categoriaSlug, cat.categoriaNombre, 4);
    if (!seenByCat.has(categoriaId)) seenByCat.set(categoriaId, await existingTitles(categoriaId));
    const seen = seenByCat.get(categoriaId)!;
    const key = te.topic.t.trim().toLowerCase();
    if (seen.has(key)) { skipped++; }
    else {
      await insertSesion({
        numero, titulo: te.topic.t, bloque: cat.area, bloqueLetra: cat.letra,
        descripcion: te.topic.d, objetivos: te.topic.obj, puntosBase: te.topic.pts,
        subArea: te.subArea, categoriaId, duracion: te.duracion,
        publicoObjetivo: te.publicoObjetivo, prerrequisitos: te.prerrequisitos,
        procedimiento: te.procedimiento, erroresComunes: te.erroresComunes,
        checklistAplicacion: te.checklistAplicacion, recursos: te.recursos,
      });
      created++; numero++;
      console.log(`★ tema estrella sembrado con ficha completa`);
    }
  }

  console.log(`[${ENV}]${DRY ? " (DRY)" : ""} creados: ${created} · omitidos (ya existían): ${skipped}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
