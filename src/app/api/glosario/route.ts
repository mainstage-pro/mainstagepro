import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { ensureGlosarioTabla } from "@/lib/migraciones-lazy";
import { normalizarTermino, type TipoObjetivo } from "@/lib/glosario";

export const runtime = "nodejs";

const TIPOS: TipoObjetivo[] = ["EQUIPO", "ACCESORIO", "ROL_TECNICO"];

// Nombre legible de cada objeto del catálogo para mostrar en la UI del glosario.
async function nombresObjetivos() {
  const [equipos, accesorios, roles] = await Promise.all([
    prisma.equipo.findMany({
      where: { activo: true },
      select: { id: true, descripcion: true, marca: true, modelo: true, categoria: { select: { nombre: true } } },
    }),
    prisma.accesorio.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, marca: true, modelo: true },
    }),
    prisma.rolTecnico.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, disciplina: true },
    }),
  ]);
  return {
    EQUIPO: equipos.map((e) => ({
      id: e.id,
      nombre: [e.marca, e.modelo].filter(Boolean).join(" ") || e.descripcion,
      detalle: e.descripcion,
      grupo: e.categoria?.nombre ?? "Sin categoría",
    })),
    ACCESORIO: accesorios.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      detalle: [a.marca, a.modelo].filter(Boolean).join(" "),
      grupo: "Accesorios",
    })),
    ROL_TECNICO: roles.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      detalle: r.disciplina ?? "",
      grupo: "Personal / Servicios",
    })),
  } as const;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureGlosarioTabla();

  const [terminos, objetivos] = await Promise.all([
    prisma.glosarioTermino.findMany({ orderBy: [{ tipoObjetivo: "asc" }, { termino: "asc" }] }),
    nombresObjetivos(),
  ]);

  return NextResponse.json({ terminos, objetivos });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  await ensureGlosarioTabla();

  const body = await req.json().catch(() => ({}));
  const original = typeof body?.termino === "string" ? body.termino.trim() : "";
  const tipoObjetivo = body?.tipoObjetivo as TipoObjetivo;
  const objetivoId = typeof body?.objetivoId === "string" ? body.objetivoId : "";

  if (!original) return NextResponse.json({ error: "Falta el término" }, { status: 400 });
  if (!TIPOS.includes(tipoObjetivo)) return NextResponse.json({ error: "tipoObjetivo inválido" }, { status: 400 });
  if (!objetivoId) return NextResponse.json({ error: "Falta el objetivo" }, { status: 400 });

  const termino = normalizarTermino(original);
  if (!termino) return NextResponse.json({ error: "Término vacío tras normalizar" }, { status: 400 });

  try {
    const row = await prisma.glosarioTermino.create({
      data: { termino, original, tipoObjetivo, objetivoId, fuente: "manual" },
    });
    return NextResponse.json({ termino: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique") || msg.includes("P2002")) {
      const existente = await prisma.glosarioTermino.findUnique({ where: { termino } });
      return NextResponse.json(
        { error: `"${termino}" ya está asignado a otro objeto. Un término no puede repetirse.`, conflicto: existente },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
