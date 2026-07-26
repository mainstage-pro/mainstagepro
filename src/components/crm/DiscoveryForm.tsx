import { useState, useRef, useCallback, useEffect } from "react";
import { ClipboardList, Settings, Truck, Handshake, Music, Wine, Building2, Calendar, Package, Palette, Sliders, DollarSign, Eye, Image as ImageIcon, Folder, FileText, PenLine, BarChart3, Paperclip, Lightbulb, Phone, Zap, Camera, Monitor, Sparkles, PartyPopper, Clock, type LucideIcon } from "lucide-react";
import TimePicker from "@/components/ui/TimePicker";
import VenuePicker from "@/components/ui/VenuePicker";
import { SelectorEquiposInventario, type SeleccionEquipos } from '@/components/SelectorEquiposInventario';
import { Combobox } from "@/components/Combobox";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { isLegacyString, parseLinks } from "@/utils/legacyText";
import { parseFechasEvento } from "@/lib/fechas-evento";

const PASOS_DISCOVERY: Array<{ id: number; label: string; icon: LucideIcon }> = [
  { id: 1, label: "Info Básica", icon: ClipboardList },
  { id: 2, label: "Producción", icon: Settings },
  { id: 3, label: "Operativo", icon: Truck },
  { id: 4, label: "Comercial", icon: Handshake },
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

// Combina el día 1 (fechaEventoEstimada) con los días extra en una lista canónica.
// Devuelve el JSON a guardar (o null si es 0-1 día) y los días derivados del conteo.
function calcFechasEvento(form: { fechaEventoEstimada: string; fechasEventoExtra: string[] }): {
  fechasEvento: string | null;
  diasDerivados: number | null;
} {
  const dia1 = form.fechaEventoEstimada === "por-definir" ? "" : form.fechaEventoEstimada;
  if (!dia1) return { fechasEvento: null, diasDerivados: null };
  const lista = Array.from(new Set([dia1, ...form.fechasEventoExtra.filter(Boolean)])).sort();
  if (lista.length <= 1) return { fechasEvento: null, diasDerivados: null };
  return { fechasEvento: JSON.stringify(lista), diasDerivados: lista.length };
}

// Duración del evento a partir de las horas de inicio y fin ("HH:MM"). Si el fin
// es menor o igual al inicio, se asume que cruza medianoche (+24h). Devuelve un
// texto legible ("5h", "5h 30min") o null si faltan datos. Se guarda en
// `duracionEvento` para alimentar cotización, contrato y fichas operativas.
function calcDuracionEvento(inicio: string, fin: string): string | null {
  if (!inicio || !fin) return null;
  const [sh, sm] = inicio.split(":").map(Number);
  const [eh, em] = fin.split(":").map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return null;
  let m = (eh * 60 + em) - (sh * 60 + sm);
  if (m <= 0) m += 24 * 60; // cruza medianoche
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}min`;
  return min === 0 ? `${h}h` : `${h}h ${min}min`;
}

export default function DiscoveryForm({
  id, trato, setTrato, onComplete, readOnly = false,
  clientMode = false, token, huerfano = false, contacto, setContacto, modalidad,
}: {
  id: string, trato: any, setTrato: any, onComplete?: () => void, readOnly?: boolean,
  // Modalidad de la propuesta elegida en el paso previo: INVENTARIO (equipo Mainstage)
  // o CONTRA_RIDER (el cliente trae un rider específico / equipos de otras marcas).
  modalidad?: "INVENTARIO" | "CONTRA_RIDER",
  // ── Modo cliente (link público /f/[token]) ──────────────────────────────
  // Cuando clientMode=true el formulario guarda vía /api/f/[token] (POST con
  // `_discoveryMode`) en lugar de /api/tratos/[id], oculta la UI interna del
  // vendedor (propuesta, Trade, render) y muestra un botón "Enviar" final.
  clientMode?: boolean,
  token?: string,
  huerfano?: boolean,
  contacto?: { nombre: string; whatsapp: string; correo?: string; momentoContratacion?: string },
  setContacto?: (c: any) => void,
}) {
  const toast = useToast();
  // Rutas base según el modo. En modo cliente todo pasa por el endpoint por token.
  const archivosBase = clientMode ? `/api/f/${token}/archivos` : `/api/tratos/${id}/archivos`;
  
  
  
  
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
    // En modo huérfano aún no hay trato → no hay archivos que listar.
    if (clientMode && huerfano) return;
    fetch(archivosBase)
      .then(r => r.json())
      .then(d => setArchivos(d.archivos || []))
      .catch(() => {});
  }, [archivosBase, clientMode, huerfano]);

  async function patch(data: Record<string, unknown>) {
    // ── Modo cliente: guardar vía endpoint por token ──────────────────────
    if (clientMode) {
      const res = await fetch(`/api/f/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, _discoveryMode: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Error al guardar");
        return null;
      }
      const d = await res.json();
      // El trato local se mantiene sincronizado con lo que el cliente escribe.
      setTrato((prev: any) => prev ? { ...prev, ...data } : prev);
      return d;
    }

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

  async function patchCliente(data: Record<string, unknown>) {
    if (!trato?.cliente?.id) return null;
    const res = await fetch(`/api/clientes/${trato.cliente.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar información del cliente");
      return null;
    }
    const d = await res.json();
    if (d.cliente) {
      setTrato((prev: any) => prev ? { ...prev, cliente: { ...prev.cliente, ...d.cliente } } : prev);
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
      const res = await fetch(archivosBase, { method: "POST", body: formData });
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
      const res = await fetch(`${archivosBase}?archivoId=${archivoId}`, { method: "DELETE" });
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

  // Cliente state
  

  // Discovery state
  const [discForm, setDiscForm] = useState({
    tipoEvento: "MUSICAL",
    subtipoEvento: "",
    nombreEvento: "",
    fechaEventoEstimada: "",
    lugarEstimado: "",
    asistentesEstimados: "",
    diasServicio: "",
    // Días adicionales del evento (además del día 1 = fechaEventoEstimada). "YYYY-MM-DD"[]
    fechasEventoExtra: [] as string[],
    presupuestoEstimado: "",
    tipoServicio: "",
    ideasReferencias: "",
    notas: "",
    serviciosInteres: [] as string[],
    equiposInteres: "",
    notasEquipos: "",
    serviciosAdicionalesOtro: "",
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
    // Solo modo cliente: prefiere una llamada para consolidar el descubrimiento
    // o quiere la propuesta lo antes posible. "" = sin elegir.
    preferenciaContacto: "",
  });

  // Refs de apoyo para el auto-guardado global: el último formulario conocido
  // (para hacer flush al salir) y la firma de lo ya guardado (para no re-guardar
  // los datos de hidratación).
  const latestDiscRef = useRef(discForm);
  const lastSavedSigRef = useRef("");
  const autosaveArmedRef = useRef(false);
  // Última selección de equipos ya persistida en el servidor. Se usa para el
  // guardado INMEDIATO de `equiposInteres` (independiente del debounce global),
  // evitando re-guardar el valor hidratado.
  const equiposPersistidosRef = useRef<string | null>(null);
  useEffect(() => { latestDiscRef.current = discForm; });

  // Hidratar el formulario con la información ya capturada en el trato
  // (ej. nombre y fecha que se ingresan al crear el contacto en Venta Cerrada,
  // o datos guardados en visitas anteriores). Se ejecuta una sola vez para no
  // pisar ediciones en curso.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !trato) return;
    hydratedRef.current = true;
    const isRenta = trato.tipoServicio === "RENTA";
    let renta: Record<string, string> = {};
    if (isRenta && trato.ideasReferencias) {
      try { renta = JSON.parse(trato.ideasReferencias); } catch { renta = {}; }
    }
    let servicios: string[] = [];
    if (trato.serviciosInteres) {
      try { const s = JSON.parse(trato.serviciosInteres); if (Array.isArray(s)) servicios = s; } catch { /* noop */ }
    }
    // Respaldo local: si el servidor no trae equipos pero el navegador guardó un
    // borrador de este trato, lo recuperamos para que no se pierda la selección.
    let equiposRestore = trato.equiposInteres || "";
    let equiposRestauradoLocal = false;
    if (!equiposRestore && !readOnly && !clientMode && !huerfano && typeof window !== "undefined") {
      try {
        const local = localStorage.getItem(`disc-equipos-${trato.id}`);
        if (local) { equiposRestore = local; equiposRestauradoLocal = true; }
      } catch { /* noop */ }
    }
    setDiscForm(prev => {
      const hydrated = {
      ...prev,
      tipoEvento: trato.tipoEvento || prev.tipoEvento,
      subtipoEvento: trato.subtipoEvento || "",
      nombreEvento: trato.nombreEvento || "",
      fechaEventoEstimada: trato.fechaEventoEstimada ? String(trato.fechaEventoEstimada).split("T")[0] : "",
      lugarEstimado: trato.lugarEstimado === "Por definir" ? "por-definir" : (trato.lugarEstimado || ""),
      asistentesEstimados: trato.asistentesEstimados != null ? String(trato.asistentesEstimados) : "",
      diasServicio: trato.diasServicio != null ? String(trato.diasServicio) : "",
      // Días adicionales = todas las fechas guardadas menos el día 1 (fechaEventoEstimada)
      fechasEventoExtra: (() => {
        const dia1 = trato.fechaEventoEstimada ? String(trato.fechaEventoEstimada).split("T")[0] : "";
        return parseFechasEvento(trato.fechasEvento).filter((f) => f !== dia1);
      })(),
      presupuestoEstimado: trato.presupuestoEstimado != null ? String(trato.presupuestoEstimado) : "",
      tipoServicio: trato.tipoServicio || "",
      notas: trato.notas || "",
      serviciosInteres: servicios,
      equiposInteres: equiposRestore,
      familyAndFriends: !!trato.familyAndFriends,
      realizarRender: !!trato.realizarRender,
      tradeAplica: !!trato.tradeCalificado,
      horaInicioEvento: trato.horaInicioEvento || "",
      horaFinEvento: trato.horaFinEvento || "",
      duracionMontajeHrs: trato.duracionMontajeHrs != null ? String(trato.duracionMontajeHrs) : "",
      ventanaMontajeInicio: trato.ventanaMontajeInicio || "",
      ventanaMontajeFin: trato.ventanaMontajeFin || "",
      horaTerminoMontaje: trato.horaTerminoMontaje || "",
      contactoVenueNombre: trato.contactoVenueNombre || "",
      contactoVenueTelefono: trato.contactoVenueTelefono || "",
      contactoDecisorNombre: trato.contactoDecisorNombre || "",
      contactoDecisorCargo: trato.contactoDecisorCargo || "",
      preferenciaContacto: trato.preferenciaContacto || "",
      ideasReferencias: isRenta ? "" : (trato.ideasReferencias || ""),
      rentaModalidadServicio: renta.modalidadServicio || "",
      rentaModalidadEntrega: renta.modalidadEntrega || "",
      rentaDireccionEntrega: renta.direccionEntrega || "",
      rentaFechaEntrega: renta.fechaEntrega || "",
      rentaHoraEntrega: renta.horaEntrega || "",
      rentaFechaDevolucion: renta.fechaDevolucion || "",
      rentaHoraDevolucion: renta.horaDevolucion || "",
      rentaDescripcionEquipos: renta.descripcionEquipos || "",
      rentaTecnicoPropio: renta.tecnicoPropio || "",
      rentaNotas: renta.notas || "",
      };
      latestDiscRef.current = hydrated;
      return hydrated;
    });
    // Marcar la selección de equipos cargada como "ya persistida" para que el
    // guardado inmediato no la re-escriba en el primer render tras hidratar.
    equiposPersistidosRef.current = equiposRestore || "";
    // Si recuperamos los equipos del respaldo local, persistirlos de inmediato
    // en el servidor para volver a alinear la BD con lo que el usuario tenía.
    if (equiposRestauradoLocal) {
      patch({ equiposInteres: equiposRestore }).catch(() => {});
    }
  }, [trato]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleServicio = (idService: string) => {
    setDiscForm(p => {
      const isSel = p.serviciosInteres.includes(idService);
      const n = isSel ? p.serviciosInteres.filter(s => s !== idService) : [...p.serviciosInteres, idService];
      return { ...p, serviciosInteres: n };
    });
  };

  

  // Construye el payload de guardado a partir del formulario. Incluye TODOS los
  // campos del descubrimiento para que el auto-guardado sea equivalente al
  // guardado manual (antes omitía subtipo y contacto decisor).
  const buildDiscPayload = useCallback((form: typeof discForm) => {
    const isRenta = form.tipoServicio === "RENTA";
    const { fechasEvento, diasDerivados } = calcFechasEvento(form);
    return {
      tipoEvento: form.tipoEvento,
      subtipoEvento: form.subtipoEvento || null,
      nombreEvento: form.nombreEvento || null,
      fechaEventoEstimada: form.fechaEventoEstimada === "por-definir" ? null : (form.fechaEventoEstimada || null),
      fechasEvento,
      lugarEstimado: form.lugarEstimado === "por-definir" ? "Por definir" : (form.lugarEstimado || null),
      asistentesEstimados: form.asistentesEstimados ? parseInt(form.asistentesEstimados) : null,
      diasServicio: diasDerivados ?? (form.diasServicio ? parseInt(form.diasServicio) : null),
      presupuestoEstimado: form.presupuestoEstimado ? parseFloat(form.presupuestoEstimado) : null,
      tipoServicio: form.tipoServicio || null,
      notas: form.notas || null,
      familyAndFriends: form.familyAndFriends,
      realizarRender: form.realizarRender,
      tradeCalificado: form.tradeAplica,
      horaInicioEvento: form.horaInicioEvento || null,
      horaFinEvento: form.horaFinEvento || null,
      duracionEvento: calcDuracionEvento(form.horaInicioEvento, form.horaFinEvento),
      duracionMontajeHrs: form.duracionMontajeHrs ? parseFloat(form.duracionMontajeHrs) : null,
      ventanaMontajeInicio: form.ventanaMontajeInicio || null,
      ventanaMontajeFin: form.ventanaMontajeFin || null,
      horaTerminoMontaje: form.horaTerminoMontaje || null,
      contactoVenueNombre: form.contactoVenueNombre || null,
      contactoVenueTelefono: form.contactoVenueTelefono || null,
      contactoDecisorNombre: form.contactoDecisorNombre || null,
      contactoDecisorCargo: form.contactoDecisorCargo || null,
      preferenciaContacto: form.preferenciaContacto || null,
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
    };
  }, []);

  const autoSaveDisc = useCallback((form: typeof discForm) => {
    if (autoSaveDiscTimer.current) clearTimeout(autoSaveDiscTimer.current);
    setAutoSaveStatus("saving");
    autoSaveDiscTimer.current = setTimeout(async () => {
      autoSaveDiscTimer.current = null;
      await patch(buildDiscPayload(form));
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    }, 1200);
  }, [buildDiscPayload]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush inmediato del guardado pendiente (al retroceder, navegar o cerrar la
  // pestaña). Usa keepalive para que la petición sobreviva a la descarga de la
  // página. Así no se pierden los cambios de los últimos 1.2s antes de salir.
  const flushDisc = useCallback(() => {
    if (!autoSaveDiscTimer.current) return;
    clearTimeout(autoSaveDiscTimer.current);
    autoSaveDiscTimer.current = null;
    try {
      const url = clientMode ? `/api/f/${token}` : `/api/tratos/${id}`;
      const payload = clientMode
        ? { ...buildDiscPayload(latestDiscRef.current), _discoveryMode: true }
        : buildDiscPayload(latestDiscRef.current);
      fetch(url, {
        method: clientMode ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch { /* noop */ }
  }, [id, buildDiscPayload, clientMode, token]);

  // Auto-guardado global: CUALQUIER cambio en el formulario dispara el guardado
  // con debounce. Antes solo la selección de servicios lo hacía, por eso al
  // retroceder se perdía todo el avance del descubrimiento.
  useEffect(() => {
    // En modo huérfano todavía no existe el trato, así que no hay auto-guardado:
    // los datos se persisten de golpe en el envío final.
    if (readOnly || huerfano || !hydratedRef.current) return;
    const sig = JSON.stringify(discForm);
    if (!autosaveArmedRef.current) {
      // Primera pasada tras hidratar: registramos la firma base sin guardar,
      // para no re-escribir los datos ya existentes ni los valores por defecto.
      autosaveArmedRef.current = true;
      lastSavedSigRef.current = JSON.stringify(latestDiscRef.current);
      return;
    }
    if (sig === lastSavedSigRef.current) return;
    lastSavedSigRef.current = sig;
    autoSaveDisc(discForm);
  }, [discForm, readOnly, huerfano, autoSaveDisc]);

  // Flush al desmontar (navegación SPA / botón atrás) y al ocultar la pestaña.
  useEffect(() => {
    if (readOnly) return;
    const handler = () => flushDisc();
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      flushDisc();
    };
  }, [readOnly, flushDisc]);

  // Respaldo local INMEDIATO (sin debounce) de la selección de equipos: se
  // escribe en cada cambio para que nunca se pierda aunque falle la red, se
  // cierre la pestaña o se navegue antes del auto-guardado con debounce.
  useEffect(() => {
    if (readOnly || clientMode || huerfano || !hydratedRef.current) return;
    try {
      if (discForm.equiposInteres) localStorage.setItem(`disc-equipos-${id}`, discForm.equiposInteres);
      else localStorage.removeItem(`disc-equipos-${id}`);
    } catch { /* noop */ }
    // Persistencia INMEDIATA al servidor (sin esperar el debounce global). La
    // selección de equipos son clics discretos, así que guardamos en cada cambio
    // con keepalive: así la selección del paso 2 nunca se pierde aunque el
    // usuario navegue a la cotización de inmediato. Solo re-guardamos si cambió
    // respecto a lo ya persistido (evita re-escribir el valor hidratado).
    const val = discForm.equiposInteres || "";
    if (val === (equiposPersistidosRef.current ?? "")) return;
    equiposPersistidosRef.current = val;
    try {
      fetch(`/api/tratos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equiposInteres: val || null }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* noop */ }
  }, [discForm.equiposInteres, readOnly, clientMode, huerfano, id]);

  async function guardarDescubrimiento(completar = false) {
    setSaving(true);
    const isRenta = discForm.tipoServicio === "RENTA";
    const { fechasEvento, diasDerivados } = calcFechasEvento(discForm);
    const payload: Record<string, unknown> = {
      tipoEvento: discForm.tipoEvento,
      subtipoEvento: discForm.subtipoEvento || null,
      nombreEvento: discForm.nombreEvento || null,
      fechaEventoEstimada: discForm.fechaEventoEstimada === "por-definir" ? null : (discForm.fechaEventoEstimada || null),
      fechasEvento,
      lugarEstimado: discForm.lugarEstimado === "por-definir" ? "Por definir" : (discForm.lugarEstimado || null),
      asistentesEstimados: discForm.asistentesEstimados ? parseInt(discForm.asistentesEstimados) : null,
      diasServicio: diasDerivados ?? (discForm.diasServicio ? parseInt(discForm.diasServicio) : null),
      presupuestoEstimado: discForm.presupuestoEstimado ? parseFloat(discForm.presupuestoEstimado) : null,
      tipoServicio: discForm.tipoServicio || null,
      notas: discForm.notas || null,
      familyAndFriends: discForm.familyAndFriends,
      realizarRender: discForm.realizarRender,
      tradeCalificado: discForm.tradeAplica,
      horaInicioEvento:     discForm.horaInicioEvento || null,
      horaFinEvento:        discForm.horaFinEvento || null,
      duracionEvento:       calcDuracionEvento(discForm.horaInicioEvento, discForm.horaFinEvento),
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
    payload.preferenciaContacto = discForm.preferenciaContacto || null;
    if (completar) {
      payload.descubrimientoCompleto = true;
      payload.etapa = "OPORTUNIDAD";
    }
    const d = await patch(payload);
    if (d) setTrato((prev: any) => prev ? { ...prev, ...d.trato } : prev);
    setSaving(false);
    if (completar && onComplete) onComplete();
  }

  // ── Envío final del cliente (modo público) ────────────────────────────────
  // Persiste todo el descubrimiento de una sola vez y marca el formulario como
  // COMPLETADO. En huérfano crea el cliente + trato con los datos de contacto.
  async function enviarFormularioCliente() {
    if (huerfano) {
      const nombre = (contacto?.nombre || "").trim();
      const whatsapp = (contacto?.whatsapp || "").trim();
      if (!nombre || !whatsapp) {
        toast.error("Escribe tu nombre y WhatsApp para enviar el formulario");
        return;
      }
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      ...buildDiscPayload(discForm),
      _discoveryMode: true,
      _final: true,
    };
    if (huerfano && contacto) {
      payload.nombreContacto = contacto.nombre?.trim() || null;
      payload.telefonoContacto = contacto.whatsapp?.trim() || null;
      payload.correoContacto = contacto.correo?.trim() || null;
      payload.momentoContratacion = contacto.momentoContratacion || null;
    }
    try {
      const res = await fetch(`/api/f/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Error al enviar el formulario");
        return;
      }
      if (onComplete) onComplete();
    } catch {
      toast.error("Error de red al enviar");
    } finally {
      setSaving(false);
    }
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
                    <paso.icon strokeWidth={1.75} className="w-3.5 h-3.5" /> {paso.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-5">

            {/* PASO 1: Información básica */}
            {pasoActivo === 1 && (<div className="space-y-4">
              {/* Título + agradecimiento — solo cuando el cliente llena el formulario */}
              {clientMode && (
                <div className="border border-[#B3985B]/30 bg-gradient-to-br from-[#B3985B]/10 to-transparent rounded-xl p-4">
                  <p className="text-base sm:text-lg text-white font-semibold inline-flex items-center gap-1.5">
                    Cuéntanos sobre tu evento <Sparkles strokeWidth={1.75} className="w-4 h-4 text-[#B3985B]" />
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1.5 leading-relaxed">
                    ¡Gracias por tu interés! Este formulario nos ayuda a <span className="text-[#B3985B]">descubrir
                    exactamente lo que necesitas</span> para armarte una propuesta a la medida. Entre más
                    detalles nos compartas, más precisa y personalizada será tu cotización.
                  </p>
                </div>
              )}
              {/* Datos de contacto — solo en links huérfanos (sin trato previo) */}
              {clientMode && huerfano && (
                <div className="border border-[#2a2a2a] bg-[#111] rounded-xl p-4 space-y-3">
                  <p className="text-sm text-white font-semibold">Tus datos de contacto</p>
                  <p className="text-[11px] text-gray-500 -mt-1">Para poder enviarte la propuesta y comunicarnos contigo.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Nombre completo *</label>
                      <input type="text" value={contacto?.nombre || ""}
                        onChange={e => setContacto?.({ ...contacto, nombre: e.target.value })}
                        placeholder="Tu nombre"
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">WhatsApp *</label>
                      <input type="tel" value={contacto?.whatsapp || ""}
                        onChange={e => setContacto?.({ ...contacto, whatsapp: e.target.value })}
                        placeholder="10 dígitos"
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-400 block mb-1">Correo <span className="text-gray-600">(opcional)</span></label>
                      <input type="email" value={contacto?.correo || ""}
                        onChange={e => setContacto?.({ ...contacto, correo: e.target.value })}
                        placeholder="tucorreo@ejemplo.com"
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    </div>
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Tipo de evento</label>
                </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {([
                      { te: "MUSICAL", icon: Music, label: "Musical", desc: "Conciertos, festivales, giras, etc." },
                      { te: "SOCIAL", icon: Wine, label: "Social", desc: "Bodas, XV años, fiestas privadas." },
                      { te: "EMPRESARIAL", icon: Building2, label: "Empresarial", desc: "Congresos, lanzamientos, expos." },
                      { te: "OTRO", icon: Calendar, label: "Otro", desc: "Algún otro tipo de evento." }
                    ] as const).map(t => (
                      <button key={t.te} type="button" onClick={() => setDiscForm(p => ({ ...p, tipoEvento: t.te, subtipoEvento: "", serviciosInteres: [] }))}
                        className={`text-left p-3 rounded-xl border transition-all ${discForm.tipoEvento === t.te ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#222] bg-[#111] hover:border-[#444]"}`}>
                        <div className="mb-1"><t.icon strokeWidth={1.75} className={`w-5 h-5 ${discForm.tipoEvento === t.te ? "text-[#B3985B]" : "text-gray-500"}`} /></div>
                        <p className={`text-sm font-semibold mb-0.5 ${discForm.tipoEvento === t.te ? "text-[#B3985B]" : "text-white"}`}>{t.label}</p>
                        <p className="text-[10px] text-gray-500 leading-tight">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                
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
                  {([
                    { value: "RENTA", label: "Renta de equipo", icon: Package, desc: "Solo equipo sin operación técnica compleja." },
                    { value: "PRODUCCION_TECNICA", label: "Producción Técnica", icon: Settings, desc: "Equipo, montaje y operación técnica." },
                    { value: "DIRECCION_TECNICA", label: "Dirección Técnica", icon: ClipboardList, desc: "Desarrollo conceptual, producción técnica y gestión completa de producción." }
                  ] as const).map(ts => (
                    <button key={ts.value} type="button" onClick={() => setDiscForm(p => ({ ...p, tipoServicio: ts.value }))}
                      className={`text-left p-4 rounded-xl border transition-all ${discForm.tipoServicio === ts.value ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#222] bg-[#111] hover:border-[#444]"}`}>
                      <div className="mb-2"><ts.icon strokeWidth={1.75} className={`w-6 h-6 ${discForm.tipoServicio === ts.value ? "text-[#B3985B]" : "text-gray-500"}`} /></div>
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
                <label className="text-xs text-gray-400 block mb-1">{clientMode ? "Tu presupuesto estimado" : "Presupuesto estimado del cliente"}</label>
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
                  <label className="text-xs text-gray-400">Lugar/salón del evento y ciudad *</label>
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

              {/* Horario del evento — inicio/fin y duración autocalculada. Dato clave
                  para cotización, contrato y fichas operativas; por eso vive junto a
                  fecha y lugar desde el primer paso. */}
              {discForm.tipoServicio !== "RENTA" && (
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-400 block mb-1">Horario del evento (inicio y fin)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <TimePicker value={discForm.horaInicioEvento || ""} onChange={v => setDiscForm(p => ({ ...p, horaInicioEvento: v }))} placeholder="Inicio" />
                    <TimePicker value={discForm.horaFinEvento || ""} onChange={v => setDiscForm(p => ({ ...p, horaFinEvento: v }))} placeholder="Fin" />
                  </div>
                  {(() => {
                    const dur = calcDuracionEvento(discForm.horaInicioEvento, discForm.horaFinEvento);
                    return dur ? (
                      <p className="text-[11px] text-[#B3985B] mt-1.5 inline-flex items-center gap-1">
                        <Clock strokeWidth={1.75} className="w-3 h-3" /> Duración del evento: {dur}
                      </p>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Días del evento — servicio de uno o varios días con fecha específica */}
              {discForm.fechaEventoEstimada && discForm.fechaEventoEstimada !== "por-definir" && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Días del evento</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-12 shrink-0">Día 1</span>
                      <div className="flex-1 bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-gray-300 text-sm">{discForm.fechaEventoEstimada}</div>
                    </div>
                    {discForm.fechasEventoExtra.map((fecha, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-12 shrink-0">Día {i + 2}</span>
                        <input
                          type="date"
                          value={fecha}
                          min={discForm.fechaEventoEstimada}
                          onChange={e => setDiscForm(p => {
                            const next = [...p.fechasEventoExtra];
                            next[i] = e.target.value;
                            return { ...p, fechasEventoExtra: next };
                          })}
                          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                        />
                        <button type="button"
                          onClick={() => setDiscForm(p => ({ ...p, fechasEventoExtra: p.fechasEventoExtra.filter((_, j) => j !== i) }))}
                          className="text-gray-500 hover:text-red-400 text-lg leading-none px-1" title="Quitar día">×</button>
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => setDiscForm(p => ({ ...p, fechasEventoExtra: [...p.fechasEventoExtra, ""] }))}
                      className="text-xs text-[#B3985B] hover:text-[#c9ae70] flex items-center gap-1">
                      <span className="text-base leading-none">+</span> Agregar día
                    </button>
                    <p className="text-[11px] text-gray-500">
                      {1 + discForm.fechasEventoExtra.filter(Boolean).length} día(s) de servicio
                      {clientMode ? "" : " · se pre-llenan en la cotización y el calendario"}
                    </p>
                  </div>
                </div>
              )}

              {/* Número de asistentes — se define desde el primer paso */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Número de asistentes estimado</label>
                <input
                  type="number" min="1"
                  value={discForm.asistentesEstimados}
                  onChange={e => setDiscForm(p => ({ ...p, asistentesEstimados: e.target.value }))}
                  placeholder="Ej: 150"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>

              {/* Cuéntanos más de tu proyecto — se convierte en la nota de la cotización */}
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 block mb-1">
                  {clientMode ? "Cuéntanos un poco más de tu proyecto a detalle" : "Detalle del proyecto (nota para la cotización)"}
                </label>
                <p className="text-[11px] text-gray-600 mb-1.5">
                  {clientMode
                    ? "Todo lo que nos quieras contar: la idea, el ambiente que buscas, referencias, requerimientos especiales… Esto nos ayuda a personalizar tu propuesta."
                    : "Lo que el cliente comparte sobre su proyecto. Aparecerá como nota en la cotización."}
                </p>
                <textarea
                  value={discForm.notas}
                  onChange={e => setDiscForm(p => ({ ...p, notas: e.target.value }))}
                  rows={4}
                  placeholder="Ej: Queremos un ambiente elegante con iluminación cálida, tarima para grupo en vivo, y una entrada especial con humo bajo…"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                />
              </div>

            </div>

            </div>)} {/* /paso1 */}

            {/* PASO 2: Detalles y extras */}
            {pasoActivo === 2 && (<div className="space-y-4">
              {/* ── Rider específico / Contra-rider (modalidad elegida en el paso previo) ── */}
              {modalidad === "CONTRA_RIDER" && (
                <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <FileText strokeWidth={1.75} className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-200 text-sm font-semibold">Rider específico / Contra-rider</p>
                      <p className="text-[11px] text-blue-300/70 leading-relaxed mt-0.5">
                        {clientMode
                          ? "Cuéntanos qué equipos específicos necesitas (marcas/modelos) o sube tu rider técnico. Analizaremos tu solicitud y te propondremos la mejor solución."
                          : "Captura los equipos de otras marcas que pide el cliente o sube su rider técnico. Con esto preparamos un contra-rider. El inventario Mainstage abajo queda como referencia opcional."}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Descripción del rider / equipos requeridos</label>
                    <textarea
                      value={discForm.notasEquipos || ""}
                      onChange={e => setDiscForm(p => ({ ...p, notasEquipos: e.target.value }))}
                      rows={4}
                      placeholder="Ej: Consola DiGiCo SD12, 12x d&b V8, micrófonos Shure Axient... o describe el rider que necesitas."
                      className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-600 resize-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400 font-medium inline-flex items-center gap-1.5"><Folder strokeWidth={1.75} className="w-3.5 h-3.5" /> Rider técnico (archivo)</p>
                      <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[11px] cursor-pointer transition-colors ${uploadingTipo === "DOCUMENTO" ? "opacity-40 pointer-events-none text-gray-500" : "text-gray-500 hover:text-white hover:border-[#444]"}`}>
                        {uploadingTipo === "DOCUMENTO" ? "Subiendo..." : "+ Subir rider"}
                        <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" multiple onChange={e => subirArchivo(e, "DOCUMENTO")} />
                      </label>
                    </div>
                    {archivos.filter(a => a.tipo === "DOCUMENTO").length === 0 ? (
                      <p className="text-gray-700 text-[11px] italic">Sin archivos aún</p>
                    ) : (
                      <ul className="space-y-1">
                        {archivos.filter(a => a.tipo === "DOCUMENTO").map(a => (
                          <li key={a.id} className="flex items-center gap-2 text-[11px] text-blue-300">
                            <Paperclip strokeWidth={1.75} className="w-3 h-3 shrink-0" />
                            <a href={a.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{a.nombre || a.url}</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {discForm.tipoServicio === "RENTA" ? (
              <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold">Detalles de renta</p>

                {/* ── Selector de equipos del inventario (igual que producción) ── */}
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Equipos e inventario de interés</label>
                  <p className="text-[11px] text-gray-600 mb-3">{clientMode
                    ? "Elige las categorías que te interesan y cuéntanos los detalles de cada una. No necesitas saber de equipos: tu asesor arma la propuesta."
                    : "Elige las categorías y describe los detalles. Seleccionar los equipos y piezas exactas es opcional; lo seleccionado se sugiere al armar la cotización."}</p>
                  <SelectorEquiposInventario
                    clientMode={clientMode}
                    readOnly={readOnly}
                    value={(() => {
                      try { return discForm.equiposInteres ? JSON.parse(discForm.equiposInteres as string) : { categorias: [], equipos: [], cantidades: {} }; }
                      catch { return { categorias: [], equipos: [], cantidades: {} }; }
                    })()}
                    onChange={(sel: SeleccionEquipos) => {
                      setDiscForm(p => ({ ...p, equiposInteres: JSON.stringify(sel) }));
                    }}
                    notas={discForm.notasEquipos || ""}
                    onNotasChange={(v) => setDiscForm(p => ({ ...p, notasEquipos: v }))}
                  />
                </div>

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
                      {([
                        { id: "DT_CONCEPTUAL",    icon: Palette,     label: "Desarrollo conceptual",    desc: "Concepto creativo, ambientación, propuesta visual" },
                        { id: "DT_PROVEEDORES",   icon: Handshake,   label: "Gestión de proveedores",   desc: "Coordinación, contratación y supervisión de terceros" },
                        { id: "DT_PT_PROPIA",     icon: Sliders,     label: "PT propia Mainstage",      desc: "Nuestro propio servicio de producción técnica incluido" },
                        { id: "DT_LOGISTICA",     icon: Package,     label: "Logística integral",        desc: "Transporte, tiempos, cronograma y coordinación general" },
                        { id: "DT_PRESUPUESTO",   icon: DollarSign,  label: "Control de presupuesto",   desc: "Gestión del presupuesto global del evento" },
                        { id: "DT_SUPERVISIÓN",   icon: Eye,         label: "Supervisión en sitio",     desc: "Director técnico presente el día del evento" },
                      ] as const).map(area => (
                        <button key={area.id}
                          onClick={() => toggleServicio(area.id)}
                          title={area.desc}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            discForm.serviciosInteres.includes(area.id)
                              ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]"
                              : "border-[#2a2a2a] text-gray-300 hover:border-[#555] hover:text-white"
                          }`}>
                          <area.icon strokeWidth={1.75} className="w-3.5 h-3.5" />
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
                    <label className="text-xs text-gray-400 block mb-1">Presupuesto global del evento {!clientMode && <span className="text-gray-600">(si el cliente lo comparte)</span>}</label>
                    <input
                      type="text"
                      value={discForm.presupuestoEstimado}
                      onChange={e => setDiscForm(p => ({ ...p, presupuestoEstimado: e.target.value }))}
                      placeholder="Ej: $300,000 MXN total del evento"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    />
                  </div>

                  {/* Asistentes y detalle del proyecto se capturan en el paso 1 */}
                </div>

                {/* CTA Hacer propuesta — en paso 2 para DT (último paso) — solo vendedor */}
                {!clientMode && !trato.descubrimientoCompleto && (
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
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Equipos e inventario de interés</label>
                  <p className="text-[11px] text-gray-600 mb-3">{clientMode
                    ? "Elige las categorías que te interesan y cuéntanos los detalles de cada una. No necesitas saber de equipos: tu asesor arma la propuesta."
                    : "Elige las categorías y describe los detalles. Seleccionar los equipos y piezas exactas es opcional; lo seleccionado se sugiere al armar la cotización."}</p>
                  <SelectorEquiposInventario
                    clientMode={clientMode}
                    readOnly={readOnly}
                    value={(() => {
                      try { return discForm.equiposInteres ? JSON.parse(discForm.equiposInteres as string) : { categorias: [], equipos: [], cantidades: {} }; }
                      catch { return { categorias: [], equipos: [], cantidades: {} }; }
                    })()}
                    onChange={(sel: SeleccionEquipos) => {
                      setDiscForm(p => ({ ...p, equiposInteres: JSON.stringify(sel) }));
                    }}
                    notas={discForm.notasEquipos || ""}
                    onNotasChange={(v) => setDiscForm(p => ({ ...p, notasEquipos: v }))}
                  />
                </div>

                {/* ── Servicios Adicionales ─────────────────────── */}
                <div className="pt-2 border-t border-[#1a1a1a]">
                  <label className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold block mb-3">Servicios Adicionales (Opcionales)</label>
                  <div className="flex flex-col gap-3 mb-3">
                    {([
                      {
                        id: "SA_FOTO_VIDEO",
                        icon: Camera,
                        label: "Fotografía y Video",
                        desc: "Levantamiento y entrega de material de fotografía y video profesional, fotografías editadas, videos after movie, videos formato corto o videovlog."
                      },
                      {
                        id: "SA_RENDER",
                        icon: Monitor,
                        label: "Render de Producción",
                        desc: "Propuesta de render de la producción, imágenes con diferentes vistas, render a escala real, videos de la producción en operación (principalmente iluminación) y plots técnicos de producción (audio, luces, stage, estructuras etc) y entrega de materiales de imagen y videos así como los plots de producción."
                      }
                    ] as const).map(srv => {
                      const isSelected = discForm.serviciosInteres.includes(srv.id);
                      return (
                        <div key={srv.id} onClick={() => toggleServicio(srv.id)}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? "border-[#B3985B]/30 bg-[#B3985B]/10"
                              : "border-[#2a2a2a] hover:border-[#444] bg-[#111]"
                          }`}
                        >
                          <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isSelected ? "border-[#B3985B] bg-[#B3985B]" : "border-[#444] bg-transparent"
                          }`}>
                            {isSelected && <span className="text-black text-[10px]">✓</span>}
                          </div>
                          <div>
                            <p className={`text-sm font-medium inline-flex items-center gap-1.5 ${isSelected ? "text-[#B3985B]" : "text-gray-300"}`}>
                              <srv.icon strokeWidth={1.75} className="w-4 h-4" /> {srv.label}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                              {srv.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={discForm.serviciosAdicionalesOtro || ""}
                    onChange={e => setDiscForm(p => ({ ...p, serviciosAdicionalesOtro: e.target.value }))}
                    placeholder="Otro servicio adicional (especifica)..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
              </div>
            )}
            
            {/* ── Notas Técnicas / Equipos Adicionales (Manual) ───────────────────────
                En producción técnica y renta el campo lo maneja el selector (tras las
                categorías); aquí solo para Dirección Técnica. */}
            {discForm.tipoServicio === "DIRECCION_TECNICA" && (
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
            )}

              {/* El número de asistentes se captura en el paso 1 */}

            </div>)} {/* /paso2 */}

            {/* PASO 3: Operativo y Logística — RENTA (entrega y devolución) */}
            {discForm.tipoServicio === "RENTA" && pasoActivo === 3 && (<div className="space-y-4">
              <p className="text-xs text-[#B3985B] uppercase tracking-wider font-semibold">Logística de entrega y devolución</p>

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

              {/* Referencias y archivos del cliente */}
              <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Referencias y archivos del cliente</p>
                {(["REFERENCIA", "DOCUMENTO"] as const).map((cat) => {
                  const catMeta = {
                    REFERENCIA: { label: "Referencias del cliente", icon: ImageIcon, accept: "image/*,.pdf", hint: "Imágenes o docs que el cliente comparte como inspiración" },
                    DOCUMENTO:  { label: "Otros documentos",  icon: Folder, accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip", hint: "Contratos, riders, planos, cualquier archivo" },
                  }[cat];
                  const catArchivos = archivos.filter(a => a.tipo === cat);
                  const uploading = uploadingTipo === cat;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-400 font-medium inline-flex items-center gap-1.5"><catMeta.icon strokeWidth={1.75} className="w-3.5 h-3.5" /> {catMeta.label}</p>
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
                                    {/\.pdf$/i.test(a.url) ? <FileText strokeWidth={1.75} className="w-5 h-5 text-gray-500" /> : /\.(doc|docx)$/i.test(a.url) ? <PenLine strokeWidth={1.75} className="w-5 h-5 text-gray-500" /> : /\.(xls|xlsx)$/i.test(a.url) ? <BarChart3 strokeWidth={1.75} className="w-5 h-5 text-gray-500" /> : <Paperclip strokeWidth={1.75} className="w-5 h-5 text-gray-500" />}
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
            </div>)} {/* /paso3 RENTA */}

            {/* PASO 3: Operativo y Logística */}
            {discForm.tipoServicio !== "RENTA" && pasoActivo === 3 && (<div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-1.5 inline-flex items-center gap-1.5"><Lightbulb strokeWidth={1.75} className="w-3.5 h-3.5" /> Ideas / Referencias (links)</label>
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

              {/* Las notas del proyecto se capturan en el paso 1 ("Cuéntanos más de tu proyecto") */}

              {/* Referencias y archivos del cliente */}
              <div className="space-y-4 pt-2 border-t border-[#1a1a1a]">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Referencias y archivos del cliente</p>
                {(["REFERENCIA", "DOCUMENTO"] as const).map((cat) => {
                  const catMeta = {
                    REFERENCIA: { label: "Referencias del cliente", icon: ImageIcon, accept: "image/*,.pdf", hint: "Imágenes o docs que el cliente comparte como inspiración" },
                    DOCUMENTO:  { label: "Otros documentos",  icon: Folder, accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip", hint: "Contratos, riders, planos, cualquier archivo" },
                  }[cat];
                  const catArchivos = archivos.filter(a => a.tipo === cat);
                  const uploading = uploadingTipo === cat;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-400 font-medium inline-flex items-center gap-1.5"><catMeta.icon strokeWidth={1.75} className="w-3.5 h-3.5" /> {catMeta.label}</p>
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
                                    {/\.pdf$/i.test(a.url) ? <FileText strokeWidth={1.75} className="w-5 h-5 text-gray-500" /> : /\.(doc|docx)$/i.test(a.url) ? <PenLine strokeWidth={1.75} className="w-5 h-5 text-gray-500" /> : /\.(xls|xlsx)$/i.test(a.url) ? <BarChart3 strokeWidth={1.75} className="w-5 h-5 text-gray-500" /> : <Paperclip strokeWidth={1.75} className="w-5 h-5 text-gray-500" />}
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


            {/* PASO 4: Opciones comerciales */}
            {pasoActivo === 4 && (<div className="space-y-4">

              {/* Toggles: Mainstage Trade + Render — solo vendedor */}
              {!clientMode && (
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
              )}

              {/* Preferencia de contacto — SOLO cuando el cliente llena el formulario */}
              {clientMode && (
                <div>
                  <label className="text-xs text-gray-400 block mb-2">¿Cómo prefieres continuar?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { value: "LLAMADA", icon: Phone, label: "Quiero una llamada", desc: "Prefiero que me contacten para consolidar juntos los detalles." },
                      { value: "PROPUESTA", icon: Zap, label: "Quiero mi propuesta ya", desc: "Prefiero recibir una propuesta lo antes posible." },
                    ] as const).map(pref => (
                      <button key={pref.value} type="button"
                        onClick={() => setDiscForm(p => ({ ...p, preferenciaContacto: p.preferenciaContacto === pref.value ? "" : pref.value }))}
                        className={`text-left p-3 rounded-xl border transition-all ${discForm.preferenciaContacto === pref.value ? "border-[#B3985B] bg-[#B3985B]/10" : "border-[#222] bg-[#111] hover:border-[#444]"}`}>
                        <div className="mb-1"><pref.icon strokeWidth={1.75} className={`w-5 h-5 ${discForm.preferenciaContacto === pref.value ? "text-[#B3985B]" : "text-gray-500"}`} /></div>
                        <p className={`text-sm font-semibold mb-0.5 ${discForm.preferenciaContacto === pref.value ? "text-[#B3985B]" : "text-white"}`}>{pref.label}</p>
                        <p className="text-[10px] text-gray-500 leading-tight">{pref.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Panel de envío del cliente — solo modo público */}
              {clientMode && (
                <div className="border border-[#B3985B]/30 bg-[#B3985B]/5 rounded-xl p-5 text-center space-y-3">
                  <p className="text-white text-base font-semibold inline-flex items-center gap-1.5">¡Ya casi terminas! <PartyPopper strokeWidth={1.75} className="w-4 h-4 text-[#B3985B]" /></p>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Revisa que la información esté completa y envíanos tu solicitud.
                    Nuestro equipo te contactará con una propuesta a la medida.
                  </p>
                  <button
                    onClick={enviarFormularioCliente}
                    disabled={saving}
                    className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">
                    {saving ? "Enviando…" : "Enviar formulario →"}
                  </button>
                </div>
              )}

              {/* CTA Hacer cotización — con resumen de equipos y cantidades del descubrimiento */}
              {!clientMode && (
                <div className="border border-[#B3985B]/30 bg-[#B3985B]/5 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white text-sm font-semibold">Descubrimiento completo</p>
                      <p className="text-gray-500 text-xs mt-0.5">Los equipos y cantidades seleccionados se sugieren al armar la cotización — ahí los agregas con un clic.</p>
                    </div>
                    <Link
                      href={`/cotizaciones/nuevo?tratoId=${trato.id}&clienteId=${trato.cliente.id}`}
                      onClick={() => { if (!trato.descubrimientoCompleto) guardarDescubrimiento(true); }}
                      className="bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-semibold px-5 py-2 rounded-lg transition-colors shrink-0"
                    >
                      Hacer cotización →
                    </Link>
                  </div>
                  {(() => {
                    let sel: SeleccionEquipos | null = null;
                    try { sel = discForm.equiposInteres ? JSON.parse(discForm.equiposInteres) : null; } catch { sel = null; }
                    const tiene = !!sel && ((sel.equipos?.length ?? 0) > 0 || (sel.categorias?.length ?? 0) > 0 || (sel.extras?.length ?? 0) > 0);
                    if (!tiene || !sel) return null;
                    return (
                      <div className="pt-3 border-t border-[#1a1a1a]">
                        <p className="text-[11px] text-[#B3985B] uppercase tracking-wider font-semibold mb-2">Equipos y cantidades seleccionados</p>
                        <SelectorEquiposInventario value={sel} onChange={() => {}} readOnly />
                      </div>
                    );
                  })()}
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
