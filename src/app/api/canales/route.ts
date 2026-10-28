import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureCanalesBase, canalesVisiblesWhere } from "@/lib/canales";
import { AREA_LABELS } from "@/lib/areas";

// Lista los canales visibles para la sesión (general + área propia/todas si es
// admin + directos/grupos donde es miembro), con último mensaje y no-leídos,
// para la página /mensajes y el badge del sidebar.
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureCanalesBase();

  const canales = await prisma.canal.findMany({
    where: canalesVisiblesWhere(session),
    include: {
      miembros: { include: { usuario: { select: { id: true, name: true } } } },
      mensajes: { orderBy: { createdAt: "desc" }, take: 1, include: { autor: { select: { id: true, name: true } } } },
      lecturas: { where: { usuarioId: session.id } },
    },
  });

  const resultado = await Promise.all(
    canales.map(async (c) => {
      const leidoHasta = c.lecturas[0]?.leidoHasta ?? new Date(0);
      const noLeidos = await prisma.mensaje.count({
        where: { canalId: c.id, createdAt: { gt: leidoHasta }, NOT: { autorId: session.id } },
      });
      const otro = c.tipo === "DIRECTO" ? c.miembros.find((m) => m.usuarioId !== session.id)?.usuario : null;
      const nombre =
        c.tipo === "GENERAL" ? "General" :
        c.tipo === "AREA" ? (AREA_LABELS[c.area ?? ""] ?? c.area ?? "Área") :
        c.tipo === "DIRECTO" ? (otro?.name ?? "Directo") :
        (c.nombre ?? "Grupo");
      return {
        id: c.id,
        tipo: c.tipo,
        area: c.area,
        nombre,
        ultimoMensaje: c.mensajes[0]
          ? { contenido: c.mensajes[0].contenido, autor: c.mensajes[0].autor.name, createdAt: c.mensajes[0].createdAt }
          : null,
        noLeidos,
        updatedAt: c.mensajes[0]?.createdAt ?? c.updatedAt,
      };
    }),
  );

  // Orden fijo: General primero, luego áreas, luego directos/grupos por actividad reciente.
  const ORDEN_TIPO: Record<string, number> = { GENERAL: 0, AREA: 1, DIRECTO: 2, GRUPO: 2 };
  resultado.sort((a, b) => {
    if (ORDEN_TIPO[a.tipo] !== ORDEN_TIPO[b.tipo]) return ORDEN_TIPO[a.tipo] - ORDEN_TIPO[b.tipo];
    if (a.tipo === "DIRECTO" || a.tipo === "GRUPO") return +new Date(b.updatedAt) - +new Date(a.updatedAt);
    return a.nombre.localeCompare(b.nombre);
  });

  return NextResponse.json({ canales: resultado });
}

// Crea (o reutiliza) un canal directo, o crea un grupo nuevo.
// body: { usuarioId } → directo  |  { nombre, usuarioIds } → grupo
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  if (body.usuarioId) {
    const otroId = body.usuarioId as string;
    if (otroId === session.id) return NextResponse.json({ error: "No puedes abrir un directo contigo mismo" }, { status: 400 });

    const candidatos = await prisma.canal.findMany({
      where: { tipo: "DIRECTO", miembros: { some: { usuarioId: session.id } } },
      include: { miembros: true },
    });
    const existente = candidatos.find((c) => c.miembros.length === 2 && c.miembros.some((m) => m.usuarioId === otroId));
    if (existente) return NextResponse.json({ canal: { id: existente.id } });

    const canal = await prisma.canal.create({
      data: { tipo: "DIRECTO", miembros: { create: [{ usuarioId: session.id }, { usuarioId: otroId }] } },
    });
    return NextResponse.json({ canal: { id: canal.id } }, { status: 201 });
  }

  if (Array.isArray(body.usuarioIds)) {
    const nombre = (body.nombre ?? "").trim();
    if (!nombre) return NextResponse.json({ error: "El grupo necesita un nombre" }, { status: 400 });
    const ids = new Set<string>([session.id, ...body.usuarioIds.filter((x: unknown) => typeof x === "string")]);
    const canal = await prisma.canal.create({
      data: { tipo: "GRUPO", nombre, miembros: { create: [...ids].map((usuarioId) => ({ usuarioId })) } },
    });
    return NextResponse.json({ canal: { id: canal.id } }, { status: 201 });
  }

  return NextResponse.json({ error: "Faltan usuarioId o usuarioIds" }, { status: 400 });
}
