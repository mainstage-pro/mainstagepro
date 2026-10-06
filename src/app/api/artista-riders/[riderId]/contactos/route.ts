// Los contactos del rider: a quién le habla la casa cuando lo lee.
//
// El crew del artista vive en ArtistaPersona, pero no todo el crew entra en todos
// los riders. Aquí se elige quién sale en ESTE rider. Un contacto ligado a una
// persona lee sus datos de ella y editarlo desde aquí la edita a ella: el celular
// del FOH se corrige una vez y queda corregido en todos los riders, el crew y los
// shows. La constancia de lo que decía el rider cuando se mandó es el PDF ya
// generado, no esta tabla.
//
// Un contacto puede venir de una persona del artista (`personaId`) o capturarse
// suelto: el ingeniero que contrataron solo para esta gira todavía no está dado
// de alta y nadie va a abandonar la captura para ir a registrarlo. El suelto se
// puede dar de alta después con `accion: "alta-directorio"`.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ROLES_PERSONA } from "@/lib/giras";
import { SELECT_PERSONA, altaEnDirectorio, partirEdicion, propagarAPersona } from "@/lib/contactos-artista";

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function rolValido(v: unknown): string {
  return typeof v === "string" && (ROLES_PERSONA as readonly string[]).includes(v) ? v : "OTRO";
}

async function riderDelArtista(riderId: string) {
  return prisma.artistaRider.findUnique({ where: { id: riderId }, select: { id: true, artistaId: true } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;

  const contactos = await prisma.artistaRiderContacto.findMany({
    where: { riderId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    include: { persona: { select: SELECT_PERSONA } },
  });

  return NextResponse.json({ contactos });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;
  const body = await req.json().catch(() => ({}));

  const rider = await riderDelArtista(riderId);
  if (!rider) return NextResponse.json({ error: "Rider no encontrado" }, { status: 404 });

  // Si viene de una persona del artista, sus datos son el punto de partida: nadie
  // quiere volver a teclear el teléfono que ya está en la ficha del artista.
  let persona = null;
  if (typeof body.personaId === "string" && body.personaId) {
    persona = await prisma.artistaPersona.findFirst({
      where: { id: body.personaId, artistaId: rider.artistaId },
      select: { id: true, nombre: true, rol: true, telefono: true, email: true },
    });
    if (!persona) return NextResponse.json({ error: "Esa persona no es del artista" }, { status: 400 });

    const yaEsta = await prisma.artistaRiderContacto.findFirst({
      where: { riderId, personaId: persona.id },
      select: { id: true },
    });
    if (yaEsta) return NextResponse.json({ error: "Esa persona ya está en el rider" }, { status: 400 });
  }

  const nombre = texto(body.nombre) ?? persona?.nombre ?? null;
  if (!nombre) return NextResponse.json({ error: "El contacto necesita nombre" }, { status: 400 });

  const ultimo = await prisma.artistaRiderContacto.findFirst({
    where: { riderId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });

  const contacto = await prisma.artistaRiderContacto.create({
    data: {
      riderId,
      personaId: persona?.id ?? null,
      nombre,
      rol: body.rol === undefined && persona ? persona.rol : rolValido(body.rol),
      telefono: texto(body.telefono) ?? persona?.telefono ?? null,
      email: texto(body.email) ?? persona?.email ?? null,
      notas: texto(body.notas),
      enPdf: body.enPdf !== false,
      orden: (ultimo?.orden ?? -1) + 1,
    },
    include: { persona: { select: SELECT_PERSONA } },
  });

  return NextResponse.json({ contacto });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;
  const body = await req.json().catch(() => ({}));

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Falta el id del contacto" }, { status: 400 });

  const rider = await riderDelArtista(riderId);
  if (!rider) return NextResponse.json({ error: "Rider no encontrado" }, { status: 404 });

  const actual = await prisma.artistaRiderContacto.findFirst({
    where: { id, riderId },
    select: { id: true, personaId: true, nombre: true, rol: true, telefono: true, email: true },
  });
  if (!actual) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });

  let personaId = actual.personaId;

  // Dar de alta en el directorio al contacto que se capturó suelto: deja de vivir
  // solo en este rider y queda disponible para el crew y los shows.
  if (body.accion === "alta-directorio") {
    if (personaId) return NextResponse.json({ error: "Ese contacto ya está en el directorio" }, { status: 400 });
    const persona = await altaEnDirectorio(prisma, rider.artistaId, actual);
    personaId = persona.id;
  }

  // Ligar un suelto a alguien que ya estaba en el directorio, o soltarlo.
  if (body.accion !== "alta-directorio" && "personaId" in body) {
    const nuevo = texto(body.personaId);
    if (nuevo) {
      const persona = await prisma.artistaPersona.findFirst({
        where: { id: nuevo, artistaId: rider.artistaId },
        select: { id: true },
      });
      if (!persona) return NextResponse.json({ error: "Esa persona no es del artista" }, { status: 400 });
      const yaEsta = await prisma.artistaRiderContacto.findFirst({
        where: { riderId, personaId: nuevo, id: { not: id } },
        select: { id: true },
      });
      if (yaEsta) return NextResponse.json({ error: "Esa persona ya está en el rider" }, { status: 400 });
    }
    personaId = nuevo;
  }

  const ligado = Boolean(personaId);
  const { persona: aPersona, local } = partirEdicion(body, { ligado });

  if (ligado && personaId) await propagarAPersona(prisma, personaId, aPersona);

  const data: Record<string, unknown> = { ...local };
  if (personaId !== actual.personaId) {
    data.personaId = personaId;
    // Al ligarlo, la copia del renglón pasa a decir lo que dice la persona.
    if (personaId) {
      const persona = await prisma.artistaPersona.findUnique({
        where: { id: personaId },
        select: SELECT_PERSONA,
      });
      if (persona) {
        data.nombre = persona.nombre;
        data.telefono = persona.telefono;
        data.email = persona.email;
      }
    }
  }
  if ("rol" in body) data.rol = rolValido(body.rol);
  if ("notas" in body) data.notas = texto(body.notas);
  if ("enPdf" in body) data.enPdf = body.enPdf === true;
  if ("orden" in body) {
    const n = Number(body.orden);
    if (Number.isFinite(n)) data.orden = Math.trunc(n);
  }
  // El nombre es obligatorio en la tabla: al soltarlo se queda con el que traía.
  if (!ligado && data.nombre === null) delete data.nombre;

  const contacto = await prisma.artistaRiderContacto.update({
    where: { id },
    data,
    include: { persona: { select: SELECT_PERSONA } },
  });
  return NextResponse.json({ contacto });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { riderId } = await params;

  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Falta el id del contacto" }, { status: 400 });

  const actual = await prisma.artistaRiderContacto.findFirst({ where: { id, riderId }, select: { id: true } });
  if (!actual) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });

  // Se quita del rider, no del artista: la persona sigue en el crew.
  await prisma.artistaRiderContacto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
