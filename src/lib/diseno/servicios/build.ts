import { prisma } from "@/lib/prisma";
import { ARROBA, SERVICIOS_MUESTRA, TELEFONO, type ServiciosData, type ServicioSlide } from "./data";

// Arma la serie de Servicios desde el catálogo real (TipoServicio + fotos). Si el
// catálogo no está sembrado o falla, cae en la muestra. Cacheado en memoria.
let cache: { data: ServiciosData; ts: number } | null = null;
const TTL_MS = 10 * 60 * 1000;

// Parte un nombre en "primera palabra" (oro) + resto (blanco), en mayúsculas.
function partirTitulo(nombre: string): { gold: string; white: string } {
  const partes = nombre.trim().toUpperCase().split(/\s+/);
  if (partes.length <= 1) return { gold: partes[0] ?? "", white: "" };
  return { gold: partes[0], white: partes.slice(1).join(" ") };
}

export async function buildServiciosData(): Promise<ServiciosData> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.data;
  try {
    const tipos = await prisma.tipoServicio.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
      include: { fotos: { orderBy: [{ destacada: "desc" }, { orden: "asc" }], take: 1 } },
    });
    if (tipos.length === 0) return SERVICIOS_MUESTRA;

    const fallbackBgs = SERVICIOS_MUESTRA.servicios.map((s) => s.bg);
    const servicios: ServicioSlide[] = tipos.slice(0, 4).map((t, i) => {
      const { gold, white } = partirTitulo(t.nombre);
      return {
        id: `servicio-${t.slug}`,
        badge: "SERVICIOS MAINSTAGE",
        label: t.nombre,
        tituloGold: gold,
        tituloWhite: white,
        descripcion: t.subtitulo || t.descripcion?.split(". ")[0] || SERVICIOS_MUESTRA.servicios[i]?.descripcion || "",
        bullets: SERVICIOS_MUESTRA.servicios[i]?.bullets ?? [],
        bg: t.fotos[0]?.url || fallbackBgs[i % fallbackBgs.length],
      };
    });

    const data: ServiciosData = {
      portada: SERVICIOS_MUESTRA.portada,
      servicios,
      cierre: { ...SERVICIOS_MUESTRA.cierre, telefono: TELEFONO, arroba: ARROBA },
    };
    cache = { data, ts: Date.now() };
    return data;
  } catch {
    return SERVICIOS_MUESTRA;
  }
}
