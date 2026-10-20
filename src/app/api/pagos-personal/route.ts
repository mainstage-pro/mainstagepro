import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { marcarFilaNominaPagada, getCategoriaPersonalFreelance } from "@/lib/nomina-pagos";
import { datosBancarios, SELECT_BANCARIOS_TECNICO, type DatosBancarios } from "@/lib/datos-bancarios";
import { desgloseBonos, SELECT_BONOS, totalPagoPersonal } from "@/lib/pago-personal";

// Calculates the Wednesday of the cycle that contains a given event date
function cicloDesde(cicloDate: Date): { desde: Date; hasta: Date } {
  const ciclo = new Date(cicloDate);
  ciclo.setHours(12, 0, 0, 0);
  const desde = new Date(ciclo);
  desde.setDate(desde.getDate() - 7);
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(ciclo);
  hasta.setDate(hasta.getDate() - 1);
  hasta.setHours(23, 59, 59, 999);
  return { desde, hasta };
}

// GET /api/pagos-personal?ciclo=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cicloStr = req.nextUrl.searchParams.get("ciclo");
  const cicloDate = cicloStr
    ? new Date(cicloStr + "T12:00:00Z")
    : (() => {
        const d = new Date();
        const dow = d.getDay();
        d.setDate(d.getDate() + (dow <= 3 ? 3 - dow : 10 - dow));
        return d;
      })();

  const { desde, hasta } = cicloDesde(cicloDate);

  const proyectos = await prisma.proyecto.findMany({
    where: { fechaEvento: { gte: desde, lte: hasta }, personal: { some: {} } },
    include: {
      cliente: { select: { nombre: true } },
      cotizacion: { select: { subtotalOperacion: true } },
      personal: {
        include: {
          tecnico: { select: { id: true, nombre: true, ...SELECT_BANCARIOS_TECNICO } },
          rolTecnico: { select: { nombre: true } },
          movimiento: { select: { id: true, monto: true } },
        },
        orderBy: [{ participacion: "asc" }, { fechaJornada: "asc" }, { id: "asc" }],
      },
    },
    orderBy: { fechaEvento: "asc" },
  });

  // Build per-project data
  const proyectosData = proyectos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    cliente: p.cliente?.nombre ?? "",
    fechaEvento: p.fechaEvento?.toISOString().slice(0, 10) ?? "",
    presupuestoOp: p.cotizacion?.subtotalOperacion ?? 0,
    personal: p.personal.map((pp) => {
      const pagoTotal = totalPagoPersonal(pp);
      const tarifaTotal = pagoTotal ?? 0;
      const esPagado = pp.estadoPago === "PAGADO";
      const esParcial = pp.estadoPago === "PARCIAL";

      const montoPagado = esPagado
        ? tarifaTotal
        : (pp.movimiento?.monto ?? 0);
      const montoPendiente = esPagado
        ? 0
        : Math.max(0, tarifaTotal - montoPagado);

      let estadoEfectivo = pp.estadoPago;
      if (tarifaTotal > 0) {
        if (esPagado || montoPendiente <= 0.01) {
          estadoEfectivo = "PAGADO";
        } else if (esParcial || montoPagado > 0.01) {
          estadoEfectivo = "PARCIAL";
        } else {
          estadoEfectivo = "PENDIENTE";
        }
      }

      return {
        id: pp.id,
        tecnicoId: pp.tecnicoId,
        tecnicoNombre: pp.tecnico?.nombre ?? null,
        rolTecnicoId: pp.rolTecnicoId,
        rolNombre: pp.rolTecnico?.nombre ?? null,
        participacion: pp.participacion,
        fechaJornada: pp.fechaJornada,
        nivel: pp.nivel,
        jornada: pp.jornada,
        tarifaAcordada: pp.tarifaAcordada,
        bonos: desgloseBonos(pp),
        pagoTotal,
        montoPagado,
        montoPendiente,
        estadoPago: estadoEfectivo,
        notas: pp.notas,
      };
    }),
  }));

  // Build nomina: aggregate by technician across all projects
  const tecMap = new Map<
    string,
    {
      tecnicoId: string;
      tecnicoNombre: string;
      datosBancarios: DatosBancarios | null;
      pagos: {
        proyectoId: string;
        proyectoNombre: string;
        monto: number;
        totalTarifa: number;
        montoPagado: number;
        montoPendiente: number;
        estadoPago: string;
      }[];
    }
  >();

  for (const p of proyectos) {
    for (const pp of p.personal) {
      const pagoPP = totalPagoPersonal(pp);
      if (!pp.tecnicoId || !pp.tecnico || pagoPP == null) continue;
      const key = pp.tecnicoId;
      if (!tecMap.has(key)) {
        tecMap.set(key, {
          tecnicoId: pp.tecnicoId,
          tecnicoNombre: pp.tecnico.nombre,
          datosBancarios: datosBancarios(pp.tecnico),
          pagos: [],
        });
      }
      const entry = tecMap.get(key)!;
      const tarifaSlot = pagoPP;
      const esPagadoSlot = pp.estadoPago === "PAGADO";
      const pagadoSlot = esPagadoSlot ? tarifaSlot : (pp.movimiento?.monto ?? 0);
      const pendienteSlot = esPagadoSlot ? 0 : Math.max(0, tarifaSlot - pagadoSlot);

      const existing = entry.pagos.find((x) => x.proyectoId === p.id);
      if (existing) {
        existing.totalTarifa += tarifaSlot;
        existing.montoPagado += pagadoSlot;
        existing.montoPendiente += pendienteSlot;
        existing.monto = existing.montoPendiente > 0 ? existing.montoPendiente : existing.totalTarifa;
        existing.estadoPago = existing.montoPendiente <= 0.01 ? "PAGADO" : existing.montoPagado > 0.01 ? "PARCIAL" : "PENDIENTE";
      } else {
        const estadoEfectivo = pendienteSlot <= 0.01 ? "PAGADO" : pagadoSlot > 0.01 ? "PARCIAL" : "PENDIENTE";
        entry.pagos.push({
          proyectoId: p.id,
          proyectoNombre: p.nombre,
          monto: pendienteSlot > 0 ? pendienteSlot : tarifaSlot,
          totalTarifa: tarifaSlot,
          montoPagado: pagadoSlot,
          montoPendiente: pendienteSlot,
          estadoPago: estadoEfectivo,
        });
      }
    }
  }

  const nomina = Array.from(tecMap.values())
    .map((t) => ({
      ...t,
      total: t.pagos.reduce((s, x) => s + x.montoPendiente, 0),
      todosPagados: t.pagos.every((x) => x.estadoPago === "PAGADO"),
    }))
    .sort((a, b) => a.tecnicoNombre.localeCompare(b.tecnicoNombre));

  // Cuentas bancarias para el modal
  const roles = await prisma.rolTecnico.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });

  const tecnicos = await prisma.tecnico.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });

  const cuentas = await prisma.cuentaBancaria.findMany({
    select: { id: true, nombre: true, banco: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({
    ciclo: cicloDate.toISOString().slice(0, 10),
    desde: desde.toISOString().slice(0, 10),
    hasta: hasta.toISOString().slice(0, 10),
    proyectos: proyectosData,
    nomina,
    cuentas,
    roles,
    tecnicos,
  });
}

interface PagoEntrada {
  monto: number;
  metodoPago: string;
  cuentaOrigenId?: string | null;
  referencia?: string | null;
}

// POST /api/pagos-personal — register technician payment(s)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const {
    tecnicoId,
    proyectoIds,
    fecha,
    notas,
    // Multi-entry format
    entradas,
    totalOwed: totalOwedFromClient,
    // Legacy single-entry fields (backward compat)
    cuentaOrigenId,
    metodoPago = "TRANSFERENCIA",
    referencia,
  } = body as {
    tecnicoId: string;
    proyectoIds: string[];
    fecha?: string;
    notas?: string;
    entradas?: PagoEntrada[];
    totalOwed?: number;
    cuentaOrigenId?: string;
    metodoPago?: string;
    referencia?: string;
  };

  if (!tecnicoId || !proyectoIds?.length) {
    return NextResponse.json({ error: "tecnicoId y proyectoIds requeridos" }, { status: 400 });
  }

  const tecnico = await prisma.tecnico.findUnique({
    where: { id: tecnicoId },
    select: { nombre: true },
  });

  const fechaPago = fecha ? new Date(fecha + "T12:00:00Z") : new Date();

  // Filas de nómina pendientes o con saldo parcial del técnico en estos proyectos
  const todasFilas = await prisma.proyectoPersonal.findMany({
    where: {
      tecnicoId,
      proyectoId: { in: proyectoIds },
    },
    include: {
      movimiento: { select: { id: true, monto: true } },
      tecnico: { select: { nombre: true } },
      rolTecnico: { select: { nombre: true } },
      proyecto: { select: { nombre: true } },
    },
  });

  const filasPendientes = todasFilas.filter((f) => {
    if (f.estadoPago === "PENDIENTE" || f.estadoPago === "PARCIAL") return true;
    const total = totalPagoPersonal(f) ?? 0;
    const pagado = f.movimiento?.monto ?? 0;
    return total > pagado + 0.01;
  });

  // Total adeudado real: tarifa total menos lo ya cubierto por movimientos
  const filasTotal = filasPendientes.reduce((s, f) => {
    const total = totalPagoPersonal(f) ?? 0;
    const pagado = f.movimiento?.monto ?? 0;
    return s + Math.max(0, total - pagado);
  }, 0);
  const totalOwed = totalOwedFromClient ?? filasTotal;

  // ── Determinar método/cuenta/referencia "primario" y total pagado ──────────
  const validEntradas = (entradas ?? []).filter((e) => e.monto > 0);
  let metodoPrimario = metodoPago;
  let cuentaPrimaria: string | null = cuentaOrigenId || null;
  let refPrimaria: string | null = referencia || null;
  let notasPago: string | null = notas || null;
  let totalPagado = totalOwed;

  if (entradas && entradas.length > 0) {
    if (!validEntradas.length) {
      return NextResponse.json({ error: "Al menos una entrada con monto > 0 es requerida" }, { status: 400 });
    }
    totalPagado = validEntradas.reduce((s, e) => s + e.monto, 0);
    // Método dominante = el de mayor monto
    const dominante = [...validEntradas].sort((a, b) => b.monto - a.monto)[0];
    metodoPrimario = dominante.metodoPago || "TRANSFERENCIA";
    cuentaPrimaria = dominante.cuentaOrigenId || null;
    refPrimaria = dominante.referencia || null;
    // Si el pago se dividió en varios métodos, dejarlo anotado en el movimiento
    if (validEntradas.length > 1) {
      const detalle = validEntradas.map((e) => `$${e.monto.toLocaleString()} ${e.metodoPago}`).join(", ");
      notasPago = [notas, `Pago dividido: ${detalle}`].filter(Boolean).join(" · ");
    }
  }

  const fullyPaid = totalOwed > 0 ? totalPagado >= totalOwed - 0.01 : true;

  if (fullyPaid) {
    // ── Pago completo: distribuir las entradas sobre las filas de nómina ─────
    const movIds: string[] = [];
    
    // Configurar distribución
    let entradaIdx = 0;
    let entradaRestante = validEntradas.length > 0 ? validEntradas[0].monto : totalOwed;
    const entradasADistribuir = validEntradas.length > 0 ? validEntradas : [{ monto: totalOwed, metodoPago: metodoPrimario, cuentaOrigenId: cuentaPrimaria, referencia: refPrimaria }];

    await prisma.$transaction(async (tx) => {
      const categoriaFreelanceId = await getCategoriaPersonalFreelance(tx);

      for (const fila of filasPendientes) {
        const tarifaTotalFila = totalPagoPersonal(fila) ?? 0;
        const yaPagadoFila = fila.movimiento?.monto ?? 0;
        let filaMontoPendiente = Math.max(0, tarifaTotalFila - yaPagadoFila);

        // Si la fila no tiene monto pendiente, aseguramos su estado
        if (filaMontoPendiente <= 0.01) {
          if (!fila.movimientoId) {
            const movId = await marcarFilaNominaPagada(tx, fila.id, {
              fecha: fechaPago,
              metodoPago: entradasADistribuir[0].metodoPago,
              cuentaOrigenId: entradasADistribuir[0].cuentaOrigenId || null,
              referencia: entradasADistribuir[0].referencia || null,
              notas: notasPago,
              creadoPor: session.id,
              overrideMonto: 0,
            });
            if (movId) movIds.push(movId);
          } else {
            await tx.proyectoPersonal.update({
              where: { id: fila.id },
              data: { estadoPago: "PAGADO" },
            });
          }
          continue;
        }

        // Mientras la fila necesite fondos y haya entradas disponibles
        while (filaMontoPendiente > 0.01 && entradaIdx < entradasADistribuir.length) {
          const entradaActual = entradasADistribuir[entradaIdx];
          const montoAUsar = Math.min(filaMontoPendiente, entradaRestante);

          if (montoAUsar > 0.01) {
            if (!fila.movimientoId) {
              // El primer pago se vincula directamente a la fila
              const movId = await marcarFilaNominaPagada(tx, fila.id, {
                fecha: fechaPago,
                metodoPago: entradaActual.metodoPago,
                cuentaOrigenId: entradaActual.cuentaOrigenId || null,
                referencia: entradaActual.referencia || null,
                notas: notasPago,
                creadoPor: session.id,
                overrideMonto: montoAUsar,
              });
              if (movId) movIds.push(movId);
            } else {
              // Complemento de pago (cuando la fila ya tenía un pago inicial registrado)
              const tecNombre = fila.tecnico?.nombre ?? tecnico?.nombre ?? "Técnico";
              const rolNombre = fila.rolEnEvento ?? fila.rolTecnico?.nombre ?? "Puesto";
              const concepto = `Nómina — ${tecNombre} · ${rolNombre} (Complemento) | ${fila.proyecto?.nombre ?? "Proyecto"}`;
              const mov = await tx.movimientoFinanciero.create({
                data: {
                  tipo: "GASTO",
                  fecha: fechaPago,
                  concepto,
                  monto: montoAUsar,
                  metodoPago: entradaActual.metodoPago,
                  cuentaOrigenId: entradaActual.cuentaOrigenId || null,
                  referencia: entradaActual.referencia || null,
                  notas: notasPago,
                  proyectoId: fila.proyectoId,
                  categoriaId: categoriaFreelanceId,
                  creadoPor: session.id,
                },
              });
              movIds.push(mov.id);

              // Actualizar CxP si existe
              const cxp = await tx.cuentaPagar.findFirst({
                where: {
                  tecnicoId: fila.tecnicoId,
                  proyectoId: fila.proyectoId,
                  tipoAcreedor: "TECNICO",
                },
                orderBy: { createdAt: "desc" },
              });
              if (cxp) {
                const nuevoPagado = (cxp.montoPagado ?? 0) + montoAUsar;
                const nuevoEstado = nuevoPagado >= cxp.monto - 0.01 ? "LIQUIDADO" : "PARCIAL";
                await tx.cuentaPagar.update({
                  where: { id: cxp.id },
                  data: {
                    montoPagado: nuevoPagado,
                    estado: nuevoEstado,
                    fechaPagoReal: fechaPago,
                  },
                });
              }
            }

            filaMontoPendiente -= montoAUsar;
            entradaRestante -= montoAUsar;

            // Actualizar estado de la fila según saldo restante
            const nuevoEstado = filaMontoPendiente <= 0.01 ? "PAGADO" : "PARCIAL";
            await tx.proyectoPersonal.update({
              where: { id: fila.id },
              data: { estadoPago: nuevoEstado },
            });

            if (entradaRestante < 0.01) {
              entradaIdx++;
              if (entradaIdx < entradasADistribuir.length) {
                entradaRestante = entradasADistribuir[entradaIdx].monto;
              }
            }
          }
        }
      }
    });
    return NextResponse.json({ ok: true, movimientosCreados: movIds.length, totalPagado, fullyPaid: true });
  }

  // ── Pago parcial: registrar el desembolso sin marcar filas ni liquidar CxP ─
  const movIds: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const entrada of validEntradas) {
      const mov = await tx.movimientoFinanciero.create({
        data: {
          tipo: "GASTO",
          fecha: fechaPago,
          concepto: `Nómina parcial — ${tecnico?.nombre ?? tecnicoId}`,
          monto: entrada.monto,
          metodoPago: entrada.metodoPago || "TRANSFERENCIA",
          cuentaOrigenId: entrada.cuentaOrigenId || null,
          referencia: entrada.referencia || null,
          notas: notas || null,
          proyectoId: proyectoIds[0],
          creadoPor: session.id,
        },
      });
      movIds.push(mov.id);
    }
  });
  return NextResponse.json({ ok: true, movimientosCreados: movIds.length, totalPagado, fullyPaid: false });
}
