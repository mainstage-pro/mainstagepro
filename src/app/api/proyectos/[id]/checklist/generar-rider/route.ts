import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAccesoriosSugeridos } from "@/lib/rider-accesorios";

/**
 * POST /api/proyectos/[id]/checklist/generar-rider
 * Genera items de tipo RIDER en el checklist a partir del equipo del proyecto.
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

  // Generar accesorios sugeridos por cada equipo
  const itemsNuevos: string[] = [];
  const vistos = new Set<string>();

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
