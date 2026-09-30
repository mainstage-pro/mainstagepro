import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { idsPorTexto } from "@/lib/buscar-servidor";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const tipo = searchParams.get("tipo");
  const incluirInactivos = searchParams.get("incluirInactivos") === "1";
  // El catálogo pide los conteos de uso para poder ordenar por recurrencia.
  const conUso = searchParams.get("conUso") === "1";

  const venues = await prisma.venue.findMany({
    where: {
      ...(incluirInactivos ? {} : { activo: true }),
      ...(tipo ? { tipo } : {}),
      ...(q ? { id: { in: await idsPorTexto("Venue", ["nombre", "ciudad", "direccion"], q) } } : {}),
    },
    orderBy: { nombre: "asc" },
    ...(conUso
      ? { include: { _count: { select: { tratos: true, cotizaciones: true, proyectos: true } } } }
      : {}),
  });

  return NextResponse.json({ venues });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, tipo, direccion, ciudad, estado, linkMaps, contacto, telefonoContacto, emailContacto,
    capacidadPersonas, largoM, anchoM, alturaMaximaM, accesoVehicular, puntoDescarga,
    voltajeDisponible, amperajeTotal, fases, ubicacionTablero,
    restriccionDecibeles, restriccionHorario, restriccionInstalacion,
    tiposEvento, calificacion, notas, fotoPortada } = body;

  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  // El catálogo no debe volver a llenarse de duplicados: si ya existe uno con el
  // mismo nombre (sin importar acentos ni mayúsculas), se devuelve ese.
  const yaExisteIds = await idsPorTexto("Venue", ["nombre"], nombre.trim());
  if (yaExisteIds.length) {
    const candidatos = await prisma.venue.findMany({ where: { id: { in: yaExisteIds } } });
    const exacto = candidatos.find(
      v => v.nombre.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        === nombre.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );
    if (exacto) return NextResponse.json({ venue: exacto, yaExistia: true });
  }

  const venue = await prisma.venue.create({
    data: {
      nombre: nombre.trim(), tipo: tipo ?? null,
      direccion: direccion ?? null, ciudad: ciudad ?? null,
      estado: estado ?? null, linkMaps: linkMaps ?? null,
      contacto: contacto ?? null, telefonoContacto: telefonoContacto ?? null,
      emailContacto: emailContacto ?? null,
      capacidadPersonas: capacidadPersonas ? parseInt(capacidadPersonas) : null,
      largoM: largoM ? parseFloat(largoM) : null,
      anchoM: anchoM ? parseFloat(anchoM) : null,
      alturaMaximaM: alturaMaximaM ? parseFloat(alturaMaximaM) : null,
      accesoVehicular: accesoVehicular ?? null, puntoDescarga: puntoDescarga ?? null,
      voltajeDisponible: voltajeDisponible ?? null,
      amperajeTotal: amperajeTotal ? parseFloat(amperajeTotal) : null,
      fases: fases ?? null, ubicacionTablero: ubicacionTablero ?? null,
      restriccionDecibeles: restriccionDecibeles ?? null,
      restriccionHorario: restriccionHorario ?? null,
      restriccionInstalacion: restriccionInstalacion ?? null,
      tiposEvento: Array.isArray(tiposEvento) ? JSON.stringify(tiposEvento) : (tiposEvento ?? null),
      calificacion: calificacion ? parseFloat(calificacion) : null,
      notas: notas ?? null, fotoPortada: fotoPortada ?? null,
    },
  });

  return NextResponse.json({ venue });
}
