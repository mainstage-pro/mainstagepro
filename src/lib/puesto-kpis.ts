import { prisma } from "@/lib/prisma";
import { KPI_PLAN_SLUG_PREFIX, type KpiPuesto } from "@/lib/puesto";

// Persiste los KPIs de un puesto contra PTKPI (el módulo de /metas), usando puesto_id
// como dimensión. No crea un sistema paralelo: estos KPIs viven en /metas con dueño.
// El KPI fijo (Cumplimiento del plan) siempre existe, con esFijoPlan y fórmula fija.
export async function syncPuestoKpis(puestoId: string, areaCode: string | null, kpis: KpiPuesto[]) {
  let areaId: string | null = null;
  if (areaCode) {
    const a = await prisma.pTArea.findFirst({ where: { codigo: areaCode }, select: { id: true } });
    areaId = a?.id ?? null;
  }
  const existentes = await prisma.pTKPI.findMany({ where: { puestoId }, select: { id: true } });
  const idsMantener = new Set(kpis.filter(k => k.id).map(k => k.id!));
  const aBorrar = existentes.filter(e => !idsMantener.has(e.id)).map(e => e.id);
  if (aBorrar.length) await prisma.pTKPI.deleteMany({ where: { id: { in: aBorrar } } });

  for (let i = 0; i < kpis.length; i++) {
    const k = kpis[i];
    const esFijo = !!k.esFijoPlan;
    const data = {
      nombre: k.nombre,
      meta: k.meta || "",
      formula: esFijo
        ? "Score Plan del tablero de cumplimiento del titular del puesto"
        : (k.resultadoEsperado || ""),
      fuente: esFijo
        ? "Cumplimiento (Plan)"
        : (k.fuenteTipo === "automatica" ? (k.fuente || "") : "Manual"),
      resultadoEsperado: k.resultadoEsperado || null,
      unidad: k.unidad || null,
      frecuencia: k.frecuencia || null,
      esFijoPlan: esFijo,
      tipoCalculo: esFijo || k.fuenteTipo === "automatica" ? "automatico" : "manual",
      puestoId,
      areaId,
      orden: i,
      activo: true,
    };
    if (k.id) {
      await prisma.pTKPI.update({ where: { id: k.id }, data });
    } else {
      await prisma.pTKPI.create({
        data: { ...data, slug: esFijo ? `${KPI_PLAN_SLUG_PREFIX}${puestoId}` : null },
      });
    }
  }
}

// Carga los KPIs del puesto para el formulario, en el shape KpiPuesto.
export async function loadPuestoKpis(puestoId: string): Promise<KpiPuesto[]> {
  const rows = await prisma.pTKPI.findMany({ where: { puestoId }, orderBy: { orden: "asc" } });
  return rows.map(r => ({
    id: r.id,
    nombre: r.nombre,
    resultadoEsperado: r.resultadoEsperado ?? "",
    unidad: (r.unidad as KpiPuesto["unidad"]) ?? "%",
    meta: r.meta ?? "",
    frecuencia: (r.frecuencia as KpiPuesto["frecuencia"]) ?? "mensual",
    fuenteTipo: r.tipoCalculo === "manual" ? "manual" : "automatica",
    fuente: r.fuente ?? "",
    esFijoPlan: r.esFijoPlan,
  }));
}
