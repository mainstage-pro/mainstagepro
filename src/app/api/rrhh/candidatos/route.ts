import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS candidatos (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      correo TEXT,
      telefono TEXT,
      ciudad TEXT,
      edad INTEGER,
      nivel_estudios TEXT,
      carrera TEXT,
      experiencia_eventos TEXT,
      anios_experiencia_eventos INTEGER,
      evento_destacado TEXT,
      situacion_resuelta TEXT,
      como_resolveria TEXT,
      motivacion TEXT,
      vision_largo_plazo TEXT,
      disposicion_horario BOOLEAN,
      disposicion_fines BOOLEAN,
      salario_esperado DOUBLE PRECISION,
      habilidades TEXT,
      experiencia_previa TEXT,
      linkedin TEXT,
      portfolio TEXT,
      notas TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS postulaciones (
      id TEXT PRIMARY KEY,
      candidato_id TEXT NOT NULL REFERENCES candidatos(id) ON DELETE CASCADE,
      puesto_id TEXT REFERENCES puestos_ideales(id),
      puesto_manual TEXT,
      area_manual TEXT,
      etapa TEXT NOT NULL DEFAULT 'NUEVO',
      salario_propuesto DOUBLE PRECISION,
      fecha_ingreso_estimada TIMESTAMP,
      beneficios TEXT,
      observaciones TEXT,
      propuesta_token TEXT UNIQUE,
      propuesta_aceptada BOOLEAN,
      propuesta_fecha_envio TIMESTAMP,
      contrato_generado BOOLEAN NOT NULL DEFAULT false,
      contrato_fecha TIMESTAMP,
      personal_interno_id TEXT,
      notas_evaluacion TEXT,
      puntaje_total DOUBLE PRECISION,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTables();

  const etapa = req.nextUrl.searchParams.get("etapa");
  const where = etapa ? { postulaciones: { some: { etapa } } } : {};

  const candidatos = await prisma.candidato.findMany({
    where,
    include: { postulaciones: { include: { puesto: { select: { titulo: true, area: true } } }, orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ candidatos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTables();

  const body = await req.json();
  const { nombre, correo, telefono, ciudad, edad, nivelEstudios, carrera,
    puestoId, puestoManual, areaManual } = body;

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const candidato = await prisma.candidato.create({
    data: {
      id: crypto.randomUUID(),
      nombre, correo: correo || null, telefono: telefono || null,
      ciudad: ciudad || null, edad: edad || null,
      nivelEstudios: nivelEstudios || null, carrera: carrera || null,
      postulaciones: {
        create: {
          id: crypto.randomUUID(),
          puestoId: puestoId || null,
          puestoManual: puestoManual || null,
          areaManual: areaManual || null,
          etapa: "NUEVO",
        },
      },
    },
    include: { postulaciones: { include: { puesto: { select: { titulo: true, area: true } } } } },
  });

  return NextResponse.json({ candidato }, { status: 201 });
}
