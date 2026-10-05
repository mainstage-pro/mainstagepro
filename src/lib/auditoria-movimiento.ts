import { prisma } from "@/lib/prisma";
import { logActividad } from "@/lib/actividad";

export const ENTIDAD_MOVIMIENTO = "movimiento";

const ETIQUETAS: Record<string, string> = {
  fecha: "Fecha",
  tipo: "Tipo",
  concepto: "Concepto",
  monto: "Monto",
  metodoPago: "Método de pago",
  referencia: "Referencia",
  notas: "Notas",
  categoriaId: "Categoría",
  cuentaOrigenId: "Cuenta origen",
  cuentaDestinoId: "Cuenta destino",
  proyectoId: "Proyecto",
  clienteId: "Cliente",
  proveedorId: "Proveedor",
};

// Campos cuyo valor es un id: en el historial se muestran con su nombre.
const CAMPOS_ID: Record<string, "categoria" | "cuenta" | "proyecto" | "cliente" | "proveedor"> = {
  categoriaId: "categoria",
  cuentaOrigenId: "cuenta",
  cuentaDestinoId: "cuenta",
  proyectoId: "proyecto",
  clienteId: "cliente",
  proveedorId: "proveedor",
};

export interface Cambio {
  campo: string;
  etiqueta: string;
  de: string | number | null;
  a: string | number | null;
}

function normalizar(valor: unknown): string | number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === "number") return Math.round(valor * 100) / 100;
  return String(valor);
}

/** Campos del movimiento que cambiaron, listos para guardarse en la bitácora. */
export function diffMovimiento(
  antes: Record<string, unknown>,
  despues: Record<string, unknown>
): Cambio[] {
  const cambios: Cambio[] = [];
  for (const campo of Object.keys(despues)) {
    if (!(campo in ETIQUETAS)) continue;
    const de = normalizar(antes[campo]);
    const a = normalizar(despues[campo]);
    if (de === a) continue;
    cambios.push({ campo, etiqueta: ETIQUETAS[campo], de, a });
  }
  return cambios;
}

export function registrarAltaMovimiento(userId: string, movimientoId: string, concepto: string, monto: number) {
  return logActividad(userId, "CREAR", ENTIDAD_MOVIMIENTO, movimientoId, `Registró el movimiento "${concepto}" por ${monto}`);
}

export function registrarCambioMovimiento(userId: string, movimientoId: string, concepto: string, cambios: Cambio[]) {
  if (cambios.length === 0) return Promise.resolve();
  const resumen = cambios.map((c) => c.etiqueta).join(", ");
  return logActividad(
    userId,
    "EDITAR",
    ENTIDAD_MOVIMIENTO,
    movimientoId,
    `Editó ${resumen} de "${concepto}"`,
    { cambios }
  );
}

export function registrarBajaMovimiento(userId: string, movimientoId: string, concepto: string, monto: number) {
  return logActividad(userId, "ELIMINAR", ENTIDAD_MOVIMIENTO, movimientoId, `Eliminó el movimiento "${concepto}" por ${monto}`);
}

export interface EntradaHistorial {
  id: string;
  accion: string;
  descripcion: string;
  usuario: string;
  createdAt: Date;
  cambios: Cambio[];
}

/** Bitácora de un movimiento, con los ids de catálogo ya traducidos a nombres. */
export async function getHistorialMovimiento(movimientoId: string): Promise<EntradaHistorial[]> {
  const actividades = await prisma.actividadUsuario.findMany({
    where: { entidad: ENTIDAD_MOVIMIENTO, entidadId: movimientoId },
    include: { usuario: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const porTipo: Record<string, Set<string>> = {};
  const entradas = actividades.map((a) => {
    let cambios: Cambio[] = [];
    if (a.datos) {
      try {
        cambios = (JSON.parse(a.datos).cambios ?? []) as Cambio[];
      } catch {
        cambios = [];
      }
    }
    for (const c of cambios) {
      const tipo = CAMPOS_ID[c.campo];
      if (!tipo) continue;
      porTipo[tipo] ??= new Set();
      if (typeof c.de === "string") porTipo[tipo].add(c.de);
      if (typeof c.a === "string") porTipo[tipo].add(c.a);
    }
    return {
      id: a.id,
      accion: a.accion,
      descripcion: a.descripcion,
      usuario: a.usuario?.name ?? "—",
      createdAt: a.createdAt,
      cambios,
    };
  });

  const nombres = await resolverNombres(porTipo);
  for (const e of entradas) {
    for (const c of e.cambios) {
      const tipo = CAMPOS_ID[c.campo];
      if (!tipo) continue;
      if (typeof c.de === "string") c.de = nombres.get(`${tipo}:${c.de}`) ?? c.de;
      if (typeof c.a === "string") c.a = nombres.get(`${tipo}:${c.a}`) ?? c.a;
    }
  }

  return entradas;
}

async function resolverNombres(porTipo: Record<string, Set<string>>): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  const ids = (t: string) => Array.from(porTipo[t] ?? []);

  const [categorias, cuentas, proyectos, clientes, proveedores] = await Promise.all([
    ids("categoria").length ? prisma.categoriaFinanciera.findMany({ where: { id: { in: ids("categoria") } }, select: { id: true, nombre: true } }) : [],
    ids("cuenta").length ? prisma.cuentaBancaria.findMany({ where: { id: { in: ids("cuenta") } }, select: { id: true, nombre: true } }) : [],
    ids("proyecto").length ? prisma.proyecto.findMany({ where: { id: { in: ids("proyecto") } }, select: { id: true, nombre: true } }) : [],
    ids("cliente").length ? prisma.cliente.findMany({ where: { id: { in: ids("cliente") } }, select: { id: true, nombre: true } }) : [],
    ids("proveedor").length ? prisma.proveedor.findMany({ where: { id: { in: ids("proveedor") } }, select: { id: true, nombre: true } }) : [],
  ]);

  for (const c of categorias) mapa.set(`categoria:${c.id}`, c.nombre);
  for (const c of cuentas) mapa.set(`cuenta:${c.id}`, c.nombre);
  for (const p of proyectos) mapa.set(`proyecto:${p.id}`, p.nombre);
  for (const c of clientes) mapa.set(`cliente:${c.id}`, c.nombre);
  for (const p of proveedores) mapa.set(`proveedor:${p.id}`, p.nombre);

  return mapa;
}
