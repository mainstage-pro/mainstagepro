"use client";

import { useMemo, useState } from "react";
import type { DocumentoLayout, FilaEquipo, ZonaDoc } from "@/lib/layout-produccion";
import { rotuloEnLineas } from "@/lib/layout-escenario";

/** El plano siempre mide 100 unidades de ancho; el largo se escala a eso. */
const VB_ANCHO = 100;

function kg(v: number) {
  return v >= 100 ? `${Math.round(v)} kg` : `${v.toFixed(1)} kg`;
}

function Dato({ valor, label, acento }: { valor: string; label: string; acento?: boolean }) {
  return (
    <div className="flex-1 min-w-[5.5rem] rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
      <p className={`text-base sm:text-lg leading-none ${acento ? "text-[#B3985B]" : "text-white"}`}>{valor}</p>
      <p className="text-[9px] tracking-[0.12em] text-white/35 mt-1.5">{label}</p>
    </div>
  );
}

function Equipo({ e }: { e: FilaEquipo }) {
  const detalle = [e.configuracion, e.montaje, e.carga].filter(Boolean).join(" · ");
  return (
    <div className="flex gap-3 py-3 border-b border-white/5 last:border-0">
      <span className="w-11 h-11 shrink-0 rounded-lg bg-white/[0.03] border border-white/8 overflow-hidden flex items-center justify-center">
        {e.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.imagenUrl} alt="" className="w-full h-full object-contain" />
        ) : (
          <span className="text-[9px] text-white/20">s/f</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-white leading-snug">
          <span className="text-[#B3985B]">{e.cantidad}×</span> {e.nombre}
        </p>
        <p className="text-[11px] text-white/40 leading-snug mt-0.5">{e.descripcion}</p>
        {detalle && <p className="text-[11px] text-white/55 leading-snug mt-1">{detalle}</p>}
        {e.notas && (
          <p className="text-[11px] text-[#B3985B]/85 leading-snug mt-1 border-l border-[#B3985B]/30 pl-2">
            {e.notas}
          </p>
        )}
      </div>
      {e.colgado && (
        <span className="shrink-0 h-fit text-[9px] px-1.5 py-0.5 rounded border border-white/15 text-white/45">
          volado
        </span>
      )}
    </div>
  );
}

