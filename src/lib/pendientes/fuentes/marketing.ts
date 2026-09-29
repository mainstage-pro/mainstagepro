import { prisma } from "@/lib/prisma";
import {
  type DefinicionFuente,
  diasDesde,
  diasHasta,
  plural,
  sevInminente,
  sevProximo,
  sevVencido,
  sumarDias,
} from "../tipos";

export const FUENTES_MARKETING: DefinicionFuente[] = [
  {
    fuente: "LEVANTAMIENTO_PROXIMO",
    area: "MARKETING",
    etiqueta: "Levantamiento próximo",
    criterio: "Cobertura de contenido dentro de 7 días que sigue sin realizarse",
    // El contenido de un evento no se puede recuperar después: o se cubre ese día, o se pierde.
    activa: false,
    anticipa: true,
    async computar({ ahora, inicioDeHoy, limite }) {
      const levantamientos = await prisma.levantamientoContenido.findMany({
        where: {
          estadoLevantamiento: { in: ["PENDIENTE", "CONFIRMADO"] },
          fecha: { gte: inicioDeHoy, lte: sumarDias(ahora, 7) },
        },
        select: {
          id: true, tratoId: true, nombreEvento: true, lugar: true,
          fecha: true, estadoLevantamiento: true, planCobertura: true,
          trato: { select: { cliente: { select: { nombre: true } } } },
        },
        orderBy: { fecha: "asc" },
        take: limite,
      });

      return levantamientos.map(l => {
        const dias = diasHasta(l.fecha!, ahora);
        return {
          id: `LEVANTAMIENTO_PROXIMO_${l.id}`,
          fuente: "LEVANTAMIENTO_PROXIMO" as const,
          titulo: `Cobertura en ${dias <= 0 ? "hoy" : plural(dias, "día")} — ${l.nombreEvento ?? l.trato.cliente.nombre}`,
          descripcion: [l.lugar, l.planCobertura].filter(Boolean).join(" · ") || undefined,
          area: "MARKETING" as const,
          entidadId: l.tratoId,
          href: "/marketing/levantamientos",
          severidad: sevInminente(dias),
          etiqueta: l.estadoLevantamiento === "CONFIRMADO" ? "Confirmado" : "Sin confirmar",
          cliente: l.trato.cliente.nombre,
          fechaRef: l.fecha!.toISOString(),
        };
      });
    },
  },

  {
    fuente: "PUBLICACION_ATRASADA",
    area: "MARKETING",
    etiqueta: "Publicación atrasada",
    criterio: "Publicación programada cuya fecha ya pasó y sigue en pendiente",
    activa: false,
    anticipa: false,
    // Contenido de hace más de dos semanas ya perdió su momento: se replantea, no se publica tarde.
    ventana: 14,
    hrefLista: "/marketing/contenido/parrilla",
    async computar({ ahora, inicioDeHoy, limite }) {
      const publicaciones = await prisma.publicacion.findMany({
        where: {
          estado: "PENDIENTE",
          oculta: false,
          fecha: { lt: inicioDeHoy },
        },
        select: {
          id: true, fecha: true, descripcion: true, formato: true,
          tipo: { select: { nombre: true } },
        },
        // Más recientes primero: si el tope recorta, que recorte arqueología y no lo accionable.
        orderBy: { fecha: "desc" },
        take: limite,
      });

      return publicaciones.map(p => {
        const dias = diasDesde(p.fecha, ahora);
        return {
          id: `PUBLICACION_ATRASADA_${p.id}`,
          fuente: "PUBLICACION_ATRASADA" as const,
          titulo: `Publicar — ${p.descripcion ?? p.tipo?.nombre ?? "contenido programado"}`,
          descripcion: [p.tipo?.nombre, p.formato].filter(Boolean).join(" · ") || undefined,
          area: "MARKETING" as const,
          entidadId: p.id,
          href: "/marketing/contenido/parrilla",
          severidad: sevVencido(dias),
          etiqueta: "Atrasada",
          diasVencido: dias,
          fechaRef: p.fecha.toISOString(),
        };
      });
    },
  },

  {
    fuente: "CAMPANA_SIN_PRESUPUESTO",
    area: "MARKETING",
    etiqueta: "Campaña sin presupuesto",
    criterio: "Campaña que arranca en 7 días o menos y no tiene presupuesto capturado",
    activa: false,
    anticipa: true,
    async computar({ ahora, limite }) {
      const campanas = await prisma.ejecucionCampana.findMany({
        where: {
          estado: { in: ["PLANIFICADA", "EN_EJECUCION"] },
          OR: [{ presupuesto: null }, { presupuesto: 0 }],
          fechaInicio: { lte: sumarDias(ahora, 7) },
          fechaFin: { gte: ahora },
        },
        select: { id: true, nombre: true, canal: true, fechaInicio: true, mes: true },
        orderBy: { fechaInicio: "asc" },
        take: limite,
      });

      return campanas.map(c => ({
        id: `CAMPANA_SIN_PRESUPUESTO_${c.id}`,
        fuente: "CAMPANA_SIN_PRESUPUESTO" as const,
        titulo: `Definir presupuesto — ${c.nombre}`,
        descripcion: [c.canal, c.mes].filter(Boolean).join(" · ") || undefined,
        area: "MARKETING" as const,
        entidadId: c.id,
        href: "/marketing/campanas",
        severidad: sevProximo(diasHasta(c.fechaInicio, ahora)),
        etiqueta: "Sin presupuesto",
        fechaRef: c.fechaInicio.toISOString(),
      }));
    },
  },

  {
    fuente: "CAMPANA_SIN_CERRAR",
    area: "MARKETING",
    etiqueta: "Campaña sin cerrar",
    criterio: "La campaña ya terminó y sigue marcada en ejecución",
    activa: false,
    anticipa: false,
    async computar({ ahora, inicioDeHoy, limite }) {
      const campanas = await prisma.ejecucionCampana.findMany({
        where: { estado: "EN_EJECUCION", fechaFin: { lt: inicioDeHoy } },
        select: { id: true, nombre: true, canal: true, fechaFin: true, presupuesto: true },
        orderBy: { fechaFin: "asc" },
        take: limite,
      });

      return campanas.map(c => {
        const dias = diasDesde(c.fechaFin, ahora);
        return {
          id: `CAMPANA_SIN_CERRAR_${c.id}`,
          fuente: "CAMPANA_SIN_CERRAR" as const,
          titulo: `Cerrar campaña — ${c.nombre}`,
          descripcion: `Terminó hace ${plural(dias, "día")}${c.canal ? ` · ${c.canal}` : ""}`,
          area: "MARKETING" as const,
          entidadId: c.id,
          href: "/marketing/campanas",
          severidad: sevVencido(dias),
          etiqueta: "Sin cerrar",
          diasVencido: dias,
          monto: c.presupuesto ?? undefined,
          fechaRef: c.fechaFin.toISOString(),
        };
      });
    },
  },
];
