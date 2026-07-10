import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { normalizarTelefono } from "@/lib/cotejo-cliente";

/**
 * GET /api/clientes/cotejo?telefono=...&nombre=...
 *
 * Cotejo en vivo (solo lectura) para la UI de nuevo contacto.
 * Devuelve { estado: 'LIGADO' | 'DUPLICADO_POSIBLE' | 'NUEVO', cliente? }.
 * No crea ni modifica nada.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const telefono = normalizarTelefono(searchParams.get("telefono"));
  const nombre = (searchParams.get("nombre") || "").trim();

  // 1. Match exacto por teléfono → cliente existente (LIGADO).
  if (telefono) {
    const rows = await prisma.$queryRaw<Array<{ id: string; nombre: string; telefono: string | null; empresa: string | null }>>`
      SELECT id, nombre, telefono, empresa
      FROM clientes
      WHERE regexp_replace(coalesce(telefono, ''), '[^0-9]', '', 'g') = ${telefono}
      LIMIT 1`;
    if (rows.length > 0) {
      return NextResponse.json({ estado: "LIGADO", cliente: rows[0] });
    }
  }

  // 2. Mismo nombre con teléfono distinto → posible duplicado.
  if (nombre) {
    const porNombre = await prisma.cliente.findFirst({
      where: { nombre: { equals: nombre, mode: "insensitive" } },
      select: { id: true, nombre: true, telefono: true, empresa: true },
    });
    if (porNombre) {
      return NextResponse.json({ estado: "DUPLICADO_POSIBLE", cliente: porNombre });
    }
  }

  return NextResponse.json({ estado: "NUEVO" });
}
