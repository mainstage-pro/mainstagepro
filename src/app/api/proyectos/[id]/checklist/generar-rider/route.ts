import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAccesoriosSugeridos } from "@/lib/rider-accesorios";

type EquipoRiderExtra = {
  id: string;
  descripcion: string;
  cantidad: number;
  notas?: string;
  completado?: boolean;
};

/**
 * POST /api/proyectos/[id]/checklist/generar-rider
 * Genera items de tipo RIDER en el checklist a partir del equipo del proyecto.
 * Incluye: equipos de inventario (propios y externos) + equipos adicionales (rider extra).
 * Solo agrega items que no existan ya (por nombre exacto).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Cargar equipos del proyecto
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      equipos: {
        include: {
          equipo: { select: { descripcion: true, marca: true, categoria: { select: { nombre: true } } } },
        },
      },
      checklist: { select: { item: true, tipo: true } },
    },
  });

  if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Items RIDER ya existentes (para deduplicar)
  const existentes = new Set(
    proyecto.checklist
      .filter(c => c.tipo === "RIDER")
      .map(c => c.item.toLowerCase().trim())
  );

  const itemsNuevos: string[] = [];
  const vistos = new Set<string>();

  // ── 1. Equipos de inventario (PROPIO + EXTERNO) ──────────────────────────────
  for (const eq of proyecto.equipos) {
    const accesorios = getAccesoriosSugeridos({
      descripcion: eq.equipo.descripcion,
      marca: eq.equipo.marca,
      categoriaNombre: eq.equipo.categoria.nombre,
    });

    for (const acc of accesorios) {
      const key = acc.nombre.toLowerCase().trim();
      if (!existentes.has(key) && !vistos.has(key)) {
        vistos.add(key);
        const label = acc.nota ? `${acc.nombre} (${acc.nota})` : acc.nombre;
        itemsNuevos.push(label);
      }
    }
  }

  // ── 2. Equipos adicionales (rider extra — JSON en el campo del proyecto) ──────
  let equiposRiderExtra: EquipoRiderExtra[] = [];
  try {
    const raw = (proyecto as unknown as Record<string, unknown>).equiposRiderExtra;
    if (typeof raw === "string" && raw) equiposRiderExtra = JSON.parse(raw);
    else if (Array.isArray(raw)) equiposRiderExtra = raw as EquipoRiderExtra[];
  } catch { /* ignore */ }

  for (const eq of equiposRiderExtra) {
    const nombre = eq.descripcion?.trim();
    if (!nombre) continue;

    // Agregar el equipo adicional mismo como item del checklist
    const label =
      eq.cantidad > 1
        ? `${nombre} (×${eq.cantidad})`
        : nombre;
    const key = label.toLowerCase().trim();

    if (!existentes.has(key) && !vistos.has(key)) {
      vistos.add(key);
      itemsNuevos.push(label);
    }

    // Si el equipo adicional tiene notas relevantes, añadirlas como sub-item
    if (eq.notas?.trim()) {
      const notaKey = `nota: ${eq.notas.trim()}`.toLowerCase();
      if (!existentes.has(notaKey) && !vistos.has(notaKey)) {
        // No las añadimos como item separado — sólo el equipo principal
      }
    }
  }

  if (itemsNuevos.length === 0) {
    return NextResponse.json({ ok: true, creados: 0, mensaje: "No hay items nuevos que agregar" });
  }

  // Obtener orden base
  const baseOrden = await prisma.proyectoChecklist.count({ where: { proyectoId: id } });

  // Crear todos en batch
  await prisma.proyectoChecklist.createMany({
    data: itemsNuevos.map((item, i) => ({
      proyectoId: id,
      item,
      tipo: "RIDER",
      orden: baseOrden + i,
      completado: false,
    })),
  });

  // Retornar los items creados
  const nuevos = await prisma.proyectoChecklist.findMany({
    where: { proyectoId: id, tipo: "RIDER" },
    orderBy: { orden: "asc" },
  });

  return NextResponse.json({ ok: true, creados: itemsNuevos.length, items: nuevos });
}
