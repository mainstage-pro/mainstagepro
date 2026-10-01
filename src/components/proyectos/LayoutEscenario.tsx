"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, RotateCw, Trash2, Download, FileDown, Anchor } from "lucide-react";
import { useToast } from "@/components/Toast";
import {
  PALETA_BACKLINE,
  TAMANO_RIDER,
  cajaDe,
  nuevoIdPieza,
  parsearLayout,
  snap,
  totalesDeLayout,
  type ItemPaleta,
  type Pieza,
} from "@/lib/layout-escenario";

export type EquipoDelRider = {
  id: string;
  cantidad: number;
  equipo: { marca: string | null; modelo: string | null; descripcion: string; pesoKg: number | null };
};

/** Fondo del escenario cuando no se capturaron medidas: suficiente para empezar a dibujar. */
const ANCHO_DEFAULT = 12;
const LARGO_DEFAULT = 8;

/** El escenario siempre mide 100 unidades de viewBox de ancho; el resto se escala a eso. */
const VB_ANCHO = 100;
/** Margen horizontal total del viewBox (6 por lado). */
const VB_PAD = 12;

const BOTON = "text-[11px] px-2 py-1 rounded border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#444] transition-colors disabled:opacity-40 flex items-center gap-1";

function nombreCorto(e: EquipoDelRider) {
  return [e.equipo.marca, e.equipo.modelo].filter(Boolean).join(" ") || e.equipo.descripcion;
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
  const lienzoRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const arrastre = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const primerRender = useRef(true);

  const totales = useMemo(() => totalesDeLayout(piezas), [piezas]);
  const seleccionada = piezas.find(p => p.id === sel) ?? null;

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

  /**
   * Metros por pixel del lienzo renderizado. El SVG se dibuja con `vbAncho` unidades de
   * escenario más `VB_PAD` de margen, así que el ancho en pantalla no equivale al ancho
   * del escenario y hay que descontar el margen o el arrastre se desfasa.
   */
  const metrosPorPx = useCallback(() => {
    const caja = lienzoRef.current?.getBoundingClientRect();
    const px = caja?.width || 800;
    return (ancho / VB_ANCHO) * ((VB_ANCHO + VB_PAD) / px);
  }, [ancho]);

  function agregar(item: ItemPaleta, extra?: Partial<Pieza>) {
    const p: Pieza = {
      id: nuevoIdPieza(),
      tipo: item.tipo,
      etiqueta: item.etiqueta,
      x: snap(Math.max(0, ancho / 2 - item.anchoM / 2)),
      y: snap(Math.max(0, largo / 2 - item.largoM / 2)),
      anchoM: item.anchoM,
      largoM: item.largoM,
      rot: 0,
      ...(item.colgado ? { colgado: true } : {}),
      ...extra,
    };
    setPiezas(prev => [...prev, p]);
    setSel(p.id);
  }

  function agregarDelRider(e: EquipoDelRider) {
    agregar(
      { tipo: "RIDER", etiqueta: nombreCorto(e), ...TAMANO_RIDER },
      { proyectoEquipoId: e.id, pesoKg: e.equipo.pesoKg ?? undefined },
    );
  }

  function mutar(id: string, cambio: Partial<Pieza>) {
    setPiezas(prev => prev.map(p => p.id === id ? { ...p, ...cambio } : p));
  }

  function duplicar(p: Pieza) {
    const copia: Pieza = { ...p, id: nuevoIdPieza(), x: snap(p.x + 0.5), y: snap(p.y + 0.5) };
    setPiezas(prev => [...prev, copia]);
    setSel(copia.id);
  }

  function borrar(id: string) {
    setPiezas(prev => prev.filter(p => p.id !== id));
    setSel(null);
  }

  function onPointerDownPieza(ev: React.PointerEvent, p: Pieza) {
    ev.stopPropagation();
    setSel(p.id);
    const mpp = metrosPorPx();
    arrastre.current = { id: p.id, dx: ev.clientX * mpp - p.x, dy: ev.clientY * mpp - p.y };
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
  }

  function onPointerMove(ev: React.PointerEvent) {
    const a = arrastre.current;
    if (!a) return;
    const mpp = metrosPorPx();
    const pieza = piezas.find(p => p.id === a.id);
    if (!pieza) return;
    const caja = cajaDe(pieza);
    const x = snap(Math.min(Math.max(0, ev.clientX * mpp - a.dx), Math.max(0, ancho - caja.ancho)));
    const y = snap(Math.min(Math.max(0, ev.clientY * mpp - a.dy), Math.max(0, largo - caja.largo)));
    mutar(a.id, { x, y });
  }

  function onPointerUp() { arrastre.current = null; }

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (!sel) return;
      const activo = document.activeElement?.tagName;
      if (activo === "INPUT" || activo === "TEXTAREA") return;
      if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); borrar(sel); }
      if (ev.key === "r" || ev.key === "R") {
        const p = piezas.find(x => x.id === sel);
        if (p) mutar(sel, { rot: ((p.rot + 90) % 360) as Pieza["rot"] });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, piezas]);

  async function exportar(formato: "png" | "pdf") {
    if (!lienzoRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    // `as any`: el @types/html2canvas del repo es de la 0.5 y tapa los tipos reales de la 1.4.
    const canvas = await html2canvas(lienzoRef.current, { backgroundColor: "#0a0a0a", scale: 2 } as any);
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

  const pxPorM = VB_ANCHO / ancho; // unidades de viewBox por metro
  const vbAncho = VB_ANCHO;
  const vbLargo = largo * pxPorM;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
      {/* ── Lienzo ── */}
      <div className="min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span>{ancho} × {largo} m</span>
            {(!anchoM || !largoM) && <span className="text-amber-500">medidas por capturar</span>}
            <span className="text-gray-700">·</span>
            <span>
              {estado === "guardando" ? "Guardando…" : estado === "sucio" ? "Sin guardar" : "Guardado"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
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
        >
          <svg
            ref={svgRef}
            viewBox={`-6 -6 ${vbAncho + 12} ${vbLargo + 22}`}
            className="w-full h-auto block"
            onPointerDown={() => setSel(null)}
          >
            <defs>
              <pattern id="rejilla" width={pxPorM} height={pxPorM} patternUnits="userSpaceOnUse">
                <path d={`M ${pxPorM} 0 L 0 0 0 ${pxPorM}`} fill="none" stroke="#1c1c1c" strokeWidth="0.4" />
              </pattern>
            </defs>

            <rect x={0} y={0} width={vbAncho} height={vbLargo} fill="#0e0e0e" stroke="#2a2a2a" strokeWidth="0.6" />
            <rect x={0} y={0} width={vbAncho} height={vbLargo} fill="url(#rejilla)" />

            {/* El público siempre está al frente: orienta a quien lee el plano. */}
            <text x={vbAncho / 2} y={vbLargo + 12} fill="#555" fontSize="4" textAnchor="middle" letterSpacing="1.2">
              PÚBLICO
            </text>

            {piezas.map(p => {
              const caja = cajaDe(p);
              const x = p.x * pxPorM;
              const y = p.y * pxPorM;
              const w = caja.ancho * pxPorM;
              const h = caja.largo * pxPorM;
              const activa = p.id === sel;
              return (
                <g key={p.id} onPointerDown={ev => onPointerDownPieza(ev, p)} className="cursor-move">
                  <rect
                    x={x} y={y} width={w} height={h} rx={0.8}
                    fill={p.colgado ? "#1d2436" : p.proyectoEquipoId ? "#1f1c12" : "#161616"}
                    stroke={activa ? "#B3985B" : p.colgado ? "#3c4a6b" : "#303030"}
                    strokeWidth={activa ? 1 : 0.5}
                    strokeDasharray={p.colgado ? "2 1.2" : undefined}
                  />
                  <text
                    x={x + w / 2} y={y + h / 2 + 1.1}
                    fill={activa ? "#B3985B" : "#9ca3af"}
                    fontSize="3" textAnchor="middle"
                    style={{ pointerEvents: "none" }}
                  >
                    {p.etiqueta.length > 18 ? `${p.etiqueta.slice(0, 17)}…` : p.etiqueta}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <p className="text-[10px] text-gray-600">
          Arrastra para mover (se acomoda a 25 cm). Con una pieza seleccionada: <span className="text-gray-400">R</span> rota,
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
                  onChange={e => mutar(seleccionada.id, { anchoM: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                  className="w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="ms-label block mb-1">Fondo (m)</label>
                <input
                  type="number" step="0.05" min="0.1"
                  value={seleccionada.largoM}
                  onChange={e => mutar(seleccionada.id, { largoM: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                  className="w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div className="col-span-2">
                <label className="ms-label block mb-1">Peso de la pieza (kg)</label>
                <input
                  type="number" step="0.5" min="0"
                  value={seleccionada.pesoKg ?? ""}
                  onChange={e => mutar(seleccionada.id, { pesoKg: e.target.value === "" ? undefined : Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full bg-[#0e0e0e] border border-[#1f1f1f] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button onClick={() => mutar(seleccionada.id, { rot: ((seleccionada.rot + 90) % 360) as Pieza["rot"] })} className={BOTON}>
                <RotateCw size={12} /> Rotar
              </button>
              <button onClick={() => mutar(seleccionada.id, { colgado: !seleccionada.colgado })} className={`${BOTON} ${seleccionada.colgado ? "text-[#B3985B] border-[#B3985B]/40" : ""}`}>
                <Anchor size={12} /> Colgado
              </button>
              <button onClick={() => duplicar(seleccionada)} className={BOTON}><Copy size={12} /> Duplicar</button>
              <button onClick={() => borrar(seleccionada.id)} className={`${BOTON} hover:text-red-400`}><Trash2 size={12} /> Borrar</button>
            </div>
          </div>
        )}

        <div className="ms-card p-3">
          <p className="ms-section-label">Rider del escenario</p>
          {rider.length === 0 ? (
            <p className="text-[11px] text-gray-600 mt-1.5 leading-tight">
              Nada asignado todavía. Asigna equipo a este escenario desde la pestaña de producción.
            </p>
          ) : (
            <div className="mt-2 space-y-1 max-h-56 overflow-y-auto">
              {rider.map(e => (
                <button
                  key={e.id}
                  onClick={() => agregarDelRider(e)}
                  className="w-full text-left px-2 py-1.5 rounded border border-[#1f1f1f] hover:border-[#B3985B]/50 transition-colors"
                >
                  <p className="text-[11px] text-white truncate">{nombreCorto(e)}</p>
                  <p className="text-[10px] text-gray-600">
                    ×{e.cantidad}{e.equipo.pesoKg != null ? ` · ${e.equipo.pesoKg} kg c/u` : " · sin peso"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ms-card p-3">
          <p className="ms-section-label">Backline</p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {PALETA_BACKLINE.map(item => (
              <button
                key={item.tipo}
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
