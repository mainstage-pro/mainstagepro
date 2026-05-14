import { prisma } from "@/lib/prisma";

export type AreaOp = "VENTAS" | "ADMINISTRACION" | "PRODUCCION" | "MARKETING" | "RRHH" | "GENERAL";
export type SeveridadTarea = "URGENTE" | "ALTA" | "MEDIA";
export type FuenteTarea =
  | "TRATO_VENCIDO"
  | "CXC_VENCIDA"
  | "CXP_VENCIDA"
  | "PROYECTO_SIN_PERSONAL"
  | "EQUIPO_MANTENIMIENTO";

export interface TareaIntegrada {
  id: string;               // "{FUENTE}_{entityId}"
  fuente: FuenteTarea;
  titulo: string;
  descripcion?: string;
  area: AreaOp;
  entidadId: string;
  href: string;
  severidad: SeveridadTarea;
  etiqueta: string;
  diasVencido?: number;
  cliente?: string;
  monto?: number;
  fechaRef?: string;        // ISO — fecha que disparó la alerta
}

function diasDesde(fecha: Date): number {
  return Math.floor((Date.now() - fecha.getTime()) / 86400000);
}

function sev(dias: number): SeveridadTarea {
  if (dias >= 7) return "URGENTE";
  if (dias >= 1) return "ALTA";
  return "MEDIA";
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal — agrega una query más aquí para integrar un nuevo módulo
// ─────────────────────────────────────────────────────────────────────────────
export async function computarTareasIntegradas(): Promise<TareaIntegrada[]> {
  const now         = new Date();
  const inicioDeHoy = new Date(now.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }));
  const en30        = new Date(now.getTime() + 30 * 86400000);

  const [tratos, cxcs, cxps, proyectos, equipos] = await Promise.all([

    // 1. Tratos con seguimiento vencido
    prisma.trato.findMany({
      where: {
        etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] },
        fechaProximaAccion: { lt: now },
      },
      select: {
        id: true, nombreEvento: true, fechaProximaAccion: true,
        cliente:    { select: { nombre: true } },
        responsable:{ select: { name: true } },
      },
      orderBy: { fechaProximaAccion: "asc" },
      take: 50,
    }),

    // 2. CxC vencidas
    prisma.cuentaCobrar.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIAL"] }, fechaCompromiso: { lt: inicioDeHoy } },
      select: {
        id: true, concepto: true, monto: true, fechaCompromiso: true,
        cliente: { select: { nombre: true } },
        proyecto:{ select: { nombre: true, numeroProyecto: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
      take: 50,
    }),

    // 3. CxP vencidas
    prisma.cuentaPagar.findMany({
      where: { estado: { in: ["PENDIENTE", "PARCIAL", "VENCIDO"] }, fechaCompromiso: { lt: inicioDeHoy } },
      select: {
        id: true, concepto: true, monto: true, fechaCompromiso: true, tipoAcreedor: true,
        tecnico:  { select: { nombre: true } },
        proveedor:{ select: { nombre: true } },
        proyecto: { select: { nombre: true, numeroProyecto: true } },
      },
      orderBy: { fechaCompromiso: "asc" },
      take: 50,
    }),

    // 4. Proyectos próximos (30d) sin personal confirmado
    prisma.proyecto.findMany({
      where: {
        estado: { in: ["PLANEACION", "CONFIRMADO"] },
        fechaEvento: { gte: now, lte: en30 },
        personal: { none: { confirmado: true } },
      },
      select: {
        id: true, nombre: true, numeroProyecto: true, fechaEvento: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { fechaEvento: "asc" },
      take: 30,
    }),

    // 5. Equipos en mantenimiento
    prisma.equipo.findMany({
      where: { estado: "EN_MANTENIMIENTO" },
      select: { id: true, descripcion: true, marca: true, categoria: { select: { nombre: true } } },
      take: 30,
    }),
  ]);

  const result: TareaIntegrada[] = [];

  // ── Tratos vencidos → VENTAS ───────────────────────────────────────────────
  for (const t of tratos) {
    const dias = diasDesde(t.fechaProximaAccion!);
    result.push({
      id: `TRATO_VENCIDO_${t.id}`,
      fuente: "TRATO_VENCIDO",
      titulo: `Dar seguimiento — ${t.cliente.nombre}`,
      descripcion: t.nombreEvento ? `Evento: ${t.nombreEvento}` : undefined,
      area: "VENTAS",
      entidadId: t.id,
      href: `/crm/tratos/${t.id}`,
      severidad: sev(dias),
      etiqueta: "Seguimiento vencido",
      diasVencido: dias,
      cliente: t.cliente.nombre,
      fechaRef: t.fechaProximaAccion!.toISOString(),
    });
  }

  // ── CxC vencidas → ADMINISTRACION ─────────────────────────────────────────
  for (const c of cxcs) {
    const dias = diasDesde(c.fechaCompromiso);
    result.push({
      id: `CXC_VENCIDA_${c.id}`,
      fuente: "CXC_VENCIDA",
      titulo: `Cobro vencido — ${c.cliente?.nombre ?? c.concepto}`,
      descripcion: c.proyecto ? `Proyecto #${c.proyecto.numeroProyecto} · ${c.concepto}` : c.concepto,
      area: "ADMINISTRACION",
      entidadId: c.id,
      href: "/finanzas/cxc",
      severidad: sev(dias),
      etiqueta: "Cobro vencido",
      diasVencido: dias,
      cliente: c.cliente?.nombre,
      monto: c.monto,
      fechaRef: c.fechaCompromiso.toISOString(),
    });
  }

  // ── CxP vencidas → ADMINISTRACION ─────────────────────────────────────────
  for (const p of cxps) {
    const dias     = diasDesde(p.fechaCompromiso);
    const acreedor = p.tecnico?.nombre ?? p.proveedor?.nombre ?? "Sin asignar";
    result.push({
      id: `CXP_VENCIDA_${p.id}`,
      fuente: "CXP_VENCIDA",
      titulo: `Pago vencido — ${acreedor}`,
      descripcion: p.proyecto
        ? `Proyecto #${p.proyecto.numeroProyecto} · ${p.concepto}`
        : p.concepto,
      area: "ADMINISTRACION",
      entidadId: p.id,
      href: "/finanzas/pagos",
      severidad: sev(dias),
      etiqueta: "Pago vencido",
      diasVencido: dias,
      monto: p.monto,
      fechaRef: p.fechaCompromiso.toISOString(),
    });
  }

  // ── Proyectos sin personal → PRODUCCION ───────────────────────────────────
  for (const p of proyectos) {
    const diasEvento = Math.ceil(
      (new Date(p.fechaEvento).getTime() - now.getTime()) / 86400000
    );
    result.push({
      id: `PROYECTO_SIN_PERSONAL_${p.id}`,
      fuente: "PROYECTO_SIN_PERSONAL",
      titulo: `Sin personal confirmado — ${p.nombre}`,
      descripcion: `${p.cliente?.nombre ?? ""} · Evento en ${diasEvento} día${diasEvento !== 1 ? "s" : ""}`,
      area: "PRODUCCION",
      entidadId: p.id,
      href: `/proyectos/${p.id}`,
      severidad: diasEvento <= 7 ? "URGENTE" : diasEvento <= 14 ? "ALTA" : "MEDIA",
      etiqueta: "Sin personal",
      cliente: p.cliente?.nombre,
      fechaRef: p.fechaEvento.toISOString(),
    });
  }

  // ── Equipos en mantenimiento → PRODUCCION ─────────────────────────────────
  for (const e of equipos) {
    result.push({
      id: `EQUIPO_MANTENIMIENTO_${e.id}`,
      fuente: "EQUIPO_MANTENIMIENTO",
      titulo: `En mantenimiento — ${e.descripcion}`,
      descripcion: [e.marca, e.categoria.nombre].filter(Boolean).join(" · ") || undefined,
      area: "PRODUCCION",
      entidadId: e.id,
      href: "/inventario/mantenimiento",
      severidad: "MEDIA",
      etiqueta: "Mantenimiento",
    });
  }

  // Ordenar: URGENTE primero, luego más días vencido
  const ORDER: Record<SeveridadTarea, number> = { URGENTE: 0, ALTA: 1, MEDIA: 2 };
  return result.sort((a, b) => {
    const s = ORDER[a.severidad] - ORDER[b.severidad];
    if (s !== 0) return s;
    return (b.diasVencido ?? 0) - (a.diasVencido ?? 0);
  });
}
