import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serializePerfiles } from "@/lib/proceso/perfiles";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

    const perfilesArr: string[] = Array.isArray(body.perfilesProspecto)
      ? body.perfilesProspecto
      : body.perfilProspecto
        ? [body.perfilProspecto]
        : [];
    const perfilesJson = serializePerfiles(perfilesArr);

    // Resolve empresaId: prefer explicit id, fall back to plain string lookup/create
    let empresaId: string | null = body.empresaId ?? null;
    const empresaNombre: string | null = body.empresa || null;

    if (!empresaId && empresaNombre) {
      const existing = await prisma.empresa.findFirst({
        where: { nombre: { equals: empresaNombre, mode: "insensitive" }, activo: true },
      });
      if (existing) {
        empresaId = existing.id;
      } else {
        const created = await prisma.empresa.create({
          data: { nombre: empresaNombre, tipo: "CLIENTE" },
        });
        empresaId = created.id;
      }
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre: body.nombre,
        empresa: empresaId
          ? (await prisma.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true } }))?.nombre ?? empresaNombre
          : empresaNombre,
        empresaId,
        tipoCliente: body.tipoCliente || "POR_DESCUBRIR",
        clasificacion: body.clasificacion || "PROSPECTO",
        perfilProspecto: perfilesArr[0] || null,
        perfilesProspecto: perfilesJson,
        telefono: body.telefono || null,
        correo: body.correo || null,
        notas: body.notas || null,
        // Prospecto por defecto — se convierte a cliente cuando se aprueba una cotización
        esProspecto: body.esProspecto !== undefined ? Boolean(body.esProspecto) : true,
        origenLead: body.origenLead || null,
        vendedorId: body.vendedorId || null,
      },
      include: {
        compania: { select: { id: true, nombre: true } },
        vendedor: { select: { id: true, name: true } },
        _count: { select: { tratos: true, proyectos: true, prospecciones: true, cotizaciones: true } },
      },
    });

    return NextResponse.json({ cliente });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || null;
  const limit = parseInt(searchParams.get("limit") || "200");

  const clientes = await prisma.cliente.findMany({
    where: q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { empresa: { contains: q, mode: "insensitive" } },
            { telefono: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      nombre: true,
      empresa: true,
      empresaId: true,
      telefono: true,
      compania: { select: { id: true, nombre: true } },
      tipoCliente: true,
      clasificacion: true,
      perfilProspecto: true,
      perfilesProspecto: true,
      correo: true,
      esProspecto: true,
      vendedor: { select: { id: true, name: true } },
    },
    orderBy: { nombre: "asc" },
    take: limit,
  });;

  return NextResponse.json({ clientes });
}
