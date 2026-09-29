import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  cicloVigente,
  rangoDelCiclo,
  repartirDesembolsos,
  saldoDeCuentaPagar,
  type EstadoGasto,
  type OrigenGasto,
} from "@/lib/pagos-proveedor";
import {
  datosBancarios,
  SELECT_BANCARIOS_PERSONAL,
  SELECT_BANCARIOS_PROVEEDOR,
  SELECT_BANCARIOS_TECNICO,
  type DatosBancarios,
} from "@/lib/datos-bancarios";

// Lo que el módulo considera una deuda a proveedor: todo lo que el proyecto
// debe fuera de su nómina. Las CxP de deuda, reparto y nómina interna tienen sus
// propios flujos y no se tocan desde aquí.
const SOLO_PROVEEDORES = {
  tipoAcreedor: { not: "TECNICO" },
  esNomina: false,
  esDeuda: false,
  esReparto: false,
  gastoRecurrenteId: null,
} as const;

interface GastoProveedor {
  id: string;
  origen: OrigenGasto;
  proveedorEventoId: string | null;
  cuentaPagarId: string | null;
  acreedorKey: string;
  acreedorId: string | null;
  acreedorNombre: string;
  tipoAcreedor: string;
  datosBancarios: DatosBancarios | null;
  concepto: string;
  unidades: number | null;
  monto: number;
  saldo: number;
  estado: EstadoGasto;
  solicitadoPor: string | null;
  fechaSolicitud: string | null;
}

function estadoDeCxP(estado: string): EstadoGasto {
  if (estado === "LIQUIDADO") return "PAGADO";
  if (estado === "PARCIAL") return "PARCIAL";
  return "PENDIENTE";
}

