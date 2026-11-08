"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/Modal";
import { upload } from "@vercel/blob/client";
import {
  Trash2, Copy, GripVertical, Plus, ChevronUp, ChevronDown, Eye, Image as ImgIcon,
  ArrowRightLeft, Download, Lock, Unlock,
} from "lucide-react";

type TipoPregunta = "texto_corto" | "parrafo" | "opcion_unica" | "opcion_multiple" | "si_no" | "lista" | "archivo_o_liga" | "casilla";

const TIPO_LABELS: Record<TipoPregunta, string> = {
  texto_corto: "Texto corto",
  parrafo: "Párrafo",
  opcion_unica: "Opción única",
  opcion_multiple: "Opción múltiple",
  si_no: "Sí / No",
  lista: "Lista desplegable",
  archivo_o_liga: "Archivo o liga",
  casilla: "Casilla de aceptación",
};

interface Puesto { id: string; nombre: string; area: string }

interface Condicion { pregunta: string; valorEn: string[] }
type MostrarSi = Condicion | { todas: Condicion[] } | null;

interface Valoracion {
  tipo?: "E" | "P" | "M" | "I";
  correcta?: string;
  puntos?: number | Record<string, number>;
  porOpcion?: number;
  max?: number;
  puntosPorOpcion?: Record<string, number>;
  excluyeSi?: string[] | "incorrecta";
  requiere?: string[];
  rubrica?: string;
  excluyeSiCalificacion?: number;
}

interface Pregunta {
  id: string;
  orden: number;
  codigo: string | null;
  texto: string;
  ayuda: string | null;
  tipo: TipoPregunta;
  obligatoria: boolean;
  opciones: string[];
  mostrarSi: MostrarSi;
  valoracion: Valoracion | null;
  // UI only (unsaved) flag
  _nueva?: boolean;
}

interface Seccion {
  id: string;
  orden: number;
  codigoBloque: string | null;
  bloque: string | null;
  titulo: string;
  descripcion: string | null;
  mostrarSi: MostrarSi;
  preguntas: Pregunta[];
}

interface Formulario {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string | null;
  imagenUrl: string | null;
  estado: string;
  aceptaRespuestas: boolean;
  umbralAvanza: number;
  umbralBanco: number;
  mensajeConfirmacion: string | null;
  puestos: { puesto: Puesto }[];
  secciones: {
    id: string;
    orden: number;
    codigoBloque: string | null;
    bloque: string | null;
    titulo: string;
    descripcion: string | null;
    mostrarSi: string | null;
    preguntas: {
      id: string; orden: number; codigo: string | null; texto: string; ayuda: string | null;
      tipo: string; obligatoria: boolean; opciones: string | null; mostrarSi: string | null; valoracion: string | null;
    }[];
  }[];
  _count: { respuestas: number };
}

type Tab = "preguntas" | "config" | "respuestas";

interface FormularioState {
  titulo: string;
  descripcion: string | null;
  imagenUrl: string | null;
  slug: string;
  estado: string;
  aceptaRespuestas: boolean;
  umbralAvanza: number;
  umbralBanco: number;
  mensajeConfirmacion: string | null;
  puestoIds: string[];
  secciones: Seccion[];
  respuestasCount: number;
}
type UpdateFn = (fn: (p: FormularioState) => FormularioState) => void;

function parseJSON<T>(s: string | null | undefined, fb: T): T {
  if (!s) return fb;
  try { return JSON.parse(s) as T; } catch { return fb; }
}
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

const inputCls = "w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] placeholder-gray-600";
const labelCls = "block text-xs text-gray-500 mb-1";

