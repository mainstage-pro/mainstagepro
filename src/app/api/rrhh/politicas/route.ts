import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function ensurePoliticaSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS politicas (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      categoria TEXT NOT NULL DEFAULT 'GENERAL',
      resumen TEXT,
      contenido TEXT NOT NULL DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      estado TEXT NOT NULL DEFAULT 'BORRADOR',
      requiere_acuse BOOLEAN NOT NULL DEFAULT true,
      orden INTEGER NOT NULL DEFAULT 0,
      publicada_en TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS politica_versiones (
      id TEXT PRIMARY KEY,
      politica_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      contenido TEXT NOT NULL,
      nota TEXT,
      autor_nombre TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS politica_versiones_politica_version_key ON politica_versiones(politica_id, version)`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS politica_acuses (
      id TEXT PRIMARY KEY,
      politica_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      personal_id TEXT,
      personal_nombre TEXT,
      token TEXT NOT NULL,
      aceptado BOOLEAN NOT NULL DEFAULT false,
      aceptado_nombre TEXT,
      aceptado_en TIMESTAMP,
      aceptado_ip TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS politica_acuses_token_key ON politica_acuses(token)`);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensurePoliticaSchema();
  const politicas = await prisma.politica.findMany({
    orderBy: [{ categoria: "asc" }, { orden: "asc" }, { titulo: "asc" }],
    include: {
      _count: { select: { acuses: true, versiones: true } },
      acuses: { where: { aceptado: true }, select: { id: true } },
    },
  });
  const data = politicas.map((p) => ({
    id: p.id, titulo: p.titulo, categoria: p.categoria, resumen: p.resumen,
    version: p.version, estado: p.estado, requiereAcuse: p.requiereAcuse,
    orden: p.orden, publicadaEn: p.publicadaEn, updatedAt: p.updatedAt,
    totalAcuses: p._count.acuses, aceptados: p.acuses.length, totalVersiones: p._count.versiones,
  }));
  return NextResponse.json({ politicas: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    await ensurePoliticaSchema();
    const b = await req.json();
    if (!b.titulo) return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
    const politica = await prisma.politica.create({
      data: {
        titulo: b.titulo,
        categoria: b.categoria || "GENERAL",
        resumen: b.resumen || null,
        contenido: b.contenido || "",
        requiereAcuse: b.requiereAcuse ?? true,
        orden: typeof b.orden === "number" ? b.orden : 0,
      },
    });
    return NextResponse.json({ politica }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rrhh/politicas POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
