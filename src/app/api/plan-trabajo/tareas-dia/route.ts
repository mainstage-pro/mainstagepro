import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/plan-trabajo/tareas-dia?fecha=YYYY-MM-DD[&userId=...]
// Devuelve las Tarea del plan (tipoOrigen="PLAN", parentId=null) del día,
// mapeadas a la forma `Instancia` que consume MiDiaItem. Reemplaza la lectura
// de PTTareaInstancia para la vista "Mi Día" ahora embebida en /operaciones.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const isAdmin = session.role === "ADMIN" || session.role === "DIRECTOR";
  const { searchParams } = new URL(req.url);
  const tz = "America/Mexico_City";
  const fechaStr = searchParams.get("fecha") ?? new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const userIdParam = searchParams.get("userId");

  // Solo admin/director puede ver el día de otro usuario.
  const targetUserId = isAdmin ? (userIdParam ?? session.id) : session.id;

  const inicio = new Date(`${fechaStr}T00:00:00.000-06:00`);
  const fin = new Date(`${fechaStr}T23:59:59.999-06:00`);

  const tareas = await prisma.tarea.findMany({
    where: {
      tipoOrigen: "PLAN",
      parentId: null,
      fecha: { gte: inicio, lte: fin },
      asignadoAId: targetUserId,
    },
    select: {
      id: true,
      estado: true,
      notas: true,
      fechaVencimiento: true,
      fechaCompletada: true,
      asignadoA: { select: { id: true, name: true } },
      ptTemplate: {
        select: {
          id: true,
          nombre: true,
          tipo: true,
          impacto: true,
          contexto: true,
          frecuencia: true,
          diasSemana: true,
          cuando: true,
          descripcion: true,
          estandarMinimo: true,
          porqueSeHace: true,
          relacionCon: true,
          siNoSeHace: true,
          afectaA: true,
          kpiNombre: true,
          moduloTexto: true,
          moduloDestino: true,
          moduloDisponible: true,
          esAccionCampo: true,
          puestoDefault: true,
          horaLimite: true,
          area: { select: { id: true, nombre: true, color: true, icono: true } },
          subArea: { select: { id: true, nombre: true } },
        },
      },
    },
    orderBy: { fechaVencimiento: "asc" },
  });

  const instancias = tareas
    .filter((t) => t.ptTemplate)
    .map((t) => {
      const tpl = t.ptTemplate!;
      return {
        id: t.id,
        estado: t.estado,
        notas: t.notas,
        razonNoRealizado: null,
        fechaVencimiento: t.fechaVencimiento?.toISOString() ?? "",
        completadaAt: t.fechaCompletada?.toISOString() ?? null,
        responsable: t.asignadoA,
        template: {
          id: tpl.id,
          nombre: tpl.nombre,
          tipo: tpl.tipo,
          impacto: tpl.impacto,
          contexto: tpl.contexto,
          frecuencia: tpl.frecuencia,
          diasSemana: tpl.diasSemana,
          cuando: tpl.cuando,
          descripcion: tpl.descripcion,
          estandarMinimo: tpl.estandarMinimo,
          porqueSeHace: tpl.porqueSeHace,
          relacionCon: tpl.relacionCon,
          siNoSeHace: tpl.siNoSeHace,
          afectaA: tpl.afectaA,
          kpiNombre: tpl.kpiNombre,
          moduloTexto: tpl.moduloTexto,
          moduloDestino: tpl.moduloDestino,
          moduloDisponible: tpl.moduloDisponible,
          esAccionCampo: tpl.esAccionCampo,
          puestoDefault: tpl.puestoDefault,
          horaLimite: tpl.horaLimite,
          area: tpl.area,
          subArea: tpl.subArea,
        },
      };
    });

  return NextResponse.json({ instancias, fecha: fechaStr });
}
