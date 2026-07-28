"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import {
  getEvalConfig,
  SECCION_CALIF_COLOR,
  SECCION_MEJORA_COLOR,
  emptyEvalData,
  contarRespondidos,
  contarIncidencias,
  reporteCompleto,
  EJEMPLO_LOGROS,
  EJEMPLO_AUTOCRITICA,
  EJEMPLO_MEJORA,
  MIN_TEXTO_REPORTE,
  type EvalPostEventoData,
  type EvalItem,
  type RespValor,
  type FotoReporte,
  type GastoReporte,
  type EvidenciaSlot,
} from "@/lib/evaluacion-post-evento";

type MiembroEquipo = { id: string; nombre: string; rol: string | null };

const OPCIONES: Record<"si-no" | "si-no-na", { valor: RespValor; label: string }[]> = {
  "si-no": [
    { valor: "si", label: "Sí" },
    { valor: "no", label: "No" },
  ],
  "si-no-na": [
    { valor: "si", label: "Sí" },
    { valor: "no", label: "No" },
    { valor: "na", label: "No fue necesario" },
  ],
};

const EVID_COLOR = "#5B9BD5";
const GASTO_COLOR = "#E0A458";

function OpcionBtn({ activo, tono, label, onClick }: { activo: boolean; tono: "si" | "no" | "na"; label: string; onClick: () => void }) {
  const sel: Record<string, string> = {
    si: "bg-green-900/50 border-green-600 text-green-300",
    no: "bg-red-900/50 border-red-600 text-red-300",
    na: "bg-[#1a1a1a] border-[#3a3a3a] text-gray-300",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
        activo ? sel[tono] : "border-[#2a2a2a] text-[#666] hover:border-[#3a3a3a] hover:text-gray-400"
      }`}
    >
      {label}
    </button>
  );
}

function SeccionHeader({ titulo, descripcion, color, numero }: { titulo: string; descripcion?: string; color: string; numero: number }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <span
          className="flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold shrink-0"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {numero}
        </span>
        <h2 className="text-xl font-bold tracking-tight" style={{ color }}>{titulo}</h2>
        <div className="flex-1 h-px" style={{ backgroundColor: `${color}33` }} />
      </div>
      {descripcion && <p className="text-[#777] text-xs mt-2 ml-10">{descripcion}</p>}
    </div>
  );
}

// Miniatura de evidencia (imagen / video) con botón para eliminar.
function MiniEvidencia({ foto, onEliminar }: { foto: FotoReporte; onEliminar: () => void }) {
  return (
    <div className="group relative rounded-lg overflow-hidden border border-[#252525] bg-[#0d0d0d]">
      <div className="aspect-square w-full flex items-center justify-center bg-black">
        {foto.tipo === "video" ? (
          <video src={foto.url} className="w-full h-full object-cover" muted playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto.url} alt={foto.nombre} className="w-full h-full object-cover" />
        )}
      </div>
      {foto.tipo === "video" && (
        <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold bg-black/70 text-white rounded px-1.5 py-0.5">VIDEO</span>
      )}
      <button
        type="button"
        onClick={onEliminar}
        className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/90 to-transparent text-[10px] text-[#bbb] hover:text-red-400 py-1.5"
      >
        Eliminar
      </button>
    </div>
  );
}

export default function ReportePostEventoPage() {
  const { id } = useParams<{ id: string }>();

  const [proyecto, setProyecto] = useState<{
    nombre: string; numeroProyecto: string; fechaEvento: string;
    lugarEvento?: string | null; estado: string; tipoServicio: string | null;
    cliente: { nombre: string; empresa?: string | null };
  } | null>(null);
  const [equipo, setEquipo] = useState<MiembroEquipo[]>([]);
  const [equipos, setEquipos] = useState<{ nombre: string; cantidad: number }[]>([]);
  const [data, setData] = useState<EvalPostEventoData>(emptyEvalData());
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState<"idle" | "saving" | "saved">("idle");
  const [subiendoKey, setSubiendoKey] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [faltantes, setFaltantes] = useState<string[]>([]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargar = useCallback(async () => {
    const [resP, resE] = await Promise.all([
      fetch(`/api/proyectos/${id}`, { cache: "no-store" }),
      fetch(`/api/proyectos/${id}/evaluacion-post-evento`, { cache: "no-store" }),
    ]);
    const dp = await resP.json();
    const de = await resE.json();
    const p = dp.proyecto;
    setProyecto(p);

    const vistos = new Set<string>();
    const miembros: MiembroEquipo[] = [];
    for (const per of p?.personal ?? []) {
      const t = per.tecnico;
      if (!t || vistos.has(t.id)) continue;
      vistos.add(t.id);
      miembros.push({ id: t.id, nombre: t.nombre, rol: per.rolTecnico?.nombre ?? t.rol?.nombre ?? null });
    }
    setEquipo(miembros);
    setEquipos(Array.isArray(de.contexto?.equipos) ? de.contexto.equipos : []);
    if (de.evaluacion) setData({ ...emptyEvalData(), ...de.evaluacion });
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const persistir = useCallback(async (next: EvalPostEventoData, marcarCompletado?: boolean) => {
    setEstado("saving");
    const r = await fetch(`/api/proyectos/${id}/evaluacion-post-evento`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        llenadoPorId: next.llenadoPorId,
        llenadoPorNombre: next.llenadoPorNombre,
        items: next.items,
        evidencias: next.evidencias,
        gastos: next.gastos,
        logros: next.logros,
        autocritica: next.autocritica,
        propuestasMejora: next.propuestasMejora,
        comentariosFinales: next.comentariosFinales,
        fotos: next.fotos,
        ...(marcarCompletado !== undefined ? { completado: marcarCompletado } : {}),
      }),
    });
    if (r.ok) {
      const d = await r.json();
      setData(prev => ({ ...prev, respondidoEn: d.evaluacion.respondidoEn, actualizadoEn: d.evaluacion.actualizadoEn, completado: d.evaluacion.completado, completadoEn: d.evaluacion.completadoEn }));
      setEstado("saved");
      return true;
    }
    setEstado("idle");
    return false;
  }, [id]);

  const actualizar = useCallback((updater: (prev: EvalPostEventoData) => EvalPostEventoData) => {
    setData(prev => {
      const next = updater(prev);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { persistir(next); }, 800);
      return next;
    });
  }, [persistir]);

  // Guardado inmediato (sin debounce) para subidas de archivo.
  const persistirYa = useCallback((next: EvalPostEventoData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setData(next);
    persistir(next);
  }, [persistir]);

  const setValor = (itemId: string, valor: RespValor) => {
    actualizar(prev => {
      const actual = prev.items[itemId] ?? { valor: null, comentario: "" };
      const nuevoValor = actual.valor === valor ? null : valor;
      return { ...prev, items: { ...prev.items, [itemId]: { ...actual, valor: nuevoValor } } };
    });
  };
  const setComentario = (itemId: string, comentario: string) => {
    actualizar(prev => {
      const actual = prev.items[itemId] ?? { valor: null, comentario: "" };
      return { ...prev, items: { ...prev.items, [itemId]: { ...actual, comentario } } };
    });
  };

  const setPropuesta = (i: number, val: string) =>
    actualizar(prev => ({ ...prev, propuestasMejora: prev.propuestasMejora.map((p, idx) => (idx === i ? val : p)) }));
  const addPropuesta = () => actualizar(prev => ({ ...prev, propuestasMejora: [...prev.propuestasMejora, ""] }));
  const removePropuesta = (i: number) =>
    actualizar(prev => ({ ...prev, propuestasMejora: prev.propuestasMejora.filter((_, idx) => idx !== i) }));

  const setLlenadoPor = (tecnicoId: string) => {
    const m = equipo.find(e => e.id === tecnicoId);
    actualizar(prev => ({ ...prev, llenadoPorId: tecnicoId || null, llenadoPorNombre: m?.nombre ?? null }));
  };

  // ── Subida de archivos (evidencia / comprobantes / galería) ──
  const subir = async (file: File, carpeta: string): Promise<FotoReporte | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const pathname = `proyectos/${id}/${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const blob = await upload(pathname, file, { access: "public", handleUploadUrl: "/api/upload/token" });
    const tipo: FotoReporte["tipo"] = file.type.startsWith("video") ? "video" : "imagen";
    return { url: blob.url, nombre: file.name, tipo };
  };

  // Evidencia por slot obligatorio.
  const onEvidencia = async (e: React.ChangeEvent<HTMLInputElement>, slotId: string) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setSubiendoKey(`evid-${slotId}`);
    try {
      const nuevas: FotoReporte[] = [];
      for (const f of files) { const foto = await subir(f, `evidencia/${slotId}`); if (foto) nuevas.push(foto); }
      if (nuevas.length) setData(prev => {
        const actuales = prev.evidencias?.[slotId] ?? [];
        const next = { ...prev, evidencias: { ...prev.evidencias, [slotId]: [...actuales, ...nuevas] } };
        persistir(next);
        return next;
      });
    } finally { setSubiendoKey(null); }
  };
  const removeEvidencia = (slotId: string, idx: number) => setData(prev => {
    const next = { ...prev, evidencias: { ...prev.evidencias, [slotId]: (prev.evidencias?.[slotId] ?? []).filter((_, i) => i !== idx) } };
    persistir(next);
    return next;
  });

  // Gastos e imprevistos.
  const addGasto = () => actualizar(prev => ({ ...prev, gastos: [...(prev.gastos ?? []), { concepto: "", monto: 0, comprobante: [] }] }));
  const setGasto = (i: number, patch: Partial<GastoReporte>) =>
    actualizar(prev => ({ ...prev, gastos: (prev.gastos ?? []).map((g, idx) => (idx === i ? { ...g, ...patch } : g)) }));
  const removeGasto = (i: number) => actualizar(prev => ({ ...prev, gastos: (prev.gastos ?? []).filter((_, idx) => idx !== i) }));
  const onComprobante = async (e: React.ChangeEvent<HTMLInputElement>, i: number) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setSubiendoKey(`gasto-${i}`);
    try {
      const nuevas: FotoReporte[] = [];
      for (const f of files) { const foto = await subir(f, "gastos"); if (foto) nuevas.push(foto); }
      if (nuevas.length) setData(prev => {
        const next = { ...prev, gastos: (prev.gastos ?? []).map((g, idx) => idx === i ? { ...g, comprobante: [...(g.comprobante ?? []), ...nuevas] } : g) };
        persistir(next);
        return next;
      });
    } finally { setSubiendoKey(null); }
  };
  const removeComprobante = (gi: number, fi: number) => setData(prev => {
    const next = { ...prev, gastos: (prev.gastos ?? []).map((g, idx) => idx === gi ? { ...g, comprobante: (g.comprobante ?? []).filter((_, k) => k !== fi) } : g) };
    persistir(next);
    return next;
  });

  // Galería general para el reporte del cliente.
  const onGaleria = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setSubiendoKey("galeria");
    try {
      const nuevas: FotoReporte[] = [];
      for (const f of files) { const foto = await subir(f, "reporte"); if (foto) nuevas.push(foto); }
      if (nuevas.length) setData(prev => {
        const next = { ...prev, fotos: [...(prev.fotos ?? []), ...nuevas] };
        persistir(next);
        return next;
      });
    } finally { setSubiendoKey(null); }
  };
  const removeGaleria = (idx: number) => setData(prev => {
    const next = { ...prev, fotos: (prev.fotos ?? []).filter((_, i) => i !== idx) };
    persistir(next);
    return next;
  });

  const completar = async () => {
    if (!config) return;
    const check = reporteCompleto(data, config);
    if (!check.ok) { setFaltantes(check.faltantes); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setFaltantes([]);
    setEnviando(true);
    await persistir(data, true);
    setEnviando(false);
  };
  const reabrir = async () => { setEnviando(true); await persistir(data, false); setEnviando(false); };

  if (loading) return <div className="p-6 text-center text-[#444] text-sm">Cargando...</div>;
  if (!proyecto) return <div className="p-6 text-center text-[#444]">Proyecto no encontrado</div>;

  const config = getEvalConfig(proyecto.tipoServicio);
  const { respondidos, total } = contarRespondidos(data.items, config.secciones);
  const incidencias = contarIncidencias(data.items, config.secciones);
  const check = reporteCompleto(data, config);
  const bloqueado = data.completado;

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };
  const estadoTxt = estado === "saving" ? "Guardando…" : estado === "saved" ? "Guardado" : "";

  const evidObligatorias = config.evidencias.filter(s => s.obligatoria);
  const evidListas = evidObligatorias.filter(s => (data.evidencias?.[s.id] ?? []).length >= (s.min ?? 1)).length;

  const EvidenciaCard = ({ slot }: { slot: EvidenciaSlot }) => {
    const fotos = data.evidencias?.[slot.id] ?? [];
    const lista = fotos.length >= (slot.min ?? 1);
    const key = `evid-${slot.id}`;
    return (
      <div className="ms-card-deep p-4 border-l-2" style={{ borderLeftColor: slot.obligatoria ? (lista ? "#34D39966" : "#F8717166") : `${EVID_COLOR}66` }}>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
          <div className="flex-1 min-w-[180px]">
            <p className="text-white text-sm font-medium">
              {slot.label}
              {slot.obligatoria
                ? <span className={`ml-2 text-[10px] font-semibold ${lista ? "text-green-400" : "text-red-400"}`}>{lista ? "✓ listo" : "obligatoria"}</span>
                : <span className="ml-2 text-[10px] text-[#666]">opcional</span>}
            </p>
            {slot.desc && <p className="text-[#666] text-xs mt-0.5">{slot.desc}</p>}
          </div>
          <label className={`text-xs rounded-lg border px-3 py-2 transition-colors cursor-pointer shrink-0 ${
            subiendoKey === key ? "border-[#333] text-[#666]" : "border-[#B3985B]/40 text-[#B3985B] hover:border-[#B3985B] hover:text-white"
          }`}>
            {subiendoKey === key ? "Subiendo…" : "📷 Tomar / subir foto"}
            <input type="file" accept="image/*,video/*" capture="environment" multiple className="hidden" disabled={subiendoKey === key} onChange={e => onEvidencia(e, slot.id)} />
          </label>
        </div>
        {fotos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
            {fotos.map((f, i) => <MiniEvidencia key={`${f.url}-${i}`} foto={f} onEliminar={() => removeEvidencia(slot.id, i)} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/proyectos/${id}`} className="text-[#555] hover:text-white text-xs">← {proyecto.numeroProyecto}</Link>
            <span className="text-[#333]">/</span>
            <span className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">{config.etiqueta}</span>
          </div>
          <h1 className="text-white text-2xl font-bold">{proyecto.nombre}</h1>
          <p className="text-[#555] text-sm mt-0.5">{proyecto.cliente.nombre} · {fmtDate(proyecto.fechaEvento)}</p>
        </div>
        <div className="shrink-0 text-right space-y-1">
          <div className="ms-card px-4 py-2">
            <p className="text-white text-lg font-bold">{respondidos}<span className="text-[#444] text-sm">/{total}</span></p>
            <p className="text-[#444] text-[10px]">respondidos</p>
          </div>
          <p className={`text-[10px] h-3 ${estado === "saving" ? "text-[#666]" : "text-green-500"}`}>{estadoTxt}</p>
        </div>
      </div>

      {/* Estado del reporte */}
      {bloqueado ? (
        <div className="rounded-xl border border-green-700/40 bg-green-900/15 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-green-300 text-sm font-semibold">Reporte enviado ✓</p>
            <p className="text-[#7aa77a] text-xs mt-0.5">Dirección lo usará para evaluar el evento. Los campos quedaron bloqueados.</p>
          </div>
          <button type="button" onClick={reabrir} disabled={enviando} className="text-xs rounded-lg border border-[#2a2a2a] text-gray-300 hover:border-white/40 hover:text-white px-3 py-2 disabled:opacity-50">
            Reabrir para corregir
          </button>
        </div>
      ) : faltantes.length > 0 ? (
        <div className="rounded-xl border border-red-700/40 bg-red-900/15 p-4">
          <p className="text-red-300 text-sm font-semibold mb-1.5">Faltan datos obligatorios para enviar el reporte:</p>
          <ul className="text-red-200/90 text-xs list-disc list-inside space-y-0.5">
            {faltantes.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      ) : null}

      {/* Contexto del servicio */}
      <div className="ms-card-deep p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-[#666] uppercase tracking-wider mb-0.5">Cliente</p>
            <p className="text-white text-sm font-medium">
              {proyecto.cliente.nombre}
              {proyecto.cliente.empresa && <span className="text-[#666] font-normal"> · {proyecto.cliente.empresa}</span>}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#666] uppercase tracking-wider mb-0.5">Lugar</p>
            <p className="text-white text-sm font-medium">{proyecto.lugarEvento || <span className="text-[#555] font-normal">Sin especificar</span>}</p>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-[#666] uppercase tracking-wider mb-1">
            {config.variante === "renta" ? "Equipo rentado" : "Equipo utilizado"} <span className="text-[#444]">({equipos.length})</span>
          </p>
          {equipos.length === 0 ? (
            <p className="text-[#555] text-xs">Sin equipos registrados en el proyecto.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {equipos.slice(0, 12).map((e, i) => (
                <span key={i} className="text-[11px] bg-[#141414] border border-[#252525] text-gray-300 rounded-md px-2 py-0.5">
                  {e.cantidad > 1 && <span className="text-[#B3985B] font-semibold">{e.cantidad}× </span>}{e.nombre}
                </span>
              ))}
              {equipos.length > 12 && <span className="text-[11px] text-[#555] px-1 py-0.5">+{equipos.length - 12} más</span>}
            </div>
          )}
        </div>
      </div>

      {/* Quién elabora el reporte */}
      <div className="ms-card-deep p-4">
        <label className="block text-[10px] text-[#666] uppercase tracking-wider mb-1.5">¿Quién elabora el reporte?</label>
        <select
          value={data.llenadoPorId ?? ""}
          onChange={e => setLlenadoPor(e.target.value)}
          disabled={bloqueado}
          className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/50 disabled:opacity-60"
        >
          <option value="">Selecciona un miembro del equipo…</option>
          {equipo.map(m => <option key={m.id} value={m.id}>{m.nombre}{m.rol ? ` · ${m.rol}` : ""}</option>)}
        </select>
      </div>

      <fieldset disabled={bloqueado} className="space-y-10 disabled:opacity-70">

      {/* Secciones Sí/No */}
      {config.secciones.map((seccion, sIdx) => (
        <div key={seccion.id}>
          <SeccionHeader titulo={seccion.titulo} descripcion={seccion.descripcion} color={seccion.color} numero={sIdx + 1} />
          <div className="space-y-3">
            {seccion.items.map((item: EvalItem) => {
              const resp = data.items[item.id] ?? { valor: null, comentario: "" };
              return (
                <div key={item.id} className="ms-card-deep p-4 border-l-2" style={{ borderLeftColor: `${seccion.color}66` }}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-white text-sm font-medium">{item.label}</p>
                      {item.desc && <p className="text-[#666] text-xs mt-0.5">{item.desc}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {OPCIONES[item.tipo].map(op => (
                        <OpcionBtn key={op.valor} activo={resp.valor === op.valor} tono={op.valor} label={op.label} onClick={() => setValor(item.id, op.valor)} />
                      ))}
                    </div>
                  </div>
                  <input
                    value={resp.comentario}
                    onChange={e => setComentario(item.id, e.target.value)}
                    placeholder="Comentarios (opcional)"
                    className="w-full mt-3 bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Evidencia obligatoria */}
      <div>
        <SeccionHeader
          titulo="Evidencia obligatoria"
          descripcion="Cada afirmación debe respaldarse con foto de cámara. Sin evidencia no se puede enviar el reporte."
          color={EVID_COLOR}
          numero={config.secciones.length + 1}
        />
        <div className="mb-3 text-[11px] text-[#777]">Evidencia obligatoria: <span className={evidListas === evidObligatorias.length ? "text-green-400" : "text-[#B3985B]"}>{evidListas}/{evidObligatorias.length}</span></div>
        <div className="space-y-3">
          {config.evidencias.map(slot => <EvidenciaCard key={slot.id} slot={slot} />)}
        </div>
      </div>

      {/* Gastos e imprevistos */}
      <div>
        <SeccionHeader
          titulo="Gastos e imprevistos"
          descripcion="Registra cada gasto no previsto. Cada uno debe llevar su comprobante (ticket / foto)."
          color={GASTO_COLOR}
          numero={config.secciones.length + 2}
        />
        <div className="space-y-3">
          {(data.gastos ?? []).length === 0 && <p className="text-[#555] text-sm">Sin gastos registrados. Agrega uno si hubo gastos o imprevistos.</p>}
          {(data.gastos ?? []).map((g, i) => {
            const key = `gasto-${i}`;
            return (
              <div key={i} className="ms-card-deep p-4 border-l-2" style={{ borderLeftColor: `${GASTO_COLOR}66` }}>
                <div className="flex items-start gap-2 flex-wrap">
                  <input
                    value={g.concepto}
                    onChange={e => setGasto(i, { concepto: e.target.value })}
                    placeholder="Concepto del gasto (ej. taxi por equipo faltante)"
                    className="flex-1 min-w-[180px] bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50"
                  />
                  <div className="flex items-center gap-1 bg-[#111] border border-[#222] rounded-lg px-3 py-2">
                    <span className="text-[#666] text-sm">$</span>
                    <input
                      type="number" min={0} step="0.01"
                      value={g.monto || ""}
                      onChange={e => setGasto(i, { monto: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-24 bg-transparent text-sm text-white placeholder-[#333] focus:outline-none"
                    />
                  </div>
                  <button type="button" onClick={() => removeGasto(i)} className="text-[#444] hover:text-red-400 text-xs px-2 py-2">Quitar</button>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <label className={`text-xs rounded-lg border px-3 py-1.5 transition-colors cursor-pointer ${
                    subiendoKey === key ? "border-[#333] text-[#666]" : (g.comprobante ?? []).length ? "border-green-700/50 text-green-400" : "border-red-700/40 text-red-300 hover:border-red-500"
                  }`}>
                    {subiendoKey === key ? "Subiendo…" : (g.comprobante ?? []).length ? "✓ Comprobante" : "📷 Comprobante obligatorio"}
                    <input type="file" accept="image/*,application/pdf" capture="environment" multiple className="hidden" disabled={subiendoKey === key} onChange={e => onComprobante(e, i)} />
                  </label>
                  {(g.comprobante ?? []).map((f, fi) => (
                    <span key={`${f.url}-${fi}`} className="flex items-center gap-1 text-[11px] bg-[#141414] border border-[#252525] text-gray-300 rounded-md px-2 py-1">
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:text-white truncate max-w-[120px]">{f.nombre}</a>
                      <button type="button" onClick={() => removeComprobante(i, fi)} className="text-[#555] hover:text-red-400">✕</button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          <button type="button" onClick={addGasto} className="mt-1 text-xs text-[#B3985B] hover:text-white border border-dashed border-[#333] hover:border-[#B3985B]/50 rounded-lg px-3 py-2 transition-colors">+ Agregar gasto</button>
        </div>
      </div>

      {/* ¿Qué hiciste bien o resolviste? */}
      <div>
        <SeccionHeader
          titulo="¿Qué hiciste bien o resolviste?"
          descripcion="Cuenta los aciertos y cómo resolviste los imprevistos del evento. Obligatorio."
          color={SECCION_CALIF_COLOR}
          numero={config.secciones.length + 3}
        />
        <textarea
          value={data.logros}
          onChange={e => actualizar(prev => ({ ...prev, logros: e.target.value }))}
          placeholder={EJEMPLO_LOGROS}
          rows={4}
          className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#B3985B]/50 resize-none"
        />
        <p className="text-[10px] mt-1 text-[#555]">{(data.logros ?? "").trim().length < MIN_TEXTO_REPORTE ? `Mínimo ${MIN_TEXTO_REPORTE} caracteres.` : "✓"}</p>
      </div>

      {/* Autocrítica */}
      <div>
        <SeccionHeader
          titulo="Autocrítica"
          descripcion="¿Qué pudiste haber hecho mejor TÚ como coordinador? Sé honesto. Obligatorio."
          color={SECCION_MEJORA_COLOR}
          numero={config.secciones.length + 4}
        />
        <textarea
          value={data.autocritica}
          onChange={e => actualizar(prev => ({ ...prev, autocritica: e.target.value }))}
          placeholder={EJEMPLO_AUTOCRITICA}
          rows={4}
          className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#B3985B]/50 resize-none"
        />
        <p className="text-[10px] mt-1 text-[#555]">{(data.autocritica ?? "").trim().length < MIN_TEXTO_REPORTE ? `Mínimo ${MIN_TEXTO_REPORTE} caracteres.` : "✓"}</p>
      </div>

      {/* Propuestas de mejora */}
      <div>
        <SeccionHeader
          titulo="Propuestas de mejora"
          descripcion="Acciones concretas para el próximo evento. Al menos una es obligatoria."
          color={SECCION_MEJORA_COLOR}
          numero={config.secciones.length + 5}
        />
        <div className="space-y-2">
          {data.propuestasMejora.length === 0 && (
            <button type="button" onClick={addPropuesta} className="text-xs text-[#B3985B] hover:text-white border border-dashed border-[#333] hover:border-[#B3985B]/50 rounded-lg px-3 py-2 transition-colors">+ Agregar la primera propuesta</button>
          )}
          {data.propuestasMejora.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[#B3985B] text-sm shrink-0 w-5 text-center">{i + 1}.</span>
              <input
                value={p}
                onChange={e => setPropuesta(i, e.target.value)}
                placeholder={EJEMPLO_MEJORA}
                className="flex-1 bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#B3985B]/50"
              />
              <button type="button" onClick={() => removePropuesta(i)} className="text-[#444] hover:text-red-400 text-xs shrink-0 px-2">Eliminar</button>
            </div>
          ))}
          {data.propuestasMejora.length > 0 && (
            <button type="button" onClick={addPropuesta} className="mt-1 text-xs text-[#B3985B] hover:text-white border border-dashed border-[#333] hover:border-[#B3985B]/50 rounded-lg px-3 py-2 transition-colors">+ Agregar propuesta</button>
          )}
        </div>
      </div>

      {/* Comentarios finales */}
      <div>
        <SeccionHeader
          titulo="Comentarios finales"
          descripcion={config.variante === "renta" ? "Conclusión de la renta: qué salió bien, qué mejorar y acuerdos." : "Conclusión general del evento (opcional)."}
          color={SECCION_MEJORA_COLOR}
          numero={config.secciones.length + 6}
        />
        <textarea
          value={data.comentariosFinales}
          onChange={e => actualizar(prev => ({ ...prev, comentariosFinales: e.target.value }))}
          placeholder="Comentarios finales (opcional)…"
          rows={4}
          className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#B3985B]/50 resize-none"
        />
      </div>

      {/* Galería para el cliente */}
      <div>
        <SeccionHeader
          titulo="Fotos para el reporte del cliente"
          descripcion="Fotos y videos del evento para el reporte de servicio que se entrega al cliente."
          color={SECCION_MEJORA_COLOR}
          numero={config.secciones.length + 7}
        />
        <div className="ms-card-deep p-4 space-y-4">
          {(data.fotos ?? []).length === 0 ? (
            <p className="text-[#555] text-sm">Aún no hay fotos para el cliente.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(data.fotos ?? []).map((f, i) => <MiniEvidencia key={`${f.url}-${i}`} foto={f} onEliminar={() => removeGaleria(i)} />)}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className={`text-xs rounded-lg border px-3 py-2 transition-colors cursor-pointer ${
              subiendoKey === "galeria" ? "border-[#333] text-[#666]" : "border-[#B3985B]/40 text-[#B3985B] hover:border-[#B3985B] hover:text-white"
            }`}>
              {subiendoKey === "galeria" ? "Subiendo…" : "+ Agregar fotos / videos"}
              <input type="file" accept="image/*,video/*" multiple className="hidden" disabled={subiendoKey === "galeria"} onChange={onGaleria} />
            </label>
            <a href={`/api/proyectos/${id}/reporte-servicio-cliente/pdf?preview=1`} target="_blank" rel="noopener noreferrer" className="text-xs rounded-lg border border-[#2a2a2a] text-gray-300 hover:border-[#B3985B]/50 hover:text-white px-3 py-2 transition-colors">Ver reporte del cliente (PDF)</a>
          </div>
          <p className="text-[#555] text-[11px]">El reporte al cliente incluye sólo fotos (los videos quedan como evidencia interna).</p>
        </div>
      </div>

      </fieldset>

      {/* Enviar reporte */}
      {!bloqueado && (
        <div className="ms-card-deep p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-white text-sm font-medium">Enviar reporte a dirección</p>
            <p className="text-[#666] text-xs mt-0.5">
              {check.ok ? "Todo listo. Al enviar, dirección podrá evaluar el evento." : `Faltan ${check.faltantes.length} requisito(s) obligatorio(s).`}
            </p>
          </div>
          <button
            type="button"
            onClick={completar}
            disabled={enviando}
            className={`text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors disabled:opacity-50 ${
              check.ok ? "bg-[#B3985B] text-black hover:bg-[#c9ad6f]" : "bg-[#1a1a1a] text-gray-300 border border-[#333] hover:border-[#B3985B]/50"
            }`}
          >
            {enviando ? "Enviando…" : "Completar y enviar reporte"}
          </button>
        </div>
      )}

      {/* Pie */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#1a1a1a]">
        <Link href={`/proyectos/${id}`} className="text-[#555] hover:text-white text-sm">← Volver al proyecto</Link>
        <span className="text-[#444] text-xs">{estado === "saving" ? "Guardando cambios…" : "Los cambios se guardan automáticamente"}</span>
      </div>

    </div>
  );
}
