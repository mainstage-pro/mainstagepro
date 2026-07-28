"use client";
import { useEffect, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { LayoutList, LayoutGrid, FileText, UserCheck, UserX, Link2 } from "lucide-react";

interface Ocupante { id: string; nombre: string; userId?: string | null }
interface Estandar { subarea: string; responsabilidad: string; estandar: string }
interface Puesto {
  id: string; nombre: string; area: string;
  objetivoArea?: string | null; misionPuesto?: string | null;
  responsabilidades?: string | null;
  reportaAId?: string | null; reportaA?: { id: string; nombre: string } | null;
  coordinaCon?: string | null; supervisaA?: string | null;
  estandares?: string | null;
  funciones?: string | null; prestaciones?: string | null;
  tipoContrato?: string | null; modalidad?: string | null; horario?: string | null;
  color?: string | null; activo: boolean;
  ocupantes?: Ocupante[];
}
interface PersonaLite { id: string; nombre: string; puesto: string; activo: boolean }

// Áreas canónicas (código estable) en el orden estándar de la empresa.
const AREAS = ["DIRECCION","ADMINISTRACION","MARKETING","VENTAS","PRODUCCION"];
const AREA_LABELS: Record<string,string> = {
  DIRECCION: "Dirección",
  ADMINISTRACION: "Administración",
  MARKETING: "Marketing",
  VENTAS: "Comercial",
  PRODUCCION: "Producción",
};
// Color por área (unificado con organigrama / maestro de áreas)
const AREA_HEX: Record<string,string> = {
  DIRECCION: "#B3985B",
  ADMINISTRACION: "#a855f7",
  MARKETING: "#eab308",
  VENTAS: "#22c55e",
  PRODUCCION: "#3b82f6",
};
// RRHH y GENERAL (legado) se pliegan a Administración
function normArea(a: string): string {
  return a === "RRHH" || a === "GENERAL" ? "ADMINISTRACION" : a;
}

function parseArr(s?: string | null): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return s.split(",").map(x=>x.trim()).filter(Boolean); }
}
function parseEst(s?: string | null): Estandar[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}
function toArr(s: string) {
  return s.split(/\n/).map(x=>x.trim()).filter(Boolean);
}

const EMPTY_FORM = {
  nombre:"", area:"ADMINISTRACION", color:"",
  objetivoArea:"", misionPuesto:"",
  responsabilidades:"", coordinaCon:"", supervisaA:"",
  reportaAId:"",
  funciones:"", prestaciones:"", tipoContrato:"", modalidad:"", horario:"",
};
type FormState = typeof EMPTY_FORM;

