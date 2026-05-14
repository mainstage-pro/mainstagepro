import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hoy    = new Date(); hoy.setHours(0, 0, 0, 0);
  const en7    = new Date(hoy); en7.setDate(hoy.getDate() + 7);
  const en14   = new Date(hoy); en14.setDate(hoy.getDate() + 14);

  const [proyectos, tratos] = await Promise.all([
    prisma.proyecto.findMany({
      where: {
        fechaEvento: { gte: hoy, lte: en14 },
        estado: { in: ["PLANEACION", "CONFIRMADO", "EN_CURSO"] },
      },
      select: {
        id: true, nombre: true, fechaEvento: true, lugarEvento: true, estado: true,
        cliente:   { select: { nombre: true } },
        encargado: { select: { name: true } },
      },
      orderBy: { fechaEvento: "asc" },
    }),
    prisma.trato.findMany({
      where: {
        fechaEventoEstimada: { gte: hoy, lte: en14 },
        etapa: { notIn: ["VENTA_CERRADA", "VENTA_PERDIDA"] },
      },
      select: {
        id: true, nombreEvento: true, fechaEventoEstimada: true, lugarEstimado: true, etapa: true,
        cliente:    { select: { nombre: true } },
        responsable:{ select: { name: true } },
      },
      orderBy: { fechaEventoEstimada: "asc" },
    }),
  ]);

  type Evento = {
    id: string;
    tipo: "CONFIRMADO" | "EN_PROCESO" | "SIN_CERRAR";
    nombre: string;
    fecha: Date;
    lugar: string | null;
    cliente: string | null;
    responsable: string | null;
    etapaActual?: string;
    urgente: boolean;
    linkHref: string;
  };

  const eventos: Evento[] = [
    ...proyectos.map((p) => ({
      id:          p.id,
      tipo:        "CONFIRMADO" as const,
      nombre:      p.nombre,
      fecha:       p.fechaEvento,
      lugar:       p.lugarEvento ?? null,
      cliente:     p.cliente?.nombre ?? null,
      responsable: p.encargado?.name ?? null,
      urgente:     false,
      linkHref:    `/proyectos/${p.id}`,
    })),
    ...tratos.map((t) => {
      const tipo: "EN_PROCESO" | "SIN_CERRAR" =
        t.etapa === "OPORTUNIDAD" ? "EN_PROCESO" : "SIN_CERRAR";
      return {
        id:          t.id,
        tipo,
        nombre:      t.nombreEvento ?? t.cliente?.nombre ?? "Evento sin nombre",
        fecha:       t.fechaEventoEstimada!,
        lugar:       t.lugarEstimado ?? null,
        cliente:     t.cliente?.nombre ?? null,
        responsable: t.responsable?.name ?? null,
        etapaActual: t.etapa,
        urgente:     t.fechaEventoEstimada! <= en7,
        linkHref:    `/crm/tratos/${t.id}`,
      };
    }),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  const estaSemana      = eventos.filter((e) => e.fecha <= en7);
  const siguienteSemana = eventos.filter((e) => e.fecha > en7);

  return NextResponse.json({ estaSemana, siguienteSemana });
}
