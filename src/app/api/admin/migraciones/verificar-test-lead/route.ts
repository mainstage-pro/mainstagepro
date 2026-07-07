import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/migraciones/verificar-test-lead
 * Verifica si existe el registro de test lead y sus relaciones.
 *
 * DELETE /api/admin/migraciones/verificar-test-lead
 * Elimina el test lead si no tiene tratos/cotizaciones vinculadas.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const testClientes = await prisma.cliente.findMany({
    where: {
      OR: [
        { nombre: { contains: "test lead", mode: "insensitive" } },
        { nombre: { contains: "dummy data", mode: "insensitive" } },
        { telefono: { contains: "test lead", mode: "insensitive" } },
      ],
    },
    include: {
      _count: {
        select: {
          tratos: true,
          cotizaciones: true,
          proyectos: true,
          prospecciones: true,
        },
      },
    },
  });

  return NextResponse.json({ testClientes });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const testClientes = await prisma.cliente.findMany({
    where: {
      OR: [
        { nombre: { contains: "test lead", mode: "insensitive" } },
        { nombre: { contains: "dummy data", mode: "insensitive" } },
        { telefono: { contains: "test lead", mode: "insensitive" } },
      ],
    },
    include: {
      _count: {
        select: {
          tratos: true,
          cotizaciones: true,
          proyectos: true,
          prospecciones: true,
        },
      },
    },
  });

  const eliminados: string[] = [];
  const omitidos: { id: string; nombre: string; razon: string }[] = [];

  for (const c of testClientes) {
    const tieneRelaciones =
      c._count.tratos > 0 ||
      c._count.cotizaciones > 0 ||
      c._count.proyectos > 0;

    if (tieneRelaciones) {
      omitidos.push({
        id: c.id,
        nombre: c.nombre,
        razon: `Tiene ${c._count.tratos} tratos, ${c._count.cotizaciones} cotizaciones, ${c._count.proyectos} proyectos — requiere revisión manual`,
      });
      continue;
    }

    // Sin relaciones importantes: eliminar prospecciones primero, luego cliente
    await prisma.prospeccion.deleteMany({ where: { clienteId: c.id } });
    await prisma.cliente.delete({ where: { id: c.id } });
    eliminados.push(c.nombre);
  }

  return NextResponse.json({ ok: true, eliminados, omitidos });
}
