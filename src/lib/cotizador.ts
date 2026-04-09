import {
  DESCUENTOS_VOLUMEN,
  DESCUENTO_B2B,
  DESCUENTOS_MULTIDIA,
  IVA,
  VIABILIDAD,
} from "./constants";

// Calcula jornada según horas de operación
export function calcularJornada(horas: number): "CORTA" | "MEDIA" | "LARGA" {
  if (horas <= 8) return "CORTA";
  if (horas <= 12) return "MEDIA";
  return "LARGA";
}

// Descuento por volumen sobre subtotal de equipos propios
export function calcularDescuentoVolumen(subtotalEquipos: number): number {
  const rango = DESCUENTOS_VOLUMEN.find(
    (r) => subtotalEquipos >= r.desde && subtotalEquipos <= r.hasta
  );
  return rango?.pct ?? 0;
}

// Descuento multi-día sobre equipos
export function calcularDescuentoMultidia(dias: number): number {
  const regla = DESCUENTOS_MULTIDIA.find((r) => r.dias >= dias);
  if (!regla) return DESCUENTOS_MULTIDIA[DESCUENTOS_MULTIDIA.length - 1].pct;
  return regla.pct;
}

export interface ResumenCotizacion {
  subtotalEquiposBruto: number;
  descuentoVolumenPct: number;
  descuentoB2bPct: number;
  descuentoMultidiaPct: number;
  descuentoPatrocinioPct: number;
  descuentoEspecialPct: number;
  descuentoTotalPct: number;
  montoDescuento: number;
  montoBeneficio: number;
  subtotalEquiposNeto: number;
  subtotalPaquetes: number;
  subtotalTerceros: number;
  subtotalOperacion: number;
  subtotalTransporte: number;
  subtotalComidas: number;
  subtotalHospedaje: number;
  total: number;
  aplicaIva: boolean;
  montoIva: number;
  granTotal: number;
  // Viabilidad
  costosTotalesEstimados: number;
  utilidadEstimada: number;
  porcentajeUtilidad: number;
  semaforo: "IDEAL" | "REGULAR" | "MINIMO" | "RIESGO";
}

export interface LineaCotizacion {
  tipo: string;
  subtotal: number;
  costoUnitario?: number;
  cantidad?: number;
  dias?: number;
  esIncluido?: boolean;
}

export function calcularResumen(params: {
  lineas: LineaCotizacion[];
  tipoCliente: string;
  diasEquipo: number;
  descuentoPatrocinioPct: number;
  descuentoEspecialPct: number;
  aplicaIva: boolean;
}): ResumenCotizacion {
  const {
    lineas,
    tipoCliente,
    diasEquipo,
    descuentoPatrocinioPct,
    descuentoEspecialPct,
    aplicaIva,
  } = params;

  // Subtotales por tipo
  const subtotalEquiposBruto = lineas
    .filter((l) => l.tipo === "EQUIPO_PROPIO" && !l.esIncluido)
    .reduce((s, l) => s + l.subtotal, 0);

  const subtotalPaquetes = lineas
    .filter((l) => l.tipo === "PAQUETE")
    .reduce((s, l) => s + l.subtotal, 0);

  const subtotalTerceros = lineas
    .filter((l) => l.tipo === "EQUIPO_EXTERNO")
    .reduce((s, l) => s + l.subtotal, 0);

  const subtotalOperacion = lineas
    .filter((l) => ["OPERACION_TECNICA", "DJ"].includes(l.tipo))
    .reduce((s, l) => s + l.subtotal, 0);

  const subtotalTransporte = lineas
    .filter((l) => l.tipo === "TRANSPORTE")
    .reduce((s, l) => s + l.subtotal, 0);

  const subtotalComidas = lineas
    .filter((l) => l.tipo === "COMIDA")
    .reduce((s, l) => s + l.subtotal, 0);

  const subtotalHospedaje = lineas
    .filter((l) => l.tipo === "HOSPEDAJE")
    .reduce((s, l) => s + l.subtotal, 0);

  // Descuentos (solo sobre equipos propios)
  const descuentoVolumenPct = calcularDescuentoVolumen(subtotalEquiposBruto);
  const descuentoB2bPct = tipoCliente === "B2B" ? DESCUENTO_B2B : 0;
  const descuentoMultidiaPct = calcularDescuentoMultidia(diasEquipo);

  const descuentoTotalPct =
    descuentoVolumenPct +
    descuentoB2bPct +
    descuentoMultidiaPct +
    descuentoPatrocinioPct +
    descuentoEspecialPct;

  const montoDescuento = subtotalEquiposBruto * descuentoTotalPct;
  const montoBeneficio = montoDescuento;
  const subtotalEquiposNeto = subtotalEquiposBruto - montoDescuento;

  const total =
    subtotalEquiposNeto +
    subtotalPaquetes +
    subtotalTerceros +
    subtotalOperacion +
    subtotalTransporte +
    subtotalComidas +
    subtotalHospedaje;

  const montoIva = aplicaIva ? total * IVA : 0;
  const granTotal = total + montoIva;

  // Viabilidad: costo real = solo lo que se paga de bolsa (operación + logística).
  // EQUIPO_PROPIO costoUnitario = 0 (equipo capitalizado, su renta es margen puro).
  // OPERACION_TECNICA / DJ / TRANSPORTE / COMIDA / HOSPEDAJE: costoUnitario = precioUnitario (pass-through).
  const costosTotalesEstimados = lineas
    .filter((l) => !l.esIncluido)
    .reduce((s, l) => {
      const costo = (l.costoUnitario ?? 0) * (l.cantidad ?? 1) * (l.dias ?? 1);
      return s + costo;
    }, 0);

  const utilidadEstimada = total - costosTotalesEstimados;
  const porcentajeUtilidad = total > 0 ? utilidadEstimada / total : 0;

  let semaforo: "IDEAL" | "REGULAR" | "MINIMO" | "RIESGO" = "RIESGO";
  if (porcentajeUtilidad >= VIABILIDAD.IDEAL) semaforo = "IDEAL";
  else if (porcentajeUtilidad >= VIABILIDAD.REGULAR) semaforo = "REGULAR";
  else if (porcentajeUtilidad >= VIABILIDAD.MINIMO) semaforo = "MINIMO";

  return {
    subtotalEquiposBruto,
    descuentoVolumenPct,
    descuentoB2bPct,
    descuentoMultidiaPct,
    descuentoPatrocinioPct,
    descuentoEspecialPct,
    descuentoTotalPct,
    montoDescuento,
    montoBeneficio,
    subtotalEquiposNeto,
    subtotalPaquetes,
    subtotalTerceros,
    subtotalOperacion,
    subtotalTransporte,
    subtotalComidas,
    subtotalHospedaje,
    total,
    aplicaIva,
    montoIva,
    granTotal,
    costosTotalesEstimados,
    utilidadEstimada,
    porcentajeUtilidad,
    semaforo,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPct(pct: number): string {
  return `${(pct * 100).toFixed(0)}%`;
}
