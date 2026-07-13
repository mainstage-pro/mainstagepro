"use client";

import { useCallback, useEffect, useState } from "react";

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
interface VisionTarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  estado: string;
  fecha: string | null;
  fechaVencimiento: string | null;
  asignadoA: { id: string; name: string } | null;
  vencida: boolean;
}
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
    actualizadoEn: string | null;
  };
  tareas: VisionTarea[];
  proyectos: VisionProyecto[];
}

// ─── Metadatos de áreas ──────────────────────────────────────────────────────
const AREA_META: Record<string, { label: string; dot: string; chip: string }> = {
  ADMINISTRACION: { label: "Administración", dot: "#60a5fa", chip: "bg-blue-900/30 text-blue-400" },
  MARKETING:      { label: "Marketing",      dot: "#f472b6", chip: "bg-pink-900/30 text-pink-400" },
  VENTAS:         { label: "Comercial",      dot: "#4ade80", chip: "bg-green-900/30 text-green-400" },
  PRODUCCION:     { label: "Producción",     dot: "#facc15", chip: "bg-yellow-900/30 text-yellow-400" },
  PREPRODUCCION:  { label: "Pre producción", dot: "#B3985B", chip: "bg-[#B3985B]/15 text-[#B3985B]" },
};

const PRIO_META: Record<string, { label: string; cls: string }> = {
  URGENTE: { label: "Urgente", cls: "text-red-400 bg-red-950/40 border-red-500/30" },
  ALTA:    { label: "Alta",    cls: "text-orange-400 bg-orange-950/40 border-orange-500/25" },
  MEDIA:   { label: "Media",   cls: "text-[#B3985B] bg-[#B3985B]/10 border-[#B3985B]/25" },
  BAJA:    { label: "Baja",    cls: "text-[#888] bg-[#161616] border-[#2a2a2a]" },
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
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
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
}: { areas: string[]; areaInicial: string; userArea: string | null; isAdmin: boolean }) {
  const [area, setArea] = useState(areaInicial);
  const [semana, setSemana] = useState(lunesDeHoy());
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
  const [extra, setExtra] = useState<PreExtra>({
    mejoras: "", solicitudesHerramientas: "", solicitudesRecursoHumano: "",
    solicitudesPresupuesto: "", fallasTransporte: "", incidenciasPersonal: "", situacionesGenerales: "",
  });

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
      setExtra(d.documento.extra);
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

  async function guardar() {
    if (!editable) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/vision-semanal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, semana, enfoque, entregaInfo, desbloqueo, comentarios, extra }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "No se pudo guardar");
      }
      const j = await r.json();
      setDirty(false);
      setData((prev) => prev ? { ...prev, nuevo: false, documento: { ...prev.documento, autor: j.documento.autor, actualizadoEn: j.documento.actualizadoEn } } : prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const esSemanaActual = semana === lunesDeHoy();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-white text-xl font-semibold tracking-tight">Visión semanal</h1>
            <p className="text-[12px] text-[#666] mt-0.5 max-w-2xl leading-snug">
              Guía para la junta de inicio de semana. Cada responsable prepara aquí dónde está su área,
              qué viene y qué necesita de apoyo.
            </p>
          </div>
          {/* Selector de semana */}
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
                    hint="Tareas del área asignadas y con fecha vencida, actual o de esta semana.">
                    <ListaTareas tareas={data.tareas} />
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

function ListaTareas({ tareas }: { tareas: VisionTarea[] }) {
  if (tareas.length === 0) {
    return <p className="text-[13px] text-[#555] px-1 py-2">Sin tareas pendientes con fecha para esta semana.</p>;
  }
  return (
    <div className="rounded-xl bg-[#0c0c0c] border border-[#161616] divide-y divide-[#131313]">
      {tareas.map((t) => {
        const prio = PRIO_META[t.prioridad] ?? PRIO_META.MEDIA;
        const fecha = t.fechaVencimiento ?? t.fecha;
        return (
          <div key={t.id} className="flex items-start gap-3 px-3 py-2.5">
            <span className={`mt-1 w-[15px] h-[15px] shrink-0 rounded-full border-2 ${
              t.prioridad === "URGENTE" ? "border-red-500 bg-red-500/20"
              : t.prioridad === "ALTA" ? "border-orange-500 bg-orange-500/15"
              : "border-[#B3985B] bg-[#B3985B]/10"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] leading-snug text-[#d4d4d4]">{t.titulo}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${prio.cls}`}>{prio.label}</span>
                {fecha && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${t.vencida ? "text-red-400 bg-red-950/30" : "text-emerald-400 bg-emerald-950/30"}`}>
                    {t.vencida ? "Vencía " : ""}{fmtFecha(fecha)}
                  </span>
                )}
                {t.estado === "EN_PROGRESO" && <span className="text-[10px] text-blue-400 bg-blue-950/30 px-1.5 py-0.5 rounded-md">En progreso</span>}
                {t.asignadoA && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#777]">
                    <span className="w-[16px] h-[16px] rounded-full bg-[#B3985B]/20 border border-[#B3985B]/30 text-[9px] text-[#B3985B] flex items-center justify-center font-bold">
                      {t.asignadoA.name.charAt(0).toUpperCase()}
                    </span>
                    {t.asignadoA.name.split(" ")[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
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
