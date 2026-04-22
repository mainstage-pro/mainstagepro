import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const CUENTA_ID     = "caja-chica-mainstage";
const EMILIANO_ID   = "cmo7ikcc00000oqfsqwzys8g4";
const ALERTA_UMBRAL = 1000;

async function getSaldo(): Promise<number> {
  const cuenta = await prisma.cuentaBancaria.findUnique({
    where: { id: CUENTA_ID },
    select: {
      movimientosEntrada: { select: { monto: true } },
      movimientosSalida:  { select: { monto: true } },
    },
  });
  if (!cuenta) return 0;
  const entradas = cuenta.movimientosEntrada.reduce((s, m) => s + m.monto, 0);
  const salidas  = cuenta.movimientosSalida.reduce((s, m)  => s + m.monto, 0);
  return entradas - salidas;
}

async function notificarSaldoBajo(saldo: number) {
  // Evitar spam: solo si no hay una notificación no leída de las últimas 12h
  const hace12h = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const existe = await prisma.notificacion.findFirst({
    where: {
      usuarioId: EMILIANO_ID,
      leida: false,
      metadata: { contains: "caja_chica_low" },
      createdAt: { gte: hace12h },
    },
  });
  if (existe) return;

  await prisma.notificacion.create({
    data: {
      usuarioId: EMILIANO_ID,
      tipo: "SISTEMA",
      titulo: "Caja Chica — Saldo bajo",
      mensaje: `El saldo de caja chica es de $${saldo.toLocaleString("es-MX", { maximumFractionDigits: 0 })}. Se requiere recarga.`,
      url: "/finanzas/caja-chica",
      metadata: JSON.stringify({ type: "caja_chica_low", saldo }),
    },
  });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [cuenta, movimientos] = await Promise.all([
    prisma.cuentaBancaria.findUnique({
      where: { id: CUENTA_ID },
      select: {
        id: true, nombre: true, banco: true,
        movimientosEntrada: { select: { monto: true } },
        movimientosSalida:  { select: { monto: true } },
      },
    }),
    prisma.movimientoFinanciero.findMany({
      where: {
        OR: [
          { cuentaOrigenId:  CUENTA_ID },
          { cuentaDestinoId: CUENTA_ID },
        ],
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        cuentaOrigen:  { select: { id: true, nombre: true } },
        cuentaDestino: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: "desc" },
      take: 100,
    }),
  ]);

  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const saldo = cuenta.movimientosEntrada.reduce((s, m) => s + m.monto, 0)
              - cuenta.movimientosSalida.reduce((s, m)  => s + m.monto, 0);

  return NextResponse.json({ saldo, movimientos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { concepto, monto, fecha, categoriaId, notas } = body;

  if (!concepto || !monto || !fecha) {
    return NextResponse.json({ error: "Concepto, monto y fecha son requeridos" }, { status: 400 });
  }

  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  const saldoActual = await getSaldo();
  if (montoNum > saldoActual) {
    return NextResponse.json({ error: `Saldo insuficiente. Disponible: $${saldoActual.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` }, { status: 400 });
  }

  const movimiento = await prisma.movimientoFinanciero.create({
    data: {
      fecha: new Date(fecha),
      tipo: "GASTO",
      cuentaOrigenId: CUENTA_ID,
      concepto,
      monto: montoNum,
      metodoPago: "EFECTIVO",
      categoriaId: categoriaId || null,
      notas: notas || null,
      creadoPor: session.name ?? session.id,
    },
    include: {
      categoria: { select: { id: true, nombre: true } },
      cuentaOrigen: { select: { id: true, nombre: true } },
    },
  });

  const nuevoSaldo = saldoActual - montoNum;
  if (nuevoSaldo < ALERTA_UMBRAL) {
    await notificarSaldoBajo(nuevoSaldo);
  }

  return NextResponse.json({ movimiento, nuevoSaldo }, { status: 201 });
}
