import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * Fecha límite de pago = el próximo miércoles que esté al menos 3 días después del evento.
 * Dom(3d) Sáb(4d) Vie(5d) Jue(6d) Mié(7d) Mar(8d) Lun(9d) → y se repite el ciclo.
 */
function miercolesLimitePago(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  let dias = (3 - d.getDay() + 7) % 7; // días al miércoles más próximo
  if (dias < 3) dias += 7;              // si está a menos de 3 días, saltar al siguiente
  d.setDate(d.getDate() + dias);
  return d;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { tecnicoId, rolTecnicoId, nivel, jornada, responsabilidad, tarifaAcordada, notas, participacion } = await req.json();

  const tarifa = tarifaAcordada ? parseFloat(tarifaAcordada) : null;

  const personal = await prisma.proyectoPersonal.create({
    data: {
      proyectoId: id,
      tecnicoId: tecnicoId || null,
      rolTecnicoId: rolTecnicoId || null,
      participacion: participacion || null,
      nivel: nivel || null,
      jornada: jornada || null,
      responsabilidad: responsabilidad || null,
      tarifaAcordada: tarifa,
      notas: notas || null,
      confirmado: false,
    },
    include: {
      tecnico: { include: { rol: { select: { nombre: true } } } },
      rolTecnico: { select: { nombre: true } },
    },
  });

  // ── Auto-crear CxP cuando hay técnico asignado y tarifa definida ──────────
  if (tecnicoId && tarifa && tarifa > 0) {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { nombre: true, fechaEvento: true },
    });

    const rolNombre = personal.rolTecnico?.nombre ?? personal.tecnico?.rol?.nombre ?? "Técnico";
    const tecNombre = personal.tecnico ? personal.tecnico.nombre ?? "Sin nombre" : "Por asignar";

    // Fecha compromiso = miércoles siguiente después del evento
    const fechaCompromiso = miercolesLimitePago(proyecto?.fechaEvento ?? new Date());

    await prisma.cuentaPagar.create({
      data: {
        tipoAcreedor: "TECNICO",
        tecnicoId,
        proyectoId: id,
        concepto: `${rolNombre} — ${tecNombre} | ${proyecto?.nombre ?? "Proyecto"}`,
        monto: tarifa,
        fechaCompromiso,
        estado: "PENDIENTE",
      },
    });
  }

  return NextResponse.json({ personal });
}
