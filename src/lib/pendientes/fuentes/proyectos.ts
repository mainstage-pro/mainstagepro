import { prisma } from "@/lib/prisma";
import {
  type DefinicionFuente,
  type Pendiente,
  diasDesde,
  diasHasta,
  plural,
  sevProximo,
  sevVencido,
  sumarDias,
} from "../tipos";

const ESTADOS_VIVOS = ["PLANEACION", "CONFIRMADO", "EN_CURSO"];

type ProyectoRef = {
  id: string;
  nombre: string;
  numeroProyecto: string;
  fechaEvento: Date;
  cliente: { nombre: string } | null;
};

/**
 * Un renglón por proyecto, no por técnico. Treinta técnicos sin confirmar en un
 * evento son UN pendiente ("faltan 30 confirmaciones"), no treinta avisos.
 */
async function agruparPorProyecto(
  proyectoIds: string[],
): Promise<Map<string, ProyectoRef>> {
  if (proyectoIds.length === 0) return new Map();
  const proyectos = await prisma.proyecto.findMany({
    where: { id: { in: proyectoIds } },
    select: {
      id: true, nombre: true, numeroProyecto: true, fechaEvento: true,
      cliente: { select: { nombre: true } },
    },
  });
  return new Map(proyectos.map(p => [p.id, p]));
}

