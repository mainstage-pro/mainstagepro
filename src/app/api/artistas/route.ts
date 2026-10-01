import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { idsPorTexto } from "@/lib/buscar-servidor";

function sinAcentos(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const incluirInactivos = searchParams.get("incluirInactivos") === "1";
  const conUso = searchParams.get("conUso") === "1";

  const artistas = await prisma.artista.findMany({
    where: {
      ...(incluirInactivos ? {} : { activo: true }),
      ...(q ? { id: { in: await idsPorTexto("Artista", ["nombre", "genero", "origen"], q) } } : {}),
    },
    orderBy: { nombre: "asc" },
    ...(conUso ? { include: { _count: { select: { tratos: true, proyectos: true } } } } : {}),
  });

  return NextResponse.json({ artistas });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, genero, origen, contactoNombre, contactoTelefono, contactoEmail,
    instagram, sitioWeb, notas } = body;

  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  // Mismo criterio que el catálogo de venues: no volver a llenarlo de duplicados.
  const yaExisteIds = await idsPorTexto("Artista", ["nombre"], nombre.trim());
  if (yaExisteIds.length) {
    const candidatos = await prisma.artista.findMany({ where: { id: { in: yaExisteIds } } });
    const exacto = candidatos.find(a => sinAcentos(a.nombre) === sinAcentos(nombre));
    if (exacto) return NextResponse.json({ artista: exacto, yaExistia: true });
  }

  const artista = await prisma.artista.create({
    data: {
      nombre: nombre.trim(),
      genero: genero || null,
      origen: origen || null,
      contactoNombre: contactoNombre || null,
      contactoTelefono: contactoTelefono || null,
      contactoEmail: contactoEmail || null,
      instagram: instagram || null,
      sitioWeb: sitioWeb || null,
      notas: notas || null,
    },
  });

  return NextResponse.json({ artista });
}
