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

// El módulo se llama "cobros-pagos"; /finanzas/cxc no existe y llevaba a un 404.
const HREF_FINANZAS = "/finanzas/cobros-pagos";

export const FUENTES_FINANZAS: DefinicionFuente[] = [
  {
    fuente: "CXC_VENCIDA",
    area: "ADMINISTRACION",
    etiqueta: "Cobro vencido",
    criterio: "Cuenta por cobrar pendiente o parcial cuya fecha de compromiso ya pasó",
    activa: true,
    anticipa: false,
    async computar({ ahora, inicioDeHoy, limite }) {
      const cxcs = await prisma.cuentaCobrar.findMany({
        where: {
          estado: { in: ["PENDIENTE", "PARCIAL"] },
          fechaCompromiso: { lt: inicioDeHoy },
        },
        select: {
          id: true, concepto: true, monto: true, fechaCompromiso: true,
          cliente: { select: { nombre: true } },
          proyecto: { select: { nombre: true, numeroProyecto: true } },
        },
        orderBy: { fechaCompromiso: "asc" },
        take: limite,
      });

      return cxcs.map(c => {
        const dias = diasDesde(c.fechaCompromiso, ahora);
        return {
          id: `CXC_VENCIDA_${c.id}`,
          fuente: "CXC_VENCIDA" as const,
          titulo: `Cobro vencido — ${c.cliente?.nombre ?? c.concepto}`,
          descripcion: c.proyecto ? `Proyecto #${c.proyecto.numeroProyecto} · ${c.concepto}` : c.concepto,
          area: "ADMINISTRACION" as const,
          entidadId: c.id,
          href: HREF_FINANZAS,
          severidad: sevVencido(dias),
          etiqueta: "Cobro vencido",
          diasVencido: dias,
          cliente: c.cliente?.nombre,
          monto: c.monto,
          fechaRef: c.fechaCompromiso.toISOString(),
        };
      });
    },
  },

  {
    fuente: "CXP_VENCIDA",
    area: "ADMINISTRACION",
    etiqueta: "Pago vencido",
    criterio: "Cuenta por pagar pendiente cuya fecha de compromiso ya pasó",
    activa: true,
    anticipa: false,
    async computar({ ahora, inicioDeHoy, limite }) {
      const cxps = await prisma.cuentaPagar.findMany({
        where: {
          estado: { in: ["PENDIENTE", "PARCIAL", "VENCIDO"] },
          fechaCompromiso: { lt: inicioDeHoy },
        },
        select: {
          id: true, concepto: true, monto: true, fechaCompromiso: true,
          tecnico: { select: { nombre: true } },
          proveedor: { select: { nombre: true } },
          proyecto: { select: { nombre: true, numeroProyecto: true } },
        },
        orderBy: { fechaCompromiso: "asc" },
        take: limite,
      });

      return cxps.map(p => {
        const dias = diasDesde(p.fechaCompromiso, ahora);
        const acreedor = p.tecnico?.nombre ?? p.proveedor?.nombre ?? "Sin asignar";
        return {
          id: `CXP_VENCIDA_${p.id}`,
          fuente: "CXP_VENCIDA" as const,
          titulo: `Pago vencido — ${acreedor}`,
          descripcion: p.proyecto ? `Proyecto #${p.proyecto.numeroProyecto} · ${p.concepto}` : p.concepto,
          area: "ADMINISTRACION" as const,
          entidadId: p.id,
          href: HREF_FINANZAS,
          severidad: sevVencido(dias),
          etiqueta: "Pago vencido",
          diasVencido: dias,
          monto: p.monto,
          fechaRef: p.fechaCompromiso.toISOString(),
        };
      });
    },
  },

  {
    fuente: "CXP_POR_VENCER",
    area: "ADMINISTRACION",
    etiqueta: "Pago por vencer",
    criterio: "Cuenta por pagar que se vence en los próximos 3 días",
    activa: false,
    anticipa: true,
    async computar({ ahora, inicioDeHoy, limite }) {
      const cxps = await prisma.cuentaPagar.findMany({
        where: {
          estado: { in: ["PENDIENTE", "PARCIAL"] },
          fechaCompromiso: { gte: inicioDeHoy, lte: sumarDias(ahora, 3) },
        },
        select: {
          id: true, concepto: true, monto: true, fechaCompromiso: true,
          tecnico: { select: { nombre: true } },
          proveedor: { select: { nombre: true } },
          proyecto: { select: { numeroProyecto: true } },
        },
        orderBy: { fechaCompromiso: "asc" },
        take: limite,
      });

      return cxps.map(p => {
        const dias = diasHasta(p.fechaCompromiso, ahora);
        const acreedor = p.tecnico?.nombre ?? p.proveedor?.nombre ?? "Sin asignar";
        return {
          id: `CXP_POR_VENCER_${p.id}`,
          fuente: "CXP_POR_VENCER" as const,
          titulo: `Pagar en ${dias <= 0 ? "hoy" : plural(dias, "día")} — ${acreedor}`,
          descripcion: p.proyecto ? `Proyecto #${p.proyecto.numeroProyecto} · ${p.concepto}` : p.concepto,
          area: "ADMINISTRACION" as const,
          entidadId: p.id,
          href: HREF_FINANZAS,
          severidad: sevProximo(dias),
          etiqueta: "Por vencer",
          monto: p.monto,
          fechaRef: p.fechaCompromiso.toISOString(),
        };
      });
    },
  },

  {
    fuente: "ANTICIPO_SIN_COBRAR",
    area: "ADMINISTRACION",
    etiqueta: "Anticipo sin cobrar",
    criterio: "El evento es dentro de 7 días y el anticipo sigue sin entrar",
    activa: false,
    anticipa: true,
    async computar({ ahora, inicioDeHoy, limite }) {
      const cxcs = await prisma.cuentaCobrar.findMany({
        where: {
          tipoPago: "ANTICIPO",
          estado: { in: ["PENDIENTE", "PARCIAL"] },
          proyecto: {
            estado: { notIn: ["CANCELADO"] },
            fechaEvento: { gte: inicioDeHoy, lte: sumarDias(ahora, 7) },
          },
        },
        select: {
          id: true, concepto: true, monto: true, montoCobrado: true,
          cliente: { select: { nombre: true } },
          proyecto: { select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true } },
        },
        take: limite,
      });

      return cxcs.map(c => {
        const dias = diasHasta(c.proyecto!.fechaEvento, ahora);
        return {
          id: `ANTICIPO_SIN_COBRAR_${c.id}`,
          fuente: "ANTICIPO_SIN_COBRAR" as const,
          titulo: `Anticipo sin cobrar — ${c.cliente?.nombre ?? c.proyecto!.nombre}`,
          descripcion: `#${c.proyecto!.numeroProyecto} · Evento en ${plural(dias, "día")}`,
          area: "ADMINISTRACION" as const,
          entidadId: c.id,
          href: HREF_FINANZAS,
          severidad: sevProximo(dias),
          etiqueta: "Anticipo",
          cliente: c.cliente?.nombre,
          monto: c.monto - c.montoCobrado,
          fechaRef: c.proyecto!.fechaEvento.toISOString(),
        };
      });
    },
  },

  {
    fuente: "LIQUIDACION_PENDIENTE",
    area: "ADMINISTRACION",
    etiqueta: "Liquidación pendiente",
    criterio: "El evento ya se realizó y la liquidación sigue sin cobrarse",
    activa: false,
    anticipa: false,
    async computar({ ahora, inicioDeHoy, limite }) {
      const cxcs = await prisma.cuentaCobrar.findMany({
        where: {
          tipoPago: "LIQUIDACION",
          estado: { in: ["PENDIENTE", "PARCIAL"] },
          proyecto: {
            estado: { notIn: ["CANCELADO"] },
            fechaEvento: { lt: inicioDeHoy },
          },
        },
        select: {
          id: true, concepto: true, monto: true, montoCobrado: true,
          cliente: { select: { nombre: true } },
          proyecto: { select: { nombre: true, numeroProyecto: true, fechaEvento: true } },
        },
        take: limite,
      });

      return cxcs.map(c => {
        const dias = diasDesde(c.proyecto!.fechaEvento, ahora);
        return {
          id: `LIQUIDACION_PENDIENTE_${c.id}`,
          fuente: "LIQUIDACION_PENDIENTE" as const,
          titulo: `Liquidación pendiente — ${c.cliente?.nombre ?? c.proyecto!.nombre}`,
          descripcion: `#${c.proyecto!.numeroProyecto} · evento hace ${plural(dias, "día")}`,
          area: "ADMINISTRACION" as const,
          entidadId: c.id,
          href: HREF_FINANZAS,
          severidad: sevVencido(dias),
          etiqueta: "Liquidación",
          diasVencido: dias,
          cliente: c.cliente?.nombre,
          monto: c.monto - c.montoCobrado,
          fechaRef: c.proyecto!.fechaEvento.toISOString(),
        };
      });
    },
  },
];