export const FUENTES_PROYECTOS: DefinicionFuente[] = [
  {
    fuente: "PROYECTO_SIN_PERSONAL",
    area: "PRODUCCION",
    etiqueta: "Sin personal",
    criterio: "Proyecto con evento dentro de 30 días y ni un solo técnico confirmado",
    activa: true,
    anticipa: false,
    async computar({ ahora, limite }) {
      const proyectos = await prisma.proyecto.findMany({
        where: {
          estado: { in: ["PLANEACION", "CONFIRMADO"] },
          fechaEvento: { gte: ahora, lte: sumarDias(ahora, 30) },
          personal: { none: { confirmado: true } },
        },
        select: {
          id: true, nombre: true, numeroProyecto: true, fechaEvento: true,
          cliente: { select: { nombre: true } },
        },
        orderBy: { fechaEvento: "asc" },
        take: limite,
      });

      return proyectos.map(p => {
        const dias = diasHasta(p.fechaEvento, ahora);
        return {
          id: `PROYECTO_SIN_PERSONAL_${p.id}`,
          fuente: "PROYECTO_SIN_PERSONAL" as const,
          titulo: `Sin personal confirmado — ${p.nombre}`,
          descripcion: `${p.cliente?.nombre ?? ""} · Evento en ${plural(dias, "día")}`,
          area: "PRODUCCION" as const,
          entidadId: p.id,
          href: `/proyectos/${p.id}`,
          severidad: dias <= 7 ? "URGENTE" : dias <= 14 ? "ALTA" : "MEDIA",
          etiqueta: "Sin personal",
          cliente: p.cliente?.nombre,
          fechaRef: p.fechaEvento.toISOString(),
        };
      });
    },
  },

  {
    fuente: "PLAN_SIN_APROBAR",
    area: "PRODUCCION",
    etiqueta: "Plan sin aprobar",
    criterio: "Evento dentro de 7 días cuyo plan de producción sigue sin aprobarse",
    activa: false,
    anticipa: true,
    async computar({ ahora, inicioDeHoy, limite }) {
      const proyectos = await prisma.proyecto.findMany({
        where: {
          estado: { in: ["PLANEACION", "CONFIRMADO"] },
          planProduccionAprobado: false,
          fechaEvento: { gte: inicioDeHoy, lte: sumarDias(ahora, 7) },
        },
        select: {
          id: true, nombre: true, numeroProyecto: true, fechaEvento: true,
          cliente: { select: { nombre: true } },
        },
        orderBy: { fechaEvento: "asc" },
        take: limite,
      });

      return proyectos.map(p => {
        const dias = diasHasta(p.fechaEvento, ahora);
        return {
          id: `PLAN_SIN_APROBAR_${p.id}`,
          fuente: "PLAN_SIN_APROBAR" as const,
          titulo: `Aprobar plan — ${p.nombre}`,
          descripcion: `#${p.numeroProyecto} · Evento en ${plural(dias, "día")}`,
          area: "PRODUCCION" as const,
          entidadId: p.id,
          href: `/proyectos/${p.id}/plan`,
          severidad: sevProximo(dias),
          etiqueta: "Plan sin aprobar",
          cliente: p.cliente?.nombre,
          fechaRef: p.fechaEvento.toISOString(),
        };
      });
    },
  },

  {
    fuente: "PERSONAL_SIN_CONFIRMAR",
    area: "PRODUCCION",
    etiqueta: "Faltan confirmaciones",
    criterio: "Evento dentro de 10 días con técnicos asignados que todavía no confirman",
    activa: false,
    anticipa: true,
    async computar({ ahora, inicioDeHoy, limite }) {
      const grupos = await prisma.proyectoPersonal.groupBy({
        by: ["proyectoId"],
        where: {
          confirmado: false,
          tecnicoId: { not: null },
          necesitaRevision: false,
          proyecto: {
            estado: { in: ESTADOS_VIVOS },
            fechaEvento: { gte: inicioDeHoy, lte: sumarDias(ahora, 10) },
          },
        },
        _count: { _all: true },
        orderBy: { proyectoId: "asc" },
        take: limite,
      });

      const proyectos = await agruparPorProyecto(grupos.map(g => g.proyectoId));

      return grupos.flatMap<Pendiente>(g => {
        const p = proyectos.get(g.proyectoId);
        if (!p) return [];
        const dias = diasHasta(p.fechaEvento, ahora);
        return [{
          id: `PERSONAL_SIN_CONFIRMAR_${p.id}`,
          fuente: "PERSONAL_SIN_CONFIRMAR",
          titulo: `${plural(g._count._all, "técnico")} sin confirmar — ${p.nombre}`,
          descripcion: `#${p.numeroProyecto} · Evento en ${plural(dias, "día")}`,
          area: "PRODUCCION",
          entidadId: p.id,
          href: `/proyectos/${p.id}`,
          severidad: sevProximo(dias),
          etiqueta: "Sin confirmar",
          cliente: p.cliente?.nombre ?? undefined,
          fechaRef: p.fechaEvento.toISOString(),
        }];
      });
    },
  },

  {
    fuente: "PERSONAL_NECESITA_REVISION",
    area: "PRODUCCION",
    etiqueta: "Personal por revisar",
    criterio: "El rol se quitó de la cotización y el técnico sigue asignado al proyecto",
    activa: false,
    anticipa: false,
    async computar({ ahora, limite }) {
      const grupos = await prisma.proyectoPersonal.groupBy({
        by: ["proyectoId"],
        where: {
          necesitaRevision: true,
          proyecto: { estado: { in: ESTADOS_VIVOS } },
        },
        _count: { _all: true },
        orderBy: { proyectoId: "asc" },
        take: limite,
      });

      const proyectos = await agruparPorProyecto(grupos.map(g => g.proyectoId));

      return grupos.flatMap<Pendiente>(g => {
        const p = proyectos.get(g.proyectoId);
        if (!p) return [];
        const dias = diasHasta(p.fechaEvento, ahora);
        return [{
          id: `PERSONAL_NECESITA_REVISION_${p.id}`,
          fuente: "PERSONAL_NECESITA_REVISION",
          titulo: `Revisar ${plural(g._count._all, "asignación", "es")} — ${p.nombre}`,
          descripcion: `#${p.numeroProyecto} · el rol ya no está en la cotización`,
          area: "PRODUCCION",
          entidadId: p.id,
          href: `/proyectos/${p.id}`,
          severidad: dias <= 7 ? "ALTA" : "MEDIA",
          etiqueta: "Por revisar",
          cliente: p.cliente?.nombre ?? undefined,
          fechaRef: p.fechaEvento.toISOString(),
        }];
      });
    },
  },

  {
    fuente: "EQUIPO_EXTERNO_SIN_CONFIRMAR",
    area: "PRODUCCION",
    etiqueta: "Renta sin confirmar",
    criterio: "Evento dentro de 10 días con equipo de tercero que el proveedor no ha confirmado",
    activa: false,
    anticipa: true,
    async computar({ ahora, inicioDeHoy, limite }) {
      const grupos = await prisma.proyectoEquipo.groupBy({
        by: ["proyectoId"],
        where: {
          tipo: "EXTERNO",
          confirmado: false,
          necesitaRevision: false,
          proyecto: {
            estado: { in: ESTADOS_VIVOS },
            fechaEvento: { gte: inicioDeHoy, lte: sumarDias(ahora, 10) },
          },
        },
        _count: { _all: true },
        orderBy: { proyectoId: "asc" },
        take: limite,
      });

      const proyectos = await agruparPorProyecto(grupos.map(g => g.proyectoId));

      return grupos.flatMap<Pendiente>(g => {
        const p = proyectos.get(g.proyectoId);
        if (!p) return [];
        const dias = diasHasta(p.fechaEvento, ahora);
        return [{
          id: `EQUIPO_EXTERNO_SIN_CONFIRMAR_${p.id}`,
          fuente: "EQUIPO_EXTERNO_SIN_CONFIRMAR",
          titulo: `${plural(g._count._all, "renta")} sin confirmar — ${p.nombre}`,
          descripcion: `#${p.numeroProyecto} · Evento en ${plural(dias, "día")}`,
          area: "PRODUCCION",
          entidadId: p.id,
          href: `/proyectos/${p.id}`,
          severidad: sevProximo(dias),
          etiqueta: "Renta sin confirmar",
          cliente: p.cliente?.nombre ?? undefined,
          fechaRef: p.fechaEvento.toISOString(),
        }];
      });
    },
  },

  {
    fuente: "PROVEEDOR_SIN_LOGISTICA",
    area: "PRODUCCION",
    etiqueta: "Logística sin definir",
    criterio: "Proveedor del evento sin modalidad de entrega o de regreso, a menos de 7 días",
    activa: false,
    anticipa: true,
    async computar({ ahora, inicioDeHoy, limite }) {
      const proveedores = await prisma.proveedorEvento.findMany({
        where: {
          imprevisto: false,
          OR: [{ modalidadEntrega: null }, { modalidadRegreso: null }],
          proyecto: {
            estado: { in: ESTADOS_VIVOS },
            fechaEvento: { gte: inicioDeHoy, lte: sumarDias(ahora, 7) },
          },
        },
        select: {
          id: true, nombreProveedor: true, servicioEquipo: true,
          modalidadEntrega: true, modalidadRegreso: true,
          proyecto: {
            select: {
              id: true, nombre: true, numeroProyecto: true, fechaEvento: true,
              cliente: { select: { nombre: true } },
            },
          },
        },
        take: limite,
      });

      return proveedores.map(pe => {
        const dias = diasHasta(pe.proyecto.fechaEvento, ahora);
        const falta = [
          pe.modalidadEntrega ? null : "entrega",
          pe.modalidadRegreso ? null : "regreso",
        ].filter(Boolean).join(" y ");
        return {
          id: `PROVEEDOR_SIN_LOGISTICA_${pe.id}`,
          fuente: "PROVEEDOR_SIN_LOGISTICA" as const,
          titulo: `Definir ${falta} — ${pe.nombreProveedor}`,
          descripcion: `${pe.proyecto.nombre}${pe.servicioEquipo ? ` · ${pe.servicioEquipo}` : ""}`,
          area: "PRODUCCION" as const,
          entidadId: pe.proyecto.id,
          href: `/proyectos/${pe.proyecto.id}`,
          severidad: sevProximo(dias),
          etiqueta: "Logística sin definir",
          cliente: pe.proyecto.cliente?.nombre,
          fechaRef: pe.proyecto.fechaEvento.toISOString(),
        };
      });
    },
  },

  {
    fuente: "CARGA_INCIDENCIA",
    area: "PRODUCCION",
    etiqueta: "Incidencia de carga",
    criterio: "Equipo marcado como faltante o dañado durante la verificación de carga",
    activa: false,
    anticipa: false,
    async computar({ ahora, limite }) {
      const grupos = await prisma.proyectoCargaItem.groupBy({
        by: ["cargaId"],
        where: { estado: { in: ["FALTANTE", "DANADO"] } },
        _count: { _all: true },
        orderBy: { cargaId: "asc" },
        take: limite,
      });

      if (grupos.length === 0) return [];

      const cargas = await prisma.proyectoCarga.findMany({
        where: { id: { in: grupos.map(g => g.cargaId) } },
        select: {
          id: true, tipo: true, etiqueta: true,
          proyecto: {
            select: {
              id: true, nombre: true, numeroProyecto: true, fechaEvento: true,
              cliente: { select: { nombre: true } },
            },
          },
        },
      });
      const porId = new Map(cargas.map(c => [c.id, c]));

      return grupos.flatMap<Pendiente>(g => {
        const c = porId.get(g.cargaId);
        if (!c) return [];
        return [{
          id: `CARGA_INCIDENCIA_${c.id}`,
          fuente: "CARGA_INCIDENCIA",
          titulo: `${plural(g._count._all, "incidencia", "s")} en ${c.tipo === "SALIDA" ? "salida" : "retorno"} — ${c.proyecto.nombre}`,
          descripcion: `#${c.proyecto.numeroProyecto}${c.etiqueta ? ` · ${c.etiqueta}` : ""}`,
          area: "PRODUCCION",
          entidadId: c.proyecto.id,
          href: `/proyectos/${c.proyecto.id}`,
          severidad: sevVencido(diasDesde(c.proyecto.fechaEvento, ahora)),
          etiqueta: "Incidencia de carga",
          cliente: c.proyecto.cliente?.nombre ?? undefined,
          fechaRef: c.proyecto.fechaEvento.toISOString(),
        }];
      });
    },
  },

  {
    fuente: "RECOLECCION_PENDIENTE",
    area: "PRODUCCION",
    etiqueta: "Recolección pendiente",
    criterio: "El evento ya pasó y el equipo rentado sigue sin regresar a bodega",
    activa: false,
    anticipa: false,
    async computar({ ahora, inicioDeHoy, limite }) {
      const proyectos = await prisma.proyecto.findMany({
        where: {
          recoleccionStatus: { in: ["PENDIENTE", "EN_CAMINO"] },
          fechaEvento: { lt: inicioDeHoy },
          estado: { notIn: ["CANCELADO"] },
        },
        select: {
          id: true, nombre: true, numeroProyecto: true, fechaEvento: true,
          recoleccionStatus: true,
          cliente: { select: { nombre: true } },
        },
        orderBy: { fechaEvento: "asc" },
        take: limite,
      });

      return proyectos.map(p => {
        const dias = diasDesde(p.fechaEvento, ahora);
        return {
          id: `RECOLECCION_PENDIENTE_${p.id}`,
          fuente: "RECOLECCION_PENDIENTE" as const,
          titulo: `Recoger equipo — ${p.nombre}`,
          descripcion: `#${p.numeroProyecto} · ${p.recoleccionStatus === "EN_CAMINO" ? "en camino" : "sin recoger"}`,
          area: "PRODUCCION" as const,
          entidadId: p.id,
          href: "/inventario/recolecciones",
          severidad: sevVencido(dias),
          etiqueta: "Recolección",
          diasVencido: dias,
          cliente: p.cliente?.nombre,
          fechaRef: p.fechaEvento.toISOString(),
        };
      });
    },
  },

  {
    fuente: "CIERRE_FINANCIERO_PENDIENTE",
    area: "ADMINISTRACION",
    etiqueta: "Cierre pendiente",
    criterio: "Proyecto completado hace más de 3 días sin cierre financiero",
    activa: false,
    anticipa: false,
    async computar({ ahora, limite }) {
      const proyectos = await prisma.proyecto.findMany({
        where: {
          estado: "COMPLETADO",
          cierreFinanciero: { is: null },
          fechaEvento: { lt: sumarDias(ahora, -3) },
        },
        select: {
          id: true, nombre: true, numeroProyecto: true, fechaEvento: true,
          cliente: { select: { nombre: true } },
        },
        orderBy: { fechaEvento: "asc" },
        take: limite,
      });

      return proyectos.map(p => {
        const dias = diasDesde(p.fechaEvento, ahora);
        return {
          id: `CIERRE_FINANCIERO_PENDIENTE_${p.id}`,
          fuente: "CIERRE_FINANCIERO_PENDIENTE" as const,
          titulo: `Cerrar finanzas — ${p.nombre}`,
          descripcion: `#${p.numeroProyecto} · evento hace ${plural(dias, "día")}`,
          area: "ADMINISTRACION" as const,
          entidadId: p.id,
          href: `/proyectos/${p.id}`,
          severidad: dias >= 30 ? "URGENTE" : dias >= 14 ? "ALTA" : "MEDIA",
          etiqueta: "Cierre pendiente",
          diasVencido: dias,
          cliente: p.cliente?.nombre,
          fechaRef: p.fechaEvento.toISOString(),
        };
      });
    },
  },
];
