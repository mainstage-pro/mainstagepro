import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomBytes } from "crypto";

// GET — listar equipos del proveedor (vista interna con auth)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const equipos = await prisma.equipoProveedor.findMany({
    where: { proveedorId: id },
    orderBy: [{ categoria: "asc" }, { descripcion: "asc" }],
  });
  return NextResponse.json({ equipos });
}

// Mapping de categoría de proveedor → palabras clave para buscar en CategoriaEquipo
const CATEGORIA_KEYWORDS: Record<string, string[]> = {
  AUDIO:        ["audio", "sonido", "sound"],
  VIDEO:        ["video", "pantalla", "screen", "proyec"],
  ILUMINACION:  ["iluminaci", "luz", "light"],
  BACKLINE:     ["backline", "instrumento", "musical", "escenario"],
  ESCENOGRAFIA: ["escenograf", "decoraci", "staging"],
  LOGISTICA:    ["logist", "transport"],
  OTRO:         [],
};

async function findCategoriaId(categoria: string): Promise<string | null> {
  const categorias = await prisma.categoriaEquipo.findMany({ orderBy: { orden: "asc" } });
  if (categorias.length === 0) return null;

  const keywords = CATEGORIA_KEYWORDS[categoria] ?? [];
  for (const kw of keywords) {
    const match = categorias.find(c => c.nombre.toLowerCase().includes(kw));
    if (match) return match.id;
  }
  // fallback: primera categoría disponible
  return categorias[0].id;
}

// PATCH — aprobar / rechazar un equipo (uso interno) + auto-import al catálogo
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { equipoId, aprobado } = body;

  // Fetch the EquipoProveedor with proveedor info
  const equipoProveedor = await prisma.equipoProveedor.findUnique({
    where: { id: equipoId, proveedorId: id },
    include: { proveedor: { select: { id: true, nombre: true } } },
  });
  if (!equipoProveedor) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });

  let importadoEquipoId = equipoProveedor.importadoEquipoId;

  if (aprobado && !importadoEquipoId) {
    // Auto-import: crear Equipo en catálogo interno
    const categoriaId = await findCategoriaId(equipoProveedor.categoria);
    if (categoriaId) {
      const nuevoEquipo = await prisma.equipo.create({
        data: {
          categoriaId,
          descripcion: equipoProveedor.descripcion,
          marca: equipoProveedor.marca ?? undefined,
          modelo: equipoProveedor.modelo ?? undefined,
          cantidadTotal: equipoProveedor.cantidad,
          tipo: "EXTERNO",
          proveedorDefaultId: equipoProveedor.proveedorId,
          precioRenta: equipoProveedor.precioPublico ?? 0,
          costoProveedor: equipoProveedor.precioMainstage ?? undefined,
          activo: true,
        },
      });
      importadoEquipoId = nuevoEquipo.id;
    }
  } else if (!aprobado && importadoEquipoId) {
    // Rechazar: desactivar el equipo en catálogo
    await prisma.equipo.update({
      where: { id: importadoEquipoId },
      data: { activo: false },
    });
    importadoEquipoId = null;
  }

  const equipo = await prisma.equipoProveedor.update({
    where: { id: equipoId },
    data: { aprobado, importadoEquipoId },
  });

  return NextResponse.json({ equipo });
}
