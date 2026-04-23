"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";

interface Personal { id: string; nombre: string; puesto: string; salario: number | null; periodoPago: string; }
interface TipoIncidencia { id: string; nombre: string; categoria: string; calculoTipo: string; valor: number; esDescuento: boolean; descripcion: string | null; activo: boolean; }
interface Incidencia {
  id: string; personalId: string; tipoId: string; fecha: string; descripcion: string | null;
  montoCalculado: number | null; periodoNomina: string | null; aplicada: boolean; notificada: boolean;
  personal: { id: string; nombre: string; };
  tipo: TipoIncidencia;
}

const CATEGORIAS = ["ASISTENCIA","CONDUCTA","DESEMPEÑO","RECONOCIMIENTO"];
const CALCULOS = [
  { value: "SIN_DESCUENTO", label: "Sin descuento" },
  { value: "FIJO",          label: "Monto fijo ($)" },
  { value: "PORCENTAJE_DIA",label: "% del día" },
  { value: "PORCENTAJE_HORA",label: "% de la hora" },
];
const CAT_COLORS: Record<string,string> = {
  ASISTENCIA: "text-red-400 bg-red-900/20", CONDUCTA: "text-orange-400 bg-orange-900/20",
  DESEMPEÑO: "text-blue-400 bg-blue-900/20", RECONOCIMIENTO: "text-green-400 bg-green-900/20",
};
const fmt = (n: number) => `$${n.toLocaleString("es-MX",{minimumFractionDigits:0,maximumFractionDigits:0})}`;

const TIPO_EMPTY = { nombre:"", categoria:"ASISTENCIA", calculoTipo:"SIN_DESCUENTO", valor:"0", esDescuento:true, descripcion:"" };
const INC_EMPTY = { personalId:"", tipoId:"", fecha:"", descripcion:"", periodoNomina:"" };

