import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureGlosarioTabla } from "@/lib/migraciones-lazy";
import { normalizarTermino, type TipoObjetivo } from "@/lib/glosario";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Objetivo {
  id: string;
  tipoObjetivo: TipoObjetivo;
  nombre: string;
  detalle: string;
  grupo: string;
}

const SYSTEM = `Eres un experto en producción técnica de eventos en México (audio, iluminación, video, estructura, DJ).
Recibes una lista JSON de objetos del inventario/catálogo. Para CADA objeto debes proponer MUCHAS formas coloquiales
en que un cliente, vendedor o técnico podría referirse a él al pedir una cotización: sinónimos, jerga del gremio,
apócopes, singular y plural, con y sin marca, errores comunes de dedo. Español de México.

REGLAS CRÍTICAS:
- Devuelve ÚNICAMENTE un objeto JSON (sin markdown, sin explicación): { "<id>": ["termino1","termino2",...], ... }
- Cada término debe ser inequívoco para ESE objeto. Un mismo término NO puede aparecer en dos objetos distintos.
- No inventes términos genéricos que apliquen a varios objetos (ej. "luz", "equipo", "cable" a secas si hay varios).
  Prefiere términos específicos ("beam", "cabeza móvil beam", "beams", "spot beam").
- Entre 6 y 16 términos por objeto. Todo en minúsculas.`;

function extraerJson(txt: string): Record<string, unknown> | null {
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function objetivosDe(tipo: TipoObjetivo, objetivoId?: string): Promise<Objetivo[]> {
  if (tipo === "EQUIPO") {
    const eq = await prisma.equipo.findMany({
      where: { activo: true, ...(objetivoId ? { id: objetivoId } : {}) },
      select: { id: true, descripcion: true, marca: true, modelo: true, categoria: { select: { nombre: true } } },
    });
    return eq.map((e) => ({
      id: e.id,
      tipoObjetivo: "EQUIPO",
      nombre: [e.marca, e.modelo].filter(Boolean).join(" ") || e.descripcion,
      detalle: e.descripcion,
      grupo: e.categoria?.nombre ?? "",
    }));
  }
  if (tipo === "ACCESORIO") {
    const ac = await prisma.accesorio.findMany({
      where: { activo: true, ...(objetivoId ? { id: objetivoId } : {}) },
      select: { id: true, nombre: true, marca: true, modelo: true, descripcion: true },
    });
    return ac.map((a) => ({
      id: a.id,
      tipoObjetivo: "ACCESORIO",
      nombre: a.nombre,
      detalle: [a.marca, a.modelo, a.descripcion].filter(Boolean).join(" "),
      grupo: "Accesorios",
    }));
  }
  const rl = await prisma.rolTecnico.findMany({
    where: { activo: true, ...(objetivoId ? { id: objetivoId } : {}) },
    select: { id: true, nombre: true, disciplina: true, descripcion: true },
  });
  return rl.map((r) => ({
    id: r.id,
    tipoObjetivo: "ROL_TECNICO",
    nombre: r.nombre,
    detalle: [r.disciplina, r.descripcion].filter(Boolean).join(" "),
    grupo: "Personal",
  }));
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "IA no configurada (falta ANTHROPIC_API_KEY)" }, { status: 400 });
  await ensureGlosarioTabla();

  const body = await req.json().catch(() => ({}));
  const tipos: TipoObjetivo[] = body?.tipoObjetivo
    ? [body.tipoObjetivo]
    : ["EQUIPO", "ACCESORIO", "ROL_TECNICO"];
  const objetivoId: string | undefined = body?.objetivoId || undefined;
  const soloFaltantes: boolean = body?.soloFaltantes !== false; // por defecto, solo los que no tienen términos

  // Objetos objetivo
  let objetivos: Objetivo[] = [];
  for (const t of tipos) objetivos = objetivos.concat(await objetivosDe(t, objetivoId));

  // Estado actual del glosario: términos ya usados (unicidad global) y qué objetos ya tienen.
  const existentes = await prisma.glosarioTermino.findMany({ select: { termino: true, objetivoId: true } });
  const usados = new Set(existentes.map((r) => r.termino));
  const conTerminos = new Set(existentes.map((r) => r.objetivoId));
  if (soloFaltantes) objetivos = objetivos.filter((o) => !conTerminos.has(o.id));

  if (objetivos.length === 0) {
    return NextResponse.json({ ok: true, creados: 0, colisiones: 0, mensaje: "Nada por generar." });
  }

  const client = new Anthropic({ apiKey });
  let colisiones = 0;
  let creados = 0;

  // Lotes de 35 objetos por llamada; el set `usados` se comparte entre lotes.
  // Se inserta AL CERRAR CADA LOTE (no al final): así el avance se persiste aunque la
  // función se corte por timeout de Vercel, y un reintento con soloFaltantes reanuda.
  const LOTE = 35;
  for (let i = 0; i < objetivos.length; i += LOTE) {
    const lote = objetivos.slice(i, i + LOTE);
    const nuevos: { termino: string; original: string; tipoObjetivo: string; objetivoId: string }[] = [];
    const payload = lote.map((o) => ({ id: o.id, nombre: o.nombre, tipo: o.tipoObjetivo, detalle: o.detalle, grupo: o.grupo }));

    let mapa: Record<string, unknown> | null = null;
    try {
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        system: SYSTEM,
        messages: [{ role: "user", content: `Objetos:\n${JSON.stringify(payload)}` }],
      });
      const raw = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      mapa = extraerJson(raw);
    } catch {
      mapa = null;
    }
    if (!mapa) continue;

    for (const o of lote) {
      const arr = mapa[o.id];
      if (!Array.isArray(arr)) continue;
      for (const t of arr) {
        if (typeof t !== "string") continue;
        const termino = normalizarTermino(t);
        if (!termino) continue;
        if (usados.has(termino)) {
          colisiones++;
          continue;
        }
        usados.add(termino);
        nuevos.push({ termino, original: t.trim(), tipoObjetivo: o.tipoObjetivo, objetivoId: o.id });
      }
    }

    if (nuevos.length) {
      const res = await prisma.glosarioTermino.createMany({
        data: nuevos.map((n) => ({ ...n, fuente: "ia" })),
        skipDuplicates: true,
      });
      creados += res.count;
    }
  }

  return NextResponse.json({ ok: true, creados, colisiones, objetos: objetivos.length });
}
