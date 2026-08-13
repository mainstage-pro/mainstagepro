"use client";

import { useEffect, useMemo, useState } from "react";
import { parseCoberturas, coberturaMatch, type MatchCapacidad } from "@/lib/constants";
import { Sparkles, Package, Plus, SlidersHorizontal, Handshake, Users, Settings, Mic, Headphones, Volume2, Disc3, Lightbulb, Monitor, Construction, Layers, Guitar, Music, Tent, Zap, Sofa, Cable, Video, Wrench, ExternalLink, type LucideIcon } from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type EquipoPublico = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  imagenUrl: string | null;
  categoriaId: string;
};

export type CategoriaPublica = {
  id: string;
  nombre: string;
  equipos: EquipoPublico[];
};

/** Categoría o equipo agregado manualmente para este trato/descubrimiento.
 *  No existe en el inventario ni se registra en la BD — vive dentro del JSON. */
export type ExtraEquipo = {
  id: string;
  nombre: string;
  categoria?: string;
  cantidad?: number;
};

/** Producto/paquete armado seleccionado en el descubrimiento. */
export type SeleccionProducto = {
  id: string;
  cantidad?: number;
};

export type ProductoPublico = {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  tiposEvento: string | null;
  imagenUrl: string | null;
  precioFinal: number;
  coberturas?: { tipoEvento: string; rangos: string | null; subtipos: string | null }[];
  items: { cantidad: number; equipo: { id: string; descripcion: string; marca: string | null; modelo: string | null } }[];
};

/** Paquete comercial armado (equipos + productos + conceptos operativos), listado público. */
export type PaquetePublico = {
  id: string;
  nombre: string;
  tipoEvento: string;
  rangoPersonas: string | null;
  subtiposEvento: string | null;
  resumen: string | null;
  descripcion: string | null;
  imagenes: { url: string }[];
  items: { cantidad: number; tipo: string }[];
  conceptos: { tipo: string; descripcion: string }[];
};

/** Rol técnico vigente (alimenta las categorías de servicio: DJ y técnicos por disciplina). */
export type RolPublico = {
  id: string;
  nombre: string;
  disciplina: string | null;
  descripcion: string | null;
};

export type SeleccionEquipos = {
  /** IDs de CategoriaEquipo elegidas en el paso 1 (incluye categorías sintéticas de servicio) */
  categorias: string[];
  /** IDs de Equipo específico seleccionado en el paso 2 */
  equipos: string[];
  /** equipoId → cantidad de piezas. Ausente = seleccionado sin cantidad definida */
  cantidades?: Record<string, number>;
  /** Equipos/categorías adicionales tecleados a mano (solo este trato) */
  extras?: ExtraEquipo[];
  /** Productos armados seleccionados */
  productos?: SeleccionProducto[];
  /** Paquetes comerciales seleccionados */
  paquetes?: SeleccionProducto[];
  /** IDs de RolTecnico elegidos en las categorías de servicio (DJ / operación técnica) */
  roles?: string[];
  /** Detalle libre por categoría (clave = id de categoría, incl. servicios).
   *  Lo que el cliente/vendedor escribe sobre lo que necesita de cada categoría,
   *  sin tener que conocer marcas ni modelos. */
  detalles?: Record<string, string>;
  /** Si true, el cliente deja la cantidad/selección exacta de equipos a criterio del vendedor;
   *  las categorías elegidas quedan solo como referencia de interés. */
  aCriterioVendedor?: boolean;
};

// Categorías sintéticas de servicio (no existen en el inventario; se arman con roles técnicos).
// Cada una agrupa los RolTecnico vigentes por su disciplina.
const CAT_SERVICIO_DJ = "__svc_dj__";
const CAT_TEC_AUDIO = "__svc_audio__";
const CAT_TEC_ILUMINACION = "__svc_ilum__";
const CAT_TEC_VIDEO = "__svc_video__";
const CAT_TEC_GENERAL = "__svc_general__";
const CATS_SERVICIO = new Set([
  CAT_SERVICIO_DJ,
  CAT_TEC_AUDIO,
  CAT_TEC_ILUMINACION,
  CAT_TEC_VIDEO,
  CAT_TEC_GENERAL,
]);

// Definición de cada categoría de servicio: cómo se etiqueta y qué disciplinas agrupa.
const SERVICIOS_DEF: { id: string; nombre: string; icon: LucideIcon; disciplinas: string[] }[] = [
  { id: CAT_SERVICIO_DJ, nombre: "Servicio de DJ", icon: Disc3, disciplinas: ["DJ"] },
  { id: CAT_TEC_AUDIO, nombre: "Técnicos de audio", icon: Volume2, disciplinas: ["AUDIO"] },
  { id: CAT_TEC_ILUMINACION, nombre: "Técnicos de iluminación", icon: Lightbulb, disciplinas: ["ILUMINACION"] },
  { id: CAT_TEC_VIDEO, nombre: "Técnicos de video", icon: Video, disciplinas: ["VIDEO"] },
  // Cualquier disciplina distinta a las anteriores (RIGGING, STAGE, STAFF_GENERAL, etc.) cae en generales.
  { id: CAT_TEC_GENERAL, nombre: "Técnicos generales", icon: Wrench, disciplinas: [] },
];
const DISCIPLINAS_ESPECIFICAS = new Set(["DJ", "AUDIO", "ILUMINACION", "VIDEO"]);

const ETIQUETA_TIPO_EVENTO: Record<string, string> = {
  MUSICAL: "🎵 Musical",
  SOCIAL: "🎉 Social",
  EMPRESARIAL: "💼 Empresarial",
};

