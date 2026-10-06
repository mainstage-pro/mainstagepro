"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, RotateCw, Trash2, FileDown, Link2, ExternalLink, Anchor, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useToast } from "@/components/Toast";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import ArbolZonasLayout from "@/components/proyectos/ArbolZonasLayout";
import DetalleZonaLayout, { type CambioPosicion } from "@/components/proyectos/DetalleZonaLayout";
import {
  PALETA_BACKLINE,
  cajaDe,
  colocadasPorPosicion,
  nuevoIdArea,
  nuevoIdPieza,
  parsearLayout,
  rotuloEnLineas,
  snap,
  totalesDeLayout,
  type Area,
  type ItemPaleta,
  type Pieza,
} from "@/lib/layout-escenario";
import {
  SIN_ZONA,
  agruparPorZona,
  colorZona,
  geometriaSubzona,
  geometriaZona,
  type EquipoDelRider,
  type ItemDeZona,
  type PosicionDelRider,
} from "@/lib/layout-zonas";

export type { EquipoDelRider, PosicionDelRider };

/** Medidas del escenario cuando no se capturaron: suficiente para empezar a dibujar. */
const ANCHO_DEFAULT = 12;
const LARGO_DEFAULT = 8;

/** El escenario siempre mide 100 unidades de viewBox de ancho; el resto se escala a eso. */
const VB_ANCHO = 100;

/** Alto de un renglón de la guía de colores, en unidades de viewBox. */
const FILA_LEYENDA = 4.6;
const COLS_LEYENDA = 3;

const BOTON = "text-[11px] px-2 py-1 rounded border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#444] transition-colors disabled:opacity-40 flex items-center gap-1";

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), Math.max(min, max));
}

/**
 * Un renglón del banco. El banco no es la lista de equipos sino la de POSICIONES de
 * montaje: el mismo modelo puede entrar cuatro veces como PA principal y dos como
 * sidefill, y en el plano eso son seis piezas con rótulos distintos.
 */
type RenglonBanco = {
  clave: string;
  posicionId?: string;
  proyectoEquipoId: string;
  equipoId: string;
  titulo: string;
  modelo: string;
  detalle: string;
  cantidad: number;
  imagenUrl?: string;
  anchoM: number;
  largoM: number;
  pesoKg?: number;
  colgado: boolean;
};

type Seleccion = { tipo: "pieza" | "area"; id: string } | null;

/**
 * Texto que cabe dentro de un rectángulo del plano: primero se achica la letra y,
 * si aun así no entra, se recorta. Un rótulo ilegible estorba más que ayuda.
 */
function rotulo(label: string, anchoVb: number, maximo: number) {
  const util = Math.max(2, anchoVb - 2);
  const fs = Math.max(1.4, Math.min(maximo, util / (0.52 * Math.max(1, label.length))));
  const caben = Math.floor(util / (0.52 * fs));
  const texto = label.length > caben ? `${label.slice(0, Math.max(1, caben - 1))}…` : label;
  return { texto, fs };
}

/**
 * De dónde sale el dibujo y a dónde vuelve. El mismo editor sirve al escenario de
 * un proyecto de eventos y al stage plot de una fecha de gira: lo único que cambia
 * son los endpoints, así que la procedencia entra como dato y no se bifurca aquí.
 */
export type ApiLayout = {
  /** PATCH `{ layout }`: donde se autoguarda el dibujo. */
  guardar: string;
  /** GET `{ url }` del link público. Ausente = esta procedencia no publica plano. */
  link?: string;
  /** GET del PDF de layout de producción. Ausente = no hay documento que armar. */
  pdf?: string;
  /**
   * POST/PATCH de las posiciones de montaje de un equipo del rider. Ausente = este
   * plano no tiene rider detrás (el stage plot de una plaza): se dibuja con el
   * backline y las zonas libres, sin banco ni carga eléctrica.
   */
  posiciones?: (proyectoEquipoId: string) => string;
};

