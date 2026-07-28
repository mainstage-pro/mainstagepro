"use client";
import { useEffect, useState } from "react";
import { Combobox } from "@/components/Combobox";

interface Ocupante { id: string; nombre: string; userId?: string | null }
interface Estandar { subarea: string; responsabilidad: string; estandar: string }
interface Puesto {
  id: string; nombre: string; area: string;
  objetivoArea?: string | null; misionPuesto?: string | null;
  responsabilidades?: string | null;
  reportaAId?: string | null; reportaA?: { id: string; nombre: string } | null;
  coordinaCon?: string | null; supervisaA?: string | null;
  estandares?: string | null;
  puestoIdealId?: string | null; puestoIdeal?: { id: string; titulo: string } | null;
  color?: string | null; activo: boolean;
  ocupantes?: Ocupante[];
}
interface PuestoIdealLite { id: string; titulo: string; area: string }
interface PersonaLite { id: string; nombre: string; puesto: string; activo: boolean }

const AREAS = ["DIRECCION","ADMINISTRACION","MARKETING","VENTAS","PRODUCCION","RRHH","GENERAL"];
const AREA_COLORS: Record<string,string> = {
  DIRECCION: "bg-amber-900/30 text-amber-300",
  ADMINISTRACION: "bg-purple-900/30 text-purple-300",
  MARKETING: "bg-yellow-900/30 text-yellow-300",
  VENTAS: "bg-green-900/30 text-green-300",
  PRODUCCION: "bg-blue-900/30 text-blue-300",
  RRHH: "bg-pink-900/30 text-pink-300",
  GENERAL: "bg-gray-800 text-gray-400",
};

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
  nombre:"", area:"GENERAL", color:"",
  objetivoArea:"", misionPuesto:"",
  responsabilidades:"", coordinaCon:"", supervisaA:"",
  reportaAId:"", puestoIdealId:"",
};
type FormState = typeof EMPTY_FORM;

export default function PuestosOperativosPage() {
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [ideales, setIdeales] = useState<PuestoIdealLite[]>([]);
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

  async function load() {
    const [rp, ri, rper] = await Promise.all([
      fetch("/api/rrhh/puestos-operativos", { cache: "no-store" }),
      fetch("/api/rrhh/puestos", { cache: "no-store" }),
      fetch("/api/rrhh/personal", { cache: "no-store" }),
    ]);
    const [dp, di, dper] = await Promise.all([rp.json(), ri.json(), rper.json()]);
    setPuestos(dp.puestos ?? []);
    setIdeales((di.puestos ?? []).map((p: PuestoIdealLite) => ({ id: p.id, titulo: p.titulo, area: p.area })));
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
      nombre: p.nombre, area: p.area, color: p.color ?? "",
      objetivoArea: p.objetivoArea ?? "", misionPuesto: p.misionPuesto ?? "",
      responsabilidades: parseArr(p.responsabilidades).join("\n"),
      coordinaCon: parseArr(p.coordinaCon).join("\n"),
      supervisaA: parseArr(p.supervisaA).join("\n"),
      reportaAId: p.reportaAId ?? "",
      puestoIdealId: p.puestoIdealId ?? "",
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
        reportaAId: form.reportaAId || null,
        puestoIdealId: form.puestoIdealId || null,
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

  const f = (k: keyof FormState) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value })),
  });

  const inputCls = "w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] placeholder-gray-600";
  const labelCls = "block text-xs text-gray-500 mb-1";
  const areaTabs = ["TODOS", ...AREAS];
  const visible = puestos.filter(p => (filterArea === "TODOS" || p.area === filterArea) && p.activo);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Puestos</h1>
          <p className="ms-subtitle">Estructura operativa real: responsabilidades permanentes y estándares por puesto</p>
        </div>
        <button onClick={openNew} className="ms-btn-primary">+ Nuevo puesto</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {areaTabs.map(a => (
          <button key={a} onClick={() => setFilterArea(a)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
              filterArea === a ? "bg-[#B3985B] text-black border-[#B3985B]" : "border-[#222] text-gray-500 hover:text-white"
            }`}>
            {a === "TODOS" ? "Todos" : a}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(p => {
            const resp = parseArr(p.responsabilidades);
            const est = parseEst(p.estandares);
            return (
            <div key={p.id}
              className="ms-stat-card hover:border-[#2a2a2a] cursor-pointer transition-all"
              onClick={() => setSelected(p === selected ? null : p)}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold flex items-center gap-2">
                    {p.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />}
                    {p.nombre}
                  </p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${AREA_COLORS[p.area] ?? "bg-gray-800 text-gray-400"}`}>
                    {p.area}
                  </span>
                </div>
                <button onClick={e => { e.stopPropagation(); openEdit(p); }}
                  className="text-xs text-gray-600 hover:text-[#B3985B] transition-colors shrink-0">Editar</button>
              </div>

              {p.objetivoArea && <p className="text-gray-400 text-xs line-clamp-2 mb-3">{p.objetivoArea}</p>}

              <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                {p.reportaA && <span>Reporta a: <span className="text-gray-400">{p.reportaA.nombre}</span></span>}
                {resp.length > 0 && <span>· {resp.length} resp.</span>}
                {(p.ocupantes?.length ?? 0) > 0 && <span className="text-[#B3985B]">· {p.ocupantes!.length} titular{p.ocupantes!.length > 1 ? "es" : ""}</span>}
              </div>

              {selected?.id === p.id && (
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
                  {(p.ocupantes?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Titulares</p>
                      <div className="flex flex-wrap gap-1">
                        {p.ocupantes!.map(o => (
                          <span key={o.id} className="text-[10px] bg-[#1a1a1a] text-gray-300 px-2 py-0.5 rounded-full">{o.nombre}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {p.puestoIdeal && (
                    <p className="text-[10px] text-gray-600">Perfil de reclutamiento: <span className="text-gray-400">{p.puestoIdeal.titulo}</span></p>
                  )}
                  <button onClick={() => eliminar(p)}
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors mt-2">
                    Eliminar puesto
                  </button>
                </div>
              )}
            </div>
          );})}
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
                      options={AREAS.map(a => ({ value: a, label: a }))} className={inputCls} />
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

              {/* Vínculos */}
              <div>
                <p className="text-xs text-[#B3985B] uppercase tracking-wider mb-3">Vínculos</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Perfil de reclutamiento (puesto ideal)</label>
                    <Combobox value={form.puestoIdealId} onChange={v => setForm(p => ({ ...p, puestoIdealId: v }))}
                      options={[{ value: "", label: "— Ninguno —" }, ...ideales.map(x => ({ value: x.id, label: x.titulo }))]}
                      className={inputCls} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Titulares (personal que ocupa este puesto)</label>
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
