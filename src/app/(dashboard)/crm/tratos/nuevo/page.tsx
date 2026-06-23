"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/Combobox";

interface Cliente {
  id: string; nombre: string; empresa: string | null; clasificacion: string; telefono: string | null;
}

const RUTAS_CARDS = [
  {
    value: "DESCUBRIR",
    icon: "🔍",
    label: "Descubrir necesidades",
    desc: "Nosotros guiamos y proponemos la solución. Enviamos formulario y construimos la cotización juntos.",
  },
  {
    value: "RIDER_DIRECTO",
    icon: "📋",
    label: "Entrar directo con rider",
    desc: "El cliente ya sabe exactamente qué quiere o trae una especificación técnica. Cotización directa.",
  },
] as const;

const SERVICIOS_CARDS = [
  { value: "PRODUCCION_TECNICA", icon: "🎛️", label: "Producción técnica",  desc: "Audio, iluminación, video y operación técnica completa" },
  { value: "RENTA",              icon: "📦", label: "Renta de equipo",      desc: "Renta de equipos sin operación técnica incluida" },
  { value: "DIRECCION_TECNICA",  icon: "🎬", label: "Dirección técnica",    desc: "Producción + dirección artística y coordinación integral" },
] as const;

const EVENTOS_CARDS = [
  { value: "MUSICAL",     icon: "🎵", label: "Musical" },
  { value: "SOCIAL",      icon: "🥂", label: "Social" },
  { value: "EMPRESARIAL", icon: "🏢", label: "Empresarial" },
  { value: "OTRO",        icon: "📅", label: "Otro" },
] as const;

const CANALES = [
  { value: "WHATSAPP", label: "WhatsApp", icon: "💬" },
  { value: "LLAMADA",  label: "Llamada",  icon: "📞" },
  { value: "REUNION",  label: "Reunión",  icon: "👥" },
];

const ORIGEN_OPTIONS = [
  { value: "ORGANICO",   label: "Orgánico / Directo" },
  { value: "META_ADS",   label: "Meta Ads" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "RECOMPRA",   label: "Recompra" },
  { value: "REFERIDO",   label: "Referido" },
  { value: "OTRO",       label: "Otro" },
];

const ORIGENES_OUTBOUND = [
  { id: "REDES_SOCIALES", icon: "📱", label: "Redes sociales",  desc: "Instagram DM, LinkedIn, WhatsApp" },
  { id: "BASE_DATOS",     icon: "📋", label: "Base de datos",   desc: "Lista, directorio, búsqueda" },
  { id: "NETWORKING",     icon: "🤝", label: "Networking",      desc: "Evento, referencia interna, contacto personal" },
];

const ORIGEN_VENTA_OPTIONS = [
  { value: "CLIENTE_PROPIO", label: "Cliente propio (10% comisión)" },
  { value: "PUBLICIDAD",     label: "Lead por publicidad (5%)" },
  { value: "ASIGNADO",       label: "Cliente asignado (5%+5%)" },
];

function nextTuesday() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const daysUntilTuesday = (2 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilTuesday);
  return d.toISOString().substring(0, 10);
}