// GET /api/pagos-proveedores?ciclo=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cicloStr = req.nextUrl.searchParams.get("ciclo");
  const cicloDate = cicloStr ? new Date(cicloStr + "T12:00:00Z") : cicloVigente();
  const { desde, hasta } = rangoDelCiclo(cicloDate);

  const proyectos = await prisma.proyecto.findMany({
    where: {
      fechaEvento: { gte: desde, lte: hasta },
      OR: [{ proveedoresEvento: { some: {} } }, { cuentasPagar: { some: SOLO_PROVEEDORES } }],
    },
    select: {
      id: true,
      nombre: true,
      numeroProyecto: true,
      fechaEvento: true,
      cliente: { select: { nombre: true } },
      cotizacion: { select: { subtotalTerceros: true } },
      proveedoresEvento: {
        orderBy: [{ imprevisto: "asc" }, { createdAt: "asc" }],
        select: {
          id: true, nombreProveedor: true, servicioEquipo: true, tipoAcreedor: true,
          proveedorId: true, tecnicoId: true, personalId: true, costoAcordado: true,
          unidades: true, imprevisto: true, solicitadoPor: true, fechaSolicitud: true,
          proveedor: { select: SELECT_BANCARIOS_PROVEEDOR },
          tecnico: { select: SELECT_BANCARIOS_TECNICO },
          personal: { select: SELECT_BANCARIOS_PERSONAL },
          cuentaPagar: {
            select: { id: true, estado: true, monto: true, montoPagado: true, montoCompensado: true },
          },
        },
      },
      cuentasPagar: {
        where: SOLO_PROVEEDORES,
        orderBy: { fechaCompromiso: "asc" },
        select: {
          id: true, concepto: true, monto: true, montoPagado: true, montoCompensado: true,
          estado: true, tipoAcreedor: true,
          proveedor: { select: { id: true, nombre: true, empresa: true, ...SELECT_BANCARIOS_PROVEEDOR } },
          tecnico: { select: { id: true, nombre: true, ...SELECT_BANCARIOS_TECNICO } },
          proveedorEvento: { select: { id: true } },
        },
      },
    },
    orderBy: { fechaEvento: "asc" },
  });

  const proyectosData = proyectos.map((p) => {
    const gastos: GastoProveedor[] = [];

    for (const pe of p.proveedoresEvento) {
      const acreedorId = pe.proveedorId ?? pe.tecnicoId ?? pe.personalId;
      // Sin catálogo todavía: cada renglón vale por sí mismo para no mezclar a
      // dos proveedores que casualmente se llamen igual.
      const acreedorKey = acreedorId ? `${pe.tipoAcreedor}:${acreedorId}` : `SUELTO:${pe.id}`;
      const cxp = pe.cuentaPagar;
      const monto = cxp?.monto ?? pe.costoAcordado ?? 0;
      gastos.push({
        id: `pe:${pe.id}`,
        origen: pe.imprevisto ? "IMPREVISTO" : "COORDINADO",
        proveedorEventoId: pe.id,
        cuentaPagarId: cxp?.id ?? null,
        acreedorKey,
        acreedorId: acreedorId ?? null,
        acreedorNombre: pe.nombreProveedor,
        tipoAcreedor: pe.tipoAcreedor,
        datosBancarios: datosBancarios(pe.proveedor ?? pe.tecnico ?? pe.personal),
        concepto: pe.servicioEquipo?.trim() || "Servicio del evento",
        unidades: pe.unidades,
        monto,
        saldo: cxp ? saldoDeCuentaPagar(cxp) : monto,
        estado: cxp ? estadoDeCxP(cxp.estado) : "SIN_CXP",
        solicitadoPor: pe.solicitadoPor,
        fechaSolicitud: pe.fechaSolicitud?.toISOString().slice(0, 10) ?? null,
      });
    }

    // Las CxP que no nacieron de un renglón de proveedor: gastos capturados a
    // mano en la pestaña de finanzas del proyecto.
    for (const c of p.cuentasPagar) {
      if (c.proveedorEvento) continue;
      const acreedor = c.proveedor ?? c.tecnico;
      const acreedorId = c.proveedor?.id ?? c.tecnico?.id;
      const nombre = c.proveedor
        ? c.proveedor.empresa || c.proveedor.nombre
        : c.tecnico?.nombre ?? "Sin acreedor";
      gastos.push({
        id: `cxp:${c.id}`,
        origen: "DIRECTO",
        proveedorEventoId: null,
        cuentaPagarId: c.id,
        acreedorKey: acreedorId ? `${c.tipoAcreedor}:${acreedorId}` : `SUELTO:${c.id}`,
        acreedorId: acreedorId ?? null,
        acreedorNombre: acreedor ? nombre : "Sin acreedor",
        tipoAcreedor: c.tipoAcreedor,
        datosBancarios: datosBancarios(c.proveedor ?? c.tecnico),
        concepto: c.concepto,
        unidades: null,
        monto: c.monto,
        saldo: saldoDeCuentaPagar(c),
        estado: estadoDeCxP(c.estado),
        solicitadoPor: null,
        fechaSolicitud: null,
      });
    }

    return {
      id: p.id,
      nombre: p.nombre,
      numeroProyecto: p.numeroProyecto,
      cliente: p.cliente?.nombre ?? "",
      fechaEvento: p.fechaEvento?.toISOString().slice(0, 10) ?? "",
      presupuestoTerceros: p.cotizacion?.subtotalTerceros ?? 0,
      gastos,
    };
  });

  // ── Cartera de la semana: qué se le debe a cada acreedor ───────────────────
  const carteraMap = new Map<
    string,
    {
      key: string;
      nombre: string;
      tipoAcreedor: string;
      acreedorId: string | null;
      datosBancarios: DatosBancarios | null;
      deudas: {
        proyectoId: string; proyectoNombre: string; cuentaPagarId: string;
        concepto: string; monto: number; saldo: number; estado: EstadoGasto;
      }[];
      sinCxP: {
        proyectoId: string; proyectoNombre: string; proveedorEventoId: string;
        concepto: string; monto: number;
      }[];
    }
  >();

  for (const p of proyectosData) {
    for (const g of p.gastos) {
      if (!carteraMap.has(g.acreedorKey)) {
        carteraMap.set(g.acreedorKey, {
          key: g.acreedorKey,
          nombre: g.acreedorNombre,
          tipoAcreedor: g.tipoAcreedor,
          acreedorId: g.acreedorId,
          datosBancarios: g.datosBancarios,
          deudas: [],
          sinCxP: [],
        });
      }
      const entry = carteraMap.get(g.acreedorKey)!;
      // El mismo acreedor puede llegar por varios renglones; basta con que uno
      // traiga los datos del catálogo.
      if (!entry.datosBancarios && g.datosBancarios) entry.datosBancarios = g.datosBancarios;
      if (g.cuentaPagarId) {
        entry.deudas.push({
          proyectoId: p.id,
          proyectoNombre: p.nombre,
          cuentaPagarId: g.cuentaPagarId,
          concepto: g.concepto,
          monto: g.monto,
          saldo: g.saldo,
          estado: g.estado,
        });
      } else if (g.monto > 0) {
        entry.sinCxP.push({
          proyectoId: p.id,
          proyectoNombre: p.nombre,
          proveedorEventoId: g.proveedorEventoId!,
          concepto: g.concepto,
          monto: g.monto,
        });
      }
    }
  }

  const cartera = Array.from(carteraMap.values())
    .map((c) => ({
      ...c,
      porPagar: Math.round(c.deudas.reduce((s, d) => s + (d.estado === "PAGADO" ? 0 : d.saldo), 0) * 100) / 100,
      porFormalizar: Math.round(c.sinCxP.reduce((s, d) => s + d.monto, 0) * 100) / 100,
      todoPagado: c.deudas.every((d) => d.estado === "PAGADO") && c.sinCxP.length === 0,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const cuentas = await prisma.cuentaBancaria.findMany({
    select: { id: true, nombre: true, banco: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({
    ciclo: cicloDate.toISOString().slice(0, 10),
    desde: desde.toISOString().slice(0, 10),
    hasta: hasta.toISOString().slice(0, 10),
    proyectos: proyectosData,
    cartera,
    cuentas,
  });
}

interface EntradaPago {
  monto: number;
  metodoPago?: string;
  cuentaOrigenId?: string | null;
  referencia?: string | null;
}

// POST /api/pagos-proveedores — registrar el pago de una o varias CxP
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = (await req.json()) as {
    cuentasPagarIds?: string[];
    fecha?: string;
    notas?: string | null;
    entradas?: EntradaPago[];
  };

  const ids = body.cuentasPagarIds ?? [];
  if (!ids.length) {
    return NextResponse.json({ error: "Selecciona al menos una cuenta por pagar" }, { status: 400 });
  }

  const entradas = (body.entradas ?? []).filter((e) => e.monto > 0);
  if (!entradas.length) {
    return NextResponse.json({ error: "Captura al menos un pago con monto mayor a cero" }, { status: 400 });
  }

  // El módulo no liquida nómina, deudas ni repartos: cada uno tiene su flujo.
  const validas = await prisma.cuentaPagar.count({ where: { id: { in: ids }, ...SOLO_PROVEEDORES } });
  if (validas !== ids.length) {
    return NextResponse.json(
      { error: "Alguna de las cuentas no es un gasto a proveedor y no se puede pagar desde aquí" },
      { status: 400 },
    );
  }

  const fecha = body.fecha ? new Date(body.fecha + "T12:00:00Z") : new Date();
  // Si el pago se dividió entre métodos, queda anotado para que en el ledger se
  // entienda por qué hay varios movimientos del mismo día al mismo acreedor.
  const notas =
    entradas.length > 1
      ? [body.notas, `Pago dividido: ${entradas.map((e) => `$${e.monto.toLocaleString()} ${e.metodoPago ?? "TRANSFERENCIA"}`).join(", ")}`]
          .filter(Boolean)
          .join(" · ")
      : body.notas || null;

  const aplicaciones = await prisma.$transaction((tx) =>
    repartirDesembolsos(
      tx,
      ids,
      entradas.map((e) => ({
        monto: e.monto,
        fecha,
        metodoPago: e.metodoPago,
        cuentaOrigenId: e.cuentaOrigenId ?? null,
        referencia: e.referencia ?? null,
        notas,
        creadoPor: session.id,
      })),
    ),
  );

  const totalPagado = Math.round(aplicaciones.reduce((s, a) => s + a.monto, 0) * 100) / 100;
  return NextResponse.json({ ok: true, aplicaciones, totalPagado });
}
