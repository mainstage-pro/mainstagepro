import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildSnapshot } from "@/lib/documentos-laborales";
import { createExpiringToken } from "@/lib/tokens";

export async function ensureDocLaboralSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS documentos_laborales (
      id TEXT PRIMARY KEY,
      personal_id TEXT NOT NULL,
      puesto_id TEXT,
      tipo TEXT NOT NULL,
      datos TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      aceptado BOOLEAN NOT NULL DEFAULT false,
      aceptado_nombre TEXT,
      aceptado_en TIMESTAMP,
      aceptado_ip TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureDocLaboralSchema();
  const personalId = req.nextUrl.searchParams.get("personalId");
  const docs = await prisma.documentoLaboral.findMany({
    where: personalId ? { personalId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ docs });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    await ensureDocLaboralSchema();
    const b = await req.json();
    const tipo = b.tipo === "OFERTA" ? "OFERTA" : "ACUERDO";
    if (!b.personalId) return NextResponse.json({ error: "personalId requerido" }, { status: 400 });

    const persona = await prisma.personalInterno.findUnique({
      where: { id: b.personalId },
      include: {
        puestoRef: {
          include: { reportaA: { select: { nombre: true } }, puestoIdeal: true },
        },
      },
    });
    if (!persona) return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });

    const snapshot = buildSnapshot(tipo, persona, persona.puestoRef, session.name ?? "Dirección");

    const doc = await prisma.documentoLaboral.create({
      data: {
        personalId: persona.id,
        puestoId: persona.puestoId,
        tipo,
        datos: JSON.stringify(snapshot),
        token: createExpiringToken(365),
      },
    });
    return NextResponse.json({ doc }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rrhh/documentos-laborales POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
