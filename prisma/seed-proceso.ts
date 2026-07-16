// Siembra del estándar del proceso comercial contra la BD apuntada por DATABASE_URL.
// Uso: npx tsx prisma/seed-proceso.ts
// Idempotente: IDs deterministas, se puede correr múltiples veces sin duplicar.
import { PrismaClient } from "@prisma/client";
import { SUBETAPAS_SEED, REGLAS_SEED } from "../src/lib/proceso/seed-data";

const prisma = new PrismaClient();

const subId = (etapaInterna: string) => `sub_${etapaInterna}`;
const pasoId = (etapaInterna: string, orden: number) => `paso_${etapaInterna}_${orden}`;
const reglaId = (orden: number) => `regla_${orden}`;

async function main() {
  for (const sub of SUBETAPAS_SEED) {
    const id = subId(sub.etapaInterna);
    const subData = {
      etapa: sub.etapa,
      etapaInterna: sub.etapaInterna,
      nombre: sub.nombre,
      descripcion: sub.descripcion,
      orden: sub.orden,
      generacionAutomatica: sub.generacionAutomatica,
    };
    await prisma.procesoSubetapa.upsert({ where: { id }, update: subData, create: { id, ...subData } });

    for (const paso of sub.pasos) {
      const pid = pasoId(sub.etapaInterna, paso.orden);
      const pasoData = {
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
      };
      await prisma.procesoPaso.upsert({ where: { id: pid }, update: pasoData, create: { id: pid, ...pasoData } });
    }
  }

  for (const regla of REGLAS_SEED) {
    const id = reglaId(regla.orden);
    const reglaData = { orden: regla.orden, texto: regla.texto, categoria: regla.categoria };
    await prisma.procesoRegla.upsert({ where: { id }, update: reglaData, create: { id, ...reglaData } });
  }

  const [subetapas, pasos, reglas] = await Promise.all([
    prisma.procesoSubetapa.count(),
    prisma.procesoPaso.count(),
    prisma.procesoRegla.count(),
  ]);
  console.log(`Seed OK — subetapas: ${subetapas}, pasos: ${pasos}, reglas: ${reglas}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
