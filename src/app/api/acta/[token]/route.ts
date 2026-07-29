import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTokenExpired } from "@/lib/tokens";
import { etiquetaGravedad, etiquetaNivel, nivelActa } from "@/lib/faltas";

// Acuse público del acta administrativa por enlace con token. Sin autenticación:
// el colaborador confirma que la recibió y quedó enterado.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const acta = await prisma.actaAdministrativa.findUnique({
    where: { token },
    include: {
      personal: { select: { nombre: true, puesto: true } },
      proyecto: { select: { nombre: true, numeroProyecto: true } },
    },
  });
  if (!acta) return NextResponse.json({ error: "Acta no encontrada" }, { status: 404 });
  if (acta.estado === "ANULADA") return NextResponse.json({ error: "Esta acta fue anulada" }, { status: 410 });
  if (isTokenExpired(token)) return NextResponse.json({ error: "El enlace expiró" }, { status: 410 });

  return NextResponse.json({
    acta: {
      folio: acta.folio,
      ambito: acta.ambito,
      colaborador: acta.personal?.nombre ?? acta.personaNombre ?? "",
      puesto: acta.personal?.puesto ?? (acta.ambito === "EVENTO" ? "Técnico de evento" : ""),
      evento: acta.proyecto ? `${acta.proyecto.numeroProyecto} · ${acta.proyecto.nombre}` : null,
      gravedad: acta.gravedad,
      gravedadLabel: etiquetaGravedad(acta.gravedad),
      nivelActaLabel: nivelActa(acta.gravedad).titulo,
      nivelLabel: etiquetaNivel(acta.nivelEscalon),
      fecha: acta.fecha,
      hechos: acta.hechos,
      consecuencia: acta.consecuencia,
      montoDescuento: acta.montoDescuento,
      descargo: acta.descargo,
      aceptada: acta.aceptada,
      aceptadaEn: acta.aceptadaEn,
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const nombre: string = (body.nombre ?? "").trim();
  const descargo: string | undefined = body.descargo?.trim() || undefined;
  if (!nombre) return NextResponse.json({ error: "Escribe tu nombre para firmar" }, { status: 400 });

  const acta = await prisma.actaAdministrativa.findUnique({ where: { token }, select: { id: true, estado: true, aceptada: true } });
  if (!acta) return NextResponse.json({ error: "Acta no encontrada" }, { status: 404 });
  if (acta.estado === "ANULADA") return NextResponse.json({ error: "Esta acta fue anulada" }, { status: 410 });
  if (isTokenExpired(token)) return NextResponse.json({ error: "El enlace expiró" }, { status: 410 });
  if (acta.aceptada) return NextResponse.json({ ok: true, yaAceptada: true });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await prisma.actaAdministrativa.update({
    where: { id: acta.id },
    data: {
      aceptada: true,
      aceptadaNombre: nombre,
      aceptadaEn: new Date(),
      aceptadaIp: ip,
      estado: "ACEPTADA",
      ...(descargo ? { descargo } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}
