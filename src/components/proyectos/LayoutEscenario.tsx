"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, RotateCw, Trash2, Download, FileDown, Anchor, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useToast } from "@/components/Toast";
import { labelConfiguracion, labelSoporte, labelZona, soporteEsRigging } from "@/lib/montaje-vocabulario";
import {
  PALETA_BACKLINE,
  TAMANO_RIDER,
  cajaDe,
  colocadasPorPosicion,
  nuevoIdPieza,
  parsearLayout,
  snap,
  totalesDeLayout,
  type ItemPaleta,
  type Pieza,
} from "@/lib/layout-escenario";

export type PosicionDelRider = {
  id: string;
  cantidad: number;
  funcion: string | null;
  soporte: string | null;
  zona: string | null;
  alturaM: number | null;
};

export type EquipoDelRider = {
  id: string;
  cantidad: number;
  equipo: {
    id: string;
    marca: string | null;
    modelo: string | null;
    descripcion: string;
    pesoKg: number | null;
    imagenUrl: string | null;
    huellaAnchoM: number | null;
    huellaLargoM: number | null;
    categoria: { nombre: string; disciplina: string | null } | null;
  };
  posiciones: PosicionDelRider[];
};

/** Medidas del escenario cuando no se capturaron: suficiente para empezar a dibujar. */
const ANCHO_DEFAULT = 12;
const LARGO_DEFAULT = 8;

/** El escenario siempre mide 100 unidades de viewBox de ancho; el resto se escala a eso. */
const VB_ANCHO = 100;

const BOTON = "text-[11px] px-2 py-1 rounded border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#444] transition-colors disabled:opacity-40 flex items-center gap-1";

function nombreCorto(e: EquipoDelRider) {
  return [e.equipo.marca, e.equipo.modelo].filter(Boolean).join(" ") || e.equipo.descripcion;
}

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

function armarBanco(rider: EquipoDelRider[]): RenglonBanco[] {
  const filas: RenglonBanco[] = [];
  for (const e of rider) {
    const cat = e.equipo.categoria?.nombre ?? null;
    const disc = e.equipo.categoria?.disciplina ?? null;
    const huella = {
      anchoM: e.equipo.huellaAnchoM && e.equipo.huellaAnchoM > 0 ? e.equipo.huellaAnchoM : TAMANO_RIDER.anchoM,
      largoM: e.equipo.huellaLargoM && e.equipo.huellaLargoM > 0 ? e.equipo.huellaLargoM : TAMANO_RIDER.largoM,
    };
    const base = {
      proyectoEquipoId: e.id,
      equipoId: e.equipo.id,
      modelo: nombreCorto(e),
      imagenUrl: e.equipo.imagenUrl ?? undefined,
      ...huella,
      pesoKg: e.equipo.pesoKg ?? undefined,
    };

    if (e.posiciones.length === 0) {
      // Sin desglose de montaje el equipo sigue siendo colocable: nada queda invisible.
      filas.push({
        ...base,
        clave: `eq_${e.id}`,
        titulo: nombreCorto(e),
        detalle: "Sin desglose de montaje",
        cantidad: e.cantidad,
        colgado: false,
      });
      continue;
    }

    for (const p of e.posiciones) {
      const detalle = [
        p.soporte ? labelSoporte(p.soporte, cat, disc) : null,
        p.zona ? labelZona(p.zona) : null,
        p.alturaM != null ? `${p.alturaM} m` : null,
      ].filter(Boolean).join(" · ");
      filas.push({
        ...base,
        clave: p.id,
        posicionId: p.id,
        titulo: p.funcion ? labelConfiguracion(p.funcion, cat, disc) : nombreCorto(e),
        detalle: detalle || "Sin soporte ni zona",
        cantidad: p.cantidad,
        // Lo volado se marca colgado solo: así el peso de rigging sale del montaje real.
        colgado: soporteEsRigging(p.soporte, cat, disc),
      });
    }
  }
  return filas;
}

