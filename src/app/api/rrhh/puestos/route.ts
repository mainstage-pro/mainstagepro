import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS puestos_ideales (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      area TEXT NOT NULL,
      descripcion TEXT,
      objetivo_rol TEXT,
      edad_min INTEGER,
      edad_max INTEGER,
      ciudades TEXT,
      nivel_estudios TEXT,
      carreras_sugeridas TEXT,
      habilidades_tecnicas TEXT,
      habilidades_blandas TEXT,
      conocimientos TEXT,
      aptitudes TEXT,
      valores TEXT,
      areas_desarrollo TEXT,
      criterios_evaluacion TEXT,
      salario_min DOUBLE PRECISION,
      salario_max DOUBLE PRECISION,
      tipo_contrato TEXT,
      modalidad TEXT,
      horario TEXT,
      prestaciones TEXT,
      activo BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureTable();
  const puestos = await prisma.puestoIdeal.findMany({ orderBy: [{ area: "asc" }, { titulo: "asc" }] });
  return NextResponse.json({ puestos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    await ensureTable();
    const body = await req.json();
    const { titulo, area, descripcion, objetivoRol,
      edadMin, edadMax, ciudades, nivelEstudios, carrerasSugeridas,
      habilidadesTecnicas, habilidadesBlandas, conocimientos, aptitudes, valores, areasDesarrollo,
      criteriosEvaluacion,
      salarioMin, salarioMax, tipoContrato, modalidad, horario, prestaciones,
    } = body;

    if (!titulo || !area) return NextResponse.json({ error: "Título y área requeridos" }, { status: 400 });

    const puesto = await prisma.puestoIdeal.create({
      data: {
        id: crypto.randomUUID(),
        titulo, area,
        descripcion: descripcion || null,
        objetivoRol: objetivoRol || null,
        edadMin: edadMin || null,
        edadMax: edadMax || null,
        ciudades: ciudades ? JSON.stringify(ciudades) : null,
        nivelEstudios: nivelEstudios || null,
        carrerasSugeridas: carrerasSugeridas || null,
        habilidadesTecnicas: habilidadesTecnicas ? JSON.stringify(habilidadesTecnicas) : null,
        habilidadesBlandas: habilidadesBlandas ? JSON.stringify(habilidadesBlandas) : null,
        conocimientos: conocimientos ? JSON.stringify(conocimientos) : null,
        aptitudes: aptitudes ? JSON.stringify(aptitudes) : null,
        valores: valores ? JSON.stringify(valores) : null,
        areasDesarrollo: areasDesarrollo ? JSON.stringify(areasDesarrollo) : null,
        criteriosEvaluacion: criteriosEvaluacion ? JSON.stringify(criteriosEvaluacion) : null,
        salarioMin: salarioMin || null,
        salarioMax: salarioMax || null,
        tipoContrato: tipoContrato || null,
        modalidad: modalidad || null,
        horario: horario || null,
        prestaciones: prestaciones ? JSON.stringify(prestaciones) : null,
      },
    });

    return NextResponse.json({ puesto }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rrhh/puestos POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
