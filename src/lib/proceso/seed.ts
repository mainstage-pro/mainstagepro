// Siembra idempotente del estándar del proceso comercial.
// Usa IDs deterministas para poder correr múltiples veces sin duplicar y
// sin romper las relaciones (Seguimiento.procesoPasoId apunta a estos IDs).
import { prisma } from "@/lib/prisma";
import { SUBETAPAS_SEED, REGLAS_SEED } from "./seed-data";

const subId = (etapaInterna: string) => `sub_${etapaInterna}`;
const pasoId = (etapaInterna: string, orden: number) => `paso_${etapaInterna}_${orden}`;
const reglaId = (orden: number) => `regla_${orden}`;

export async function seedProceso() {
  for (const sub of SUBETAPAS_SEED) {
    const id = subId(sub.etapaInterna);
    await prisma.procesoSubetapa.upsert({
      where: { id },
      update: {
        etapa: sub.etapa,
        etapaInterna: sub.etapaInterna,
        nombre: sub.nombre,
        descripcion: sub.descripcion,
        orden: sub.orden,
        generacionAutomatica: sub.generacionAutomatica,
      },
      create: {
        id,
        etapa: sub.etapa,
        etapaInterna: sub.etapaInterna,
        nombre: sub.nombre,
        descripcion: sub.descripcion,
        orden: sub.orden,
        generacionAutomatica: sub.generacionAutomatica,
      },
    });

    for (const paso of sub.pasos) {
      const pid = pasoId(sub.etapaInterna, paso.orden);
      await prisma.procesoPaso.upsert({
        where: { id: pid },
        update: {
          subetapaId: id,
          orden: paso.orden,
          dia: paso.dia,
          diaUrgente: paso.diaUrgente ?? null,
          titulo: paso.titulo,
          objetivo: paso.objetivo,
          guion: paso.guion,
          canal: paso.canal,
          herramienta: paso.herramienta ?? null,
          avanzaSubetapaA: paso.avanzaSubetapaA ?? null,
        },
        create: {
          id: pid,
          subetapaId: id,
          orden: paso.orden,
          dia: paso.dia,
          diaUrgente: paso.diaUrgente ?? null,
          titulo: paso.titulo,
          objetivo: paso.objetivo,
          guion: paso.guion,
          canal: paso.canal,
          herramienta: paso.herramienta ?? null,
          avanzaSubetapaA: paso.avanzaSubetapaA ?? null,
        },
      });
    }
  }

  for (const regla of REGLAS_SEED) {
    const id = reglaId(regla.orden);
    await prisma.procesoRegla.upsert({
      where: { id },
      update: { orden: regla.orden, texto: regla.texto, categoria: regla.categoria },
      create: { id, orden: regla.orden, texto: regla.texto, categoria: regla.categoria },
    });
  }

  const subetapas = await prisma.procesoSubetapa.count();
  const pasos = await prisma.procesoPaso.count();
  const reglas = await prisma.procesoRegla.count();
  return { subetapas, pasos, reglas };
}
