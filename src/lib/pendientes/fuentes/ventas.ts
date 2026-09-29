import { prisma } from "@/lib/prisma";
import {
  type DefinicionFuente,
  diasDesde,
  diasHasta,
  sevProximo,
  sevVencido,
  sumarDias,
} from "../tipos";

const ESTADOS_COTIZACION_VIVA = ["ENVIADA", "EN_REVISION", "AJUSTE_SOLICITADO", "REENVIADA"];

export const FUENTES_VENTAS: DefinicionFuente[] = [
  {
    fuente: "TRATO_VENCIDO",
    area: "VENTAS",
    etiqueta: "Seguimiento vencido",
    criterio: "Trato en descubrimiento u oportunidad cuya fecha de próxima acción ya pasó",
    activa: true,
    anticipa: false,
    async computar({ ahora, limite }) {
      const tratos = await prisma.trato.findMany({
        where: {
          etapa: { in: ["DESCUBRIMIENTO", "OPORTUNIDAD"] },
          fechaProximaAccion: { lt: ahora },
        },
        select: {
          id: true, nombreEvento: true, fechaProximaAccion: true,
          cliente: { select: { nombre: true } },
        },
        orderBy: { fechaProximaAccion: "asc" },
        take: limite,
      });

      return tratos.map(t => {
        const dias = diasDesde(t.fechaProximaAccion!, ahora);
        return {
          id: `TRATO_VENCIDO_${t.id}`,
          fuente: "TRATO_VENCIDO" as const,
          titulo: `Dar seguimiento — ${t.cliente.nombre}`,
          descripcion: t.nombreEvento ? `Evento: ${t.nombreEvento}` : undefined,
          area: "VENTAS" as const,
          entidadId: t.id,
          href: `/crm/tratos/${t.id}`,
          severidad: sevVencido(dias),
          etiqueta: "Seguimiento vencido",
          diasVencido: dias,
          cliente: t.cliente.nombre,
          fechaRef: t.fechaProximaAccion!.toISOString(),
        };
      });
    },
  },

  {
    fuente: "TRATO_EN_REVISION",
    area: "VENTAS",
    etiqueta: "Marcado para revisión",
    criterio: "Trato con la bandera requiereRevision encendida",
    activa: false,
    anticipa: false,
    async computar({ ahora, limite }) {
      const tratos = await prisma.trato.findMany({
        where: { requiereRevision: true, etapa: { notIn: ["VENTA_PERDIDA"] } },
        select: {
          id: true, nombreEvento: true, etapa: true, updatedAt: true,
          cliente: { select: { nombre: true } },
        },
        orderBy: { updatedAt: "asc" },
        take: limite,
      });

      return tratos.map(t => ({
        id: `TRATO_EN_REVISION_${t.id}`,
        fuente: "TRATO_EN_REVISION" as const,
        titulo: `Revisar trato — ${t.cliente.nombre}`,
        descripcion: t.nombreEvento ?? `Etapa: ${t.etapa}`,
        area: "VENTAS" as const,
        entidadId: t.id,
        href: `/crm/tratos/${t.id}`,
        severidad: sevVencido(diasDesde(t.updatedAt, ahora)),
        etiqueta: "Revisión",
        cliente: t.cliente.nombre,
        fechaRef: t.updatedAt.toISOString(),
      }));
    },
  },

  {
    fuente: "COTIZACION_POR_VENCER",
    area: "VENTAS",
    etiqueta: "Cotización por vencer",
    criterio: "Cotización enviada y aún viva cuya vigencia termina en 5 días o menos",
    activa: false,
    anticipa: true,
    async computar({ ahora, limite }) {
      const cotizaciones = await prisma.cotizacion.findMany({
        where: {
          estado: { in: ESTADOS_COTIZACION_VIVA },
          fechaVencimiento: { gte: ahora, lte: sumarDias(ahora, 5) },
        },
        select: {
          id: true, numeroCotizacion: true, nombreEvento: true,
          granTotal: true, fechaVencimiento: true,
          cliente: { select: { nombre: true } },
        },
        orderBy: { fechaVencimiento: "asc" },
        take: limite,
      });

      return cotizaciones.map(c => {
        const dias = diasHasta(c.fechaVencimiento!, ahora);
        return {
          id: `COTIZACION_POR_VENCER_${c.id}`,
          fuente: "COTIZACION_POR_VENCER" as const,
          titulo: `Vence en ${dias === 0 ? "hoy" : `${dias} día${dias === 1 ? "" : "s"}`} — ${c.cliente.nombre}`,
          descripcion: `${c.numeroCotizacion}${c.nombreEvento ? ` · ${c.nombreEvento}` : ""}`,
          area: "VENTAS" as const,
          entidadId: c.id,
          href: `/cotizaciones/${c.id}`,
          severidad: sevProximo(dias),
          etiqueta: "Por vencer",
          cliente: c.cliente.nombre,
          monto: c.granTotal,
          fechaRef: c.fechaVencimiento!.toISOString(),
        };
      });
    },
  },

  {
    fuente: "COTIZACION_APROBADA_SIN_PROYECTO",
    area: "VENTAS",
    etiqueta: "Venta cerrada sin abrir",
    criterio: "Cotización APROBADA que todavía no tiene proyecto — la venta está cerrada y nadie la ha operado",
    activa: false,
    anticipa: false,
    async computar({ ahora, limite }) {
      const cotizaciones = await prisma.cotizacion.findMany({
        where: { estado: "APROBADA", proyecto: { is: null } },
        select: {
          id: true, numeroCotizacion: true, nombreEvento: true, granTotal: true,
          fechaEvento: true, aprobacionFecha: true, updatedAt: true,
          cliente: { select: { nombre: true } },
        },
        orderBy: { updatedAt: "asc" },
        take: limite,
      });

      return cotizaciones.map(c => {
        const desde = c.aprobacionFecha ?? c.updatedAt;
        const dias = diasDesde(desde, ahora);
        return {
          id: `COTIZACION_APROBADA_SIN_PROYECTO_${c.id}`,
          fuente: "COTIZACION_APROBADA_SIN_PROYECTO" as const,
          titulo: `Abrir proyecto — ${c.cliente.nombre}`,
          descripcion: `${c.numeroCotizacion} aprobada${c.nombreEvento ? ` · ${c.nombreEvento}` : ""}`,
          area: "VENTAS" as const,
          entidadId: c.id,
          href: `/cotizaciones/${c.id}`,
          severidad: dias >= 1 ? "URGENTE" : "ALTA",
          etiqueta: "Sin proyecto",
          diasVencido: dias,
          cliente: c.cliente.nombre,
          monto: c.granTotal,
          fechaRef: desde.toISOString(),
        };
      });
    },
  },

  {
    fuente: "EVENTO_CONFIRMADO_SIN_APROBAR",
    area: "VENTAS",
    etiqueta: "Confirmado sin cerrar",
    criterio: "El evento se confirmó en calendario pero la cotización sigue sin aprobarse",
    activa: false,
    anticipa: true,
    async computar({ ahora, inicioDeHoy, limite }) {
      const cotizaciones = await prisma.cotizacion.findMany({
        where: {
          eventoConfirmado: true,
          estado: { notIn: ["APROBADA", "RECHAZADA", "VENCIDA"] },
          fechaEvento: { gte: inicioDeHoy },
        },
        select: {
          id: true, numeroCotizacion: true, nombreEvento: true,
          granTotal: true, fechaEvento: true, estado: true,
          cliente: { select: { nombre: true } },
        },
        orderBy: { fechaEvento: "asc" },
        take: limite,
      });

      return cotizaciones.map(c => {
        const dias = diasHasta(c.fechaEvento!, ahora);
        return {
          id: `EVENTO_CONFIRMADO_SIN_APROBAR_${c.id}`,
          fuente: "EVENTO_CONFIRMADO_SIN_APROBAR" as const,
          titulo: `Cerrar cotización — ${c.cliente.nombre}`,
          descripcion: `${c.numeroCotizacion} en ${c.estado} · evento en ${dias} día${dias === 1 ? "" : "s"}`,
          area: "VENTAS" as const,
          entidadId: c.id,
          href: `/cotizaciones/${c.id}`,
          severidad: sevProximo(dias),
          etiqueta: "Confirmado sin aprobar",
          cliente: c.cliente.nombre,
          monto: c.granTotal,
          fechaRef: c.fechaEvento!.toISOString(),
        };
      });
    },
  },
];
