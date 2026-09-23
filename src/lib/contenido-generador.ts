import { prisma } from "@/lib/prisma";
import { generarFechasDelMes, resolverVariacion, type TipoCiclo } from "@/lib/contenido-variaciones";

interface TipoGenerable extends TipoCiclo {
  id: string;
  cantMes: number | null;
  semanaDelMes: number | null;
  formato: string | null;
  objetivo: string | null;
  enFacebook: boolean;
  enInstagram: boolean;
  enTiktok: boolean;
  enYoutube: boolean;
  variaciones: { id: string; semana: number; posicion: number; activo: boolean }[];
}

/**
 * Crea los slots de publicación de un tipo para un mes, ya ligados a la variación
 * que les toca según el ciclo. No duplica lo que ya existe en esa fecha.
 */
export async function generarParaTipo(tipo: TipoGenerable, year: number, month: number): Promise<number> {
  const fechas = generarFechasDelMes(year, month, tipo);
  if (fechas.length === 0) return 0;

  const yaExisten = await prisma.publicacion.findMany({
    where: {
      tipoId: tipo.id,
      fecha: {
        gte: new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`),
        lt: new Date(Date.UTC(year, month, 1)),
      },
    },
    select: { fecha: true },
  });
  const ocupadas = new Set(yaExisten.map(p => p.fecha.toISOString().slice(0, 10)));

  const activas = tipo.variaciones.filter(v => v.activo);
  const nuevas = fechas
    .filter(f => !ocupadas.has(f))
    .map(f => ({
      fecha: new Date(`${f}T00:00:00.000Z`),
      tipoId: tipo.id,
      variacionId: resolverVariacion(f, tipo, activas)?.id ?? null,
      formato: tipo.formato,
      objetivo: tipo.objetivo,
      enFacebook: tipo.enFacebook,
      enInstagram: tipo.enInstagram,
      enTiktok: tipo.enTiktok,
      enYoutube: tipo.enYoutube,
      estado: "PENDIENTE",
    }));

  if (nuevas.length === 0) return 0;
  const { count } = await prisma.publicacion.createMany({ data: nuevas });
  return count;
}
