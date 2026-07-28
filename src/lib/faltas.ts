import { prisma } from "@/lib/prisma";
import { CATALOGO_FALTAS, VENTANA_ESCALON_DIAS } from "@/lib/faltas-constantes";

// ─────────────────────────────────────────────────────────────────────────────
// Sistema de faltas administrativas y actas — capa con dependencias de servidor.
//
// Las constantes puras (catálogo, matriz de consecuencias, etiquetas) viven en
// `faltas-constantes.ts` para poder importarse desde componentes cliente. Aquí
// solo quedan las funciones que tocan Prisma.
// ─────────────────────────────────────────────────────────────────────────────

// Re-exporta la capa pura para que los consumidores server-side sigan importando
// todo desde "@/lib/faltas".
export * from "@/lib/faltas-constantes";

// ─── Siembra idempotente del catálogo ────────────────────────────────────────
// Upsert por `codigo`. Respeta ediciones manuales de nombre/valor: solo crea los
// faltantes y actualiza los metadatos estructurales (categoría/gravedad/detección).
export async function ensureCatalogoFaltas(): Promise<void> {
  const existentes = await prisma.tipoIncidencia.findMany({
    where: { codigo: { in: CATALOGO_FALTAS.map((f) => f.codigo) } },
    select: { codigo: true },
  });
  const yaHay = new Set(existentes.map((e) => e.codigo));
  const faltantes = CATALOGO_FALTAS.filter((f) => !yaHay.has(f.codigo));
  if (faltantes.length === 0) return;
  await prisma.$transaction(
    faltantes.map((f) =>
      prisma.tipoIncidencia.create({
        data: {
          codigo: f.codigo,
          nombre: f.nombre,
          categoria: f.categoria,
          gravedad: f.gravedad,
          deteccion: f.deteccion,
          calculoTipo: f.calculoTipo,
          valor: f.valor,
          esDescuento: f.esDescuento,
          descripcion: f.descripcion,
        },
      }),
    ),
  );
}

// ─── Nivel de escalón para una persona ───────────────────────────────────────
// Cuenta las actas NO anuladas de la persona dentro de la ventana y suma 1.
// La gravedad de la falta actual fija el piso de la consecuencia; el nivel la sube.
export async function calcularNivelEscalon(personalId: string, hasta: Date = new Date()): Promise<number> {
  const desde = new Date(hasta.getTime() - VENTANA_ESCALON_DIAS * 24 * 60 * 60 * 1000);
  const previas = await prisma.actaAdministrativa.count({
    where: {
      personalId,
      estado: { not: "ANULADA" },
      fecha: { gte: desde, lte: hasta },
    },
  });
  return previas + 1;
}

// ─── Folio consecutivo por año ───────────────────────────────────────────────
export async function siguienteFolio(fecha: Date = new Date()): Promise<string> {
  const anio = fecha.getFullYear();
  const prefijo = `ACTA-${anio}-`;
  const ultima = await prisma.actaAdministrativa.findFirst({
    where: { folio: { startsWith: prefijo } },
    orderBy: { folio: "desc" },
    select: { folio: true },
  });
  const n = ultima ? parseInt(ultima.folio.slice(prefijo.length), 10) + 1 : 1;
  return `${prefijo}${String(n).padStart(4, "0")}`;
}