export default function LayoutEscenario({
  proyectoId,
  escenarioId,
  nombre,
  anchoM,
  largoM,
  layoutInicial,
  rider,
}: {
  proyectoId: string;
  escenarioId: string;
  nombre: string;
  anchoM: number | null;
  largoM: number | null;
  layoutInicial: string | null;
  rider: EquipoDelRider[];
}) {
  const toast = useToast();
  const ancho = anchoM && anchoM > 0 ? anchoM : ANCHO_DEFAULT;
  const largo = largoM && largoM > 0 ? largoM : LARGO_DEFAULT;

  const [piezas, setPiezas] = useState<Pieza[]>(() => parsearLayout(layoutInicial));
  const [sel, setSel] = useState<string | null>(null);
  const [estado, setEstado] = useState<"limpio" | "sucio" | "guardando">("limpio");
  const [vista, setVista] = useState({ zoom: 1, x: 0, y: 0 });
  const [capas, setCapas] = useState({ piso: true, colgado: true });
  const [copias, setCopias] = useState("3");

  const lienzoRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const arrastre = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const paneo = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const soltando = useRef<RenglonBanco | ItemPaleta | null>(null);
  const primerRender = useRef(true);
  const huellaPendiente = useRef<ReturnType<typeof setTimeout> | null>(null);

  const banco = useMemo(() => armarBanco(rider), [rider]);
  const totales = useMemo(() => totalesDeLayout(piezas), [piezas]);
  const colocadas = useMemo(() => colocadasPorPosicion(piezas), [piezas]);
  const seleccionada = piezas.find(p => p.id === sel) ?? null;

  const pxPorM = VB_ANCHO / ancho;
  const vbAncho = VB_ANCHO;
  const vbLargo = largo * pxPorM;

  // Autosave con retraso: arrastrar una pieza dispara decenas de cambios de estado y
  // no tiene sentido mandar un PATCH por cada pixel.
  useEffect(() => {
    if (primerRender.current) { primerRender.current = false; return; }
    setEstado("sucio");
    const t = setTimeout(async () => {
      setEstado("guardando");
      const r = await fetch(`/api/proyectos/${proyectoId}/escenarios/${escenarioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: JSON.stringify({ piezas }) }),
      });
      if (!r.ok) { toast.error("No se pudo guardar el layout"); setEstado("sucio"); return; }
      setEstado("limpio");
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piezas]);

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
    setSel(p.id);
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
    setSel(nuevas[nuevas.length - 1]?.id ?? p.id);
  }

  function borrar(id: string) {
    setPiezas(prev => prev.filter(p => p.id !== id));
    setSel(null);
  }

  function onPointerDownPieza(ev: React.PointerEvent, p: Pieza) {
    ev.stopPropagation();
    setSel(p.id);
    const m = aMetros(ev.clientX, ev.clientY);
    if (!m) return;
    arrastre.current = { id: p.id, dx: m.x - p.x, dy: m.y - p.y };
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
    const a = arrastre.current;
    if (!a) return;
    const m = aMetros(ev.clientX, ev.clientY);
    const pieza = piezas.find(p => p.id === a.id);
    if (!m || !pieza) return;
    const caja = cajaDe(pieza);
    // Se acota el CENTRO de la caja envolvente: con rotación libre la esquina ya no sirve.
    const cx = clamp(m.x - a.dx + pieza.anchoM / 2, caja.ancho / 2, ancho - caja.ancho / 2);
    const cy = clamp(m.y - a.dy + pieza.largoM / 2, caja.largo / 2, largo - caja.largo / 2);
    mutar(a.id, { x: snap(cx - pieza.anchoM / 2), y: snap(cy - pieza.largoM / 2) });
  }

  function onPointerUp() {
    arrastre.current = null;
    paneo.current = null;
  }

  function onWheel(ev: React.WheelEvent) {
    ev.preventDefault();
    const s = aSvg(ev.clientX, ev.clientY);
    if (!s) return;
    setVista(v => {
      const z = clamp(v.zoom * (ev.deltaY < 0 ? 1.12 : 1 / 1.12), 0.4, 6);
      // El punto bajo el cursor no se mueve: el zoom se siente natural.
      return { zoom: z, x: s.x - ((s.x - v.x) / v.zoom) * z, y: s.y - ((s.y - v.y) / v.zoom) * z };
    });
  }

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
      if (activo === "INPUT" || activo === "TEXTAREA") return;
      if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); borrar(sel); }
      if (ev.key === "r" || ev.key === "R") {
        const p = piezas.find(x => x.id === sel);
        if (p) mutar(sel, { rot: (p.rot + (ev.shiftKey ? -15 : 15) + 360) % 360 });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, piezas]);

  async function exportar(formato: "png" | "pdf") {
    if (!lienzoRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    // `as any`: el @types/html2canvas del repo es de la 0.5 y tapa los tipos reales de la 1.4.
    const canvas = await html2canvas(lienzoRef.current, {
      backgroundColor: "#0a0a0a", scale: 2, useCORS: true, allowTaint: true,
    } as any);
    const archivo = `layout-${nombre.replace(/\s+/g, "-").toLowerCase()}`;
    if (formato === "png") {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${archivo}.png`;
      a.click();
      return;
    }
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    const esc = Math.min((w - 20) / canvas.width, (h - 30) / canvas.height);
    pdf.setFontSize(12);
    pdf.text(`Layout · ${nombre}`, 10, 12);
    pdf.setFontSize(8);
    pdf.text(`${ancho} × ${largo} m · ${totales.total.toFixed(1)} kg en total · ${totales.colgado.toFixed(1)} kg colgados`, 10, 18);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 22, canvas.width * esc, canvas.height * esc);
    pdf.save(`${archivo}.pdf`);
  }

  const visibles = piezas.filter(p => (p.colgado ? capas.colgado : capas.piso));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
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
            <button onClick={() => setCapas(c => ({ ...c, piso: !c.piso }))} className={`${BOTON} ${capas.piso ? "text-gray-300" : "opacity-50"}`}>Piso</button>
            <button onClick={() => setCapas(c => ({ ...c, colgado: !c.colgado }))} className={`${BOTON} ${capas.colgado ? "text-gray-300" : "opacity-50"}`}>Colgado</button>
            <span className="w-px h-4 bg-[#2a2a2a]" />
            <button onClick={() => setVista(v => ({ ...v, zoom: clamp(v.zoom / 1.25, 0.4, 6) }))} className={BOTON}><ZoomOut size={12} /></button>
            <button onClick={() => setVista(v => ({ ...v, zoom: clamp(v.zoom * 1.25, 0.4, 6) }))} className={BOTON}><ZoomIn size={12} /></button>
            <button onClick={() => setVista({ zoom: 1, x: 0, y: 0 })} className={BOTON}><Maximize size={12} /> Ajustar</button>
            <span className="w-px h-4 bg-[#2a2a2a]" />
            <button onClick={() => exportar("png")} className={BOTON}><Download size={12} /> PNG</button>
            <button onClick={() => exportar("pdf")} className={BOTON}><FileDown size={12} /> PDF</button>
          </div>
        </div>

        <div
          ref={lienzoRef}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden select-none touch-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
          onDragOver={ev => ev.preventDefault()}
          onDrop={onDrop}
        >
          <svg ref={svgRef} viewBox={`-6 -6 ${vbAncho + 12} ${vbLargo + 22}`} className="w-full h-auto block">
            <defs>
              <pattern id="rejilla" width={pxPorM} height={pxPorM} patternUnits="userSpaceOnUse">
                <path d={`M ${pxPorM} 0 L 0 0 0 ${pxPorM}`} fill="none" stroke="#1c1c1c" strokeWidth="0.4" />
              </pattern>
            </defs>

            {/* Fondo capturador: arrastrar aquí panea el plano. */}
            <rect x={-6} y={-6} width={vbAncho + 12} height={vbLargo + 22} fill="transparent" onPointerDown={onPointerDownFondo} className="cursor-grab" />

            <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.zoom})`}>
              <rect x={0} y={0} width={vbAncho} height={vbLargo} fill="#0e0e0e" stroke="#2a2a2a" strokeWidth="0.6" onPointerDown={onPointerDownFondo} />
              <rect x={0} y={0} width={vbAncho} height={vbLargo} fill="url(#rejilla)" style={{ pointerEvents: "none" }} />

              {/* El público siempre está al frente: orienta a quien lee el plano. */}
              <text x={vbAncho / 2} y={vbLargo + 12} fill="#555" fontSize="4" textAnchor="middle" letterSpacing="1.2" style={{ pointerEvents: "none" }}>
                PÚBLICO
              </text>

              {visibles.map(p => {
                const x = p.x * pxPorM;
                const y = p.y * pxPorM;
                const w = p.anchoM * pxPorM;
                const h = p.largoM * pxPorM;
                const activa = p.id === sel;
                return (
                  <g
                    key={p.id}
                    transform={`rotate(${p.rot} ${x + w / 2} ${y + h / 2})`}
                    onPointerDown={ev => onPointerDownPieza(ev, p)}
                    className="cursor-move"
                  >
                    <rect
                      x={x} y={y} width={w} height={h} rx={0.8}
                      fill={p.colgado ? "#1d2436" : p.equipoId ? "#1a1710" : "#161616"}
                      stroke={activa ? "#B3985B" : p.colgado ? "#3c4a6b" : "#303030"}
                      strokeWidth={activa ? 1 : 0.5}
                      strokeDasharray={p.colgado ? "2 1.2" : undefined}
                    />
                    {p.imagenUrl && (
                      <image
                        href={p.imagenUrl}
                        x={x + 0.6} y={y + 0.6}
                        width={Math.max(0.1, w - 1.2)} height={Math.max(0.1, h - 1.2)}
                        preserveAspectRatio="xMidYMid meet"
                        style={{ pointerEvents: "none" }}
                      />
                    )}
                    <text
                      x={x + w / 2} y={y + h + 3}
                      fill={activa ? "#B3985B" : "#8b8b8b"}
                      fontSize="2.6" textAnchor="middle"
                      style={{ pointerEvents: "none" }}
                    >
                      {p.etiqueta.length > 22 ? `${p.etiqueta.slice(0, 21)}…` : p.etiqueta}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <p className="text-[10px] text-gray-600">
          Arrastra del banco al plano. Mover se acomoda a 25 cm; la rueda hace zoom y arrastrar el fondo panea.
          Con una pieza seleccionada: <span className="text-gray-400">R</span> gira 15° (<span className="text-gray-400">Shift+R</span> al revés),
          {" "}<span className="text-gray-400">Supr</span> borra.
        </p>
      </div>

      {/* ── Panel lateral ── */}
      <div className="space-y-3">
        <div className="ms-card p-3">
          <p className="ms-section-label">Peso</p>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="text-white font-semibold">{totales.total.toFixed(1)} kg</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Colgado</span><span className="text-[#B3985B] font-semibold">{totales.colgado.toFixed(1)} kg</span></div>
            <div className="flex justify-between"><span className="text-gray-500">En piso</span><span className="text-gray-300">{totales.piso.toFixed(1)} kg</span></div>
          </div>
          <p className="text-[10px] text-gray-600 mt-2 leading-tight">
            Suma el peso capturado en catálogo. Las piezas sin peso cuentan como cero.
          </p>
        </div>

        {seleccionada && (
          <div className="ms-card p-3">
            <p className="ms-section-label">Pieza</p>
            <p className="text-xs text-white mt-1.5 truncate">{seleccionada.etiqueta}</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="ms-label block mb-1">Ancho (m)</label>
                <input
                  type="number" step="0.05" min="0.1"
                  value={seleccionada.anchoM}
                  onChange={e => redimensionar(seleccionada, { anchoM: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                  className="w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="ms-label block mb-1">Fondo (m)</label>
                <input
                  type="number" step="0.05" min="0.1"
                  value={seleccionada.largoM}
                  onChange={e => redimensionar(seleccionada, { largoM: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                  className="w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="ms-label block mb-1">Giro (°)</label>
                <input
                  type="number" step="5"
                  value={Math.round(seleccionada.rot)}
                  onChange={e => mutar(seleccionada.id, { rot: ((parseFloat(e.target.value) || 0) % 360 + 360) % 360 })}
                  className="w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="ms-label block mb-1">Peso (kg)</label>
                <input
                  type="number" step="0.5" min="0"
                  value={seleccionada.pesoKg ?? ""}
                  onChange={e => mutar(seleccionada.id, { pesoKg: e.target.value === "" ? undefined : Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                />
              </div>
            </div>
            {seleccionada.equipoId && (
              <p className="text-[10px] text-gray-600 mt-1.5 leading-tight">
                El tamaño se aplica a todas las piezas de este modelo y se guarda en su ficha de catálogo.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button onClick={() => mutar(seleccionada.id, { rot: (seleccionada.rot + 90) % 360 })} className={BOTON}>
                <RotateCw size={12} /> 90°
              </button>
              <button onClick={() => mutar(seleccionada.id, { colgado: !seleccionada.colgado })} className={`${BOTON} ${seleccionada.colgado ? "text-[#B3985B] border-[#B3985B]/40" : ""}`}>
                <Anchor size={12} /> Colgado
              </button>
              <button onClick={() => duplicar(seleccionada)} className={BOTON}><Copy size={12} /> Duplicar</button>
              <button onClick={() => borrar(seleccionada.id)} className={`${BOTON} hover:text-red-400`}><Trash2 size={12} /> Borrar</button>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <input
                type="number" min="1" max="24" value={copias}
                onChange={e => setCopias(e.target.value)}
                className="w-12 bg-[#0e0e0e] border border-[#1f1f1f] rounded px-1.5 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
              />
              <button onClick={() => duplicar(seleccionada, clamp(parseInt(copias) || 1, 1, 24))} className={BOTON}>
                Duplicar en fila
              </button>
            </div>
          </div>
        )}

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