export default function FormularioEditorPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) ?? "preguntas");
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [f, setF] = useState<FormularioState | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [showVistaPrevia, setShowVistaPrevia] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstLoadRef = useRef(true);

  const load = useCallback(async () => {
    const r = await fetch(`/api/rrhh/formularios/${params.id}`);
    if (r.status === 404) { router.push("/organizacion/formularios"); return; }
    if (r.status === 401 || r.status === 403) {
      toast.error("No tienes permiso");
      router.push("/organizacion/formularios");
      return;
    }
    const d = await r.json();
    const data: Formulario = d.formulario;
    setF({
      titulo: data.titulo,
      descripcion: data.descripcion,
      imagenUrl: data.imagenUrl,
      slug: data.slug,
      estado: data.estado,
      aceptaRespuestas: data.aceptaRespuestas,
      umbralAvanza: data.umbralAvanza,
      umbralBanco: data.umbralBanco,
      mensajeConfirmacion: data.mensajeConfirmacion,
      puestoIds: data.puestos.map(p => p.puesto.id),
      respuestasCount: data._count?.respuestas ?? 0,
      secciones: data.secciones.map(s => ({
        id: s.id,
        orden: s.orden,
        codigoBloque: s.codigoBloque,
        bloque: s.bloque,
        titulo: s.titulo,
        descripcion: s.descripcion,
        mostrarSi: parseJSON<MostrarSi>(s.mostrarSi, null),
        preguntas: s.preguntas.map(p => ({
          id: p.id,
          orden: p.orden,
          codigo: p.codigo,
          texto: p.texto,
          ayuda: p.ayuda,
          tipo: (p.tipo as TipoPregunta) ?? "texto_corto",
          obligatoria: p.obligatoria,
          opciones: parseJSON<string[]>(p.opciones, []),
          mostrarSi: parseJSON<MostrarSi>(p.mostrarSi, null),
          valoracion: parseJSON<Valoracion | null>(p.valoracion, null),
        })),
      })),
    });
    setLoading(false);
  }, [params.id, router, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/rrhh/puestos-operativos").then(r => r.json()).then(d => setPuestos(d.puestos ?? []));
  }, []);

  // Autosave con debounce (~1.2s)
  const guardar = useCallback(async () => {
    if (!f) return;
    setSaving(true);
    const r = await fetch(`/api/rrhh/formularios/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: f.titulo,
        descripcion: f.descripcion,
        imagenUrl: f.imagenUrl,
        slug: f.slug,
        estado: f.estado,
        aceptaRespuestas: f.aceptaRespuestas,
        umbralAvanza: f.umbralAvanza,
        umbralBanco: f.umbralBanco,
        mensajeConfirmacion: f.mensajeConfirmacion,
        puestoIds: f.puestoIds,
        secciones: f.secciones.map(s => ({
          orden: s.orden,
          codigoBloque: s.codigoBloque,
          bloque: s.bloque,
          titulo: s.titulo,
          descripcion: s.descripcion,
          mostrarSi: s.mostrarSi,
          preguntas: s.preguntas.map(p => ({
            orden: p.orden,
            codigo: p.codigo,
            texto: p.texto,
            ayuda: p.ayuda,
            tipo: p.tipo,
            obligatoria: p.obligatoria,
            opciones: p.opciones,
            mostrarSi: p.mostrarSi,
            valoracion: p.valoracion,
          })),
        })),
      }),
    });
    setSaving(false);
    if (!r.ok) { const d = await r.json().catch(() => ({})); toast.error(d.error ?? "Error al guardar"); return; }
    setSavedAt(new Date());
  }, [f, params.id, toast]);

  useEffect(() => {
    if (!f) return;
    if (firstLoadRef.current) { firstLoadRef.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { guardar(); }, 1200);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  if (loading || !f) {
    return <div className="ms-page"><p className="text-gray-500 text-sm">Cargando…</p></div>;
  }

  // ── helpers de mutación ────────────────────────────────────────────────────
  const update: UpdateFn = (fn) => setF(prev => prev ? fn(prev) : prev);

  function addSeccion() {
    update(p => ({
      ...p,
      secciones: [
        ...p.secciones,
        { id: uid(), orden: p.secciones.length, codigoBloque: null, bloque: null, titulo: "Sección nueva", descripcion: null, mostrarSi: null, preguntas: [] },
      ],
    }));
  }
  function duplicarSeccion(sidx: number) {
    update(p => {
      const s = p.secciones[sidx];
      const copia: Seccion = {
        ...s,
        id: uid(),
        titulo: `${s.titulo} (copia)`,
        preguntas: s.preguntas.map(q => ({ ...q, id: uid() })),
      };
      const nuevas = [...p.secciones];
      nuevas.splice(sidx + 1, 0, copia);
      return { ...p, secciones: nuevas.map((x, i) => ({ ...x, orden: i })) };
    });
  }
  function eliminarSeccion(sidx: number) {
    update(p => ({ ...p, secciones: p.secciones.filter((_, i) => i !== sidx).map((x, i) => ({ ...x, orden: i })) }));
  }
  function moverSeccion(sidx: number, delta: number) {
    update(p => {
      const dest = sidx + delta;
      if (dest < 0 || dest >= p.secciones.length) return p;
      const arr = [...p.secciones];
      [arr[sidx], arr[dest]] = [arr[dest], arr[sidx]];
      return { ...p, secciones: arr.map((x, i) => ({ ...x, orden: i })) };
    });
  }
  function patchSeccion(sidx: number, patch: Partial<Seccion>) {
    update(p => ({ ...p, secciones: p.secciones.map((s, i) => i === sidx ? { ...s, ...patch } : s) }));
  }

  function addPregunta(sidx: number) {
    update(p => {
      const sec = p.secciones[sidx];
      const nueva: Pregunta = {
        id: uid(), orden: sec.preguntas.length, codigo: null,
        texto: "Pregunta nueva", ayuda: null, tipo: "texto_corto",
        obligatoria: true, opciones: [], mostrarSi: null, valoracion: null,
        _nueva: true,
      };
      return { ...p, secciones: p.secciones.map((s, i) => i === sidx ? { ...s, preguntas: [...s.preguntas, nueva] } : s) };
    });
  }
  function duplicarPregunta(sidx: number, qidx: number) {
    update(p => ({ ...p, secciones: p.secciones.map((s, i) => {
      if (i !== sidx) return s;
      const q = s.preguntas[qidx];
      const copia: Pregunta = { ...q, id: uid(), texto: `${q.texto} (copia)` };
      const nuevas = [...s.preguntas];
      nuevas.splice(qidx + 1, 0, copia);
      return { ...s, preguntas: nuevas.map((x, j) => ({ ...x, orden: j })) };
    }) }));
  }
  function eliminarPregunta(sidx: number, qidx: number) {
    update(p => ({ ...p, secciones: p.secciones.map((s, i) => i === sidx
      ? { ...s, preguntas: s.preguntas.filter((_, j) => j !== qidx).map((x, j) => ({ ...x, orden: j })) }
      : s) }));
  }
  function moverPregunta(sidx: number, qidx: number, delta: number) {
    update(p => ({ ...p, secciones: p.secciones.map((s, i) => {
      if (i !== sidx) return s;
      const dest = qidx + delta;
      if (dest < 0 || dest >= s.preguntas.length) return s;
      const arr = [...s.preguntas];
      [arr[qidx], arr[dest]] = [arr[dest], arr[qidx]];
      return { ...s, preguntas: arr.map((x, j) => ({ ...x, orden: j })) };
    }) }));
  }
  function moverPreguntaAOtraSeccion(sidx: number, qidx: number, destSidx: number) {
    update(p => {
      if (destSidx === sidx || destSidx < 0 || destSidx >= p.secciones.length) return p;
      const pregunta = p.secciones[sidx].preguntas[qidx];
      const nuevas = p.secciones.map((s, i) => {
        if (i === sidx) return { ...s, preguntas: s.preguntas.filter((_, j) => j !== qidx).map((x, j) => ({ ...x, orden: j })) };
        if (i === destSidx) return { ...s, preguntas: [...s.preguntas, { ...pregunta, orden: s.preguntas.length }] };
        return s;
      });
      return { ...p, secciones: nuevas };
    });
  }
  function patchPregunta(sidx: number, qidx: number, patch: Partial<Pregunta>) {
    update(p => ({ ...p, secciones: p.secciones.map((s, i) => i === sidx
      ? { ...s, preguntas: s.preguntas.map((q, j) => j === qidx ? { ...q, ...patch } : q) }
      : s) }));
  }

  async function subirImagen(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const blob = await upload(`formularios/${params.id}/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/token",
      });
      update(p => ({ ...p, imagenUrl: blob.url }));
    } catch {
      toast.error("No se pudo subir la imagen");
    }
  }

  const enlacePublico = typeof window !== "undefined" ? `${window.location.origin}/postular/${f.slug}` : `/postular/${f.slug}`;

  return (
    <div className="ms-page space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/organizacion/formularios" className="text-xs text-gray-500 hover:text-white">← Formularios</Link>
          <h1 className="ms-h1 mt-1">{f.titulo || "Sin título"}</h1>
          <p className="ms-subtitle">
            {saving ? "Guardando…" : savedAt ? `Guardado ${savedAt.toLocaleTimeString("es-MX")}` : "Sin cambios por guardar"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowVistaPrevia(true)} className="ms-btn-ghost flex items-center gap-2">
            <Eye className="w-4 h-4" /> Vista previa
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a1a1a]">
        {(["preguntas", "config", "respuestas"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "text-white border-b-2 border-[#B3985B]" : "text-gray-500 hover:text-white"}`}>
            {t === "preguntas" ? "Preguntas" : t === "config" ? "Configuración" : `Respuestas (${f.respuestasCount})`}
          </button>
        ))}
      </div>

      {tab === "preguntas" && (
        <div className="space-y-5">
          {/* Encabezado */}
          <div className="ms-card p-5 space-y-3">
            <input
              value={f.titulo}
              onChange={e => update(p => ({ ...p, titulo: e.target.value }))}
              className="w-full bg-transparent text-white text-xl font-semibold border-b border-transparent focus:border-[#B3985B] focus:outline-none pb-1"
              placeholder="Título del formulario"
            />
            <textarea
              value={f.descripcion ?? ""}
              onChange={e => update(p => ({ ...p, descripcion: e.target.value }))}
              className={inputCls}
              rows={2}
              placeholder="Descripción (opcional)"
            />
            <div className="flex items-center gap-3">
              {f.imagenUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.imagenUrl} alt="" className="h-16 w-auto rounded border border-[#222]" />
              ) : null}
              <label className="text-xs text-gray-500 hover:text-white cursor-pointer flex items-center gap-2">
                <ImgIcon className="w-4 h-4" />
                {f.imagenUrl ? "Cambiar imagen" : "Subir imagen o logo"}
                <input type="file" accept="image/*" className="hidden" onChange={subirImagen} />
              </label>
              {f.imagenUrl && (
                <button onClick={() => update(p => ({ ...p, imagenUrl: null }))} className="text-xs text-red-500 hover:text-red-400">
                  Quitar
                </button>
              )}
            </div>
          </div>

          {/* Secciones */}
          {f.secciones.map((s, sidx) => (
            <div key={s.id} className="ms-card p-5 space-y-4">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1 pt-1">
                  <button onClick={() => moverSeccion(sidx, -1)} disabled={sidx === 0} className="text-gray-600 hover:text-white disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => moverSeccion(sidx, 1)} disabled={sidx === f.secciones.length - 1} className="text-gray-600 hover:text-white disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    value={s.titulo}
                    onChange={e => patchSeccion(sidx, { titulo: e.target.value })}
                    className="w-full bg-transparent text-white font-semibold border-b border-transparent focus:border-[#B3985B] focus:outline-none pb-1"
                  />
                  <textarea
                    value={s.descripcion ?? ""}
                    onChange={e => patchSeccion(sidx, { descripcion: e.target.value })}
                    className={inputCls}
                    rows={1}
                    placeholder="Descripción de la sección (opcional)"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => duplicarSeccion(sidx)} title="Duplicar sección" className="text-gray-500 hover:text-white p-1"><Copy className="w-4 h-4" /></button>
                  <button onClick={() => eliminarSeccion(sidx)} title="Eliminar sección" className="text-red-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* mostrarSi de sección */}
              <MostrarSiEditor
                valor={s.mostrarSi}
                onChange={v => patchSeccion(sidx, { mostrarSi: v })}
                preguntasAnteriores={preguntasAnteriores(f.secciones, sidx)}
              />

              {/* Preguntas */}
              {s.preguntas.map((q, qidx) => (
                <PreguntaEditor
                  key={q.id}
                  pregunta={q}
                  onChange={patch => patchPregunta(sidx, qidx, patch)}
                  onMoveUp={() => moverPregunta(sidx, qidx, -1)}
                  onMoveDown={() => moverPregunta(sidx, qidx, 1)}
                  canMoveUp={qidx > 0}
                  canMoveDown={qidx < s.preguntas.length - 1}
                  onDuplicate={() => duplicarPregunta(sidx, qidx)}
                  onDelete={() => eliminarPregunta(sidx, qidx)}
                  onMoveToSeccion={destSidx => moverPreguntaAOtraSeccion(sidx, qidx, destSidx)}
                  secciones={f.secciones.map((x, i) => ({ id: x.id, titulo: x.titulo, index: i }))}
                  seccionActualIdx={sidx}
                  preguntasAnteriores={[...preguntasAnteriores(f.secciones, sidx), ...s.preguntas.slice(0, qidx).map(x => ({ id: x.id, texto: x.texto, opciones: x.opciones }))]}
                />
              ))}

              <button onClick={() => addPregunta(sidx)} className="w-full border border-dashed border-[#2a2a2a] text-gray-500 hover:text-white hover:border-[#444] text-xs py-2 rounded-lg flex items-center justify-center gap-2">
                <Plus className="w-3 h-3" /> Añadir pregunta
              </button>
            </div>
          ))}

          <button onClick={addSeccion} className="w-full ms-card p-4 text-sm text-gray-400 hover:text-white hover:border-[#444] flex items-center justify-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Añadir sección
          </button>
        </div>
      )}

      {tab === "config" && (
        <ConfigTab
          f={f}
          update={update}
          puestos={puestos}
          enlacePublico={enlacePublico}
        />
      )}

      {tab === "respuestas" && (
        <RespuestasTab formularioId={params.id} secciones={f.secciones} />
      )}

      <Modal open={showVistaPrevia} onClose={() => setShowVistaPrevia(false)} title="Vista previa" maxWidth="max-w-2xl">
        <VistaPrevia secciones={f.secciones} titulo={f.titulo} descripcion={f.descripcion} imagenUrl={f.imagenUrl} />
      </Modal>
    </div>
  );
}

// ── Helpers de preguntas disponibles como fuente de mostrarSi ────────────────
function preguntasAnteriores(secciones: Seccion[], hastaSidx: number): { id: string; texto: string; opciones: string[] }[] {
  const out: { id: string; texto: string; opciones: string[] }[] = [];
  for (let i = 0; i < hastaSidx; i++) {
    for (const q of secciones[i].preguntas) {
      out.push({ id: q.id, texto: q.texto, opciones: q.opciones });
    }
  }
  return out;
}

// ── Editor de mostrarSi ──────────────────────────────────────────────────────
function MostrarSiEditor({ valor, onChange, preguntasAnteriores }: {
  valor: MostrarSi;
  onChange: (v: MostrarSi) => void;
  preguntasAnteriores: { id: string; texto: string; opciones: string[] }[];
}) {
  const [abierto, setAbierto] = useState(!!valor);
  if (preguntasAnteriores.length === 0) return null;

  const condiciones: Condicion[] = valor
    ? ("todas" in valor ? valor.todas : [valor])
    : [];

  function setCond(idx: number, c: Condicion) {
    const nuevas = [...condiciones];
    nuevas[idx] = c;
    emit(nuevas);
  }
  function addCond() { emit([...condiciones, { pregunta: preguntasAnteriores[0].id, valorEn: [] }]); }
  function delCond(idx: number) { emit(condiciones.filter((_, i) => i !== idx)); }
  function emit(arr: Condicion[]) {
    if (arr.length === 0) onChange(null);
    else if (arr.length === 1) onChange(arr[0]);
    else onChange({ todas: arr });
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="text-xs text-gray-500 hover:text-[#B3985B]">
        + Añadir condición de visibilidad
      </button>
    );
  }

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-500 uppercase tracking-wide">Mostrar solo si (todas se cumplen)</p>
        <button onClick={() => { setAbierto(false); onChange(null); }} className="text-xs text-gray-600 hover:text-white">Quitar</button>
      </div>
      {condiciones.map((c, i) => {
        const preg = preguntasAnteriores.find(p => p.id === c.pregunta);
        return (
          <div key={i} className="flex items-center gap-2">
            <select
              value={c.pregunta}
              onChange={e => setCond(i, { ...c, pregunta: e.target.value, valorEn: [] })}
              className="bg-[#0d0d0d] border border-[#222] text-white text-xs rounded px-2 py-1 flex-1"
            >
              {preguntasAnteriores.map(p => <option key={p.id} value={p.id}>{p.texto.slice(0, 50)}</option>)}
            </select>
            <span className="text-xs text-gray-600">incluye</span>
            {preg && preg.opciones.length > 0 ? (
              <select
                multiple
                value={c.valorEn}
                onChange={e => setCond(i, { ...c, valorEn: Array.from(e.target.selectedOptions).map(o => o.value) })}
                className="bg-[#0d0d0d] border border-[#222] text-white text-xs rounded px-2 py-1 flex-1 min-h-[60px]"
              >
                {preg.opciones.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                value={c.valorEn.join(", ")}
                onChange={e => setCond(i, { ...c, valorEn: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                className="bg-[#0d0d0d] border border-[#222] text-white text-xs rounded px-2 py-1 flex-1"
                placeholder="valores separados por coma"
              />
            )}
            <button onClick={() => delCond(i)} className="text-red-500 hover:text-red-400">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}
      <button onClick={addCond} className="text-xs text-[#B3985B] hover:underline">+ Añadir condición</button>
    </div>
  );
}

// ── Editor de pregunta ───────────────────────────────────────────────────────
function PreguntaEditor({ pregunta, onChange, onMoveUp, onMoveDown, canMoveUp, canMoveDown, onDuplicate, onDelete, onMoveToSeccion, secciones, seccionActualIdx, preguntasAnteriores }: {
  pregunta: Pregunta;
  onChange: (patch: Partial<Pregunta>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveToSeccion: (idx: number) => void;
  secciones: { id: string; titulo: string; index: number }[];
  seccionActualIdx: number;
  preguntasAnteriores: { id: string; texto: string; opciones: string[] }[];
}) {
  const [verValoracion, setVerValoracion] = useState(false);
  const [moverAbrirto, setMoverAbierto] = useState(false);

  function setOpcion(i: number, valor: string) {
    const arr = [...pregunta.opciones];
    arr[i] = valor;
    onChange({ opciones: arr });
  }
  function addOpcion() { onChange({ opciones: [...pregunta.opciones, ""] }); }
  function delOpcion(i: number) { onChange({ opciones: pregunta.opciones.filter((_, j) => j !== i) }); }

  const tieneOpciones = pregunta.tipo === "opcion_unica" || pregunta.tipo === "opcion_multiple" || pregunta.tipo === "lista";

  return (
    <div className="border border-[#1a1a1a] rounded-lg p-4 space-y-3 bg-[#0a0a0a]">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1 pt-1">
          <GripVertical className="w-3 h-3 text-gray-700" />
          <button onClick={onMoveUp} disabled={!canMoveUp} className="text-gray-600 hover:text-white disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
          <button onClick={onMoveDown} disabled={!canMoveDown} className="text-gray-600 hover:text-white disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={pregunta.codigo ?? ""}
              onChange={e => onChange({ codigo: e.target.value || null })}
              placeholder="A.1"
              className="w-14 bg-transparent border border-[#1a1a1a] rounded px-2 py-1 text-xs text-gray-400"
            />
            <input
              value={pregunta.texto}
              onChange={e => onChange({ texto: e.target.value })}
              className="flex-1 bg-transparent text-white text-sm border-b border-[#1a1a1a] focus:border-[#B3985B] focus:outline-none pb-1"
              placeholder="Pregunta"
            />
          </div>
          <textarea
            value={pregunta.ayuda ?? ""}
            onChange={e => onChange({ ayuda: e.target.value || null })}
            className={inputCls}
            rows={1}
            placeholder="Texto de ayuda (opcional)"
          />
          <select
            value={pregunta.tipo}
            onChange={e => onChange({ tipo: e.target.value as TipoPregunta })}
            className="bg-[#0d0d0d] border border-[#222] text-white text-xs rounded px-2 py-1"
          >
            {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {tieneOpciones && (
            <div className="space-y-1">
              {pregunta.opciones.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={o}
                    onChange={e => setOpcion(i, e.target.value)}
                    className={inputCls}
                    placeholder={`Opción ${i + 1}`}
                  />
                  <button onClick={() => delOpcion(i)} className="text-red-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <button onClick={addOpcion} className="text-xs text-[#B3985B] hover:underline">+ Añadir opción</button>
            </div>
          )}

          <MostrarSiEditor valor={pregunta.mostrarSi} onChange={v => onChange({ mostrarSi: v })} preguntasAnteriores={preguntasAnteriores} />

          <div className="flex items-center gap-4 flex-wrap text-xs">
            <label className="flex items-center gap-2 text-gray-400">
              <input type="checkbox" checked={pregunta.obligatoria} onChange={e => onChange({ obligatoria: e.target.checked })} />
              Obligatoria
            </label>
            <button onClick={() => setVerValoracion(v => !v)} className="text-gray-500 hover:text-[#B3985B]">
              {verValoracion ? "Ocultar valoración" : "Panel de valoración"}
            </button>
            <button onClick={() => setMoverAbierto(v => !v)} className="text-gray-500 hover:text-white flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3" /> Mover a otra sección
            </button>
          </div>

          {moverAbrirto && (
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-2 flex gap-2 items-center">
              <select
                onChange={e => { if (e.target.value) { onMoveToSeccion(Number(e.target.value)); setMoverAbierto(false); } }}
                defaultValue=""
                className="bg-[#0d0d0d] border border-[#222] text-white text-xs rounded px-2 py-1 flex-1"
              >
                <option value="">— Seleccionar sección destino —</option>
                {secciones.filter(s => s.index !== seccionActualIdx).map(s => (
                  <option key={s.id} value={s.index}>{s.titulo}</option>
                ))}
              </select>
            </div>
          )}

          {verValoracion && (
            <ValoracionEditor pregunta={pregunta} onChange={v => onChange({ valoracion: v })} />
          )}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={onDuplicate} title="Duplicar" className="text-gray-500 hover:text-white p-1"><Copy className="w-4 h-4" /></button>
          <button onClick={onDelete} title="Eliminar" className="text-red-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

function ValoracionEditor({ pregunta, onChange }: { pregunta: Pregunta; onChange: (v: Valoracion | null) => void }) {
  const v = pregunta.valoracion ?? {};
  function patch(p: Partial<Valoracion>) { onChange({ ...v, ...p }); }
  const tipo = v.tipo ?? "I";

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1a10] rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">Tipo:</span>
        {(["E", "P", "M", "I"] as const).map(t => (
          <button key={t}
            onClick={() => patch({ tipo: t })}
            className={`px-2 py-0.5 rounded border text-[11px] ${tipo === t ? "bg-[#B3985B] text-black border-[#B3985B]" : "border-[#222] text-gray-500 hover:text-white"}`}>
            {t} · {t === "E" ? "Excluyente" : t === "P" ? "Puntuable" : t === "M" ? "Manual" : "Informativa"}
          </button>
        ))}
        <button onClick={() => onChange(null)} className="ml-auto text-red-500 hover:text-red-400 text-xs">Limpiar</button>
      </div>

      {(tipo === "P" || tipo === "E") && (pregunta.tipo === "opcion_unica" || pregunta.tipo === "lista" || pregunta.tipo === "si_no") && (
        <>
          <div>
            <label className={labelCls}>Respuesta correcta (opcional)</label>
            <input value={typeof v.correcta === "string" ? v.correcta : ""} onChange={e => patch({ correcta: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Puntos si acierta</label>
            <input type="number" value={typeof v.puntos === "number" ? v.puntos : 1}
              onChange={e => patch({ puntos: Number(e.target.value) })} className={inputCls} />
          </div>
        </>
      )}

      {(tipo === "P") && pregunta.tipo === "opcion_multiple" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Puntos por opción</label>
              <input type="number" value={v.porOpcion ?? ""}
                onChange={e => patch({ porOpcion: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Máximo</label>
              <input type="number" value={v.max ?? ""} onChange={e => patch({ max: Number(e.target.value) })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Opciones requeridas (si todas no están, excluye) — una por línea</label>
            <textarea rows={2} value={(v.requiere ?? []).join("\n")} onChange={e => patch({ requiere: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })} className={inputCls} />
          </div>
        </>
      )}

      {tipo === "E" && (
        <div>
          <label className={labelCls}>Opciones que excluyen (una por línea; o escribe &quot;incorrecta&quot;)</label>
          <textarea rows={2}
            value={Array.isArray(v.excluyeSi) ? v.excluyeSi.join("\n") : (v.excluyeSi ?? "")}
            onChange={e => {
              const raw = e.target.value.trim();
              if (raw === "incorrecta") patch({ excluyeSi: "incorrecta" });
              else patch({ excluyeSi: raw.split("\n").map(s => s.trim()).filter(Boolean) });
            }}
            className={inputCls} />
        </div>
      )}

      {tipo === "M" && (
        <>
          <div>
            <label className={labelCls}>Puntaje máximo</label>
            <input type="number" value={v.max ?? 3} onChange={e => patch({ max: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Rúbrica</label>
            <textarea rows={3} value={v.rubrica ?? ""} onChange={e => patch({ rubrica: e.target.value })} className={inputCls} placeholder="0 sin respuesta · 1 básica · 2 clara · 3 completa" />
          </div>
          <div>
            <label className={labelCls}>Calificación que excluye (ej. 0)</label>
            <input type="number" value={v.excluyeSiCalificacion ?? ""} onChange={e => patch({ excluyeSiCalificacion: Number(e.target.value) })} className={inputCls} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Pestaña Configuración ────────────────────────────────────────────────────
function ConfigTab({ f, update, puestos, enlacePublico }: {
  f: FormularioState;
  update: UpdateFn;
  puestos: Puesto[];
  enlacePublico: string;
}) {
  const toast = useToast();
  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlacePublico);
      toast.success("Enlace copiado");
    } catch { toast.error("No se pudo copiar"); }
  }
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(enlacePublico)}`;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="ms-card p-5 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Estado</p>
        <div className="flex items-center gap-2 flex-wrap">
          {(["BORRADOR", "PUBLICADO", "CERRADO"] as const).map(e => (
            <button key={e} onClick={() => update(p => ({ ...p, estado: e }))}
              className={`px-3 py-1.5 text-xs rounded border ${f.estado === e ? "bg-[#B3985B] text-black border-[#B3985B]" : "border-[#222] text-gray-400 hover:text-white"}`}>
              {e === "BORRADOR" ? "Borrador" : e === "PUBLICADO" ? "Publicado" : "Cerrado"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300 mt-3">
          <input type="checkbox" checked={f.aceptaRespuestas} onChange={e => update(p => ({ ...p, aceptaRespuestas: e.target.checked }))} />
          Acepta respuestas
          {f.aceptaRespuestas
            ? <Unlock className="w-3 h-3 text-green-500" />
            : <Lock className="w-3 h-3 text-red-500" />}
        </label>
      </div>

      <div className="ms-card p-5 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Enlace público</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">/postular/</span>
          <input
            value={f.slug}
            onChange={e => update(p => ({ ...p, slug: e.target.value }))}
            className={inputCls + " flex-1"}
          />
        </div>
        <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
          <code className="text-xs text-gray-400 flex-1 truncate">{enlacePublico}</code>
          <button onClick={copiar} className="text-xs text-[#B3985B] hover:underline">Copiar</button>
        </div>
        <div className="flex items-start gap-3 pt-2">
          {/* QR via servicio externo, sin instalar dependencia nueva */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR" className="w-32 h-32 rounded border border-[#222] bg-white p-2" />
          <div className="text-xs text-gray-500">
            <p>QR descargable del enlace.</p>
            <a href={qrUrl} download={`qr-${f.slug}.png`} className="text-[#B3985B] hover:underline">Descargar PNG</a>
          </div>
        </div>
      </div>

      <div className="ms-card p-5 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Puestos vinculados</p>
        <div className="flex flex-wrap gap-2">
          {puestos.map(pu => {
            const activo = f.puestoIds.includes(pu.id);
            return (
              <button key={pu.id}
                onClick={() => update(p => ({ ...p, puestoIds: activo ? p.puestoIds.filter(x => x !== pu.id) : [...p.puestoIds, pu.id] }))}
                className={`text-xs px-3 py-1 rounded-full border ${activo ? "bg-[#B3985B] text-black border-[#B3985B]" : "border-[#222] text-gray-400 hover:text-white"}`}>
                {pu.nombre}
              </button>
            );
          })}
          {puestos.length === 0 && <p className="text-xs text-gray-600">No hay puestos registrados.</p>}
        </div>
      </div>

      <div className="ms-card p-5 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Umbrales de banda</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Avanza a prueba práctica (≥ %)</label>
            <input type="number" value={f.umbralAvanza}
              onChange={e => update(p => ({ ...p, umbralAvanza: Number(e.target.value) }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Banco de talento (≥ %)</label>
            <input type="number" value={f.umbralBanco}
              onChange={e => update(p => ({ ...p, umbralBanco: Number(e.target.value) }))} className={inputCls} />
          </div>
        </div>
        <p className="text-[11px] text-gray-600">El motor calcula automáticamente al recibir la respuesta y al recalificar preguntas manuales.</p>
      </div>

      <div className="ms-card p-5 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Mensaje de confirmación</p>
        <textarea
          value={f.mensajeConfirmacion ?? ""}
          onChange={e => update(p => ({ ...p, mensajeConfirmacion: e.target.value || null }))}
          className={inputCls}
          rows={3}
          placeholder="Gracias, recibimos tu postulación."
        />
      </div>
    </div>
  );
}

// ── Pestaña Respuestas ───────────────────────────────────────────────────────
function RespuestasTab({ formularioId, secciones }: { formularioId: string; secciones: Seccion[] }) {
  const [sub, setSub] = useState<"resumen" | "individual" | "tabla">("resumen");
  const [respuestas, setRespuestas] = useState<RespuestaFull[] | null>(null);

  useEffect(() => {
    fetch(`/api/rrhh/formularios/${formularioId}/respuestas`).then(r => r.json()).then(d => setRespuestas(d.respuestas ?? []));
  }, [formularioId]);

  const preguntas = useMemo(() => secciones.flatMap(s => s.preguntas), [secciones]);

  if (!respuestas) return <p className="text-xs text-gray-500">Cargando respuestas…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2">
        {(["resumen", "individual", "tabla"] as const).map(s => (
          <button key={s} onClick={() => setSub(s)}
            className={`text-xs px-3 py-1 rounded ${sub === s ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-white"}`}>
            {s === "resumen" ? "Resumen" : s === "individual" ? "Individual" : "Tabla"}
          </button>
        ))}
        <div className="flex-1" />
        <a href={`/api/rrhh/formularios/${formularioId}/respuestas/export?format=csv`} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
          <Download className="w-3 h-3" /> CSV
        </a>
        <a href={`/api/rrhh/formularios/${formularioId}/respuestas/export?format=xlsx`} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
          <Download className="w-3 h-3" /> Excel
        </a>
      </div>

      {respuestas.length === 0 ? (
        <div className="ms-card p-12 text-center text-sm text-gray-500">Aún no hay respuestas.</div>
      ) : sub === "resumen" ? (
        <ResumenVista respuestas={respuestas} preguntas={preguntas} />
      ) : sub === "individual" ? (
        <IndividualVista respuestas={respuestas} preguntas={preguntas} formularioId={formularioId} onRefresh={() => fetch(`/api/rrhh/formularios/${formularioId}/respuestas`).then(r => r.json()).then(d => setRespuestas(d.respuestas ?? []))} />
      ) : (
        <TablaVista respuestas={respuestas} preguntas={preguntas} />
      )}
    </div>
  );
}

interface RespuestaFull {
  id: string; enviadoAt: string;
  excluido: boolean | null;
  motivoExclusion: string | null;
  puntosObtenidos: number | null;
  puntosPosibles: number | null;
  porcentajePreliminar: number | null;
  porcentajeFinal: number | null;
  banda: string | null;
  desglose: string | null;
  nivelSugerido: string | null;
  candidatoId: string | null;
  respuestasPreguntas: {
    id: string; preguntaId: string; valor: string | null;
    calificacionManual: number | null;
    puntosAuto: number | null;
    pregunta: { id: string; codigo: string | null; texto: string; tipo: string };
  }[];
}

const BANDA_LABEL: Record<string, string> = {
  AVANZA: "Avanza a prueba práctica",
  BANCO: "Banco de talento",
  DESCARTAR: "Descartar (sugerido)",
};
const BANDA_COLOR: Record<string, string> = {
  AVANZA: "text-green-400",
  BANCO: "text-yellow-400",
  DESCARTAR: "text-red-400",
};

function valorLegible(v: string | null, tipo: string): string {
  if (!v) return "";
  try {
    const parsed = JSON.parse(v);
    if (parsed == null) return "";
    if (Array.isArray(parsed)) return parsed.join(", ");
    if (typeof parsed === "boolean") return parsed ? "Sí" : "No";
    if (tipo === "si_no") return parsed ? "Sí" : "No";
    return String(parsed);
  } catch { return ""; }
}

function ResumenVista({ respuestas, preguntas }: { respuestas: RespuestaFull[]; preguntas: Pregunta[] }) {
  return (
    <div className="space-y-4">
      {preguntas.map(p => {
        const valores = respuestas.map(r => r.respuestasPreguntas.find(rp => rp.preguntaId === p.id)?.valor ?? null);
        if (p.tipo === "opcion_unica" || p.tipo === "opcion_multiple" || p.tipo === "lista" || p.tipo === "si_no") {
          const counts = new Map<string, number>();
          const opts = p.tipo === "si_no" ? ["Sí", "No"] : p.opciones;
          for (const o of opts) counts.set(o, 0);
          for (const v of valores) {
            if (!v) continue;
            try {
              const parsed = JSON.parse(v);
              const arr = Array.isArray(parsed) ? parsed : [parsed];
              for (const a of arr) {
                const key = typeof a === "boolean" ? (a ? "Sí" : "No") : String(a);
                counts.set(key, (counts.get(key) ?? 0) + 1);
              }
            } catch {}
          }
          const total = Math.max(1, Array.from(counts.values()).reduce((a, b) => a + b, 0));
          return (
            <div key={p.id} className="ms-card p-4">
              <p className="text-white text-sm mb-3">{p.codigo ? `${p.codigo} · ` : ""}{p.texto}</p>
              <div className="space-y-1.5">
                {Array.from(counts.entries()).map(([k, c]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{k}</span><span>{c} ({Math.round(c / total * 100)}%)</span>
                    </div>
                    <div className="h-1.5 bg-[#1a1a1a] rounded-full">
                      <div className="h-full bg-[#B3985B] rounded-full" style={{ width: `${c / total * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        // texto libre
        return (
          <div key={p.id} className="ms-card p-4">
            <p className="text-white text-sm mb-2">{p.codigo ? `${p.codigo} · ` : ""}{p.texto}</p>
            <div className="space-y-1 text-xs text-gray-400 max-h-40 overflow-y-auto">
              {valores.filter(Boolean).slice(0, 20).map((v, i) => (
                <p key={i} className="border-l-2 border-[#222] pl-2">{valorLegible(v, p.tipo)}</p>
              ))}
              {valores.filter(Boolean).length === 0 && <p className="text-gray-700">Sin respuestas</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IndividualVista({ respuestas, preguntas, formularioId, onRefresh }: {
  respuestas: RespuestaFull[]; preguntas: Pregunta[]; formularioId: string; onRefresh: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const toast = useToast();
  const r = respuestas[idx];
  // overrides por respuesta; se derivan en el momento con fallback a lo guardado
  const [overridesPorRespuesta, setOverridesPorRespuesta] = useState<Record<string, Record<string, number>>>({});

  if (!r) return null;

  const base: Record<string, number> = {};
  for (const rp of r.respuestasPreguntas ?? []) if (rp.calificacionManual != null) base[rp.preguntaId] = rp.calificacionManual;
  const calif: Record<string, number> = { ...base, ...(overridesPorRespuesta[r.id] ?? {}) };
  const setCalif = (updater: (prev: Record<string, number>) => Record<string, number>) => {
    setOverridesPorRespuesta(prev => ({ ...prev, [r.id]: updater(prev[r.id] ?? base) }));
  };

  async function guardarCalif() {
    const res = await fetch(`/api/rrhh/formularios/${formularioId}/respuestas/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calificaciones: Object.entries(calif).map(([preguntaId, calificacionManual]) => ({ preguntaId, calificacionManual })) }),
    });
    if (!res.ok) { toast.error("Error al guardar"); return; }
    toast.success("Calificaciones guardadas");
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">Respuesta {idx + 1} de {respuestas.length}</div>
        <div className="flex gap-2">
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
            className="text-xs px-3 py-1 border border-[#222] rounded text-gray-400 disabled:opacity-30">← Anterior</button>
          <button onClick={() => setIdx(i => Math.min(respuestas.length - 1, i + 1))} disabled={idx === respuestas.length - 1}
            className="text-xs px-3 py-1 border border-[#222] rounded text-gray-400 disabled:opacity-30">Siguiente →</button>
        </div>
      </div>

      <div className="ms-card p-5 space-y-2">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-gray-500">Enviado</p>
            <p className="text-sm text-white">{new Date(r.enviadoAt).toLocaleString("es-MX")}</p>
          </div>
          {r.candidatoId && (
            <Link href={`/organizacion/candidatos/${r.candidatoId}`} className="text-xs text-[#B3985B] hover:underline">
              Ver ficha del candidato →
            </Link>
          )}
        </div>
        {r.excluido && (
          <div className="mt-2 text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded px-3 py-2">
            Excluido automáticamente: {r.motivoExclusion ?? "—"}
          </div>
        )}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-[#1a1a1a] mt-3">
          <div>
            <p className="text-[11px] text-gray-600">Puntaje preliminar</p>
            <p className="text-white font-medium">{r.porcentajePreliminar != null ? `${r.porcentajePreliminar}%` : "—"}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-600">Puntaje final</p>
            <p className="text-white font-medium">{r.porcentajeFinal != null ? `${r.porcentajeFinal}%` : "pendiente"}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-600">Banda</p>
            <p className={`font-medium ${r.banda ? BANDA_COLOR[r.banda] : "text-gray-600"}`}>
              {r.banda ? BANDA_LABEL[r.banda] : "pendiente"}
            </p>
          </div>
        </div>
        {r.nivelSugerido && (
          <p className="text-[11px] text-yellow-400 mt-2">Sugerencia: considerar nivel inferior ({r.nivelSugerido}).</p>
        )}
        {r.desglose && (() => {
          try {
            const bl = JSON.parse(r.desglose) as { bloque: string; porcentaje: number; puntosObtenidos: number; puntosPosibles: number }[];
            if (!bl.length) return null;
            return (
              <div className="mt-3 flex flex-wrap gap-2">
                {bl.map((b) => (
                  <span key={b.bloque} className="text-[11px] bg-[#0d0d0d] border border-[#222] rounded px-2 py-1">
                    <span className="text-gray-500">{b.bloque}:</span> <span className="text-white">{b.porcentaje}%</span>
                    <span className="text-gray-700"> ({b.puntosObtenidos}/{b.puntosPosibles})</span>
                  </span>
                ))}
              </div>
            );
          } catch { return null; }
        })()}
      </div>

      <div className="space-y-3">
        {preguntas.map(p => {
          const rp = r.respuestasPreguntas.find(x => x.preguntaId === p.id);
          const esManual = p.valoracion?.tipo === "M";
          return (
            <div key={p.id} className="ms-card p-4">
              <p className="text-xs text-gray-500">{p.codigo ? `${p.codigo} · ` : ""}{p.tipo}</p>
              <p className="text-white text-sm mt-1">{p.texto}</p>
              <p className="text-gray-300 text-sm mt-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2 whitespace-pre-wrap">
                {valorLegible(rp?.valor ?? null, p.tipo) || <span className="text-gray-700">— sin respuesta —</span>}
              </p>
              {esManual && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">Calificación (0–{p.valoracion?.max ?? 3}):</span>
                  <input type="number" min={0} max={p.valoracion?.max ?? 3}
                    value={calif[p.id] ?? ""}
                    onChange={e => setCalif(c => ({ ...c, [p.id]: Number(e.target.value) }))}
                    className="w-20 bg-[#0d0d0d] border border-[#222] text-white text-sm rounded px-2 py-1" />
                  {p.valoracion?.rubrica && <span className="text-[11px] text-gray-600">· {p.valoracion.rubrica}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {preguntas.some(p => p.valoracion?.tipo === "M") && (
        <div className="flex justify-end">
          <button onClick={guardarCalif} className="ms-btn-primary">Guardar calificaciones</button>
        </div>
      )}
    </div>
  );
}

function TablaVista({ respuestas, preguntas }: { respuestas: RespuestaFull[]; preguntas: Pregunta[] }) {
  return (
    <div className="ms-card overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="ms-thead">
          <tr>
            <th className="ms-th">Enviado</th>
            {preguntas.map(p => <th key={p.id} className="ms-th">{p.codigo ?? p.texto.slice(0, 30)}</th>)}
            <th className="ms-th">Puntaje</th>
            <th className="ms-th">Banda</th>
          </tr>
        </thead>
        <tbody>
          {respuestas.map(r => {
            const map = new Map(r.respuestasPreguntas.map(rp => [rp.preguntaId, rp.valor]));
            const pct = r.porcentajeFinal ?? r.porcentajePreliminar;
            return (
              <tr key={r.id} className="ms-tr">
                <td className="ms-td text-gray-400">{new Date(r.enviadoAt).toLocaleString("es-MX")}</td>
                {preguntas.map(p => (
                  <td key={p.id} className="ms-td text-gray-400 max-w-[200px] truncate">{valorLegible(map.get(p.id) ?? null, p.tipo)}</td>
                ))}
                <td className="ms-td text-gray-300">{pct != null ? `${pct}%` : "—"}</td>
                <td className={`ms-td ${r.banda ? BANDA_COLOR[r.banda] : "text-gray-600"}`}>
                  {r.excluido ? "Excluido" : r.banda ? BANDA_LABEL[r.banda] : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Vista previa ─────────────────────────────────────────────────────────────
function VistaPrevia({ secciones, titulo, descripcion, imagenUrl }: {
  secciones: Seccion[]; titulo: string; descripcion: string | null; imagenUrl: string | null;
}) {
  return (
    <div className="space-y-4">
      {imagenUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagenUrl} alt="" className="max-h-28 rounded border border-[#222]" />
      )}
      <div>
        <h2 className="text-white text-lg font-semibold">{titulo}</h2>
        {descripcion && <p className="text-gray-400 text-sm mt-1">{descripcion}</p>}
      </div>
      {secciones.map(s => (
        <div key={s.id} className="border border-[#222] rounded-lg p-4 space-y-3">
          <p className="text-[#B3985B] text-sm font-semibold">{s.titulo}</p>
          {s.descripcion && <p className="text-gray-500 text-xs">{s.descripcion}</p>}
          {s.preguntas.map(p => (
            <div key={p.id} className="space-y-1">
              <p className="text-white text-sm">
                {p.texto}
                {p.obligatoria && <span className="text-red-500 ml-1">*</span>}
              </p>
              {p.ayuda && <p className="text-xs text-gray-600">{p.ayuda}</p>}
              <div className="text-gray-500 text-xs italic">[{TIPO_LABELS[p.tipo]}]</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
