import { prisma } from "@/lib/prisma";
import { proximoMiercolesTrasEvento } from "@/lib/pagos-proveedor";
import type { EstadoCuentaLinea } from "@/components/EstadoCuentaPDF";

// ─── Estado de cuenta agregado por empresa / relación mutua ──────────────────
// Regla de negocio: se cobra/paga a la EMPRESA (y a su contraparte proveedor),
// no a los contactos aislados. Abrir cualquier contacto (cliente o proveedor) o
// la empresa consolida tanto las cuentas por cobrar como las rentas mutuas /
// cuentas por pagar de la compañía y sus contactos equivalentes.

export interface AbonoResumen {
  id: string;
  fecha: string;
  monto: number;
  metodoPago: string;
  cuenta: string | null;
  notas: string | null;
  cuentaId: string;
  concepto: string;
  proyecto: string | null;
  referencia: string | null;
  estadoCuenta: string;
  grupoFechaTotal?: number;
  grupoFechaCount?: number;
  grupoDetalle?: string;
}

export interface CuentaCobrarDetalle {
  id: string;
  concepto: string;
  monto: number;
  montoCobrado: number;
  montoCompensado: number;
  estado: string;
  fechaCompromiso: string;
  fechaCobroReal: string | null;
  fechaFiltro: string;
  cotizacion: { numeroCotizacion: string } | null;
  proyecto: { numeroProyecto: string; nombre: string } | null;
  contacto: { id: string; nombre: string } | null;
  abonos?: AbonoResumen[];
}

export interface CuentaPagarDetalle {
  id: string;
  concepto: string;
  monto: number;
  montoPagado: number;
  montoCompensado: number;
  estado: string;
  fechaCompromiso: string;
  fechaPagoReal: string | null;
  fechaFiltro: string;
  tipoAcreedor: string;
  proveedor: { nombre: string } | null;
  proyecto: { numeroProyecto: string; nombre: string } | null;
  proveedorEventoId?: string | null;
  abonos?: AbonoResumen[];
}

export interface CompensacionResumen {
  id: string;
  fecha: string;
  importeCompensado: number;
  estado: string;
  notas: string | null;
}

export interface CuentasScope {
  empresaId: string | null;
  empresaIds: string[];
  esRelacionMutua: boolean;
  cuentasCobrar: CuentaCobrarDetalle[];
  cuentasPagar: CuentaPagarDetalle[];
  compensaciones: CompensacionResumen[];
  abonosCobrar: AbonoResumen[];
  abonosPagar: AbonoResumen[];
}

// ─── Normalización y resolución de identidad cruzada (Cliente <-> Proveedor <-> Empresa) ──

