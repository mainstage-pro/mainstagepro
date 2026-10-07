import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { idsPorTexto } from "@/lib/buscar-servidor";
import { ESTADOS_GIRA, TIPOS_REGISTRO, esGira, parseFechaGira } from "@/lib/giras";

function slugify(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function slugDisponible(base: string): Promise<string | null> {
  if (!base) return null;
  for (let i = 0; i < 20; i++) {
    const intento = i === 0 ? base : `${base}-${i + 1}`;
    const existe = await prisma.gira.findUnique({ where: { slug: intento }, select: { id: true } });
    if (!existe) return intento;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const estado = searchParams.get("estado");
  const tipo = searchParams.get("tipo");

  const giras = await prisma.gira.findMany({
    where: {
      ...(searchParams.get("incluirInactivas") === "1" ? {} : { activo: true }),
      ...(estado && ESTADOS_GIRA.includes(estado as (typeof ESTADOS_GIRA)[number]) ? { estado } : {}),
      ...(tipo && TIPOS_REGISTRO.includes(tipo as (typeof TIPOS_REGISTRO)[number]) ? { tipo } : {}),
      ...(q ? { id: { in: await idsPorTexto("Gira", ["nombre", "notas"], q) } } : {}),
    },
    include: {
      artista: { select: { id: true, nombre: true, logoUrl: true } },
      cliente: { select: { id: true, nombre: true, empresa: true } },
      rider: { select: { id: true, nombre: true, version: true } },
      shows: {
        orderBy: { fecha: "asc" },
        select: {
          id: true,
          fecha: true,
          ciudad: true,
          estado: true,
          riderEnviadoEn: true,
          venue: { select: { id: true, nombre: true } },
          repartos: { select: { prioridad: true, estado: true, cubiertoPor: true } },
          _count: { select: { crew: true } },
        },
      },
    },
    orderBy: [{ fechaInicio: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ giras });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const tipo = TIPOS_REGISTRO.includes(body.tipo) ? body.tipo : "GIRA";
  const tour = esGira(tipo);

  let nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (tour && !nombre) return NextResponse.json({ error: "El nombre de la gira es obligatorio" }, { status: 400 });

  // Un show suelto nace con su única fecha: sin ella el registro no sirve para nada
  // (ni advance, ni day sheet, ni logística) y el nombre se arma solo.
  const fechaShow = tour ? null : parseFechaGira(body.fecha);
  if (!tour && !fechaShow) return NextResponse.json({ error: "La fecha del show es obligatoria" }, { status: 400 });

  let artistaId: string | null = typeof body.artistaId === "string" && body.artistaId ? body.artistaId : null;

  // Alta al vuelo: el registro no puede existir sin artista y no vale mandar al
  // usuario al catálogo a media captura.
  if (!artistaId && typeof body.artistaNombre === "string" && body.artistaNombre.trim()) {
    const artista = await prisma.artista.create({ data: { nombre: body.artistaNombre.trim() } });
    artistaId = artista.id;
  }
  if (!artistaId) return NextResponse.json({ error: "Elige o registra el artista" }, { status: 400 });

  const artista = await prisma.artista.findUnique({ where: { id: artistaId }, select: { id: true, nombre: true } });
  if (!artista) return NextResponse.json({ error: "El artista no existe" }, { status: 400 });

  const estado = ESTADOS_GIRA.includes(body.estado) ? body.estado : "PLANEACION";

  const venueId = typeof body.venueId === "string" && body.venueId ? body.venueId : null;
  let ciudad = typeof body.ciudad === "string" && body.ciudad.trim() ? body.ciudad.trim() : null;
  let venueNombre: string | null = null;
  if (!tour && venueId) {
    const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { nombre: true, ciudad: true } });
    venueNombre = venue?.nombre ?? null;
    ciudad = ciudad ?? venue?.ciudad ?? null;
  }
  if (!nombre && fechaShow) {
    const fecha = fechaShow.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    nombre = [artista.nombre, ciudad ?? venueNombre, fecha].filter(Boolean).join(" · ");
  }

  // El rider activo del artista es el que manda mientras nadie elija otro.
  const riderActivo = await prisma.artistaRider.findFirst({
    where: { artistaId, esActivo: true, activo: true },
    orderBy: { version: "desc" },
    select: { id: true },
  });

  const gira = await prisma.gira.create({
    data: {
      nombre,
      slug: await slugDisponible(slugify(nombre)),
      tipo,
      artistaId,
      clienteId: typeof body.clienteId === "string" && body.clienteId ? body.clienteId : null,
      tratoId: typeof body.tratoId === "string" && body.tratoId ? body.tratoId : null,
      riderId: typeof body.riderId === "string" && body.riderId ? body.riderId : riderActivo?.id ?? null,
      estado,
      fechaInicio: fechaShow ?? parseFechaGira(body.fechaInicio),
      fechaFin: fechaShow ?? parseFechaGira(body.fechaFin),
      rolMainstage: Array.isArray(body.rolMainstage) ? JSON.stringify(body.rolMainstage) : null,
      moneda: typeof body.moneda === "string" && body.moneda ? body.moneda : "MXN",
      notas: typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null,
    },
    include: { artista: { select: { id: true, nombre: true } } },
  });

  // El show suelto se queda sin fecha ni venue si nadie crea su único show: el
  // registro y su fecha se capturan de una vez, no en dos pasos.
  const show = fechaShow
    ? await prisma.giraShow.create({
        data: { giraId: gira.id, orden: 1, fecha: fechaShow, ciudad, venueId },
        select: { id: true },
      })
    : null;

  await logActividad(
    session.id,
    "CREAR",
    "Gira",
    gira.id,
    `Creó ${tour ? "la gira" : "el show"} ${gira.nombre} (${gira.artista.nombre})`,
  );

  return NextResponse.json({ gira, show });
}
