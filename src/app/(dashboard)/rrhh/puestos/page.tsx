"use client";
import { useEffect, useState } from "react";

interface Puesto {
  id: string; titulo: string; area: string;
  descripcion?: string | null; objetivoRol?: string | null;
  edadMin?: number | null; edadMax?: number | null;
  ciudades?: string | null; nivelEstudios?: string | null; carrerasSugeridas?: string | null;
  habilidadesTecnicas?: string | null; habilidadesBlandas?: string | null;
  conocimientos?: string | null; aptitudes?: string | null;
  valores?: string | null; areasDesarrollo?: string | null;
  criteriosEvaluacion?: string | null;
  salarioMin?: number | null; salarioMax?: number | null;
  tipoContrato?: string | null; modalidad?: string | null;
  horario?: string | null; prestaciones?: string | null;
  activo: boolean;
}

const AREAS = ["PRODUCCION","ADMINISTRACION","COMERCIAL","OPERACIONES","RRHH","TECNOLOGIA"];
const AREA_COLORS: Record<string,string> = {
  PRODUCCION: "bg-blue-900/30 text-blue-300",
  ADMINISTRACION: "bg-purple-900/30 text-purple-300",
  COMERCIAL: "bg-yellow-900/30 text-yellow-300",
  OPERACIONES: "bg-green-900/30 text-green-300",
  RRHH: "bg-pink-900/30 text-pink-300",
  TECNOLOGIA: "bg-cyan-900/30 text-cyan-300",
};
const MODALIDADES = ["PRESENCIAL","REMOTO","HIBRIDO"];
const CONTRATOS = ["NOMINA","HONORARIOS","FREELANCE"];
const ESTUDIOS = ["BACHILLERATO","LICENCIATURA","POSGRADO","INDIFERENTE"];

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n);
}

function parseArr(s?: string | null): string[] {
  if (!s) return [];
  try { return JSON.parse(s); } catch { return s.split(",").map(x=>x.trim()).filter(Boolean); }
}

const EMPTY_FORM = {
  titulo:"", area:"PRODUCCION", descripcion:"", objetivoRol:"",
  edadMin:"", edadMax:"", ciudades:"", nivelEstudios:"INDIFERENTE", carrerasSugeridas:"",
  habilidadesTecnicas:"", habilidadesBlandas:"", conocimientos:"",
  aptitudes:"", valores:"", areasDesarrollo:"",
  salarioMin:"", salarioMax:"", tipoContrato:"NOMINA", modalidad:"PRESENCIAL", horario:"", prestaciones:"",
};

type FormState = typeof EMPTY_FORM;

