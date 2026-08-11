import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCatalogoTables } from "@/lib/catalogo-eventos";
import { ensurePaquetesTables, getRangosPersonas } from "@/lib/paquetes";

// Lectura PÚBLICA del catálogo para el formulario del cliente (/descubrimiento/[token]).
// Sin sesión: el token del trato es la autorización. Devuelve SOLO campos seguros
// para el cliente — nunca productoId, costoRef, proveedorRef ni notas internas.
export async function GET() {
  await ensureCatalogoTables();
  await ensurePaquetesTables();

  const [tipos, nichos, adicionalesRaw, preguntas, rangos] = await Promise.all([
    prisma.tipoEvento.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: { slug: true, nombre: true, emoji: true, subtitulo: true, orden: true },
    }),
    prisma.nicho.findMany({
      where: { activo: true },
      orderBy: [{ tipoEventoSlug: "asc" }, { orden: "asc" }, { nombre: "asc" }],
      select: { id: true, tipoEventoSlug: true, nombre: true, slug: true, descripcion: true, orden: true },
    }),
    prisma.adicional.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, descripcion: true, tiposEvento: true, nichos: true, frecuencia: true, imagenUrl: true, orden: true },
    }),
    prisma.preguntaDescubrimiento.findMany({
      where: { activa: true },
      orderBy: [{ orden: "asc" }],
      select: { id: true, texto: true, tipoRespuesta: true, opciones: true, nichos: true, orden: true },
    }),
    getRangosPersonas(),
  ]);

  return NextResponse.json({ tipos, nichos, adicionales: adicionalesRaw, preguntas, rangos });
}