export default function IncidenciasPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [tipos, setTipos] = useState<TipoIncidencia[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [tab, setTab] = useState<"registro"|"catalogo">("registro");
  const [showTipoForm, setShowTipoForm] = useState(false);
  const [editTipoId, setEditTipoId] = useState<string|null>(null);
  const [tipoForm, setTipoForm] = useState(TIPO_EMPTY);
  const [showIncForm, setShowIncForm] = useState(false);
  const [incForm, setIncForm] = useState(INC_EMPTY);
  const [saving, setSaving] = useState(false);
  const [mes, setMes] = useState(new Date().toISOString().slice(0,7));

  async function loadAll() {
    const [pRes, tRes, iRes] = await Promise.all([
      fetch("/api/rrhh/personal"),
      fetch("/api/rrhh/tipos-incidencia"),
      fetch(`/api/rrhh/incidencias?mes=${mes}`),
    ]);
    const [pD, tD, iD] = await Promise.all([pRes.json(), tRes.json(), iRes.json()]);
    setPersonal(pD.personal?.filter((p: Personal & { activo:boolean }) => p.activo) ?? []);
    setTipos(tD.tipos ?? []);
    setIncidencias(iD.incidencias ?? []);
  }

  useEffect(() => { loadAll(); }, [mes]);

  async function saveTipo() {
    if (!tipoForm.nombre.trim()) return;
    setSaving(true);
    const payload = { ...tipoForm, valor: parseFloat(tipoForm.valor)||0 };
    if (editTipoId) await fetch(`/api/rrhh/tipos-incidencia/${editTipoId}`,{ method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
    else await fetch("/api/rrhh/tipos-incidencia",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
    await loadAll(); setShowTipoForm(false); setEditTipoId(null); setTipoForm(TIPO_EMPTY); setSaving(false);
  }

  async function deleteTipo(id: string, nombre: string) {
    if (!await confirm({ message: `¿Eliminar "${nombre}"?`, danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/rrhh/tipos-incidencia/${id}`,{ method:"DELETE" });
    toast.success("Tipo eliminado");
    await loadAll();
  }

  async function saveInc() {
    if (!incForm.personalId || !incForm.tipoId || !incForm.fecha) return;
    setSaving(true);
    await fetch("/api/rrhh/incidencias",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(incForm) });
    await loadAll(); setShowIncForm(false); setIncForm(INC_EMPTY); setSaving(false);
  }

  async function deleteInc(id: string) {
    if (!await confirm({ message: "¿Eliminar esta incidencia?", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/rrhh/incidencias/${id}`,{ method:"DELETE" });
    toast.success("Incidencia eliminada");
    await loadAll();
  }

  async function marcarAplicada(id: string, aplicada: boolean) {
    await fetch(`/api/rrhh/incidencias/${id}`,{ method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ aplicada }) });
    await loadAll();
  }

  const tiposActivos = tipos.filter(t => t.activo);
  const totalDescuentos = incidencias.filter(i=>i.tipo.esDescuento).reduce((s,i)=>s+(i.montoCalculado??0),0);

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Incidencias</h1>
          <p className="text-[#6b7280] text-sm">Faltas, retardos, penalizaciones y reconocimientos</p>
        </div>
        <div className="flex gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1">
          {([["registro","Registro"],["catalogo","Catálogo"]] as [typeof tab, string][]).map(([v,l]) => (
            <button key={v} onClick={()=>setTab(v)} className={`text-xs px-3 py-1 rounded transition-colors ${tab===v?"bg-[#B3985B] text-black font-semibold":"text-gray-500 hover:text-white"}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── Tab Registro ── */}
      {tab === "registro" && (<>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <input type="month" value={mes} onChange={e=>setMes(e.target.value)}
              className="bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            {totalDescuentos > 0 && <span className="text-red-400 text-xs font-semibold">−{fmt(totalDescuentos)} en descuentos</span>}
          </div>
          <button onClick={()=>setShowIncForm(true)}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Registrar incidencia
          </button>
        </div>

        {showIncForm && (
          <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-3">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nueva incidencia</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Empleado</label>
                <Combobox
                  value={incForm.personalId}
                  onChange={v => setIncForm(p => ({ ...p, personalId: v }))}
                  options={[{ value: "", label: "Seleccionar..." }, ...personal.map(p => ({ value: p.id, label: p.nombre }))]}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tipo de incidencia</label>
                <Combobox
                  value={incForm.tipoId}
                  onChange={v => setIncForm(p => ({ ...p, tipoId: v }))}
                  options={[{ value: "", label: "Seleccionar..." }, ...tiposActivos.map(t => ({ value: t.id, label: t.nombre + (t.calculoTipo !== "SIN_DESCUENTO" ? ` (${t.calculoTipo === "FIJO" ? fmt(t.valor) : t.valor + "%"})` : "") }))]}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
                <input type="date" value={incForm.fecha} onChange={e=>setIncForm(p=>({...p,fecha:e.target.value}))}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Período nómina</label>
                <input type="month" value={incForm.periodoNomina} onChange={e=>setIncForm(p=>({...p,periodoNomina:e.target.value}))}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
                <input value={incForm.descripcion} onChange={e=>setIncForm(p=>({...p,descripcion:e.target.value}))}
                  placeholder="Detalle de la incidencia..."
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={saveInc} disabled={saving||!incForm.personalId||!incForm.tipoId||!incForm.fecha}
                className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
                {saving?"Guardando...":"Registrar"}
              </button>
              <button onClick={()=>{setShowIncForm(false);setIncForm(INC_EMPTY);}} className="text-gray-500 hover:text-white text-sm px-3">Cancelar</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {incidencias.length === 0 ? (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-12 text-center">
              <p className="text-gray-600 text-sm">Sin incidencias en este período</p>
            </div>
          ) : incidencias.map(i => (
            <div key={i.id} className={`bg-[#111] border rounded-xl px-5 py-3 flex items-center gap-4 ${i.tipo.esDescuento?"border-red-900/20":"border-green-900/20"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium">{i.personal.nombre}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${CAT_COLORS[i.tipo.categoria]}`}>{i.tipo.nombre}</span>
                  {i.montoCalculado != null && i.montoCalculado > 0 && (
                    <span className={`text-[10px] font-bold ${i.tipo.esDescuento?"text-red-400":"text-green-400"}`}>
                      {i.tipo.esDescuento?"−":"+"}{ fmt(i.montoCalculado)}
                    </span>
                  )}
                  {i.aplicada && <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded">Aplicada</span>}
                </div>
                <p className="text-gray-500 text-xs mt-0.5">
                  {new Date(i.fecha).toLocaleDateString("es-MX",{day:"numeric",month:"long"})}
                  {i.descripcion && ` · ${i.descripcion}`}
                  {i.periodoNomina && ` · nómina ${i.periodoNomina}`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {!i.aplicada && (
                  <button onClick={()=>marcarAplicada(i.id,true)} className="text-[10px] text-gray-500 hover:text-green-400 transition-colors">Aplicar</button>
                )}
                <button onClick={()=>deleteInc(i.id)} className="text-[10px] text-gray-600 hover:text-red-400 transition-colors">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </>)}

      {/* ── Tab Catálogo ── */}
      {tab === "catalogo" && (<>
        <div className="flex justify-end">
          <button onClick={()=>{setShowTipoForm(true);setEditTipoId(null);setTipoForm(TIPO_EMPTY);}}
            className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Nuevo tipo
          </button>
        </div>

        {showTipoForm && (
          <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-3">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{editTipoId?"Editar tipo":"Nuevo tipo de incidencia"}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Nombre</label>
                <input value={tipoForm.nombre} onChange={e=>setTipoForm(p=>({...p,nombre:e.target.value}))}
                  placeholder="Ej: Falta injustificada, Retardo menor..."
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Categoría</label>
                <Combobox
                  value={tipoForm.categoria}
                  onChange={v => setTipoForm(p => ({ ...p, categoria: v }))}
                  options={CATEGORIAS.map(c => ({ value: c, label: c }))}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Tipo de cálculo</label>
                <Combobox
                  value={tipoForm.calculoTipo}
                  onChange={v => setTipoForm(p => ({ ...p, calculoTipo: v }))}
                  options={CALCULOS.map(c => ({ value: c.value, label: c.label }))}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                /></div>
              {tipoForm.calculoTipo !== "SIN_DESCUENTO" && (
                <div><label className="text-xs text-gray-500 mb-1 block">Valor {tipoForm.calculoTipo==="FIJO"?"($)":"(%)"}</label>
                  <input type="number" value={tipoForm.valor} onChange={e=>setTipoForm(p=>({...p,valor:e.target.value}))}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" /></div>
              )}
              <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Descripción</label>
                <input value={tipoForm.descripcion} onChange={e=>setTipoForm(p=>({...p,descripcion:e.target.value}))}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={tipoForm.esDescuento} onChange={e=>setTipoForm(p=>({...p,esDescuento:e.target.checked}))} className="accent-[#B3985B]" />
                <span className="text-gray-400 text-sm">Es descuento / penalización</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={saveTipo} disabled={saving||!tipoForm.nombre.trim()}
                className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg">
                {saving?"Guardando...":editTipoId?"Actualizar":"Agregar"}
              </button>
              <button onClick={()=>{setShowTipoForm(false);setEditTipoId(null);}} className="text-gray-500 hover:text-white text-sm px-3">Cancelar</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {tipos.length === 0 ? (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-12 text-center">
              <p className="text-gray-600 text-sm">Sin tipos de incidencia</p>
            </div>
          ) : tipos.map(t => (
            <div key={t.id} className={`bg-[#111] border border-[#1e1e1e] rounded-xl px-5 py-3 flex items-center gap-4 ${!t.activo?"opacity-40":""}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium">{t.nombre}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${CAT_COLORS[t.categoria]}`}>{t.categoria}</span>
                  {t.calculoTipo !== "SIN_DESCUENTO" && (
                    <span className={`text-[10px] font-bold ${t.esDescuento?"text-red-400":"text-green-400"}`}>
                      {t.calculoTipo==="FIJO"?fmt(t.valor):`${t.valor}% ${t.calculoTipo==="PORCENTAJE_DIA"?"del día":"de la hora"}`}
                    </span>
                  )}
                </div>
                {t.descripcion && <p className="text-gray-600 text-xs mt-0.5">{t.descripcion}</p>}
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={()=>{setEditTipoId(t.id);setTipoForm({nombre:t.nombre,categoria:t.categoria,calculoTipo:t.calculoTipo,valor:String(t.valor),esDescuento:t.esDescuento,descripcion:t.descripcion??""});setShowTipoForm(true);}}
                  className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors">Editar</button>
                <button onClick={()=>deleteTipo(t.id,t.nombre)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
}
