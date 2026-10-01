import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const INCLUDE_CONTEO = {
  _count: { select: { equipos: true, personal: true, bloques: true, proveedores: true } },
} as const;

/**
 * Las medidas del escenario viven en `Proyecto.escenarioMedidas` como texto libre
 * ("8 x 6 m", "12 × 8"). El editor de layout necesita números, así que al sembrar el
 * primer escenario se intenta leerlas; si no se puede, quedan vacías y se capturan a mano.
 */
function parsearMedidas(texto: string | null): { anchoM: number | null; largoM: number | null } {
  if (!texto) return { anchoM: null, largoM: null };
  const m = texto.match(/(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/i);
  if (!m) return { anchoM: null, largoM: null };
  const a = parseFloat(m[1].replace(",", "."));
  const b = parseFloat(m[2].replace(",", "."));
  return {
    anchoM: Number.isFinite(a) && a > 0 && a < 200 ? a : null,
    largoM: Number.isFinite(b) && b > 0 && b < 200 ? b : null,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const [escenarios, equipos, personal, bloques, proveedores] = await Promise.all([
    prisma.proyectoEscenario.findMany({
      where: { proyectoId: id },
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      include: INCLUDE_CONTEO,
    }),
    prisma.proyectoEquipo.count({ where: { proyectoId: id, escenarioId: null } }),
    prisma.proyectoPersonal.count({ where: { proyectoId: id, escenarioId: null } }),
    prisma.proyectoBloqueTiempo.count({ where: { proyectoId: id, escenarioId: null } }),
    prisma.proveedorEvento.count({ where: { proyectoId: id, escenarioId: null } }),
  ]);

  // Lo que nadie repartió a un escenario. Con un solo escenario es todo el proyecto, y
  // el layout lo trata como suyo; con varios, es la bandeja de pendientes por asignar.
  return NextResponse.json({
    escenarios,
    sinAsignar: { equipos, personal, bloques, proveedores },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const existentes = await prisma.proyectoEscenario.count({ where: { proyectoId: id } });

  // El primer escenario se siembra desde los datos que ya trae el proyecto para la Ficha
  // Operativa, en vez de nacer vacío y obligar a recapturar lo mismo.
  let semilla: { anchoM: number | null; largoM: number | null; alturaM: number | null } = {
    anchoM: null, largoM: null, alturaM: null,
  };
  if (existentes === 0) {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { escenarioMedidas: true, escenarioAlturaM: true },
    });
    if (proyecto) {
      semilla = { ...parsearMedidas(proyecto.escenarioMedidas), alturaM: proyecto.escenarioAlturaM };
    }
  }

  const escenario = await prisma.proyectoEscenario.create({
    data: {
      proyectoId: id,
      nombre: body.nombre?.trim() || (existentes === 0 ? "Principal" : `Escenario ${existentes + 1}`),
      orden: existentes,
      anchoM: body.anchoM != null && body.anchoM !== "" ? parseFloat(body.anchoM) : semilla.anchoM,
      largoM: body.largoM != null && body.largoM !== "" ? parseFloat(body.largoM) : semilla.largoM,
      alturaM: body.alturaM != null && body.alturaM !== "" ? parseFloat(body.alturaM) : semilla.alturaM,
      notas: body.notas || null,
    },
    include: INCLUDE_CONTEO,
  });

  return NextResponse.json({ escenario });
}
