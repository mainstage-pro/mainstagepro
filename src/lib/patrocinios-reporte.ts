/**
 * Reporte de patrocinios: cuánto se regaló, en qué modalidad y cuánto dinero
 * puso la casa, por mes y por año.
 *
 * Tres números por evento:
 *  - valorPatrocinado: lo que habría costado a precio de lista menos lo cobrado
 *    (cotizacion.montoPatrocinio, sin IVA).
 *  - costoAbsorbido: el dinero que de verdad salió. Costo real del proyecto
 *    (finanzas-proyecto.ts, fuente única) menos lo que pagó el cliente (base sin
 *    IVA). Si aún no hay proyecto, se usa la viabilidad de la cotización.
 *  - valorRecibido: lo que llegó en especie (solo intercambio).
 *
 * Cuenta como "dado" solo lo confirmado: aprobada, evento confirmado o con proyecto.
 * Lo demás aparece aparte como "en propuesta".
 */
import { prisma } from "@/lib/prisma";
import { calcularFinanzasProyecto } from "@/lib/finanzas-proyecto";
import type { ModalidadPatrocinio } from "@/lib/patrocinio";

export type PatrocinioFila = {
  cotizacionId: string;
  numeroCotizacion: string;
  evento: string;
  cliente: string;
  fechaEvento: string | null;
  mes: number | null; // 0-11
  estado: string;
  confirmado: boolean;
  modalidad: ModalidadPatrocinio;
  contraprestacion: string | null;
  valorPatrocinado: number;
  cobrado: number; // base sin IVA que paga el cliente
  costoReal: number;
  costoAbsorbido: number;
  costoEsEstimado: boolean;
  valorRecibido: number;
  proyectoId: string | null;
};

export type PatrocinioTotales = {
  eventos: number;
  valorPatrocinado: number;
  costoAbsorbido: number;
  valorRecibido: number;
  cobrado: number;
};

const vacio = (): PatrocinioTotales => ({ eventos: 0, valorPatrocinado: 0, costoAbsorbido: 0, valorRecibido: 0, cobrado: 0 });

function sumar(t: PatrocinioTotales, f: PatrocinioFila) {
  t.eventos += 1;
  t.valorPatrocinado += f.valorPatrocinado;
  t.costoAbsorbido += f.costoAbsorbido;
  t.valorRecibido += f.valorRecibido;
  t.cobrado += f.cobrado;
}

export async function reportePatrocinios(anio: number) {
  const desde = new Date(Date.UTC(anio, 0, 1));
  const hasta = new Date(Date.UTC(anio + 1, 0, 1));

  const cots = await prisma.cotizacion.findMany({
    where: {
      naturaleza: "PATROCINIO",
      estado: { notIn: ["RECHAZADA", "VENCIDA"] },
      fechaEvento: { gte: desde, lt: hasta },
    },
    orderBy: { fechaEvento: "asc" },
    select: {
      id: true, numeroCotizacion: true, nombreEvento: true, nombreCotizacion: true, estado: true,
      eventoConfirmado: true, fechaEvento: true,
      patrocinioModalidad: true, patrocinioContraprestacion: true, patrocinioValorRecibido: true,
      montoPatrocinio: true, total: true, granTotal: true, aplicaIva: true, costosTotalesEstimados: true,
      subtotalOperacion: true, subtotalTerceros: true, subtotalComidas: true, subtotalTransporte: true, subtotalHospedaje: true,
      cliente: { select: { nombre: true } },
      proyecto: {
        select: {
          id: true,
          personal: { select: { tarifaAcordada: true, estadoPago: true, tecnico: { select: { id: true } } } },
          cuentasPagar: {
            select: {
              id: true, monto: true, montoPagado: true, montoCompensado: true, tipoAcreedor: true, tecnicoId: true,
              esNomina: true, esDeuda: true, esReparto: true, gastoRecurrenteId: true,
            },
          },
          proveedoresEvento: { select: { proveedorId: true, costoAcordado: true, cuentaPagarId: true } },
          equipos: { select: { tipo: true, proveedorId: true, cantidad: true, dias: true, costoExterno: true } },
          gastosOperativos: { select: { monto: true, entregado: true, autorizadoEn: true } },
          movimientos: {
            where: { tipo: "GASTO" },
            select: {
              monto: true,
              cuentaPagar: { select: { id: true } },
              proyectoPersonal: { select: { id: true } },
              abonoPago: { select: { id: true } },
              pagoNomina: { select: { id: true } },
            },
          },
          cuentasCobrar: { select: { montoCobrado: true } },
        },
      },
    },
  });

  const filas: PatrocinioFila[] = cots.map((c) => {
    const p = c.proyecto;
    const cobrado = c.total ?? 0;
    let costoReal: number;
    let costoEsEstimado = false;
    if (p) {
      const fin = calcularFinanzasProyecto({
        cotizacion: c,
        personal: p.personal,
        cuentasPagar: p.cuentasPagar.map((x) => ({ ...x, montoCompensado: Number(x.montoCompensado ?? 0) })),
        proveedoresEvento: p.proveedoresEvento,
        equipos: p.equipos,
        viaticos: p.gastosOperativos,
        movimientos: p.movimientos.map((m) => ({
          monto: m.monto,
          ligado: !!(m.cuentaPagar || m.proyectoPersonal || m.abonoPago || m.pagoNomina),
        })),
        cuentasCobrar: p.cuentasCobrar,
      });
      // Real si ya hay compromisos; si el proyecto aún no carga costos, el presupuesto.
      costoReal = fin.costos.real > 0 ? fin.costos.real : fin.costos.presupuesto;
      costoEsEstimado = fin.costos.real <= 0;
    } else {
      costoReal = c.costosTotalesEstimados ?? 0;
      costoEsEstimado = true;
    }
    const confirmado = c.estado === "APROBADA" || c.eventoConfirmado || !!p;
    return {
      cotizacionId: c.id,
      numeroCotizacion: c.numeroCotizacion,
      evento: c.nombreEvento || c.nombreCotizacion || c.numeroCotizacion,
      cliente: c.cliente?.nombre ?? "—",
      fechaEvento: c.fechaEvento ? c.fechaEvento.toISOString().slice(0, 10) : null,
      mes: c.fechaEvento ? c.fechaEvento.getUTCMonth() : null,
      estado: c.estado,
      confirmado,
      modalidad: c.patrocinioModalidad as ModalidadPatrocinio,
      contraprestacion: c.patrocinioContraprestacion,
      valorPatrocinado: c.montoPatrocinio ?? 0,
      cobrado,
      costoReal,
      costoAbsorbido: Math.max(0, costoReal - cobrado),
      costoEsEstimado,
      valorRecibido: c.patrocinioValorRecibido ?? 0,
      proyectoId: p?.id ?? null,
    };
  });

  const confirmadas = filas.filter((f) => f.confirmado);
  const total = vacio();
  const porMes = Array.from({ length: 12 }, vacio);
  const porModalidad: Record<ModalidadPatrocinio, PatrocinioTotales> = {
    TOTAL: vacio(),
    COSTO_OPERATIVO: vacio(),
    INTERCAMBIO: vacio(),
  };
  for (const f of confirmadas) {
    sumar(total, f);
    if (f.mes !== null) sumar(porMes[f.mes], f);
    if (porModalidad[f.modalidad]) sumar(porModalidad[f.modalidad], f);
  }

  return {
    anio,
    total,
    porMes,
    porModalidad,
    confirmadas,
    enPropuesta: filas.filter((f) => !f.confirmado),
  };
}
