import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { TIPOS_BLOQUE, type TipoBloque } from "@/lib/cronologia-evento";

type BloqueEntrada = {
  tipo?: string;
  fase?: string | null;
  proveedorEventoId?: string | null;
  fecha?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  titulo?: string | null;
  detalle?: string | null;
  responsable?: string | null;
  involucrados?: string | null;
};

/** "YYYY-MM-DD" → Date a mediodía UTC, para que el día no se corra por zona horaria. */
function aFecha(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00.000Z`) : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const bloques = await prisma.proyectoBloqueTiempo.findMany({
    where: { proyectoId: id },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ bloques });
}

/**
 * Reemplaza todos los bloques del proyecto cuyo `tipo` esté en `tipos`. El resto queda
 * intacto: así la tabla de programa y la de soundcheck se guardan por separado sin
 * pisarse, y los bloques de proveedor (que se editan en su propio panel) nunca se tocan.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const tipos: string[] = Array.isArray(body.tipos) ? body.tipos.filter((t: string) => TIPOS_BLOQUE.includes(t as TipoBloque)) : [];
  const entradas: BloqueEntrada[] = Array.isArray(body.bloques) ? body.bloques : [];
  if (!tipos.length) return NextResponse.json({ error: "Falta indicar los tipos a reemplazar" }, { status: 400 });

  const filas = entradas
    .filter((b) => tipos.includes(b.tipo ?? ""))
    // Una fila en blanco que el usuario todavía no llena no merece persistirse.
    .filter((b) => (b.titulo?.trim() || b.horaInicio?.trim() || b.detalle?.trim()))
    .map((b, i) => ({
      proyectoId: id,
      tipo: b.tipo as string,
      fase: b.fase?.trim() || null,
      proveedorEventoId: b.proveedorEventoId || null,
      fecha: aFecha(b.fecha),
      horaInicio: b.horaInicio?.trim() || null,
      horaFin: b.horaFin?.trim() || null,
      titulo: b.titulo?.trim() || "",
      detalle: b.detalle?.trim() || null,
      responsable: b.responsable?.trim() || null,
      involucrados: b.involucrados?.trim() || null,
      orden: i,
    }));

  await prisma.$transaction([
    prisma.proyectoBloqueTiempo.deleteMany({ where: { proyectoId: id, tipo: { in: tipos } } }),
    ...(filas.length ? [prisma.proyectoBloqueTiempo.createMany({ data: filas })] : []),
  ]);

  const bloques = await prisma.proyectoBloqueTiempo.findMany({
    where: { proyectoId: id },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ bloques });
}
