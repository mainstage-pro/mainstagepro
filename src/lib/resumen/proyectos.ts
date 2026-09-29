import { prisma } from "@/lib/prisma";
import { computarPendientes } from "@/lib/pendientes";
import { diasEntre, num, sumarDias, ventana } from "./base";

const VIVOS = ["PLANEACION", "CONFIRMADO", "EN_CURSO"];

export interface ProyectoResumido {
  id: string;
  numero: string;
  nombre: string;
  cliente: string;
  estado: string;
  fechaEvento: Date;
  dias: number;
  personal: number;
  personalConfirmado: number;
  equipos: number;
  equiposExternos: number;
  equiposExternosConfirmados: number;
  planAprobado: boolean;
  encargado: string | null;
  zona: string;
}

export async function resumenProyectos() {
  const { hoy, finDeHoy } = ventana();
  const en30 = sumarDias(hoy, 30);

  const [proximos, porEstado, cerradosMes, sinCierre, recolecciones, pendientes] = await Promise.all([
    prisma.proyecto.findMany({
      where: { estado: { in: VIVOS }, fechaEvento: { gte: hoy, lte: en30 } },
      select: {
        id: true,
        numeroProyecto: true,
        nombre: true,
        estado: true,
        fechaEvento: true,
        zona: true,
        planProduccionAprobado: true,
        cliente: { select: { nombre: true, empresa: true } },
        encargado: { select: { name: true } },
        personal: { select: { confirmado: true } },
        equipos: { select: { tipo: true, confirmado: true } },
      },
      orderBy: { fechaEvento: "asc" },
    }),
    prisma.proyecto.groupBy({
      by: ["estado"],
      where: { estado: { not: "CANCELADO" } },
      _count: { _all: true },
    }),
    prisma.proyecto.count({
      where: {
        estado: "COMPLETADO",
        fechaEvento: { gte: new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1)), lte: finDeHoy },
      },
    }),
    prisma.proyecto.findMany({
      where: { estado: "COMPLETADO", fechaEvento: { lt: hoy }, cierreFinanciero: { is: null } },
      select: { id: true, numeroProyecto: true, nombre: true, fechaEvento: true },
      orderBy: { fechaEvento: "desc" },
    }),
    prisma.proyecto.count({
      where: { recoleccionStatus: { in: ["PENDIENTE", "EN_CAMINO"] }, fechaEvento: { lte: finDeHoy } },
    }),
    computarPendientes({
      fuentes: [
        "PROYECTO_SIN_PERSONAL",
        "PLAN_SIN_APROBAR",
        "PERSONAL_SIN_CONFIRMAR",
        "EQUIPO_EXTERNO_SIN_CONFIRMAR",
        "PROVEEDOR_SIN_LOGISTICA",
        "CIERRE_FINANCIERO_PENDIENTE",
      ],
    }).catch(() => null),
  ]);

  const lista: ProyectoResumido[] = proximos.map(p => ({
    id: p.id,
    numero: p.numeroProyecto,
    nombre: p.nombre,
    cliente: p.cliente?.empresa || p.cliente?.nombre || "—",
    estado: p.estado,
    fechaEvento: p.fechaEvento,
    dias: diasEntre(hoy, new Date(p.fechaEvento.toISOString().slice(0, 10))),
    personal: p.personal.length,
    personalConfirmado: p.personal.filter(x => x.confirmado).length,
    equipos: p.equipos.length,
    equiposExternos: p.equipos.filter(e => e.tipo === "EXTERNO").length,
    equiposExternosConfirmados: p.equipos.filter(e => e.tipo === "EXTERNO" && e.confirmado).length,
    planAprobado: p.planProduccionAprobado,
    encargado: p.encargado?.name ?? null,
    zona: p.zona,
  }));

  const conteo = (e: string) => num(porEstado.find(x => x.estado === e)?._count._all);

  // Un evento a menos de 7 días sin plan aprobado o sin personal completo ya no
  // es "en preparación": es un riesgo con fecha.
  const enRiesgo = lista.filter(
    p =>
      p.dias <= 7 &&
      (!p.planAprobado ||
        p.personal === 0 ||
        p.personalConfirmado < p.personal ||
        p.equiposExternosConfirmados < p.equiposExternos),
  );

  return {
    lista,
    enRiesgo,
    estaSemana: lista.filter(p => p.dias <= 7).length,
    estados: {
      planeacion: conteo("PLANEACION"),
      confirmado: conteo("CONFIRMADO"),
      enCurso: conteo("EN_CURSO"),
      completado: conteo("COMPLETADO"),
    },
    cerradosMes,
    sinCierre,
    recolecciones,
    pendientes: pendientes?.pendientes ?? [],
  };
}
