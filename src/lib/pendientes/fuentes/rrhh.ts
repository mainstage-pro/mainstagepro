import { prisma } from "@/lib/prisma";
import {
  type DefinicionFuente,
  diasDesde,
  diasHasta,
  plural,
  sevProximo,
  sevVencido,
  sumarDias,
} from "../tipos";

export const FUENTES_RRHH: DefinicionFuente[] = [
  {
    fuente: "DOCUMENTO_POR_VENCER",
    area: "RRHH",
    etiqueta: "Documento por vencer",
    criterio: "Documento de personal activo que vence dentro de 30 días o ya venció",
    activa: false,
    anticipa: true,
    async computar({ ahora, limite }) {
      const documentos = await prisma.documentoPersonal.findMany({
        where: {
          fechaVencimiento: { not: null, lte: sumarDias(ahora, 30) },
          personal: { activo: true },
        },
        select: {
          id: true, tipo: true, nombre: true, fechaVencimiento: true,
          personal: { select: { id: true, nombre: true } },
        },
        orderBy: { fechaVencimiento: "asc" },
        take: limite,
      });

      return documentos.map(d => {
        const dias = diasHasta(d.fechaVencimiento!, ahora);
        const vencido = dias < 0;
        return {
          id: `DOCUMENTO_POR_VENCER_${d.id}`,
          fuente: "DOCUMENTO_POR_VENCER" as const,
          titulo: `${d.nombre} ${vencido ? "vencido" : `vence en ${plural(dias, "día")}`} — ${d.personal.nombre}`,
          descripcion: d.tipo,
          area: "RRHH" as const,
          entidadId: d.personal.id,
          href: `/rrhh/personal/${d.personal.id}`,
          severidad: vencido ? "URGENTE" : sevProximo(dias),
          etiqueta: vencido ? "Vencido" : "Por vencer",
          diasVencido: vencido ? -dias : undefined,
          fechaRef: d.fechaVencimiento!.toISOString(),
        };
      });
    },
  },

  {
    fuente: "EVALUACION_BORRADOR",
    area: "RRHH",
    etiqueta: "Evaluación en borrador",
    criterio: "Evaluación abierta hace más de 7 días que nunca se cerró",
    activa: false,
    anticipa: false,
    async computar({ ahora, limite }) {
      const evaluaciones = await prisma.evaluacionEmpleado.findMany({
        where: { estado: "BORRADOR", createdAt: { lt: sumarDias(ahora, -7) } },
        select: {
          id: true, periodo: true, createdAt: true, evaluador: true,
          personal: { select: { nombre: true } },
        },
        orderBy: { createdAt: "asc" },
        take: limite,
      });

      return evaluaciones.map(e => {
        const dias = diasDesde(e.createdAt, ahora);
        return {
          id: `EVALUACION_BORRADOR_${e.id}`,
          fuente: "EVALUACION_BORRADOR" as const,
          titulo: `Cerrar evaluación — ${e.personal.nombre}`,
          descripcion: `Periodo ${e.periodo} · abierta hace ${plural(dias, "día")}`,
          area: "RRHH" as const,
          entidadId: e.id,
          href: `/rrhh/evaluaciones/${e.id}`,
          severidad: sevVencido(dias),
          etiqueta: "Borrador",
          diasVencido: dias,
          fechaRef: e.createdAt.toISOString(),
        };
      });
    },
  },

  {
    fuente: "VACACIONES_PENDIENTES",
    area: "RRHH",
    etiqueta: "Vacaciones por autorizar",
    criterio: "Solicitud de vacaciones que sigue esperando respuesta",
    activa: false,
    anticipa: false,
    async computar({ ahora, limite }) {
      const solicitudes = await prisma.solicitudVacaciones.findMany({
        where: { estado: "PENDIENTE" },
        select: {
          id: true, fechaInicio: true, fechaFin: true, dias: true, createdAt: true,
          personal: { select: { id: true, nombre: true } },
        },
        orderBy: { fechaInicio: "asc" },
        take: limite,
      });

      return solicitudes.map(s => {
        const esperando = diasDesde(s.createdAt, ahora);
        const faltan = diasHasta(s.fechaInicio, ahora);
        return {
          id: `VACACIONES_PENDIENTES_${s.id}`,
          fuente: "VACACIONES_PENDIENTES" as const,
          titulo: `Autorizar vacaciones — ${s.personal.nombre}`,
          descripcion: `${s.dias} día${s.dias === 1 ? "" : "s"} · inicia en ${plural(faltan, "día")}`,
          area: "RRHH" as const,
          entidadId: s.personal.id,
          href: "/rrhh/asistencia",
          severidad: faltan <= 7 ? "URGENTE" : sevVencido(esperando),
          etiqueta: "Por autorizar",
          diasVencido: esperando,
          fechaRef: s.fechaInicio.toISOString(),
        };
      });
    },
  },
];
