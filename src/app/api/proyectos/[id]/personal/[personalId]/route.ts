import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function miercolesLimitePago(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  let dias = (3 - d.getDay() + 7) % 7;
  if (dias < 3) dias += 7;
  d.setDate(d.getDate() + dias);
  return d;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; personalId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { personalId } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("tecnicoId" in body) data.tecnicoId = body.tecnicoId || null;
  if ("participacion" in body) data.participacion = body.participacion || null;
  if ("confirmado" in body) data.confirmado = body.confirmado;
  if ("tarifaAcordada" in body) data.tarifaAcordada = body.tarifaAcordada != null ? parseFloat(body.tarifaAcordada) : null;
  if ("estadoPago" in body) data.estadoPago = body.estadoPago;
  if ("nivel" in body) data.nivel = body.nivel || null;
  if ("jornada" in body) data.jornada = body.jornada || null;
  if ("responsabilidad" in body) data.responsabilidad = body.responsabilidad || null;
  if ("notas" in body) data.notas = body.notas || null;

  // Leer el registro previo para detectar si se está asignando un técnico nuevo
  const previo = await prisma.proyectoPersonal.findUnique({
    where: { id: personalId },
    select: { tecnicoId: true, tarifaAcordada: true, proyectoId: true },
  });

  const personal = await prisma.proyectoPersonal.update({
    where: { id: personalId },
    data,
    include: {
      tecnico: { include: { rol: { select: { nombre: true } } } },
      rolTecnico: { select: { nombre: true } },
    },
  });

  // ── Auto-crear CxP cuando se asigna técnico a una fila que no lo tenía ────
  const nuevaTecnicoId = personal.tecnicoId;
  const tarifa = personal.tarifaAcordada;
  if (nuevaTecnicoId && tarifa && tarifa > 0 && previo && !previo.tecnicoId) {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: personal.proyectoId },
      select: { nombre: true, fechaEvento: true },
    });
    const rolNombre = personal.rolTecnico?.nombre ?? personal.tecnico?.rol?.nombre ?? "Técnico";
    const tecNombre = personal.tecnico?.nombre ?? "Sin nombre";
    const fechaCompromiso = miercolesLimitePago(proyecto?.fechaEvento ?? new Date());

    // Verificar que no exista ya una CxP para este técnico+proyecto
    const existente = await prisma.cuentaPagar.findFirst({
      where: { tecnicoId: nuevaTecnicoId, proyectoId: personal.proyectoId, estado: "PENDIENTE" },
    });
    if (!existente) {
      await prisma.cuentaPagar.create({
        data: {
          tipoAcreedor: "TECNICO",
          tecnicoId: nuevaTecnicoId,
          proyectoId: personal.proyectoId,
          concepto: `${rolNombre} — ${tecNombre} | ${proyecto?.nombre ?? "Proyecto"}`,
          monto: tarifa,
          fechaCompromiso,
          estado: "PENDIENTE",
        },
      });
    }
  }

  return NextResponse.json({ personal });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; personalId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { personalId } = await params;
  await prisma.proyectoPersonal.delete({ where: { id: personalId } });
  return NextResponse.json({ ok: true });
}
