import { useState, useRef, useCallback, useEffect } from "react";
import TimePicker from "@/components/ui/TimePicker";
import VenuePicker from "@/components/ui/VenuePicker";
import { SelectorEquiposInventario, type SeleccionEquipos } from '@/components/SelectorEquiposInventario';
import { Combobox } from "@/components/Combobox";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { isLegacyString, parseLinks } from "@/utils/legacyText";

const PASOS_DISCOVERY = [
  { id: 1, label: "Info Básica", icon: "📋" },
  { id: 2, label: "Detalles", icon: "⚙️" },
  { id: 3, label: "Operativo", icon: "🚚" },
  { id: 4, label: "Comercial", icon: "🤝" },
];

const RENTA_NIVEL = [
  { id: "SOLO_RENTA",    label: "Solo renta",           desc: "Cliente instala y opera" },
  { id: "RENTA_ENTREGA", label: "Renta + entrega",      desc: "Llevamos y recogemos" },
  { id: "RENTA_MONTAJE", label: "Renta + montaje",      desc: "Instalamos, cliente opera" },
  { id: "RENTA_FULL",    label: "Renta + operación",    desc: "Instalamos + técnico" },
];

const RENTA_ENTREGA = [
  { id: "RECOGE_BODEGA",  label: "Recoge en bodega",     desc: "Querétaro, Qro." },
  { id: "ENTREGA_BODEGA", label: "Llevamos a su bodega", desc: "A su almacén" },
  { id: "ENTREGA_VENUE",  label: "Llevamos al venue",    desc: "Directo al evento" },
];

const EXTRAS_EVENTO: Record<string, any[]> = {
  SOCIAL: [
    { id: "PISTA_BAILE",  label: "Pista de baile iluminada",  grupo: "extra" },
    { id: "ILUM_ARQ",     label: "Iluminación arquitectónica", grupo: "extra" },
    { id: "CHISPEROS",    label: "Chisperos",                  grupo: "extra" },
    { id: "HUMO_FRIO",    label: "Humo frío",                  grupo: "extra" },
    { id: "CONFETI",      label: "Cañones de confeti",         grupo: "extra" },
    { id: "KARAOKE",      label: "Karaoke",                    grupo: "extra" },
  ],
  EMPRESARIAL: [
    { id: "AUDIO_CONF",   label: "Sistema para conferencia",  grupo: "extra" },
    { id: "STREAMING",    label: "Streaming en vivo",         grupo: "extra" },
    { id: "GRABACION",    label: "Grabación del evento",      grupo: "extra" },
    { id: "BRANDING",     label: "Branding en pantallas",     grupo: "extra" },
    { id: "ESCENOGRAFIA", label: "Escenografía / Backdrop",   grupo: "extra" },
  ],
  MUSICAL: [
    { id: "EFECTOS",      label: "Efectos especiales",        grupo: "extra" },
    { id: "CHISPEROS",    label: "Chisperos",                 grupo: "extra" },
    { id: "HUMO_FRIO",    label: "Humo frío",                 grupo: "extra" },
    { id: "CONFETI",      label: "Confeti",                   grupo: "extra" },
    { id: "STREAMING",    label: "Streaming en vivo",         grupo: "extra" },
  ],
  OTRO: [
    { id: "EFECTOS",            label: "Efectos especiales",  grupo: "extra" },
    { id: "PRODUCCION_GENERAL", label: "Producción completa", grupo: "extra" },
  ],
};

