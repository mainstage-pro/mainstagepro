import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";
import { proyectoIdPorToken } from "@/lib/orden-produccion";
import { idsPorTexto } from "@/lib/buscar-servidor";

/**
 * Busca en el padrón a quien no está asignado al proyecto.
 *
 * La lista no se entrega completa —el enlace es público— sino por búsqueda y
 * acotada: sirve para encontrarte a ti mismo, no para bajar el directorio.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`orden-verif-q:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Enlace expirado" }, { status: 410 });
  if (!(await proyectoIdPorToken(token))) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ tecnicos: [] });

  const tecnicos = await prisma.tecnico.findMany({
    where: { activo: true, id: { in: await idsPorTexto("Tecnico", ["nombre"], q) } },
    select: { id: true, nombre: true, rol: { select: { nombre: true } } },
    orderBy: { nombre: "asc" },
    take: 8,
  });

  return NextResponse.json({
    tecnicos: tecnicos.map((t) => ({ id: t.id, nombre: t.nombre, rol: t.rol?.nombre ?? null })),
  });
}

/**
 * Identifica a quien va a marcar el control de carga. Interno = cualquier
 * técnico del padrón (no solo el asignado: el coordinador o el dueño entran a
 * revisar sin estar en la lista del evento); externo = ayudante, chofer de
 * tercero o staff del venue, que se registra con nombre y un contacto.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  if (!rateLimit(`orden-verif:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const { token } = await params;
  if (isTokenExpired(token)) return NextResponse.json({ error: "Enlace expirado" }, { status: 410 });

  const proyectoId = await proyectoIdPorToken(token);
  if (!proyectoId) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const tipo = body.tipo === "EXTERNO" ? "EXTERNO" : "INTERNO";

  if (tipo === "INTERNO") {
    const tecnicoId = typeof body.tecnicoId === "string" ? body.tecnicoId : "";
    if (!tecnicoId) return NextResponse.json({ error: "Falta el técnico" }, { status: 400 });

    // Basta con estar en el padrón y activo. Quien entra a revisar la carga no
    // siempre es del evento: el coordinador pasa a verificar, el dueño también.
    const tecnico = await prisma.tecnico.findFirst({
      where: { id: tecnicoId, activo: true },
      select: { id: true, nombre: true },
    });
    if (!tecnico) {
      return NextResponse.json({ error: "No encontramos a esa persona" }, { status: 400 });
    }

    const existente = await prisma.proyectoCargaVerificador.findFirst({
      where: { proyectoId, tecnicoId },
    });
    if (existente) {
      return NextResponse.json({ verificador: { id: existente.id, nombre: existente.nombre, tipo: existente.tipo } });
    }

    const creado = await prisma.proyectoCargaVerificador.create({
      data: { proyectoId, tipo: "INTERNO", nombre: tecnico.nombre, tecnicoId },
    });
    return NextResponse.json({ verificador: { id: creado.id, nombre: creado.nombre, tipo: creado.tipo } });
  }

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (nombre.length < 3) return NextResponse.json({ error: "Escribe tu nombre completo" }, { status: 400 });

  const telefono = typeof body.telefono === "string" ? body.telefono.trim() : "";
  if (telefono.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Escribe un teléfono de 10 dígitos" }, { status: 400 });
  }

  const creado = await prisma.proyectoCargaVerificador.create({
    data: {
      proyectoId,
      tipo: "EXTERNO",
      nombre,
      telefono,
      empresa: typeof body.empresa === "string" && body.empresa.trim() ? body.empresa.trim() : null,
    },
  });

  return NextResponse.json({ verificador: { id: creado.id, nombre: creado.nombre, tipo: creado.tipo } });
}
