import { prisma } from "@/lib/prisma";
import type { ProyectoFacts, EquipoFact } from "./facts";

// Trae un Proyecto de la BD y lo convierte en hechos crudos para el brief.
// Usa Prisma (funciona en prod/Vercel). Devuelve null si no existe.
export async function fetchProyectoFacts(proyectoId: string): Promise<ProyectoFacts | null> {
  const p = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: {
      cliente: true,
      equipos: { include: { equipo: { include: { categoria: true } } } },
      personal: true,
    },
  });
  if (!p) return null;

  const equipos: EquipoFact[] = p.equipos.map((pe) => ({
    categoria: pe.equipo.categoria?.nombre ?? "Otros",
    subcategoria: pe.equipo.subcategoria,
    marca: pe.equipo.marca,
    modelo: pe.equipo.modelo,
    descripcion: pe.equipo.descripcion,
    cantidad: pe.cantidad,
  }));

  return {
    nombre: p.nombre,
    clienteNombre: p.cliente?.nombre ?? "",
    clienteEmpresa: p.cliente?.empresa,
    tipoEvento: p.tipoEvento,
    tipoServicio: p.tipoServicio,
    lugarEvento: p.lugarEvento,
    fechaEvento: p.fechaEvento.toISOString(),
    fechasEvento: parseFechas(p.fechasEvento),
    personalCount: new Set((p.personal ?? []).map((pp) => pp.tecnicoId).filter(Boolean)).size,
    equipos,
  };
}

function parseFechas(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? arr.map(String) : null;
  } catch {
    return null;
  }
}
