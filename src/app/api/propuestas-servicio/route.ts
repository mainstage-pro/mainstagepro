import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { siguienteNumero, textoOpcional, booleano, fecha, soloDefinidos } from "./recalcular";

// GET: lista de propuestas de servicio
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const estado = sp.get("estado");
  const giraId = sp.get("giraId");
  const tratoId = sp.get("tratoId");
  const proyectoCreativoId = sp.get("proyectoCreativoId");

  const propuestas = await prisma.propuestaServicio.findMany({
    where: {
      activo: true,
      ...(estado ? { estado } : {}),
      ...(giraId ? { giraId } : {}),
      ...(tratoId ? { tratoId } : {}),
      ...(proyectoCreativoId ? { proyectoCreativoId } : {}),
    },
    select: {
      id: true,
      numero: true,
      version: true,
      titulo: true,
      estado: true,
      modeloCobro: true,
      moneda: true,
      vigenciaHasta: true,
      granTotal: true,
      costoEstimado: true,
      aprobacionToken: true,
      createdAt: true,
      cliente: { select: { id: true, nombre: true, empresa: true } },
      artista: { select: { id: true, nombre: true } },
      gira: { select: { id: true, nombre: true } },
      proyectoCreativo: { select: { id: true, nombre: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ propuestas });
}

// POST: nueva propuesta
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const numero = await siguienteNumero();

  // Al nacer desde una gira, un trato o un proyecto creativo, la propuesta
  // hereda su cliente, artista y moneda: volver a capturarlos sería pedir
  // dos veces el mismo dato.
  const giraId = textoOpcional(body.giraId) ?? null;
  const tratoIdPedido = textoOpcional(body.tratoId) ?? null;
  const proyectoCreativoId = textoOpcional(body.proyectoCreativoId) ?? null;
  let heredado: { clienteId: string | null; artistaId: string | null; tratoId: string | null; moneda?: string } | null =
    null;
  let tituloHeredado: string | null = null;
  if (giraId) {
    const gira = await prisma.gira.findUnique({
      where: { id: giraId },
      select: { clienteId: true, artistaId: true, tratoId: true, moneda: true, nombre: true },
    });
    if (gira) {
      heredado = {
        clienteId: gira.clienteId,
        artistaId: gira.artistaId,
        tratoId: gira.tratoId,
        moneda: gira.moneda,
      };
    }
  } else if (proyectoCreativoId) {
    const proyecto = await prisma.proyectoCreativo.findUnique({
      where: { id: proyectoCreativoId },
      select: { clienteId: true, artistaId: true, tratoId: true, nombre: true },
    });
    if (proyecto) {
      heredado = {
        clienteId: proyecto.clienteId,
        artistaId: proyecto.artistaId,
        tratoId: proyecto.tratoId,
      };
      tituloHeredado = proyecto.nombre;
    }
  } else if (tratoIdPedido) {
    const trato = await prisma.trato.findUnique({
      where: { id: tratoIdPedido },
      select: { clienteId: true, artistaId: true, nombreEvento: true },
    });
    if (trato) {
      heredado = { clienteId: trato.clienteId, artistaId: trato.artistaId, tratoId: tratoIdPedido };
      tituloHeredado = trato.nombreEvento;
    }
  }

  const propuesta = await prisma.propuestaServicio.create({
    data: {
      numero,
      creadaPorId: session.id,
      titulo: textoOpcional(body.titulo) ?? tituloHeredado,
      giraId,
      proyectoCreativoId,
      clienteId: textoOpcional(body.clienteId) ?? heredado?.clienteId ?? null,
      artistaId: textoOpcional(body.artistaId) ?? heredado?.artistaId ?? null,
      tratoId: textoOpcional(body.tratoId) ?? heredado?.tratoId ?? null,
      moneda: (textoOpcional(body.moneda) ?? heredado?.moneda ?? "MXN") as string,
      ...soloDefinidos({
        // Una propuesta nacida de un trato de evento o de un proyecto creativo
        // se cobra por evento; el default del modelo (`POR_SHOW`) solo tiene
        // sentido en gira.
        modeloCobro:
          textoOpcional(body.modeloCobro) ??
          (!giraId && (tratoIdPedido || proyectoCreativoId) ? "POR_EVENTO" : undefined),
        vigenciaHasta: fecha(body.vigenciaHasta),
        aplicaIva: booleano(body.aplicaIva),
        alcance: textoOpcional(body.alcance),
        exclusiones: textoOpcional(body.exclusiones),
        supuestos: textoOpcional(body.supuestos),
        condicionesPago: textoOpcional(body.condicionesPago),
      }),
    },
    select: { id: true, numero: true },
  });

  await logActividad(
    session.id,
    "CREAR",
    "propuesta_servicio",
    propuesta.id,
    `Propuesta de servicios ${propuesta.numero} creada`,
  );

  return NextResponse.json({ propuesta });
}