interface Props {
  value: SeleccionEquipos;
  onChange: (sel: SeleccionEquipos) => void;
  readOnly?: boolean;
  /** Notas técnicas / equipo faltante. Si se pasa onNotasChange, se muestra el campo tras las categorías. */
  notas?: string;
  onNotasChange?: (v: string) => void;
  /** Modo cliente (formulario público): flujo simple de una sola pantalla.
   *  Solo elige categorías de interés y describe con texto lo que necesita de cada una.
   *  No ve la selección detallada de equipos/paquetes (esa etapa es del vendedor);
   *  en su lugar puede abrir la presentación del inventario en una ventana aparte. */
  clientMode?: boolean;
  /** Contexto de capacidad del evento (tipo, nº de asistentes, subtipos) para
   *  recomendar productos según su cobertura definida. Opcional. */
  capacidad?: { tipoEvento?: string | null; asistentes?: number | null; subtipos?: string[] | null };
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

// Icono lucide por categoría (mismo lenguaje visual que el resto de la plataforma).
function catIcon(nombre: string): LucideIcon {
  const n = nombre.toLowerCase();
  if (n.includes("microfon")) return Mic;
  if (n.includes("in ear") || n.includes("in-ear") || n.includes("monitoreo")) return Headphones;
  if (n.includes("consolas de audio") || n.includes("mixer")) return SlidersHorizontal;
  if (n.includes("dj") || n.includes("cdj")) return Disc3;
  if (n.includes("audio")) return Volume2;
  if (n.includes("consolas de ilumin")) return SlidersHorizontal;
  if (n.includes("ilumin")) return Lightbulb;
  if (n.includes("video") || n.includes("pantalla") || n.includes("led")) return Monitor;
  if (n.includes("rigging") || n.includes("estruct")) return Construction;
  if (n.includes("entarim") || n.includes("tarima")) return Layers;
  if (n.includes("backline")) return Guitar;
  if (n.includes("efecto")) return Sparkles;
  if (n.includes("pista")) return Music;
  if (n.includes("toldo") || n.includes("lona") || n.includes("carpa")) return Tent;
  if (n.includes("corriente") || n.includes("energ") || n.includes("planta") || n.includes("eléctric") || n.includes("electric")) return Zap;
  if (n.includes("escenograf") || n.includes("mobiliario")) return Sofa;
  if (n.includes("accesor")) return Cable;
  return Package;
}

// Render inline del icono de una categoría a partir de su nombre.
function CatIcon({ nombre, className }: { nombre: string; className?: string }) {
  const Icon = catIcon(nombre);
  return <Icon strokeWidth={1.75} className={className ?? "w-4 h-4"} />;
}

function nombreEquipo(eq: EquipoPublico): string {
  return eq.marca && eq.modelo
    ? `${eq.marca} ${eq.modelo}`
    : eq.marca || eq.modelo || eq.descripcion;
}

/** Marcas principales de la categoría, derivadas del inventario real (máx. 3). */
function marcasPrincipales(cat: CategoriaPublica): string {
  const seen = new Set<string>();
  for (const e of cat.equipos) {
    const m = (e.marca ?? "").trim();
    if (m) seen.add(m);
  }
  return [...seen].slice(0, 3).join(" · ");
}

// Opciones de cantidad: base 50; al alcanzar el tope se extiende de 20 en 20.
const CANT_STEP = 20;
function opcionesCantidad(cant: number): number[] {
  let tope = 50;
  while (cant >= tope) tope += CANT_STEP;
  return Array.from({ length: tope }, (_, i) => i + 1);
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function SelectorEquiposInventario({ value, onChange, readOnly = false, notas, onNotasChange, clientMode = false, capacidad }: Props) {
  const [categorias, setCategorias] = useState<CategoriaPublica[]>([]);
  const [productos, setProductos] = useState<ProductoPublico[]>([]);
  const [paquetes, setPaquetes] = useState<PaquetePublico[]>([]);
  const [roles, setRoles] = useState<RolPublico[]>([]);
  const [loading, setLoading] = useState(true);
  // Categorías expandidas en el paso 2 (por defecto todas colapsadas)
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  // Grupos marca/modelo de productos expandidos (sub-pestaña Productos). Clave: `${categoria}::${marcaModelo}`.
  const [marcasExpandidas, setMarcasExpandidas] = useState<Set<string>>(new Set());
  const [paso, setPaso] = useState<1 | 2>(() =>
    value.categorias.length > 0 ||
    value.equipos.length > 0 ||
    (value.productos?.length ?? 0) > 0 ||
    (value.paquetes?.length ?? 0) > 0
      ? 2
      : 1
  );
  // Sub-pestaña dentro del paso 2: equipos individuales (default), productos o paquetes
  const [subTab, setSubTab] = useState<"equipos" | "productos" | "paquetes">("equipos");
  const [extraNombre, setExtraNombre] = useState("");
  const [extraCategoria, setExtraCategoria] = useState("");

  const cantidades = value.cantidades ?? {};
  const extras = value.extras ?? [];
  const productosSel = value.productos ?? [];
  const paquetesSel = value.paquetes ?? [];

  useEffect(() => {
    Promise.all([
      fetch("/api/inventario/publico").then((r) => r.json()).catch(() => ({})),
      fetch("/api/productos/publico").then((r) => r.json()).catch(() => ({})),
      fetch("/api/paquetes/publico").then((r) => r.json()).catch(() => ({})),
      fetch("/api/roles-tecnicos/publico").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([inv, prod, paq, rol]) => {
        if (inv.categorias) setCategorias(inv.categorias);
        if (prod.productos) setProductos(prod.productos);
        if (paq.paquetes) setPaquetes(paq.paquetes);
        if (rol.roles) setRoles(rol.roles);
      })
      .finally(() => setLoading(false));
  }, []);

  const rolesSel = value.roles ?? [];
  const aCriterioVendedor = value.aCriterioVendedor ?? false;

  // Roles técnicos vigentes agrupados por categoría de servicio (según su disciplina).
  const rolesPorCat = useMemo(() => {
    const map: Record<string, RolPublico[]> = {};
    for (const def of SERVICIOS_DEF) map[def.id] = [];
    for (const rol of roles) {
      const disc = (rol.disciplina ?? "").toUpperCase();
      const def = DISCIPLINAS_ESPECIFICAS.has(disc)
        ? SERVICIOS_DEF.find((d) => d.disciplinas.includes(disc))!
        : SERVICIOS_DEF.find((d) => d.id === CAT_TEC_GENERAL)!;
      map[def.id].push(rol);
    }
    return map;
  }, [roles]);

  function toggleExpandida(catId: string) {
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  function toggleRol(rolId: string) {
    if (readOnly) return;
    const tiene = rolesSel.includes(rolId);
    onChange({
      ...value,
      roles: tiene ? rolesSel.filter((id) => id !== rolId) : [...rolesSel, rolId],
    });
  }

  function setACriterioVendedor(v: boolean) {
    if (readOnly) return;
    onChange({ ...value, aCriterioVendedor: v });
  }

  function setDetalle(catId: string, texto: string) {
    if (readOnly) return;
    const detalles = { ...(value.detalles ?? {}) };
    if (texto.trim()) detalles[catId] = texto;
    else delete detalles[catId];
    onChange({ ...value, detalles });
  }

  // ── Mutadores de productos ──
  function toggleProducto(id: string) {
    if (readOnly) return;
    const tiene = productosSel.some((p) => p.id === id);
    onChange({
      ...value,
      productos: tiene
        ? productosSel.filter((p) => p.id !== id)
        : [...productosSel, { id, cantidad: 1 }],
    });
  }
  function setProductoCantidad(id: string, cant: number) {
    if (readOnly) return;
    const c = Math.max(1, cant);
    const existe = productosSel.some((p) => p.id === id);
    onChange({
      ...value,
      productos: existe
        ? productosSel.map((p) => (p.id === id ? { ...p, cantidad: c } : p))
        : [...productosSel, { id, cantidad: c }],
    });
  }

  // ── Mutadores de paquetes ──
  function togglePaquete(id: string) {
    if (readOnly) return;
    const tiene = paquetesSel.some((p) => p.id === id);
    onChange({
      ...value,
      paquetes: tiene
        ? paquetesSel.filter((p) => p.id !== id)
        : [...paquetesSel, { id, cantidad: 1 }],
    });
  }
  function setPaqueteCantidad(id: string, cant: number) {
    if (readOnly) return;
    const c = Math.max(1, cant);
    const existe = paquetesSel.some((p) => p.id === id);
    onChange({
      ...value,
      paquetes: existe
        ? paquetesSel.map((p) => (p.id === id ? { ...p, cantidad: c } : p))
        : [...paquetesSel, { id, cantidad: c }],
    });
  }

  // Categorías visibles (excluye vehículos / externos)
  const categoriasVisibles = useMemo(
    () =>
      categorias.filter(
        (cat) =>
          !cat.nombre.toLowerCase().includes("veh") &&
          !cat.nombre.toLowerCase().includes("externo")
      ),
    [categorias]
  );

  const categoriasElegidas = useMemo(
    () => categoriasVisibles.filter((c) => value.categorias.includes(c.id)),
    [categoriasVisibles, value.categorias]
  );

  // Ligadura producto → categoría: los productos no tienen FK de categoría, pero
  // sus equipos sí. Construimos equipoId → categoriaId para poder filtrar los
  // productos por las categorías de equipo elegidas en el paso 1 (igual que Equipos).
  const equipoCatMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const cat of categorias) for (const eq of cat.equipos) m.set(eq.id, cat.id);
    return m;
  }, [categorias]);

  const catNombreMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const cat of categorias) m.set(cat.id, cat.nombre);
    return m;
  }, [categorias]);

  // Solo las categorías de equipo elegidas (excluye las sintéticas de servicio).
  const categoriasEquipoElegidas = useMemo(
    () => new Set(value.categorias.filter((id) => !CATS_SERVICIO.has(id))),
    [value.categorias]
  );

  // Categorías de servicio (sintéticas). Siempre se muestran las 5 (DJ + técnicos por
  // disciplina) para poder marcar el tipo de personal técnico en el descubrimiento aunque
  // todavía no haya roles cargados con esa disciplina; los roles existentes se anidan para
  // elegir el detalle.
  const serviciosCategorias = useMemo(
    () =>
      SERVICIOS_DEF.map((def) => ({
        id: def.id,
        nombre: def.nombre,
        icon: def.icon,
        roles: rolesPorCat[def.id] ?? [],
      })),
    [rolesPorCat]
  );

  const serviciosElegidos = useMemo(
    () => serviciosCategorias.filter((s) => value.categorias.includes(s.id)),
    [serviciosCategorias, value.categorias]
  );

  // Productos armados agrupados en dos niveles: por categoría de origen y, dentro
  // de cada categoría, por marca/modelo del equipo dominante (el primer item, que
  // viene ordenado por `orden`). Así el modelo dominante es el pilar y sus variantes
  // (mismo modelo, distinta configuración) quedan juntas en un panel desplegable.
  // Sin categoría → "Otros"; sin marca/modelo → "Sin marca/modelo", ambos al final.
  const filtroCapacidad = useMemo(
    () => ({
      tipoEvento: capacidad?.tipoEvento ?? null,
      asistentes: capacidad?.asistentes ?? null,
      subtipos: capacidad?.subtipos ?? [],
    }),
    [capacidad?.tipoEvento, capacidad?.asistentes, capacidad?.subtipos]
  );
  const hayCapacidad = !!filtroCapacidad.tipoEvento;
  const matchProducto = useMemo(() => {
    const m = new Map<string, MatchCapacidad>();
    for (const p of productos) m.set(p.id, coberturaMatch(parseCoberturas(p.coberturas), filtroCapacidad));
    return m;
  }, [productos, filtroCapacidad]);
  const [soloRecomendadosProd, setSoloRecomendadosProd] = useState(false);

  const productosVisibles = useMemo(() => {
    const base =
      soloRecomendadosProd && hayCapacidad
        ? productos.filter((p) => matchProducto.get(p.id) === "match")
        : productos;
    // Ligados a las categorías del paso 1: un producto entra si alguno de sus
    // equipos pertenece a una categoría elegida. Sin categorías de equipo
    // elegidas no hay a qué ligar, así que se muestran todos.
    if (categoriasEquipoElegidas.size === 0) return base;
    return base.filter((p) =>
      p.items.some((it) => {
        const cid = equipoCatMap.get(it.equipo.id);
        return cid != null && categoriasEquipoElegidas.has(cid);
      })
    );
  }, [productos, soloRecomendadosProd, hayCapacidad, matchProducto, categoriasEquipoElegidas, equipoCatMap]);

  // Los paquetes se filtran SIEMPRE por tipo de evento y, si el paquete define
  // nicho (subtipos), también por nicho. La capacidad (nº de personas) NO filtra
  // paquetes: reutilizamos la cobertura pero sin rango (asistentes en null).
  const paquetesVisibles = useMemo(() => {
    const tipo = filtroCapacidad.tipoEvento;
    if (!tipo) return paquetes;
    const filtroTipoNicho = { tipoEvento: tipo, asistentes: null, subtipos: filtroCapacidad.subtipos };
    return paquetes.filter((p) => {
      const cob = parseCoberturas([{ tipoEvento: p.tipoEvento, rangos: null, subtipos: p.subtiposEvento }]);
      return coberturaMatch(cob, filtroTipoNicho) === "match";
    });
  }, [paquetes, filtroCapacidad]);

  const productosPorCategoria = useMemo(() => {
    const filtrando = categoriasEquipoElegidas.size > 0;
    const cats = new Map<string, Map<string, ProductoPublico[]>>();
    for (const p of productosVisibles) {
      // Al filtrar por categorías del paso 1, el encabezado es la categoría de
      // equipo elegida a la que pertenece el producto (dominante primero), no su
      // etiqueta libre — así solo aparecen las categorías seleccionadas.
      let cat: string;
      if (filtrando) {
        const domCid = equipoCatMap.get(p.items[0]?.equipo.id ?? "");
        const cid =
          domCid && categoriasEquipoElegidas.has(domCid)
            ? domCid
            : p.items
                .map((it) => equipoCatMap.get(it.equipo.id))
                .find((c) => c != null && categoriasEquipoElegidas.has(c));
        cat = (cid && catNombreMap.get(cid)) || (p.categoria ?? "").trim() || "Otros";
      } else {
        cat = (p.categoria ?? "").trim() || "Otros";
      }
      const dom = p.items[0]?.equipo;
      const marca = (dom?.marca ?? "").trim();
      const modelo = (dom?.modelo ?? "").trim();
      const claveMarca = [marca, modelo].filter(Boolean).join(" ").trim() || "Sin marca/modelo";
      let porMarca = cats.get(cat);
      if (!porMarca) {
        porMarca = new Map();
        cats.set(cat, porMarca);
      }
      const arr = porMarca.get(claveMarca);
      if (arr) arr.push(p);
      else porMarca.set(claveMarca, [p]);
    }
    return [...cats.entries()]
      .sort(([a], [b]) => {
        if (a === "Otros") return 1;
        if (b === "Otros") return -1;
        return a.localeCompare(b, "es");
      })
      .map(([nombre, porMarca]) => ({
        nombre,
        marcas: [...porMarca.entries()]
          .sort(([a], [b]) => {
            if (a === "Sin marca/modelo") return 1;
            if (b === "Sin marca/modelo") return -1;
            return a.localeCompare(b, "es");
          })
          .map(([marcaModelo, items]) => ({ marcaModelo, items })),
      }));
  }, [productosVisibles, categoriasEquipoElegidas, equipoCatMap, catNombreMap]);

  function toggleMarca(clave: string) {
    setMarcasExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  }

  // ── Mutadores ──
  function toggleCategoria(catId: string) {
    if (readOnly) return;
    const tiene = value.categorias.includes(catId);
    if (tiene) {
      // Categoría de servicio: al quitarla, soltamos también sus roles seleccionados.
      if (CATS_SERVICIO.has(catId)) {
        const rolesDeCat = new Set((rolesPorCat[catId] ?? []).map((r) => r.id));
        onChange({
          ...value,
          categorias: value.categorias.filter((id) => id !== catId),
          roles: rolesSel.filter((id) => !rolesDeCat.has(id)),
        });
        return;
      }
      // Al quitar la categoría, quitamos sus equipos y cantidades
      const cat = categorias.find((c) => c.id === catId);
      const idsCat = new Set((cat?.equipos ?? []).map((e) => e.id));
      const nuevasCant = { ...cantidades };
      Object.keys(nuevasCant).forEach((id) => {
        if (idsCat.has(id)) delete nuevasCant[id];
      });
      onChange({
        ...value,
        categorias: value.categorias.filter((id) => id !== catId),
        equipos: value.equipos.filter((id) => !idsCat.has(id)),
        cantidades: nuevasCant,
      });
    } else {
      onChange({ ...value, categorias: [...value.categorias, catId], cantidades });
    }
  }

  function toggleEquipo(eqId: string) {
    if (readOnly) return;
    const tiene = value.equipos.includes(eqId);
    const nuevasCant = { ...cantidades };
    if (tiene) delete nuevasCant[eqId];
    onChange({
      ...value,
      equipos: tiene
        ? value.equipos.filter((id) => id !== eqId)
        : [...value.equipos, eqId],
      cantidades: nuevasCant,
    });
  }

  function setCantidad(eqId: string, cant: number) {
    if (readOnly) return;
    const nuevasCant = { ...cantidades };
    const seleccionado = value.equipos.includes(eqId);
    if (cant <= 0) {
      delete nuevasCant[eqId]; // "sin cantidad definida"
    } else {
      nuevasCant[eqId] = cant;
    }
    onChange({
      ...value,
      // Ajustar cantidad implica seleccionar el equipo
      equipos: seleccionado ? value.equipos : [...value.equipos, eqId],
      cantidades: nuevasCant,
    });
  }

  // ── Extras (categoría/equipo adicional a mano) ──
  function addExtra() {
    if (readOnly) return;
    const nombre = extraNombre.trim();
    if (!nombre) return;
    const item: ExtraEquipo = {
      id: `extra-${Date.now()}`,
      nombre,
      categoria: extraCategoria.trim() || undefined,
      cantidad: undefined,
    };
    onChange({ ...value, extras: [...extras, item] });
    setExtraNombre("");
    setExtraCategoria("");
  }

  function setExtraCantidad(id: string, cant: number) {
    if (readOnly) return;
    onChange({
      ...value,
      extras: extras.map((e) =>
        e.id === id ? { ...e, cantidad: cant <= 0 ? undefined : cant } : e
      ),
    });
  }

  function removeExtra(id: string) {
    if (readOnly) return;
    onChange({ ...value, extras: extras.filter((e) => e.id !== id) });
  }

  // ── Estados de carga / vacío ──
  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-[#1a1a1a] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (
    categoriasVisibles.length === 0 &&
    extras.length === 0 &&
    productos.length === 0 &&
    paquetes.length === 0 &&
    roles.length === 0
  ) {
    return (
      <p className="text-gray-600 text-sm py-4 text-center">
        No hay equipos disponibles en el inventario todavía.
      </p>
    );
  }

  const productosElegidos = productos.filter((p) => productosSel.some((s) => s.id === p.id));
  const paquetesElegidos = paquetes.filter((p) => paquetesSel.some((s) => s.id === p.id));

  // ── Vista de solo lectura (resumen) ──
  if (readOnly) {
    const conEquipos =
      categoriasElegidas.length > 0 ||
      serviciosElegidos.length > 0 ||
      value.equipos.length > 0 ||
      rolesSel.length > 0 ||
      extras.length > 0 ||
      productosElegidos.length > 0 ||
      paquetesElegidos.length > 0;
    if (!conEquipos) {
      return <p className="text-gray-600 text-sm py-3">Sin equipos seleccionados.</p>;
    }
    return (
      <div className="space-y-3">
        {aCriterioVendedor && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3">
            <p className="text-amber-400 text-xs font-medium">
              <Handshake strokeWidth={1.75} className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> El cliente deja la cantidad exacta de equipos a criterio del vendedor.
              Las categorías marcadas son solo referencia de interés.
            </p>
          </div>
        )}
        {serviciosElegidos.map((svc) => {
          const rs = svc.roles.filter((r) => rolesSel.includes(r.id));
          return (
            <div key={svc.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
              <p className="flex items-center gap-1.5 text-white text-sm font-medium mb-1.5">
                <svc.icon strokeWidth={1.75} className="w-4 h-4 text-[#B3985B]" /> {svc.nombre}
              </p>
              {value.detalles?.[svc.id] && (
                <p className="text-gray-400 text-xs mb-1.5 whitespace-pre-line">{value.detalles[svc.id]}</p>
              )}
              {rs.length === 0 ? (
                <p className="text-amber-500/70 text-xs">Interés marcado · roles por definir</p>
              ) : (
                <ul className="space-y-1">
                  {rs.map((r) => (
                    <li key={r.id} className="text-gray-300 text-xs">
                      {r.nombre}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        {paquetesElegidos.length > 0 && (
          <div className="bg-[#111] border border-[#B3985B]/40 rounded-xl p-3">
            <p className="inline-flex items-center gap-1.5 text-white text-sm font-medium mb-1.5"><Sparkles strokeWidth={1.75} className="w-3.5 h-3.5" /> Paquetes</p>
            <ul className="space-y-1">
              {paquetesElegidos.map((p) => {
                const cant = paquetesSel.find((s) => s.id === p.id)?.cantidad ?? 1;
                return (
                  <li key={p.id} className="text-gray-300 text-xs flex justify-between gap-2">
                    <span>
                      {cant > 1 ? `${cant}× ` : ""}
                      {p.nombre}
                    </span>
                    <span className="text-gray-600">
                      {ETIQUETA_TIPO_EVENTO[p.tipoEvento] ?? p.tipoEvento}
                      {p.rangoPersonas ? ` · ${p.rangoPersonas} pers` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {productosElegidos.length > 0 && (
          <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-3">
            <p className="inline-flex items-center gap-1.5 text-white text-sm font-medium mb-1.5"><Package strokeWidth={1.75} className="w-3.5 h-3.5" /> Productos armados</p>
            <ul className="space-y-1">
              {productosElegidos.map((p) => {
                const cant = productosSel.find((s) => s.id === p.id)?.cantidad ?? 1;
                return (
                  <li key={p.id} className="text-gray-300 text-xs flex justify-between gap-2">
                    <span>
                      {cant > 1 ? `${cant}× ` : ""}
                      {p.nombre}
                    </span>
                    <span className="text-[#B3985B]">${(p.precioFinal * cant).toLocaleString("es-MX")}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {categoriasElegidas.map((cat) => {
          const eqs = cat.equipos.filter((e) => value.equipos.includes(e.id));
          return (
            <div key={cat.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
              <p className="flex items-center gap-1.5 text-white text-sm font-medium mb-1.5">
                <CatIcon nombre={cat.nombre} className="w-4 h-4 text-[#B3985B]" /> {cat.nombre}
              </p>
              {value.detalles?.[cat.id] && (
                <p className="text-gray-400 text-xs mb-1.5 whitespace-pre-line">{value.detalles[cat.id]}</p>
              )}
              {eqs.length === 0 ? (
                <p className="text-amber-500/70 text-xs">Por definir</p>
              ) : (
                <ul className="space-y-1">
                  {eqs.map((eq) => (
                    <li key={eq.id} className="text-gray-300 text-xs flex justify-between gap-2">
                      <span>{nombreEquipo(eq)}</span>
                      <span className="text-[#B3985B]">
                        {cantidades[eq.id] ? `${cantidades[eq.id]} pz` : "sin cantidad"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        {extras.length > 0 && (
          <div className="bg-[#111] border border-dashed border-[#2a2a2a] rounded-xl p-3">
            <p className="inline-flex items-center gap-1.5 text-white text-sm font-medium mb-1.5"><Plus strokeWidth={1.75} className="w-3.5 h-3.5" /> Adicionales (a mano)</p>
            <ul className="space-y-1">
              {extras.map((ex) => (
                <li key={ex.id} className="text-gray-300 text-xs flex justify-between gap-2">
                  <span>
                    {ex.nombre}
                    {ex.categoria ? <span className="text-gray-600"> · {ex.categoria}</span> : null}
                  </span>
                  <span className="text-[#B3985B]">
                    {ex.cantidad ? `${ex.cantidad} pz` : "sin cantidad"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const totalEquipos = value.equipos.length + extras.length + rolesSel.length;

  // Control de cantidad reutilizable: −  [1–50… ▾]  +
  const controlCantidad = (
    cant: number | undefined,
    onSet: (n: number) => void
  ) => (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onSet((cant ?? 0) - 1)}
        className="w-6 h-6 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white text-sm flex items-center justify-center leading-none"
      >
        −
      </button>
      <select
        value={cant ?? 0}
        onChange={(e) => onSet(Number(e.target.value))}
        className="h-6 bg-[#111] border border-[#2a2a2a] rounded-md text-white text-xs px-1 focus:outline-none focus:border-[#B3985B]"
      >
        <option value={0}>—</option>
        {opcionesCantidad(cant ?? 0).map((n) => (
          <option key={n} value={n}>
            {n} pz
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onSet((cant ?? 0) + 1)}
        className="w-6 h-6 rounded-md bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white text-sm flex items-center justify-center leading-none"
      >
        +
      </button>
    </div>
  );

  // ── UI interactiva ──
  return (
    <div className="space-y-3">
      {/* Indicador de pasos (solo vendedor: el paso 2 de equipos es una etapa opcional). */}
      {!clientMode && (
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setPaso(1)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
            paso === 1
              ? "bg-[#B3985B] text-black font-semibold"
              : "bg-[#1a1a1a] text-gray-400 hover:text-white"
          }`}
        >
          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${paso === 1 ? "bg-black/20" : "bg-[#B3985B]/20 text-[#B3985B]"}`}>1</span>
          Categorías
        </button>
        <span className="text-gray-700">→</span>
        <button
          type="button"
          onClick={() => value.categorias.length > 0 && setPaso(2)}
          disabled={value.categorias.length === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            paso === 2
              ? "bg-[#B3985B] text-black font-semibold"
              : "bg-[#1a1a1a] text-gray-400 hover:text-white"
          }`}
        >
          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${paso === 2 ? "bg-black/20" : "bg-[#B3985B]/20 text-[#B3985B]"}`}>2</span>
          Equipos (opcional)
        </button>
      </div>
      )}

      {/* ── PASO 1: elegir categorías ── */}
      {(clientMode || paso === 1) && (
        <div className="space-y-3">
          <p className="text-gray-500 text-xs">
            {clientMode
              ? "¿Qué necesitas para tu evento? Elige las categorías que te interesan y, si quieres, cuéntanos los detalles de cada una. No te preocupes por marcas ni modelos: tu asesor arma la propuesta por ti."
              : "¿Qué tipo de equipo o servicio necesitas? Elige las categorías y describe los detalles. El paso de equipos exactos es opcional; puedes dejarlo para más adelante."}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {categoriasVisibles.map((cat) => {
              const sel = value.categorias.includes(cat.id);
              const marcas = marcasPrincipales(cat);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategoria(cat.id)}
                  title={marcas ? `Marcas: ${marcas}` : undefined}
                  className={`relative flex flex-col items-start gap-0.5 rounded-lg border p-2 text-left transition-all ${
                    sel
                      ? "border-[#B3985B] bg-[#B3985B]/10"
                      : "border-[#1e1e1e] bg-[#111] hover:border-[#B3985B]/40"
                  }`}
                >
                  <CatIcon nombre={cat.nombre} className="w-5 h-5 mb-0.5 text-[#B3985B]" />
                  <span className="text-white text-[11px] font-medium leading-tight line-clamp-2">{cat.nombre}</span>
                  {marcas && !clientMode && (
                    <span className="text-gray-600 text-[9px] leading-tight line-clamp-1">{marcas}</span>
                  )}
                  {sel && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-md bg-[#B3985B] flex items-center justify-center">
                      <span className="text-black text-[8px] font-bold leading-none">✓</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Categorías de servicio (armadas con los roles técnicos vigentes) */}
          {serviciosCategorias.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-[#B3985B] font-medium">Servicios de personal técnico</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {serviciosCategorias.map((svc) => {
                  const sel = value.categorias.includes(svc.id);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => toggleCategoria(svc.id)}
                      className={`relative flex flex-col items-start gap-0.5 rounded-lg border p-2 text-left transition-all ${
                        sel
                          ? "border-[#B3985B] bg-[#B3985B]/10"
                          : "border-[#1e1e1e] bg-[#111] hover:border-[#B3985B]/40"
                      }`}
                    >
                      <svc.icon strokeWidth={1.75} className="w-5 h-5 mb-0.5 text-[#B3985B]" />
                      <span className="text-white text-[11px] font-medium leading-tight line-clamp-2">{svc.nombre}</span>
                      {!clientMode && (
                        <span className="text-gray-600 text-[9px] leading-tight line-clamp-1">{svc.roles.length > 0 ? `${svc.roles.length} rol${svc.roles.length !== 1 ? "es" : ""}` : "por asignar"}</span>
                      )}
                      {sel && (
                        <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-md bg-[#B3985B] flex items-center justify-center">
                          <span className="text-black text-[8px] font-bold leading-none">✓</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detalle libre por categoría elegida — descripción sin necesidad de saber de equipo */}
          {(categoriasElegidas.length > 0 || serviciosElegidos.length > 0) && (
            <div className="space-y-2 pt-2 border-t border-[#1a1a1a]">
              <p className="text-[11px] text-[#B3985B] font-medium">Detalles de lo que necesitas (opcional)</p>
              <p className="text-[10px] text-gray-600">
                Cuéntanos en tus palabras qué buscas de cada categoría. No hace falta que sepas de equipos.
              </p>
              {categoriasElegidas.map((cat) => (
                <div key={cat.id}>
                  <label className="flex items-center gap-1.5 text-white text-xs font-medium mb-1">
                    <CatIcon nombre={cat.nombre} className="w-3.5 h-3.5 text-[#B3985B]" /> {cat.nombre}
                  </label>
                  <textarea
                    value={value.detalles?.[cat.id] ?? ""}
                    onChange={(e) => setDetalle(cat.id, e.target.value)}
                    rows={2}
                    placeholder="Ej: música en vivo y ambiente, salón para ~200 personas…"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                  />
                </div>
              ))}
              {serviciosElegidos.map((svc) => (
                <div key={svc.id}>
                  <label className="flex items-center gap-1.5 text-white text-xs font-medium mb-1">
                    <svc.icon strokeWidth={1.75} className="w-3.5 h-3.5 text-[#B3985B]" /> {svc.nombre}
                  </label>
                  <textarea
                    value={value.detalles?.[svc.id] ?? ""}
                    onChange={(e) => setDetalle(svc.id, e.target.value)}
                    rows={2}
                    placeholder="Ej: DJ para fiesta, horario aproximado, estilo musical…"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Notas técnicas / equipo faltante — solo vendedor (el cliente no necesita marcas/modelos) */}
          {onNotasChange && !clientMode && (
            <div className="pt-1">
              <label className="text-[11px] text-[#B3985B] font-medium block mb-1">
                Notas técnicas / equipo faltante
              </label>
              <p className="text-[10px] text-gray-600 mb-1.5">
                Marcas o modelos específicos, o cualquier equipo que no encuentres en las categorías.
              </p>
              <textarea
                value={notas ?? ""}
                onChange={(e) => onNotasChange(e.target.value)}
                rows={2}
                placeholder="Ej: 4 micrófonos Shure ULXD, consola Digico SD12..."
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
              />
            </div>
          )}

          {clientMode ? (
            /* Cliente: no elige equipos; puede ver el inventario en una ventana aparte sin cerrar el formulario. */
            <a
              href="/presentacion/inventario"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#B3985B]/40 text-[#B3985B] text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              <ExternalLink strokeWidth={1.75} className="w-4 h-4" /> Ver inventario Mainstage
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setPaso(2)}
              disabled={value.categorias.length === 0}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {value.categorias.length === 0
                ? "Elige al menos una categoría"
                : `Seleccionar equipos exactos (opcional) — ${value.categorias.length} categoría${value.categorias.length !== 1 ? "s" : ""} →`}
            </button>
          )}
        </div>
      )}

      {/* ── PASO 2: equipos individuales + paquetes armados (solo vendedor) ── */}
      {!clientMode && paso === 2 && (
        <div className="space-y-3">
          {/* Sub-pestañas: equipos individuales · productos armados · paquetes */}
          <div className="flex items-center gap-1.5 p-1 bg-[#111] rounded-xl">
            <button
              type="button"
              onClick={() => setSubTab("equipos")}
              className={`inline-flex items-center justify-center gap-1.5 flex-1 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                subTab === "equipos" ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              <SlidersHorizontal strokeWidth={1.75} className="w-3.5 h-3.5" /> Equipos
            </button>
            {productos.length > 0 && (
              <button
                type="button"
                onClick={() => setSubTab("productos")}
                className={`relative inline-flex items-center justify-center gap-1.5 flex-1 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  subTab === "productos" ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                <Package strokeWidth={1.75} className="w-3.5 h-3.5" /> Productos
                {subTab !== "productos" && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#1e1e1e] text-gray-400 text-[9px] font-bold align-middle">
                    {productos.length}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSubTab("paquetes")}
              className={`relative inline-flex items-center justify-center gap-1.5 flex-1 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all overflow-hidden ${
                subTab === "paquetes"
                  ? "bg-gradient-to-r from-[#B3985B] to-[#d4b876] text-black shadow-lg shadow-[#B3985B]/25"
                  : "text-[#B3985B] bg-gradient-to-r from-[#B3985B]/15 to-[#B3985B]/5 ring-1 ring-[#B3985B]/40 hover:from-[#B3985B]/25"
              }`}
            >
              <Sparkles strokeWidth={1.75} className="w-3.5 h-3.5" /> Paquetes
              {subTab !== "paquetes" && paquetes.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#B3985B] text-black text-[9px] font-bold align-middle">
                  {paquetes.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Sub-pestaña: EQUIPOS INDIVIDUALES ── */}
          {subTab === "equipos" && (
          <div className="space-y-4">
          {categoriasElegidas.length === 0 && serviciosElegidos.length === 0 && extras.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm mb-3">Primero elige una o más categorías.</p>
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="text-[#B3985B] text-sm hover:underline"
              >
                ← Volver a categorías
              </button>
            </div>
          ) : (
            <>
              {/* Toggle: dejar la cantidad exacta de equipos a criterio del vendedor */}
              <button
                type="button"
                onClick={() => setACriterioVendedor(!aCriterioVendedor)}
                className={`w-full flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                  aCriterioVendedor
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-[#1e1e1e] bg-[#0d0d0d] hover:border-amber-500/30"
                }`}
              >
                <span className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 ${aCriterioVendedor ? "bg-amber-500 border-amber-500" : "border-[#444]"}`}>
                  {aCriterioVendedor && <span className="text-black text-[9px] font-bold leading-none">✓</span>}
                </span>
                <span className="min-w-0">
                  <span className="block text-white text-xs font-medium">
                    <Handshake strokeWidth={1.75} className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> Dejar la cantidad de equipos a criterio del vendedor
                  </span>
                  <span className="block text-gray-500 text-[10px] leading-tight mt-0.5">
                    Marcas solo las categorías de interés y el vendedor define los equipos y las piezas exactas.
                  </span>
                </span>
              </button>

              {aCriterioVendedor ? (
                <div className="space-y-1.5">
                  <p className="text-gray-500 text-xs">
                    Categorías marcadas como referencia. El vendedor propondrá los equipos:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {categoriasElegidas.map((cat) => (
                      <span key={cat.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-[#B3985B]/10 border border-[#B3985B]/30 text-[#B3985B]">
                        <CatIcon nombre={cat.nombre} className="w-3.5 h-3.5" /> {cat.nombre}
                      </span>
                    ))}
                    {serviciosElegidos.map((svc) => (
                      <span key={svc.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-[#B3985B]/10 border border-[#B3985B]/30 text-[#B3985B]">
                        <svc.icon strokeWidth={1.75} className="w-3.5 h-3.5" /> {svc.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
              <>
              <p className="text-gray-500 text-xs">
                Toca cada categoría para desplegarla, marca los equipos y ajusta las piezas con − / + o el menú.
              </p>

              {/* Categorías de servicio (roles técnicos) — colapsables */}
              {serviciosElegidos.map((svc) => {
                const abierta = expandidas.has(svc.id);
                const nSel = svc.roles.filter((r) => rolesSel.includes(r.id)).length;
                const sinRoles = svc.roles.length === 0;
                return (
                  <div key={svc.id} className="rounded-lg border border-[#1e1e1e] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { if (!sinRoles) toggleExpandida(svc.id); }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-[#0d0d0d] hover:bg-[#141414] transition-colors"
                    >
                      <span className="text-[#B3985B] text-xs font-semibold flex items-center gap-1.5">
                        <svc.icon strokeWidth={1.75} className="w-3.5 h-3.5" /> {svc.nombre}
                        {nSel > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#B3985B] text-black font-bold">{nSel}</span>
                        )}
                      </span>
                      <span className="text-gray-500 text-xs">{sinRoles ? "el vendedor asigna" : abierta ? "▲ ocultar" : "▼ elegir roles"}</span>
                    </button>
                    {abierta && !sinRoles && (
                      <div className="p-2 space-y-1.5 bg-black/40">
                        {svc.roles.map((r) => {
                          const sel = rolesSel.includes(r.id);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => toggleRol(r.id)}
                              className={`w-full flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all ${
                                sel ? "border-[#B3985B]/60 bg-[#B3985B]/[0.06]" : "border-[#1e1e1e] bg-[#0d0d0d]"
                              }`}
                            >
                              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${sel ? "bg-[#B3985B] border-[#B3985B]" : "border-[#333]"}`}>
                                {sel && <span className="text-black text-[9px] font-bold leading-none">✓</span>}
                              </span>
                              <span className="flex flex-col min-w-0">
                                <span className="text-white text-xs font-medium leading-tight truncate">{r.nombre}</span>
                                {r.descripcion && (
                                  <span className="text-gray-500 text-[10px] leading-tight line-clamp-1">{r.descripcion}</span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Categorías de inventario — colapsables (colapsadas por defecto) */}
              {categoriasElegidas.map((cat) => {
                const abierta = expandidas.has(cat.id);
                const nSel = cat.equipos.filter((e) => value.equipos.includes(e.id)).length;
                return (
                <div key={cat.id} className="rounded-lg border border-[#1e1e1e] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleExpandida(cat.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-[#0d0d0d] hover:bg-[#141414] transition-colors"
                  >
                    <span className="text-[#B3985B] text-xs font-semibold flex items-center gap-1.5">
                      <CatIcon nombre={cat.nombre} className="w-3.5 h-3.5" /> {cat.nombre}
                      {nSel > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#B3985B] text-black font-bold">{nSel}</span>
                      )}
                    </span>
                    <span className="text-gray-500 text-xs">{abierta ? "▲ ocultar" : "▼ elegir equipo"}</span>
                  </button>
                  {abierta && (
                  <div className="p-2 bg-black/40">
                  {cat.equipos.length === 0 ? (
                    <p className="text-gray-600 text-[11px] px-1">
                      Sin equipos listados — se queda marcada como interés, lo definimos juntos.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {cat.equipos.map((eq) => {
                        const sel = value.equipos.includes(eq.id);
                        const cant = cantidades[eq.id];
                        return (
                          <div
                            key={eq.id}
                            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-all ${
                              sel ? "border-[#B3985B]/60 bg-[#B3985B]/[0.06]" : "border-[#1e1e1e] bg-[#0d0d0d]"
                            }`}
                          >
                            {/* Miniatura + toggle */}
                            <button
                              type="button"
                              onClick={() => toggleEquipo(eq.id)}
                              className="flex items-center gap-2 flex-1 min-w-0 text-left"
                            >
                              <span className="relative w-9 h-9 rounded-md bg-[#1a1a1a] flex items-center justify-center shrink-0 overflow-hidden">
                                {eq.imagenUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={eq.imagenUrl} alt={eq.descripcion} className="w-full h-full object-cover" />
                                ) : (
                                  <CatIcon nombre={cat.nombre} className="w-4 h-4 text-gray-700" />
                                )}
                              </span>
                              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${sel ? "bg-[#B3985B] border-[#B3985B]" : "border-[#333]"}`}>
                                {sel && <span className="text-black text-[9px] font-bold leading-none">✓</span>}
                              </span>
                              <span className="flex flex-col min-w-0">
                                <span className="text-white text-xs font-medium leading-tight truncate">
                                  {nombreEquipo(eq)}
                                </span>
                                {eq.descripcion && eq.descripcion !== nombreEquipo(eq) && (
                                  <span className="text-gray-500 text-[10px] leading-tight line-clamp-2">
                                    {eq.descripcion}
                                  </span>
                                )}
                              </span>
                            </button>

                            {/* Cantidad (solo si está seleccionado) */}
                            {sel && controlCantidad(cant, (n) => setCantidad(eq.id, n))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                  )}
                </div>
                );
              })}
              </>
              )}

              {/* ── Categoría / equipo adicional (a mano, solo este trato) ── */}
              <div className="space-y-2 pt-1 border-t border-[#1a1a1a]">
                <p className="inline-flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                  <Plus strokeWidth={1.75} className="w-3.5 h-3.5" /> ¿Falta una categoría o equipo?
                </p>
                <p className="text-gray-600 text-[10px] -mt-1">
                  Agrégalo a mano solo para este trato (no se guarda en el inventario).
                </p>
                {extras.length > 0 && (
                  <div className="space-y-1.5">
                    {extras.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-[#2a2a2a] bg-[#0d0d0d] px-2 py-1.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium leading-tight truncate">{ex.nombre}</p>
                          {ex.categoria && (
                            <p className="text-gray-600 text-[10px] leading-tight truncate">{ex.categoria}</p>
                          )}
                        </div>
                        {controlCantidad(ex.cantidad, (n) => setExtraCantidad(ex.id, n))}
                        <button
                          type="button"
                          onClick={() => removeExtra(ex.id)}
                          className="w-6 h-6 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 text-sm flex items-center justify-center shrink-0"
                          aria-label="Quitar"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={extraNombre}
                    onChange={(e) => setExtraNombre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addExtra();
                      }
                    }}
                    placeholder="Equipo o categoría (ej: Máquina de humo Antari)"
                    className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                  <input
                    value={extraCategoria}
                    onChange={(e) => setExtraCategoria(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addExtra();
                      }
                    }}
                    placeholder="Categoría (opcional)"
                    className="sm:w-40 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                  <button
                    type="button"
                    onClick={addExtra}
                    disabled={!extraNombre.trim()}
                    className="bg-[#1e1e1e] hover:bg-[#2a2a2a] disabled:opacity-40 disabled:cursor-not-allowed text-[#B3985B] text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Resumen + navegación */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="text-gray-400 text-xs hover:text-white transition-colors"
                >
                  ← Categorías
                </button>
                {totalEquipos > 0 && (
                  <span className="text-[#B3985B] text-xs font-medium">
                    ✓ {totalEquipos} equipo{totalEquipos !== 1 ? "s" : ""} seleccionado
                    {totalEquipos !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </>
          )}
          </div>
          )}

          {/* ── Sub-pestaña: PRODUCTOS ARMADOS ── */}
          {subTab === "productos" && (
            <div className="space-y-2">
              <p className="text-gray-500 text-xs">
                Sistemas y productos ya armados, agrupados por categoría y por marca/modelo del equipo principal. Abre un modelo para ver sus opciones; al elegir un producto se consideran todos sus equipos para la disponibilidad.
              </p>
              {hayCapacidad && (
                <button
                  type="button"
                  onClick={() => setSoloRecomendadosProd((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                    soloRecomendadosProd ? "bg-[#B3985B] text-black font-semibold" : "bg-[#1a1a1a] text-gray-400 hover:text-white"
                  }`}
                >
                  <Sparkles strokeWidth={1.75} className="w-3 h-3" /> Solo recomendados para la capacidad
                </button>
              )}
              {productosPorCategoria.map((grupo) => {
                const totalCat = grupo.marcas.reduce((n, m) => n + m.items.length, 0);
                return (
                <div key={grupo.nombre} className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-[#B3985B] text-xs font-semibold uppercase tracking-wider pt-1">
                    <CatIcon nombre={grupo.nombre} className="w-3.5 h-3.5" /> {grupo.nombre}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-gray-400 font-bold normal-case tracking-normal">
                      {totalCat}
                    </span>
                  </p>
                  <div className="space-y-1.5">
                    {grupo.marcas.map((marca) => {
                      const clave = `${grupo.nombre}::${marca.marcaModelo}`;
                      const abierta = marcasExpandidas.has(clave);
                      const elegidos = marca.items.filter((p) => productosSel.some((s) => s.id === p.id)).length;
                      // Miniatura del equipo dominante: usamos la imagen del primer producto
                      // del grupo que tenga una (por defecto es la del equipo dominante).
                      const miniatura = marca.items.find((p) => p.imagenUrl)?.imagenUrl ?? null;
                      return (
                        <div key={clave} className="rounded-xl border border-[#1e1e1e] bg-[#0a0a0a] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleMarca(clave)}
                            className="flex items-center gap-2 w-full text-left px-2.5 py-2 hover:bg-[#111]"
                          >
                            <span className={`text-gray-500 text-[10px] transition-transform shrink-0 ${abierta ? "rotate-90" : ""}`}>▶</span>
                            <span className="w-9 h-9 rounded-lg bg-[#1a1a1a] overflow-hidden shrink-0 flex items-center justify-center">
                              {miniatura ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={miniatura} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package strokeWidth={1.75} className="w-4 h-4 text-gray-700" />
                              )}
                            </span>
                            <span className="text-white text-xs font-semibold leading-tight flex-1 min-w-0 truncate">
                              {marca.marcaModelo}
                            </span>
                            {elegidos > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#B3985B] text-black font-bold">
                                {elegidos} ✓
                              </span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-gray-400 font-bold">
                              {marca.items.length}
                            </span>
                          </button>
                          {abierta && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 pt-0">
                              {marca.items.map((p) => {
                                const sel = productosSel.some((s) => s.id === p.id);
                                const cant = productosSel.find((s) => s.id === p.id)?.cantidad ?? 1;
                                return (
                                  <div
                                    key={p.id}
                                    className={`rounded-xl border p-2.5 transition-all ${
                                      sel ? "border-[#B3985B] bg-[#B3985B]/[0.06]" : "border-[#1e1e1e] bg-[#0d0d0d]"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleProducto(p.id)}
                                      className="flex items-start gap-2.5 w-full text-left"
                                    >
                                      <span className="w-12 h-12 rounded-lg bg-[#1a1a1a] overflow-hidden shrink-0 flex items-center justify-center">
                                        {p.imagenUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={p.imagenUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <Package strokeWidth={1.75} className="w-4 h-4 text-gray-700" />
                                        )}
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-1.5">
                                          <span
                                            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                              sel ? "bg-[#B3985B] border-[#B3985B]" : "border-[#333]"
                                            }`}
                                          >
                                            {sel && <span className="text-black text-[9px] font-bold leading-none">✓</span>}
                                          </span>
                                          <span className="text-white text-xs font-medium leading-tight">{p.nombre}</span>
                                          {hayCapacidad && matchProducto.get(p.id) === "match" && (
                                            <span className="text-[8px] bg-emerald-500/15 text-emerald-400 rounded px-1 py-0.5 shrink-0">Recomendado</span>
                                          )}
                                        </span>
                                        {p.descripcion && (
                                          <span className="block text-gray-500 text-[10px] leading-tight line-clamp-2 mt-0.5">
                                            {p.descripcion}
                                          </span>
                                        )}
                                        <span className="block text-[#B3985B] text-[11px] font-semibold mt-1">
                                          ${p.precioFinal.toLocaleString("es-MX")}
                                        </span>
                                      </span>
                                    </button>
                                    {sel && (
                                      <div className="flex items-center justify-end mt-1.5">
                                        {controlCantidad(cant, (n) => setProductoCantidad(p.id, n))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* ── Sub-pestaña: PAQUETES ── */}
          {subTab === "paquetes" && (
            <div className="space-y-2">
              <p className="text-gray-500 text-xs">
                Paquetes del tipo de evento{filtroCapacidad.subtipos && filtroCapacidad.subtipos.length > 0 ? " y nicho" : ""} de este evento. Se desglosan en la cotización con sus equipos y conceptos.
              </p>
              {paquetes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#2a2a2a] bg-[#0d0d0d] px-4 py-8 text-center">
                  <Sparkles strokeWidth={1.75} className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <p className="text-gray-400 text-sm font-medium">Aún no hay paquetes armados</p>
                  <p className="text-gray-600 text-[11px] leading-relaxed mt-1">
                    Crea paquetes comerciales en el módulo de Paquetes y productos y aparecerán aquí para elegirlos en el descubrimiento.
                  </p>
                </div>
              ) : paquetesVisibles.length === 0 ? (
                <p className="text-gray-600 text-[11px] rounded-xl border border-dashed border-[#2a2a2a] bg-[#0d0d0d] px-4 py-6 text-center">
                  Ningún paquete aplica a este tipo de evento.
                </p>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {paquetesVisibles.map((p) => {
                  const sel = paquetesSel.some((s) => s.id === p.id);
                  const cant = paquetesSel.find((s) => s.id === p.id)?.cantidad ?? 1;
                  const numEquipos = p.items.reduce((a, it) => a + (it.cantidad || 1), 0);
                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border p-2.5 transition-all ${
                        sel ? "border-[#B3985B] bg-[#B3985B]/[0.06]" : "border-[#1e1e1e] bg-[#0d0d0d]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => togglePaquete(p.id)}
                        className="flex items-start gap-2.5 w-full text-left"
                      >
                        <span className="w-12 h-12 rounded-lg bg-[#1a1a1a] overflow-hidden shrink-0 flex items-center justify-center">
                          {p.imagenes[0]?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imagenes[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Sparkles strokeWidth={1.75} className="w-4 h-4 text-gray-700" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                sel ? "bg-[#B3985B] border-[#B3985B]" : "border-[#333]"
                              }`}
                            >
                              {sel && <span className="text-black text-[9px] font-bold leading-none">✓</span>}
                            </span>
                            <span className="text-white text-xs font-medium leading-tight">{p.nombre}</span>
                          </span>
                          {(p.resumen || p.descripcion) && (
                            <span className="block text-gray-500 text-[10px] leading-tight line-clamp-2 mt-0.5">
                              {p.resumen || p.descripcion}
                            </span>
                          )}
                          <span className="flex flex-wrap items-center gap-1 mt-1">
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-gray-400">
                              {ETIQUETA_TIPO_EVENTO[p.tipoEvento] ?? p.tipoEvento}
                            </span>
                            {p.rangoPersonas && (
                              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-gray-400">
                                <Users strokeWidth={1.75} className="w-3 h-3" /> {p.rangoPersonas}
                              </span>
                            )}
                            {numEquipos > 0 && (
                              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-gray-400">
                                <SlidersHorizontal strokeWidth={1.75} className="w-3 h-3" /> {numEquipos}
                              </span>
                            )}
                            {p.conceptos.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-gray-400">
                                <Settings strokeWidth={1.75} className="w-3 h-3" /> {p.conceptos.length}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                      {sel && (
                        <div className="flex items-center justify-end mt-1.5">
                          {controlCantidad(cant, (n) => setPaqueteCantidad(p.id, n))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}
        </div>
      )}

      {!clientMode && paso === 2 && subTab === "equipos" && (
        <p className="text-gray-700 text-[11px] pt-1 text-center">
          Si no encuentras lo que necesitas, agrégalo arriba o menciónalo en las notas.
        </p>
      )}
    </div>
  );
}
