"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { SkeletonCards } from "@/components/Skeleton";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";
import { AREA_ORDEN, areaLabel } from "@/lib/areas";

interface Postulacion {
  id: string; etapa: string; puestoManual?: string | null; areaManual?: string | null;
  salarioPropuesto?: number | null; fechaIngresoEstimada?: string | null;
  propuestaFechaEnvio?: string | null; propuestaAceptada?: boolean | null;
  contratoGenerado: boolean;
  origen?: string | null;
  disciplina?: string | null;
  nivel?: string | null;
  puntajeTotal?: number | null;
  puesto?: { nombre: string; area: string } | null;
  formularioRespuesta?: {
    id: string;
    banda: string | null;
    porcentajePreliminar: number | null;
    porcentajeFinal: number | null;
    nivelSugerido: string | null;
    respuestasPreguntas?: { calificacionManual: number | null; pregunta?: { tipo: string } }[];
  } | null;
}
interface Candidato {
  id: string; nombre: string; correo?: string | null; telefono?: string | null;
  ciudad?: string | null; carrera?: string | null; salarioEsperado?: number | null;
  createdAt: string;
  postulaciones: Postulacion[];
}

const ETAPAS = ["NUEVO","EVALUACION","PRUEBA_PRACTICA","PROPUESTA_ENVIADA","APROBADO","CONTRATADO","RECHAZADO"] as const;
const ETAPA_LABELS: Record<string,string> = {
  NUEVO:"Nuevo", EVALUACION:"Evaluación", PRUEBA_PRACTICA:"Prueba práctica",
  PROPUESTA_ENVIADA:"Propuesta enviada",
  APROBADO:"Aprobado", CONTRATADO:"Contratado", RECHAZADO:"Rechazado",
};
const ETAPA_COLORS: Record<string,string> = {
  NUEVO: "bg-gray-800 text-gray-300",
  EVALUACION: "bg-blue-900/40 text-blue-300",
  PRUEBA_PRACTICA: "bg-purple-900/40 text-purple-300",
  PROPUESTA_ENVIADA: "bg-yellow-900/30 text-yellow-300",
  APROBADO: "bg-green-900/30 text-green-300",
  CONTRATADO: "bg-[#B3985B]/20 text-[#B3985B]",
  RECHAZADO: "bg-red-900/30 text-red-300",
};
const ETAPA_BORDER: Record<string,string> = {
  NUEVO: "border-gray-700", EVALUACION: "border-blue-800",
  PRUEBA_PRACTICA: "border-purple-800",
  PROPUESTA_ENVIADA: "border-yellow-800", APROBADO: "border-green-800",
  CONTRATADO: "border-[#B3985B]/40", RECHAZADO: "border-red-900",
};
const BANDA_LABEL: Record<string,string> = {
  AVANZA: "Avanza",
  BANCO: "Banco",
  DESCARTAR: "Descartar",
};
const BANDA_COLOR: Record<string,string> = {
  AVANZA: "text-green-400",
  BANCO: "text-yellow-400",
  DESCARTAR: "text-red-400",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n);
}

