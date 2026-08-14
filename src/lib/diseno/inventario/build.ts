import { prisma } from "@/lib/prisma";
import { INVENTARIO_MUESTRA, type InventarioData, type EquipoSlide } from "./data";
import { ARROBA, TELEFONO } from "../servicios/data";

// Arma la serie de Inventario desde equipos reales con foto (Equipo + Categoría).
// Prefiere equipos con tratamiento "foto-marco" (fotos reales, no recortes PNG).
// Toma hasta 2 por categoría para variar la serie. Fallback a muestra. Cacheado.
let cache: { data: InventarioData; ts: number } | null = null;
const TTL_MS = 10 * 60 * 1000;

// Parte "Marca Modelo" en marca (oro) + modelo (blanco), en mayúsculas. Si solo
// hay descripción, usa la primera palabra como oro y el resto como blanco.
function partir(marca: string | null, modelo: string | null, descripcion: string): { gold: string; white: string } {
  if (marca && modelo) return { gold: marca.trim().toUpperCase(), white: modelo.trim().toUpperCase() };
  const fuente = (marca || modelo || descripcion).trim().toUpperCase();
  const partes = fuente.split(/\s+/);
  if (partes.length <= 1) return { gold: partes[0] ?? "", white: "" };
  return { gold: partes[0], white: partes.slice(1).join(" ") };
}

function specsDe(categoria: string, voltaje: string | null, amperaje: number | null): string[] {
  const out = [categoria];
  if (voltaje) out.push(voltaje === "AMBOS" ? "110 / 220 V" : `${voltaje} V`);
  if (amperaje && amperaje > 0) out.push(`${amperaje} A`);
  return out.slice(0, 4);
}

export async function buildInventarioData(): Promise<InventarioData> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.data;
  try {
    const equipos = await prisma.equipo.findMany({
      where: {
        activo: true,
        estado: "ACTIVO",
        noCotizable: false,
        imagenUrl: { not: null },
        tratamiento: "foto-marco",
      },
      orderBy: [{ categoria: { orden: "asc" } }, { precioRenta: "desc" }],
      include: { categoria: { select: { nombre: true, orden: true } } },
    });
    if (equipos.length === 0) return INVENTARIO_MUESTRA;

    // Máx. 2 por categoría, tope 6 slides, para que la serie muestre variedad.
    const porCat = new Map<string, number>();
    const elegidos: typeof equipos = [];
    for (const e of equipos) {
      const n = porCat.get(e.categoriaId) ?? 0;
      if (n >= 2) continue;
      porCat.set(e.categoriaId, n + 1);
      elegidos.push(e);
      if (elegidos.length >= 6) break;
    }

    const fallbackBgs = INVENTARIO_MUESTRA.equipos.map((e) => e.bg);
    const slides: EquipoSlide[] = elegidos.map((e, i) => {
      const { gold, white } = partir(e.marca, e.modelo, e.descripcion);
      return {
        id: `equipo-${e.id}`,
        badge: "EQUIPO EN RENTA",
        label: [e.marca, e.modelo].filter(Boolean).join(" ") || e.descripcion,
        tituloGold: gold,
        tituloWhite: white,
        descripcion: e.descripcion,
        specs: specsDe(e.categoria.nombre, e.voltajeRequerido, e.amperajeRequerido),
        bg: e.imagenUrl || fallbackBgs[i % fallbackBgs.length],
      };
    });

    const data: InventarioData = {
      portada: INVENTARIO_MUESTRA.portada,
      equipos: slides,
      cierre: { ...INVENTARIO_MUESTRA.cierre, telefono: TELEFONO, arroba: ARROBA },
    };
    cache = { data, ts: Date.now() };
    return data;
  } catch {
    return INVENTARIO_MUESTRA;
  }
}
