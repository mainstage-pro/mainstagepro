"use client";

import { Eye, EyeOff, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Capa,
  type ObjetoPlano,
  ETIQUETA_TIPO,
  LIENZO_SIN_FONDO,
  colorDe,
  medidaDe,
  parsearContenido,
} from "@/lib/site-plan";
import { iconoDe } from "@/lib/site-plan-iconos";
import { BarraDeEscala, CapaDeObjetos } from "./dibujo";

/**
 * El plano como lo ve quien lo recibe: se mueve, se acerca y se apagan capas,
 * pero nada se edita. Es la misma función de dibujo del editor, así que el venue
 * y producción discuten exactamente sobre la misma figura.
 */
export default function SitePlanVista({
  nombre,
  subtitulo,
  contenido,
  fondoUrl,
  fondoAncho,
  fondoAlto,
  escala,
  notas,
}: {
  nombre: string;
  subtitulo?: string;
  contenido: string | null;
  fondoUrl: string | null;
  fondoAncho: number | null;
  fondoAlto: number | null;
  escala: number | null;
  notas?: string | null;
}) {
  const { capas: capasBase, objetos } = useMemo(() => parsearContenido(contenido), [contenido]);
  const [apagadas, setApagadas] = useState<Set<string>>(new Set());

  const ancho = fondoAncho ?? LIENZO_SIN_FONDO.ancho;
  const alto = fondoAlto ?? LIENZO_SIN_FONDO.alto;

  const capas: Capa[] = capasBase.map(c => ({ ...c, visible: c.visible && !apagadas.has(c.id) }));
  const visibles = objetos.filter(o => !o.oculto && capas.find(c => c.id === o.capaId)?.visible !== false);

  const [vista, setVista] = useState({ x: 0, y: 0, k: 1 });
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const cajaRef = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null);

  useEffect(() => {
    const caja = cajaRef.current;
    if (!caja) return;
    const ro = new ResizeObserver(([e]) => setTam({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(caja);
    return () => ro.disconnect();
  }, []);

  const encuadrar = useCallback(() => {
    if (!tam.w || !tam.h) return;
    const k = Math.min(tam.w / ancho, tam.h / alto) * 0.94;
    setVista({ k, x: (tam.w - ancho * k) / 2, y: (tam.h - alto * k) / 2 });
  }, [tam.w, tam.h, ancho, alto]);

  useEffect(() => {
    encuadrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tam.w > 0, tam.h > 0, ancho, alto]);

  useEffect(() => {
    const caja = cajaRef.current;
    if (!caja) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const r = caja!.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      setVista(v => {
        const k = Math.min(40, Math.max(0.02, v.k * Math.exp(-e.deltaY * 0.0014)));
        return { k, x: sx - ((sx - v.x) / v.k) * k, y: sy - ((sy - v.y) / v.k) * k };
      });
    }
    caja.addEventListener("wheel", onWheel, { passive: false });
    return () => caja.removeEventListener("wheel", onWheel);
  }, []);

  function zoom(factor: number) {
    setVista(v => {
      const k = Math.min(40, Math.max(0.02, v.k * factor));
      return { k, x: tam.w / 2 - ((tam.w / 2 - v.x) / v.k) * k, y: tam.h / 2 - ((tam.h / 2 - v.y) / v.k) * k };
    });
  }

  function alternar(id: string) {
    setApagadas(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  // La leyenda lista lo que tiene nombre: un trazo sin rotular no se explica solo
  // y llenaría la columna de renglones "Trazo".
  const leyenda = capasBase.map(capa => ({
    capa,
    items: objetos.filter(o => o.capaId === capa.id && o.etiqueta.trim() && o.tipo !== "TEXTO"),
  }));

  const unidad = 1 / vista.k;

  return (
    <div className="flex flex-col lg:flex-row gap-3 min-h-0 flex-1">
      <div
        ref={cajaRef}
        className="flex-1 min-w-0 min-h-[55vh] lg:min-h-0 rounded-xl overflow-hidden border border-[#1a1a1a] bg-[#0b0b0b] relative"
      >
        <svg
          className="w-full h-full touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={e => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            arrastre.current = { sx: e.clientX, sy: e.clientY, vx: vista.x, vy: vista.y };
          }}
          onPointerMove={e => {
            const a = arrastre.current;
            if (!a) return;
            setVista(v => ({ ...v, x: a.vx + (e.clientX - a.sx), y: a.vy + (e.clientY - a.sy) }));
          }}
          onPointerUp={() => {
            arrastre.current = null;
          }}
        >
          <g transform={`translate(${vista.x},${vista.y}) scale(${vista.k})`}>
            {fondoUrl ? (
              <image href={fondoUrl} x={0} y={0} width={ancho} height={alto} preserveAspectRatio="none" />
            ) : (
              <rect x={0} y={0} width={ancho} height={alto} fill="#141414" />
            )}
            <CapaDeObjetos objetos={visibles} capas={capas} unidad={unidad} escala={escala} conMedidas />
          </g>
          {tam.h ? (
            <g transform={`translate(16, ${tam.h - 14})`}>
              <BarraDeEscala escala={escala ? escala / vista.k : null} anchoPx={180} />
            </g>
          ) : null}
        </svg>

        <div className="absolute top-3 right-3 flex items-center gap-0.5 ms-card p-0.5">
          <button type="button" onClick={() => zoom(1.25)} className="ms-btn-icon" title="Acercar">
            <ZoomIn size={15} />
          </button>
          <button type="button" onClick={() => zoom(0.8)} className="ms-btn-icon" title="Alejar">
            <ZoomOut size={15} />
          </button>
          <button type="button" onClick={encuadrar} className="ms-btn-icon" title="Encuadrar">
            <Maximize size={15} />
          </button>
        </div>
      </div>

      <aside className="w-full lg:w-72 shrink-0 ms-card p-4 flex flex-col gap-3 lg:overflow-y-auto ms-no-scrollbar">
        <div>
          <h1 className="ms-h2">{nombre}</h1>
          {subtitulo ? <p className="ms-subtitle mt-0.5">{subtitulo}</p> : null}
        </div>

        {leyenda.map(({ capa, items }) => (
          <div key={capa.id}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: capa.color }} />
              <span className="flex-1 min-w-0 truncate text-[12px] text-[#ddd]">{capa.nombre}</span>
              <button
                type="button"
                onClick={() => alternar(capa.id)}
                className={apagadas.has(capa.id) ? "text-[#444]" : "text-[#888] hover:text-[#ddd]"}
              >
                {apagadas.has(capa.id) ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <div className={apagadas.has(capa.id) ? "opacity-40" : ""}>
              {items.map(o => (
                <ItemLeyenda key={o.id} o={o} capas={capasBase} escala={escala} />
              ))}
            </div>
          </div>
        ))}

        {notas ? (
          <>
            <div className="ms-divider" />
            <div>
              <p className="ms-section-label mb-1">Notas</p>
              <p className="ms-meta whitespace-pre-wrap">{notas}</p>
            </div>
          </>
        ) : null}

        {!escala ? <p className="ms-micro text-[#555]">Plano sin escala calibrada: las medidas son indicativas.</p> : null}
      </aside>
    </div>
  );
}

function ItemLeyenda({ o, capas, escala }: { o: ObjetoPlano; capas: Capa[]; escala: number | null }) {
  const Icono = iconoDe(o.icono)?.Icono;
  const color = colorDe(o, capas);
  const medida = medidaDe(o, escala);

  return (
    <div className="flex items-center gap-1.5 pl-1 py-0.5">
      {Icono ? (
        <Icono size={12} color={color} />
      ) : (
        <span className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: color }} />
      )}
      <span className="flex-1 min-w-0 truncate text-[11px] text-[#bbb]">{o.etiqueta || ETIQUETA_TIPO[o.tipo]}</span>
      {medida ? <span className="ms-micro text-[#666] shrink-0">{medida}</span> : null}
    </div>
  );
}