export default function LayoutEscenario({
  api,
  nombre,
  anchoM,
  largoM,
  layoutInicial,
  rider: riderInicial,
}: {
  api: ApiLayout;
  nombre: string;
  anchoM: number | null;
  largoM: number | null;
  layoutInicial: string | null;
  rider: EquipoDelRider[];
}) {
  const toast = useToast();
  const { downloading, downloadPdf } = usePdfDownload();
  const ancho = anchoM && anchoM > 0 ? anchoM : ANCHO_DEFAULT;
  const largo = largoM && largoM > 0 ? largoM : LARGO_DEFAULT;

  /** Si no hay endpoint de posiciones, este plano no cuelga de un rider. */
  const conRider = !!api.posiciones;

  const guardado = useMemo(() => parsearLayout(layoutInicial), [layoutInicial]);
  const [rider, setRider] = useState<EquipoDelRider[]>(riderInicial);
  const [piezas, setPiezas] = useState<Pieza[]>(guardado.piezas);
  const [areas, setAreas] = useState<Area[]>(guardado.areas);
  const [sel, setSel] = useState<Seleccion>(null);
  const [claveSel, setClaveSel] = useState<string | null>(null);
  const [estado, setEstado] = useState<"limpio" | "sucio" | "guardando">("limpio");
  const [guardandoRider, setGuardandoRider] = useState(false);
  const [vista, setVista] = useState({ zoom: 1, x: 0, y: 0 });
  const [capas, setCapas] = useState({ zonas: true, subzonas: true, piso: true, colgado: true, rotulos: true });
  const [copias, setCopias] = useState("3");
  const [linkPublico, setLinkPublico] = useState<string | null>(null);

  const lienzoRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const arrastre = useRef<{ tipo: "pieza" | "area"; id: string; dx: number; dy: number } | null>(null);
  const redim = useRef<{ id: string } | null>(null);
  const escala = useRef<{ id: string; cx: number; cy: number; d0: number; anchoM: number; largoM: number } | null>(null);
  const giro = useRef<{ id: string; cx: number; cy: number } | null>(null);
  const paneo = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const soltando = useRef<RenglonBanco | ItemPaleta | null>(null);
  const primerRender = useRef(true);
  const huellaPendiente = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zonas = useMemo(() => agruparPorZona(rider), [rider]);
  const totales = useMemo(() => totalesDeLayout(piezas), [piezas]);
  const colocadas = useMemo(() => colocadasPorPosicion(piezas), [piezas]);
  const clavesColocadas = useMemo(() => new Set(areas.map(a => a.clave)), [areas]);

  const cargaTotal = useMemo(
    () => zonas.reduce(
      (acc, z) => ({
        amperaje110: acc.amperaje110 + z.carga.amperaje110,
        amperaje220: acc.amperaje220 + z.carga.amperaje220,
        watts: acc.watts + z.carga.watts,
        sinDato: acc.sinDato + z.carga.sinDato,
      }),
      { amperaje110: 0, amperaje220: 0, watts: 0, sinDato: 0 },
    ),
    [zonas],
  );

  const banco = useMemo<RenglonBanco[]>(() => {
    const filas: RenglonBanco[] = [];
    for (const z of zonas) {
      for (const s of z.subzonas) {
        for (const i of s.items) {
          filas.push({
            clave: i.clave,
            posicionId: i.posicionId ?? undefined,
            proyectoEquipoId: i.proyectoEquipoId,
            equipoId: i.equipoId,
            titulo: i.funcion ? s.etiqueta : i.nombre,
            modelo: i.nombre,
            detalle:
              [i.soporteLabel || null, z.zonaId === SIN_ZONA ? null : z.etiqueta, i.alturaM != null ? `${i.alturaM} m` : null]
                .filter(Boolean)
                .join(" · ") || "Sin soporte ni zona",
            cantidad: i.cantidad,
            imagenUrl: i.imagenUrl ?? undefined,
            anchoM: i.huellaAnchoM,
            largoM: i.huellaLargoM,
            pesoKg: i.pesoUnitarioKg ?? undefined,
            colgado: i.colgado,
          });
        }
      }
    }
    return filas;
  }, [zonas]);

  const grupoSel = useMemo(() => {
    if (!claveSel) return null;
    for (const z of zonas) {
      if (z.clave === claveSel) {
        return {
          titulo: z.etiqueta,
          subtitulo: `${z.subzonas.length} configuración${z.subzonas.length === 1 ? "" : "es"}`,
          color: z.color,
          zonaId: z.zonaId,
          items: z.subzonas.flatMap(s => s.items),
          carga: z.carga,
          pesoKg: z.pesoKg,
        };
      }
      const s = z.subzonas.find(x => x.clave === claveSel);
      if (s) {
        return {
          titulo: s.etiqueta,
          subtitulo: z.etiqueta,
          color: s.color,
          zonaId: z.zonaId,
          items: s.items,
          carga: s.carga,
          pesoKg: s.pesoKg,
        };
      }
    }
    return null;
  }, [claveSel, zonas]);

  const areaSel = sel?.tipo === "area" ? areas.find(a => a.id === sel.id) ?? null : null;
  const piezaSel = sel?.tipo === "pieza" ? piezas.find(p => p.id === sel.id) ?? null : null;

  const pxPorM = VB_ANCHO / ancho;
  const vbAncho = VB_ANCHO;
  const vbLargo = largo * pxPorM;

  const leyenda = useMemo(() => {
    const filas: { color: string; texto: string }[] = [];
    if (capas.zonas) for (const a of areas) if (a.clase === "ZONA") filas.push({ color: a.color, texto: a.etiqueta });
    if (capas.subzonas) for (const a of areas) if (a.clase === "SUBZONA") filas.push({ color: a.color, texto: a.etiqueta });
    return filas;
  }, [areas, capas.zonas, capas.subzonas]);

  const altoLeyenda = leyenda.length === 0 ? 0 : Math.ceil(leyenda.length / COLS_LEYENDA) * FILA_LEYENDA + 5;

  // Autosave con retraso: arrastrar una pieza dispara decenas de cambios de estado y
  // no tiene sentido mandar un PATCH por cada pixel.
  useEffect(() => {
    if (primerRender.current) { primerRender.current = false; return; }
    setEstado("sucio");
    const t = setTimeout(async () => {
      setEstado("guardando");
      const r = await fetch(api.guardar, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: JSON.stringify({ piezas, areas }) }),
      });
      if (!r.ok) { toast.error("No se pudo guardar el layout"); setEstado("sucio"); return; }
      setEstado("limpio");
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piezas, areas]);

  /** Punto del cursor en unidades del viewBox del SVG (antes de zoom y paneo). */
  const aSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  /** Punto del cursor en metros de escenario, ya descontando zoom y paneo. */
  const aMetros = useCallback((clientX: number, clientY: number) => {
    const s = aSvg(clientX, clientY);
    if (!s) return null;
    return {
      x: (s.x - vista.x) / vista.zoom / pxPorM,
      y: (s.y - vista.y) / vista.zoom / pxPorM,
    };
  }, [aSvg, vista, pxPorM]);

  // ── Áreas ──────────────────────────────────────────────────────────────────

  const acotar = useCallback((g: { x: number; y: number; anchoM: number; largoM: number }) => {
    const a = clamp(g.anchoM, 0.5, ancho);
    const l = clamp(g.largoM, 0.5, largo);
    return { x: clamp(g.x, 0, ancho - a), y: clamp(g.y, 0, largo - l), anchoM: a, largoM: l };
  }, [ancho, largo]);

  /** Dibuja una zona o configuración que todavía no está en el plano. */
  const nuevaArea = useCallback((clave: string, actuales: Area[]): Area | null => {
    for (let zi = 0; zi < zonas.length; zi++) {
      const z = zonas[zi];
      if (z.clave === clave) {
        return {
          id: nuevoIdArea(), clase: "ZONA", clave, zona: z.zonaId, etiqueta: z.etiqueta, color: z.color,
          ...acotar(geometriaZona(z.zonaId, ancho, largo, zi)),
        };
      }
      const si = z.subzonas.findIndex(s => s.clave === clave);
      if (si >= 0) {
        const s = z.subzonas[si];
        // La configuración se acomoda DENTRO de su zona si ya está dibujada; si no,
        // dentro del lugar que la zona ocuparía, para que no quede suelta en el plano.
        const areaZona = actuales.find(a => a.clase === "ZONA" && a.clave === z.clave);
        const caja = areaZona
          ? { x: areaZona.x, y: areaZona.y, anchoM: areaZona.anchoM, largoM: areaZona.largoM }
          : geometriaZona(z.zonaId, ancho, largo, zi);
        return {
          id: nuevoIdArea(), clase: "SUBZONA", clave, zona: z.zonaId, funcion: s.funcion ?? undefined,
          etiqueta: s.etiqueta, color: s.color,
          ...acotar(geometriaSubzona(si, z.subzonas.length, caja, ancho, largo)),
        };
      }
    }
    return null;
  }, [zonas, ancho, largo, acotar]);

  function colocarArea(clave: string) {
    setAreas(prev => {
      if (prev.some(a => a.clave === clave)) return prev;
      const a = nuevaArea(clave, prev);
      return a ? [...prev, a] : prev;
    });
    setClaveSel(clave);
  }

  function generarAreas() {
    const acc = [...areas];
    // Primero las zonas: las configuraciones se acomodan dentro de ellas.
    for (const z of zonas) {
      if (acc.some(a => a.clave === z.clave)) continue;
      const a = nuevaArea(z.clave, acc);
      if (a) acc.push(a);
    }
    for (const z of zonas) {
      for (const s of z.subzonas) {
        if (acc.some(a => a.clave === s.clave)) continue;
        const a = nuevaArea(s.clave, acc);
        if (a) acc.push(a);
      }
    }
    if (acc.length === areas.length) {
      toast.info("Ya están dibujadas todas las áreas del rider");
      return;
    }
    setAreas(acc);
  }

  function agregarZonaLibre(etiqueta: string) {
    const nombreZona = etiqueta.trim();
    if (!nombreZona) return;
    const zona = `LIBRE_${nombreZona.toUpperCase().replace(/\s+/g, "_")}`;
    setAreas(prev => {
      if (prev.some(a => a.zona === zona)) return prev;
      return [...prev, {
        id: nuevoIdArea(), clase: "ZONA", clave: "", zona, etiqueta: nombreZona, color: colorZona(zona),
        ...acotar(geometriaZona(zona, ancho, largo, prev.length)),
      }];
    });
  }

  function mutarArea(id: string, cambio: Partial<Area>) {
    setAreas(prev => prev.map(a => a.id === id ? { ...a, ...cambio } : a));
  }

  /** Mover una zona arrastra con ella sus configuraciones: están dentro, no al lado. */
  function moverArea(id: string, x: number, y: number) {
    setAreas(prev => {
      const a = prev.find(q => q.id === id);
      if (!a) return prev;
      const dx = x - a.x;
      const dy = y - a.y;
      if (a.clase !== "ZONA" || !a.clave) return prev.map(q => q.id === id ? { ...q, x, y } : q);
      const prefijo = `${a.clave}::`;
      return prev.map(q => {
        if (q.id === id) return { ...q, x, y };
        if (q.clase === "SUBZONA" && q.clave.startsWith(prefijo)) {
          return { ...q, x: clamp(q.x + dx, 0, ancho - q.anchoM), y: clamp(q.y + dy, 0, largo - q.largoM) };
        }
        return q;
      });
    });
  }

  function borrarArea(id: string) {
    setAreas(prev => prev.filter(a => a.id !== id));
    setSel(null);
  }

  // ── Piezas ─────────────────────────────────────────────────────────────────

  function agregar(item: ItemPaleta, extra?: Partial<Pieza>, en?: { x: number; y: number }) {
    const x = en ? en.x - item.anchoM / 2 : ancho / 2 - item.anchoM / 2;
    const y = en ? en.y - item.largoM / 2 : largo / 2 - item.largoM / 2;
    const p: Pieza = {
      id: nuevoIdPieza(),
      tipo: item.tipo,
      etiqueta: item.etiqueta,
      x: snap(clamp(x, 0, ancho - item.anchoM)),
      y: snap(clamp(y, 0, largo - item.largoM)),
      anchoM: item.anchoM,
      largoM: item.largoM,
      rot: 0,
      ...(item.colgado ? { colgado: true } : {}),
      ...extra,
    };
    setPiezas(prev => [...prev, p]);
    setSel({ tipo: "pieza", id: p.id });
  }

  function agregarDelBanco(f: RenglonBanco, en?: { x: number; y: number }) {
    agregar(
      { tipo: f.posicionId ? "POSICION" : "RIDER", etiqueta: f.titulo, anchoM: f.anchoM, largoM: f.largoM, colgado: f.colgado },
      {
        proyectoEquipoId: f.proyectoEquipoId,
        posicionId: f.posicionId,
        equipoId: f.equipoId,
        imagenUrl: f.imagenUrl,
        pesoKg: f.pesoKg,
      },
      en,
    );
  }

  function mutar(id: string, cambio: Partial<Pieza>) {
    setPiezas(prev => prev.map(p => p.id === id ? { ...p, ...cambio } : p));
  }

  /**
   * La huella es dato de catálogo: al redimensionar una pieza se igualan todas las del
   * mismo modelo en este plano y se guarda en el equipo, para que la hereden los layouts
   * que vengan. Así solo se mide una vez en la vida.
   */
  function redimensionar(p: Pieza, cambio: { anchoM?: number; largoM?: number }) {
    if (!p.equipoId) { mutar(p.id, cambio); return; }
    const anchoFinal = cambio.anchoM ?? p.anchoM;
    const largoFinal = cambio.largoM ?? p.largoM;
    setPiezas(prev => prev.map(q => q.equipoId === p.equipoId ? { ...q, anchoM: anchoFinal, largoM: largoFinal } : q));
    if (huellaPendiente.current) clearTimeout(huellaPendiente.current);
    const equipoId = p.equipoId;
    huellaPendiente.current = setTimeout(() => {
      fetch(`/api/equipos/${equipoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huellaAnchoM: anchoFinal, huellaLargoM: largoFinal }),
      }).catch(() => toast.error("La huella no se pudo guardar en el catálogo"));
    }, 800);
  }

  function duplicar(p: Pieza, veces = 1) {
    const nuevas: Pieza[] = [];
    for (let i = 1; i <= veces; i++) {
      const paso = (p.anchoM + 0.1) * i;
      nuevas.push({
        ...p,
        id: nuevoIdPieza(),
        x: snap(clamp(p.x + paso, 0, Math.max(0, ancho - p.anchoM))),
        y: p.y,
      });
    }
    setPiezas(prev => [...prev, ...nuevas]);
    setSel({ tipo: "pieza", id: nuevas[nuevas.length - 1]?.id ?? p.id });
  }

  function borrar(id: string) {
    setPiezas(prev => prev.filter(p => p.id !== id));
    setSel(null);
  }

  // ── Montaje del rider, editable desde el plano ─────────────────────────────

  function normalizar(p: {
    id: string; cantidad: number; funcion: string | null; soporte: string | null;
    zona: string | null; alturaM: number | null; notas: string | null;
  }): PosicionDelRider {
    return {
      id: p.id, cantidad: p.cantidad, funcion: p.funcion, soporte: p.soporte,
      zona: p.zona, alturaM: p.alturaM, notas: p.notas,
    };
  }

  /**
   * Cambiar zona o configuración desde el detalle reacomoda el rider, no el plano:
   * el equipo sin desglose estrena posición y el que ya la tenía se edita en su sitio
   * para no romper las piezas que la referencian.
   */
  async function guardarPosicion(item: ItemDeZona, cambio: CambioPosicion) {
    if (!api.posiciones) return;
    setGuardandoRider(true);
    const url = api.posiciones(item.proyectoEquipoId);
    try {
      if (item.posicionId) {
        const r = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posicionId: item.posicionId, ...cambio }),
        });
        if (!r.ok) throw new Error();
        const { posicion } = await r.json();
        setRider(prev => prev.map(e => e.id !== item.proyectoEquipoId ? e : {
          ...e,
          posiciones: e.posiciones.map(p => p.id === posicion.id ? normalizar(posicion) : p),
        }));
      } else {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cantidad: item.cantidad, ...cambio }),
        });
        if (!r.ok) throw new Error();
        const { posicion } = await r.json();
        setRider(prev => prev.map(e => e.id !== item.proyectoEquipoId ? e : {
          ...e,
          posiciones: [...e.posiciones, normalizar(posicion)],
        }));
      }
    } catch {
      toast.error("No se pudo guardar el montaje");
    } finally {
      setGuardandoRider(false);
    }
  }

  // ── Interacción con el lienzo ──────────────────────────────────────────────

  function onPointerDownPieza(ev: React.PointerEvent, p: Pieza) {
    ev.stopPropagation();
    setSel({ tipo: "pieza", id: p.id });
    const m = aMetros(ev.clientX, ev.clientY);
    if (!m) return;
    arrastre.current = { tipo: "pieza", id: p.id, dx: m.x - p.x, dy: m.y - p.y };
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
  }

  function onPointerDownArea(ev: React.PointerEvent, a: Area) {
    ev.stopPropagation();
    setSel({ tipo: "area", id: a.id });
    if (a.clave) setClaveSel(a.clave);
    const m = aMetros(ev.clientX, ev.clientY);
    if (!m) return;
    arrastre.current = { tipo: "area", id: a.id, dx: m.x - a.x, dy: m.y - a.y };
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
  }

  function onPointerDownAsa(ev: React.PointerEvent, a: Area) {
    ev.stopPropagation();
    setSel({ tipo: "area", id: a.id });
    redim.current = { id: a.id };
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
  }

  /** Escalar es proporcional: la foto del equipo se deforma si ancho y fondo van por su lado. */
  function onPointerDownEscala(ev: React.PointerEvent, p: Pieza) {
    ev.stopPropagation();
    setSel({ tipo: "pieza", id: p.id });
    const m = aMetros(ev.clientX, ev.clientY);
    if (!m) return;
    const cx = p.x + p.anchoM / 2;
    const cy = p.y + p.largoM / 2;
    escala.current = {
      id: p.id, cx, cy,
      d0: Math.max(0.05, Math.hypot(m.x - cx, m.y - cy)),
      anchoM: p.anchoM, largoM: p.largoM,
    };
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
  }

  function onPointerDownGiro(ev: React.PointerEvent, p: Pieza) {
    ev.stopPropagation();
    setSel({ tipo: "pieza", id: p.id });
    giro.current = { id: p.id, cx: p.x + p.anchoM / 2, cy: p.y + p.largoM / 2 };
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
  }

  function onPointerDownFondo(ev: React.PointerEvent) {
    setSel(null);
    const s = aSvg(ev.clientX, ev.clientY);
    if (!s) return;
    paneo.current = { sx: s.x, sy: s.y, px: vista.x, py: vista.y };
  }

  function onPointerMove(ev: React.PointerEvent) {
    if (paneo.current) {
      const s = aSvg(ev.clientX, ev.clientY);
      if (!s) return;
      const p = paneo.current;
      setVista(v => ({ ...v, x: p.px + (s.x - p.sx), y: p.py + (s.y - p.sy) }));
      return;
    }
    if (redim.current) {
      const m = aMetros(ev.clientX, ev.clientY);
      const a = areas.find(q => q.id === redim.current!.id);
      if (!m || !a) return;
      mutarArea(a.id, {
        anchoM: clamp(snap(m.x - a.x), 0.5, ancho - a.x),
        largoM: clamp(snap(m.y - a.y), 0.5, largo - a.y),
      });
      return;
    }
    if (escala.current) {
      const e = escala.current;
      const m = aMetros(ev.clientX, ev.clientY);
      const p = piezas.find(q => q.id === e.id);
      if (!m || !p) return;
      const f = Math.hypot(m.x - e.cx, m.y - e.cy) / e.d0;
      const paso = (v: number) => Math.round(clamp(v * f, 0.1, Math.max(ancho, largo)) * 20) / 20;
      const anchoM = paso(e.anchoM);
      const largoM = paso(e.largoM);
      if (anchoM !== p.anchoM || largoM !== p.largoM) redimensionar(p, { anchoM, largoM });
      return;
    }
    if (giro.current) {
      const g = giro.current;
      const m = aMetros(ev.clientX, ev.clientY);
      if (!m) return;
      // El asa cuelga arriba de la pieza, así que 0° es apuntar hacia −Y.
      const grados = (Math.atan2(m.y - g.cy, m.x - g.cx) * 180) / Math.PI + 90;
      mutar(g.id, { rot: ((Math.round(grados / 5) * 5) % 360 + 360) % 360 });
      return;
    }
    const d = arrastre.current;
    if (!d) return;
    const m = aMetros(ev.clientX, ev.clientY);
    if (!m) return;
    if (d.tipo === "area") {
      const a = areas.find(q => q.id === d.id);
      if (!a) return;
      moverArea(a.id, snap(clamp(m.x - d.dx, 0, ancho - a.anchoM)), snap(clamp(m.y - d.dy, 0, largo - a.largoM)));
      return;
    }
    const pieza = piezas.find(p => p.id === d.id);
    if (!pieza) return;
    const caja = cajaDe(pieza);
    // Se acota el CENTRO de la caja envolvente: con rotación libre la esquina ya no sirve.
    const cx = clamp(m.x - d.dx + pieza.anchoM / 2, caja.ancho / 2, ancho - caja.ancho / 2);
    const cy = clamp(m.y - d.dy + pieza.largoM / 2, caja.largo / 2, largo - caja.largo / 2);
    mutar(d.id, { x: snap(cx - pieza.anchoM / 2), y: snap(cy - pieza.largoM / 2) });
  }

  function onPointerUp() {
    arrastre.current = null;
    redim.current = null;
    escala.current = null;
    giro.current = null;
    paneo.current = null;
  }

  /**
   * Solo el pellizco de dos dedos hace zoom: el trackpad lo manda como wheel con
   * ctrlKey. El deslizamiento normal se deja pasar para que la página scrollee.
   * Va como listener nativo porque React registra wheel en modo pasivo y ahí
   * preventDefault no surte efecto.
   */
  useEffect(() => {
    const lienzo = lienzoRef.current;
    if (!lienzo) return;
    function alPellizcar(ev: WheelEvent) {
      if (!ev.ctrlKey) return;
      ev.preventDefault();
      const s = aSvg(ev.clientX, ev.clientY);
      if (!s) return;
      setVista(v => {
        const z = clamp(v.zoom * Math.exp(-ev.deltaY * 0.01), 0.4, 6);
        // El punto bajo el cursor no se mueve: el zoom se siente natural.
        return { zoom: z, x: s.x - ((s.x - v.x) / v.zoom) * z, y: s.y - ((s.y - v.y) / v.zoom) * z };
      });
    }
    lienzo.addEventListener("wheel", alPellizcar, { passive: false });
    return () => lienzo.removeEventListener("wheel", alPellizcar);
  }, [aSvg]);

  function onDrop(ev: React.DragEvent) {
    ev.preventDefault();
    const carga = soltando.current;
    soltando.current = null;
    if (!carga) return;
    const m = aMetros(ev.clientX, ev.clientY);
    if ("clave" in carga) agregarDelBanco(carga, m ?? undefined);
    else agregar(carga, undefined, m ?? undefined);
  }

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (!sel) return;
      const activo = document.activeElement?.tagName;
      if (activo === "INPUT" || activo === "TEXTAREA" || activo === "SELECT") return;
      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        if (sel.tipo === "area") borrarArea(sel.id); else borrar(sel.id);
      }
      if (sel.tipo === "pieza" && (ev.key === "r" || ev.key === "R")) {
        const p = piezas.find(x => x.id === sel.id);
        if (p) mutar(sel.id, { rot: (p.rot + (ev.shiftKey ? -15 : 15) + 360) % 360 });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, piezas]);

  // El PDF y el link públicos son la VERSIÓN FINAL: los arma el servidor desde el
  // rider, no una captura de este lienzo (que es borrador y cambia a cada rato).
  // El link se trae al montar: si se pidiera al hacer clic, el navegador trataría
  // la pestaña nueva como popup y la bloquearía.
  const urlLink = api.link;
  useEffect(() => {
    if (!urlLink) return;
    let vivo = true;
    fetch(urlLink)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (vivo && d?.url) setLinkPublico(d.url as string); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [urlLink]);

  function descargarLayout() {
    if (!api.pdf) return;
    if (estado === "sucio") {
      toast.info("Guarda los cambios antes de descargar: el documento se arma desde lo guardado.");
    }
    downloadPdf(api.pdf, undefined, `Layout de producción · ${nombre}`);
  }

  async function copiarLink() {
    if (!linkPublico) return;
    try {
      await navigator.clipboard.writeText(linkPublico);
      toast.success("Link del layout copiado. Ábrelo en celular o iPad.");
    } catch {
      toast.error("El navegador no dejó copiar; usa «Ver final» y copia la barra.");
    }
  }

  const visibles = piezas.filter(p => (p.colgado ? capas.colgado : capas.piso));
  const areasZona = capas.zonas ? areas.filter(a => a.clase === "ZONA") : [];
  const areasSub = capas.subzonas ? areas.filter(a => a.clase === "SUBZONA") : [];

  function dibujarArea(a: Area) {
    const x = a.x * pxPorM;
    const y = a.y * pxPorM;
    const w = a.anchoM * pxPorM;
    const h = a.largoM * pxPorM;
    const esZona = a.clase === "ZONA";
    const activa = sel?.tipo === "area" && sel.id === a.id;
    const etiqueta = esZona ? a.etiqueta.toUpperCase() : a.etiqueta;
    const r = rotuloEnLineas(etiqueta, w - 2.4, esZona ? 2.4 : 2);
    // El rótulo va en una pastilla opaca: sobre la rejilla y las piezas, el texto
    // con contorno se volvía ilegible en cuanto dos áreas se tocaban.
    const pad = r.fs * 0.5;
    const chip = { w: Math.min(w - 1.2, r.ancho + pad * 2), h: r.lineas.length * r.fs * 1.2 + pad * 1.4 };
    const tx = x + 0.6 + pad;
    return (
      <g key={a.id} onPointerDown={ev => onPointerDownArea(ev, a)} className="cursor-move">
        <rect
          x={x} y={y} width={w} height={h} rx={1}
          fill={a.color}
          fillOpacity={esZona ? 0.16 : 0.26}
          stroke={activa ? "#ffffff" : a.color}
          strokeOpacity={activa ? 1 : 0.9}
          strokeWidth={activa ? 1.1 : esZona ? 0.8 : 0.6}
          strokeDasharray={esZona ? undefined : "2 1.4"}
        />
        {capas.rotulos && (
          <g style={{ pointerEvents: "none" }}>
            <rect
              x={x + 0.6} y={y + 0.6} width={chip.w} height={chip.h} rx={r.fs * 0.3}
              fill={a.color} fillOpacity={0.95}
            />
            <text
              x={tx} y={y + 0.6 + pad * 0.7 + r.fs * 0.92}
              fill="#0a0a0a" fontSize={r.fs} fontWeight={esZona ? 700 : 600}
            >
              {r.lineas.map((l, i) => (
                <tspan key={i} x={tx} dy={i === 0 ? 0 : r.fs * 1.2}>{l}</tspan>
              ))}
            </text>
          </g>
        )}
        {activa && (
          <rect
            x={x + w - 2.2} y={y + h - 2.2} width={2.2} height={2.2}
            fill="#ffffff" stroke="#0a0a0a" strokeWidth={0.3}
            className="cursor-nwse-resize"
            onPointerDown={ev => onPointerDownAsa(ev, a)}
          />
        )}
      </g>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
      {/* ── Lienzo ── */}
      <div className="min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span>{ancho} × {largo} m</span>
            {(!anchoM || !largoM) && <span className="text-amber-500">medidas por capturar</span>}
            <span className="text-gray-700">·</span>
            <span>{estado === "guardando" ? "Guardando…" : estado === "sucio" ? "Sin guardar" : "Guardado"}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setCapas(c => ({ ...c, zonas: !c.zonas }))} className={`${BOTON} ${capas.zonas ? "text-gray-300" : "opacity-50"}`}>Zonas</button>
            <button onClick={() => setCapas(c => ({ ...c, subzonas: !c.subzonas }))} className={`${BOTON} ${capas.subzonas ? "text-gray-300" : "opacity-50"}`}>Config.</button>
            <button onClick={() => setCapas(c => ({ ...c, piso: !c.piso }))} className={`${BOTON} ${capas.piso ? "text-gray-300" : "opacity-50"}`}>Piso</button>
            <button onClick={() => setCapas(c => ({ ...c, colgado: !c.colgado }))} className={`${BOTON} ${capas.colgado ? "text-gray-300" : "opacity-50"}`}>Colgado</button>
            <button onClick={() => setCapas(c => ({ ...c, rotulos: !c.rotulos }))} className={`${BOTON} ${capas.rotulos ? "text-gray-300" : "opacity-50"}`}>Rótulos</button>
            <span className="w-px h-4 bg-[#2a2a2a]" />
            <button onClick={() => setVista(v => ({ ...v, zoom: clamp(v.zoom / 1.25, 0.4, 6) }))} className={BOTON}><ZoomOut size={12} /></button>
            <button onClick={() => setVista(v => ({ ...v, zoom: clamp(v.zoom * 1.25, 0.4, 6) }))} className={BOTON}><ZoomIn size={12} /></button>
            <button onClick={() => setVista({ zoom: 1, x: 0, y: 0 })} className={BOTON}><Maximize size={12} /> Ajustar</button>
            {(api.link || api.pdf) && <span className="w-px h-4 bg-[#2a2a2a]" />}
            {api.link && (
              <>
                <button onClick={copiarLink} disabled={!linkPublico} className={`${BOTON} disabled:opacity-40`}>
                  <Link2 size={12} /> Copiar link
                </button>
                <a
                  href={linkPublico ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${BOTON} ${linkPublico ? "" : "pointer-events-none opacity-40"}`}
                >
                  <ExternalLink size={12} /> Ver final
                </a>
              </>
            )}
            {api.pdf && (
              <button onClick={descargarLayout} disabled={!!downloading} className={`${BOTON} disabled:opacity-50`}>
                <FileDown size={12} /> {downloading ? "Generando…" : "Layout de producción"}
              </button>
            )}
          </div>
        </div>

        <div
          ref={lienzoRef}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden select-none touch-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onDragOver={ev => ev.preventDefault()}
          onDrop={onDrop}
        >
          <svg ref={svgRef} viewBox={`-6 -6 ${vbAncho + 12} ${vbLargo + 22 + altoLeyenda}`} className="w-full h-auto block">
            <defs>
              <pattern id="rejilla" width={pxPorM} height={pxPorM} patternUnits="userSpaceOnUse">
                <path d={`M ${pxPorM} 0 L 0 0 0 ${pxPorM}`} fill="none" stroke="#1c1c1c" strokeWidth="0.4" />
              </pattern>
            </defs>

            {/* Fondo capturador: arrastrar aquí panea el plano. */}
            <rect x={-6} y={-6} width={vbAncho + 12} height={vbLargo + 22 + altoLeyenda} fill="transparent" onPointerDown={onPointerDownFondo} className="cursor-grab" />

            <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.zoom})`}>
              <rect x={0} y={0} width={vbAncho} height={vbLargo} fill="#0e0e0e" stroke="#2a2a2a" strokeWidth="0.6" onPointerDown={onPointerDownFondo} />
              <rect x={0} y={0} width={vbAncho} height={vbLargo} fill="url(#rejilla)" style={{ pointerEvents: "none" }} />

              {/* Primero las zonas, luego las configuraciones que viven dentro de ellas. */}
              {areasZona.map(dibujarArea)}
              {areasSub.map(dibujarArea)}

              {/* El público siempre está al frente: orienta a quien lee el plano. */}
              <text x={vbAncho / 2} y={vbLargo + 12} fill="#555" fontSize="4" textAnchor="middle" letterSpacing="1.2" style={{ pointerEvents: "none" }}>
                PÚBLICO
              </text>

              {visibles.map(p => {
                const x = p.x * pxPorM;
                const y = p.y * pxPorM;
                const w = p.anchoM * pxPorM;
                const h = p.largoM * pxPorM;
                const activa = sel?.tipo === "pieza" && sel.id === p.id;
                // Las asas se dibujan del tamaño que tendrían en pantalla sin zoom: si no,
                // al acercarse tapan la pieza y de lejos no se pueden agarrar.
                const asa = 1.4 / vista.zoom;
                return (
                  <g
                    key={p.id}
                    transform={`rotate(${p.rot} ${x + w / 2} ${y + h / 2})`}
                    onPointerDown={ev => onPointerDownPieza(ev, p)}
                    className="cursor-move"
                  >
                    {p.imagenUrl ? (
                      // El equipo con foto se dibuja a secas: la caja y el rótulo solo
                      // ensucian el plano cuando ya se ve qué es. El rectángulo invisible
                      // existe para poder agarrarla aunque la foto tenga fondo transparente.
                      <>
                        <rect x={x} y={y} width={w} height={h} fill="transparent" />
                        <image
                          href={p.imagenUrl}
                          x={x} y={y} width={Math.max(0.1, w)} height={Math.max(0.1, h)}
                          preserveAspectRatio="xMidYMid meet"
                          style={{ pointerEvents: "none" }}
                        />
                      </>
                    ) : (
                      <>
                        <rect
                          x={x} y={y} width={w} height={h} rx={0.8}
                          fill={p.colgado ? "#1d2436" : p.equipoId ? "#1a1710" : "#161616"}
                          stroke={activa ? "#B3985B" : p.colgado ? "#3c4a6b" : "#303030"}
                          strokeWidth={activa ? 1 : 0.5}
                          strokeDasharray={p.colgado ? "2 1.2" : undefined}
                        />
                        {capas.rotulos && (
                          <text
                            x={x + w / 2} y={y + h + 3}
                            fill={activa ? "#B3985B" : "#8b8b8b"}
                            fontSize="2.6" textAnchor="middle"
                            style={{ pointerEvents: "none" }}
                          >
                            {p.etiqueta.length > 22 ? `${p.etiqueta.slice(0, 21)}…` : p.etiqueta}
                          </text>
                        )}
                      </>
                    )}
                    {activa && (
                      <>
                        {p.imagenUrl && (
                          <rect
                            x={x} y={y} width={w} height={h}
                            fill="none" stroke="#B3985B" strokeWidth={0.5 / vista.zoom}
                            strokeDasharray={`${1.4 / vista.zoom} ${1 / vista.zoom}`}
                            style={{ pointerEvents: "none" }}
                          />
                        )}
                        <line
                          x1={x + w / 2} y1={y} x2={x + w / 2} y2={y - asa * 2.4}
                          stroke="#B3985B" strokeWidth={0.4 / vista.zoom}
                          style={{ pointerEvents: "none" }}
                        />
                        <circle
                          cx={x + w / 2} cy={y - asa * 2.4} r={asa}
                          fill="#B3985B" stroke="#0a0a0a" strokeWidth={0.3 / vista.zoom}
                          className="cursor-grab"
                          onPointerDown={ev => onPointerDownGiro(ev, p)}
                        />
                        <circle
                          cx={x + w} cy={y + h} r={asa}
                          fill="#ffffff" stroke="#0a0a0a" strokeWidth={0.3 / vista.zoom}
                          className="cursor-nwse-resize"
                          onPointerDown={ev => onPointerDownEscala(ev, p)}
                        />
                      </>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Guía de colores: queda fija aunque el plano se mueva, y así sale en PNG y PDF. */}
            {leyenda.length > 0 && (
              <g style={{ pointerEvents: "none" }}>
                <rect x={-6} y={vbLargo + 16} width={vbAncho + 12} height={altoLeyenda} fill="#0a0a0a" />
                <line x1={0} y1={vbLargo + 17} x2={vbAncho} y2={vbLargo + 17} stroke="#1f1f1f" strokeWidth={0.4} />
                {leyenda.map((l, i) => {
                  const col = i % COLS_LEYENDA;
                  const fila = Math.floor(i / COLS_LEYENDA);
                  const x = (vbAncho / COLS_LEYENDA) * col;
                  const y = vbLargo + 21 + fila * FILA_LEYENDA;
                  const { texto } = rotulo(l.texto, vbAncho / COLS_LEYENDA - 2, 2.6);
                  return (
                    <g key={`${l.texto}-${i}`}>
                      <rect x={x} y={y - 2} width={2.4} height={2.4} rx={0.4} fill={l.color} />
                      <text x={x + 3.4} y={y} fill="#b9b9b9" fontSize={2.6}>{texto}</text>
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
        </div>

        <p className="text-[10px] text-gray-600">
          {conRider
            ? "Las zonas y configuraciones salen del rider: dibújalas desde el panel y acomódalas aquí."
            : "Las zonas se agregan a mano desde el panel y se acomodan aquí."}
          {" "}Mover una zona arrastra sus configuraciones. Las piezas del banco se sueltan sobre el plano;
          todo se acomoda a 25 cm, el pellizco de dos dedos hace zoom y arrastrar el fondo panea.
          El equipo con foto se dibuja solo con su imagen: al seleccionarlo, el punto blanco de
          la esquina lo hace grande o chico y el dorado de arriba lo gira. Con algo seleccionado:
          {" "}<span className="text-gray-400">R</span> gira la pieza 15°,
          {" "}<span className="text-gray-400">Supr</span> borra.
        </p>
      </div>

      {/* ── Panel lateral ── */}
      <div className="space-y-3">
        <div className="ms-card p-3">
          <p className="ms-section-label">Peso y carga</p>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Peso en plano</span><span className="text-white font-semibold">{totales.total.toFixed(1)} kg</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Colgado</span><span className="text-[#B3985B] font-semibold">{totales.colgado.toFixed(1)} kg</span></div>
            <div className="flex justify-between"><span className="text-gray-500">En piso</span><span className="text-gray-300">{totales.piso.toFixed(1)} kg</span></div>
            {/* La carga eléctrica se deriva del rider; sin rider detrás no hay nada que sumar. */}
            {conRider && (
              <>
                <div className="h-px bg-[#1f1f1f] my-1.5" />
                <div className="flex justify-between"><span className="text-gray-500">Carga 110V</span><span className="text-white font-semibold">{cargaTotal.amperaje110.toFixed(1)} A</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Carga 220V</span><span className="text-white font-semibold">{cargaTotal.amperaje220.toFixed(1)} A</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Potencia</span><span className="text-gray-300">{Math.round(cargaTotal.watts).toLocaleString("es-MX")} W</span></div>
              </>
            )}
          </div>
          <p className="text-[10px] text-gray-600 mt-2 leading-tight">
            {conRider ? (
              <>
                El peso es el de las piezas puestas en el plano; la carga es la de todo el rider del
                escenario. Los amperes de 110 y 220 no se suman entre sí.
                {cargaTotal.sinDato > 0 && (
                  <span className="text-amber-600"> {cargaTotal.sinDato} unidades sin amperaje en catálogo.</span>
                )}
              </>
            ) : (
              "El peso es el que capturaste en cada pieza del plano."
            )}
          </p>
        </div>

        <ArbolZonasLayout
          zonas={zonas}
          textoVacio={
            conRider
              ? undefined
              : "Este plano no cuelga de un rider: las zonas se agregan a mano y sirven para rotular el escenario (batería, vientos, cabina…)."
          }
          colocadas={clavesColocadas}
          seleccion={claveSel}
          onSeleccionar={clave => {
            setClaveSel(clave);
            const a = areas.find(x => x.clave === clave);
            setSel(a ? { tipo: "area", id: a.id } : null);
          }}
          onColocar={colocarArea}
          onGenerar={generarAreas}
          onZonaLibre={agregarZonaLibre}
        />

        {grupoSel && (
          <DetalleZonaLayout
            titulo={grupoSel.titulo}
            subtitulo={grupoSel.subtitulo}
            color={grupoSel.color}
            zonaId={grupoSel.zonaId}
            items={grupoSel.items}
            carga={grupoSel.carga}
            pesoKg={grupoSel.pesoKg}
            guardando={guardandoRider}
            onGuardar={guardarPosicion}
            onCerrar={() => setClaveSel(null)}
          />
        )}

        {areaSel && (
          <div className="ms-card p-3">
            <p className="ms-section-label">Área en el plano</p>
            <p className="text-xs text-white mt-1.5 truncate">{areaSel.etiqueta}</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="ms-label block mb-1">Ancho (m)</label>
                <input
                  type="number" step="0.25" min="0.5"
                  value={areaSel.anchoM.toFixed(2)}
                  onChange={e => mutarArea(areaSel.id, { anchoM: clamp(parseFloat(e.target.value) || 0.5, 0.5, ancho - areaSel.x) })}
                  className="w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="ms-label block mb-1">Fondo (m)</label>
                <input
                  type="number" step="0.25" min="0.5"
                  value={areaSel.largoM.toFixed(2)}
                  onChange={e => mutarArea(areaSel.id, { largoM: clamp(parseFloat(e.target.value) || 0.5, 0.5, largo - areaSel.y) })}
                  className="w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                />
              </div>
            </div>
            <button onClick={() => borrarArea(areaSel.id)} className={`${BOTON} mt-2 hover:text-red-400`}>
              <Trash2 size={12} /> Quitar del plano
            </button>
            <p className="text-[10px] text-gray-600 mt-1.5 leading-tight">
              Quitarla del plano no toca el rider: el equipo sigue asignado a su zona.
            </p>
          </div>
        )}

        {piezaSel && (
          <div className="ms-card p-3">
            <p className="ms-section-label">Pieza</p>
            <p className="text-xs text-white mt-1.5 truncate">{piezaSel.etiqueta}</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="ms-label block mb-1">Ancho (m)</label>
                <input
                  type="number" step="0.05" min="0.1"
                  value={piezaSel.anchoM}
                  onChange={e => redimensionar(piezaSel, { anchoM: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                  className="w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="ms-label block mb-1">Fondo (m)</label>
                <input
                  type="number" step="0.05" min="0.1"
                  value={piezaSel.largoM}
                  onChange={e => redimensionar(piezaSel, { largoM: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                  className="w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="ms-label block mb-1">Giro (°)</label>
                <input
                  type="number" step="5"
                  value={Math.round(piezaSel.rot)}
                  onChange={e => mutar(piezaSel.id, { rot: ((parseFloat(e.target.value) || 0) % 360 + 360) % 360 })}
                  className="w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="ms-label block mb-1">Peso (kg)</label>
                <input
                  type="number" step="0.5" min="0"
                  value={piezaSel.pesoKg ?? ""}
                  onChange={e => mutar(piezaSel.id, { pesoKg: e.target.value === "" ? undefined : Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                />
              </div>
            </div>
            {piezaSel.equipoId && (
              <p className="text-[10px] text-gray-600 mt-1.5 leading-tight">
                El tamaño se aplica a todas las piezas de este modelo y se guarda en su ficha de catálogo.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button onClick={() => mutar(piezaSel.id, { rot: (piezaSel.rot + 90) % 360 })} className={BOTON}>
                <RotateCw size={12} /> 90°
              </button>
              <button onClick={() => mutar(piezaSel.id, { colgado: !piezaSel.colgado })} className={`${BOTON} ${piezaSel.colgado ? "text-[#B3985B] border-[#B3985B]/40" : ""}`}>
                <Anchor size={12} /> Colgado
              </button>
              <button onClick={() => duplicar(piezaSel)} className={BOTON}><Copy size={12} /> Duplicar</button>
              <button onClick={() => borrar(piezaSel.id)} className={`${BOTON} hover:text-red-400`}><Trash2 size={12} /> Borrar</button>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <input
                type="number" min="1" max="24" value={copias}
                onChange={e => setCopias(e.target.value)}
                className="w-12 bg-[#0e0e0e] border border-[#1f1f1f] rounded px-1.5 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
              />
              <button onClick={() => duplicar(piezaSel, clamp(parseInt(copias) || 1, 1, 24))} className={BOTON}>
                Duplicar en fila
              </button>
            </div>
          </div>
        )}

        {conRider && (
        <div className="ms-card p-3">
          <p className="ms-section-label">Banco de equipos</p>
          {banco.length === 0 ? (
            <p className="text-[11px] text-gray-600 mt-1.5 leading-tight">
              El rider del proyecto está vacío. Agrega equipo en la pestaña de producción y
              aparecerá aquí; si desglosas su montaje, cada posición entra como su propio renglón.
            </p>
          ) : (
            <p className="text-[10px] text-gray-600 mt-1 leading-tight">
              Arrástralos al plano o haz clic para colocarlos al centro. El contador es cuántos
              ya pusiste de los que pide el rider.
            </p>
          )}
          {banco.length > 0 && (
            <div className="mt-2 space-y-1 max-h-[22rem] overflow-y-auto">
              {banco.map(f => {
                const puestas = f.posicionId
                  ? colocadas.get(f.posicionId) ?? 0
                  : piezas.filter(p => p.proyectoEquipoId === f.proyectoEquipoId && !p.posicionId).length;
                const completo = puestas >= f.cantidad;
                return (
                  <button
                    key={f.clave}
                    draggable
                    onDragStart={() => { soltando.current = f; }}
                    onDragEnd={() => { soltando.current = null; }}
                    onClick={() => agregarDelBanco(f)}
                    className={`w-full text-left px-2 py-1.5 rounded border flex items-center gap-2 transition-colors ${
                      completo ? "border-[#1a1a1a] opacity-60" : "border-[#1f1f1f] hover:border-[#B3985B]/50"
                    }`}
                  >
                    <span className="w-8 h-8 shrink-0 rounded bg-[#0e0e0e] border border-[#1f1f1f] overflow-hidden flex items-center justify-center">
                      {f.imagenUrl
                        ? <img src={f.imagenUrl} alt="" className="w-full h-full object-contain" />
                        : <span className="text-[9px] text-gray-700">s/f</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] text-white truncate">{f.titulo}</span>
                      <span className="block text-[10px] text-gray-600 truncate">{f.modelo} · {f.detalle}</span>
                    </span>
                    <span className={`text-[10px] shrink-0 tabular-nums ${completo ? "text-gray-600" : "text-[#B3985B]"}`}>
                      {puestas}/{f.cantidad}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        )}

        <div className="ms-card p-3">
          <p className="ms-section-label">Backline</p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {PALETA_BACKLINE.map(item => (
              <button
                key={item.tipo}
                draggable
                onDragStart={() => { soltando.current = item; }}
                onDragEnd={() => { soltando.current = null; }}
                onClick={() => agregar(item)}
                className="text-[11px] px-2 py-1.5 rounded border border-[#1f1f1f] text-gray-300 hover:border-[#B3985B]/50 hover:text-white transition-colors text-left"
              >
                {item.etiqueta}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
