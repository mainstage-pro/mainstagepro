import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EMAILS: Record<string, string> = {
  mauricio:      "mauriciohernandezvm@gmail.com",
  administracion: "mauriciohernandezvm@gmail.com",
  marketing:     "mauriciohernandezvm@gmail.com",
  ventas:        "mauriciohernandezvm@gmail.com",
  produccion:    "mauriciohernandezvm@gmail.com",
};

type ActivityDef = {
  area: string;
  emailKey: string;
  titulo: string;
  descripcion?: string;
  frecuencia: string;
  diasSemana?: string[];
  horaEspecifica?: string;
  entregable: string;
  kpiVinculado?: string;
  seccionSO?: string;
  orden: number;
};

const ACTIVIDADES: ActivityDef[] = [
  // DIRECCIÓN
  { area:"DIRECCION", emailKey:"mauricio", titulo:"Revisión del semáforo del negocio", descripcion:"Revisar indicadores clave: pipeline, CxC vencida, tareas urgentes y proyectos activos.", frecuencia:"LUNES_JUEVES", horaEspecifica:"09:00", entregable:"Registro de alertas activas y acciones tomadas", kpiVinculado:"Semáforo verde", seccionSO:"Dirección / Control", orden:1 },
  { area:"DIRECCION", emailKey:"mauricio", titulo:"Revisión de juntas y acuerdos pendientes", frecuencia:"SEMANAL", diasSemana:["lunes"], horaEspecifica:"10:00", entregable:"Porcentaje de acuerdos cerrados", kpiVinculado:">80% acuerdos cerrados por semana", seccionSO:"Dirección / Junta semanal", orden:2 },
  { area:"DIRECCION", emailKey:"mauricio", titulo:"Revisión financiera semanal", frecuencia:"SEMANAL", diasSemana:["lunes"], horaEspecifica:"11:00", entregable:"Reporte de posición financiera", kpiVinculado:"Flujo en positivo", seccionSO:"Dirección / Finanzas", orden:3 },
  { area:"DIRECCION", emailKey:"mauricio", titulo:"Revisión de proyectos activos", frecuencia:"SEMANAL", diasSemana:["miercoles"], horaEspecifica:"09:00", entregable:"Proyectos con alertas identificadas", kpiVinculado:"0 proyectos sin encargado ni fecha", seccionSO:"Dirección / Producción", orden:4 },

  // ADMINISTRACIÓN
  { area:"ADMINISTRACION", emailKey:"administracion", titulo:"Seguimiento de cuentas por cobrar", frecuencia:"LUNES_JUEVES", horaEspecifica:"10:00", entregable:"Lista de CxC contactadas y próximos cobros confirmados", kpiVinculado:"CxC vencidas < 2", seccionSO:"Administración / CxC", orden:1 },
  { area:"ADMINISTRACION", emailKey:"administracion", titulo:"Revisión de pagos a personal y proveedores", frecuencia:"SEMANAL", diasSemana:["viernes"], horaEspecifica:"11:00", entregable:"CxP del período liquidadas", kpiVinculado:"Pagos realizados a tiempo", seccionSO:"Administración / CxP", orden:2 },
  { area:"ADMINISTRACION", emailKey:"administracion", titulo:"Conciliación de movimientos bancarios", frecuencia:"SEMANAL", diasSemana:["lunes"], entregable:"Movimientos conciliados al 100%", kpiVinculado:"Cero movimientos sin conciliar por más de 7 días", seccionSO:"Administración / Finanzas", orden:3 },
  { area:"ADMINISTRACION", emailKey:"administracion", titulo:"Revisión de nómina", frecuencia:"MENSUAL", entregable:"Nómina calculada y pagos ejecutados", kpiVinculado:"Nómina pagada antes del día 5", seccionSO:"Administración / RRHH", orden:4 },
  { area:"ADMINISTRACION", emailKey:"administracion", titulo:"Corte de caja chica", frecuencia:"MENSUAL", entregable:"Caja chica cuadrada y reposición solicitada", kpiVinculado:"Diferencia < $50", seccionSO:"Administración / Caja chica", orden:5 },

  // MARKETING
  { area:"MARKETING", emailKey:"marketing", titulo:"Planificación de contenido semanal", frecuencia:"SEMANAL", diasSemana:["lunes"], horaEspecifica:"09:00", entregable:"Parrilla de contenido confirmada para la semana", kpiVinculado:"100% de publicaciones programadas", seccionSO:"Marketing / Contenido", orden:1 },
  { area:"MARKETING", emailKey:"marketing", titulo:"Publicación de contenido en redes", frecuencia:"DIARIO", entregable:"Publicación subida y programada", kpiVinculado:"3-5 publicaciones por semana", seccionSO:"Marketing / Contenido", orden:2 },
  { area:"MARKETING", emailKey:"marketing", titulo:"Revisión de métricas orgánicas", frecuencia:"SEMANAL", diasSemana:["viernes"], horaEspecifica:"16:00", entregable:"Métricas registradas en el sistema", kpiVinculado:"Engagement rate > 3%", seccionSO:"Marketing / Métricas", orden:3 },
  { area:"MARKETING", emailKey:"marketing", titulo:"Levantamiento de contenido por evento", frecuencia:"POR_EVENTO", entregable:"Fotos/videos entregados y catalogados", kpiVinculado:"100% de eventos con levantamiento", seccionSO:"Marketing / Levantamientos", orden:4 },

  // VENTAS
  { area:"VENTAS", emailKey:"ventas", titulo:"Seguimiento diario de tratos activos", frecuencia:"DIARIO", horaEspecifica:"09:30", entregable:"Próxima acción actualizada en cada trato", kpiVinculado:"Tiempo promedio en etapa < 7 días", seccionSO:"Ventas / CRM", orden:1 },
  { area:"VENTAS", emailKey:"ventas", titulo:"Prospección outbound", frecuencia:"DIARIO", horaEspecifica:"11:00", entregable:"Mínimo 5 contactos registrados", kpiVinculado:"5 prospectos nuevos/semana", seccionSO:"Ventas / Prospección", orden:2 },
  { area:"VENTAS", emailKey:"ventas", titulo:"Revisión de cotizaciones enviadas", frecuencia:"LUNES_JUEVES", entregable:"Cotizaciones viejas contactadas", kpiVinculado:"Tasa de cierre > 40%", seccionSO:"Ventas / Cotizaciones", orden:3 },
  { area:"VENTAS", emailKey:"ventas", titulo:"Reporte semanal de ventas", frecuencia:"SEMANAL", diasSemana:["viernes"], horaEspecifica:"17:00", entregable:"Reporte semanal de ventas listo", kpiVinculado:"Meta mensual de ventas en seguimiento", seccionSO:"Ventas / Reportes", orden:4 },

  // PRODUCCIÓN
  { area:"PRODUCCION", emailKey:"produccion", titulo:"Checklist semanal de bodega", frecuencia:"SEMANAL", diasSemana:["sabado"], horaEspecifica:"10:00", entregable:"Checklist completado sin pendientes críticos", kpiVinculado:"0 equipos con falla sin reportar", seccionSO:"Producción / Bodega", orden:1 },
  { area:"PRODUCCION", emailKey:"produccion", titulo:"Revisión de equipos en mantenimiento", frecuencia:"SEMANAL", diasSemana:["lunes"], entregable:"Estado actualizado de cada equipo en mantenimiento", kpiVinculado:"Tiempo promedio de mantenimiento < 7 días", seccionSO:"Producción / Mantenimiento", orden:2 },
  { area:"PRODUCCION", emailKey:"produccion", titulo:"Preparación de equipo por evento", frecuencia:"POR_EVENTO", entregable:"Rider confirmado y equipos listos 24h antes del evento", kpiVinculado:"0 equipos faltantes en fecha del evento", seccionSO:"Producción / Logística", orden:3 },
  { area:"PRODUCCION", emailKey:"produccion", titulo:"Confirmación de personal técnico", frecuencia:"SEMANAL", diasSemana:["miercoles"], entregable:"100% de técnicos confirmados", kpiVinculado:"0 técnicos sin confirmar 48h antes del evento", seccionSO:"Producción / Personal", orden:4 },
  { area:"PRODUCCION", emailKey:"produccion", titulo:"Recolección de equipos post-evento", frecuencia:"POR_EVENTO", entregable:"Equipos en bodega y recolección marcada como completada", kpiVinculado:"Recolección completada en < 48h post-evento", seccionSO:"Producción / Logística", orden:5 },
];

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const allEmails = [...new Set(Object.values(EMAILS))];
  const users = await prisma.user.findMany({
    where: { email: { in: allEmails }, active: true },
    select: { id: true, email: true },
  });
  const userByEmail = new Map(users.map(u => [u.email, u]));

  const resultado: { creados: string[]; omitidos: string[] } = { creados: [], omitidos: [] };

  for (const act of ACTIVIDADES) {
    const email = EMAILS[act.emailKey];
    const user = userByEmail.get(email);

    if (!user) {
      resultado.omitidos.push(`Sin usuario (${email}): ${act.titulo}`);
      continue;
    }

    const existing = await prisma.planTrabajoActividad.findFirst({
      where: { titulo: act.titulo, area: act.area },
    });

    if (existing) {
      resultado.omitidos.push(`Ya existe: [${act.area}] ${act.titulo}`);
      continue;
    }

    await prisma.planTrabajoActividad.create({
      data: {
        area:           act.area,
        responsableId:  user.id,
        titulo:         act.titulo,
        descripcion:    act.descripcion ?? null,
        frecuencia:     act.frecuencia,
        diasSemana:     act.diasSemana ? JSON.stringify(act.diasSemana) : null,
        horaEspecifica: act.horaEspecifica ?? null,
        entregable:     act.entregable,
        kpiVinculado:   act.kpiVinculado ?? null,
        origenSO:       true,
        seccionSO:      act.seccionSO ?? null,
        activa:         true,
        generarTareas:  true,
        orden:          act.orden,
      },
    });

    resultado.creados.push(`[${act.area}] ${act.titulo}`);
  }

  return NextResponse.json({
    ok: true,
    creados: resultado.creados.length,
    omitidos: resultado.omitidos.length,
    detalle: resultado,
  });
}