function Zona({ z, abierta, onAlternar }: { z: ZonaDoc; abierta: boolean; onAlternar: () => void }) {
  const amperes = [
    z.carga.amperaje110 > 0 ? `${z.carga.amperaje110.toFixed(1)} A 110V` : null,
    z.carga.amperaje220 > 0 ? `${z.carga.amperaje220.toFixed(1)} A 220V` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div
      id={`zona-${z.clave}`}
      className={`rounded-2xl border overflow-hidden transition-colors ${
        abierta ? "border-white/18 bg-white/[0.03]" : "border-white/8 bg-white/[0.015]"
      }`}
    >
      <button onClick={onAlternar} className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-white/5">
        <span className="w-3 h-3 rounded shrink-0" style={{ background: z.color }} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] text-white leading-tight">{z.etiqueta}</span>
          <span className="block text-[11px] text-white/40 leading-tight mt-0.5">
            {z.unidades} unidades · {kg(z.pesoKg)}
            {amperes && ` · ${amperes}`}
          </span>
        </span>
        <span className={`shrink-0 text-white/30 text-lg leading-none transition-transform ${abierta ? "rotate-45" : ""}`}>
          +
        </span>
      </button>

      {abierta && (
        <div className="px-4 pb-4 space-y-4">
          {z.subzonas.map(sub => (
            <div key={sub.clave}>
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: sub.color }} />
                <p className="text-[12px] text-white/85 flex-1 min-w-0 truncate">{sub.etiqueta}</p>
                <p className="text-[10px] text-white/35 shrink-0">
                  {sub.unidades} uds · {kg(sub.pesoKg)}
                </p>
              </div>
              {sub.equipos.map(e => (
                <Equipo key={e.clave} e={e} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LayoutProduccionPublico({ doc }: { doc: DocumentoLayout }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const { anchoM, largoM, areas, piezas } = doc.plano;

  const pxPorM = VB_ANCHO / anchoM;
  const vbLargo = largoM * pxPorM;
  const areasZona = useMemo(() => areas.filter(a => a.clase === "ZONA"), [areas]);
  const areasSub = useMemo(() => areas.filter(a => a.clase === "SUBZONA"), [areas]);

  function abrir(clave: string) {
    setAbierta(clave);
    // En celular la lista queda debajo del plano: tocar un área tiene que llevarte allá.
    document.getElementById(`zona-${clave}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const fecha = new Date(doc.proyecto.fechaEvento).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="px-5 pt-8 pb-5 max-w-3xl mx-auto">
        <p className="text-[10px] tracking-[0.3em] text-[#B3985B]">LAYOUT DE PRODUCCIÓN</p>
        <h1 className="text-[26px] sm:text-3xl leading-tight mt-2">{doc.escenario.nombre}</h1>
        <p className="text-[13px] text-white/50 mt-1">{doc.proyecto.nombre}</p>

        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 text-[11px] text-white/45">
          <span>{doc.proyecto.numero}</span>
          <span>{doc.proyecto.cliente}</span>
          <span className="capitalize">{fecha}</span>
          {doc.proyecto.lugar && <span>{doc.proyecto.lugar}</span>}
          <span>{anchoM} × {largoM} m</span>
        </div>
      </header>

      <section className="px-5 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-white/8 bg-[#070707] overflow-hidden">
          <svg viewBox={`-4 -4 ${VB_ANCHO + 8} ${vbLargo + 16}`} className="w-full h-auto block">
            <defs>
              <pattern id="rej" width={pxPorM} height={pxPorM} patternUnits="userSpaceOnUse">
                <path d={`M ${pxPorM} 0 L 0 0 0 ${pxPorM}`} fill="none" stroke="#191919" strokeWidth="0.35" />
              </pattern>
            </defs>

            <rect x={0} y={0} width={VB_ANCHO} height={vbLargo} fill="#0d0d0d" stroke="#2a2a2a" strokeWidth="0.5" />
            <rect x={0} y={0} width={VB_ANCHO} height={vbLargo} fill="url(#rej)" />

            {piezas.map(p => (
              <rect
                key={p.id}
                x={p.x * pxPorM} y={p.y * pxPorM}
                width={Math.max(0.6, p.anchoM * pxPorM)} height={Math.max(0.6, p.largoM * pxPorM)}
                transform={`rotate(${p.rot} ${(p.x + p.anchoM / 2) * pxPorM} ${(p.y + p.largoM / 2) * pxPorM})`}
                fill={p.colgado ? "#1d2436" : "#1a1a1a"}
                stroke={p.colgado ? "#3c4a6b" : "#2e2e2e"}
                strokeWidth={0.35}
              />
            ))}

            {areasSub.map(a => (
              <rect
                key={a.id}
                x={a.x * pxPorM} y={a.y * pxPorM} width={a.anchoM * pxPorM} height={a.largoM * pxPorM} rx={0.8}
                fill={a.color} fillOpacity={0.26} stroke={a.color} strokeOpacity={0.6}
                strokeWidth={0.45} strokeDasharray="2 1.4"
              />
            ))}

            {areasZona.map(a => {
              const activa = abierta === a.clave;
              const bx = a.x * pxPorM;
              const by = a.y * pxPorM;
              const bw = a.anchoM * pxPorM;
              const r = rotuloEnLineas(a.etiqueta.toUpperCase(), bw - 2.4, 2.4);
              const pad = r.fs * 0.5;
              const tx = bx + 0.6 + pad;
              return (
                <g key={a.id} onClick={() => abrir(a.clave)} className="cursor-pointer">
                  <rect
                    x={bx} y={by} width={bw} height={a.largoM * pxPorM} rx={1}
                    fill={a.color} fillOpacity={activa ? 0.34 : 0.16}
                    stroke={a.color} strokeOpacity={activa ? 1 : 0.85} strokeWidth={activa ? 1.3 : 0.7}
                  />
                  <rect
                    x={bx + 0.6} y={by + 0.6}
                    width={Math.min(bw - 1.2, r.ancho + pad * 2)}
                    height={r.lineas.length * r.fs * 1.2 + pad * 1.4}
                    rx={r.fs * 0.3} fill={a.color} fillOpacity={0.95}
                    style={{ pointerEvents: "none" }}
                  />
                  <text
                    x={tx} y={by + 0.6 + pad * 0.7 + r.fs * 0.92}
                    fill="#050505" fontSize={r.fs} fontWeight={700}
                    style={{ pointerEvents: "none" }}
                  >
                    {r.lineas.map((l, i) => (
                      <tspan key={i} x={tx} dy={i === 0 ? 0 : r.fs * 1.2}>{l}</tspan>
                    ))}
                  </text>
                </g>
              );
            })}

            <text x={VB_ANCHO / 2} y={vbLargo + 8} fill="#4a4a4a" fontSize="3.4" textAnchor="middle" letterSpacing="1.4">
              PÚBLICO
            </text>
          </svg>
        </div>
        {areasZona.length > 0 && (
          <p className="text-[11px] text-white/30 mt-2 text-center">Toca un área del plano para ver qué lleva.</p>
        )}
      </section>

      <section className="px-5 max-w-3xl mx-auto mt-6">
        <div className="flex flex-wrap gap-2">
          <Dato valor={String(doc.totales.unidades)} label="UNIDADES" />
          <Dato valor={kg(doc.totales.pesoKg)} label="PESO TOTAL" />
          <Dato valor={kg(doc.totales.pesoColgadoKg)} label="VOLADO" />
          <Dato valor={`${doc.totales.carga.amperaje110.toFixed(1)} A`} label="110 V" acento />
          <Dato valor={`${doc.totales.carga.amperaje220.toFixed(1)} A`} label="220 V" acento />
        </div>
        {doc.totales.carga.sinDato > 0 && (
          <p className="text-[11px] text-amber-500/80 mt-2">
            {doc.totales.carga.sinDato} unidades sin amperaje capturado: el consumo mostrado es un piso.
          </p>
        )}
      </section>

      <section className="px-5 max-w-3xl mx-auto mt-6 space-y-2.5 pb-16">
        {doc.zonas.map(z => (
          <Zona
            key={z.clave}
            z={z}
            abierta={abierta === z.clave}
            onAlternar={() => setAbierta(a => (a === z.clave ? null : z.clave))}
          />
        ))}

        {doc.escenario.notas && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.015] px-4 py-4 mt-4">
            <p className="text-[10px] tracking-[0.16em] text-white/35">NOTAS DEL ESCENARIO</p>
            <p className="text-[13px] text-white/70 leading-relaxed mt-2 whitespace-pre-wrap">{doc.escenario.notas}</p>
          </div>
        )}

        <p className="text-[10px] text-white/25 text-center pt-6">
          Versión final · generada el{" "}
          {new Date(doc.generadoEn).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </section>
    </div>
  );
}
