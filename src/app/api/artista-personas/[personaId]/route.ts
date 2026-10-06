import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ROLES_PERSONA } from "@/lib/giras";
import { propagarAPersona } from "@/lib/contactos-artista";

/// `nombre`, `telefono` y `email` NO van aquí: son los datos que viajan a los
/// renglones ligados y se escriben con `propagarAPersona`.
const TEXTO = ["instrumento", "tallaPlayera", "notasHospitalidad", "notas"] as const;
const BOOLS = ["esIntegrante", "esContactoClave"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ personaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { personaId } = await params;
  const body = await req.json();

  const contacto: { nombre?: string; telefono?: string | null; email?: string | null } = {};
  if ("nombre" in body) {
    const n = typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!n) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    contacto.nombre = n;
  }
  if ("telefono" in body) contacto.telefono = body.telefono || null;
  if ("email" in body) contacto.email = body.email || null;

  const data: Record<string, unknown> = {};
  if ("rol" in body) data.rol = ROLES_PERSONA.includes(body.rol) ? body.rol : "OTRO";
  for (const f of TEXTO) if (f in body) data[f] = body[f] || null;
  for (const f of BOOLS) if (f in body) data[f] = body[f] === true;
  if ("orden" in body && Number.isFinite(Number(body.orden))) data.orden = Math.trunc(Number(body.orden));

  // Editar aquí el celular del FOH lo cambia en el rider, el crew y el show.
  await propagarAPersona(prisma, personaId, contacto);

  const persona = Object.keys(data).length
    ? await prisma.artistaPersona.update({ where: { id: personaId }, data })
    : await prisma.artistaPersona.findUniqueOrThrow({ where: { id: personaId } });

  return NextResponse.json({ persona });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ personaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { personaId } = await params;
  await prisma.artistaPersona.update({ where: { id: personaId }, data: { activo: false } });
  return NextResponse.json({ ok: true });
}
