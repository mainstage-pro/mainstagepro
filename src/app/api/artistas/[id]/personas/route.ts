import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ROLES_PERSONA } from "@/lib/giras";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const personas = await prisma.artistaPersona.findMany({
    where: { artistaId: id, activo: true },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ personas });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const artista = await prisma.artista.findUnique({ where: { id }, select: { id: true } });
  if (!artista) return NextResponse.json({ error: "Artista no encontrado" }, { status: 404 });

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const rol = ROLES_PERSONA.includes(body.rol) ? body.rol : "OTRO";

  const ultimo = await prisma.artistaPersona.findFirst({
    where: { artistaId: id },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const persona = await prisma.artistaPersona.create({
    data: {
      artistaId: id,
      nombre,
      rol,
      instrumento: body.instrumento || null,
      esIntegrante: body.esIntegrante === true,
      esContactoClave: body.esContactoClave === true,
      telefono: body.telefono || null,
      email: body.email || null,
      tallaPlayera: body.tallaPlayera || null,
      notasHospitalidad: body.notasHospitalidad || null,
      notas: body.notas || null,
      orden: (ultimo?.orden ?? -1) + 1,
    },
  });

  return NextResponse.json({ persona });
}
