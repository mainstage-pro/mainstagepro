import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function endOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  // Admin puede ver a cualquier vendedor; vendedor solo se ve a sí mismo
  let vendedorId = searchParams.get("vendedorId");
  if (session.role !== "ADMIN") vendedorId = session.id;

  // Leer meta diaria desde config
  const config = await prisma.configComisiones.findFirst();
  const META_DIARIA: number = (config as { metaProspectoDiaria?: number } | null)?.metaProspectoDiaria ?? 12;

  const now = new Date();
  const hoy = startOfDay(now);
  const finHoy = endOfDay(now);
  const inicioMes = startOfMonth(now);
  const finMes = endOfMonth(now);

  // ── Últimos 7 días (para la vista semanal) ──────────────────────────────────
  const dias7: { fecha: string; dia: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ini = startOfDay(d);
    const fin = endOfDay(d);
    const count = await prisma.trato.count({
      where: {
        tipoLead: "OUTBOUND",
        createdAt: { gte: ini, lte: fin },
        ...(vendedorId ? { responsableId: vendedorId } : {}),
      },
    });
    dias7.push({
      fecha: ini.toISOString().slice(0, 10),
      dia: ini.toLocaleDateString("es-MX", { weekday: "short" }),
      count,
    });
  }

  // ── Hoy ────────────────────────────────────────────────────────────────────
  const prospectoHoy = dias7[dias7.length - 1].count;

  // ── Prospectos outbound del mes ─────────────────────────────────────────────
  const prospectadosMes = await prisma.trato.count({
    where: {
      tipoLead: "OUTBOUND",
      createdAt: { gte: inicioMes, lte: finMes },
      ...(vendedorId ? { responsableId: vendedorId } : {}),
    },
  });

  // ── Embudo del mes ─────────────────────────────────────────────────────────
  const [oportunidadesMes, cierresMes, perdidosMes] = await Promise.all([
    prisma.trato.count({
      where: {
        etapa: "OPORTUNIDAD",
        createdAt: { gte: inicioMes, lte: finMes },
        ...(vendedorId ? { responsableId: vendedorId } : {}),
      },
    }),
    prisma.trato.count({
      where: {
        etapa: "VENTA_CERRADA",
        fechaCierre: { gte: inicioMes, lte: finMes },
        ...(vendedorId ? { responsableId: vendedorId } : {}),
      },
    }),
    prisma.trato.count({
      where: {
        etapa: "VENTA_PERDIDA",
        updatedAt: { gte: inicioMes, lte: finMes },
        ...(vendedorId ? { responsableId: vendedorId } : {}),
      },
    }),
  ]);

  // Monto de cierres del mes
  const cierresData = await prisma.trato.findMany({
    where: {
      etapa: "VENTA_CERRADA",
      fechaCierre: { gte: inicioMes, lte: finMes },
      ...(vendedorId ? { responsableId: vendedorId } : {}),
    },
    select: { presupuestoEstimado: true },
  });
  const montoCierres = cierresData.reduce((s, t) => s + (t.presupuestoEstimado ?? 0), 0);

  // ── Nurturing pendiente (próxima acción hoy o vencida) ─────────────────────
  const nurturingPendiente = await prisma.trato.findMany({
    where: {
      tipoProspecto: "NURTURING",
      etapa: { notIn: ["VENTA_CERRADA", "VENTA_PERDIDA"] },
      fechaProximaAccion: { lte: finHoy },
      ...(vendedorId ? { responsableId: vendedorId } : {}),
    },
    select: {
      id: true,
      cliente: { select: { nombre: true, empresa: true } },
      tipoEvento: true,
      fechaProximaAccion: true,
      proximaAccion: true,
      nurturingData: true,
      presupuestoEstimado: true,
      responsable: { select: { name: true } },
    },
    orderBy: { fechaProximaAccion: "asc" },
    take: 30,
  });

  // ── Nurturing sin fecha (activo pero sin próxima acción programada) ─────────
  const nurturingSinFecha = await prisma.trato.count({
    where: {
      tipoProspecto: "NURTURING",
      etapa: { notIn: ["VENTA_CERRADA", "VENTA_PERDIDA"] },
      fechaProximaAccion: null,
      ...(vendedorId ? { responsableId: vendedorId } : {}),
    },
  });

  // ── Total en nurturing activo ──────────────────────────────────────────────
  const totalNurturing = await prisma.trato.count({
    where: {
      tipoProspecto: "NURTURING",
      etapa: { notIn: ["VENTA_CERRADA", "VENTA_PERDIDA"] },
      ...(vendedorId ? { responsableId: vendedorId } : {}),
    },
  });

  // ── Leads asignados sin gestionar ─────────────────────────────────────────
  const leadsAsignados = await prisma.trato.findMany({
    where: {
      origenVenta: "ASIGNADO",
      etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] },
      ...(vendedorId ? { responsableId: vendedorId } : {}),
    },
    select: {
      id: true,
      cliente: { select: { nombre: true, empresa: true } },
      tipoEvento: true,
      etapa: true,
      estatusContacto: true,
      createdAt: true,
      presupuestoEstimado: true,
      vendedorOrigen: { select: { name: true } },
      responsable: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // ── Scoreboard por vendedor (solo admin) ──────────────────────────────────
  let scoreboard: {
    id: string; nombre: string;
    hoy: number; semana: number; mes: number;
    oportunidadesMes: number; cierresMes: number;
  }[] = [];

  if (session.role === "ADMIN" && !vendedorId) {
    const vendedores = await prisma.user.findMany({
      where: { active: true, area: "VENTAS" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    scoreboard = await Promise.all(
      vendedores.map(async (v) => {
        const [hoyV, semanaV, mesV, opMes, cMes] = await Promise.all([
          prisma.trato.count({ where: { tipoLead: "OUTBOUND", responsableId: v.id, createdAt: { gte: hoy, lte: finHoy } } }),
          prisma.trato.count({ where: { tipoLead: "OUTBOUND", responsableId: v.id, createdAt: { gte: new Date(hoy.getTime() - 6 * 86400000), lte: finHoy } } }),
          prisma.trato.count({ where: { tipoLead: "OUTBOUND", responsableId: v.id, createdAt: { gte: inicioMes, lte: finMes } } }),
          prisma.trato.count({ where: { etapa: "OPORTUNIDAD", responsableId: v.id, createdAt: { gte: inicioMes, lte: finMes } } }),
          prisma.trato.count({ where: { etapa: "VENTA_CERRADA", responsableId: v.id, fechaCierre: { gte: inicioMes, lte: finMes } } }),
        ]);
        return { id: v.id, nombre: v.name, hoy: hoyV, semana: semanaV, mes: mesV, oportunidadesMes: opMes, cierresMes: cMes };
      })
    );
  }

  // ── Histórico 6 meses ────────────────────────────────────────────────────
  const historico: { mes: string; label: string; prospectados: number; cierres: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const iniM = startOfMonth(d);
    const finM = endOfMonth(d);
    const [p, c] = await Promise.all([
      prisma.trato.count({
        where: { tipoLead: "OUTBOUND", createdAt: { gte: iniM, lte: finM }, ...(vendedorId ? { responsableId: vendedorId } : {}) },
      }),
      prisma.trato.count({
        where: { etapa: "VENTA_CERRADA", fechaCierre: { gte: iniM, lte: finM }, ...(vendedorId ? { responsableId: vendedorId } : {}) },
      }),
    ]);
    historico.push({
      mes: iniM.toISOString().slice(0, 7),
      label: d.toLocaleDateString("es-MX", { month: "short" }),
      prospectados: p,
      cierres: c,
    });
  }

  return NextResponse.json({
    meta: META_DIARIA,
    hoy: {
      fecha: hoy.toISOString().slice(0, 10),
      prospectos: prospectoHoy,
      porcentaje: Math.min(100, Math.round((prospectoHoy / META_DIARIA) * 100)),
    },
    semana: dias7,
    mes: {
      prospectados: prospectadosMes,
      oportunidades: oportunidadesMes,
      cierres: cierresMes,
      perdidos: perdidosMes,
      montoCierres,
    },
    nurturing: {
      total: totalNurturing,
      pendienteHoy: nurturingPendiente.length,
      sinFecha: nurturingSinFecha,
      lista: nurturingPendiente.map((t) => {
        let nData: { etapa?: string; temperatura?: string; nextMotivo?: string } = {};
        try { if (t.nurturingData) nData = JSON.parse(t.nurturingData); } catch { /* */ }
        const diasRetraso = t.fechaProximaAccion
          ? Math.max(0, Math.floor((Date.now() - new Date(t.fechaProximaAccion).getTime()) / 86400000))
          : 0;
        return {
          id: t.id,
          cliente: t.cliente.nombre + (t.cliente.empresa ? ` · ${t.cliente.empresa}` : ""),
          tipoEvento: t.tipoEvento,
          proximaAccion: t.proximaAccion,
          fechaProximaAccion: t.fechaProximaAccion,
          diasRetraso,
          etapaNurturing: nData.etapa ?? null,
          temperatura: nData.temperatura ?? null,
          nextMotivo: nData.nextMotivo ?? null,
          presupuesto: t.presupuestoEstimado,
          responsable: t.responsable?.name ?? null,
        };
      }),
    },
    leads: leadsAsignados.map((l) => ({
      id: l.id,
      cliente: l.cliente.nombre + (l.cliente.empresa ? ` · ${l.cliente.empresa}` : ""),
      tipoEvento: l.tipoEvento,
      etapa: l.etapa,
      estatusContacto: l.estatusContacto,
      createdAt: l.createdAt,
      presupuesto: l.presupuestoEstimado,
      asignadoPor: l.vendedorOrigen?.name ?? null,
      responsable: l.responsable?.name ?? null,
    })),
    scoreboard,
    historico,
  });
}
