import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { esRetornoAServicio, registrarCostoMantenimiento } from "@/lib/mantenimiento-costo";
import { recalcularPrecioFinal } from "@/lib/productos";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const equipo = await prisma.equipo.findUnique({
    where: { id },
    include: {
      categoria: { select: { id: true, nombre: true } },
      proveedorDefault: { select: { id: true, nombre: true, correo: true, telefono: true } },
      mantenimientos: {
        orderBy: { fecha: "desc" },
        take: 10,
        select: { id: true, fecha: true, tipo: true, accionRealizada: true, estadoEquipo: true, comentarios: true, proximoMantenimiento: true },
      },
      proyectoEquipos: {
        include: { proyecto: { select: { id: true, nombre: true, numeroProyecto: true, fechaEvento: true, estado: true, cliente: { select: { nombre: true } } } } },
        orderBy: { id: "desc" },
        take: 20,
      },
      unidades: { orderBy: { id: "asc" } },
      accesorios: { orderBy: [{ categoria: "asc" }, { nombre: "asc" }] },
      notasEquipo: {
        orderBy: { createdAt: "desc" },
        include: { creadoPor: { select: { id: true, name: true } } },
      },
    },
  });
  if (!equipo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ equipo });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "descripcion", "marca", "modelo", "tipo", "precioRenta", "costoProveedor",
    "costoInternoEstimado", "cantidadTotal", "proveedorDefaultId", "notas", "activo", "estado",
    "categoriaId", "subcategoria", "imagenUrl", "imagenesUrls",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (["precioRenta", "costoProveedor", "costoInternoEstimado"].includes(key)) {
        data[key] = body[key] !== null && body[key] !== "" ? parseFloat(body[key]) : null;
      } else if (key === "cantidadTotal") {
        data[key] = body[key] !== null && body[key] !== "" ? parseInt(body[key]) : 1;
      } else {
        data[key] = body[key] ?? null;
      }
    }
  }
  if ("amperajeRequerido" in body) data.amperajeRequerido = body.amperajeRequerido !== "" && body.amperajeRequerido != null ? parseFloat(body.amperajeRequerido) : null;
  if ("voltajeRequerido" in body) data.voltajeRequerido = body.voltajeRequerido !== "" && body.voltajeRequerido != null ? String(body.voltajeRequerido) : null;

  // Estado previo, para detectar retorno a servicio y registrar el costo.
  const previo = "estado" in data
    ? await prisma.equipo.findUnique({ where: { id }, select: { estado: true, descripcion: true } })
    : null;

  const equipo = await prisma.equipo.update({
    where: { id },
    data,
    include: {
      categoria: { select: { id: true, nombre: true } },
      proveedorDefault: { select: { id: true, nombre: true } },
    },
    // Explicitly select fields needed by the maestro list
  });

  if (previo && esRetornoAServicio(previo.estado, String(data.estado))) {
    await registrarCostoMantenimiento({
      costo: body.costo,
      estadoAnterior: previo.estado,
      equipoDescripcion: previo.descripcion,
    });
  }

  // Al cambiar el precio de renta, recalcular el precioFinal (denormalizado) de
  // los productos que usan este equipo. Los paquetes suman ese precioFinal y se
  // calculan al vuelo, así que se actualizan solos una vez corregidos los productos.
  if ("precioRenta" in data) {
    try {
      const afectados = await prisma.productoEquipo.findMany({
        where: { equipoId: id },
        select: { productoId: true },
        distinct: ["productoId"],
      });
      await Promise.all(afectados.map((p) => recalcularPrecioFinal(p.productoId)));
    } catch (e) {
      console.error("No se pudo recalcular precioFinal de productos afectados", e);
    }
  }

  // Add the computed fields back manually so the list row can update
  return NextResponse.json({ equipo: { ...equipo, amperajeRequerido: equipo.amperajeRequerido, voltajeRequerido: equipo.voltajeRequerido, notas: equipo.notas } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  // Verificar si tiene registros relacionados antes de eliminar
  const [enProyectos, enCotizaciones, enPlantillas] = await Promise.all([
    prisma.proyectoEquipo.count({ where: { equipoId: id } }),
    prisma.cotizacionLinea.count({ where: { equipoId: id } }),
    prisma.plantillaEquipoItem.count({ where: { equipoId: id } }).catch(() => 0),
  ]);

  if (enProyectos > 0 || enCotizaciones > 0) {
    return NextResponse.json({
      error: `No se puede eliminar: este equipo está usado en ${enProyectos > 0 ? `${enProyectos} proyecto(s)` : ""}${enProyectos > 0 && enCotizaciones > 0 ? " y " : ""}${enCotizaciones > 0 ? `${enCotizaciones} cotización(es)` : ""}. Usa "Desactivar" para ocultarlo.`,
    }, { status: 409 });
  }

  try {
    await prisma.equipo.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el equipo." }, { status: 500 });
  }
}