export default function DiscoveryForm({ id, trato, setTrato, onComplete }: { id: string, trato: any, setTrato: any, onComplete?: () => void }) {
  const toast = useToast();
  
  
  
  
  const [tipoEventoUnlocked, setTipoEventoUnlocked] = useState(!trato?.tipoEvento);
  const [discoveryExpanded, setDiscoveryExpanded] = useState(!trato?.descubrimientoCompleto);
  
  // Archivos state
  const [archivos, setArchivos] = useState<any[]>([]);
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
  
  const [linkDraft, setLinkDraft] = useState({ label: '', url: '' });
  const [linkUrlError, setLinkUrlError] = useState('');
  const [briefAplica, setBriefAplica] = useState<boolean | null>(null);
  const [levantamientoCreado, setLevantamientoCreado] = useState(false);
  const [briefGuardado, setBriefGuardado] = useState(false);

  useEffect(() => {
    fetch(`/api/tratos/${id}/archivos`)
      .then(r => r.json())
      .then(d => setArchivos(d.archivos || []))
      .catch(() => {});
  }, [id]);

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/tratos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return null;
    }
    const d = await res.json();
    if (d.trato) {
      setTrato((prev: any) => prev ? { ...prev, ...d.trato } : prev);
    }
    return d;
  }

  async function subirArchivo(e: React.ChangeEvent<HTMLInputElement>, tipo: string) {
    if (!e.target.files?.length) return;
    setUploadingTipo(tipo);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    formData.append("tipo", tipo);
    try {
      const res = await fetch(`/api/tratos/${id}/archivos`, { method: "POST", body: formData });
      if (res.ok) {
        const d = await res.json();
        setArchivos(prev => [...prev, d.archivo]);
        toast.success("Archivo subido correctamente");
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Error al subir");
      }
    } catch {
      toast.error("Error de red al subir");
    } finally {
      setUploadingTipo(null);
    }
  }

  async function eliminarArchivo(archivoId: string) {
    if (!window.confirm("¿Seguro de eliminar este archivo?")) return;
    try {
      const res = await fetch(`/api/tratos/${id}/archivos?archivoId=${archivoId}`, { method: "DELETE" });
      if (res.ok) {
        setArchivos(prev => prev.filter(a => a.id !== archivoId));
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Error al eliminar");
      }
    } catch {
      toast.error("Error de red");
    }
  }

  const [tradeCalificado, setTradeCalificado] = useState(false);
  const [tradeNivel, setTradeNivel] = useState<number | null>(null);
  const [savingTrade, setSavingTrade] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [skipGate, setSkipGate] = useState(false);
  // Cambiar cliente del trato
  const [cambiarCliente, setCambiarCliente] = useState(false);
  const [clientesOpciones, setClientesOpciones] = useState<{ value: string; label: string }[]>([]);
  const [savingCliente, setSavingCliente] = useState(false);
  const autoSaveDiscTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveScoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Paso activo del wizard de descubrimiento (persisted in localStorage)
  const [pasoActivo, setPasoActivo] = useState(1);
  const [saving, setSaving] = useState(false);
  const [creandoCotizacion, setCreandoCotizacion] = useState(false);
  const [eliminandoCotizacion, setEliminandoCotizacion] = useState<string | null>(null);

  // Discovery state
  const [discForm, setDiscForm] = useState({
    tipoEvento: "MUSICAL",
    subtipoEvento: "",
    nombreEvento: "",
    fechaEventoEstimada: "",
    lugarEstimado: "",
    asistentesEstimados: "",
    diasServicio: "",
    presupuestoEstimado: "",
    tipoServicio: "",
    ideasReferencias: "",
    notas: "",
    serviciosInteres: [] as string[],
    equiposInteres: "",
    notasEquipos: "",
    familyAndFriends: false,
    realizarRender: false,
    tradeAplica: false,
    // Campos específicos de Renta
    rentaModalidadServicio: "",
    rentaModalidadEntrega: "",
    rentaDireccionEntrega: "",
    rentaFechaEntrega: "",
    rentaHoraEntrega: "",
    rentaFechaDevolucion: "",
    rentaHoraDevolucion: "",
    rentaDescripcionEquipos: "",
    rentaTecnicoPropio: "",
    horaInicioEvento: "",
    horaFinEvento: "",
    duracionMontajeHrs: "",
    ventanaMontajeInicio: "",
    ventanaMontajeFin: "",
    horaTerminoMontaje: "",
    contactoVenueNombre: "",
    contactoVenueTelefono: "",
    rentaNotas: "",
    contactoDecisorNombre: "",
    contactoDecisorCargo: "",
  });

  const toggleServicio = (idService: string) => {
    setDiscForm(p => {
      const isSel = p.serviciosInteres.includes(idService);
      const n = isSel ? p.serviciosInteres.filter(s => s !== idService) : [...p.serviciosInteres, idService];
      const newState = { ...p, serviciosInteres: n };
      autoSaveDisc(newState);
      return newState;
    });
  };

  const autoSaveDisc = useCallback((form: typeof discForm) => {
    if (autoSaveDiscTimer.current) clearTimeout(autoSaveDiscTimer.current);
    setAutoSaveStatus("saving");
    autoSaveDiscTimer.current = setTimeout(async () => {
      const isRenta = form.tipoServicio === "RENTA";
      await patch({
        tipoEvento: form.tipoEvento,
        nombreEvento: form.nombreEvento || null,
        fechaEventoEstimada: form.fechaEventoEstimada === "por-definir" ? null : (form.fechaEventoEstimada || null),
        lugarEstimado: form.lugarEstimado === "por-definir" ? "Por definir" : (form.lugarEstimado || null),
        asistentesEstimados: form.asistentesEstimados ? parseInt(form.asistentesEstimados) : null,
        diasServicio: form.diasServicio ? parseInt(form.diasServicio) : null,
        presupuestoEstimado: form.presupuestoEstimado ? parseFloat(form.presupuestoEstimado) : null,
        tipoServicio: form.tipoServicio || null,
        notas: form.notas || null,
        familyAndFriends: form.familyAndFriends,
        realizarRender: form.realizarRender,
        tradeCalificado: form.tradeAplica,
        horaInicioEvento: form.horaInicioEvento || null,
        horaFinEvento: form.horaFinEvento || null,
        duracionMontajeHrs: form.duracionMontajeHrs ? parseFloat(form.duracionMontajeHrs) : null,
        ventanaMontajeInicio: form.ventanaMontajeInicio || null,
        ventanaMontajeFin: form.ventanaMontajeFin || null,
        horaTerminoMontaje: form.horaTerminoMontaje || null,
        contactoVenueNombre: form.contactoVenueNombre || null,
        contactoVenueTelefono: form.contactoVenueTelefono || null,
        serviciosInteres: JSON.stringify(form.serviciosInteres),
        equiposInteres: form.equiposInteres || null,
        ideasReferencias: isRenta
          ? JSON.stringify({
              modalidadServicio: form.rentaModalidadServicio || null,
              modalidadEntrega: form.rentaModalidadEntrega || null,
              direccionEntrega: form.rentaDireccionEntrega || null,
              fechaEntrega: form.rentaFechaEntrega || null,
              horaEntrega: form.rentaHoraEntrega || null,
              fechaDevolucion: form.rentaFechaDevolucion || null,
              horaDevolucion: form.rentaHoraDevolucion || null,
              descripcionEquipos: form.rentaDescripcionEquipos || null,
              tecnicoPropio: form.rentaTecnicoPropio || null,
              notas: form.rentaNotas || null,
            })
          : (form.ideasReferencias || null),
      });
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    }, 1200);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function guardarDescubrimiento(completar = false) {
    setSaving(true);
    const isRenta = discForm.tipoServicio === "RENTA";
    const payload: Record<string, unknown> = {
      tipoEvento: discForm.tipoEvento,
      subtipoEvento: discForm.subtipoEvento || null,
      nombreEvento: discForm.nombreEvento || null,
      fechaEventoEstimada: discForm.fechaEventoEstimada === "por-definir" ? null : (discForm.fechaEventoEstimada || null),
      lugarEstimado: discForm.lugarEstimado === "por-definir" ? "Por definir" : (discForm.lugarEstimado || null),
      asistentesEstimados: discForm.asistentesEstimados ? parseInt(discForm.asistentesEstimados) : null,
      diasServicio: discForm.diasServicio ? parseInt(discForm.diasServicio) : null,
      presupuestoEstimado: discForm.presupuestoEstimado ? parseFloat(discForm.presupuestoEstimado) : null,
      tipoServicio: discForm.tipoServicio || null,
      notas: discForm.notas || null,
      familyAndFriends: discForm.familyAndFriends,
      realizarRender: discForm.realizarRender,
      tradeCalificado: discForm.tradeAplica,
      horaInicioEvento:     discForm.horaInicioEvento || null,
      horaFinEvento:        discForm.horaFinEvento || null,
      duracionMontajeHrs:   discForm.duracionMontajeHrs ? parseFloat(discForm.duracionMontajeHrs) : null,
      ventanaMontajeInicio: discForm.ventanaMontajeInicio || null,
      ventanaMontajeFin:    discForm.ventanaMontajeFin || null,
      horaTerminoMontaje:   discForm.horaTerminoMontaje || null,
      contactoVenueNombre:  discForm.contactoVenueNombre || null,
      contactoVenueTelefono:discForm.contactoVenueTelefono || null,
      serviciosInteres: JSON.stringify(discForm.serviciosInteres),
      equiposInteres: discForm.equiposInteres || null,
      ideasReferencias: isRenta
        ? JSON.stringify({
            modalidadServicio:  discForm.rentaModalidadServicio || null,
            modalidadEntrega:   discForm.rentaModalidadEntrega || null,
            direccionEntrega:   discForm.rentaDireccionEntrega || null,
            fechaEntrega:       discForm.rentaFechaEntrega || null,
            horaEntrega:        discForm.rentaHoraEntrega || null,
            fechaDevolucion:    discForm.rentaFechaDevolucion || null,
            horaDevolucion:     discForm.rentaHoraDevolucion || null,
            descripcionEquipos: discForm.rentaDescripcionEquipos || null,
            tecnicoPropio:      discForm.rentaTecnicoPropio || null,
            notas:              discForm.rentaNotas || null,
          })
        : (discForm.ideasReferencias || null),
    };
    payload.contactoDecisorNombre = discForm.contactoDecisorNombre || null;
    payload.contactoDecisorCargo = discForm.contactoDecisorCargo || null;
    if (completar) {
      payload.descubrimientoCompleto = true;
      payload.etapa = "OPORTUNIDAD";
    }
    const d = await patch(payload);
    if (d) setTrato((prev: any) => prev ? { ...prev, ...d.trato } : prev);
    setSaving(false);
    if (completar && onComplete) onComplete();
  }

  function addLink() {
    const url = linkDraft.url.trim();
    const label = linkDraft.label.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setLinkUrlError('URL inválida — debe empezar con http:// o https://');
      return;
    }
    setLinkUrlError('');
    const current = parseLinks(discForm.ideasReferencias);
    const next = [...current, { label: label || url, url }];
    setDiscForm(p => ({ ...p, ideasReferencias: JSON.stringify(next) }));
    setLinkDraft({ label: '', url: '' });
  }

  function removeLink(idx: number) {
    const current = parseLinks(discForm.ideasReferencias);
    const next = current.filter((_, i) => i !== idx);
    setDiscForm(p => ({ ...p, ideasReferencias: next.length > 0 ? JSON.stringify(next) : null as unknown as string }));
  }


  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden w-full">
                  {/* Step tabs */}
            <div className="px-5 pt-4 pb-2 overflow-x-auto border-b border-[#1a1a1a]">
              <div className="flex gap-1 min-w-max pb-1">
                {PASOS_DISCOVERY.map(paso => (
                  <button key={paso.id} onClick={() => { setPasoActivo(paso.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      pasoActivo === paso.id
                        ? "bg-[#B3985B] text-black"
                        : "bg-[#111] text-gray-500 hover:text-white border border-[#222] hover:border-[#444]"
                    }`}>
                    {paso.icon} {paso.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-5">

            {/* PASO 1: Información básica */}
            {pasoActivo === 1 && (<div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Tipo de evento</label>
                </div>
                {discForm.tipoEvento && !tipoEventoUnlocked ? (
                  <div className="flex items-center gap-3 px-3 py-2 bg-[#111] border border-[#1e1e1e] rounded-lg w-fit">
                    <span className="text-sm text-white font-medium">
                      {discForm.tipoEvento === "MUSICAL" ? "🎵 Musical" : discForm.tipoEvento === "SOCIAL" ? "🥂 Social" : discForm.tipoEvento === "EMPRESARIAL" ? "🏢 Empresarial" : "📅 Otro"}
                    </span>
                    <button onClick={() => setTipoEventoUnlocked(true)} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">cambiar</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {["MUSICAL", "SOCIAL", "EMPRESARIAL", "OTRO"].map(te => (
                      <button key={te} onClick={() => { setDiscForm(p => ({ ...p, tipoEvento: te, subtipoEvento: "", serviciosInteres: [] })); setTipoEventoUnlocked(false); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        discForm.tipoEvento === te
                          ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10"
                          : "border-[#333] text-gray-500 hover:text-white hover:border-[#555]"
                      }`}>
                      {te === "MUSICAL" ? "🎵 Musical" : te === "SOCIAL" ? "🥂 Social" : te === "EMPRESARIAL" ? "🏢 Empresarial" : "📅 Otro"}
                    </button>
                  ))}
                  </div>
                )}
                
                {/* Subtipo de evento */}
                {discForm.tipoEvento && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-400 block mb-2">Subtipo de evento (puedes seleccionar varios)</label>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const opts = discForm.tipoEvento === "MUSICAL" ? ["Concierto", "Festival", "Música Electrónica", "Presentación Musical"] :
                                     discForm.tipoEvento === "SOCIAL" ? ["Boda", "XV Años", "Bautizo", "Cumpleaños", "Fiesta Privada"] :
                                     discForm.tipoEvento === "EMPRESARIAL" ? ["Congreso / Convención", "Lanzamiento de Marca", "Feria / Expo", "Taller / Capacitación"] : [];
                        const actuales = discForm.subtipoEvento ? discForm.subtipoEvento.split(', ') : [];
                        return (
                          <>
                            {opts.map(opt => (
                              <button key={opt} type="button" onClick={() => {
                                const nuevos = actuales.includes(opt) ? actuales.filter(a => a !== opt) : [...actuales, opt].filter(x => x && !x.startsWith("Otro"));
                                setDiscForm(p => ({ ...p, subtipoEvento: nuevos.join(', ') }));
                              }}
                              className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${actuales.includes(opt) ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-500 hover:text-white"}`}>
                                {opt}
                              </button>
                            ))}
                            <button type="button" onClick={() => {
                                const isOtro = actuales.some(a => a.startsWith("Otro"));
                                setDiscForm(p => ({ ...p, subtipoEvento: isOtro ? actuales.filter(a => !a.startsWith("Otro")).join(', ') : [...actuales, "Otro"].join(', ') }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${actuales.some(a => a.startsWith("Otro")) ? "border-[#B3985B] text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-500 hover:text-white"}`}>
                              Otro
                            </button>
                          </>
                        );
                      })()}
                    </div>
                    {discForm.subtipoEvento?.includes("Otro") && (
                      <input type="text" placeholder="Especifica el otro subtipo..."
                        onChange={e => {
                          const actuales = discForm.subtipoEvento.split(', ').filter(x => !x.startsWith("Otro"));
                          setDiscForm(p => ({ ...p, subtipoEvento: [...actuales, `Otro: ${e.target.value}`].join(', ') }));
                        }}
                        className="mt-3 w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                      />
                    )}
                  </div>
                )}
              </div>

            {/* Step 1 continuation: base fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 block mb-2">Tipo de servicio</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { value: "RENTA", label: "Renta de equipo", icon: "📦", desc: "Solo equipo sin operación técnica compleja." },
                    { value: "PRODUCCION_TECNICA", label: "Producción Técnica", icon: "⚙️", desc: "Equipo, operación y diseño técnico." },
                    { value: "DIRECCION_TECNICA", label: "Dirección Técnica", icon: "📋", desc: "Coordinación y gestión de proveedores externos." }
                  ].map(ts => (
                    <button key={ts.value} type="button" onClick={() => setDiscForm(p => ({ ...p, tipoServicio: ts.value }))}
                      className={`text-left p-4 rounded-xl border transition-all ${discForm.tipoServicio === ts.value ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#222] bg-[#111] hover:border-[#444]"}`}>
                      <div className="text-2xl mb-2">{ts.icon}</div>
                      <p className={`text-sm font-semibold mb-1 ${discForm.tipoServicio === ts.value ? "text-[#B3985B]" : "text-white"}`}>{ts.label}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{ts.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nombre del evento / proyecto</label>
                <input value={discForm.nombreEvento} onChange={e => setDiscForm(p => ({ ...p, nombreEvento: e.target.value }))}
                  placeholder="Ej: Boda García-López, Concierto Verano..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Presupuesto estimado del cliente</label>
                <input type="number" value={discForm.presupuestoEstimado} onChange={e => setDiscForm(p => ({ ...p, presupuestoEstimado: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">Fecha estimada del evento *</label>
                  <button type="button" onClick={() => setDiscForm(p => ({ ...p, fechaEventoEstimada: p.fechaEventoEstimada === "por-definir" ? "" : "por-definir" }))}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${discForm.fechaEventoEstimada === "por-definir" ? "border-[#B3985B]/60 text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-600 hover:text-gray-400"}`}>
                    Por definir
                  </button>
                </div>
                {discForm.fechaEventoEstimada === "por-definir" ? (
                  <div className="w-full bg-[#1a1a1a] border border-[#B3985B]/30 rounded-lg px-3 py-2 text-[#B3985B] text-sm italic">Fecha por definir</div>
                ) : (
                  <input type="date" value={discForm.fechaEventoEstimada} onChange={e => setDiscForm(p => ({ ...p, fechaEventoEstimada: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">Ciudad / Lugar del evento *</label>
                  <button type="button" onClick={() => setDiscForm(p => ({ ...p, lugarEstimado: p.lugarEstimado === "por-definir" ? "" : "por-definir" }))}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${discForm.lugarEstimado === "por-definir" ? "border-[#B3985B]/60 text-[#B3985B] bg-[#B3985B]/10" : "border-[#333] text-gray-600 hover:text-gray-400"}`}>
                    Por definir
                  </button>
                </div>
                {discForm.lugarEstimado === "por-definir" ? (
                  <div className="w-full bg-[#1a1a1a] border border-[#B3985B]/30 rounded-lg px-3 py-2 text-[#B3985B] text-sm italic">Lugar por definir</div>
                ) : (
                  <VenuePicker value={discForm.lugarEstimado} onChange={(v) => setDiscForm(p => ({ ...p, lugarEstimado: v }))} placeholder="Ej: CDMX · Salón Versalles" />
                )}
              </div>

              {/* Días de servicio */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Días de servicio del equipo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="1" max="30"
                    value={discForm.diasServicio}
                    onChange={e => setDiscForm(p => ({ ...p, diasServicio: e.target.value }))}
                    placeholder="1"
                    className="w-24 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                  <span className="text-xs text-gray-500">día(s) · se pre-llena en la cotización</span>
                </div>
              </div>



            </div>

            </div>)} {/* /paso1 */}

            {/* PASO 2: Servicios de interés */}
            {pasoActivo === 2 && (<div className="space-y-4">
              {discForm.tipoServicio === "RENTA" ? (
              <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold">Detalles de renta</p>

                {/* Descripción de equipos */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Descripción del equipo solicitado (rider o listado libre)</label>
                  <textarea value={discForm.rentaDescripcionEquipos}
                    onChange={e => setDiscForm(p => ({ ...p, rentaDescripcionEquipos: e.target.value }))}
                    rows={3} placeholder="Ej: 2 bafles EV EKX-15P, 1 sub EKX-18SP, 4 micrófonos inalámbricos Shure BLX..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                </div>

                {/* Nivel de servicio */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Nivel de servicio</label>
                  <div className="grid grid-cols-2 gap-2">
                    {RENTA_NIVEL.map(n => (
                      <button key={n.id} onClick={() => setDiscForm(p => ({ ...p, rentaModalidadServicio: n.id }))}
                        className={`px-3 py-2.5 rounded-lg text-left transition-colors border ${
                          discForm.rentaModalidadServicio === n.id
                            ? "border-[#B3985B] bg-[#B3985B]/10"
                            : "border-[#333] hover:border-[#555]"
                        }`}>
                        <p className={`text-xs font-medium ${discForm.rentaModalidadServicio === n.id ? "text-[#B3985B]" : "text-white"}`}>{n.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{n.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modalidad de entrega */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Modalidad de entrega</label>
                  <div className="grid grid-cols-3 gap-2">
                    {RENTA_ENTREGA.map(e => (
                      <button key={e.id} onClick={() => setDiscForm(p => ({ ...p, rentaModalidadEntrega: e.id }))}
                        className={`px-3 py-2.5 rounded-lg text-left transition-colors border ${
                          discForm.rentaModalidadEntrega === e.id
                            ? "border-[#B3985B] bg-[#B3985B]/10"
                            : "border-[#333] hover:border-[#555]"
                        }`}>
                        <p className={`text-xs font-medium ${discForm.rentaModalidadEntrega === e.id ? "text-[#B3985B]" : "text-white"}`}>{e.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{e.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dirección + fechas de entrega/devolución */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Dirección de entrega (si aplica)</label>
                    <input value={discForm.rentaDireccionEntrega}
                      onChange={e => setDiscForm(p => ({ ...p, rentaDireccionEntrega: e.target.value }))}
                      placeholder="Calle, colonia, ciudad, CP"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Fecha de entrega del equipo</label>
                    <input type="date" value={discForm.rentaFechaEntrega}
                      onChange={e => setDiscForm(p => ({ ...p, rentaFechaEntrega: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Hora de entrega</label>
                    <TimePicker value={discForm.rentaHoraEntrega} onChange={v => setDiscForm(p => ({ ...p, rentaHoraEntrega: v }))} placeholder="Hora entrega" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Fecha de devolución/recolección</label>
                    <input type="date" value={discForm.rentaFechaDevolucion}
                      onChange={e => setDiscForm(p => ({ ...p, rentaFechaDevolucion: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Hora de recolección</label>
                    <TimePicker value={discForm.rentaHoraDevolucion} onChange={v => setDiscForm(p => ({ ...p, rentaHoraDevolucion: v }))} placeholder="Hora recolección" />
                  </div>
                </div>

                {/* Técnico propio */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">¿El cliente tiene técnico propio?</label>
                  <div className="flex gap-2">
                    {["Sí", "No", "Parcialmente"].map(op => (
                      <button key={op} onClick={() => setDiscForm(p => ({ ...p, rentaTecnicoPropio: op }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          discForm.rentaTecnicoPropio === op
                            ? "border-[#B3985B] text-black bg-[#B3985B]"
                            : "border-[#333] text-gray-400 hover:border-[#555] hover:text-white"
                        }`}>{op}</button>
                    ))}
                  </div>
                </div>

                {/* Notas de la renta */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Notas adicionales de la renta</label>
                  <textarea value={discForm.rentaNotas}
                    onChange={e => setDiscForm(p => ({ ...p, rentaNotas: e.target.value }))}
                    rows={3} placeholder="Cualquier información adicional sobre la renta, condiciones especiales, preferencias del cliente..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                </div>
              </div>
            ) : discForm.tipoServicio === "DIRECCION_TECNICA" ? (
              /* ── DIRECCIÓN TÉCNICA: Alcance del servicio ── */
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold mb-4">Alcance del servicio</p>

                  {/* Áreas de servicio */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2">¿Qué áreas abarca este proyecto? <span className="text-gray-600">(selecciona las que apliquen)</span></label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "DT_CONCEPTUAL",    icon: "🎨", label: "Desarrollo conceptual",    desc: "Concepto creativo, ambientación, propuesta visual" },
                        { id: "DT_PROVEEDORES",   icon: "🤝", label: "Gestión de proveedores",   desc: "Coordinación, contratación y supervisión de terceros" },
                        { id: "DT_PT_PROPIA",     icon: "🎛", label: "PT propia Mainstage",      desc: "Nuestro propio servicio de producción técnica incluido" },
                        { id: "DT_LOGISTICA",     icon: "📦", label: "Logística integral",        desc: "Transporte, tiempos, cronograma y coordinación general" },
                        { id: "DT_PRESUPUESTO",   icon: "💰", label: "Control de presupuesto",   desc: "Gestión del presupuesto global del evento" },
                        { id: "DT_SUPERVISIÓN",   icon: "👁", label: "Supervisión en sitio",     desc: "Director técnico presente el día del evento" },
                      ].map(area => (
                        <button key={area.id}
                          onClick={() => toggleServicio(area.id)}
                          title={area.desc}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            discForm.serviciosInteres.includes(area.id)
                              ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]"
                              : "border-[#2a2a2a] text-gray-300 hover:border-[#555] hover:text-white"
                          }`}>
                          <span>{area.icon}</span>
                          <span>{area.label}</span>
                        </button>
                      ))}
                    </div>
                    {discForm.serviciosInteres.filter(s => s.startsWith("DT_")).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {discForm.serviciosInteres.filter(s => s.startsWith("DT_")).map(id => {
                          const area = [
                            { id: "DT_CONCEPTUAL",   desc: "Desarrollo conceptual, ambientación y propuesta visual del evento" },
                            { id: "DT_PROVEEDORES",  desc: "Coordinación, contratación y supervisión de proveedores externos" },
                            { id: "DT_PT_PROPIA",    desc: "Servicio de producción técnica de Mainstage Pro incluido en el paquete" },
                            { id: "DT_LOGISTICA",    desc: "Transporte, cronograma y coordinación general del evento" },
                            { id: "DT_PRESUPUESTO",  desc: "Gestión y control del presupuesto global" },
                            { id: "DT_SUPERVISIÓN",  desc: "Director técnico presente en sitio el día del evento" },
                          ].find(a => a.id === id);
                          return area ? (
                            <p key={id} className="text-[11px] text-gray-600 leading-relaxed">› {area.desc}</p>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>

                  {/* Nivel de involucramiento */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2">Nivel de involucramiento esperado</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: "DT_ASESOR",      label: "Solo asesoría",          desc: "Guía y recomendaciones. El cliente ejecuta." },
                        { id: "DT_PARCIAL",     label: "Coordinación parcial",   desc: "Gestionamos algunas áreas; el cliente coordina el resto." },
                        { id: "DT_INTEGRAL",    label: "Dirección integral",     desc: "Mainstage toma el control total de producción y logística." },
                      ].map(niv => (
                        <button key={niv.id}
                          onClick={() => setDiscForm(p => {
                            const sinNiv = p.serviciosInteres.filter(s => !["DT_ASESOR","DT_PARCIAL","DT_INTEGRAL"].includes(s));
                            return { ...p, serviciosInteres: [...sinNiv, niv.id] };
                          })}
                          className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                            discForm.serviciosInteres.includes(niv.id)
                              ? "border-[#B3985B] bg-[#B3985B]/10"
                              : "border-[#2a2a2a] hover:border-[#444]"
                          }`}>
                          <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${discForm.serviciosInteres.includes(niv.id) ? "border-[#B3985B] bg-[#B3985B]" : "border-[#555]"}`} />
                          <div>
                            <p className={`text-sm font-medium ${discForm.serviciosInteres.includes(niv.id) ? "text-[#B3985B]" : "text-white"}`}>{niv.label}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">{niv.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Presupuesto global del evento */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-1">Presupuesto global del evento <span className="text-gray-600">(si el cliente lo comparte)</span></label>
                    <input
                      type="text"
                      value={discForm.presupuestoEstimado}
                      onChange={e => setDiscForm(p => ({ ...p, presupuestoEstimado: e.target.value }))}
                      placeholder="Ej: $300,000 MXN total del evento"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    />
                  </div>

                  {/* Asistentes estimados */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-1">Rango de asistentes aproximados</label>
                    <select
                      value={discForm.asistentesEstimados}
                      onChange={e => setDiscForm(p => ({ ...p, asistentesEstimados: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    >
                      <option value="">— Seleccionar rango —</option>
                      <option value="100">0 - 100 personas</option>
                      <option value="300">100 - 300 personas</option>
                      <option value="500">300 - 500 personas</option>
                      <option value="1000">500 - 1,000 personas</option>
                      <option value="2000">Más de 1,000 personas</option>
                    </select>
                  </div>

                  {/* Notas de DT */}
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Notas del proyecto / expectativas del cliente</label>
                    <textarea
                      value={discForm.notas}
                      onChange={e => setDiscForm(p => ({ ...p, notas: e.target.value }))}
                      rows={4}
                      placeholder="Describe las expectativas, complejidades, proveedores que ya tiene contratados, o cualquier información relevante para la dirección técnica..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                    />
                  </div>
                </div>

                {/* CTA Hacer propuesta — en paso 2 para DT (último paso) */}
                {!trato.descubrimientoCompleto && (
                  <div className="border border-[#B3985B]/30 bg-[#B3985B]/5 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white text-sm font-semibold">¿Ya tienes todo lo que necesitas?</p>
                      <p className="text-gray-500 text-xs mt-0.5">Es hora de preparar la propuesta de Dirección Técnica</p>
                    </div>
                    <Link
                      href={`/cotizaciones/nuevo?tratoId=${trato.id}&clienteId=${trato.cliente.id}`}
                      onClick={() => { if (!trato.descubrimientoCompleto) guardarDescubrimiento(true); }}
                      className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-5 py-2 rounded-lg transition-colors shrink-0"
                    >
                      Hacer propuesta →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* ── Selector de equipos del inventario ─────────────────── */}
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Categorías de equipo / inventario</label>
                  <p className="text-[11px] text-gray-600 mb-3">Selecciona las categorías de tu interés. Puedes marcar ☐ la categoría si no sabes aún qué equipo necesitas — lo definimos después. O despliega ▸ para elegir equipos específicos.</p>
                  <SelectorEquiposInventario
                    value={(() => {
                      try { return discForm.equiposInteres ? JSON.parse(discForm.equiposInteres as string) : { categorias: [], equipos: [] }; }
                      catch { return { categorias: [], equipos: [] }; }
                    })()}
                    onChange={(sel: SeleccionEquipos) => {
                      setDiscForm(p => ({ ...p, equiposInteres: JSON.stringify(sel) }));
                    }}
                  />
                </div>

                {/* ── Add-ons específicos del evento ─────────────────────── */}
                {(EXTRAS_EVENTO[discForm.tipoEvento] ?? EXTRAS_EVENTO.OTRO).length > 0 && (
                  <div>
                    <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2 font-semibold">Add-ons específicos del evento</p>
                    <div className="flex flex-wrap gap-2">
                      {(EXTRAS_EVENTO[discForm.tipoEvento] ?? EXTRAS_EVENTO.OTRO).map(srv => (
                        <button key={srv.id} onClick={() => toggleServicio(srv.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                            discForm.serviciosInteres.includes(srv.id)
                              ? "border-[#B3985B] text-black bg-[#B3985B]"
                              : "border-[#2a2a2a] text-gray-400 hover:border-[#555] hover:text-white"
                          }`}>
                          {srv.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* ── Notas Técnicas / Equipos Adicionales (Manual) ─────────────────────── */}
            <div className="pt-2">
              <label className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold block mb-2">Notas Técnicas y Equipo Adicional (Manual)</label>
              <p className="text-[11px] text-gray-500 mb-2">Detalla marcas, modelos específicos, o lista cualquier equipo que no hayas encontrado en las categorías.</p>
              <textarea
                value={discForm.notasEquipos || ""}
                onChange={e => setDiscForm(p => ({ ...p, notasEquipos: e.target.value }))}
                rows={4}
                placeholder="Ej: Necesitamos 4 micrófonos Shure ULXD, consola Digico SD12, o detalles adicionales técnicos..."
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
              />
            </div>

              {/* Asistentes estimados — visible en paso 2 para producción técnica (no DT ni RENTA) */}
              {discForm.tipoServicio !== "RENTA" && discForm.tipoServicio !== "DIRECCION_TECNICA" && (
                <div className="pt-2 border-t border-[#1a1a1a]">
                  <label className="text-xs text-gray-400 block mb-1">Rango de asistentes aproximados</label>
                  <select
                    value={discForm.asistentesEstimados}
                    onChange={e => setDiscForm(p => ({ ...p, asistentesEstimados: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  >
                    <option value="">— Seleccionar rango —</option>
                    <option value="100">0 - 100 personas</option>
                    <option value="300">100 - 300 personas</option>
                    <option value="500">300 - 500 personas</option>
                    <option value="1000">500 - 1,000 personas</option>
                    <option value="2000">Más de 1,000 personas</option>
                  </select>
                </div>
              )}

              {/* Referencias y archivos del cliente — solo en paso 2 para RENTA; en paso 3 para producción */}
              {discForm.tipoServicio === "RENTA" && <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Referencias y archivos del cliente</p>
                {(["REFERENCIA", "DOCUMENTO"] as const).map((cat) => {
                  const catMeta = {
                    REFERENCIA: { label: "Referencias del cliente", icon: "🖼️", accept: "image/*,.pdf", hint: "Imágenes o docs que el cliente comparte como inspiración" },
                    DOCUMENTO:  { label: "Otros documentos",  icon: "📁", accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip", hint: "Contratos, riders, planos, cualquier archivo" },
                  }[cat];
                  const catArchivos = archivos.filter(a => a.tipo === cat);
                  const uploading = uploadingTipo === cat;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-400 font-medium">{catMeta.icon} {catMeta.label}</p>
                          <p className="text-[11px] text-gray-600 mt-0.5">{catMeta.hint}</p>
                        </div>
                        <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[11px] cursor-pointer transition-colors ${uploading ? "opacity-40 pointer-events-none text-gray-500" : "text-gray-500 hover:text-white hover:border-[#444]"}`}>
                          {uploading ? "Subiendo..." : "+ Agregar"}
                          <input type="file" className="hidden" accept={catMeta.accept} multiple onChange={e => subirArchivo(e, cat)} />
                        </label>
                      </div>
                      {catArchivos.length === 0 ? (
                        <p className="text-gray-700 text-[11px] italic">Sin archivos aún</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {catArchivos.map((a) => {
                            const esImagen = /\.(jpe?g|png|gif|webp|heic)$/i.test(a.url);
                            return (
                              <div key={a.id} className="group relative bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                                {esImagen ? (
                                  <a href={a.url} target="_blank" rel="noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={a.url} alt={a.nombre} className="w-full h-20 object-cover hover:opacity-90 transition-opacity" />
                                  </a>
                                ) : (
                                  <a href={a.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-1 px-2 py-4 hover:bg-[#1a1a1a] transition-colors min-h-[5rem]">
                                    <span className="text-xl">{/\.pdf$/i.test(a.url) ? "📄" : /\.(doc|docx)$/i.test(a.url) ? "📝" : /\.(xls|xlsx)$/i.test(a.url) ? "📊" : "📎"}</span>
                                    <span className="text-gray-400 text-[10px] truncate w-full text-center px-1">{a.nombre}</span>
                                  </a>
                                )}
                                <button onClick={() => eliminarArchivo(a.id)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-red-400 text-xs items-center justify-center hidden group-hover:flex hover:bg-red-900/60 transition-colors">×</button>
                                <p className="px-2 py-1 text-gray-600 text-[10px] truncate border-t border-[#1a1a1a]">{a.nombre}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>}

            </div>)} {/* /paso2 */}

            {/* PASO 3: Detalles operativos (solo producción técnica / no-renta) */}
            {discForm.tipoServicio !== "RENTA" && pasoActivo === 3 && (<div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider block mb-1.5">💡 Ideas / Referencias (links)</label>
                  <p className="text-[11px] text-gray-500 mb-3">Links de Pinterest, Instagram, Google Drive o cualquier sitio web que sirva de inspiración (ej: fotos de otros eventos, ideas de internet, etc.) para entender el mood del proyecto.</p>
                  {/* Legacy text — show as text, don't edit */}
                  {isLegacyString(discForm.ideasReferencias) && (
                    <p className="text-xs text-gray-500 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 mb-2 leading-relaxed">
                      {discForm.ideasReferencias}
                    </p>
                  )}

                  {/* Lista de links */}
                  {parseLinks(discForm.ideasReferencias).map((link, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1.5">
                      <a href={link.url} target="_blank" rel="noopener noreferrer"
                         className="flex-1 text-xs text-[#B3985B] hover:underline truncate">
                        {link.label} →
                      </a>
                      <button onClick={() => removeLink(i)}
                              className="text-gray-600 hover:text-red-400 transition-colors text-xs shrink-0">
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Input para agregar */}
                  <div className="flex gap-2 mt-1">
                    <input
                      value={linkDraft.label}
                      onChange={e => setLinkDraft(p => ({ ...p, label: e.target.value }))}
                      placeholder="Ej: Referencia de iluminación"
                      className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B] placeholder-gray-700"
                    />
                    <input
                      value={linkDraft.url}
                      onChange={e => { setLinkDraft(p => ({ ...p, url: e.target.value })); setLinkUrlError(''); }}
                      placeholder="https://..."
                      className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B] placeholder-gray-700"
                      onKeyDown={e => e.key === 'Enter' && addLink()}
                    />
                    <button onClick={addLink}
                            className="shrink-0 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-gray-300 hover:text-white hover:border-[#555] text-xs transition-colors">
                      + Agregar
                    </button>
                  </div>
                  {linkUrlError && <p className="text-red-400 text-xs mt-1">{linkUrlError}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Notas del descubrimiento</label>
                <textarea value={discForm.notas} onChange={e => setDiscForm(p => ({ ...p, notas: e.target.value }))}
                  rows={4} placeholder="Detalles específicos, necesidades especiales, contexto del evento, expectativas del cliente..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>

              {/* Referencias y archivos del cliente */}
              <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Referencias y archivos del cliente</p>
                {(["REFERENCIA", "DOCUMENTO"] as const).map((cat) => {
                  const catMeta = {
                    REFERENCIA: { label: "Referencias del cliente", icon: "🖼️", accept: "image/*,.pdf", hint: "Imágenes o docs que el cliente comparte como inspiración" },
                    DOCUMENTO:  { label: "Otros documentos",  icon: "📁", accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip", hint: "Contratos, riders, planos, cualquier archivo" },
                  }[cat];
                  const catArchivos = archivos.filter(a => a.tipo === cat);
                  const uploading = uploadingTipo === cat;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-400 font-medium">{catMeta.icon} {catMeta.label}</p>
                          <p className="text-[11px] text-gray-600 mt-0.5">{catMeta.hint}</p>
                        </div>
                        <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[11px] cursor-pointer transition-colors ${uploading ? "opacity-40 pointer-events-none text-gray-500" : "text-gray-500 hover:text-white hover:border-[#444]"}`}>
                          {uploading ? "Subiendo..." : "+ Agregar"}
                          <input type="file" className="hidden" accept={catMeta.accept} multiple onChange={e => subirArchivo(e, cat)} />
                        </label>
                      </div>
                      {catArchivos.length === 0 ? (
                        <p className="text-gray-700 text-[11px] italic">Sin archivos aún</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {catArchivos.map((a) => {
                            const esImagen = /\.(jpe?g|png|gif|webp|heic)$/i.test(a.url);
                            return (
                              <div key={a.id} className="group relative bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                                {esImagen ? (
                                  <a href={a.url} target="_blank" rel="noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={a.url} alt={a.nombre} className="w-full h-20 object-cover hover:opacity-90 transition-opacity" />
                                  </a>
                                ) : (
                                  <a href={a.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-1 px-2 py-4 hover:bg-[#1a1a1a] transition-colors min-h-[5rem]">
                                    <span className="text-xl">{/\.pdf$/i.test(a.url) ? "📄" : /\.(doc|docx)$/i.test(a.url) ? "📝" : /\.(xls|xlsx)$/i.test(a.url) ? "📊" : "📎"}</span>
                                    <span className="text-gray-400 text-[10px] truncate w-full text-center px-1">{a.nombre}</span>
                                  </a>
                                )}
                                <button onClick={() => eliminarArchivo(a.id)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-red-400 text-xs items-center justify-center hidden group-hover:flex hover:bg-red-900/60 transition-colors">×</button>
                                <p className="px-2 py-1 text-gray-600 text-[10px] truncate border-t border-[#1a1a1a]">{a.nombre}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>)} {/* /paso3 */}


            {/* PASO 4 (no-renta) / PASO 3 (renta): Comercial */}
            {(discForm.tipoServicio === "RENTA" ? pasoActivo === 3 : pasoActivo === 4) && (<div className="space-y-4">

              {/* Toggles: Mainstage Trade + Render */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-3">
                      <p className="text-sm text-white font-medium">Aplica Mainstage Trade</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">Intercambio de servicios por contenido o difusión. El cliente obtiene descuento a cambio de publicar en redes, crear contenido de calidad o mencionar a Mainstage Pro.</p>
                    </div>
                    <button
                      onClick={() => setDiscForm(p => ({ ...p, tradeAplica: !p.tradeAplica }))}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 overflow-hidden ${discForm.tradeAplica ? "bg-[#B3985B]" : "bg-[#333]"}`}>
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${discForm.tradeAplica ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>
                {discForm.tipoServicio !== "RENTA" && (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">Realizar render para facilitar venta</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Se habilitará el botón de solicitud en la cotización</p>
                    </div>
                    <button
                      onClick={() => setDiscForm(p => ({ ...p, realizarRender: !p.realizarRender }))}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 overflow-hidden ${discForm.realizarRender ? "bg-purple-600" : "bg-[#333]"}`}>
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${discForm.realizarRender ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>
                )}
              </div>

              {/* CTA Hacer propuesta — solo en el último paso */}
              {!trato.descubrimientoCompleto && (
                <div className="border border-[#B3985B]/30 bg-[#B3985B]/5 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white text-sm font-semibold">¿Ya tienes toda la información?</p>
                    <p className="text-gray-500 text-xs mt-0.5">Es hora de preparar la propuesta</p>
                  </div>
                  <Link
                    href={`/cotizaciones/nuevo?tratoId=${trato.id}&clienteId=${trato.cliente.id}`}
                    onClick={() => { if (!trato.descubrimientoCompleto) guardarDescubrimiento(true); }}
                    className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-5 py-2 rounded-lg transition-colors shrink-0"
                  >
                    Hacer propuesta →
                  </Link>
                </div>
              )}
            </div>)} {/* /paso5 */}

            </div> {/* /p-5 space-y-5 */}

            {/* Wizard footer navigation */}
            <div className="px-5 py-4 border-t border-[#1a1a1a] flex items-center justify-between">
              <button onClick={() => { setPasoActivo(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={pasoActivo === 1}
                className="text-xs text-gray-500 hover:text-white transition-colors disabled:opacity-30 px-3 py-2 rounded-lg border border-[#222] hover:border-[#444]">
                ← Anterior
              </button>
              <span className="text-[10px] text-gray-600">{pasoActivo} / {PASOS_DISCOVERY.length}</span>
              {pasoActivo < PASOS_DISCOVERY.length ? (
                <button onClick={() => { setPasoActivo(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-xs px-4 py-2 bg-[#B3985B] text-black font-semibold rounded-lg hover:bg-[#c9a96a] transition-colors">
                  Siguiente →
                </button>
              ) : (
                trato.descubrimientoCompleto
                  ? <span className="text-xs text-[#B3985B] font-medium">✓ Descubrimiento completo</span>
                  : <span />
              )}
            </div>
    </div>
  );
}
