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
      // ── Campos propios: fallback cuando la tarea no viene de un PTTareaTemplate
      // (ej. se convirtió a "Plan de trabajo" a mano desde TaskModal) ──
      titulo: true,
      descripcion: true,
      area: true,
      cuando: true,
      estandarMinimo: true,
      porqueSeHace: true,
      siNoSeHace: true,
      moduloTexto: true,
      moduloDestino: true,
      moduloDisponible: true,
      esAccionCampo: true,
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

  // Tareas convertidas a "PLAN" a mano (sin ptTemplateId) no tienen PTArea: se
  // resuelve por el código de texto guardado en Tarea.area contra pt_areas.
  const areasDb = await prisma.pTArea.findMany({ select: { id: true, nombre: true, codigo: true, color: true, icono: true } });
  const areaPorCodigo = new Map(areasDb.map((a) => [a.codigo, a]));
  const AREA_FALLBACK = { id: "generic", nombre: "General", color: "#6B7280", icono: "" };

  const instancias = tareas.map((t) => {
    if (t.ptTemplate) {
      const tpl = t.ptTemplate;
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
    }

    // Tarea de plan sin plantilla (convertida a mano): construye el template
    // a partir de los campos propios de la Tarea, que el motor también copia.
    const area = areaPorCodigo.get(t.area) ?? AREA_FALLBACK;
    return {
      id: t.id,
      estado: t.estado,
      notas: t.notas,
      razonNoRealizado: null,
      fechaVencimiento: t.fechaVencimiento?.toISOString() ?? "",
      completadaAt: t.fechaCompletada?.toISOString() ?? null,
      responsable: t.asignadoA,
      template: {
        id: t.id,
        nombre: t.titulo,
        tipo: "CHECK",
        impacto: "estandar",
        contexto: "independiente",
        frecuencia: "POR_EVENTO",
        diasSemana: [] as number[],
        cuando: t.cuando,
        descripcion: t.descripcion,
        estandarMinimo: t.estandarMinimo,
        porqueSeHace: t.porqueSeHace,
        relacionCon: null,
        siNoSeHace: t.siNoSeHace,
        afectaA: [] as string[],
        kpiNombre: null,
        moduloTexto: t.moduloTexto,
        moduloDestino: t.moduloDestino,
        moduloDisponible: t.moduloDisponible,
        esAccionCampo: t.esAccionCampo,
        puestoDefault: null,
        horaLimite: null,
        area: { id: area.id, nombre: area.nombre, color: area.color, icono: area.icono ?? "" },
        subArea: { id: "generic", nombre: "General" },
      },
    };
  });

  return NextResponse.json({ instancias, fecha: fechaStr });
}
