import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  estadoObjetivo,
  noNegociables,
  parseConductas,
  progresoObjetivo,
  tacticaVencida,
} from "@/lib/estrategia";
import { getPresentationMetadata } from "@/lib/metadata";
import PresentacionCulturaClient, { type DeckData } from "./PresentacionCulturaClient";

export const dynamic = "force-dynamic";

export const metadata = getPresentationMetadata({
  title: "Cultura y estrategia",
  description:
    "Identidad, valores, meta del periodo y cascada de objetivos de Mainstage Pro, leídos en vivo del sistema.",
  path: "/presentacion/cultura",
});

export default async function Page() {
  // Expone metas financieras y objetivos internos: no es una presentación pública.
  const session = await getSession();
  if (!session) redirect("/login?next=/presentacion/cultura");

  const ahora = new Date();

  const [identidad, valoresRaw, meta, areasRaw] = await Promise.all([
    prisma.identidad.findFirst({ where: { vigente: true } }),
    prisma.valorEmpresa.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
    prisma.metaGlobal.findFirst({
      where: { vigente: true },
      include: { indicadores: { orderBy: { orden: "asc" } } },
    }),
    prisma.areaEstrategica.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
      include: {
        objetivos: {
          where: { activo: true },
          orderBy: { orden: "asc" },
          include: { tacticas: { orderBy: { orden: "asc" } } },
        },
      },
    }),
  ]);

  const valores = valoresRaw.map(v => {
    const conductas = parseConductas(v.conductas);
    return {
      id: v.id,
      nombre: v.nombre,
      descripcion: v.descripcion,
      comoSeVive: v.comoSeVive,
      esperadas: conductas.filter(c => c.tipo === "ESPERADA").map(c => c.texto),
      inaceptables: conductas.filter(c => c.tipo === "INACEPTABLE").map(c => c.texto),
    };
  });

  const areas = areasRaw.map(a => {
    const objetivos = a.objetivos.map(o => ({
      id: o.id,
      descripcion: o.descripcion,
      metrica: o.metrica,
      unidad: o.unidad,
      valorMeta: o.valorMeta,
      valorActual: o.valorActual,
      fechaLimite: o.fechaLimite?.toISOString() ?? null,
      progreso: progresoObjetivo(o.tacticas),
      estadoCalc: estadoObjetivo(o.tacticas, o.fechaLimite, ahora),
      tacticas: o.tacticas.length,
      hechas: o.tacticas.filter(t => t.estado === "COMPLETADO").length,
      vencidas: o.tacticas.filter(t => tacticaVencida(t, ahora)).length,
    }));
    const conTacticas = objetivos.filter(o => o.tacticas > 0);
    return {
      id: a.id,
      nombre: a.nombre,
      areaPermiso: a.areaPermiso,
      proposito: a.proposito,
      objetivos,
      progreso: conTacticas.length
        ? Math.round(conTacticas.reduce((s, o) => s + o.progreso, 0) / conTacticas.length)
        : 0,
      enRiesgo: objetivos.filter(o => o.estadoCalc === "EN_RIESGO").length,
    };
  });

  const todos = areas.flatMap(a => a.objetivos);

  const data: DeckData = {
    identidad: identidad && {
      proposito: identidad.proposito,
      mision: identidad.mision,
      vision: identidad.vision,
      frase: identidad.frase,
      aQuienNoServimos: identidad.aQuienNoServimos,
      version: identidad.version,
    },
    valores,
    noNegociables: noNegociables(valoresRaw),
    meta: meta && {
      periodo: meta.periodo,
      titulo: meta.titulo,
      descripcion: meta.descripcion,
      fechaInicio: meta.fechaInicio.toISOString(),
      fechaFin: meta.fechaFin.toISOString(),
      indicadores: meta.indicadores.map(i => ({
        id: i.id,
        nombre: i.nombre,
        unidad: i.unidad,
        lineaBase: i.lineaBase,
        valorMeta: i.valorMeta,
        valorActual: i.valorActual,
      })),
    },
    areas,
    resumen: {
      objetivos: todos.length,
      tacticas: todos.reduce((s, o) => s + o.tacticas, 0),
      progreso: todos.length ? Math.round(todos.reduce((s, o) => s + o.progreso, 0) / todos.length) : 0,
    },
  };

  return <PresentacionCulturaClient data={data} />;
}