export default function PuestosOperativosPage() {
  const toast = useToast();
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [personal, setPersonal] = useState<PersonaLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Puesto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [estandares, setEstandares] = useState<Estandar[]>([]);
  const [ocupantesIds, setOcupantesIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [selected, setSelected] = useState<Puesto | null>(null);
  const [filterArea, setFilterArea] = useState("TODOS");
  const [vista, setVista] = useState<"lista" | "grid">("lista");
  const [genPdf, setGenPdf] = useState<string | null>(null);
  const [genLink, setGenLink] = useState<string | null>(null);

  async function load() {
    const [rp, rper] = await Promise.all([
      fetch("/api/rrhh/puestos-operativos", { cache: "no-store" }),
      fetch("/api/rrhh/personal", { cache: "no-store" }),
    ]);
    const [dp, dper] = await Promise.all([rp.json(), rper.json()]);
    setPuestos(dp.puestos ?? []);
    setPersonal((dper.personal ?? []).map((p: PersonaLite) => ({ id: p.id, nombre: p.nombre, puesto: p.puesto, activo: p.activo })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setEstandares([]);
    setOcupantesIds([]);
    setSaveError("");
    setShowForm(true);
  }
  function openEdit(p: Puesto) {
    setEditing(p);
    setForm({
      nombre: p.nombre, area: normArea(p.area), color: p.color ?? "",
      objetivoArea: p.objetivoArea ?? "", misionPuesto: p.misionPuesto ?? "",
      responsabilidades: parseArr(p.responsabilidades).join("\n"),
      coordinaCon: parseArr(p.coordinaCon).join("\n"),
      supervisaA: parseArr(p.supervisaA).join("\n"),
      reportaAId: p.reportaAId ?? "",
      funciones: parseArr(p.funciones).join("\n"),
      prestaciones: parseArr(p.prestaciones).join("\n"),
      tipoContrato: p.tipoContrato ?? "", modalidad: p.modalidad ?? "", horario: p.horario ?? "",
    });
    setEstandares(parseEst(p.estandares));
    setOcupantesIds((p.ocupantes ?? []).map(o => o.id));
    setSaveError("");
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      const body = {
        nombre: form.nombre, area: form.area, color: form.color || null,
        objetivoArea: form.objetivoArea || null,
        misionPuesto: form.misionPuesto || null,
        responsabilidades: toArr(form.responsabilidades),
        coordinaCon: toArr(form.coordinaCon),
        supervisaA: toArr(form.supervisaA),
        estandares: estandares.filter(e => e.subarea || e.responsabilidad || e.estandar),
        funciones: toArr(form.funciones),
        prestaciones: toArr(form.prestaciones),
        tipoContrato: form.tipoContrato || null,
        modalidad: form.modalidad || null,
        horario: form.horario || null,
        reportaAId: form.reportaAId || null,
        ocupantesIds,
      };
      const url = editing ? `/api/rrhh/puestos-operativos/${editing.id}` : "/api/rrhh/puestos-operativos";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveError(d.error ?? "Error al guardar");
        return;
      }
      await load();
      setShowForm(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(p: Puesto) {
    if (!confirm(`¿Eliminar el puesto "${p.nombre}"? Los titulares quedarán sin puesto asignado.`)) return;
    await fetch(`/api/rrhh/puestos-operativos/${p.id}`, { method: "DELETE" });
    setSelected(null);
    await load();
  }

  // Genera el acuerdo laboral en PDF para un titular y lo abre en una pestaña nueva.
  async function generarAcuerdo(personalId: string) {
    setGenPdf(personalId);
    try {
      const r = await fetch("/api/rrhh/documentos-laborales", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalId, tipo: "ACUERDO" }),
      });
      const d = await r.json();
      if (!r.ok || !d.doc?.id) { toast.error(d.error ?? "No se pudo generar el acuerdo"); return; }
      window.open(`/api/rrhh/documentos-laborales/${d.doc.id}/pdf`, "_blank");
    } catch { toast.error("Error de conexión"); }
    finally { setGenPdf(null); }
  }

  // Genera el acuerdo y copia el enlace público de firma de enterado.
  async function copiarEnlaceAcuerdo(personalId: string) {
    setGenLink(personalId);
    try {
      const r = await fetch("/api/rrhh/documentos-laborales", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalId, tipo: "ACUERDO" }),
      });
      const d = await r.json();
      if (!r.ok || !d.doc?.token) { toast.error(d.error ?? "No se pudo generar el enlace"); return; }
      const url = `${window.location.origin}/acuerdo/${d.doc.token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Enlace de firma copiado");
    } catch { toast.error("No se pudo copiar el enlace"); }
    finally { setGenLink(null); }
  }

  const f = (k: keyof FormState) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value })),
  });

  const inputCls = "w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] placeholder-gray-600";
  const labelCls = "block text-xs text-gray-500 mb-1";
  const areaTabs = ["TODOS", ...AREAS];
  const visible = puestos.filter(p => (filterArea === "TODOS" || normArea(p.area) === filterArea) && p.activo);

  // Agrupa por área en el orden canónico.
  const grupos = AREAS
    .map(code => ({ code, items: visible.filter(p => normArea(p.area) === code) }))
    .filter(g => g.items.length > 0);

  const totalAsignados = visible.filter(p => (p.ocupantes?.length ?? 0) > 0).length;
  const totalVacantes = visible.length - totalAsignados;

  // ── Detalle expandido (compartido entre lista y grid) ──
  function Detalle({ p }: { p: Puesto }) {
    const resp = parseArr(p.responsabilidades);
    const est = parseEst(p.estandares);
    return (
      <div className="mt-4 space-y-3 border-t border-[#1a1a1a] pt-4" onClick={e => e.stopPropagation()}>
        {p.misionPuesto && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Misión del puesto</p>
            <p className="text-xs text-gray-300">{p.misionPuesto}</p>
          </div>
        )}
        {resp.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Responsabilidades permanentes</p>
            <ul className="list-disc list-inside space-y-0.5">
              {resp.map((r, i) => <li key={i} className="text-xs text-gray-300">{r}</li>)}
            </ul>
          </div>
        )}
        {est.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Estándares</p>
            <div className="space-y-1">
              {est.map((e, i) => (
                <div key={i} className="text-xs text-gray-300 bg-[#0d0d0d] rounded px-2 py-1">
                  {e.subarea && <span className="text-[#B3985B]">{e.subarea}: </span>}
                  {e.responsabilidad} {e.estandar && <span className="text-gray-500">→ {e.estandar}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {(p.tipoContrato || p.modalidad || p.horario) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {p.tipoContrato && <span>Contrato: <span className="text-gray-300">{p.tipoContrato}</span></span>}
            {p.modalidad && <span>Modalidad: <span className="text-gray-300">{p.modalidad}</span></span>}
            {p.horario && <span>Horario: <span className="text-gray-300">{p.horario}</span></span>}
          </div>
        )}
        {/* Titulares + generación de acuerdo */}
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Titulares</p>
          {(p.ocupantes?.length ?? 0) === 0 ? (
            <p className="text-xs text-orange-400/80">Falta asignar el rol. Edita el puesto para nombrar un titular.</p>
          ) : (
            <div className="space-y-1.5">
              {p.ocupantes!.map(o => (
                <div key={o.id} className="flex items-center justify-between gap-2 bg-[#0d0d0d] rounded-lg px-2.5 py-1.5">
                  <span className="text-xs text-gray-200">{o.nombre}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => copiarEnlaceAcuerdo(o.id)} disabled={genLink === o.id}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#B3985B] border border-[#222] hover:border-[#B3985B]/50 px-2 py-0.5 rounded transition-colors disabled:opacity-50">
                      <Link2 className="w-3 h-3" /> {genLink === o.id ? "Generando…" : "Enlace de firma"}
                    </button>
                    <button onClick={() => generarAcuerdo(o.id)} disabled={genPdf === o.id}
                      className="flex items-center gap-1 text-[11px] text-[#B3985B] hover:text-[#c9a96a] border border-[#B3985B]/30 hover:border-[#B3985B] px-2 py-0.5 rounded transition-colors disabled:opacity-50">
                      <FileText className="w-3 h-3" /> {genPdf === o.id ? "Generando…" : "Acuerdo PDF"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={() => openEdit(p)} className="text-xs text-gray-400 hover:text-[#B3985B] transition-colors">Editar puesto</button>
          <button onClick={() => eliminar(p)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Eliminar</button>
        </div>
      </div>
    );
  }

  // ── Fila (vista lista) ──
  function Fila({ p }: { p: Puesto }) {
    const asignado = (p.ocupantes?.length ?? 0) > 0;
    const isOpen = selected?.id === p.id;
    return (
      <div className="border-b border-[#161616] last:border-0">
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#0f0f0f] transition-colors"
          onClick={() => setSelected(isOpen ? null : p)}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || AREA_HEX[normArea(p.area)] || "#6b7280" }} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
            {p.reportaA && <p className="text-[11px] text-gray-600 truncate">Reporta a: {p.reportaA.nombre}</p>}
          </div>
          {asignado ? (
            <span className="flex items-center gap-1 text-[11px] text-green-400 bg-green-900/20 border border-green-500/20 px-2 py-0.5 rounded-full shrink-0">
              <UserCheck className="w-3 h-3" />
              {p.ocupantes!.length === 1 ? p.ocupantes![0].nombre : `${p.ocupantes!.length} titulares`}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-orange-400 bg-orange-900/20 border border-orange-500/20 px-2 py-0.5 rounded-full shrink-0">
              <UserX className="w-3 h-3" /> Falta el rol
            </span>
          )}
        </div>
        {isOpen && <div className="px-4 pb-4">
          <Detalle p={p} />
        </div>}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Puestos</h1>
          <p className="ms-subtitle">Estructura operativa real: responsabilidades, estándares y titular por puesto</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle de vista */}
          <div className="flex rounded-lg border border-[#222] overflow-hidden">
            <button onClick={() => setVista("lista")}
              className={`p-2 transition-colors ${vista === "lista" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-white"}`} title="Vista de lista">
              <LayoutList className="w-4 h-4" />
            </button>
            <button onClick={() => setVista("grid")}
              className={`p-2 transition-colors ${vista === "grid" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-white"}`} title="Vista de cuadrícula">
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button onClick={openNew} className="ms-btn-primary">+ Nuevo puesto</button>
        </div>
      </div>

      {/* Resumen asignados / vacantes */}
      {!loading && visible.length > 0 && (
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-green-400"><UserCheck className="w-3.5 h-3.5" /> {totalAsignados} asignado{totalAsignados !== 1 ? "s" : ""}</span>
          <span className="flex items-center gap-1.5 text-orange-400"><UserX className="w-3.5 h-3.5" /> {totalVacantes} sin rol</span>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {areaTabs.map(a => (
          <button key={a} onClick={() => setFilterArea(a)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
              filterArea === a ? "bg-[#B3985B] text-black border-[#B3985B]" : "border-[#222] text-gray-500 hover:text-white"
            }`}>
            {a === "TODOS" ? "Todos" : AREA_LABELS[a] ?? a}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-gray-500">Sin puestos definidos</p>
          <p className="text-gray-700 text-xs mt-1">Define la estructura operativa de tu organización</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(g => (
            <div key={g.code}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: AREA_HEX[g.code] }} />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{AREA_LABELS[g.code]}</h2>
                <span className="text-xs text-gray-600">
                  {g.items.filter(p => (p.ocupantes?.length ?? 0) > 0).length}/{g.items.length} con titular
                </span>
              </div>

              {vista === "lista" ? (
                <div className="ms-card p-0 overflow-hidden">
                  {g.items.map(p => <Fila key={p.id} p={p} />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {g.items.map(p => {
                    const asignado = (p.ocupantes?.length ?? 0) > 0;
                    return (
                      <div key={p.id}
                        className="ms-stat-card hover:border-[#2a2a2a] cursor-pointer transition-all"
                        onClick={() => setSelected(p === selected ? null : p)}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-white font-semibold flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color || AREA_HEX[normArea(p.area)] || "#6b7280" }} />
                            <span className="truncate">{p.nombre}</span>
                          </p>
                        </div>
                        {asignado ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-green-400 bg-green-900/20 border border-green-500/20 px-2 py-0.5 rounded-full">
                            <UserCheck className="w-3 h-3" />
                            {p.ocupantes!.length === 1 ? p.ocupantes![0].nombre : `${p.ocupantes!.length} titulares`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-orange-400 bg-orange-900/20 border border-orange-500/20 px-2 py-0.5 rounded-full">
                            <UserX className="w-3 h-3" /> Falta el rol
                          </span>
                        )}
                        {p.reportaA && <p className="text-[11px] text-gray-600 mt-2">Reporta a: {p.reportaA.nombre}</p>}
                        {selected?.id === p.id && <Detalle p={p} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto">
          <div className="ms-card w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#111] border-b border-[#222] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-white font-semibold">{editing ? "Editar puesto" : "Nuevo puesto"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Identificación */}
              <div>
                <p className="text-xs text-[#B3985B] uppercase tracking-wider mb-3">Identificación</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelCls}>Nombre del puesto *</label>
                    <input {...f("nombre")} className={inputCls} placeholder="Ej: Coordinador de Producción" />
                  </div>
                  <div>
                    <label className={labelCls}>Área *</label>
                    <Combobox value={form.area} onChange={v => setForm(p => ({ ...p, area: v }))}
                      options={AREAS.map(a => ({ value: a, label: AREA_LABELS[a] ?? a }))} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className={labelCls}>Reporta a (puesto)</label>
                    <Combobox value={form.reportaAId} onChange={v => setForm(p => ({ ...p, reportaAId: v }))}
                      options={[{ value: "", label: "— Ninguno —" }, ...puestos.filter(x => x.id !== editing?.id).map(x => ({ value: x.id, label: x.nombre }))]}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Color (para organigrama)</label>
                    <input {...f("color")} type="text" className={inputCls} placeholder="#B3985B" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Objetivo del área</label>
                  <input {...f("objetivoArea")} className={inputCls} placeholder="Ej: Garantizar la operación técnica impecable de cada evento" />
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Misión del puesto</label>
                  <textarea {...f("misionPuesto")} rows={2} className={`${inputCls} resize-none`} placeholder="Para qué existe este puesto dentro de la organización" />
                </div>
              </div>

              {/* Responsabilidades */}
              <div>
                <p className="text-xs text-[#B3985B] uppercase tracking-wider mb-3">Responsabilidades permanentes (una por línea)</p>
                <textarea {...f("responsabilidades")} rows={5} className={`${inputCls} resize-none font-mono text-xs`}
                  placeholder={"Lo que SIEMPRE es responsable, sin importar el plan de trabajo\nEj:\nEntregar cada evento montado a tiempo\nMantener el inventario asignado en buen estado"} />
              </div>

              {/* Relaciones */}
              <div>
                <p className="text-xs text-[#B3985B] uppercase tracking-wider mb-3">Relaciones de trabajo (una por línea)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Coordina con</label>
                    <textarea {...f("coordinaCon")} rows={3} className={`${inputCls} resize-none font-mono text-xs`} placeholder={"Ventas\nAlmacén"} />
                  </div>
                  <div>
                    <label className={labelCls}>Supervisa a</label>
                    <textarea {...f("supervisaA")} rows={3} className={`${inputCls} resize-none font-mono text-xs`} placeholder={"Auxiliar de montaje\nFreelancers de evento"} />
                  </div>
                </div>
              </div>

              {/* Estándares */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-[#B3985B] uppercase tracking-wider">Estándares (cómo se mide bien hecho)</p>
                  <button onClick={() => setEstandares(e => [...e, { subarea:"", responsabilidad:"", estandar:"" }])}
                    className="text-xs text-gray-500 hover:text-[#B3985B]">+ Agregar</button>
                </div>
                <div className="space-y-2">
                  {estandares.map((e, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start">
                      <input value={e.subarea} onChange={ev => setEstandares(arr => arr.map((x,ix)=>ix===i?{...x,subarea:ev.target.value}:x))}
                        className={`${inputCls} col-span-3`} placeholder="Subárea" />
                      <input value={e.responsabilidad} onChange={ev => setEstandares(arr => arr.map((x,ix)=>ix===i?{...x,responsabilidad:ev.target.value}:x))}
                        className={`${inputCls} col-span-4`} placeholder="Responsabilidad" />
                      <input value={e.estandar} onChange={ev => setEstandares(arr => arr.map((x,ix)=>ix===i?{...x,estandar:ev.target.value}:x))}
                        className={`${inputCls} col-span-4`} placeholder="Estándar esperado" />
                      <button onClick={() => setEstandares(arr => arr.filter((_,ix)=>ix!==i))}
                        className="col-span-1 text-gray-600 hover:text-red-400 text-lg leading-none pt-1">×</button>
                    </div>
                  ))}
                  {estandares.length === 0 && <p className="text-gray-700 text-xs">Sin estándares. Agrega filas para definir cómo se mide el desempeño.</p>}
                </div>
              </div>

              {/* Condiciones laborales (fuente del acuerdo laboral) */}
              <div>
                <p className="text-xs text-[#B3985B] uppercase tracking-wider mb-3">Condiciones laborales (para el acuerdo)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Funciones (una por línea)</label>
                    <textarea {...f("funciones")} rows={4} className={`${inputCls} resize-none font-mono text-xs`}
                      placeholder={"Operar la consola de audio\nSupervisar el montaje"} />
                  </div>
                  <div>
                    <label className={labelCls}>Prestaciones (una por línea)</label>
                    <textarea {...f("prestaciones")} rows={4} className={`${inputCls} resize-none font-mono text-xs`}
                      placeholder={"IMSS\nAguinaldo de ley\nVacaciones"} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className={labelCls}>Tipo de contrato</label>
                    <input {...f("tipoContrato")} className={inputCls} placeholder="Indeterminado" />
                  </div>
                  <div>
                    <label className={labelCls}>Modalidad</label>
                    <input {...f("modalidad")} className={inputCls} placeholder="Presencial" />
                  </div>
                  <div>
                    <label className={labelCls}>Horario</label>
                    <input {...f("horario")} className={inputCls} placeholder="L-V 9:00-18:00" />
                  </div>
                </div>
              </div>

              {/* Titulares */}
              <div>
                <p className="text-xs text-[#B3985B] uppercase tracking-wider mb-3">Titulares</p>
                <div className="max-h-40 overflow-y-auto border border-[#222] rounded-lg bg-[#0d0d0d] p-2 space-y-1">
                  {personal.filter(pe => pe.activo).length === 0 && <p className="text-gray-700 text-xs px-1">Sin personal registrado.</p>}
                  {personal.filter(pe => pe.activo).map(pe => (
                    <label key={pe.id} className="flex items-center gap-2 text-sm text-gray-300 px-1 py-0.5 hover:bg-[#1a1a1a] rounded cursor-pointer">
                      <input type="checkbox" checked={ocupantesIds.includes(pe.id)}
                        onChange={() => setOcupantesIds(ids => ids.includes(pe.id) ? ids.filter(x=>x!==pe.id) : [...ids, pe.id])}
                        className="accent-[#B3985B]" />
                      <span>{pe.nombre}</span>
                      <span className="text-gray-600 text-xs">· {pe.puesto}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#111] border-t border-[#222] px-6 py-4 flex items-center justify-between gap-3">
              {saveError && <p className="text-red-400 text-xs flex-1">{saveError}</p>}
              <div className="flex gap-3 ml-auto">
                <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-sm px-4 py-2 transition-colors">Cancelar</button>
                <button onClick={save} disabled={saving || !form.nombre}
                  className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-6 py-2 rounded-lg transition-colors">
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear puesto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
