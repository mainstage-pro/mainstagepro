"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TaskItem, { type TareaItem } from "@/app/(dashboard)/operaciones/components/TaskItem";

// ─── Tipos (espejo del API) ──────────────────────────────────────────────────
interface EntregaPunto {
  id: string;
  titulo: string;
  contenido: string;
}
interface PreExtra {
  mejoras: string;
  solicitudesHerramientas: string;
  solicitudesRecursoHumano: string;
  solicitudesPresupuesto: string;
  fallasTransporte: string;
  incidenciasPersonal: string;
  situacionesGenerales: string;
}
interface Usuario { id: string; name: string }
interface VisionProyecto {
  id: string;
  nombre: string;
  estado: string;
  prioridad: string;
  porcentajeAvance: number;
  fechaFin: string | null;
  lider: { id: string; name: string } | null;
  totalFases: number;
  fasesCompletadas: number;
}
interface VisionConfig {
  area: string;
  label: string;
  tipo: "STANDARD" | "PREPRODUCCION";
  entregaLabel: string;
  puntosDefault: string[];
}
interface VisionData {
  config: VisionConfig;
  semana: string;
  puedeEditar: boolean;
  nuevo: boolean;
  documento: {
    enfoque: string;
    entregaInfo: EntregaPunto[];
    desbloqueo: string;
    comentarios: string;
    extra: PreExtra;
    autor: { id: string; name: string } | null;
    responsable: { id: string; name: string } | null;
    actualizadoEn: string | null;
  };
  tareas: TareaItem[];
  proyectos: VisionProyecto[];
  usuarios: Usuario[];
}
interface ResumenArea {
  area: string;
  label: string;
  tipo: "STANDARD" | "PREPRODUCCION";
  nuevo: boolean;
  responsable: { id: string; name: string } | null;
  autor: { id: string; name: string } | null;
  actualizadoEn: string | null;
}

// ─── Metadatos de áreas ──────────────────────────────────────────────────────
const AREA_META: Record<string, { label: string; dot: string; chip: string }> = {
  ADMINISTRACION: { label: "Administración", dot: "#60a5fa", chip: "bg-blue-900/30 text-blue-400" },
  MARKETING:      { label: "Marketing",      dot: "#f472b6", chip: "bg-pink-900/30 text-pink-400" },
  VENTAS:         { label: "Comercial",      dot: "#4ade80", chip: "bg-green-900/30 text-green-400" },
  PRODUCCION:     { label: "Producción",     dot: "#facc15", chip: "bg-yellow-900/30 text-yellow-400" },
  PREPRODUCCION:  { label: "Pre producción", dot: "#B3985B", chip: "bg-[#B3985B]/15 text-[#B3985B]" },
};

const ESTADO_PROY: Record<string, { label: string; cls: string }> = {
  PLANIFICACION: { label: "Planificación", cls: "text-white/60 bg-white/[0.04] border-white/10" },
  ACTIVO:        { label: "Activo",        cls: "text-blue-400 bg-blue-900/20 border-blue-700/30" },
  EN_PAUSA:      { label: "En pausa",      cls: "text-yellow-400 bg-yellow-900/20 border-yellow-700/30" },
  COMPLETADO:    { label: "Completado",    cls: "text-green-400 bg-green-900/20 border-green-700/30" },
};

