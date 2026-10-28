import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { puedeVerCanal } from "@/lib/canales";
import { extraerMenciones, extraerReferencias, mencionesATexto, ENTIDAD_HREF, ENTIDAD_LABEL } from "@/lib/comentarios";

async function cargarCanalConAcceso(id: string, session: { id: string; role: string; area?: string | null }) {
  const canal = await prisma.canal.findUnique({ where: { id }, include: { miembros: true } });
  if (!canal) return null;
  if (!puedeVerCanal(canal, session)) return "SIN_ACCESO" as const;
  return canal;
}

// Lista los mensajes del canal y marca como leído hasta ahora (abrir el hilo = leerlo).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const canal = await cargarCanalConAcceso(id, session);
  if (!canal) return NextResponse.json({ error: "Canal no encontrado" }, { status: 404 });
  if (canal === "SIN_ACCESO") return NextResponse.json({ error: "Sin acceso a este canal" }, { status: 403 });

  const mensajes = await prisma.mensaje.findMany({
    where: { canalId: id },
    include: { autor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  await prisma.canalLectura.upsert({
    where: { canalId_usuarioId: { canalId: id, usuarioId: session.id } },
    update: { leidoHasta: new Date() },
    create: { canalId: id, usuarioId: session.id, leidoHasta: new Date() },
  });

  return NextResponse.json({ mensajes });
}

// Envía un mensaje; @menciona dispara notificación MENCION; en directos/grupos
// cada mensaje nuevo también avisa al resto de miembros (como un ping de DM).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const canal = await cargarCanalConAcceso(id, session);
  if (!canal) return NextResponse.json({ error: "Canal no encontrado" }, { status: 404 });
  if (canal === "SIN_ACCESO") return NextResponse.json({ error: "Sin acceso a este canal" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const contenido = (body.contenido ?? "").trim();
  if (!contenido) return NextResponse.json({ error: "El mensaje está vacío" }, { status: 400 });

  const mensaje = await prisma.mensaje.create({
    data: { canalId: id, autorId: session.id, contenido },
    include: { autor: { select: { id: true, name: true } } },
  });

  // Mantener leído hasta mi propio mensaje para no contarme a mí mismo como "no leído".
  await prisma.canalLectura.upsert({
    where: { canalId_usuarioId: { canalId: id, usuarioId: session.id } },
    update: { leidoHasta: mensaje.createdAt },
    create: { canalId: id, usuarioId: session.id, leidoHasta: mensaje.createdAt },
  });

  const textoPlano = mencionesATexto(contenido).slice(0, 180);
  const mencionados = extraerMenciones(contenido).filter((uid) => uid !== session.id);
  const referencias = extraerReferencias(contenido);

  const notifs: Array<{ usuarioId: string; tipo: string; titulo: string; mensaje: string; url: string | null }> = [];
  for (const uid of mencionados) {
    notifs.push({ usuarioId: uid, tipo: "MENCION", titulo: `${session.name} te mencionó en el chat`, mensaje: textoPlano, url: "/mensajes" });
  }
  if (canal.tipo === "DIRECTO" || canal.tipo === "GRUPO") {
    const destinatarios = canal.miembros.filter((m) => m.usuarioId !== session.id && !mencionados.includes(m.usuarioId));
    for (const m of destinatarios) {
      notifs.push({ usuarioId: m.usuarioId, tipo: "MENSAJE", titulo: `${session.name} te escribió`, mensaje: textoPlano, url: "/mensajes" });
    }
  }
  if (notifs.length > 0) await prisma.notificacion.createMany({ data: notifs });

  // Las #referencias no generan notificación (no hay a quién avisar en general),
  // pero sí quedan disponibles para el front vía segmentarContenido(); se
  // devuelven aquí solo informativamente para no repetir el parseo en el cliente.
  const referenciasConHref = referencias.map((r) => ({ ...r, label: ENTIDAD_LABEL[r.tipo], href: ENTIDAD_HREF[r.tipo](r.id) }));

  return NextResponse.json({ mensaje, referencias: referenciasConHref }, { status: 201 });
}
