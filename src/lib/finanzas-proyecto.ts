/**
 * Las finanzas de un evento, en un solo juego de números.
 *
 * La pestaña tenía cuatro maneras de sumar "el costo" —la viabilidad de la
 * cotización, el estado de resultados, el bloque de gastos y el cierre— y
 * ninguna daba lo mismo: la viabilidad ignoraba a los terceros, el estado de
 * resultados dejaba al personal fuera del total, el costo de los equipos
 * externos se contaba dos veces (una en el rider y otra en el renglón del
 * proveedor que nace de ese mismo rider) y las comidas no aparecían en ningún
 * lado. Aquí se calcula una sola vez, por categorías, y todo lo demás lo lee.
 *
 * La regla es el compromiso, no el pago: un costo cuenta desde que se contrae
 * (el puesto tiene tarifa, el proveedor tiene trato, el viático está en la
 * lista), y el pago es su estado. Así la utilidad no mejora sola por no haber
 * pagado todavía.
 */

export const UMBRALES_MARGEN = { IDEAL: 0.55, REGULAR: 0.4, MINIMO: 0.25 } as const;

export type Semaforo = "IDEAL" | "REGULAR" | "MINIMO" | "RIESGO";

export function semaforoDeMargen(pct: number): Semaforo {
  if (pct >= UMBRALES_MARGEN.IDEAL) return "IDEAL";
  if (pct >= UMBRALES_MARGEN.REGULAR) return "REGULAR";
  if (pct >= UMBRALES_MARGEN.MINIMO) return "MINIMO";
  return "RIESGO";
}

export const CATEGORIAS_COSTO = ["PERSONAL", "PROVEEDORES", "VIATICOS", "OTROS"] as const;
export type CategoriaCosto = (typeof CATEGORIAS_COSTO)[number];

export const ETIQUETA_CATEGORIA: Record<CategoriaCosto, string> = {
  PERSONAL: "Personal técnico",
  PROVEEDORES: "Proveedores y equipo externo",
  VIATICOS: "Comidas y viáticos",
  OTROS: "Otros gastos",
};

/** Ancla de la sección que detalla cada categoría dentro de la pestaña. */
export const ANCLA_CATEGORIA: Record<CategoriaCosto, string> = {
  PERSONAL: "fin-personal",
  PROVEEDORES: "fin-proveedores",
  VIATICOS: "fin-viaticos",
  OTROS: "fin-otros",
};

export type RenglonCosto = {
  clave: CategoriaCosto;
  etiqueta: string;
  /** Lo que la cotización previó para esta categoría. */
  presupuesto: number;
  /** Lo que el proyecto ya comprometió. */
  real: number;
  /** De lo comprometido, lo que ya salió de caja. */
  pagado: number;
  porPagar: number;
  /** Cuántos renglones hay detrás del número. */
  conceptos: number;
};

export type FinanzasProyecto = {
  ingreso: {
    /** Lo que se le factura al cliente, con IVA si aplica. */
    facturado: number;
    /** Ingreso real de la casa: el IVA no es nuestro. Es la base de la utilidad. */
    base: number;
    iva: number;
    cobrado: number;
    porCobrar: number;
  };
  costos: {
    renglones: RenglonCosto[];
    presupuesto: number;
    real: number;
    pagado: number;
    porPagar: number;
  };
  utilidad: {
    estimada: number;
    real: number;
    margenEstimado: number;
    margenReal: number;
    semaforo: Semaforo;
    /** Real menos presupuesto: positivo = el evento salió más caro de lo previsto. */
    desviacion: number;
  };
  /** Lo que falta capturar para que los números sean confiables. */
  avisos: string[];
  hayCotizacion: boolean;
};

// ── Entradas ────────────────────────────────────────────────────────────────

type CotizacionIn = {
  granTotal: number;
  total?: number | null;
  aplicaIva?: boolean | null;
  subtotalOperacion: number;
  subtotalTerceros: number;
  subtotalComidas: number;
  subtotalTransporte: number;
  subtotalHospedaje: number;
} | null;

type PersonalIn = {
  tarifaAcordada: number | null;
  estadoPago: string;
  tecnico: { id: string } | null;
};

type CxPIn = {
  id: string;
  monto: number;
  montoPagado?: number | null;
  montoCompensado?: number | null;
  tipoAcreedor: string;
  tecnicoId?: string | null;
  esNomina?: boolean | null;
  esDeuda?: boolean | null;
  esReparto?: boolean | null;
  gastoRecurrenteId?: string | null;
};

type ProveedorEventoIn = {
  proveedorId: string | null;
  costoAcordado: number | null;
  cuentaPagarId: string | null;
};

type EquipoIn = {
  tipo: string;
  proveedorId: string | null;
  cantidad: number;
  dias: number;
  costoExterno: number | null;
};

type ViaticoIn = { monto: number; entregado: boolean; autorizadoEn?: string | Date | null };

/** Gasto pagado. `ligado` = ya es el pago de una cuenta que se cuenta en otro lado. */
type MovimientoIn = { monto: number; ligado?: boolean };