// ─── Helpers de semana ───────────────────────────────────────────────────────
function lunesDeHoy(): string {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - ((dow + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function desplazarSemana(semana: string, dias: number): string {
  const d = new Date(`${semana}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function rangoSemana(semana: string): string {
  const lunes = new Date(`${semana}T00:00:00`);
  const dom = new Date(lunes);
  dom.setDate(dom.getDate() + 6);
  const sameMonth = lunes.getMonth() === dom.getMonth();
  const l = `${lunes.getDate()}${sameMonth ? "" : " " + MESES[lunes.getMonth()]}`;
  const d = `${dom.getDate()} ${MESES[dom.getMonth()]} ${dom.getFullYear()}`;
  return `${l} – ${d}`;
}
function fmtFecha(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}
function fmtActualizado(iso: string | null | undefined, autor?: { name: string } | null): string {
  if (!iso) return "Sin llenar aún";
  const f = new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return `Actualizado ${f}${autor ? ` · ${autor.name}` : ""}`;
}

// ─── Selector de semana (compartido) ─────────────────────────────────────────
function SelectorSemana({ semana, setSemana }: { semana: string; setSemana: (s: string) => void }) {
  const esSemanaActual = semana === lunesDeHoy();
  return (
    <div className="flex items-center gap-1 bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-1">
      <button onClick={() => setSemana(desplazarSemana(semana, -7))}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#888] hover:text-white hover:bg-[#161616] transition-colors" aria-label="Semana anterior">‹</button>
      <div className="px-2 text-center min-w-[132px]">
        <p className="text-[12px] text-white font-medium leading-tight">{rangoSemana(semana)}</p>
        <button onClick={() => setSemana(lunesDeHoy())} disabled={esSemanaActual}
          className={`text-[10px] leading-tight ${esSemanaActual ? "text-[#B3985B]/70" : "text-[#666] hover:text-[#B3985B]"}`}>
          {esSemanaActual ? "Semana actual" : "Ir a semana actual"}
        </button>
      </div>
      <button onClick={() => setSemana(desplazarSemana(semana, 7))}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#888] hover:text-white hover:bg-[#161616] transition-colors" aria-label="Semana siguiente">›</button>
    </div>
  );
}

// ─── Componentes de campo ────────────────────────────────────────────────────
function Seccion({
  n, icon, titulo, hint, children,
}: { n: number; icon: string; titulo: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 shrink-0 rounded-lg bg-[#B3985B]/12 flex items-center justify-center text-sm">{icon}</span>
        <div className="min-w-0">
          <h2 className="text-white text-[15px] font-semibold leading-tight">
            <span className="text-[#B3985B]/60 mr-1.5">{n}.</span>{titulo}
          </h2>
          {hint && <p className="text-[11px] text-[#555] leading-tight mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="pl-0 sm:pl-9">{children}</div>
    </section>
  );
}

function CampoTexto({
  value, onChange, placeholder, editable, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder: string; editable: boolean; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      readOnly={!editable}
      className={`w-full rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] px-3.5 py-2.5 text-[14px] text-[#d6d6d6] placeholder:text-[#3f3f3f] leading-relaxed resize-y focus:outline-none focus:border-[#B3985B]/40 transition-colors ${editable ? "" : "opacity-90 cursor-default"}`}
    />
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function VisionSemanalClient({
  areas, areaInicial, userArea, isAdmin,
}: { areas: string[]; areaInicial: string | null; userArea: string | null; isAdmin: boolean }) {
  const [vista, setVista] = useState<"index" | "documento">(areaInicial ? "documento" : "index");
  const [area, setArea] = useState(areaInicial ?? areas[0]);
  const [semana, setSemana] = useState(lunesDeHoy());

  function abrirDocumento(a: string) {
    setArea(a);
    setVista("documento");
  }

  return vista === "index" ? (
    <IndexView
      areas={areas} semana={semana} setSemana={setSemana}
      userArea={userArea} isAdmin={isAdmin} onAbrir={abrirDocumento}
    />
  ) : (
    <DocumentoView
      areas={areas} area={area} setArea={setArea} semana={semana} setSemana={setSemana}
      userArea={userArea} isAdmin={isAdmin} onVolver={() => setVista("index")}
    />
  );
}

// ─── Portada: lista de documentos por área ───────────────────────────────────
function IndexView({
  areas, semana, setSemana, userArea, isAdmin, onAbrir,
}: {
  areas: string[]; semana: string; setSemana: (s: string) => void;
  userArea: string | null; isAdmin: boolean; onAbrir: (a: string) => void;
}) {
  const [resumen, setResumen] = useState<ResumenArea[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);

  const cargarResumen = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/vision-semanal/resumen?semana=${semana}`);
      const d = await r.json();
      setResumen(d.areas ?? []);
    } catch {
      setResumen([]);
    } finally {
      setLoading(false);
    }
  }, [semana]);

  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  async function copiarLink(a: string) {
    const url = `${window.location.origin}/vision-semanal?area=${a}&semana=${semana}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(a);
      setTimeout(() => setCopiado((prev) => (prev === a ? null : prev)), 1800);
    } catch { /* clipboard no disponible */ }
  }

  const porArea = new Map((resumen ?? []).map((r) => [r.area, r]));

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-6 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-white text-xl font-semibold tracking-tight">Visión semanal</h1>
            <p className="text-[12px] text-[#666] mt-0.5 max-w-2xl leading-snug">
              Un documento por área para la junta de inicio de semana. Abre el de tu área, o comparte el enlace
              con la persona responsable de llenarlo.
            </p>
          </div>
          <SelectorSemana semana={semana} setSemana={setSemana} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 pb-28">
          {loading ? (
            <div className="text-center text-[#555] text-sm py-20">Cargando documentos…</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {areas.map((a) => {
                const m = AREA_META[a];
                const r = porArea.get(a);
                const esMia = !isAdmin && userArea === a;
                return (
                  <div key={a} className="rounded-2xl bg-[#0c0c0c] border border-[#1a1a1a] p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-1 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.dot }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white text-[15px] font-semibold leading-tight">{m.label}</h3>
                          {esMia && <span className="text-[9px] text-[#B3985B] border border-[#B3985B]/30 rounded px-1 py-0.5">tu área</span>}
                        </div>
                        <p className="text-[11px] text-[#666] mt-0.5">{fmtActualizado(r?.actualizadoEn, r?.autor)}</p>
                      </div>
                    </div>

                    <div className="text-[12px] text-[#888] flex items-center gap-1.5">
                      <span className="text-[#555]">Responsable:</span>
                      {r?.responsable ? (
                        <span className="inline-flex items-center gap-1 text-[#c4c4c4]">
                          <span className="w-4 h-4 rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 text-[9px] text-[#B3985B] flex items-center justify-center font-bold">
                            {r.responsable.name.charAt(0).toUpperCase()}
                          </span>
                          {r.responsable.name}
                        </span>
                      ) : (
                        <span className="text-[#555] italic">Sin asignar</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-auto">
                      <button onClick={() => onAbrir(a)}
                        className="flex-1 text-[13px] py-1.5 rounded-lg font-semibold bg-[#161616] hover:bg-[#1e1e1e] text-white border border-[#2a2a2a] transition-colors">
                        Abrir documento
                      </button>
                      <button onClick={() => copiarLink(a)}
                        className={`text-[12px] px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                          copiado === a
                            ? "bg-emerald-950/40 border-emerald-700/40 text-emerald-400"
                            : "bg-[#0f0f0f] border-[#222] text-[#888] hover:text-white hover:border-[#333]"
                        }`}>
                        {copiado === a ? "¡Copiado!" : "Copiar link"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Vista del documento ─────────────────────────────────────────────────────
function DocumentoView({
  areas, area, setArea, semana, setSemana, userArea, isAdmin, onVolver,
}: {
  areas: string[]; area: string; setArea: (a: string) => void;
  semana: string; setSemana: (s: string) => void;
  userArea: string | null; isAdmin: boolean; onVolver: () => void;
}) {
  const [data, setData] = useState<VisionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado editable local
  const [enfoque, setEnfoque] = useState("");
  const [entregaInfo, setEntregaInfo] = useState<EntregaPunto[]>([]);
  const [desbloqueo, setDesbloqueo] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [responsableId, setResponsableId] = useState<string>("");
  const [extra, setExtra] = useState<PreExtra>({
    mejoras: "", solicitudesHerramientas: "", solicitudesRecursoHumano: "",
    solicitudesPresupuesto: "", fallasTransporte: "", incidenciasPersonal: "", situacionesGenerales: "",
  });

  // Tareas en vivo (editables inline vía TaskItem)
  const [tareas, setTareas] = useState<TareaItem[]>([]);
  const [tareaSel, setTareaSel] = useState<TareaItem | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/vision-semanal?area=${area}&semana=${semana}`);
      if (!r.ok) throw new Error("No se pudo cargar el documento");
      const d: VisionData = await r.json();
      setData(d);
      setEnfoque(d.documento.enfoque);
      setEntregaInfo(d.documento.entregaInfo);
      setDesbloqueo(d.documento.desbloqueo);
      setComentarios(d.documento.comentarios);
      setResponsableId(d.documento.responsable?.id ?? "");
      setExtra(d.documento.extra);
      setTareas(d.tareas);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [area, semana]);

  useEffect(() => { cargar(); }, [cargar]);

  const editable = data?.puedeEditar ?? false;
  const tipo = data?.config.tipo ?? "STANDARD";
  const usuarios = useMemo(() => data?.usuarios ?? [], [data]);

  function marcar<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true); };
  }
  function setExtraCampo(campo: keyof PreExtra, v: string) {
    setExtra((prev) => ({ ...prev, [campo]: v }));
    setDirty(true);
  }

  function editarPunto(id: string, campo: "titulo" | "contenido", v: string) {
    setEntregaInfo((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: v } : p)));
    setDirty(true);
  }
  function agregarPunto() {
    setEntregaInfo((prev) => [...prev, { id: `n-${Date.now()}`, titulo: "", contenido: "" }]);
    setDirty(true);
  }
  function quitarPunto(id: string) {
    setEntregaInfo((prev) => prev.filter((p) => p.id !== id));
    setDirty(true);
  }

  // ── Edición de tareas (persiste directo en el módulo de tareas) ──
  const saveTarea = useCallback(async (id: string, patch: Record<string, unknown>) => {
    setTareas((prev) => prev.map((t) => (t.id === id
      ? { ...t, ...patch, asignadoA: "asignadoAId" in patch
          ? (usuarios.find((u) => u.id === patch.asignadoAId) ?? null)
          : t.asignadoA } as TareaItem
      : t)));
    setTareaSel((prev) => (prev && prev.id === id ? { ...prev, ...patch } as TareaItem : prev));
    try {
      await fetch(`/api/tareas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch { /* se reintentará al recargar */ }
  }, [usuarios]);

  const completeTarea = useCallback(async (id: string) => {
    setTareas((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/tareas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "COMPLETADA" }),
      });
    } catch { /* noop */ }
  }, []);

  const deleteTarea = useCallback(async (id: string) => {
    setTareas((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/tareas/${id}`, { method: "DELETE" });
    } catch { /* noop */ }
  }, []);

  async function guardar() {
    if (!editable) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/vision-semanal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, semana, enfoque, entregaInfo, desbloqueo, comentarios, extra, responsableId: responsableId || null }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "No se pudo guardar");
      }
      const j = await r.json();
      setDirty(false);
      setData((prev) => prev ? { ...prev, nuevo: false, documento: { ...prev.documento, autor: j.documento.autor, responsable: j.documento.responsable, actualizadoEn: j.documento.actualizadoEn } } : prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <button onClick={onVolver}
              className="text-[12px] text-[#666] hover:text-[#B3985B] transition-colors mb-1">
              ‹ Documentos
            </button>
            <h1 className="text-white text-xl font-semibold tracking-tight">Visión semanal</h1>
            <p className="text-[12px] text-[#666] mt-0.5 max-w-2xl leading-snug">
              Guía para la junta de inicio de semana. Cada responsable prepara aquí dónde está su área,
              qué viene y qué necesita de apoyo.
            </p>
          </div>
          <SelectorSemana semana={semana} setSemana={setSemana} />
        </div>

        {/* Tabs de área */}
        <div className="flex gap-1.5 mt-3.5 flex-wrap">
          {areas.map((a) => {
            const m = AREA_META[a];
            const activo = a === area;
            return (
              <button key={a} onClick={() => setArea(a)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all border ${
                  activo ? "bg-[#161616] border-[#2a2a2a] text-white" : "border-transparent text-[#777] hover:text-white hover:bg-[#111]"
                }`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
                {m.label}
                {!isAdmin && userArea === a && <span className="text-[9px] text-[#B3985B]">tú</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8 pb-28">
          {loading ? (
            <div className="text-center text-[#555] text-sm py-20">Cargando documento…</div>
          ) : !data ? (
            <div className="text-center text-red-400 text-sm py-20">{error ?? "No disponible"}</div>
          ) : (
            <>
              {!editable && (
                <div className="rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] px-3.5 py-2.5 text-[12px] text-[#888]">
                  Vista de solo lectura — este documento lo edita el responsable de {data.config.label}.
                </div>
              )}

              {/* Responsable de llenar el documento */}
              <div className="rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] px-3.5 py-3 flex items-center gap-3 flex-wrap">
                <span className="text-[12px] text-[#888] font-medium">Responsable de llenar este documento</span>
                <select
                  value={responsableId}
                  onChange={(e) => { setResponsableId(e.target.value); setDirty(true); }}
                  disabled={!editable}
                  className="flex-1 min-w-[180px] bg-[#111] border border-[#222] rounded-lg px-2.5 py-1.5 text-[13px] text-[#d6d6d6] focus:outline-none focus:border-[#B3985B]/40 disabled:opacity-60 disabled:cursor-default"
                >
                  <option value="">Sin asignar</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* 1. Enfoque */}
              <Seccion n={1} icon="🎯" titulo="Enfoque de la semana"
                hint={tipo === "PREPRODUCCION" ? "Lo que viene esta semana" : "Define el enfoque principal del área para esta semana"}>
                <CampoTexto value={enfoque} onChange={marcar(setEnfoque)} editable={editable} rows={2}
                  placeholder="Escribe el enfoque de la semana…" />
              </Seccion>

              {/* 2. Entrega de información */}
              <Seccion n={2} icon="📊" titulo={data.config.entregaLabel}
                hint="Temas guía para desarrollar. Puedes editar el texto de cada punto o agregar otro.">
                <div className="space-y-3">
                  {entregaInfo.map((p) => (
                    <div key={p.id} className="rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] p-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#B3985B]/60 shrink-0" />
                        <input
                          value={p.titulo}
                          onChange={(e) => editarPunto(p.id, "titulo", e.target.value)}
                          readOnly={!editable}
                          placeholder="Título del punto…"
                          className="flex-1 bg-transparent text-[14px] font-medium text-white placeholder:text-[#444] focus:outline-none py-1"
                        />
                        {editable && (
                          <button onClick={() => quitarPunto(p.id)}
                            className="text-[#555] hover:text-red-400 text-sm px-1 shrink-0" title="Quitar punto">✕</button>
                        )}
                      </div>
                      <textarea
                        value={p.contenido}
                        onChange={(e) => editarPunto(p.id, "contenido", e.target.value)}
                        readOnly={!editable}
                        placeholder="Escribe la información de este punto…"
                        rows={2}
                        className="w-full mt-1.5 bg-transparent text-[13px] text-[#c4c4c4] placeholder:text-[#3f3f3f] leading-relaxed resize-y focus:outline-none"
                      />
                    </div>
                  ))}
                  {editable && (
                    <button onClick={agregarPunto}
                      className="w-full rounded-xl border border-dashed border-[#262626] hover:border-[#B3985B]/40 text-[#666] hover:text-[#B3985B] text-[13px] py-2 transition-colors">
                      + Agregar punto a revisión
                    </button>
                  )}
                </div>
              </Seccion>

              {/* ── Estructura estándar ── */}
              {tipo === "STANDARD" && (
                <>
                  {/* 3. Revisión de tareas pendientes */}
                  <Seccion n={3} icon="✅" titulo="Revisión de tareas pendientes"
                    hint="Todas las tareas asignadas y con fecha del área o de sus proyectos. Edita fecha, prioridad, responsable o descripción.">
                    <ListaTareas
                      tareas={tareas} usuarios={usuarios} editable={editable}
                      onSelect={(id) => setTareaSel(tareas.find((t) => t.id === id) ?? null)}
                      onComplete={completeTarea} onDelete={deleteTarea}
                      onDateChange={(id, val) => saveTarea(id, { fecha: val || null })}
                      onPriorityChange={(id, p) => saveTarea(id, { prioridad: p })}
                      onAssign={(id, userId) => saveTarea(id, { asignadoAId: userId })}
                    />
                  </Seccion>

                  {/* 4. Desbloqueo de tareas */}
                  <Seccion n={4} icon="🔓" titulo="Desbloqueo de tareas"
                    hint="¿Necesitas información, herramientas o consejo para llevar a cabo alguna tarea?">
                    <CampoTexto value={desbloqueo} onChange={marcar(setDesbloqueo)} editable={editable} rows={3}
                      placeholder="Describe qué necesitas para desbloquear tus tareas…" />
                  </Seccion>

                  {/* 5. Avances en proyectos */}
                  <Seccion n={5} icon="📁" titulo="Avances en proyectos"
                    hint="Proyectos del área dentro del módulo de Proyectos.">
                    <ListaProyectos proyectos={data.proyectos} />
                  </Seccion>

                  {/* 6. Comentarios finales */}
                  <Seccion n={6} icon="💬" titulo="Comentarios finales" hint="Opcional">
                    <CampoTexto value={comentarios} onChange={marcar(setComentarios)} editable={editable} rows={2}
                      placeholder="Comentarios adicionales (opcional)…" />
                  </Seccion>
                </>
              )}

              {/* ── Estructura pre-producción ── */}
              {tipo === "PREPRODUCCION" && (
                <>
                  {/* 3. Mejoras de la semana pasada */}
                  <Seccion n={3} icon="📈" titulo="Mejoras respecto a la semana pasada"
                    hint="Qué pudimos mejorar de la operación la semana pasada.">
                    <CampoTexto value={extra.mejoras} onChange={(v) => setExtraCampo("mejoras", v)} editable={editable} rows={3}
                      placeholder="Describe las mejoras logradas en la operación…" />
                  </Seccion>

                  {/* 4. Solicitudes */}
                  <Seccion n={4} icon="📮" titulo="Solicitudes"
                    hint="Herramientas, recurso humano y presupuesto que se necesitan.">
                    <div className="space-y-3">
                      <SubCampo label="Herramientas" value={extra.solicitudesHerramientas}
                        onChange={(v) => setExtraCampo("solicitudesHerramientas", v)} editable={editable}
                        placeholder="Herramientas o equipo requerido…" />
                      <SubCampo label="Recurso humano" value={extra.solicitudesRecursoHumano}
                        onChange={(v) => setExtraCampo("solicitudesRecursoHumano", v)} editable={editable}
                        placeholder="Personal técnico o apoyo requerido…" />
                      <SubCampo label="Presupuesto" value={extra.solicitudesPresupuesto}
                        onChange={(v) => setExtraCampo("solicitudesPresupuesto", v)} editable={editable}
                        placeholder="Presupuesto o gastos por autorizar…" />
                    </div>
                  </Seccion>

                  {/* 5. Incidencias operativas */}
                  <Seccion n={5} icon="⚠️" titulo="Incidencias operativas"
                    hint="Situaciones frente a la operación con intención de mejorar.">
                    <div className="space-y-3">
                      <SubCampo label="Fallas en el transporte" value={extra.fallasTransporte}
                        onChange={(v) => setExtraCampo("fallasTransporte", v)} editable={editable}
                        placeholder="Fallas o incidencias de transporte…" />
                      <SubCampo label="Incidencias de personal técnico" value={extra.incidenciasPersonal}
                        onChange={(v) => setExtraCampo("incidenciasPersonal", v)} editable={editable}
                        placeholder="Incidencias con el personal técnico…" />
                      <SubCampo label="Situaciones generales" value={extra.situacionesGenerales}
                        onChange={(v) => setExtraCampo("situacionesGenerales", v)} editable={editable}
                        placeholder="Situaciones generales frente a la operación…" />
                    </div>
                  </Seccion>

                  {/* 6. Próximos eventos y proyectos */}
                  <Seccion n={6} icon="📁" titulo="Próximos eventos y proyectos a trabajar"
                    hint="Proyectos y avances relacionados a la operación.">
                    <ListaProyectos proyectos={data.proyectos} />
                  </Seccion>

                  {/* 7. Comentarios finales */}
                  <Seccion n={7} icon="💬" titulo="Comentarios finales" hint="Opcional">
                    <CampoTexto value={comentarios} onChange={marcar(setComentarios)} editable={editable} rows={2}
                      placeholder="Comentarios adicionales (opcional)…" />
                  </Seccion>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer de guardado */}
      {data && editable && (
        <div className="shrink-0 border-t border-white/[0.06] bg-[#0a0a0a]/95 backdrop-blur px-4 sm:px-6 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <p className="text-[11px] text-[#555] truncate">
              {error ? <span className="text-red-400">{error}</span>
                : data.documento.actualizadoEn
                  ? `Última actualización ${new Date(data.documento.actualizadoEn).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}${data.documento.autor ? ` · ${data.documento.autor.name}` : ""}`
                  : "Sin guardar aún"}
            </p>
            <button onClick={guardar} disabled={saving || !dirty}
              className={`shrink-0 text-[13px] px-4 py-1.5 rounded-lg font-semibold transition-all ${
                dirty && !saving ? "bg-[#B3985B] hover:bg-[#c9a96a] text-black" : "bg-[#161616] text-[#555] cursor-not-allowed"
              }`}>
              {saving ? "Guardando…" : dirty ? "Guardar" : "Guardado"}
            </button>
          </div>
        </div>
      )}

      {/* Modal de edición de descripción de tarea */}
      {tareaSel && (
        <TareaEditModal
          tarea={tareaSel} editable={editable}
          onClose={() => setTareaSel(null)}
          onSave={(patch) => { saveTarea(tareaSel.id, patch); setTareaSel(null); }}
        />
      )}
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────
function SubCampo({
  label, value, onChange, placeholder, editable,
}: { label: string; value: string; onChange: (v: string) => void; placeholder: string; editable: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-[#888] uppercase tracking-wide mb-1">{label}</p>
      <CampoTexto value={value} onChange={onChange} placeholder={placeholder} editable={editable} rows={2} />
    </div>
  );
}

function ListaTareas({
  tareas, usuarios, editable, onSelect, onComplete, onDelete, onDateChange, onPriorityChange, onAssign,
}: {
  tareas: TareaItem[];
  usuarios: Usuario[];
  editable: boolean;
  onSelect: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onDateChange: (id: string, value: string) => void;
  onPriorityChange: (id: string, prioridad: string) => void;
  onAssign: (id: string, userId: string | null) => void;
}) {
  if (tareas.length === 0) {
    return <p className="text-[13px] text-[#555] px-1 py-2">Sin tareas asignadas con fecha en esta área.</p>;
  }
  const noop = () => {};
  return (
    <div>
      <div className="max-h-[480px] overflow-y-auto rounded-xl bg-[#0c0c0c] border border-[#161616] p-1">
        {tareas.map((t) => (
          <TaskItem
            key={t.id} tarea={t} isSelected={false} showProject
            onSelect={onSelect}
            onComplete={editable ? onComplete : noop}
            onDelete={editable ? onDelete : noop}
            onDateChange={editable ? onDateChange : undefined}
            onPriorityChange={editable ? onPriorityChange : undefined}
            onAssign={editable ? onAssign : undefined}
            users={usuarios}
          />
        ))}
      </div>
      <p className="text-[11px] text-[#555] mt-2 px-1">{tareas.length} tarea{tareas.length !== 1 ? "s" : ""} · toca una para editar su descripción</p>
    </div>
  );
}

function TareaEditModal({
  tarea, editable, onClose, onSave,
}: {
  tarea: TareaItem;
  editable: boolean;
  onClose: () => void;
  onSave: (patch: { titulo: string; descripcion: string }) => void;
}) {
  const [titulo, setTitulo] = useState(tarea.titulo);
  const [descripcion, setDescripcion] = useState(tarea.descripcion ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-[#0d0d0d] border border-[#222] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-white text-[15px] font-semibold">Editar tarea</h3>
          <button onClick={onClose} className="text-[#666] hover:text-white text-lg leading-none">✕</button>
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#888] uppercase tracking-wide mb-1">Título</p>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            readOnly={!editable}
            className="w-full rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] px-3.5 py-2.5 text-[14px] text-[#e4e4e4] focus:outline-none focus:border-[#B3985B]/40"
          />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#888] uppercase tracking-wide mb-1">Descripción</p>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            readOnly={!editable}
            rows={5}
            placeholder="Descripción de la tarea…"
            className="w-full rounded-xl bg-[#0c0c0c] border border-[#1a1a1a] px-3.5 py-2.5 text-[14px] text-[#d6d6d6] placeholder:text-[#3f3f3f] leading-relaxed resize-y focus:outline-none focus:border-[#B3985B]/40"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="text-[13px] px-3.5 py-1.5 rounded-lg text-[#888] hover:text-white border border-[#222] hover:border-[#333] transition-colors">
            Cancelar
          </button>
          {editable && (
            <button onClick={() => onSave({ titulo: titulo.trim() || tarea.titulo, descripcion })}
              className="text-[13px] px-4 py-1.5 rounded-lg font-semibold bg-[#B3985B] hover:bg-[#c9a96a] text-black transition-colors">
              Guardar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ListaProyectos({ proyectos }: { proyectos: VisionProyecto[] }) {
  if (proyectos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#1e1e1e] px-3.5 py-5 text-center">
        <p className="text-[13px] text-[#555]">Aún no hay proyectos en esta área.</p>
        <p className="text-[11px] text-[#3f3f3f] mt-0.5">Aparecerán aquí automáticamente al crearlos en el módulo de Proyectos.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {proyectos.map((p) => {
        const est = ESTADO_PROY[p.estado] ?? ESTADO_PROY.PLANIFICACION;
        return (
          <div key={p.id} className="rounded-xl bg-[#0c0c0c] border border-[#161616] p-3">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${est.cls}`}>{est.label}</span>
              <p className="text-[14px] font-medium text-white/85 leading-snug flex-1 min-w-0">{p.nombre}</p>
            </div>
            <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden mb-1.5">
              <div className="h-full bg-[#B3985B]" style={{ width: `${p.porcentajeAvance}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#666]">
              <span>{p.porcentajeAvance}% · {p.fasesCompletadas}/{p.totalFases} fases</span>
              <span className="flex items-center gap-2">
                {p.fechaFin && <span>📅 {fmtFecha(p.fechaFin)}</span>}
                {p.lider && (
                  <span className="w-[16px] h-[16px] rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 text-[9px] text-[#B3985B] flex items-center justify-center font-bold">
                    {p.lider.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
