import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Calendariza un diseño guardado: crea una Publicacion (slot del calendario de
// contenido) en la fecha indicada, usando el render del diseño como portada.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s || s.email !== OWNER_EMAIL) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const guardado = await prisma.disenoGuardado.findUnique({ where: { id } });
  if (!guardado) return NextResponse.json({ error: "Diseño no existe" }, { status: 404 });

  const body = await req.json();
  const { fecha, formato, slide, enInstagram, enFacebook, enTiktok, enYoutube, copy } = body ?? {};
  if (!fecha) return NextResponse.json({ error: "Falta la fecha" }, { status: 400 });

  // La portada del slot es el render en vivo del slide elegido (o el primero).
  const slidePortada = slide ? String(slide) : "portada";
  const portadaUrl = `/api/diseno/render?disenoId=${encodeURIComponent(id)}&slide=${encodeURIComponent(slidePortada)}`;

  const pub = await prisma.publicacion.create({
    data: {
      fecha: new Date(fecha),
      formato: formato ? String(formato) : "STORIE",
      descripcion: guardado.titulo,
      copy: copy ? String(copy) : null,
      portadaUrl,
      materialLink: `/marketing/diseno/${guardado.template}/editor?disenoId=${encodeURIComponent(id)}`,
      enInstagram: enInstagram ?? true,
      enFacebook: enFacebook ?? false,
      enTiktok: enTiktok ?? false,
      enYoutube: enYoutube ?? false,
      estado: "PENDIENTE",
    },
  });

  await prisma.disenoGuardado.update({ where: { id }, data: { publicacionId: pub.id } });
  return NextResponse.json({ publicacion: pub });
}