function norm(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function esEmpresaParticular(nombre: string | null | undefined): boolean {
  const n = norm(nombre);
  return !n || n === "particular";
}

function normEmpresaBase(s: string | null | undefined): string {
  const n = norm(s);
  if (!n || n === "particular") return "";
  const stripped = n
    .replace(
      /\b(producciones|production|productions|entertainment|music|group|pro|soluciones|media|eventos|sapi|sa|de|cv|sc)\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length >= 4 ? stripped : n;
}

function isFullPersonName(s: string | null | undefined): boolean {
  const n = norm(s);
  return n.includes(" ") && n.length >= 7 && n !== "particular";
}

interface DirectorioCache {
  ts: number;
  empresas: Array<{ id: string; nombre: string; tipo: string }>;
  clientes: Array<{ id: string; nombre: string; empresa: string | null; empresaId: string | null }>;
  proveedores: Array<{ id: string; nombre: string; empresa: string | null; empresaId: string | null }>;
}

let directorioCache: DirectorioCache | null = null;

async function getDirectorio(): Promise<DirectorioCache> {
  const now = Date.now();
  if (directorioCache && now - directorioCache.ts < 3000) {
    return directorioCache;
  }
  const [empresas, clientes, proveedores] = await Promise.all([
    prisma.empresa.findMany({ select: { id: true, nombre: true, tipo: true } }),
    prisma.cliente.findMany({ select: { id: true, nombre: true, empresa: true, empresaId: true } }),
    prisma.proveedor.findMany({ select: { id: true, nombre: true, empresa: true, empresaId: true } }),
  ]);
  directorioCache = { ts: now, empresas, clientes, proveedores };
  return directorioCache;
}

/**
 * Reúne las cuentas por cobrar/pagar y rentas mutuas con alcance consolidado:
 * - Por cobrar: cuentas ligadas a la(s) empresa(s) + cuentas de TODOS sus contactos cliente.
 * - Por pagar / Rentas mutuas: cuentas por pagar ligadas a la(s) empresa(s) o a sus proveedores
 + rentas de equipo en proyectos (`ProveedorEvento` / `ProyectoEquipo` externo) aún sin formalizar.
 * - Si la empresa es el genérico "Particular" y se consulta un cliente/proveedor, se acota a esa persona.
 */
export async function getCuentasScope(opts: {
  clienteId?: string;
  proveedorId?: string;
  empresaId?: string | null;
}): Promise<CuentasScope> {
  const dir = await getDirectorio();
  const empById = new Map(dir.empresas.map((e) => [e.id, e]));

  const isParticularId = (id: string | null | undefined) => {
    if (!id) return false;
    const e = empById.get(id);
    return e ? esEmpresaParticular(e.nombre) : false;
  };

  const hasRealEmpresa = (empId: string | null | undefined, empName: string | null | undefined) => {
    if (empId && !isParticularId(empId)) return true;
    return !esEmpresaParticular(empName);
  };

  const empIds = new Set<string>();
  const cliIds = new Set<string>();
  const provIds = new Set<string>();
  const empNorms = new Set<string>();
  const empBaseNorms = new Set<string>();
  const personNorms = new Set<string>();

  const addEmpName = (name: string | null | undefined) => {
    if (esEmpresaParticular(name)) return;
    const n = norm(name);
    empNorms.add(n);
    const b = normEmpresaBase(name);
    if (b) empBaseNorms.add(b);
  };

  // Si se consulta directamente la ficha de la empresa "Particular" (sin clienteId ni proveedorId),
  // respetamos ese empresaId sin cruzar a otras empresas.
  const consultaDirectaParticular =
    Boolean(opts.empresaId) && !opts.clienteId && !opts.proveedorId && isParticularId(opts.empresaId);

  if (consultaDirectaParticular && opts.empresaId) {
    empIds.add(opts.empresaId);
    for (const c of dir.clientes) {
      if (c.empresaId === opts.empresaId) cliIds.add(c.id);
    }
    for (const p of dir.proveedores) {
      if (p.empresaId === opts.empresaId) provIds.add(p.id);
    }
  } else {
    if (opts.empresaId && !isParticularId(opts.empresaId)) {
      empIds.add(opts.empresaId);
      addEmpName(empById.get(opts.empresaId)?.nombre);
    }
    if (opts.clienteId) {
      cliIds.add(opts.clienteId);
      const c = dir.clientes.find((x) => x.id === opts.clienteId);
      if (c) {
        if (c.empresaId && !isParticularId(c.empresaId)) {
          empIds.add(c.empresaId);
          addEmpName(empById.get(c.empresaId)?.nombre);
        }
        addEmpName(c.empresa);
        if (isFullPersonName(c.nombre)) personNorms.add(norm(c.nombre));
      }
    }
    if (opts.proveedorId) {
      provIds.add(opts.proveedorId);
      const p = dir.proveedores.find((x) => x.id === opts.proveedorId);
      if (p) {
        if (p.empresaId && !isParticularId(p.empresaId)) {
          empIds.add(p.empresaId);
          addEmpName(empById.get(p.empresaId)?.nombre);
        }
        addEmpName(p.empresa);
        if (isFullPersonName(p.nombre)) personNorms.add(norm(p.nombre));
      }
    }

    // Expansión iterativa (2 pasadas) para enlazar empresas equivalentes (ej. Motion <-> Motion Producciones)
    // y contactos que operan como Cliente y Proveedor bajo el mismo nombre completo.
    for (let pass = 0; pass < 2; pass++) {
      for (const e of dir.empresas) {
        if (esEmpresaParticular(e.nombre)) continue;
        const n = norm(e.nombre);
        const b = normEmpresaBase(e.nombre);
        if (empIds.has(e.id) || empNorms.has(n) || (b && empBaseNorms.has(b))) {
          empIds.add(e.id);
          addEmpName(e.nombre);
        }
      }
      for (const c of dir.clientes) {
        const cName = norm(c.nombre);
        const cEmp = norm(c.empresa);
        const cEmpBase = normEmpresaBase(c.empresa);
        const matchEmp =
          (c.empresaId && !isParticularId(c.empresaId) && empIds.has(c.empresaId)) ||
          (!esEmpresaParticular(c.empresa) && (empNorms.has(cEmp) || (cEmpBase && empBaseNorms.has(cEmpBase))));
        const cSinEmpresa = !hasRealEmpresa(c.empresaId, c.empresa);
        const scopeSinEmpresa = empIds.size === 0 && empNorms.size === 0;
        const matchPerson = isFullPersonName(c.nombre) && personNorms.has(cName) && (cSinEmpresa || scopeSinEmpresa);
        if (cliIds.has(c.id) || matchEmp || matchPerson) {
          cliIds.add(c.id);
          if (matchEmp || scopeSinEmpresa) {
            if (c.empresaId && !isParticularId(c.empresaId)) {
              empIds.add(c.empresaId);
              addEmpName(empById.get(c.empresaId)?.nombre);
            }
            addEmpName(c.empresa);
          }
          if (isFullPersonName(c.nombre)) personNorms.add(cName);
        }
      }
      for (const p of dir.proveedores) {
        const pName = norm(p.nombre);
        const pEmp = norm(p.empresa);
        const pEmpBase = normEmpresaBase(p.empresa);
        const matchEmp =
          (p.empresaId && !isParticularId(p.empresaId) && empIds.has(p.empresaId)) ||
          (!esEmpresaParticular(p.empresa) && (empNorms.has(pEmp) || (pEmpBase && empBaseNorms.has(pEmpBase))));
        const pSinEmpresa = !hasRealEmpresa(p.empresaId, p.empresa);
        const scopeSinEmpresa = empIds.size === 0 && empNorms.size === 0;
        const matchPerson = isFullPersonName(p.nombre) && personNorms.has(pName) && (pSinEmpresa || scopeSinEmpresa);
        if (provIds.has(p.id) || matchEmp || matchPerson) {
          provIds.add(p.id);
          if (matchEmp || scopeSinEmpresa) {
            if (p.empresaId && !isParticularId(p.empresaId)) {
              empIds.add(p.empresaId);
              addEmpName(empById.get(p.empresaId)?.nombre);
            }
            addEmpName(p.empresa);
          }
          if (isFullPersonName(p.nombre)) personNorms.add(pName);
        }
      }
    }
  }

  const empresaIds = [...empIds];
  const contactoIds = [...cliIds];
  const proveedorIds = [...provIds];
  const primaryEmpresaId =
    (opts.empresaId && !isParticularId(opts.empresaId) ? opts.empresaId : null) ??
    empresaIds[0] ??
    opts.empresaId ??
    null;

  // 1. Cuentas por cobrar
  const cobrarOr: Array<Record<string, unknown>> = [];
  if (empresaIds.length) cobrarOr.push({ empresaId: { in: empresaIds } });
  if (contactoIds.length) cobrarOr.push({ clienteId: { in: contactoIds } });

  const cobrarRaw = cobrarOr.length
    ? await prisma.cuentaCobrar.findMany({
        where: { OR: cobrarOr },
        select: {
          id: true,
          concepto: true,
          monto: true,
          montoCobrado: true,
          montoCompensado: true,
          estado: true,
          fechaCompromiso: true,
          fechaCobroReal: true,
          createdAt: true,
          cotizacion: { select: { numeroCotizacion: true } },
          proyecto: { select: { numeroProyecto: true, nombre: true, fechaEvento: true } },
          cliente: { select: { id: true, nombre: true } },
          abonos: {
            select: {
              id: true,
              monto: true,
              fecha: true,
              metodoPago: true,
              notas: true,
              createdAt: true,
              cuentaDestino: { select: { nombre: true } },
            },
            orderBy: { fecha: "asc" },
          },
        },
        orderBy: { fechaCompromiso: "asc" },
      })
    : [];

  // 2. Cuentas por pagar formalizadas
  const pagarOr: Array<Record<string, unknown>> = [];
  if (empresaIds.length) {
    pagarOr.push({ empresaId: { in: empresaIds } });
    pagarOr.push({ proveedor: { empresaId: { in: empresaIds } } });
  }
  if (proveedorIds.length) {
    pagarOr.push({ proveedorId: { in: proveedorIds } });
  }

  const pagarRaw = pagarOr.length
    ? await prisma.cuentaPagar.findMany({
        where: { OR: pagarOr },
        select: {
          id: true,
          concepto: true,
          monto: true,
          montoPagado: true,
          montoCompensado: true,
          estado: true,
          fechaCompromiso: true,
          fechaPagoReal: true,
          createdAt: true,
          tipoAcreedor: true,
          proveedorId: true,
          proyectoId: true,
          proveedor: { select: { nombre: true } },
          proyecto: { select: { numeroProyecto: true, nombre: true, fechaEvento: true } },
          abonos: {
            select: {
              id: true,
              monto: true,
              fecha: true,
              metodoPago: true,
              notas: true,
              createdAt: true,
              cuentaOrigen: { select: { nombre: true } },
            },
            orderBy: { fecha: "asc" },
          },
        },
        orderBy: { fechaCompromiso: "asc" },
      })
    : [];

  const resolverMetodo = (metodo: string | null | undefined, cuentaNombre: string | null | undefined): string => {
    const cNorm = norm(cuentaNombre);
    if (cNorm.includes("efectivo") || cNorm.includes("caja")) return "EFECTIVO";
    return metodo || "TRANSFERENCIA";
  };

  const consolidarAbonos = (lista: AbonoResumen[]): AbonoResumen[] => {
    const grupos = new Map<string, AbonoResumen[]>();
    for (const a of lista) {
      const dia = a.fecha.slice(0, 10);
      const key = `${dia}|${a.metodoPago}`;
      const arr = grupos.get(key) ?? [];
      arr.push(a);
      grupos.set(key, arr);
    }
    const consolidados: AbonoResumen[] = [];
    for (const arr of grupos.values()) {
      if (arr.length === 1) {
        consolidados.push(arr[0]);
      } else {
        const total = arr.reduce((s, item) => s + item.monto, 0);
        const proyectos = arr.map((item) => item.proyecto || item.concepto).join(" · ");
        const todosLiquidados = arr.every((item) => item.estadoCuenta === "LIQUIDADO");
        consolidados.push({
          ...arr[0],
          monto: total,
          proyecto: proyectos,
          concepto: proyectos,
          estadoCuenta: todosLiquidados ? "LIQUIDADO" : "PARCIAL",
        });
      }
    }
    return consolidados.sort((a, b) => a.fecha.localeCompare(b.fecha));
  };

  const abonosPagarRaw: AbonoResumen[] = [];
  const cuentasPagar: CuentaPagarDetalle[] = pagarRaw.map((c) => {
    const ref = c.proyecto ? `#${c.proyecto.numeroProyecto}` : null;
    const abonosCuenta: AbonoResumen[] = (c.abonos ?? []).map((a) => ({
      id: a.id,
      fecha: a.fecha.toISOString(),
      monto: a.monto,
      metodoPago: resolverMetodo(a.metodoPago, a.cuentaOrigen?.nombre),
      cuenta: null,
      notas: a.notas ?? null,
      cuentaId: c.id,
      concepto: c.concepto,
      proyecto: c.proyecto?.nombre ?? null,
      referencia: ref,
      estadoCuenta: c.estado,
    }));
    abonosPagarRaw.push(...abonosCuenta);
    return {
      id: c.id,
      concepto: c.concepto,
      monto: c.monto,
      montoPagado: c.montoPagado,
      montoCompensado: Number(c.montoCompensado || 0),
      estado: c.estado,
      fechaCompromiso: c.fechaCompromiso.toISOString(),
      fechaPagoReal: c.fechaPagoReal?.toISOString() ?? null,
      fechaFiltro: (c.proyecto?.fechaEvento || c.createdAt).toISOString(),
      tipoAcreedor: c.tipoAcreedor,
      proveedor: c.proveedor,
      proyecto: c.proyecto
        ? { numeroProyecto: c.proyecto.numeroProyecto, nombre: c.proyecto.nombre }
        : null,
      abonos: abonosCuenta,
    };
  });
  const abonosPagar = consolidarAbonos(abonosPagarRaw);

  // 3. Rentas mutuas / Subrentas en proyectos aún sin CuentaPagar formalizada (ProveedorEvento y ProyectoEquipo EXTERNO)
  if (proveedorIds.length > 0) {
    const pesSinCxp = await prisma.proveedorEvento.findMany({
      where: {
        proveedorId: { in: proveedorIds },
        cuentaPagarId: null,
      },
      include: {
        proveedor: { select: { nombre: true } },
        proyecto: {
          select: {
            id: true,
            numeroProyecto: true,
            nombre: true,
            fechaEvento: true,
            equipos: {
              where: { tipo: "EXTERNO", proveedorId: { in: proveedorIds } },
              select: { proveedorId: true, cantidad: true, dias: true, costoExterno: true },
            },
          },
        },
        items: { orderBy: { orden: "asc" } },
        lineas: { select: { descripcion: true, cantidad: true }, orderBy: { orden: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });

    for (const pe of pesSinCxp) {
      const eqTotal = pe.proyecto.equipos
        .filter((e) => e.proveedorId === pe.proveedorId)
        .reduce((s, e) => s + (e.costoExterno ?? 0) * e.cantidad * Math.max(1, e.dias), 0);
      const monto = pe.costoAcordado && pe.costoAcordado > 0 ? pe.costoAcordado : eqTotal;
      if (monto <= 0) continue;

      // Evitar duplicar si ya existe una CuentaPagar manual para el mismo proyecto, proveedor y monto similar
      const yaTieneCxpEnProyecto = pagarRaw.some(
        (c) =>
          c.proyectoId === pe.proyectoId &&
          c.proveedorId === pe.proveedorId &&
          Math.abs(c.monto - monto) < 1
      );
      if (yaTieneCxpEnProyecto) continue;

      const rentado = [
        ...pe.items.map((it) => `${it.cantidad}× ${it.descripcion}`),
        ...pe.lineas.map((l) => `${l.cantidad}× ${l.descripcion}`),
      ].join(", ");
      const descrito = pe.servicioEquipo?.trim() || rentado || "Renta de equipo / servicio";
      const servicio = (pe.unidades ? `${pe.unidades}× ${descrito}` : descrito).slice(0, 180);
      const etiqueta = pe.imprevisto ? "Imprevisto: " : "Renta mutua: ";
      const concepto = `${etiqueta}${servicio} · ${pe.proyecto.numeroProyecto}`;
      const fechaEvento = pe.proyecto.fechaEvento ?? pe.createdAt;
      const fechaCompromiso = proximoMiercolesTrasEvento(fechaEvento);

      cuentasPagar.push({
        id: `pe:${pe.id}`,
        proveedorEventoId: pe.id,
        concepto,
        monto,
        montoPagado: 0,
        montoCompensado: 0,
        estado: "PENDIENTE",
        fechaCompromiso: fechaCompromiso.toISOString(),
        fechaPagoReal: null,
        fechaFiltro: fechaEvento.toISOString(),
        tipoAcreedor: pe.tipoAcreedor || "PROVEEDOR",
        proveedor: pe.proveedor ?? { nombre: pe.nombreProveedor },
        proyecto: {
          numeroProyecto: pe.proyecto.numeroProyecto,
          nombre: pe.proyecto.nombre,
        },
      });
    }
  }

  // 4. Compensaciones históricas registradas
  const compensacionesRaw = empresaIds.length
    ? await prisma.compensacion.findMany({
        where: { empresaId: { in: empresaIds }, estado: "ACTIVA" },
        orderBy: { fecha: "desc" },
        select: { id: true, fecha: true, importeCompensado: true, estado: true, notas: true },
      })
    : [];

  const tieneAmbosTipos =
    (contactoIds.length > 0 && proveedorIds.length > 0) ||
    empresaIds.some((id) => empById.get(id)?.tipo === "AMBOS") ||
    cuentasPagar.length > 0;

  const abonosCobrarRaw: AbonoResumen[] = [];
  const cuentasCobrar: CuentaCobrarDetalle[] = cobrarRaw.map((c) => {
    const ref = c.cotizacion?.numeroCotizacion ?? (c.proyecto ? `#${c.proyecto.numeroProyecto}` : null);
    const abonosCuenta: AbonoResumen[] = (c.abonos ?? []).map((a) => ({
      id: a.id,
      fecha: a.fecha.toISOString(),
      monto: a.monto,
      metodoPago: resolverMetodo(a.metodoPago, a.cuentaDestino?.nombre),
      cuenta: null,
      notas: a.notas ?? null,
      cuentaId: c.id,
      concepto: c.concepto,
      proyecto: c.proyecto?.nombre ?? null,
      referencia: ref,
      estadoCuenta: c.estado,
    }));
    abonosCobrarRaw.push(...abonosCuenta);
    return {
      id: c.id,
      concepto: c.concepto,
      monto: c.monto,
      montoCobrado: c.montoCobrado,
      montoCompensado: Number(c.montoCompensado || 0),
      estado: c.estado,
      fechaCompromiso: c.fechaCompromiso.toISOString(),
      fechaCobroReal: c.fechaCobroReal?.toISOString() ?? null,
      fechaFiltro: (c.proyecto?.fechaEvento || c.createdAt).toISOString(),
      cotizacion: c.cotizacion,
      proyecto: c.proyecto
        ? { numeroProyecto: c.proyecto.numeroProyecto, nombre: c.proyecto.nombre }
        : null,
      contacto: c.cliente,
      abonos: abonosCuenta,
    };
  });
  const abonosCobrar = consolidarAbonos(abonosCobrarRaw);

  return {
    empresaId: primaryEmpresaId,
    empresaIds,
    esRelacionMutua: tieneAmbosTipos,
    cuentasCobrar,
    cuentasPagar,
    compensaciones: compensacionesRaw.map((comp) => ({
      id: comp.id,
      fecha: comp.fecha.toISOString(),
      importeCompensado: Number(comp.importeCompensado || 0),
      estado: comp.estado,
      notas: comp.notas ?? null,
    })),
    abonosCobrar,
    abonosPagar,
  };
}

/** Convierte el scope a las líneas que consume el PDF de estado de cuenta. */
export function toEstadoCuentaLineas(scope: CuentasScope): {
  porCobrar: EstadoCuentaLinea[];
  porPagar: EstadoCuentaLinea[];
  esRelacionMutua: boolean;
  compensaciones: CompensacionResumen[];
  abonosCobrar: AbonoResumen[];
  abonosPagar: AbonoResumen[];
} {
  const porCobrar: EstadoCuentaLinea[] = scope.cuentasCobrar.map((c) => {
    const compensado = Number(c.montoCompensado || 0);
    return {
      id: c.id,
      concepto: c.concepto,
      referencia: c.cotizacion?.numeroCotizacion ?? (c.proyecto ? `#${c.proyecto.numeroProyecto}` : null),
      detalle: c.proyecto?.nombre ?? c.contacto?.nombre ?? null,
      fecha: c.fechaCompromiso,
      monto: c.monto,
      pagado: c.montoCobrado + compensado,
      abonado: c.montoCobrado,
      compensado,
      estado: c.estado,
      abonos: c.abonos ?? [],
    };
  });
  const porPagar: EstadoCuentaLinea[] = scope.cuentasPagar.map((c) => {
    const compensado = Number(c.montoCompensado || 0);
    return {
      id: c.id,
      concepto: c.concepto,
      referencia: c.proyecto ? `#${c.proyecto.numeroProyecto}` : null,
      detalle: c.proyecto?.nombre ?? c.proveedor?.nombre ?? null,
      fecha: c.fechaCompromiso,
      monto: c.monto,
      pagado: c.montoPagado + compensado,
      abonado: c.montoPagado,
      compensado,
      estado: c.estado,
      abonos: c.abonos ?? [],
    };
  });
  return {
    porCobrar,
    porPagar,
    esRelacionMutua: scope.esRelacionMutua,
    compensaciones: scope.compensaciones,
    abonosCobrar: scope.abonosCobrar,
    abonosPagar: scope.abonosPagar,
  };
}
