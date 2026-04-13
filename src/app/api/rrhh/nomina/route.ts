import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET — obtener pagos pendientes + historial reciente
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [pendientes, historial, personal, cuentas] = await Promise.all([
    prisma.pagoNomina.findMany({
      where: { estado: "PENDIENTE" },
      include: { personal: { select: { id: true, nombre: true, puesto: true, departamento: true, cuentaBancaria: true } }, cuentaOrigen: { select: { id: true, nombre: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pagoNomina.findMany({
      where: { estado: "PAGADO" },
      include: { personal: { select: { id: true, nombre: true, puesto: true } }, cuentaOrigen: { select: { nombre: true } } },
      orderBy: { fechaPago: "desc" },
      take: 40,
    }),
    prisma.personalInterno.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, puesto: true, departamento: true, salario: true, periodoPago: true, cuentaBancaria: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.cuentaBancaria.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  return NextResponse.json({ pendientes, historial, personal, cuentas });
}

// POST — generar nómina para un período
// body: { periodo: "2026-04-14", tipoPeriodo: "SEMANAL" | "QUINCENAL" | "MENSUAL" }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { periodo, tipoPeriodo } = await req.json();
  if (!periodo || !tipoPeriodo) return NextResponse.json({ error: "Periodo y tipoPeriodo requeridos" }, { status: 400 });

  // Buscar personal con ese período de pago
  const empleados = await prisma.personalInterno.findMany({
    where: { activo: true, periodoPago: tipoPeriodo, NOT: { salario: null } },
  });

  if (empleados.length === 0) return NextResponse.json({ created: 0, skipped: 0 });

  // Verificar cuáles ya tienen pago para este período
  const yaExisten = await prisma.pagoNomina.findMany({
    where: {
      periodo,
      tipoPeriodo,
      personalId: { in: empleados.map(e => e.id) },
    },
    select: { personalId: true },
  });
  const yaExisteIds = new Set(yaExisten.map(p => p.personalId));

  const nuevos = empleados.filter(e => !yaExisteIds.has(e.id));

  if (nuevos.length === 0) return NextResponse.json({ created: 0, skipped: empleados.length });

  const conceptoLabel = tipoPeriodo === "SEMANAL" ? `Semana ${periodo}` :
                        tipoPeriodo === "QUINCENAL" ? `Quincena ${periodo}` :
                        `Nómina ${periodo}`;

  await prisma.pagoNomina.createMany({
    data: nuevos.map(e => ({
      personalId: e.id,
      periodo,
      tipoPeriodo,
      monto: e.salario!,
      concepto: `${conceptoLabel} — ${e.nombre}`,
      estado: "PENDIENTE",
    })),
  });

  return NextResponse.json({ created: nuevos.length, skipped: yaExisteIds.size });
}