export type EntradaFinanzas = {
  cotizacion: CotizacionIn;
  personal: PersonalIn[];
  cuentasPagar: CxPIn[];
  proveedoresEvento: ProveedorEventoIn[];
  equipos: EquipoIn[];
  viaticos: ViaticoIn[];
  movimientos: MovimientoIn[];
  cuentasCobrar: { montoCobrado: number }[];
  ingresosSueltos?: { monto: number }[];
};

// ── Cálculo ─────────────────────────────────────────────────────────────────

const redondear = (n: number) => Math.round(n * 100) / 100;

const pagadoDeCxP = (c: CxPIn) => (c.montoPagado ?? 0) + Number(c.montoCompensado ?? 0);

/** Un gasto del día a día del proyecto, no de un proveedor ni de un técnico. */
const esGastoDeCasa = (c: CxPIn) =>
  !!(c.esNomina || c.esDeuda || c.esReparto || c.gastoRecurrenteId);

/** Lo que cuesta un equipo rentado: su costo por día y unidad, por las dos cosas. */
const costoEquipo = (e: EquipoIn) => (e.costoExterno ?? 0) * e.cantidad * Math.max(1, e.dias);

export function calcularFinanzasProyecto(d: EntradaFinanzas): FinanzasProyecto {
  const cot = d.cotizacion;
  const facturado = cot?.granTotal ?? 0;
  const base = cot ? (cot.aplicaIva && cot.total ? cot.total : cot.granTotal) : 0;
  const cobrado =
    d.cuentasCobrar.reduce((s, c) => s + c.montoCobrado, 0) +
    (d.ingresosSueltos ?? []).reduce((s, m) => s + m.monto, 0);

  const avisos: string[] = [];

  // ── Personal técnico ──
  // El puesto con tarifa es el compromiso. La cuenta por pagar de un técnico que
  // no ocupa puesto (un refuerzo que se contrató aparte) se suma además, pero la
  // del técnico que sí lo ocupa no: sería su misma tarifa por otro camino.
  const tecnicosConPuesto = new Set(
    d.personal.map((p) => p.tecnico?.id).filter((x): x is string => !!x),
  );
  const cxpLigadaAProveedor = new Set(
    d.proveedoresEvento.map((pe) => pe.cuentaPagarId).filter((x): x is string => !!x),
  );
  const cxpTecnicoExtra = d.cuentasPagar.filter(
    (c) =>
      c.tipoAcreedor === "TECNICO" &&
      !cxpLigadaAProveedor.has(c.id) &&
      !(c.tecnicoId && tecnicosConPuesto.has(c.tecnicoId)),
  );

  const personalReal =
    d.personal.reduce((s, p) => s + (p.tarifaAcordada ?? 0), 0) +
    cxpTecnicoExtra.reduce((s, c) => s + c.monto, 0);
  const personalPagado =
    d.personal.reduce((s, p) => s + (p.estadoPago === "PAGADO" ? p.tarifaAcordada ?? 0 : 0), 0) +
    cxpTecnicoExtra.reduce((s, c) => s + pagadoDeCxP(c), 0);
  const sinTarifa = d.personal.filter((p) => p.tarifaAcordada == null && p.tecnico).length;
  if (sinTarifa > 0) {
    avisos.push(
      `${sinTarifa} ${sinTarifa === 1 ? "técnico asignado no tiene" : "técnicos asignados no tienen"} tarifa: su costo todavía no cuenta.`,
    );
  }

  // ── Proveedores y equipo externo ──
  // El renglón del proveedor ya trae el costo de los equipos que le tocan (el
  // rider lo alimenta), así que los equipos solo se suman cuando nadie los
  // reclama: sin proveedor, o con un proveedor que aún no tiene renglón.
  const proveedoresConRenglon = new Set(
    d.proveedoresEvento.map((pe) => pe.proveedorId).filter((x): x is string => !!x),
  );
  const cxpPorId = new Map(d.cuentasPagar.map((c) => [c.id, c]));

  let proveedoresReal = 0;
  let proveedoresPagado = 0;
  let proveedoresConceptos = 0;
  let sinFormalizar = 0;

  for (const pe of d.proveedoresEvento) {
    const cxp = pe.cuentaPagarId ? cxpPorId.get(pe.cuentaPagarId) : undefined;
    const monto = cxp?.monto ?? pe.costoAcordado ?? 0;
    if (monto <= 0) continue;
    proveedoresReal += monto;
    proveedoresPagado += cxp ? pagadoDeCxP(cxp) : 0;
    proveedoresConceptos += 1;
    if (!cxp) sinFormalizar += 1;
  }

  // Cuentas capturadas directo en finanzas, sin pasar por un renglón de proveedor.
  for (const c of d.cuentasPagar) {
    if (c.tipoAcreedor === "TECNICO" || cxpLigadaAProveedor.has(c.id) || esGastoDeCasa(c)) continue;
    proveedoresReal += c.monto;
    proveedoresPagado += pagadoDeCxP(c);
    proveedoresConceptos += 1;
  }

  const equiposHuerfanos = d.equipos.filter(
    (e) =>
      e.tipo === "EXTERNO" &&
      (e.costoExterno ?? 0) > 0 &&
      !(e.proveedorId && proveedoresConRenglon.has(e.proveedorId)),
  );
  if (equiposHuerfanos.length > 0) {
    proveedoresReal += equiposHuerfanos.reduce((s, e) => s + costoEquipo(e), 0);
    proveedoresConceptos += equiposHuerfanos.length;
    avisos.push(
      `${equiposHuerfanos.length} ${equiposHuerfanos.length === 1 ? "equipo externo no tiene" : "equipos externos no tienen"} proveedor asignado en el rider.`,
    );
  }
  if (sinFormalizar > 0) {
    avisos.push(
      `${sinFormalizar} ${sinFormalizar === 1 ? "proveedor no tiene" : "proveedores no tienen"} cuenta por pagar generada.`,
    );
  }

  // ── Comidas y viáticos ──
  const viaticosReal = d.viaticos.reduce((s, v) => s + v.monto, 0);
  const viaticosPagado = d.viaticos.reduce((s, v) => s + (v.entregado ? v.monto : 0), 0);
  const viaticosSinAutorizar = d.viaticos.filter((v) => !v.autorizadoEn && !v.entregado).length;
  if (viaticosSinAutorizar > 0) {
    avisos.push(
      `${viaticosSinAutorizar} ${viaticosSinAutorizar === 1 ? "renglón de viáticos está" : "renglones de viáticos están"} sin autorizar en Operación.`,
    );
  }

  // ── Otros gastos ──
  // Deudas, repartos, nómina y recurrentes que le tocan al evento, más los pagos
  // sueltos que no vinieron de ninguna cuenta.
  // Un gasto de casa que además es de un técnico o de un proveedor ya lo contó su
  // propia categoría; aquí solo queda lo que no cabe en ninguna otra.
  const cxpCasa = d.cuentasPagar.filter(
    (c) => esGastoDeCasa(c) && c.tipoAcreedor !== "TECNICO" && !cxpLigadaAProveedor.has(c.id),
  );
  const movSueltos = d.movimientos.filter((m) => !m.ligado);
  const otrosReal =
    cxpCasa.reduce((s, c) => s + c.monto, 0) + movSueltos.reduce((s, m) => s + m.monto, 0);
  const otrosPagado =
    cxpCasa.reduce((s, c) => s + pagadoDeCxP(c), 0) + movSueltos.reduce((s, m) => s + m.monto, 0);

  // ── Presupuesto por categoría ──
  const presupuesto: Record<CategoriaCosto, number> = {
    PERSONAL: cot?.subtotalOperacion ?? 0,
    PROVEEDORES: cot?.subtotalTerceros ?? 0,
    VIATICOS: cot
      ? cot.subtotalComidas + cot.subtotalTransporte + cot.subtotalHospedaje
      : 0,
    OTROS: 0,
  };

  const crudos: Record<CategoriaCosto, { real: number; pagado: number; conceptos: number }> = {
    PERSONAL: {
      real: personalReal,
      pagado: personalPagado,
      conceptos: d.personal.length + cxpTecnicoExtra.length,
    },
    PROVEEDORES: {
      real: proveedoresReal,
      pagado: proveedoresPagado,
      conceptos: proveedoresConceptos,
    },
    VIATICOS: { real: viaticosReal, pagado: viaticosPagado, conceptos: d.viaticos.length },
    OTROS: {
      real: otrosReal,
      pagado: otrosPagado,
      conceptos: cxpCasa.length + movSueltos.length,
    },
  };

  const renglones: RenglonCosto[] = CATEGORIAS_COSTO.map((clave) => {
    const { real, pagado, conceptos } = crudos[clave];
    return {
      clave,
      etiqueta: ETIQUETA_CATEGORIA[clave],
      presupuesto: redondear(presupuesto[clave]),
      real: redondear(real),
      pagado: redondear(Math.min(pagado, real)),
      porPagar: redondear(Math.max(0, real - pagado)),
      conceptos,
    };
  });

  const suma = (k: "presupuesto" | "real" | "pagado" | "porPagar") =>
    redondear(renglones.reduce((s, r) => s + r[k], 0));

  const costoPresupuesto = suma("presupuesto");
  const costoReal = suma("real");

  const utilidadEstimada = redondear(base - costoPresupuesto);
  const utilidadReal = redondear(base - costoReal);

  return {
    ingreso: {
      facturado: redondear(facturado),
      base: redondear(base),
      iva: redondear(facturado - base),
      cobrado: redondear(cobrado),
      porCobrar: redondear(facturado - cobrado),
    },
    costos: {
      renglones,
      presupuesto: costoPresupuesto,
      real: costoReal,
      pagado: suma("pagado"),
      porPagar: suma("porPagar"),
    },
    utilidad: {
      estimada: utilidadEstimada,
      real: utilidadReal,
      margenEstimado: base > 0 ? utilidadEstimada / base : 0,
      margenReal: base > 0 ? utilidadReal / base : 0,
      semaforo: semaforoDeMargen(base > 0 ? utilidadReal / base : 0),
      desviacion: redondear(costoReal - costoPresupuesto),
    },
    avisos,
    hayCotizacion: !!cot,
  };
}
