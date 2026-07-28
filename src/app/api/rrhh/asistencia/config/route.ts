import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CONFIG_DEFAULT } from "@/lib/asistencia-penalizaciones";

const CAMPOS = [
  "horaEntrada", "toleranciaMin", "retardoMaxMin", "retardosPorFalta",
  "descuentaRetardo", "descuentaFalta", "requiereDocFalta", "faltasCausalBaja",
] as const;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const existente = await prisma.configAsistencia.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ config: existente ?? { id: "singleton", ...CONFIG_DEFAULT } });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of CAMPOS) {
    if (k in body) {
      if (["toleranciaMin", "retardoMaxMin", "retardosPorFalta", "faltasCausalBaja"].includes(k)) {
        data[k] = Math.max(0, Number(body[k]) || 0);
      } else if (["descuentaRetardo", "descuentaFalta", "requiereDocFalta"].includes(k)) {
        data[k] = !!body[k];
      } else {
        data[k] = String(body[k]);
      }
    }
  }
  const config = await prisma.configAsistencia.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...CONFIG_DEFAULT, ...data },
    update: data,
  });
  return NextResponse.json({ config });
}
