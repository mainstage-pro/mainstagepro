"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { SkeletonCards } from "@/components/Skeleton";
import { Combobox } from "@/components/Combobox";

interface Postulacion {
  id: string; etapa: string; puestoManual?: string | null; areaManual?: string | null;
  salarioPropuesto?: number | null; fechaIngresoEstimada?: string | null;
  propuestaFechaEnvio?: string | null; propuestaAceptada?: boolean | null;
  contratoGenerado: boolean;
  puesto?: { titulo: string; area: string } | null;
}
interface Candidato {
  id: string; nombre: string; correo?: string | null; telefono?: string | null;
  ciudad?: string | null; carrera?: string | null; salarioEsperado?: number | null;
  createdAt: string;
  postulaciones: Postulacion[];
}

const ETAPAS = ["NUEVO","EVALUACION","PROPUESTA_ENVIADA","APROBADO","CONTRATADO","RECHAZADO"] as const;
const ETAPA_LABELS: Record<string,string> = {
  NUEVO:"Nuevo", EVALUACION:"Evaluación", PROPUESTA_ENVIADA:"Propuesta enviada",
  APROBADO:"Aprobado", CONTRATADO:"Contratado", RECHAZADO:"Rechazado",
};
const ETAPA_COLORS: Record<string,string> = {
  NUEVO: "bg-gray-800 text-gray-300",
  EVALUACION: "bg-blue-900/40 text-blue-300",
  PROPUESTA_ENVIADA: "bg-yellow-900/30 text-yellow-300",
  APROBADO: "bg-green-900/30 text-green-300",
  CONTRATADO: "bg-[#B3985B]/20 text-[#B3985B]",
  RECHAZADO: "bg-red-900/30 text-red-300",
};
const ETAPA_BORDER: Record<string,string> = {
  NUEVO: "border-gray-700", EVALUACION: "border-blue-800",
  PROPUESTA_ENVIADA: "border-yellow-800", APROBADO: "border-green-800",
  CONTRATADO: "border-[#B3985B]/40", RECHAZADO: "border-red-900",
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
  const [puestos, setPuestos] = useState<{id:string;titulo:string;area:string}[]>([]);
  const [form, setForm] = useState({
    nombre:"", correo:"", telefono:"", ciudad:"",
    puestoId:"", puestoManual:"", areaManual:"",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [rc, rp] = await Promise.all([
      fetch("/api/rrhh/candidatos"),
      fetch("/api/rrhh/puestos"),
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
    const r = await fetch("/api/rrhh/candidatos", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(form),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) { toast.error(d.error ?? "Error al crear candidato"); return; }
    setShowNew(false);
    if (d.candidato?.id) router.push(`/rrhh/candidatos/${d.candidato.id}`);
  }

  const inputCls = "w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] placeholder-gray-600";

  // Pipeline columns — exclude RECHAZADO from kanban
  const kanbanEtapas = ETAPAS.filter(e => e !== "RECHAZADO");

  function getPuestoLabel(post: Postulacion) {
    return post.puesto?.titulo ?? post.puestoManual ?? "Sin puesto definido";
  }

  function getEtapa(c: Candidato) {
    return c.postulaciones[0]?.etapa ?? "NUEVO";
  }

  return (
    <div className="p-3 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Candidatos</h1>
          <p className="text-gray-500 text-sm">{candidatos.length} registros · Pipeline de contratación</p>
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
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Nuevo candidato
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonCards count={6} />
      ) : view === "kanban" ? (
        /* ── Kanban ── */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanEtapas.map(etapa => {
            const cols = candidatos.filter(c => getEtapa(c) === etapa);
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
                    return (
                      <Link key={c.id} href={`/rrhh/candidatos/${c.id}`}
                        className={`block bg-[#111] border rounded-xl p-4 hover:border-[#333] transition-all ${ETAPA_BORDER[etapa]}`}>
                        <p className="text-white text-sm font-medium">{c.nombre}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{getPuestoLabel(post)}</p>
                        {c.ciudad && <p className="text-gray-600 text-xs mt-1">{c.ciudad}</p>}
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
              <span className="text-gray-600 text-xs">{candidatos.filter(c => getEtapa(c) === "RECHAZADO").length}</span>
            </div>
            <div className="space-y-2 opacity-50">
              {candidatos.filter(c => getEtapa(c) === "RECHAZADO").map(c => (
                <Link key={c.id} href={`/rrhh/candidatos/${c.id}`}
                  className="block bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3 hover:border-[#222] transition-all">
                  <p className="text-gray-400 text-xs font-medium">{c.nombre}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Lista ── */
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                {["Candidato","Puesto","Ciudad","Salario esperado","Etapa",""].map(h => (
                  <th key={h} className="text-left text-[10px] text-gray-600 uppercase tracking-wider px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidatos.map(c => {
                const post = c.postulaciones[0];
                const etapa = getEtapa(c);
                return (
                  <tr key={c.id} className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#0d0d0d] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{c.nombre}</p>
                      {c.correo && <p className="text-gray-600 text-xs">{c.correo}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{getPuestoLabel(post)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.ciudad ?? "—"}</td>
                    <td className="px-4 py-3 text-[#B3985B] text-xs">{c.salarioEsperado ? fmt(c.salarioEsperado) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ETAPA_COLORS[etapa]}`}>
                        {ETAPA_LABELS[etapa]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/rrhh/candidatos/${c.id}`} className="text-xs text-[#B3985B] hover:underline">Ver →</Link>
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
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#222] rounded-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-[#222] flex items-center justify-between">
              <h2 className="text-white font-semibold">Registrar candidato</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
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
                  value={form.puestoId}
                  onChange={v => setForm(p => ({ ...p, puestoId: v }))}
                  options={[{ value: "", label: "— Seleccionar puesto ideal —" }, ...puestos.map(p => ({ value: p.id, label: `${p.titulo} · ${p.area}` }))]}
                  className={inputCls}
                />
              </div>
              {!form.puestoId && (
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
            </div>
            <div className="px-6 py-4 border-t border-[#222] flex justify-end gap-3">
              <button onClick={() => setShowNew(false)} className="text-gray-500 hover:text-white text-sm px-4 py-2 transition-colors">Cancelar</button>
              <button onClick={crear} disabled={saving || !form.nombre}
                className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-6 py-2 rounded-lg transition-colors">
                {saving ? "Creando..." : "Crear y abrir →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
