"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getDireccionConfig,
  emptyDireccionData,
  promedioDireccion,
  contarCalificadas,
  nivelResultado,
  type EvaluacionDireccionData,
} from "@/lib/evaluacion-direccion";
import {
  getEvalConfig,
  emptyEvalData,
  contarIncidencias,
  type EvalPostEventoData,
  type FotoReporte,
} from "@/lib/evaluacion-post-evento";

function Estrellas({ valor, onChange, size = 24 }: { valor: number | null; onChange: (n: number | null) => void; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const activa = (valor ?? 0) >= n;
        return (
          <button key={n} type="button" onClick={() => onChange(valor === n ? null : n)} className="transition-transform hover:scale-110" aria-label={`${n} de 5`}>
            <svg width={size} height={size} viewBox="0 0 24 24" fill={activa ? "#FACC15" : "none"} stroke={activa ? "#FACC15" : "#3a3a3a"} strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

function Galeria({ fotos }: { fotos: FotoReporte[] }) {
  if (!fotos?.length) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {fotos.map((f, i) => (
        <a key={`${f.url}-${i}`} href={f.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-[#252525] bg-black aspect-square">
          {f.tipo === "video"
            ? <video src={f.url} className="w-full h-full object-cover" muted playsInline />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={f.url} alt={f.nombre} className="w-full h-full object-cover" />}
        </a>
      ))}
    </div>
  );
}

type ProyectoCtx = {
  nombre: string; numeroProyecto: string; fechaEvento: string;
  lugarEvento?: string | null; tipoServicio: string | null; coordinador: string | null;
  cliente: { nombre: string; empresa?: string | null };
};

export default function EvaluacionDireccionPage() {
  const { id } = useParams<{ id: string }>();

  const [proyecto, setProyecto] = useState<ProyectoCtx | null>(null);
  const [reporte, setReporte] = useState<EvalPostEventoData>(emptyEvalData());
  const [data, setData] = useState<EvaluacionDireccionData>(emptyDireccionData());
  const [loading, setLoading] = useState(true);
  const [prohibido, setProhibido] = useState(false);
  const [estado, setEstado] = useState<"idle" | "saving" | "saved">("idle");
  const [enviando, setEnviando] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/proyectos/${id}/evaluacion-direccion`, { cache: "no-store" });
    if (res.status === 403) { setProhibido(true); setLoading(false); return; }
    const d = await res.json();
    setProyecto(d.proyecto);
    setReporte({ ...emptyEvalData(), ...(d.reporte ?? {}) });
    if (d.evaluacion) setData({ ...emptyDireccionData(), ...d.evaluacion });
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const persistir = useCallback(async (next: EvaluacionDireccionData, finalizar?: boolean) => {
    setEstado("saving");
    const r = await fetch(`/api/proyectos/${id}/evaluacion-direccion`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calificaciones: next.calificaciones,
        notas: next.notas,
        comentario: next.comentario,
        repetiriamos: next.repetiriamos,
        ...(finalizar !== undefined ? { finalizada: finalizar } : {}),
      }),
    });
    if (r.ok) {
      const d = await r.json();
      setData(prev => ({ ...prev, evaluadoEn: d.evaluacion.evaluadoEn, actualizadoEn: d.evaluacion.actualizadoEn, finalizada: d.evaluacion.finalizada, finalizadaEn: d.evaluacion.finalizadaEn }));
      setEstado("saved");
      return true;
    }
    setEstado("idle");
    return false;
  }, [id]);

  const actualizar = useCallback((updater: (prev: EvaluacionDireccionData) => EvaluacionDireccionData) => {
    setData(prev => {
      const next = updater(prev);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { persistir(next); }, 800);
      return next;
    });
  }, [persistir]);

  const setCalif = (dimId: string, n: number | null) => actualizar(prev => ({ ...prev, calificaciones: { ...prev.calificaciones, [dimId]: n } }));
  const setNota = (dimId: string, val: string) => actualizar(prev => ({ ...prev, notas: { ...prev.notas, [dimId]: val } }));
  const setRepetiriamos = (v: EvaluacionDireccionData["repetiriamos"]) => actualizar(prev => ({ ...prev, repetiriamos: prev.repetiriamos === v ? null : v }));

  const finalizar = async () => { setEnviando(true); await persistir(data, true); setEnviando(false); };
  const reabrir = async () => { setEnviando(true); await persistir(data, false); setEnviando(false); };

  if (loading) return <div className="p-6 text-center text-[#444] text-sm">Cargando...</div>;
  if (prohibido) return (
    <div className="p-6 max-w-md mx-auto text-center space-y-3">
      <p className="text-white text-lg font-semibold">Solo dirección</p>
      <p className="text-[#666] text-sm">Esta evaluación la realiza dirección. No tienes permiso para verla.</p>
      <Link href={`/proyectos/${id}`} className="inline-block text-[#B3985B] hover:text-white text-sm">← Volver al proyecto</Link>
    </div>
  );
  if (!proyecto) return <div className="p-6 text-center text-[#444]">Proyecto no encontrado</div>;

  const config = getDireccionConfig(proyecto.tipoServicio);
  const reporteConfig = getEvalConfig(proyecto.tipoServicio);
  const prom = promedioDireccion(data, config);
  const nivel = nivelResultado(prom);
  const { calificadas, total } = contarCalificadas(data, config);
  const incidencias = contarIncidencias(reporte.items, reporteConfig.secciones);
  const bloqueado = data.finalizada;
  const reporteEnviado = reporte.completado;

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };
  const estadoTxt = estado === "saving" ? "Guardando…" : estado === "saved" ? "Guardado" : "";
  const propuestas = (reporte.propuestasMejora ?? []).map(p => p.trim()).filter(Boolean);
  const evidObligatorias = reporteConfig.evidencias;

  const REPET: { v: NonNullable<EvaluacionDireccionData["repetiriamos"]>; label: string; tono: string }[] = [
    { v: "si", label: "Sí", tono: "bg-green-900/50 border-green-600 text-green-300" },
    { v: "con_ajustes", label: "Con ajustes", tono: "bg-yellow-900/50 border-yellow-600 text-yellow-300" },
    { v: "no", label: "No", tono: "bg-red-900/50 border-red-600 text-red-300" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/proyectos/${id}`} className="text-[#555] hover:text-white text-xs">← {proyecto.numeroProyecto}</Link>
            <span className="text-[#333]">/</span>
            <span className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">{config.etiqueta}</span>
          </div>
          <h1 className="text-white text-2xl font-bold">{proyecto.nombre}</h1>
          <p className="text-[#555] text-sm mt-0.5">
            {proyecto.cliente.nombre} · {fmtDate(proyecto.fechaEvento)}
            {proyecto.coordinador && <> · Coordinador: <span className="text-gray-400">{proyecto.coordinador}</span></>}
          </p>
        </div>
        <div className="shrink-0 text-right space-y-1">
          <div className="rounded-lg px-4 py-2 border" style={{ backgroundColor: `${nivel.color}14`, borderColor: `${nivel.color}40` }}>
            <p className="text-lg font-bold" style={{ color: nivel.color }}>{prom ? `${prom.toFixed(1)}/5` : "—"}</p>
            <p className="text-[10px]" style={{ color: `${nivel.color}cc` }}>{nivel.label}</p>
          </div>
          <p className={`text-[10px] h-3 ${estado === "saving" ? "text-[#666]" : "text-green-500"}`}>{estadoTxt}</p>
        </div>
      </div>

      {/* Reporte del coordinador (materia prima para evaluar) */}
      <div className="ms-card-deep p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Reporte del coordinador</p>
            <p className="text-[#666] text-xs mt-0.5">
              {reporteEnviado
                ? <>Enviado{reporte.llenadoPorNombre ? ` por ${reporte.llenadoPorNombre}` : ""}. Úsalo para calificar.</>
                : "Aún no se ha enviado el reporte. Puedes calificar, pero pídelo para tener evidencia."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${reporteEnviado ? "bg-green-900/50 text-green-300" : "bg-[#1a1a1a] text-gray-500 border border-[#333]"}`}>
              {reporteEnviado ? "Enviado" : "Pendiente"}
            </span>
            {incidencias > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-900/40 text-red-300">{incidencias} incidencia(s)</span>}
          </div>
        </div>

        {/* Bloques de texto del coordinador */}
        {reporte.logros?.trim() && (
          <div className="bg-[#0d0d0d] rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Qué hizo bien / resolvió</p>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{reporte.logros}</p>
          </div>
        )}
        {reporte.autocritica?.trim() && (
          <div className="bg-[#0d0d0d] rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Autocrítica</p>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{reporte.autocritica}</p>
          </div>
        )}
        {propuestas.length > 0 && (
          <div className="bg-[#0d0d0d] rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Propuestas de mejora</p>
            <ul className="text-gray-300 text-sm list-disc list-inside space-y-0.5">{propuestas.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
        )}
        {(reporte.gastos ?? []).length > 0 && (
          <div className="bg-[#0d0d0d] rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Gastos e imprevistos</p>
            <ul className="text-gray-300 text-sm space-y-1">
              {(reporte.gastos ?? []).map((g, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span>{g.concepto || "Sin concepto"}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[#B3985B] font-semibold">${(g.monto ?? 0).toLocaleString("es-MX")}</span>
                    {(g.comprobante ?? []).map((f, k) => <a key={k} href={f.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 underline">ver</a>)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidencia fotográfica por slot */}
        <div className="space-y-3">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">Evidencia</p>
          {evidObligatorias.map(slot => {
            const fotos = reporte.evidencias?.[slot.id] ?? [];
            if (!fotos.length) return (
              <div key={slot.id} className="text-xs text-[#555]">{slot.label}: <span className="text-red-400/70">sin evidencia</span></div>
            );
            return (
              <div key={slot.id}>
                <p className="text-xs text-gray-400 mb-1">{slot.label}</p>
                <Galeria fotos={fotos} />
              </div>
            );
          })}
          {(reporte.fotos ?? []).length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Galería del evento</p>
              <Galeria fotos={reporte.fotos ?? []} />
            </div>
          )}
        </div>
      </div>

      {bloqueado && (
        <div className="rounded-xl border border-green-700/40 bg-green-900/15 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-green-300 text-sm font-semibold">Evaluación finalizada ✓</p>
            <p className="text-[#7aa77a] text-xs mt-0.5">{data.evaluadorNombre ? `Por ${data.evaluadorNombre}. ` : ""}Los campos quedaron bloqueados.</p>
          </div>
          <button type="button" onClick={reabrir} disabled={enviando} className="text-xs rounded-lg border border-[#2a2a2a] text-gray-300 hover:border-white/40 hover:text-white px-3 py-2 disabled:opacity-50">Reabrir</button>
        </div>
      )}

      <fieldset disabled={bloqueado} className="space-y-6 disabled:opacity-70">
        {/* Calificación por dimensión */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Calificación por dimensión</h2>
            <span className="text-[11px] text-[#777]">{calificadas}/{total} calificadas</span>
          </div>
          <div className="space-y-3">
            {config.dimensiones.map(dim => (
              <div key={dim.id} className="ms-card-deep p-4 border-l-2" style={{ borderLeftColor: "#34D39955" }}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-white text-sm font-medium">{dim.label}</p>
                    <p className="text-[#666] text-xs mt-0.5">{dim.desc}</p>
                  </div>
                  <Estrellas valor={data.calificaciones?.[dim.id] ?? null} onChange={n => setCalif(dim.id, n)} />
                </div>
                <input
                  value={data.notas?.[dim.id] ?? ""}
                  onChange={e => setNota(dim.id, e.target.value)}
                  placeholder="Nota (opcional)"
                  className="w-full mt-3 bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ¿Repetiríamos con este coordinador? */}
        <div className="ms-card-deep p-5">
          <p className="text-white text-sm font-medium mb-3">¿Repetiríamos con este coordinador?</p>
          <div className="flex gap-2 flex-wrap">
            {REPET.map(op => (
              <button key={op.v} type="button" onClick={() => setRepetiriamos(op.v)}
                className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${data.repetiriamos === op.v ? op.tono : "border-[#2a2a2a] text-[#666] hover:border-[#3a3a3a] hover:text-gray-400"}`}>
                {op.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comentario de dirección */}
        <div className="ms-card-deep p-5">
          <p className="text-white text-sm font-medium mb-2">Conclusión de dirección</p>
          <textarea
            value={data.comentario}
            onChange={e => actualizar(prev => ({ ...prev, comentario: e.target.value }))}
            placeholder="Veredicto general, felicitaciones, llamadas de atención y acuerdos…"
            rows={5}
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50 resize-none"
          />
        </div>
      </fieldset>

      {/* Finalizar */}
      {!bloqueado && (
        <div className="ms-card-deep p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-white text-sm font-medium">Finalizar evaluación</p>
            <p className="text-[#666] text-xs mt-0.5">{calificadas > 0 ? "Al finalizar, la evaluación queda registrada y bloqueada." : "Califica al menos una dimensión."}</p>
          </div>
          <button type="button" onClick={finalizar} disabled={enviando || calificadas === 0}
            className="text-sm font-semibold rounded-lg px-5 py-2.5 bg-[#B3985B] text-black hover:bg-[#c9ad6f] transition-colors disabled:opacity-50">
            {enviando ? "Guardando…" : "Finalizar evaluación"}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#1a1a1a]">
        <Link href={`/proyectos/${id}`} className="text-[#555] hover:text-white text-sm">← Volver al proyecto</Link>
        <span className="text-[#444] text-xs">{estado === "saving" ? "Guardando cambios…" : "Los cambios se guardan automáticamente"}</span>
      </div>
    </div>
  );
}