export default function NuevoTratoPage() {
  const router = useRouter();
  // step 1 = datos cliente + ruta, 2 = detalles servicio
  // (el gate NURTURING fue eliminado — los prospectos en frío van al módulo Prospectos)
  const [step, setStep] = useState<1|2>(1);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; name: string }[]>([]);
  const [modoCliente, setModoCliente] = useState<"existente"|"nuevo">("existente");
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [primerSeg, setPrimerSeg] = useState({ fecha: nextTuesday(), canal: "whatsapp", nota: "" });
  const [noRequiereSeg, setNoRequiereSeg] = useState(false);

  const [s1, setS1] = useState({
    clienteId: "", clasificacionOriginal: "PROSPECTO",
    rutaEntrada: "DESCUBRIR",
    canalAtencion: "WHATSAPP",
    origenLead: "ORGANICO", tipoLead: "INBOUND", origenVenta: "CLIENTE_PROPIO",
    vendedorId: "",  // "" = yo (el usuario logueado)
  });
  const [clienteNuevo, setClienteNuevo] = useState({ nombre:"", empresa:"", tipoCliente:"POR_DESCUBRIR", clasificacion:"NUEVO", telefono:"", correo:"" });
  const [s2, setS2] = useState({ tipoServicio:"", tipoEvento:"MUSICAL", nombreEvento:"", fechaEventoEstimada:"", lugarEstimado:"", asistentesEstimados:"", notas:"" });

  useEffect(() => {
    fetch("/api/clientes").then(r=>r.json()).then(d=>setClientes(d.clientes||[]));
    fetch("/api/usuarios-activos").then(r=>r.json()).then(d=>setUsuarios(d.usuarios||[]));
  }, []);

  function validarCliente() {
    if (modoCliente==="existente" && !s1.clienteId) { setError("Selecciona un cliente"); return false; }
    if (modoCliente==="nuevo" && !clienteNuevo.nombre) { setError("El nombre es requerido"); return false; }
    setError(""); return true;
  }

  function validarPrimerSeg() {
    if (noRequiereSeg) return true;
    if (!primerSeg.fecha) { setError("Define la fecha del primer seguimiento"); return false; }
    return true;
  }

  async function crearNurturing() {
    if (!validarCliente()) return;
    if (!s1.origenLead) { setError("Selecciona cómo encontraste al prospecto"); return; }
    if (!validarPrimerSeg()) return;
    setLoading(true); setError("");
    const payload: Record<string,unknown> = {
      ...s1,
      vendedorId: s1.vendedorId || undefined,
      tipoProspecto: "NURTURING",
      canalAtencion: null,
      primerSeguimiento: noRequiereSeg ? null : { fecha: primerSeg.fecha, canal: primerSeg.canal, nota: primerSeg.nota || null },
    };
    if (modoCliente==="nuevo") { delete payload.clienteId; payload.clienteNuevo = clienteNuevo; }
    try {
      const res = await fetch("/api/tratos", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      if (!res.ok) { const d=await res.json(); setError(d.error||"Error al crear"); setLoading(false); return; }
      const { trato } = await res.json();
      router.push(`/crm/tratos/${trato.id}`);
    } catch { setError("Error de conexión"); setLoading(false); }
  }

  async function crearActivo(sinDetalles = false) {
    if (!sinDetalles && !s2.tipoServicio) { setError("Selecciona el tipo de servicio"); return; }
    if (!validarPrimerSeg()) return;
    setError(""); setLoading(true);
    const payload: Record<string,unknown> = {
      ...s1,
      ...(sinDetalles ? {} : s2),
      vendedorId: s1.vendedorId || undefined,
      tipoProspecto: "ACTIVO",
      asistentesEstimados: s2.asistentesEstimados ? parseInt(s2.asistentesEstimados) : null,
      primerSeguimiento: noRequiereSeg ? null : { fecha: primerSeg.fecha, canal: primerSeg.canal, nota: primerSeg.nota || null },
    };
    if (modoCliente==="nuevo") { delete payload.clienteId; payload.clienteNuevo = clienteNuevo; }
    try {
      const res = await fetch("/api/tratos", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      if (!res.ok) { const d=await res.json(); setError(d.error||"Error al crear"); setLoading(false); return; }
      const { trato } = await res.json();
      router.push(`/crm/tratos/${trato.id}`);
    } catch { setError("Error de conexión"); setLoading(false); }
  }

  const clienteSel = clientes.find(c=>c.id===s1.clienteId);

  // ── Step labels — solo flujo ACTIVO ──
  const steps = ["¿Quién es?", "¿Qué busca?"] as const;

  return (
    <div className="p-3 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <button onClick={()=>router.back()} className="text-gray-600 hover:text-white text-sm mb-2 transition-colors">← Atrás</button>
        <h1 className="text-xl font-bold text-white">Nuevo trato</h1>
        <p className="text-gray-600 text-xs mt-1">Solo para oportunidades con cotización activa · Los prospectos nuevos van al módulo Prospectos</p>
        <div className="flex items-center gap-2 mt-3">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                step === i + 1 ? "bg-[#B3985B] text-black" :
                step > i + 1  ? "bg-green-700 text-white" :
                "bg-[#1a1a1a] text-gray-500 border border-[#333]"
              }`}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span className={`text-xs ${step === i + 1 ? "text-white" : "text-gray-600"}`}>{label}</span>
              {i < steps.length - 1 && <span className="text-gray-700 text-xs mx-1">→</span>}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-900/20 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

      {/* ── Step 0 eliminado — todos los tratos son ACTIVO ── */}

      {/* ── Step 1: Cliente ── */}
      {step === 1 && (
        <div className="space-y-4">

          {/* Indicador: trato ACTIVO */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#B3985B]/40 bg-[#B3985B]/5 text-[#B3985B] text-sm font-medium">
            <span>🎯</span>
            <span>Trato activo — hay necesidad concreta y cotización potencial</span>
          </div>

          {/* Cliente */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">Cliente</h2>
            <div className="flex gap-2 mb-4">
              {(["existente","nuevo"] as const).map(m=>(
                <button key={m} type="button" onClick={()=>setModoCliente(m)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${modoCliente===m?"bg-[#B3985B] text-black":"bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#333]"}`}>
                  {m==="existente"?"Cliente existente":"+ Nuevo cliente"}
                </button>
              ))}
            </div>
            {modoCliente==="existente" ? (
              <div className="relative">
                <input
                  ref={clienteInputRef}
                  type="text"
                  value={clienteQuery}
                  onChange={e=>{setClienteQuery(e.target.value);setClienteDropdown(true);if(!e.target.value){setS1(p=>({...p,clienteId:"",clasificacionOriginal:"PROSPECTO"}));}}}
                  onFocus={()=>setClienteDropdown(true)}
                  onBlur={()=>setTimeout(()=>setClienteDropdown(false),150)}
                  placeholder="Buscar cliente por nombre o empresa..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] placeholder-[#555]"
                />
                {clienteDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-[#161616] border border-[#2a2a2a] rounded-lg shadow-xl max-h-52 overflow-y-auto">
                    {clientes.filter(c=>{
                      const q=clienteQuery.toLowerCase();
                      return !q || c.nombre.toLowerCase().includes(q) || (c.empresa??'').toLowerCase().includes(q);
                    }).length === 0 ? (
                      <p className="px-3 py-2 text-xs text-[#555]">Sin resultados</p>
                    ) : clientes.filter(c=>{
                      const q=clienteQuery.toLowerCase();
                      return !q || c.nombre.toLowerCase().includes(q) || (c.empresa??'').toLowerCase().includes(q);
                    }).map(c=>(
                      <button key={c.id} type="button" onMouseDown={()=>{setS1(p=>({...p,clienteId:c.id,clasificacionOriginal:c.clasificacion??"PROSPECTO"}));setClienteQuery(c.nombre+(c.empresa?` · ${c.empresa}`:""));setClienteDropdown(false);}} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#222] transition-colors">
                        <span className="font-medium">{c.nombre}</span>
                        {c.empresa && <span className="text-[#666] ml-1.5">· {c.empresa}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {clienteSel&&<p className="text-xs text-gray-500 mt-1.5">Clasificación: <span className="text-[#B3985B] font-medium">{clienteSel.clasificacion}</span>{clienteSel.telefono&&<span className="ml-2 text-gray-600">· {clienteSel.telefono}</span>}</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 mb-1 block">Nombre *</label><input value={clienteNuevo.nombre} onChange={e=>setClienteNuevo(p=>({...p,nombre:e.target.value}))} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" placeholder="Nombre completo"/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Empresa</label><input value={clienteNuevo.empresa} onChange={e=>setClienteNuevo(p=>({...p,empresa:e.target.value}))} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" placeholder="Nombre empresa"/></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500 mb-1 block">Teléfono</label><input value={clienteNuevo.telefono} onChange={e=>setClienteNuevo(p=>({...p,telefono:e.target.value}))} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" placeholder="442 000 0000"/></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">Correo</label><input type="email" value={clienteNuevo.correo} onChange={e=>setClienteNuevo(p=>({...p,correo:e.target.value}))} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" placeholder="correo@ejemplo.com"/></div>
                </div>
                <div><label className="text-xs text-gray-500 mb-1 block">Tipo de cliente</label>
                  <Combobox
                    value={clienteNuevo.tipoCliente}
                    onChange={v => setClienteNuevo(p => ({ ...p, tipoCliente: v }))}
                    options={[{ value: "POR_DESCUBRIR", label: "Por descubrir" }, { value: "B2B", label: "B2B (empresa)" }, { value: "B2C", label: "B2C (persona)" }]}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Ruta de entrada */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#B3985B] mb-3 uppercase tracking-wider">Ruta de entrada</h2>
            <div className="space-y-2">
              {RUTAS_CARDS.map(r=>(
                <button key={r.value} type="button" onClick={()=>setS1(p=>({...p,rutaEntrada:r.value}))} className={`w-full text-left p-4 rounded-xl border transition-all ${s1.rutaEntrada===r.value?"border-[#B3985B] bg-[#B3985B]/10":"border-[#2a2a2a] hover:border-[#3a3a3a]"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{r.icon}</span>
                    <div>
                      <p className={`text-sm font-semibold ${s1.rutaEntrada===r.value?"text-[#B3985B]":"text-white"}`}>{r.label}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{r.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
              <p className="text-xs text-gray-500 mb-2">Canal de comunicación</p>
              <div className="flex flex-wrap gap-2">
                {CANALES.map(c=>(
                  <button key={c.value} type="button" onClick={()=>setS1(p=>({...p,canalAtencion:c.value}))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${s1.canalAtencion===c.value?"border-[#B3985B] bg-[#B3985B]/10 text-white":"border-[#2a2a2a] text-gray-500 hover:text-white hover:border-[#444]"}`}>
                    <span>{c.icon}</span>{c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Origen del lead */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#B3985B] mb-3 uppercase tracking-wider">Origen del lead</h2>
            <div className="grid grid-cols-2 gap-3">
              <>
                <div><label className="text-xs text-gray-500 mb-1 block">¿De dónde viene?</label>
                  <Combobox
                    value={s1.origenLead}
                    onChange={v => setS1(p => ({ ...p, origenLead: v }))}
                    options={ORIGEN_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
                <div><label className="text-xs text-gray-500 mb-1 block">Tipo de lead</label>
                  <Combobox
                    value={s1.tipoLead}
                    onChange={v => setS1(p => ({ ...p, tipoLead: v }))}
                    options={[{ value: "INBOUND", label: "Inbound (nos buscó)" }, { value: "OUTBOUND", label: "Outbound (prospección)" }]}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
              </>
              <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Origen de venta (comisiones)</label>
                <Combobox
                  value={s1.origenVenta}
                  onChange={v => setS1(p => ({ ...p, origenVenta: v }))}
                  options={ORIGEN_VENTA_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Comisión para</label>
                <Combobox
                  value={s1.vendedorId}
                  onChange={v => setS1(p => ({ ...p, vendedorId: v }))}
                  options={[{ value: "", label: "Yo (quien captura)" }, ...usuarios.map(u => ({ value: u.id, label: u.name }))]}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
                {s1.vendedorId && (
                  <p className="text-xs text-[#B3985B] mt-1">La comisión irá a {usuarios.find(u => u.id === s1.vendedorId)?.name} — tú sigues como responsable de gestionar el trato.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Primer seguimiento</h2>
              <button
                type="button"
                onClick={() => setNoRequiereSeg(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  noRequiereSeg
                    ? "border-gray-600 bg-gray-800 text-gray-300"
                    : "border-[#2a2a2a] text-gray-600 hover:text-gray-400 hover:border-[#444]"
                }`}
              >
                {noRequiereSeg ? "✓" : ""} No requiere seguimiento
              </button>
            </div>
            {noRequiereSeg ? (
              <p className="text-[11px] text-gray-600 italic mt-2">El trato se registrará sin programar un seguimiento. Puedes agregar uno después si es necesario.</p>
            ) : (
              <>
                <p className="text-[11px] text-gray-500 mb-4">Define cuándo es el primer contacto con este prospecto</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs text-gray-500 mb-1 block">Fecha *</label>
                    <input
                      type="date"
                      value={primerSeg.fecha}
                      onChange={e => setPrimerSeg(p => ({ ...p, fecha: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs text-gray-500 mb-1 block">Tipo de contacto</label>
                    <div className="flex gap-2">
                      {[{ v: "whatsapp", l: "WhatsApp", i: "💬" }, { v: "llamada", l: "Llamada", i: "📞" }, { v: "reunion", l: "Reunión", i: "🤝" }].map(c => (
                        <button key={c.v} type="button" onClick={() => setPrimerSeg(p => ({ ...p, canal: c.v }))}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${primerSeg.canal === c.v ? "bg-[#B3985B] border-[#B3985B] text-black" : "bg-[#0d0d0d] border-[#2a2a2a] text-gray-500 hover:text-white"}`}>
                          {c.i} {c.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Nota (opcional)</label>
                    <input value={primerSeg.nota} onChange={e => setPrimerSeg(p => ({ ...p, nota: e.target.value }))}
                      placeholder="Ej: Llamar para conocer detalles del evento"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 justify-between pb-4">
            <button onClick={()=>{setError("");}} className="px-5 py-2.5 rounded-xl border border-[#333] text-gray-400 hover:text-white text-sm transition-colors" disabled>← Paso 1</button>
            <div className="flex items-center gap-2">
              <button onClick={()=>{if(validarCliente() && validarPrimerSeg()) crearActivo(true);}} disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-[#333] text-gray-400 hover:text-white text-sm transition-colors disabled:opacity-50">
                {loading ? "Guardando..." : "Guardar sin detalles"}
              </button>
              <button onClick={()=>{if(validarCliente() && validarPrimerSeg())setStep(2);}} className="px-6 py-2.5 rounded-xl bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-sm transition-colors">
                Siguiente → ¿Qué busca?
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Detalles del servicio ── */}
      {step === 2 && (
        <div className="space-y-5">

          {/* Tipo de servicio */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#B3985B] mb-4 uppercase tracking-wider">¿Qué tipo de servicio busca? *</h2>
            <div className="space-y-2">
              {SERVICIOS_CARDS.map(s=>(
                <button key={s.value} type="button" onClick={()=>setS2(p=>({...p,tipoServicio:s.value}))} className={`w-full text-left p-4 rounded-xl border transition-all ${s2.tipoServicio===s.value?"border-[#B3985B] bg-[#B3985B]/10":"border-[#2a2a2a] hover:border-[#3a3a3a]"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <p className={`text-sm font-semibold ${s2.tipoServicio===s.value?"text-[#B3985B]":"text-white"}`}>{s.label}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de evento */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#B3985B] mb-3 uppercase tracking-wider">Tipo de evento</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EVENTOS_CARDS.map(e=>(
                <button key={e.value} type="button" onClick={()=>setS2(p=>({...p,tipoEvento:e.value}))} className={`py-3 rounded-xl border text-xs font-medium transition-all text-center ${s2.tipoEvento===e.value?"border-[#B3985B] bg-[#B3985B]/10 text-white":"border-[#2a2a2a] text-gray-500 hover:text-white hover:border-[#444]"}`}>
                  <div className="text-lg mb-1">{e.icon}</div>{e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detalles */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#B3985B] mb-3 uppercase tracking-wider">Detalles del evento</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Nombre del evento / proyecto</label><input value={s2.nombreEvento} onChange={e=>setS2(p=>({...p,nombreEvento:e.target.value}))} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" placeholder="Ej: Boda García · Festival Verano 2025 · Lanzamiento Nike"/></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Fecha estimada</label><input type="date" value={s2.fechaEventoEstimada} onChange={e=>setS2(p=>({...p,fechaEventoEstimada:e.target.value}))} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"/></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Asistentes estimados</label><input type="number" value={s2.asistentesEstimados} onChange={e=>setS2(p=>({...p,asistentesEstimados:e.target.value}))} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" placeholder="Ej: 300"/></div>
              <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Ciudad / Venue</label><input value={s2.lugarEstimado} onChange={e=>setS2(p=>({...p,lugarEstimado:e.target.value}))} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" placeholder="Ej: Querétaro · Foro Independencia"/></div>
            </div>
          </div>

          {/* Notas */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#B3985B] mb-2 uppercase tracking-wider">Notas iniciales (opcional)</h2>
            <textarea value={s2.notas} onChange={e=>setS2(p=>({...p,notas:e.target.value}))} rows={3} placeholder="Contexto importante, peticiones especiales, rider recibido..." className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"/>
          </div>

          <div className="flex gap-3 justify-between pb-6">
            <button onClick={()=>{setStep(1);setError("");}} className="px-5 py-2.5 rounded-xl border border-[#333] text-gray-400 hover:text-white text-sm transition-colors">← Volver</button>
            <button onClick={() => crearActivo()} disabled={loading} className="px-6 py-2.5 rounded-xl bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] transition-colors disabled:opacity-50">{loading?"Creando...":"Crear trato →"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
