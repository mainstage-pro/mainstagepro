import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const FASES = ["INSTALACION", "OPERACION", "RECOLECCION"] as const;
type Fase = (typeof FASES)[number];

type VentanaEntrada = {
  fase?: string;
  fecha?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  detalle?: string | null;
  responsable?: string | null;
};

function aFecha(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00.000Z`) : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

const TITULO: Record<Fase, string> = {
  INSTALACION: "Instalación",
  OPERACION: "Operación",
  RECOLECCION: "Recolección",
};

/**
 * Reemplaza las tres ventanas (instalación / operación / recolección) de un proveedor.
 * Son filas de ProyectoBloqueTiempo con tipo PROVEEDOR, no columnas, para que la
 * recolección aparezca en la cronología del evento junto a todo lo demás.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, pid } = await params;

  const proveedor = await prisma.proveedorEvento.findFirst({ where: { id: pid, proyectoId: id } });
  if (!proveedor) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const entradas: VentanaEntrada[] = Array.isArray(body.ventanas) ? body.ventanas : [];

  const filas = entradas
    .filter((v): v is VentanaEntrada & { fase: Fase } => FASES.includes(v.fase as Fase))
    // Una ventana sin hora ni nota no aporta nada a la cronología.
    .filter((v) => v.horaInicio?.trim() || v.horaFin?.trim() || v.detalle?.trim())
    .map((v, i) => ({
      proyectoId: id,
      proveedorEventoId: pid,
      tipo: "PROVEEDOR",
      fase: v.fase,
      fecha: aFecha(v.fecha),
      horaInicio: v.horaInicio?.trim() || null,
      horaFin: v.horaFin?.trim() || null,
      titulo: `${TITULO[v.fase]} — ${proveedor.nombreProveedor}`,
      detalle: v.detalle?.trim() || null,
      responsable: v.responsable?.trim() || proveedor.responsable,
      involucrados: null,
      orden: FASES.indexOf(v.fase) * 10 + i,
    }));

  await prisma.$transaction([
    prisma.proyectoBloqueTiempo.deleteMany({ where: { proveedorEventoId: pid } }),
    ...(filas.length ? [prisma.proyectoBloqueTiempo.createMany({ data: filas })] : []),
  ]);

  const bloques = await prisma.proyectoBloqueTiempo.findMany({
    where: { proveedorEventoId: pid },
    orderBy: [{ orden: "asc" }, { horaInicio: "asc" }],
  });
  return NextResponse.json({ bloques });
}