export default function CandidatosPage() {
  const router = useRouter();
  const toast = useToast();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban"|"lista">("kanban");
  const [showNew, setShowNew] = useState(false);
  // Puestos operativos reales (módulo "Puestos"), fuente del selector de postulación.
  const [puestos, setPuestos] = useState<{
    id: string; nombre: string; area: string; activo?: boolean;
    ocupantes?: { id: string; nombre: string }[];
  }[]>([]);
  const [form, setForm] = useState({
    nombre:"", correo:"", telefono:"", ciudad:"",
    puestoOpId:"", puestoManual:"", areaManual:"",
  });
  const [saving, setSaving] = useState(false);
  // Filtros (spec 6.D)
  const [fPuesto, setFPuesto] = useState("");
  const [fDisciplina, setFDisciplina] = useState("");
  const [fNivel, setFNivel] = useState("");
  const [fBanda, setFBanda] = useState("");
  const [fEtapa, setFEtapa] = useState("");

  async function load() {
    const [rc, rp] = await Promise.all([
      fetch("/api/rrhh/candidatos"),
      fetch("/api/rrhh/puestos-operativos"),
    ]);
    const dc = await rc.json();
    const dp = await rp.json();
    setCandidatos(dc.candidatos ?? []);
    setPuestos(dp.puestos ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function crear() {
    setSaving(true);
    // Vincula la postulación al puesto operativo elegido y conserva su nombre/área para mostrar.
    const sel = puestos.find(p => p.id === form.puestoOpId);
    const payload = {
      nombre: form.nombre, correo: form.correo, telefono: form.telefono, ciudad: form.ciudad,
      puestoId: sel?.id || "",
      puestoManual: sel ? sel.nombre : form.puestoManual,
      areaManual: sel ? sel.area : form.areaManual,
    };
    const r = await fetch("/api/rrhh/candidatos", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) { toast.error(d.error ?? "Error al crear candidato"); return; }
    setShowNew(false);
    if (d.candidato?.id) router.push(`/organizacion/candidatos/${d.candidato.id}`);
  }

  async function eliminar(c: Candidato, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!confirm(`¿Eliminar a ${c.nombre}? Se borrarán sus postulaciones. Esta acción no se puede deshacer.`)) return;
    const r = await fetch(`/api/rrhh/candidatos/${c.id}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json().catch(() => ({})); toast.error(d.error ?? "Error al eliminar"); return; }
    toast.success("Candidato eliminado");
    load();
  }

  const inputCls = "w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] placeholder-gray-600";

  // Pipeline columns — exclude RECHAZADO from kanban
  const kanbanEtapas = ETAPAS.filter(e => e !== "RECHAZADO");

  function getPuestoLabel(post: Postulacion) {
    return post.puesto?.nombre ?? post.puestoManual ?? "Sin puesto definido";
  }

  function getEtapa(c: Candidato) {
    return c.postulaciones[0]?.etapa ?? "NUEVO";
  }

  function getBanda(p?: Postulacion): string | null {
    return p?.formularioRespuesta?.banda ?? null;
  }
  function getPuntaje(p?: Postulacion): number | null {
    const r = p?.formularioRespuesta;
    if (!r) return p?.puntajeTotal ?? null;
    return r.porcentajeFinal ?? r.porcentajePreliminar ?? null;
  }
  function getMPendientes(p?: Postulacion): number {
    const rps = p?.formularioRespuesta?.respuestasPreguntas ?? [];
    return rps.filter((rp) => rp.pregunta?.tipo === "parrafo" && rp.calificacionManual == null).length;
  }

  // Filtro general
  const candidatosFiltrados = useMemo(() => {
    return candidatos.filter(c => {
      const p = c.postulaciones[0];
      if (fEtapa && getEtapa(c) !== fEtapa) return false;
      if (fPuesto && (p?.puesto?.nombre ?? p?.puestoManual ?? "") !== fPuesto) return false;
      if (fDisciplina && (p?.disciplina ?? "") !== fDisciplina) return false;
      if (fNivel && (p?.nivel ?? "") !== fNivel) return false;
      if (fBanda && getBanda(p) !== fBanda) return false;
      return true;
    });
  }, [candidatos, fEtapa, fPuesto, fDisciplina, fNivel, fBanda]);

  const opcionesFiltro = useMemo(() => {
    const puestos = new Set<string>();
    const disciplinas = new Set<string>();
    const niveles = new Set<string>();
    for (const c of candidatos) {
      const p = c.postulaciones[0];
      const pn = p?.puesto?.nombre ?? p?.puestoManual;
      if (pn) puestos.add(pn);
      if (p?.disciplina) disciplinas.add(p.disciplina);
      if (p?.nivel) niveles.add(p.nivel);
    }
    return {
      puestos: Array.from(puestos).sort(),
      disciplinas: Array.from(disciplinas).sort(),
      niveles: Array.from(niveles).sort(),
    };
  }, [candidatos]);

  // Opciones del selector: puestos sin titular primero, luego por orden de área y nombre.
  const puestoOptions = useMemo(() => {
    const ordArea = (a: string) => { const i = AREA_ORDEN.indexOf(a); return i === -1 ? 99 : i; };
    return [...puestos]
      .filter(p => p.activo !== false)
      .sort((a, b) => {
        const av = (a.ocupantes?.length ?? 0) === 0 ? 0 : 1;
        const bv = (b.ocupantes?.length ?? 0) === 0 ? 0 : 1;
        if (av !== bv) return av - bv;
        const ao = ordArea(a.area), bo = ordArea(b.area);
        if (ao !== bo) return ao - bo;
        return a.nombre.localeCompare(b.nombre);
      })
      .map(p => {
        const estado = (p.ocupantes?.length ?? 0) === 0 ? "sin titular" : (p.ocupantes?.[0]?.nombre ?? "ocupado");
        return { value: p.id, label: `${p.nombre} · ${areaLabel(p.area)} · ${estado}` };
      });
  }, [puestos]);

  return (
    <div className="ms-page space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Candidatos</h1>
          <p className="ms-subtitle">{candidatos.length} registros · Pipeline de contratación</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle view */}
          <div className="flex border border-[#222] rounded-lg overflow-hidden">
            <button onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "kanban" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-white"}`}>
              Tablero
            </button>
            <button onClick={() => setView("lista")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "lista" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-white"}`}>
              Lista
            </button>
          </div>
          <button onClick={() => setShowNew(true)}
            className="ms-btn-primary">
            + Nuevo candidato
          </button>
        </div>
      </div>

      {/* Filtros */}
      {!loading && (
        <div className="flex flex-wrap gap-2 items-center text-xs">
          <select value={fPuesto} onChange={e => setFPuesto(e.target.value)} className="bg-[#0d0d0d] border border-[#222] text-gray-300 rounded px-2 py-1">
            <option value="">Puesto · todos</option>
            {opcionesFiltro.puestos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={fDisciplina} onChange={e => setFDisciplina(e.target.value)} className="bg-[#0d0d0d] border border-[#222] text-gray-300 rounded px-2 py-1">
            <option value="">Disciplina · todas</option>
            {opcionesFiltro.disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={fNivel} onChange={e => setFNivel(e.target.value)} className="bg-[#0d0d0d] border border-[#222] text-gray-300 rounded px-2 py-1">
            <option value="">Nivel · todos</option>
            {opcionesFiltro.niveles.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={fBanda} onChange={e => setFBanda(e.target.value)} className="bg-[#0d0d0d] border border-[#222] text-gray-300 rounded px-2 py-1">
            <option value="">Banda · todas</option>
            <option value="AVANZA">Avanza</option>
            <option value="BANCO">Banco</option>
            <option value="DESCARTAR">Descartar</option>
          </select>
          <select value={fEtapa} onChange={e => setFEtapa(e.target.value)} className="bg-[#0d0d0d] border border-[#222] text-gray-300 rounded px-2 py-1">
            <option value="">Etapa · todas</option>
            {ETAPAS.map(e => <option key={e} value={e}>{ETAPA_LABELS[e]}</option>)}
          </select>
          {(fPuesto || fDisciplina || fNivel || fBanda || fEtapa) && (
            <button onClick={() => { setFPuesto(""); setFDisciplina(""); setFNivel(""); setFBanda(""); setFEtapa(""); }}
              className="text-gray-500 hover:text-white underline">Limpiar</button>
          )}
          <span className="ml-auto text-gray-500">{candidatosFiltrados.length} / {candidatos.length}</span>
        </div>
      )}

      {loading ? (
        <SkeletonCards count={6} />
      ) : view === "kanban" ? (
        /* ── Kanban ── */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanEtapas.map(etapa => {
            const cols = candidatosFiltrados.filter(c => getEtapa(c) === etapa);
            return (
              <div key={etapa} className="shrink-0 w-72">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ETAPA_COLORS[etapa]}`}>
                    {ETAPA_LABELS[etapa]}
                  </span>
                  <span className="text-gray-600 text-xs">{cols.length}</span>
                </div>
                <div className="space-y-2">
                  {cols.map(c => {
                    const post = c.postulaciones[0];
                    const pts = getPuntaje(post);
                    const banda = getBanda(post);
                    const mPend = getMPendientes(post);
                    const disc = [post?.disciplina, post?.nivel].filter(Boolean).join(" · ");
                    return (
                      <Link key={c.id} href={`/organizacion/candidatos/${c.id}`}
                        className={`block bg-[#111] border rounded-xl p-4 hover:border-[#333] transition-all ${ETAPA_BORDER[etapa]}`}>
                        <p className="text-white text-sm font-medium">{c.nombre}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{getPuestoLabel(post)}</p>
                        {disc && <p className="text-gray-600 text-[11px] mt-0.5">{disc}</p>}
                        {c.ciudad && <p className="text-gray-600 text-xs mt-1">{c.ciudad}</p>}
                        {(pts != null || banda) && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {pts != null && <span className="text-xs text-white">{pts}%</span>}
                            {banda && <span className={`text-[10px] ${BANDA_COLOR[banda]}`}>{BANDA_LABEL[banda]}</span>}
                            {mPend > 0 && (
                              <span className="text-[10px] text-yellow-400">· {mPend} por calificar</span>
                            )}
                          </div>
                        )}
                        {c.salarioEsperado && (
                          <p className="text-[#B3985B] text-xs mt-1">{fmt(c.salarioEsperado)} esperado</p>
                        )}
                      </Link>
                    );
                  })}
                  {cols.length === 0 && (
                    <div className="border border-dashed border-[#1e1e1e] rounded-xl p-4 text-center text-gray-700 text-xs">Sin candidatos</div>
                  )}
                </div>
              </div>
            );
          })}
          {/* Rechazados mini */}
          <div className="shrink-0 w-56">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ETAPA_COLORS.RECHAZADO}`}>Rechazados</span>
              <span className="text-gray-600 text-xs">{candidatosFiltrados.filter(c => getEtapa(c) === "RECHAZADO").length}</span>
            </div>
            <div className="space-y-2 opacity-50">
              {candidatosFiltrados.filter(c => getEtapa(c) === "RECHAZADO").map(c => (
                <Link key={c.id} href={`/organizacion/candidatos/${c.id}`}
                  className="block bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3 hover:border-[#222] transition-all">
                  <p className="text-gray-400 text-xs font-medium">{c.nombre}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Lista ── */
        <div className="ms-card overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="ms-thead">
              <tr>
                {["Candidato","Puesto","Ciudad","Salario esperado","Etapa",""].map(h => (
                  <th key={h} className="ms-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidatosFiltrados.map(c => {
                const post = c.postulaciones[0];
                const etapa = getEtapa(c);
                return (
                  <tr key={c.id} className="ms-tr last:border-0">
                    <td className="ms-td">
                      <p className="text-white font-medium">{c.nombre}</p>
                      {c.correo && <p className="text-gray-600 text-xs">{c.correo}</p>}
                    </td>
                    <td className="ms-td text-gray-400 text-xs">{getPuestoLabel(post)}</td>
                    <td className="ms-td text-gray-500 text-xs">{c.ciudad ?? "—"}</td>
                    <td className="ms-td text-[#B3985B] text-xs">{c.salarioEsperado ? fmt(c.salarioEsperado) : "—"}</td>
                    <td className="ms-td">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ETAPA_COLORS[etapa]}`}>
                        {ETAPA_LABELS[etapa]}
                      </span>
                    </td>
                    <td className="ms-td">
                      <div className="flex items-center gap-3 justify-end">
                        <Link href={`/organizacion/candidatos/${c.id}`} className="text-xs text-[#B3985B] hover:underline">Ver →</Link>
                        <button onClick={e => eliminar(c, e)} className="text-xs text-red-500 hover:text-red-400 transition-colors">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {candidatos.length === 0 && (
            <div className="py-16 text-center text-gray-600 text-sm">Sin candidatos registrados</div>
          )}
        </div>
      )}

      {/* Modal nuevo candidato */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nuevo candidato" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre completo *</label>
            <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} className={inputCls} placeholder="Juan García" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={e=>setForm(p=>({...p,telefono:e.target.value}))} className={inputCls} placeholder="55 1234 5678" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ciudad</label>
              <input value={form.ciudad} onChange={e=>setForm(p=>({...p,ciudad:e.target.value}))} className={inputCls} placeholder="Querétaro" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Correo</label>
            <input value={form.correo} onChange={e=>setForm(p=>({...p,correo:e.target.value}))} className={inputCls} placeholder="correo@ejemplo.com" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Puesto al que aplica</label>
            <Combobox
              value={form.puestoOpId}
              onChange={v => setForm(p => ({ ...p, puestoOpId: v }))}
              options={[{ value: "", label: "— Seleccionar puesto —" }, ...puestoOptions]}
              placeholder="Buscar puesto…"
              className={inputCls}
            />
            <p className="text-[10px] text-gray-600 mt-1">Las vacantes sin titular aparecen primero. También puedes postular a un puesto ya ocupado.</p>
          </div>
          {!form.puestoOpId && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Puesto (manual)</label>
                <input value={form.puestoManual} onChange={e=>setForm(p=>({...p,puestoManual:e.target.value}))} className={inputCls} placeholder="Ej: Coordinador" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Área</label>
                <input value={form.areaManual} onChange={e=>setForm(p=>({...p,areaManual:e.target.value}))} className={inputCls} placeholder="Ej: PRODUCCION" />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowNew(false)} className="text-gray-500 hover:text-white text-sm px-4 py-2 transition-colors">Cancelar</button>
            <button onClick={crear} disabled={saving || !form.nombre}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-6 py-2 rounded-lg transition-colors">
              {saving ? "Creando..." : "Crear y abrir →"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
