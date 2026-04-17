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

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const socios = await prisma.socio.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { activos: true, reportes: true } },
      activos: { where: { activo: true }, select: { id: true, precioDia: true } },
      checklist: { select: { completado: true } },
    },
  });

  return NextResponse.json({ socios });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { nombre, tipo, rfc, curp, telefono, email, domicilio, colonia, ciudad, estado, cp,
    pctSocio, pctMainstage, contratoInicio, contratoFin, notas } = body;

  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const pctS = parseFloat(pctSocio) || 70;
  const pctM = parseFloat(pctMainstage) || 30;

  const socio = await prisma.socio.create({
    data: {
      nombre: nombre.trim(),
      tipo: tipo || "FISICA",
      rfc: rfc || null,
      curp: curp || null,
      telefono: telefono || null,
      email: email || null,
      domicilio: domicilio || null,
      colonia: colonia || null,
      ciudad: ciudad || null,
      estado: estado || null,
      cp: cp || null,
      pctSocio: pctS,
      pctMainstage: pctM,
      contratoInicio: contratoInicio ? new Date(contratoInicio) : null,
      contratoFin: contratoFin ? new Date(contratoFin) : null,
      notas: notas || null,
      checklist: {
        create: REQUISITOS_DEFAULT.map((req, i) => ({ requisito: req, orden: i })),
      },
    },
    include: { checklist: true },
  });

  return NextResponse.json({ socio }, { status: 201 });
}
