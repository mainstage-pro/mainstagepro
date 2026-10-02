// Helpers de servidor compartidos por los endpoints de propuestas de servicio.
// El cálculo en sí vive en src/lib/propuesta-servicio.ts (puro); aquí sólo se
// lee de la BD y se persiste el resultado.
import { prisma } from "@/lib/prisma";
import {
  calcularResumenPropuesta,
  camposResumen,
  subtotalLinea,
  type ResumenPropuesta,
} from "@/lib/propuesta-servicio";

/// Relee las líneas, recalcula y sella los subtotales de la cabecera.
/// Se llama después de cualquier mutación de líneas o de descuento/IVA, para
/// que la cabecera nunca quede desfasada de su detalle.
export async function recalcularPropuesta(propuestaId: string): Promise<ResumenPropuesta> {
  const propuesta = await prisma.propuestaServicio.findUnique({
    where: { id: propuestaId },
    select: {
      descuentoMonto: true,
      aplicaIva: true,
      lineas: {
        select: {
          id: true,
          tipo: true,
          cantidad: true,
          precioUnitario: true,
          costoUnitario: true,
          esIncluido: true,
          esReembolsable: true,
          subtotal: true,
        },
      },
    },
  });
  if (!propuesta) throw new Error("Propuesta no encontrada");

  const resumen = calcularResumenPropuesta(propuesta.lineas, {
    descuentoMonto: propuesta.descuentoMonto,
    aplicaIva: propuesta.aplicaIva,
  });

  // El subtotal de cada línea es derivado: se sincroniza aquí para que los
  // lectores (portal público, PDF) no tengan que recalcular.
  const desfasadas = propuesta.lineas
    .map((l) => ({ id: l.id, nuevo: subtotalLinea(l), viejo: l.subtotal }))
    .filter((l) => Math.abs(l.nuevo - l.viejo) > 0.001);

  await prisma.$transaction([
    ...desfasadas.map((l) =>
      prisma.propuestaServicioLinea.update({ where: { id: l.id }, data: { subtotal: l.nuevo } }),
    ),
    prisma.propuestaServicio.update({ where: { id: propuestaId }, data: camposResumen(resumen) }),
  ]);

  return resumen;
}

/// Siguiente folio: PS-0001, PS-0002…
export async function siguienteNumero(): Promise<string> {
  const ultima = await prisma.propuestaServicio.findFirst({
    where: { numero: { startsWith: "PS-" } },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const n = ultima ? parseInt(ultima.numero.replace("PS-", ""), 10) || 0 : 0;
  return `PS-${String(n + 1).padStart(4, "0")}`;
}

export function textoOpcional(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? null : t;
}

export function numero(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function booleano(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

export function fecha(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v !== "string") return undefined;
  const d = new Date(v.length === 10 ? `${v}T12:00:00.000Z` : v);
  return isNaN(d.getTime()) ? undefined : d;
}

/// Quita del objeto las llaves que quedaron en `undefined` para que el PATCH
/// sólo escriba lo que de verdad venía en el cuerpo.
export function soloDefinidos<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  }
  return out;
}
