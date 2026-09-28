import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isTokenExpired } from "@/lib/tokens";
import { proyectoIdPorToken } from "@/lib/orden-produccion";

/**
 * Identifica a quien va a marcar el control de carga. Interno = técnico del
 * proyecto; externo = ayudante, chofer de tercero o staff del venue, que se
 * registra con nombre y un dato de contacto.
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

    // El técnico tiene que estar asignado a este proyecto — el link no sirve para
    // registrar a cualquiera del padrón.
    const asignado = await prisma.proyectoPersonal.findFirst({
      where: { proyectoId, tecnicoId },
      select: { tecnico: { select: { id: true, nombre: true } } },
    });
    if (!asignado?.tecnico) {
      return NextResponse.json({ error: "Ese técnico no está asignado al proyecto" }, { status: 400 });
    }

    const existente = await prisma.proyectoCargaVerificador.findFirst({
      where: { proyectoId, tecnicoId },
    });
    if (existente) {
      return NextResponse.json({ verificador: { id: existente.id, nombre: existente.nombre, tipo: existente.tipo } });
    }

    const creado = await prisma.proyectoCargaVerificador.create({
      data: { proyectoId, tipo: "INTERNO", nombre: asignado.tecnico.nombre, tecnicoId },
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
