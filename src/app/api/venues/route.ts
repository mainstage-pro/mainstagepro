import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");

  const venues = await prisma.venue.findMany({
    where: {
      activo: true,
      ...(q ? { nombre: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ venues });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, direccion, ciudad, contacto, telefonoContacto, emailContacto,
    capacidadPersonas, largoM, anchoM, alturaMaximaM, accesoVehicular, puntoDescarga,
    voltajeDisponible, amperajeTotal, fases, ubicacionTablero,
    restriccionDecibeles, restriccionHorario, restriccionInstalacion,
    tiposEvento, calificacion, notas, fotoPortada } = body;

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const venue = await prisma.venue.create({
    data: {
      nombre, direccion: direccion ?? null, ciudad: ciudad ?? null,
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
