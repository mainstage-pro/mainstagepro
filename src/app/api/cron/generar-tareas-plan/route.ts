import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfDay(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

function evaluarFrecuencia(
  frecuencia: string,
  diasSemana: string | null,
  diaSemana: number,
  nombreDia: string,
  hoy: Date,
): boolean {
  switch (frecuencia) {
    case "DIARIO":
      return diaSemana !== 0; // lun-sáb
    case "LUNES_JUEVES":
      return diaSemana === 1 || diaSemana === 4;
    case "SEMANAL": {
      const dias: string[] = diasSemana ? JSON.parse(diasSemana) : ["lunes"];
      return dias.includes(nombreDia);
    }
    case "MENSUAL":
      return diaSemana === 1 && hoy.getDate() <= 7;
    default:
      return false;
  }
}

function calcularFechaVencimiento(horaEspecifica: string | null, hoy: Date): Date {
  const fecha = new Date(hoy);
  if (horaEspecifica) {
    const [h, m] = horaEspecifica.split(":").map(Number);
    fecha.setHours(h, m, 0, 0);
  } else {
    fecha.setHours(23, 59, 0, 0);
  }
  return fecha;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const hoy = new Date();
  const diaSemana = hoy.getDay();
  const nombreDia = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"][diaSemana];

  const actividades = await prisma.planTrabajoActividad.findMany({
    where: { activa: true, generarTareas: true },
  });

  let generadas = 0;
  let omitidas = 0;

  for (const actividad of actividades) {
    if (!evaluarFrecuencia(actividad.frecuencia, actividad.diasSemana, diaSemana, nombreDia, hoy)) continue;

    const inicio = startOfDay(hoy);
    const yaExiste = await prisma.tarea.findFirst({
      where: {
        planActividadId: actividad.id,
        createdAt: { gte: inicio },
      },
    });

    if (yaExiste) { omitidas++; continue; }

    const tareaActiva = await prisma.tarea.findFirst({
      where: {
        planActividadId: actividad.id,
        estado: { notIn: ["COMPLETADA", "CANCELADA"] },
      },
    });

    if (tareaActiva) { omitidas++; continue; }

    await prisma.tarea.create({
      data: {
        titulo: actividad.titulo,
        descripcion: `Responsabilidad del plan de trabajo.\nEntregable: ${actividad.entregable}`,
        prioridad: "MEDIA",
        area: actividad.area,
        asignadoAId: actividad.responsableId,
        fechaVencimiento: calcularFechaVencimiento(actividad.horaEspecifica, hoy),
        origenPlan: true,
        planActividadId: actividad.id,
      },
    });

    await prisma.planTrabajoActividad.update({
      where: { id: actividad.id },
      data: { ultimaTareaGeneradaAt: hoy },
    });

    generadas++;
  }

  return NextResponse.json({ generadas, omitidas, fecha: hoy.toISOString() });
}
