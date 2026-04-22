import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const REQUISITOS_DEFAULT = [
  "INE o Pasaporte vigente",
  "RFC activo ante el SAT",
  "Comprobante de domicilio (máx. 3 meses)",
  "Entrevista completada",
  "Equipos evaluados y aceptados",
  "Contrato firmado",
];

async function getOrCreateMauricio(): Promise<string> {
  const existing = await prisma.socio.findFirst({ where: { nombre: "Mauricio Hernández" } });
  if (existing) return existing.id;
  const socio = await prisma.socio.create({
    data: {
      nombre: "Mauricio Hernández",
      tipo: "FISICA",
      email: "mauriciohernandezvm@gmail.com",
      status: "ACTIVO",
      pctSocio: 70,
      pctMainstage: 30,
      checklist: { create: REQUISITOS_DEFAULT.map((req, i) => ({ requisito: req, orden: i })) },
    },
  });
  return socio.id;
}

async function getOrCreateConfig() {
  let config = await prisma.hervamConfig.findFirst();
  if (!config) {
    const socioId = await getOrCreateMauricio();
    config = await prisma.hervamConfig.create({
      data: {
        socioId,
        valorTotalActivos: 5000000,
        tasaAnualRendimiento: 15,
        usarSumaActivos: false,
        modoActivo: "HIBRIDO",
        porcentajeVariable: 25,
        pisoMinimoFijo: 50,
        creditoSaldoInicial: 800000,
        creditoSaldoActual: 800000,
        creditoCuotaMensual: 0,
        creditoPlazoMeses: 48,
      },
    });
  } else if (!config.socioId) {
    // Config existente sin socio: enlazar Mauricio
    const socioId = await getOrCreateMauricio();
    config = await prisma.hervamConfig.update({ where: { id: config.id }, data: { socioId } });
  }
  return config;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const config = await getOrCreateConfig();
  const socio = config.socioId
    ? await prisma.socio.findUnique({ where: { id: config.socioId }, select: { id: true, nombre: true } })
    : null;

  // Si usa suma de activos, calcular
  let valorEfectivo = config.valorTotalActivos;
  if (config.usarSumaActivos) {
    const activos = await prisma.hervamActivo.findMany({ where: { activo: true } });
    valorEfectivo = activos.reduce((s, a) => s + a.valorActual, 0);
  }

  const montoFijoMensual = (valorEfectivo * config.tasaAnualRendimiento) / 1200;
  const pisoAbsolutoPeso = montoFijoMensual * config.pisoMinimoFijo / 100;

  return NextResponse.json({ config, socio, valorEfectivo, montoFijoMensual, pisoAbsolutoPeso });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const config = await getOrCreateConfig();
  const body = await req.json();

  const updated = await prisma.hervamConfig.update({
    where: { id: config.id },
    data: {
      ...(body.valorTotalActivos !== undefined && { valorTotalActivos: parseFloat(body.valorTotalActivos) }),
      ...(body.tasaAnualRendimiento !== undefined && { tasaAnualRendimiento: parseFloat(body.tasaAnualRendimiento) }),
      ...(body.usarSumaActivos !== undefined && { usarSumaActivos: !!body.usarSumaActivos }),
      ...(body.modoActivo !== undefined && { modoActivo: body.modoActivo }),
      ...(body.porcentajeVariable !== undefined && { porcentajeVariable: parseFloat(body.porcentajeVariable) }),
      ...(body.pisoMinimoFijo !== undefined && { pisoMinimoFijo: parseFloat(body.pisoMinimoFijo) }),
      ...(body.creditoSaldoInicial !== undefined && { creditoSaldoInicial: parseFloat(body.creditoSaldoInicial) }),
      ...(body.creditoSaldoActual !== undefined && { creditoSaldoActual: parseFloat(body.creditoSaldoActual) }),
      ...(body.creditoCuotaMensual !== undefined && { creditoCuotaMensual: parseFloat(body.creditoCuotaMensual) }),
      ...(body.creditoPlazoMeses !== undefined && { creditoPlazoMeses: parseInt(body.creditoPlazoMeses) }),
      ...(body.creditoFechaInicio !== undefined && { creditoFechaInicio: body.creditoFechaInicio ? new Date(body.creditoFechaInicio) : null }),
      ...(body.notas !== undefined && { notas: body.notas || null }),
    },
  });

  return NextResponse.json({ config: updated });
}
