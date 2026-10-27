import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { computarPendientes, type AreaOp, type Severidad } from "@/lib/pendientes";

const SEVERIDAD_A_PRIORIDAD: Record<Severidad, "ALTA" | "MEDIA" | "BAJA"> = {
  URGENTE: "ALTA",
  ALTA: "MEDIA",
  MEDIA: "BAJA",
};

const ICONO_POR_AREA: Record<AreaOp, string> = {
  VENTAS: "💰",
  ADMINISTRACION: "🏦",
  PRODUCCION: "🎪",
  MARKETING: "📣",
  RRHH: "🧑‍💼",
  GENERAL: "📌",
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { pendientes } = await computarPendientes();
  const alertas = pendientes.map((p) => ({
    tipo: p.fuente,
    prioridad: SEVERIDAD_A_PRIORIDAD[p.severidad],
    titulo: p.titulo,
    detalle: p.descripcion ?? p.etiqueta,
    href: p.href,
    icono: ICONO_POR_AREA[p.area] ?? "📌",
  }));

  return NextResponse.json({ alertas });
}
