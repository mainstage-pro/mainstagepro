import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { textoOpcional, numero, booleano, soloDefinidos } from "../propuestas-servicio/recalcular";

// GET: catálogo de servicios de production management
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const incluirInactivos = req.nextUrl.searchParams.get("todos") === "1";

  const servicios = await prisma.servicioPM.findMany({
    where: incluirInactivos ? {} : { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ servicios });
}

// POST: alta de un servicio nuevo del catálogo
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const clave = typeof body.clave === "string" ? body.clave.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_") : "";
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  if (!clave) return NextResponse.json({ error: "La clave es obligatoria" }, { status: 400 });
  if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const existe = await prisma.servicioPM.findUnique({ where: { clave }, select: { id: true } });
  if (existe) return NextResponse.json({ error: `Ya existe un servicio con la clave ${clave}` }, { status: 409 });

  const servicio = await prisma.servicioPM.create({
    data: {
      clave,
      nombre,
      ...soloDefinidos({
        categoria: textoOpcional(body.categoria),
        descripcion: textoOpcional(body.descripcion),
        entregables: textoOpcional(body.entregables),
        incluye: textoOpcional(body.incluye),
        noIncluye: textoOpcional(body.noIncluye),
        precioSugerido: numero(body.precioSugerido),
        costoSugerido: numero(body.costoSugerido),
        activo: booleano(body.activo),
      }),
      unidadDefault: typeof body.unidadDefault === "string" ? body.unidadDefault : "SHOW",
      tipoLinea: typeof body.tipoLinea === "string" ? body.tipoLinea : "HONORARIO",
      orden: numero(body.orden) ?? 0,
    },
  });

  await logActividad(session.id, "CREAR", "servicio_pm", servicio.id, `Servicio ${clave} creado`);

  return NextResponse.json({ servicio });
}