export default function PuestosPage() {
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Puesto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Puesto | null>(null);

  async function load() {
    const r = await fetch("/api/rrhh/puestos", { cache: "no-store" });
    const d = await r.json();
    setPuestos(d.puestos ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(p: Puesto) {
    setEditing(p);
    setForm({
      titulo: p.titulo, area: p.area,
      descripcion: p.descripcion ?? "", objetivoRol: p.objetivoRol ?? "",
      edadMin: p.edadMin?.toString() ?? "", edadMax: p.edadMax?.toString() ?? "",
      ciudades: parseArr(p.ciudades).join(", "),
      nivelEstudios: p.nivelEstudios ?? "INDIFERENTE",
      carrerasSugeridas: p.carrerasSugeridas ?? "",
      habilidadesTecnicas: parseArr(p.habilidadesTecnicas).join("\n"),
      habilidadesBlandas: parseArr(p.habilidadesBlandas).join("\n"),
      conocimientos: parseArr(p.conocimientos).join("\n"),
      aptitudes: parseArr(p.aptitudes).join("\n"),
      valores: parseArr(p.valores).join("\n"),
      areasDesarrollo: parseArr(p.areasDesarrollo).join("\n"),
      salarioMin: p.salarioMin?.toString() ?? "", salarioMax: p.salarioMax?.toString() ?? "",
      tipoContrato: p.tipoContrato ?? "NOMINA", modalidad: p.modalidad ?? "PRESENCIAL",
      horario: p.horario ?? "",
      prestaciones: parseArr(p.prestaciones).join("\n"),
    });
    setShowForm(true);
  }

  function toArr(s: string) {
    return s.split(/[\n,]/).map(x=>x.trim()).filter(Boolean);
  }

  const [saveError, setSaveError] = useState("");

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      const body = {
        titulo: form.titulo, area: form.area,
        descripcion: form.descripcion || null,
        objetivoRol: form.objetivoRol || null,
        edadMin: form.edadMin ? parseInt(form.edadMin) : null,
        edadMax: form.edadMax ? parseInt(form.edadMax) : null,
        ciudades: form.ciudades ? form.ciudades.split(",").map(x=>x.trim()).filter(Boolean) : null,
        nivelEstudios: form.nivelEstudios || null,
        carrerasSugeridas: form.carrerasSugeridas || null,
        habilidadesTecnicas: toArr(form.habilidadesTecnicas),
        habilidadesBlandas: toArr(form.habilidadesBlandas),
        conocimientos: toArr(form.conocimientos),
        aptitudes: toArr(form.aptitudes),
        valores: toArr(form.valores),
        areasDesarrollo: toArr(form.areasDesarrollo),
        salarioMin: form.salarioMin ? parseFloat(form.salarioMin) : null,
        salarioMax: form.salarioMax ? parseFloat(form.salarioMax) : null,
        tipoContrato: form.tipoContrato || null,
        modalidad: form.modalidad || null,
        horario: form.horario || null,
        prestaciones: toArr(form.prestaciones),
      };
      const url = editing ? `/api/rrhh/puestos/${editing.id}` : "/api/rrhh/puestos";
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

  async function toggleActivo(p: Puesto) {
    await fetch(`/api/rrhh/puestos/${p.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ activo: !p.activo }) });
    await load();
  }

  const f = (k: keyof FormState) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value })),
  });

  const inputCls = "w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] placeholder-gray-600";
  const labelCls = "block text-xs text-gray-500 mb-1";
  const areaTabs = [...new Set(["TODOS", ...AREAS])];
  const [filterArea, setFilterArea] = useState("TODOS");
  const visible = puestos.filter(p => (filterArea === "TODOS" || p.area === filterArea) && p.activo);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Puestos Ideales</h1>
          <p className="text-gray-500 text-sm">Perfiles de roles que la organización busca desarrollar</p>
        </div>
        <button onClick={openNew} className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Nuevo puesto
        </button>
      </div>

      {/* Filtro por área */}
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
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center">
          <p className="text-gray-500">Sin puestos definidos</p>
          <p className="text-gray-700 text-xs mt-1">Define los perfiles ideales para tu organización</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(p => (
            <div key={p.id}
              className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#2a2a2a] cursor-pointer transition-all"
              onClick={() => setSelected(p === selected ? null : p)}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold">{p.titulo}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${AREA_COLORS[p.area] ?? "bg-gray-800 text-gray-400"}`}>
                    {p.area}
                  </span>
                </div>
                <button onClick={e => { e.stopPropagation(); openEdit(p); }}
                  className="text-xs text-gray-600 hover:text-[#B3985B] transition-colors shrink-0">Editar</button>
              </div>

              {p.descripcion && <p className="text-gray-400 text-xs line-clamp-2 mb-3">{p.descripcion}</p>}

              <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                {p.modalidad && <span>{p.modalidad}</span>}
                {p.tipoContrato && <span>· {p.tipoContrato}</span>}
                {(p.salarioMin || p.salarioMax) && (
                  <span className="text-[#B3985B]">
                    · {p.salarioMin ? fmt(p.salarioMin) : ""}{p.salarioMax ? ` – ${fmt(p.salarioMax)}` : ""}
                  </span>
                )}
              </div>

              {/* Expandido */}
              {selected?.id === p.id && (
                <div className="mt-4 space-y-3 border-t border-[#1a1a1a] pt-4" onClick={e => e.stopPropagation()}>
                  {[
                    ["Habilidades técnicas", p.habilidadesTecnicas],
                    ["Habilidades blandas", p.habilidadesBlandas],
                    ["Conocimientos", p.conocimientos],
                    ["Aptitudes", p.aptitudes],
                    ["Valores", p.valores],
                    ["Áreas de desarrollo", p.areasDesarrollo],
                    ["Prestaciones", p.prestaciones],
                  ].map(([label, val]) => {
                    const items = parseArr(val as string | null);
                    if (!items.length) return null;
                    return (
                      <div key={label as string}>
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</p>
                        <div className="flex flex-wrap gap-1">
                          {items.map((it, i) => (
                            <span key={i} className="text-[10px] bg-[#1a1a1a] text-gray-300 px-2 py-0.5 rounded-full">{it}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {p.horario && (
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Horario</p>
                      <p className="text-xs text-gray-300">{p.horario}</p>
                    </div>
                  )}
                  {(p.edadMin || p.edadMax) && (
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Rango de edad</p>
                      <p className="text-xs text-gray-300">{p.edadMin ?? "—"} – {p.edadMax ?? "—"} años</p>
                    </div>
                  )}
                  <button onClick={() => toggleActivo(p)}
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors mt-2">
                    Desactivar puesto
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-[#111] border border-[#222] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#111] border-b border-[#222] px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold">{editing ? "Editar puesto" : "Nuevo puesto ideal"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Identificación */}
              <div>
                <p className="text-xs text-[#B3985B] uppercase tracking-wider mb-3">Identificación</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelCls}>Título del puesto *</label>
                    <input {...f("titulo")} className={inputCls} placeholder="Ej: Coordinador de Producción" />
                  </div>
                  <div>
                    <label className={labelCls}>Área *</label>
                    <select {...f("area")} className={inputCls}>
                      {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Objetivo del rol (1 línea)</label>
                  <input {...f("objetivoRol")} className={inputCls} placeholder="Ej: Garantizar la operación técnica impecable de cada evento" />
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Descripción general</label>
                  <textarea {...f("descripcion")} rows={3} className={`${inputCls} resize-none`} placeholder="Descripción del puesto y sus responsabilidades principales" />
                </div>
              </div>

              {/* Perfil demográfico */}
              <div>
                <p className="text-xs text-[#B3985B] uppercase tracking-wider mb-3">Perfil demográfico</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className={labelCls}>Edad mínima</label>
                    <input {...f("edadMin")} type="number" className={inputCls} placeholder="18" />
                  </div>
                  <div>
                    <label className={labelCls}>Edad máxima</label>
                    <input {...f("edadMax")} type="number" className={inputCls} placeholder="40" />
                  </div>
                  <div>
                    <label className={labelCls}>Nivel estudios</label>
                    <select {...f("nivelEstudios")} className={inputCls}>
                      {ESTUDIOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Ciudades (separadas por coma)</label>
                    <input {...f("ciudades")} className={inputCls} placeholder="Querétaro, CDMX" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Carreras sugeridas</label>
                  <input {...f("carrerasSugeridas")} className={inputCls} placeholder="Ej: Producción de Medios, Administración, Ingeniería en Audio" />
                </div>
              </div>

              {/* Competencias */}
              <div>
                <p className="text-xs text-[#B3985B] uppercase tracking-wider mb-3">Competencias requeridas (una por línea)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {([
                    ["habilidadesTecnicas", "Habilidades técnicas"],
                    ["habilidadesBlandas",  "Habilidades blandas / soft skills"],
                    ["conocimientos",       "Conocimientos específicos"],
                    ["aptitudes",           "Aptitudes"],
                    ["valores",             "Valores requeridos"],
                    ["areasDesarrollo",     "Áreas de desarrollo que ofrece el puesto"],
                  ] as [keyof FormState, string][]).map(([key, label]) => (
                    <div key={key}>
                      <label className={labelCls}>{label}</label>
                      <textarea {...f(key)} rows={4} className={`${inputCls} resize-none font-mono text-xs`}
                        placeholder={`Una por línea\nEj:\nItem 1\nItem 2`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Condiciones */}
              <div>
                <p className="text-xs text-[#B3985B] uppercase tracking-wider mb-3">Condiciones laborales</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className={labelCls}>Salario mínimo</label>
                    <input {...f("salarioMin")} type="number" className={inputCls} placeholder="8000" />
                  </div>
                  <div>
                    <label className={labelCls}>Salario máximo</label>
                    <input {...f("salarioMax")} type="number" className={inputCls} placeholder="15000" />
                  </div>
                  <div>
                    <label className={labelCls}>Tipo contrato</label>
                    <select {...f("tipoContrato")} className={inputCls}>
                      {CONTRATOS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Modalidad</label>
                    <select {...f("modalidad")} className={inputCls}>
                      {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Horario</label>
                  <input {...f("horario")} className={inputCls} placeholder="Lunes a Viernes 9:00am – 6:00pm · Disponibilidad en eventos" />
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Prestaciones y beneficios (una por línea)</label>
                  <textarea {...f("prestaciones")} rows={3} className={`${inputCls} resize-none font-mono text-xs`}
                    placeholder={"IMSS\nVacaciones según ley\nBono por evento"} />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#111] border-t border-[#222] px-6 py-4 flex items-center justify-between gap-3">
              {saveError && <p className="text-red-400 text-xs flex-1">{saveError}</p>}
              <div className="flex gap-3 ml-auto">
                <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-sm px-4 py-2 transition-colors">Cancelar</button>
                <button onClick={save} disabled={saving || !form.titulo}
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
