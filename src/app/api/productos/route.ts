import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { ensureProductosTables, calcularPrecioProducto, limpiarCoberturas, limpiarAccesorios, type ItemInput } from "@/lib/productos";
import { clasificarFamilia } from "@/lib/producto-familias";

const PRODUCTO_INCLUDE = {
  items: {
    orderBy: { orden: "asc" as const },
    include: {
      equipo: {
        select: {
          id: true,
          descripcion: true,
          marca: true,
          modelo: true,
          precioRenta: true,
          cantidadTotal: true,
          imagenUrl: true,
          categoria: { select: { id: true, nombre: true } },
        },
      },
    },
  },
  accesorios: {
    orderBy: { orden: "asc" as const },
    include: {
      accesorio: {
        select: {
          id: true,
          nombre: true,
          marca: true,
          modelo: true,
          precioRenta: true,
          fotoUrl: true,
          categoria: { select: { id: true, nombre: true } },
        },
      },
    },
  },
  coberturas: { select: { tipoEvento: true, rangos: true, subtipos: true } },
  equipoDominante: { select: { id: true, imagenUrl: true, descripcion: true } },
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureProductosTables();

  const todos = req.nextUrl.searchParams.get("todos") === "true";
  const productos = await prisma.producto.findMany({
    where: todos ? {} : { activo: true },
    include: PRODUCTO_INCLUDE,
    orderBy: [{ categoria: "asc" }, { orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ productos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureProductosTables();

  const body = await req.json();
  const { nombre, descripcion, categoria, familia, subfamilia, tiposEvento, nichos, rol, disponibilidad, proveedorRef, costoRef, imagenUrl, equipoDominanteId, precioManual, items, accesorios, coberturas, capacidadUniversal } = body;

  if (!nombre || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "nombre y al menos un equipo son requeridos" }, { status: 400 });
  }

  const limpios: ItemInput[] = (items as ItemInput[])
    .filter((it) => it.equipoId)
    .map((it) => ({ equipoId: it.equipoId, cantidad: Math.max(1, Number(it.cantidad) || 1) }));

  const accs = limpiarAccesorios(accesorios);

  // Precio a partir del inventario real
  const equipos = await prisma.equipo.findMany({
    where: { id: { in: limpios.map((i) => i.equipoId) } },
    select: { id: true, precioRenta: true, imagenUrl: true },
  });
  const precioMap = new Map(equipos.map((e) => [e.id, e.precioRenta]));
  const precioFinal = calcularPrecioProducto(
    limpios.map((i) => ({ cantidad: i.cantidad, equipo: { precioRenta: precioMap.get(i.equipoId) ?? 0 } })),
    precioManual != null && precioManual !== "" ? Number(precioManual) : null
  );

  // Imagen por default: la del equipo dominante si no se pasó una
  const domId = equipoDominanteId || limpios[0]?.equipoId || null;
  const imagenDefault = imagenUrl || equipos.find((e) => e.id === domId)?.imagenUrl || null;

  const maxOrden = await prisma.producto.aggregate({ _max: { orden: true } });
  const cobs = limpiarCoberturas(coberturas);

  // familia/subfamilia: explícitas si vienen; si no, se auto-clasifican por el nombre.
  const auto = clasificarFamilia(nombre);
  const familiaFinal = familia !== undefined ? (familia || null) : auto.familia;
  const subfamiliaFinal = subfamilia !== undefined ? (subfamilia || null) : auto.subfamilia;

  const producto = await prisma.producto.create({
    data: {
      nombre,
      descripcion: descripcion || null,
      categoria: categoria || null,
      familia: familiaFinal,
      subfamilia: subfamiliaFinal,
      tiposEvento: Array.isArray(tiposEvento) ? JSON.stringify(tiposEvento) : tiposEvento || null,
      nichos: Array.isArray(nichos) ? (nichos.length ? JSON.stringify(nichos) : null) : nichos || null,
      rol: rol === "adicional" ? "adicional" : "base",
      disponibilidad: ["subrenta", "bajo_pedido"].includes(disponibilidad) ? disponibilidad : "propio",
      proveedorRef: proveedorRef || null,
      costoRef: costoRef != null && costoRef !== "" ? Number(costoRef) : null,
      imagenUrl: imagenDefault,
      equipoDominanteId: domId,
      precioManual: precioManual != null && precioManual !== "" ? Number(precioManual) : null,
      precioFinal,
      capacidadUniversal: !!capacidadUniversal,
      orden: (maxOrden._max.orden ?? 0) + 1,
      items: {
        create: limpios.map((it, idx) => ({ equipoId: it.equipoId, cantidad: it.cantidad, orden: idx })),
      },
      accesorios: {
        create: accs.map((a, idx) => ({ accesorioId: a.accesorioId, cantidad: a.cantidad, orden: idx })),
      },
      coberturas: {
        create: cobs.map((c) => ({
          tipoEvento: c.tipoEvento,
          rangos: JSON.stringify(c.rangos),
          subtipos: JSON.stringify(c.subtipos),
        })),
      },
    },
    include: PRODUCTO_INCLUDE,
  });

  await logActividad(session.id, "CREAR", "Producto", producto.id, `Creó el producto "${nombre}"`);

  return NextResponse.json({ producto }, { status: 201 });
}
