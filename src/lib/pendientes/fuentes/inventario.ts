import { prisma } from "@/lib/prisma";
import {
  type DefinicionFuente,
  diasDesde,
  diasHasta,
  plural,
  sevProximo,
  sumarDias,
} from "../tipos";

export const FUENTES_INVENTARIO: DefinicionFuente[] = [
  {
    fuente: "EQUIPO_MANTENIMIENTO",
    area: "PRODUCCION",
    etiqueta: "Mantenimiento",
    criterio: "Equipo cuyo estado es mantenimiento o reparación",
    activa: true,
    anticipa: false,
    async computar({ limite }) {
      const equipos = await prisma.equipo.findMany({
        where: { estado: { in: ["EN_MANTENIMIENTO", "EN_REPARACION"] } },
        select: {
          id: true, descripcion: true, marca: true, estado: true,
          categoria: { select: { nombre: true } },
        },
        take: limite,
      });

      return equipos.map(e => {
        const esReparacion = e.estado === "EN_REPARACION";
        return {
          id: `EQUIPO_MANTENIMIENTO_${e.id}`,
          fuente: "EQUIPO_MANTENIMIENTO" as const,
          titulo: `${esReparacion ? "En reparación" : "En mantenimiento"} — ${e.descripcion}`,
          descripcion: [e.marca, e.categoria.nombre].filter(Boolean).join(" · ") || undefined,
          area: "PRODUCCION" as const,
          entidadId: e.id,
          href: "/inventario/mantenimiento",
          severidad: "MEDIA" as const,
          etiqueta: esReparacion ? "Reparación" : "Mantenimiento",
        };
      });
    },
  },

  {
    fuente: "FALLA_CRITICA",
    area: "PRODUCCION",
    etiqueta: "Falla crítica",
    criterio: "Falla de severidad crítica todavía sin resolver",
    activa: false,
    anticipa: false,
    async computar({ ahora, limite }) {
      const fallas = await prisma.fallaEquipo.findMany({
        where: { severidad: "CRITICA", estado: { in: ["REPORTADA", "EN_ATENCION"] } },
        select: {
          id: true, descripcion: true, fecha: true, estado: true,
          equipo: { select: { descripcion: true, marca: true } },
        },
        orderBy: { fecha: "asc" },
        take: limite,
      });

      return fallas.map(f => {
        const dias = diasDesde(f.fecha, ahora);
        return {
          id: `FALLA_CRITICA_${f.id}`,
          fuente: "FALLA_CRITICA" as const,
          titulo: `Falla crítica — ${f.equipo.descripcion}`,
          descripcion: f.descripcion,
          area: "PRODUCCION" as const,
          entidadId: f.id,
          href: "/inventario/mantenimiento",
          severidad: "URGENTE" as const,
          etiqueta: f.estado === "EN_ATENCION" ? "En atención" : "Sin atender",
          diasVencido: dias,
          fechaRef: f.fecha.toISOString(),
        };
      });
    },
  },

  {
    fuente: "FALLA_ESTANCADA",
    area: "PRODUCCION",
    etiqueta: "Falla sin atender",
    criterio: "Falla no crítica reportada hace más de 7 días y nadie la ha tomado",
    activa: false,
    anticipa: false,
    async computar({ ahora, limite }) {
      const fallas = await prisma.fallaEquipo.findMany({
        where: {
          estado: "REPORTADA",
          severidad: { not: "CRITICA" },
          fecha: { lt: sumarDias(ahora, -7) },
        },
        select: {
          id: true, descripcion: true, fecha: true, severidad: true,
          equipo: { select: { descripcion: true } },
        },
        orderBy: { fecha: "asc" },
        take: limite,
      });

      return fallas.map(f => {
        const dias = diasDesde(f.fecha, ahora);
        return {
          id: `FALLA_ESTANCADA_${f.id}`,
          fuente: "FALLA_ESTANCADA" as const,
          titulo: `Falla sin atender — ${f.equipo.descripcion}`,
          descripcion: `${f.descripcion} · reportada hace ${plural(dias, "día")}`,
          area: "PRODUCCION" as const,
          entidadId: f.id,
          href: "/inventario/mantenimiento",
          severidad: dias >= 30 ? "ALTA" : "MEDIA",
          etiqueta: f.severidad === "MODERADA" ? "Moderada" : "Leve",
          diasVencido: dias,
          fechaRef: f.fecha.toISOString(),
        };
      });
    },
  },

  {
    fuente: "VEHICULO_SERVICIO",
    area: "PRODUCCION",
    etiqueta: "Servicio de vehículo",
    criterio: "Vehículo activo cuyo próximo servicio cae dentro de 15 días o ya pasó",
    activa: false,
    anticipa: true,
    async computar({ ahora, limite }) {
      const vehiculos = await prisma.vehiculo.findMany({
        where: {
          activo: true,
          proximoServicioFecha: { not: null, lte: sumarDias(ahora, 15) },
        },
        select: {
          id: true, nombre: true, placas: true,
          proximoServicioFecha: true, proximoServicioKm: true, kilometraje: true,
        },
        orderBy: { proximoServicioFecha: "asc" },
        take: limite,
      });

      return vehiculos.map(v => {
        const dias = diasHasta(v.proximoServicioFecha!, ahora);
        const vencido = dias < 0;
        return {
          id: `VEHICULO_SERVICIO_${v.id}`,
          fuente: "VEHICULO_SERVICIO" as const,
          titulo: `Servicio ${vencido ? "vencido" : `en ${plural(dias, "día")}`} — ${v.nombre}`,
          descripcion: [v.placas, v.proximoServicioKm ? `próximo a ${v.proximoServicioKm.toLocaleString("es-MX")} km` : null]
            .filter(Boolean).join(" · ") || undefined,
          area: "PRODUCCION" as const,
          entidadId: v.id,
          href: "/inventario/vehiculos",
          severidad: vencido ? "URGENTE" : sevProximo(dias),
          etiqueta: vencido ? "Servicio vencido" : "Servicio próximo",
          diasVencido: vencido ? -dias : undefined,
          fechaRef: v.proximoServicioFecha!.toISOString(),
        };
      });
    },
  },
];
