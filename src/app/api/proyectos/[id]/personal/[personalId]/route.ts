import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureOperacionTecnicaColumns } from "@/lib/migraciones-lazy";
import { marcarFilaNominaPagada, revertirFilaNominaPagada } from "@/lib/nomina-pagos";

function proximoMiercolesTraEvento(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
  return d;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; personalId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await ensureOperacionTecnicaColumns();

  const { personalId } = await params;
  const body = await req.json();

  // Solo Mauricio/Emiliano pueden ver y modificar tarifas de técnicos.
  const allowedTecnicoNames = ["mauricio", "emiliano"];
  const canEditTecnicoCosts = allowedTecnicoNames.some(name => session.name.toLowerCase().includes(name));

  const data: Record<string, unknown> = {};
  if ("esAdicional" in body) data.esAdicional = body.esAdicional === true;
  if ("tecnicoId" in body) data.tecnicoId = body.tecnicoId || null;
  if ("rolTecnicoId" in body) data.rolTecnicoId = body.rolTecnicoId || null;
  if ("participacion" in body) data.participacion = body.participacion || null;
  if ("confirmado" in body) data.confirmado = body.confirmado;
  if ("tarifaAcordada" in body && canEditTecnicoCosts) data.tarifaAcordada = body.tarifaAcordada != null ? parseFloat(body.tarifaAcordada) : null;
  if ("estadoPago" in body) data.estadoPago = body.estadoPago;
  if ("nivel" in body) data.nivel = body.nivel || null;
  if ("jornada" in body) data.jornada = body.jornada || null;
  if ("responsabilidad" in body) data.responsabilidad = body.responsabilidad || null;
  if ("notas" in body) data.notas = body.notas || null;
  if ("rolEnEvento" in body) data.rolEnEvento = body.rolEnEvento || null;
  if ("fechaJornada" in body) data.fechaJornada = body.fechaJornada || null;

  // Leer el registro previo para detectar transiciones (técnico nuevo / estado de pago)
  const previo = await prisma.proyectoPersonal.findUnique({
    where: { id: personalId },
    select: {
      tecnicoId: true, tarifaAcordada: true, proyectoId: true,
      estadoPago: true, movimientoId: true,
    },
  });

  // ── Detectar transición de estado de pago ────────────────────────────────
  const nuevoEstado = "estadoPago" in body ? body.estadoPago : undefined;
  const pasaAPagado = nuevoEstado === "PAGADO" && previo?.estadoPago !== "PAGADO";
  const pasaAPendiente = nuevoEstado === "PENDIENTE" && previo?.estadoPago === "PAGADO";

  const personal = await prisma.$transaction(async (tx) => {
    // Aplicar primero los cambios de campos (tarifa, estado, rol, etc.) para
    // que el helper vea los valores efectivos al construir el movimiento.
    await tx.proyectoPersonal.update({ where: { id: personalId }, data });

    // Transición de estado de pago → crear o revertir el movimiento ligado.
    if (pasaAPagado) {
      await marcarFilaNominaPagada(tx, personalId, { fecha: new Date(), creadoPor: session.id });
    } else if (pasaAPendiente && previo?.movimientoId) {
      await revertirFilaNominaPagada(tx, personalId, previo.movimientoId);
    }

    return tx.proyectoPersonal.findUniqueOrThrow({
      where: { id: personalId },
      include: {
        tecnico: { include: { rol: { select: { nombre: true } } } },
        rolTecnico: { select: { nombre: true } },
      },
    });
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
    const fechaCompromiso = proximoMiercolesTraEvento(proyecto?.fechaEvento ?? new Date());

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

  const { id: proyectoId, personalId } = await params;

  // Obtener el técnico asignado antes de borrar
  const personal = await prisma.proyectoPersonal.findUnique({
    where: { id: personalId },
    select: { tecnicoId: true },
  });

  await prisma.proyectoPersonal.delete({ where: { id: personalId } });

  // Borrar la CxP vinculada a este técnico en este proyecto (si existe y está pendiente)
  if (personal?.tecnicoId) {
    await prisma.cuentaPagar.deleteMany({
      where: {
        tecnicoId: personal.tecnicoId,
        proyectoId,
        estado: "PENDIENTE",
        tipoAcreedor: "TECNICO",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
