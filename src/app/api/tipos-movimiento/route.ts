import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { getTiposMovimiento, ensureTiposMovimiento, slugClave } from "@/lib/tipos-movimiento";

const NATURALEZAS = ["ENTRADA", "SALIDA", "NEUTRO"];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const soloActivos = req.nextUrl.searchParams.get("activos") === "true";
  const tipos = await getTiposMovimiento(soloActivos);
  return NextResponse.json({ tipos });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const nombre = (body.nombre ?? "").trim();
  const naturaleza = body.naturaleza ?? "SALIDA";
  const afectaResultado = body.afectaResultado ?? (naturaleza !== "NEUTRO");
  const color = body.color ?? "gray";
  const orden = body.orden ?? 0;

  if (!nombre) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  if (!NATURALEZAS.includes(naturaleza)) return NextResponse.json({ error: "Naturaleza inválida" }, { status: 400 });

  await ensureTiposMovimiento();

  // Genera una clave única a partir del nombre.
  let clave = slugClave(nombre);
  let intento = clave;
  let n = 1;
  while (await prisma.tipoMovimiento.findUnique({ where: { clave: intento } })) {
    intento = `${clave}_${n++}`;
  }
  clave = intento;

  const tipo = await prisma.tipoMovimiento.create({
    data: {
      clave,
      nombre,
      naturaleza,
      afectaResultado: naturaleza === "NEUTRO" ? false : Boolean(afectaResultado),
      color,
      orden,
      sistema: false,
      activo: true,
    },
  });

  return NextResponse.json({ tipo });
}
