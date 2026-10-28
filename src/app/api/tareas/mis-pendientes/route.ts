import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureTareaColumns } from "@/lib/ensure-tarea-columns";

// Tareas pendientes "mías" para el widget de dashboard: responsable directo,
// sin-asignar creadas por mí, o co-responsable. A diferencia de las vistas
// hoy/próximas de /api/tareas, aquí no hay corte de 30 días — se trae todo lo
// vencido + todo lo futuro con fecha, y el widget decide cómo agruparlo. Las
// tareas derivadas (trato/proyecto/cliente/gira) solo entran si ya tienen
// fecha, igual que en el resto de gestión operativa.
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTareaColumns();

  const misTareasOR = [
    { asignadoAId: session.id },
    { asignadoAId: null, creadoPorId: session.id },
    { colaboradores: { some: { usuarioId: session.id } } },
  ];

  let proyectosPermitidos: string[] | null = null;
  if (session.role !== "ADMIN") {
    const accesos = await prisma.proyectoAcceso.findMany({
      where: { userId: session.id },
      select: { proyectoId: true },
    });
    proyectosPermitidos = accesos.map((a: { proyectoId: string }) => a.proyectoId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proyectoInternoCond: Record<string, any> = {
    OR: [
      { proyectoInternoId: null },
      {
        proyectoInterno: {
          estado: { not: "EN_PAUSA" },
          ...(session.role === "ADMIN"
            ? {}
            : { OR: [{ esPrivado: false }, { accesos: { some: { userId: session.id } } }] }),
        },
      },
    ],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const soloDerivadasAgendadas: Record<string, any> = {
    OR: [
      { tipoOrigen: { notIn: ["TRATO", "EVENTO", "PROYECTO", "CLIENTE", "GIRA"] } },
      { AND: [{ fecha: { not: null } }, { asignadoAId: { not: null } }] },
    ],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    ptTemplateId: null,
    estado: { notIn: ["COMPLETADA", "CANCELADA"] },
    parentId: null,
    OR: misTareasOR,
  };

  if (proyectosPermitidos !== null) {
    where.AND = [
      { OR: where.OR },
      {
        OR: [
          { proyectoTareaId: null },
          { proyectoTareaId: { in: proyectosPermitidos } },
          { asignadoAId: session.id },
          { colaboradores: { some: { usuarioId: session.id } } },
        ],
      },
    ];
    delete where.OR;
  }

  where.AND = [...(where.AND ?? []), proyectoInternoCond, soloDerivadasAgendadas];

  const tareas = await prisma.tarea.findMany({
    where,
    select: {
      id: true,
      titulo: true,
      prioridad: true,
      area: true,
      estado: true,
      fecha: true,
      asignadoA: { select: { id: true, name: true } },
      proyectoEvento: { select: { id: true, nombre: true } },
      trato: { select: { id: true, nombreEvento: true } },
      cliente: { select: { id: true, nombre: true } },
    },
    orderBy: [{ fecha: { sort: "asc", nulls: "last" } }, { orden: "asc" }, { createdAt: "asc" }],
    take: 300,
  });

  return NextResponse.json({ tareas });
}
