"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { PDFPreviewModal } from "@/components/PDFPreviewModal";
import { upload } from "@vercel/blob/client";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TimePicker from "@/components/ui/TimePicker";
import HoraInput from "@/components/ui/HoraInput";
import VenuePicker from "@/components/ui/VenuePicker";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { CopyButton } from "@/components/CopyButton";
import { SkeletonPage } from "@/components/Skeleton";
import VersionHistorial from "@/components/VersionHistorial";
import { Combobox } from "@/components/Combobox";
import ChecklistEventoTab from "./ChecklistEventoTab";
import { BackButton } from "@/components/BackButton";
import { Package, AlertTriangle, Smartphone, Truck, Home, Radio, MessageCircle, FileText, Bell, User, Factory, ClipboardList, FileImage } from "lucide-react";
import { ViabilidadWidget, type ViabilidadActiva, type ViabilidadHistoricoItem } from "@/components/proyectos/ViabilidadWidget";
import { DISCIPLINA_COLORS, DISCIPLINA_LABELS } from "@/lib/disciplinaColors";
import { contarRespondidos, contarIncidencias, nivelResultado, getEvalConfig, aplicaEvaluacion, type EvalPostEventoData } from "@/lib/evaluacion-post-evento";
import { getDireccionConfig, promedioDireccion, type EvaluacionDireccionData } from "@/lib/evaluacion-direccion";
import { diasEvento, parseHorariosEvento, horarioDeDia } from "@/lib/fechas-evento";
import { construirCronologia } from "@/lib/cronologia-evento";
import { checksAvanceProduccion } from "@/lib/proyecto-avance";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Tecnico { id: string; nombre: string; nivel: string; rol: { nombre: string } | null }
interface RolTecnico { id: string; nombre: string; tipoPago: string; disciplina: string | null; tarifaAAACorta: number | null; tarifaAAAMedia: number | null; tarifaAAALarga: number | null; tarifaPlanaAAA: number | null; tarifaPlanaAA: number | null; tarifaPlanaA: number | null; tarifaHoraAAA: number | null; tarifaHoraAA: number | null; tarifaHoraA: number | null }
interface SugerenciaTecnico {
  id: string; nombre: string; celular: string | null; nivel: string | null;
  prioridad: number; evaluacionPromedio: number | null; zonaHabitual: string | null;
  rol: { id: string; nombre: string } | null;
  yaAsignado: boolean; ocupado: boolean;
}
interface Personal {
  id: string; confirmado: boolean; estadoPago: string;
  participacion: string | null;
  fechaJornada: string | null;
  nivel: string | null; jornada: string | null; responsabilidad: string | null;
  tarifaAcordada: number | null; notas: string | null;
  confirmToken: string | null; confirmRespuesta: string | null;
  rolEnEvento: string | null;
  esAdicional: boolean;
  necesitaRevision: boolean;
  tecnico: { id: string; nombre: string; celular: string | null; rol: { nombre: string } | null } | null;
  rolTecnico: { nombre: string } | null;
}
interface CatFinanciera { id: string; nombre: string; tipo: string }
interface Proveedor { id: string; nombre: string; empresa: string | null; compania: { id: string; nombre: string } | null; telefono: string | null; giro: string | null }
interface CheckItem { id: string; item: string; completado: boolean; orden: number; tipo: string }
interface Archivo { id: string; tipo: string; nombre: string; url: string; createdAt: string }
interface AjusteEntry { fecha: string; de: number; a: number; motivo: string; usuario: string }
interface CxC { id: string; concepto: string; tipoPago: string; monto: number; montoCobrado: number; estado: string; fechaCompromiso: string; montoOriginal: number | null; ajustesLog: string | null }
interface CxP { id: string; concepto: string; monto: number; estado: string; fechaCompromiso: string; tipoAcreedor: string; montoOriginal: number | null; ajustesLog: string | null }
interface Bitacora { id: string; tipo: string; contenido: string; createdAt: string; usuario: { name: string } | null }
interface GastoOp { id: string; tipo: string; concepto: string; monto: number; cantidad: number; entregado: boolean; fechaEntrega: string | null; notas: string | null; cxpId: string | null }
interface Gasto { id: string; fecha: string; concepto: string; monto: number; metodoPago: string; notas: string | null; referencia: string | null; categoriaId?: string | null; categoria: { id?: string; nombre: string } | null; proveedorId?: string | null; proveedor: { id?: string; nombre: string; empresa?: string | null } | null; cuentaOrigenId?: string | null; cuentaOrigen: { id: string; nombre: string; banco: string | null } | null }
interface EquipoAccesorioLib { id: string; nombre: string; categoria: string | null }
interface RiderAccesorio { id: string; nombre: string; cantidad: number; categoria: string | null; completado: boolean; esSugerencia: boolean; orden: number }
interface ProyectoEquipoItem { id: string; tipo: string; cantidad: number; dias: number; costoExterno: number | null; confirmado: boolean; confirmToken: string | null; confirmDisponible: boolean | null; notas: string | null; necesitaRevision: boolean; equipo: { descripcion: string; marca: string | null; modelo: string | null; imagenUrl: string | null; categoria: { nombre: string }; accesorios: EquipoAccesorioLib[] }; proveedor: { nombre: string; empresa: string | null; telefono: string | null } | null; riderAccesorios: RiderAccesorio[] }
interface CronoRow { horaInicio: string; horaFin: string; actividad: string; responsable: string; involucrados: string; dia?: string }
interface TransporteSlot { vehiculoId: string; choferId: string; horaSalida: string; comentarios: string }
interface Proyecto {
  id: string; numeroProyecto: string; nombre: string; estado: string;
  tipoEvento: string; tipoServicio: string | null;
  fechaEvento: string; fechasEvento: string | null; horaInicioEvento: string | null; horaFinEvento: string | null; horariosEvento: string | null;
  fechaMontaje: string | null; horaInicioMontaje: string | null; duracionMontajeHrs: number | null;
  montajeDiaAparte: boolean | null; desmontajeDiaAparte: boolean | null;
  fechaDesmontaje: string | null; duracionDesmontajeHrs: number | null;
  horaMontaje: string | null; horaInicio: string | null; horaDesmontaje: string | null;
  direccionVenue: string | null; linkMaps: string | null; indicacionesAcceso: string | null;
  puntoSalidaBodega: string | null; horaSalidaBodega: string | null;
  indicacionesCliente: string | null;
  lugarEvento: string | null; encargadoLugar: string | null; encargadoLugarContacto: string | null;
  descripcionGeneral: string | null; detallesEspecificos: string | null;
  encargadoCliente: string | null; encargadoClienteContacto: string | null; transportes: string | null;
  proveedorCatering: string | null; contactosDireccion: string | null;
  reporteCatering: string | null;
  cronograma: string | null; contactosEmergencia: string | null; comentariosFinales: string | null;
  scoreFotoVideo: number | null; recomendacionFotoVideo: string | null;
  marketingData: string | null;
  cliente: { id: string; nombre: string; empresa: string | null; telefono: string | null; correo: string | null };
  encargado: { id: string; name: string } | null;
  tratoId: string | null;
  trato: { tipoEvento: string; tipoServicio: string | null; ideasReferencias: string | null; notas: string | null; familyAndFriends: boolean; tradeCalificado: boolean; ventanaMontajeInicio: string | null; ventanaMontajeFin: string | null; responsable: { name: string } | null } | null;
  cotizacion: { id: string; numeroCotizacion: string; granTotal: number; diasComidas: number; subtotalComidas: number; subtotalOperacion: number; subtotalTransporte: number; subtotalHospedaje: number; subtotalEquiposNeto: number; subtotalTerceros: number; notasSecciones: string | null; observaciones: string | null; lineas: { id: string; tipo: string; descripcion: string; cantidad: number; nivel: string | null; jornada: string | null; precioUnitario: number; notas: string | null; marca: string | null; rolTecnicoId: string | null; rolTecnico: { id: string; nombre: string; disciplina: string | null } | null }[] } | null;
  logisticaRenta: string | null;
  docsTecnicos: string | null;
  evaluacionPostEvento: EvalPostEventoData | null;
  evaluacionDireccion: EvaluacionDireccionData | null;
  proveedoresRenta: string | null;
  equiposRiderExtra: string | null;
  zona: string;
  protocoloSalida: string | null;
  protocoloEntrada: string | null;
  recoleccionStatus: string;
  recoleccionNotas: string | null;
  recoleccionFechaReal: string | null;
  choferNombre: string | null;
  choferExterno: boolean;
  choferCosto: number | null;
  aplicaCatering: boolean;
  personal: Personal[];
  equipos: ProyectoEquipoItem[];
  checklist: CheckItem[];
  archivos: Archivo[];
  cuentasCobrar: CxC[];
  cuentasPagar: CxP[];
  bitacora: Bitacora[];
  movimientos: Gasto[];
  cierreFinanciero: { cerradoEn: string; notas: string | null; totalCobrado: number; totalGastado: number; utilidadReal: number; margenReal: number; granTotalEstimado: number; costoEstimado: number; utilidadEstimada: number } | null;
  portalToken: string | null;
  infoToken: string | null;
  infoRecibidoEn: string | null;
  notasPortal: string | null;
  responsables: string | null;
  llamadoBodega: string | null;
  lugarLlamado: string | null;
  notasBriefTecnico: string | null;
  proveedoresEvento: { id: string; nombreProveedor: string; servicioEquipo: string | null; telefonoProveedor: string | null }[];
  createdAt: string;
  updatedAt: string;
  _canViewFinances?: boolean;
  _canViewTecnicoCosts?: boolean;
}

// ─── Constantes ──────────────────────────────────────────────────────────────
const ESTADOS = ["PLANEACION", "EN_CURSO", "COMPLETADO", "CANCELADO"];
const ESTADO_LABELS: Record<string, string> = {
  PLANEACION: "Planeación",
  EN_CURSO: "En Curso",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};
const ESTADO_COLORS: Record<string, string> = {
  PLANEACION: "bg-blue-900/50 text-blue-300",
  EN_CURSO: "bg-yellow-900/50 text-yellow-300",
  COMPLETADO: "bg-gray-700 text-gray-300",
  CANCELADO: "bg-red-900/50 text-red-300",
};
const NIVEL_COLORS: Record<string, string> = {
  AAA: "text-yellow-400", AA: "text-blue-400", A: "text-gray-400",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function proximoLunesTraEvento(fechaStr: string): string {
  const d = new Date(fechaStr.substring(0, 10) + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (8 - dow) % 7);
  return d.toISOString().substring(0, 10);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ─── Accesorios sugeridos por tipo de equipo ──────────────────────────────────
function accesoriosPorEquipo(descripcion: string, categoria: string): string[] {
  const d = descripcion.toLowerCase();
  const c = categoria.toLowerCase();
  if (/(sub|8006|18p|18sp|subgrave)/.test(d))
    return ["Cable XLR 5m", "Cable de poder", "Clamp/gancho (si se cuelga)"];
  if (/(ekx|hdl|6a|12p|bafle|speaker|satélite|top\b)/.test(d))
    return ["Cable XLR 5m", "Cable de poder", "Soporte para bafle", "Espuma protectora"];
  if (/\bmonitor\b/.test(d))
    return ["Cable XLR 5m", "Cable de poder"];
  if (/(sq5|sq6|sq7|dlive|x32|x18|wing|mg10|mg16|konsola|consola|mixer)/.test(d))
    return ["Cables XLR (×6)", "Cables TRS 6.3mm", "Cable de poder", "Cable Ethernet"];
  if (/(cdj-?3000|cdj-?2000|cdj\b)/.test(d))
    return ["Cable RCA", "Cable USB", "Cable de poder", "Funda/case"];
  if (/(djm|v10|a9|900nxs|rotary.*mix)/.test(d))
    return ["Cables RCA (×2 pares)", "Cables XLR salida (×2)", "Cable de poder", "Funda/case"];
  if (/(rmx.?1000|rmx.?500)/.test(d))
    return ["Cable RCA de entrada", "Cable de poder", "Funda"];
  if (/\bbooth\b/.test(d))
    return ["Tornillería completa", "Almohadillas antivibración", "Herramienta de armado"];
  if (/(inalámbric|inalambric|wireless.*mic|mic.*wireless|shure.*pg|shure.*sm|sennheiser|glxd|blxd|slx|ew[0-9])/.test(d))
    return ["Baterías AA (pack)", "Cable XLR backup", "Clip de micrófono", "Stand de micrófono"];
  if (/(iem|in.ear|g4\b|g10\b|ew300|ew400)/.test(d))
    return ["Baterías AA (pack)", "In-ears de respaldo", "Cable de poder"];
  if (/(diadema|headset|lavalier|solapa)/.test(d))
    return ["Baterías AA (pack)", "Repuesto de esponja/windscreen", "Clip extra"];
  if (/(par.led.inal|uplighting|wireless.*par)/.test(d))
    return ["Cargador / base de carga", "Cable DMX (backup)", "Clamp (si se monta)"];
  if (/(par.led|par64|par56)/.test(d))
    return ["Cable DMX 3m", "Cable de poder", "Clamp"];
  if (/\bbeam\b/.test(d))
    return ["Cable DMX 5m", "Cable de poder", "Clamp/soporte"];
  if (/(spot|wash|moving.head|cabeza móvil)/.test(d))
    return ["Cable DMX 5m", "Cable de poder", "Clamp/soporte"];
  if (/strobe/.test(d))
    return ["Cable DMX 5m", "Cable de poder", "Clamp"];
  if (/blinder/.test(d))
    return ["Cable DMX 5m", "Cable de poder", "Clamp"];
  if (/(barra.led|batten|lineal.*led)/.test(d))
    return ["Cable DMX 3m", "Cable de poder", "Soporte/stand"];
  if (/(haze|hazer|neblina|névoa)/.test(d))
    return ["Líquido hazer 1L", "Cable DMX", "Cable de poder", "Manguera de drenaje"];
  if (/(truss|torre.*luz|lighting.*tower)/.test(d))
    return ["Herrajes de unión", "Tornillería extra", "Llave de golpe", "Base de soporte"];
  if (/(pantalla.*led|led.*panel|ledwall|videowall|módulo.*led)/.test(d))
    return ["Cables HDMI 5m", "Cable de poder (rack)", "Herramienta de ensamble"];
  if (/(novastar|atem|vmix|resolume|procesador.*video)/.test(d))
    return ["Cable HDMI ×2", "Cable de poder", "Laptop de respaldo"];
  if (/(láser|laser)/.test(d))
    return ["Cable DMX 3m", "Cable de poder", "Documentación reglamentaria"];
  // fallback por categoría
  if (/audio/.test(c)) return ["Cable XLR 5m", "Cable de poder"];
  if (/iluminaci/.test(c)) return ["Cable DMX 5m", "Cable de poder"];
  if (/video/.test(c)) return ["Cable HDMI 5m", "Cable de poder"];
  return ["Cable de poder"];
}

// ─── InlinePicker: hora escrita a mano (12h AM/PM) para tabla de cronograma ────
function InlinePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <HoraInput
      value={value}
      onChange={onChange}
      size="sm"
      placeholder="—"
      className="w-full bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#B3985B]/40 focus:border-[#B3985B] rounded px-2 py-1 text-xs text-white transition-colors focus:outline-none whitespace-nowrap"
    />
  );
}

// ─── HourPicker: hora escrita a mano (12h AM/PM) con etiqueta e indicador ──────
function HourPicker({ label, value, field, onSave, noLabel = false }:
  { label: string; value: string | null; field: string; onSave: (f: string, v: string) => void; noLabel?: boolean }) {
  const [saved, setSaved] = React.useState(false);

  function handleChange(v: string) {
    onSave(field, v);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      {!noLabel && (
        <div className="flex items-center justify-between mb-1">
          <label className="text-gray-500 text-xs">{label}</label>
          {saved && <span className="text-[10px] text-green-500/70">guardado</span>}
        </div>
      )}
      <HoraInput value={value} onChange={handleChange} placeholder="ej. 2:30 PM" />
    </div>
  );
}

// ─── Componente campo editable ────────────────────────────────────────────────
function Campo({ label, value, field, onSave, type = "text", multiline = false, noLabel = false }:
  { label: string; value: string | null; field: string; onSave: (f: string, v: string) => void; type?: string; multiline?: boolean; noLabel?: boolean }) {
  const [val, setVal] = useState(value ?? "");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setVal(value ?? ""); setDirty(false); }, [value]);

  useEffect(() => {
    if (!multiline || !textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [val, multiline]);

  function markSaved() {
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  }

  useEffect(() => {
    if (!dirty) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (dirty) { onSave(field, val); setDirty(false); markSaved(); }
    }, 1500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [val, dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleBlur() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (dirty) { onSave(field, val); setDirty(false); markSaved(); }
  }

  const inputCls = "w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#B3985B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors";

  if (type === "time") {
    return (
      <div>
        {!noLabel && (
          <div className="flex items-center justify-between mb-1">
            <label className="text-gray-500 text-xs">{label}</label>
            {saved && <span className="text-[10px] text-green-500/70">guardado</span>}
          </div>
        )}
        <HoraInput
          value={val}
          onChange={v => { setVal(v); onSave(field, v); markSaved(); }}
          placeholder="ej. 2:30 PM"
        />
      </div>
    );
  }

  return (
    <div>
      {!noLabel && (
        <div className="flex items-center justify-between mb-1">
          <label className="text-gray-500 text-xs">{label}</label>
          {saved && <span className="text-[10px] text-green-500/70">guardado</span>}
        </div>
      )}
      {multiline ? (
        <textarea ref={textareaRef} value={val} rows={2} className={inputCls + " resize-none overflow-hidden"}
          onChange={e => { setVal(e.target.value); setDirty(true); }}
          onBlur={handleBlur} />
      ) : (
        <input type={type} value={val} className={inputCls}
          onChange={e => { setVal(e.target.value); setDirty(true); }}
          onBlur={handleBlur} />
      )}
    </div>
  );
}

function CampoVenue({ label, value, field, onSave }: { label: string; value: string | null; field: string; onSave: (f: string, v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");

  function save() { onSave(field, val); setEditing(false); }

  if (editing) {
    return (
      <div>
        <label className="text-gray-500 text-xs mb-1 block">{label}</label>
        <VenuePicker value={val} onChange={(v) => setVal(v)} />
        <div className="flex gap-2 mt-1">
          <button onClick={save} className="text-xs text-[#B3985B] hover:text-white">Guardar</button>
          <button onClick={() => { setEditing(false); setVal(value ?? ""); }} className="text-xs text-gray-500 hover:text-white">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => setEditing(true)} className="cursor-pointer group">
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <p className={`text-sm group-hover:text-[#B3985B] transition-colors ${value ? "text-white" : "text-gray-600 italic"}`}>
        {value || "Click para editar..."}
      </p>
    </div>
  );
}

// ─── Sub-componentes de operación ────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <p className="text-xs text-gray-600 font-semibold uppercase tracking-widest shrink-0">{label}</p>
      <div className="flex-1 border-t border-[#1a1a1a]" />
    </div>
  );
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `repeat(${cols.length + 1}, minmax(0, 1fr))` }}>
      {cols.map(c => <div key={c} className="text-[10px] text-gray-600 uppercase tracking-widest px-2">{c}</div>)}
      <div />
    </div>
  );
}

function DocAccordion({ docKey, title, desc, tag, children, isOpen, onToggle }: {
  docKey: string; title: string; desc?: string; tag?: string; children: React.ReactNode;
  isOpen: boolean; onToggle: () => void;
}) {
  return (
    <div className="ms-table-wrapper">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#1a1a1a] transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold">{title}</p>
            {desc && <p className="text-gray-500 text-xs mt-0.5">{desc}</p>}
          </div>
          {tag && <span className="shrink-0 text-[10px] text-[#B3985B] bg-[#B3985B]/10 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">{tag}</span>}
        </div>
        <svg className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ml-2 ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {isOpen && <div className="border-t border-[#222]">{children}</div>}
    </div>
  );
}

type ProtocoloData = { estado: string; responsable: string; hora: string; observaciones: string; fotos: string[] };
const defaultProtocolo: ProtocoloData = { estado: "PENDIENTE", responsable: "", hora: "", observaciones: "", fotos: [] };
const ESTADO_OPTS_PROTOCOLO = [
  { id: "PENDIENTE", label: "Pendiente", color: "border-gray-700 text-gray-400" },
  { id: "EN_REVISION", label: "En revisión", color: "border-yellow-700 text-yellow-400" },
  { id: "OK", label: "OK ✓", color: "border-green-700 text-green-400" },
];

async function comprimirFotoProtocolo(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1200 / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function ProtocoloPanel({ tipo, data, onSave }: {
  tipo: "salida" | "entrada";
  data: ProtocoloData;
  onSave: (tipo: "salida" | "entrada", data: ProtocoloData) => Promise<void>;
}) {
  const title = tipo === "salida" ? "Salida de equipos" : "Entrada de equipos";
  const Icon = tipo === "salida" ? Truck : Home;
  const desc = tipo === "salida" ? "Verificación antes de llevar al evento" : "Verificación al regresar a bodega";
  const [local, setLocal] = useState<ProtocoloData>(data);
  const [saving, setSaving] = useState(false);

  const addFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const b64 = await comprimirFotoProtocolo(file);
    const next = { ...local, fotos: [...local.fotos, b64] }; setLocal(next); await onSave(tipo, next); e.target.value = "";
  };
  const removeFoto = async (idx: number) => {
    const next = { ...local, fotos: local.fotos.filter((_, i) => i !== idx) };
    setLocal(next); await onSave(tipo, next);
  };
  const save = async () => { setSaving(true); await onSave(tipo, local); setSaving(false); };

  return (
    <div className="ms-table-wrapper">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#222]">
        <div className="flex items-center gap-3">
          <Icon strokeWidth={1.75} className="w-6 h-6 text-gray-300" />
          <div><p className="text-white text-sm font-semibold">{title}</p><p className="text-gray-500 text-xs">{desc}</p></div>
        </div>
        <div className="flex gap-2">
          {ESTADO_OPTS_PROTOCOLO.map(opt => (
            <button key={opt.id} onClick={() => { const next = { ...local, estado: opt.id }; setLocal(next); onSave(tipo, next); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${local.estado === opt.id ? `${opt.color} bg-white/5` : "border-[#2a2a2a] text-gray-600 hover:border-[#444]"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Responsable del protocolo</label>
            <input value={local.responsable} onChange={e => setLocal(p => ({ ...p, responsable: e.target.value }))} placeholder="Nombre del técnico"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Hora de verificación</label>
            <input value={local.hora} onChange={e => setLocal(p => ({ ...p, hora: e.target.value }))} placeholder="ej. 09:30"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Observaciones</label>
          <textarea value={local.observaciones} onChange={e => setLocal(p => ({ ...p, observaciones: e.target.value }))} rows={3}
            placeholder="Estado del equipo, daños, faltantes, notas..."
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">Evidencia fotográfica ({local.fotos.length} fotos)</label>
            <label className="cursor-pointer text-xs text-[#B3985B] hover:text-[#c9a96a] transition-colors">
              + Agregar foto
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={addFoto} />
            </label>
          </div>
          {local.fotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {local.fotos.map((foto, i) => (
                <div key={i} className="relative group">
                  <a href={foto} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foto} alt={`Evidencia ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-[#2a2a2a] hover:border-[#B3985B] transition-colors" />
                  </a>
                  <button onClick={() => removeFoto(i)} className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-lg bg-[#1a1a1a] border border-[#333] hover:border-[#B3985B] text-white text-sm font-medium transition-colors disabled:opacity-60">
          {saving ? "Guardando..." : "Guardar protocolo"}
        </button>
      </div>
    </div>
  );
}

type EquipoRowProps = {
  eq: ProyectoEquipoItem;
  proyectoId: string;
  fichaCompleta: boolean;
  fichaTooltip: string;
  onToggleConfirmado: (id: string, confirmado: boolean) => void;
  onEliminar: (id: string) => void;
  onRefresh: () => Promise<void>;
  onToastInfo: (msg: string) => void;
};

function EquipoRow({ eq, proyectoId, fichaCompleta, fichaTooltip, onToggleConfirmado, onEliminar, onRefresh, onToastInfo }: EquipoRowProps) {
  const costo = eq.costoExterno ? eq.costoExterno * eq.cantidad * eq.dias : null;
  return (
    <div className={`flex items-center gap-3 px-5 py-3 border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#141414] transition-colors ${eq.confirmado ? "" : "opacity-80"}`}>
      {/* Equipment image thumbnail */}
      <div className="w-9 h-9 rounded-sm overflow-hidden bg-black shrink-0 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={eq.equipo.imagenUrl || "/logo-icon.png"}
          alt={eq.equipo.descripcion}
          className="w-full h-full object-contain p-0.5"
          onError={(e) => { (e.target as HTMLImageElement).src = "/logo-icon.png"; }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white text-sm font-medium truncate">{eq.equipo.descripcion}</p>
          {eq.necesitaRevision && <span className="shrink-0 px-1.5 py-0.5 rounded border border-amber-700/50 bg-amber-900/20 text-amber-300 text-[10px] font-medium" title="Este equipo se quitó o cambió en la cotización — revísalo (no se borró automáticamente)">Revisar</span>}
        </div>
        <p className="text-gray-500 text-xs">{eq.equipo.categoria.nombre}{eq.equipo.marca ? ` · ${eq.equipo.marca}` : ""}</p>
        {eq.proveedor && <p className="text-[#B3985B] text-xs">{eq.proveedor.empresa || eq.proveedor.nombre}</p>}
      </div>
      <div className="text-center shrink-0">
        <p className="text-white text-sm font-semibold">{eq.cantidad}</p>
        <p className="text-gray-600 text-[10px]">cant.</p>
      </div>
      <div className="text-center shrink-0">
        <p className="text-white text-sm">{eq.dias}</p>
        <p className="text-gray-600 text-[10px]">días</p>
      </div>
      {costo !== null && (
        <div className="text-right shrink-0">
          <p className="text-yellow-400 text-sm font-semibold">{fmt(costo)}</p>
          <p className="text-gray-600 text-[10px]">costo</p>
        </div>
      )}
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        {eq.confirmDisponible !== null && eq.confirmDisponible !== undefined && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${eq.confirmDisponible ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>
            {eq.confirmDisponible ? "✓ Disponible" : "✗ No disp."}
          </span>
        )}
        <button onClick={() => onToggleConfirmado(eq.id, eq.confirmado)}
          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${eq.confirmado ? "bg-green-900/50 text-green-300 hover:bg-green-900/70" : "bg-[#222] text-gray-500 hover:bg-[#2a2a2a] hover:text-white"}`}>
          {eq.confirmado ? "Confirmado" : "Confirmar"}
        </button>
        {eq.tipo === "EXTERNO" && eq.proveedor && (
          <button
            disabled={!fichaCompleta}
            title={fichaCompleta ? "Consultar disponibilidad al proveedor" : fichaTooltip}
            onClick={async () => {
              const res = await fetch(`/api/proyectos/${proyectoId}/equipos/${eq.id}/invitar-proveedor`, { method: "POST" });
              const d = await res.json();
              if (d.whatsappUrl) {
                window.open(d.whatsappUrl, "_blank");
                await onRefresh();
              } else if (d.token) {
                const url = `${window.location.origin}/confirmar/proveedor/${d.token}`;
                await navigator.clipboard.writeText(url).catch(() => {});
                onToastInfo("Sin número registrado. Link copiado al portapapeles.");
                await onRefresh();
              }
            }}
            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border transition-colors ${fichaCompleta ? "border-blue-800/50 text-blue-400 hover:bg-blue-900/20 hover:border-blue-600 cursor-pointer" : "border-[#333] text-gray-600 cursor-not-allowed opacity-50"}`}>
            <Smartphone strokeWidth={1.75} className="w-3 h-3" /> Proveedor
          </button>
        )}
        <button onClick={() => onEliminar(eq.id)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">✕</button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
type VehiculoListItem = { id: string; nombre: string; marca: string | null; modelo: string | null; placas: string | null };

function VehiculoIdSelector({
  value, onChange, vehiculos, onAddVehiculo,
}: {
  value: string;
  onChange: (id: string) => void;
  vehiculos: VehiculoListItem[];
  onAddVehiculo: (v: VehiculoListItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newMarca, setNewMarca] = useState("");
  const [newPlacas, setNewPlacas] = useState("");
  const [newColor, setNewColor] = useState("");

  const selected = vehiculos.find(v => v.id === value);
  const label = selected
    ? selected.nombre + (selected.marca ? ` · ${selected.marca}` : "") + (selected.placas ? ` (${selected.placas})` : "")
    : "— Seleccionar vehículo —";

  const filtered = vehiculos.filter(v => {
    const q = search.toLowerCase();
    return !q ||
      v.nombre.toLowerCase().includes(q) ||
      (v.marca ?? "").toLowerCase().includes(q) ||
      (v.placas ?? "").toLowerCase().includes(q);
  });

  async function handleCrear() {
    if (!newNombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vehiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: newNombre.trim(), marca: newMarca.trim() || null, placas: newPlacas.trim() || null, color: newColor.trim() || null }),
      });
      const d = await res.json();
      if (res.ok && d.vehiculo) {
        onAddVehiculo(d.vehiculo);
        onChange(d.vehiculo.id);
        setOpen(false); setShowNew(false);
        setNewNombre(""); setNewMarca(""); setNewPlacas(""); setNewColor("");
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setShowNew(false); }}
        className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B] flex items-center justify-between"
      >
        <span className={selected ? "text-white" : "text-gray-600"}>{label}</span>
        <svg className="w-3 h-3 text-gray-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#111] border border-[#333] rounded-xl overflow-hidden shadow-2xl">
          <div className="px-2 pt-2 pb-1">
            <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#B3985B]/50" />
          </div>
          <div className="max-h-44 overflow-y-auto divide-y divide-[#1a1a1a]">
            <button type="button" onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-[#1a1a1a] transition-colors">
              — Sin vehículo —
            </button>
            {filtered.length === 0 && search && (
              <p className="px-3 py-2 text-xs text-gray-700">Sin resultados</p>
            )}
            {filtered.map(v => (
              <button key={v.id} type="button"
                onClick={() => { onChange(v.id); setOpen(false); setSearch(""); }}
                className="w-full text-left px-3 py-2 hover:bg-[#1a1a1a] transition-colors">
                <p className="text-white text-xs">{v.nombre}</p>
                <p className="text-gray-500 text-[10px]">{[v.marca, v.modelo, v.placas ? `Placas: ${v.placas}` : null].filter(Boolean).join(" · ")}</p>
              </button>
            ))}
          </div>
          <div className="border-t border-[#1a1a1a]">
            {!showNew ? (
              <button type="button" onClick={() => setShowNew(true)}
                className="w-full text-left px-3 py-2.5 text-[#B3985B] hover:bg-[#1a1a1a] text-xs font-medium flex items-center gap-2 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Registrar nuevo vehículo
              </button>
            ) : (
              <div className="p-3 space-y-2 bg-[#0d0d0d]">
                <p className="text-[10px] font-bold text-[#B3985B] uppercase tracking-wider">Nuevo vehículo</p>
                <input type="text" value={newNombre} onChange={e => setNewNombre(e.target.value)}
                  placeholder="Nombre * (ej: Sprinter Negra)"
                  className="w-full bg-[#111] border border-[#222] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#B3985B]/50" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={newMarca} onChange={e => setNewMarca(e.target.value)}
                    placeholder="Marca" className="ms-card rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#B3985B]/50" />
                  <input type="text" value={newColor} onChange={e => setNewColor(e.target.value)}
                    placeholder="Color" className="ms-card rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#B3985B]/50" />
                </div>
                <input type="text" value={newPlacas} onChange={e => setNewPlacas(e.target.value)}
                  placeholder="Placas (opcional)"
                  className="w-full bg-[#111] border border-[#222] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#B3985B]/50" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowNew(false)}
                    className="flex-1 text-xs text-gray-500 hover:text-gray-300 py-1.5 rounded-lg border border-[#222] transition-colors">Cancelar</button>
                  <button type="button" onClick={handleCrear} disabled={!newNombre.trim() || saving}
                    className="flex-1 text-xs font-semibold bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black py-1.5 rounded-lg transition-colors">
                    {saving ? "Guardando..." : "Registrar y usar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── EquiposTab ─────────────────────────────────────────────────────────────────────────────────────────

type ClasifEquipo = 'PROPIO_INVENTARIO' | 'PROPIO_MANUAL' | 'EXTERNO_INVENTARIO' | 'EXTERNO_CONFIRMADO' | 'A_CONSEGUIR';

type LineaEquipo = {
  id: string;
  tipo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  cantidad: number;
  dias: number;
  precioUnitario: number;
  costoExterno: number | null;
  equipoId: string | null;
  equipoInventarioTipo: string | null;
  cantidadTotal: number | null;
  proveedorId: string | null;
  proveedor: { id: string; nombre: string; empresa: string | null } | null;
  clasificacion: ClasifEquipo;
  disponible: number;
  comprometido: number;
  conflictos: Array<{ ref: string; nombre: string; estado: string; fecha: string | null }>;
  yaConfirmado: boolean;
  cxp: { id: string; monto: number; estado: string } | null;
};

type ProveedorOpt = { id: string; nombre: string; empresa: string | null };

const CLASIF_CFG: Record<ClasifEquipo, { bg: string; text: string; label: string; dot: string }> = {
  PROPIO_INVENTARIO:  { bg: 'bg-emerald-900/20 border border-emerald-800/30', text: 'text-emerald-400', label: '\u2713 Nuestro', dot: 'bg-emerald-400' },
  PROPIO_MANUAL:      { bg: 'bg-emerald-900/10 border border-emerald-900/20', text: 'text-emerald-600', label: '\u2713 Nuestro*', dot: 'bg-emerald-700' },
  EXTERNO_INVENTARIO: { bg: 'bg-blue-900/20 border border-blue-800/30',       text: 'text-blue-400',   label: '\u25cf Catálogo externo', dot: 'bg-blue-400' },
  EXTERNO_CONFIRMADO: { bg: 'bg-blue-900/20 border border-blue-800/30',       text: 'text-blue-400',   label: '\u2713 Proveedor OK', dot: 'bg-blue-400' },
  A_CONSEGUIR:        { bg: 'bg-[#1a1a1a] border border-[#2a2a2a]',           text: 'text-[#6b7280]', label: '\u25a1 A conseguir', dot: 'bg-gray-600' },
};

function fmxEquipo(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function EquiposTab({ proyectoId }: { proyectoId: string }) {
  const [data, setData] = React.useState<{ lineas: LineaEquipo[]; proveedores: ProveedorOpt[]; proyecto: { fechaEvento: string; fechaMontaje: string | null } } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [confirmando, setConfirmando] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [reclasificando, setReclasificando] = React.useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = React.useState<string | null>(null);

  // Formulario de confirmación de proveedor
  const [confProveedorId, setConfProveedorId] = React.useState('');
  const [confMonto, setConfMonto] = React.useState('');
  const [confFecha, setConfFecha] = React.useState('');
  const [confGenerarCxP, setConfGenerarCxP] = React.useState(true);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/equipos-cotizacion`, { cache: 'no-store' });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        setLoadError(`Error ${res.status}: ${txt.slice(0, 120) || 'Sin respuesta'}`);
        return;
      }
      setData(await res.json());
    } catch (e) {
      setLoadError(`Error de conexión: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, [proyectoId]); // eslint-disable-line

  // Cerrar menú al hacer clic fuera
  React.useEffect(() => {
    if (!menuAbierto) return;
    const handler = () => setMenuAbierto(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [menuAbierto]);

  function abrirConfirmacion(linea: LineaEquipo) {
    setConfirmando(linea.id);
    setMenuAbierto(null);
    setConfProveedorId(linea.proveedorId ?? '');
    setConfMonto(String(linea.costoExterno ?? linea.precioUnitario));
    const fe = data?.proyecto.fechaEvento;
    setConfFecha(fe ? fe.split('T')[0] : '');
    setConfGenerarCxP(true);
  }

  async function confirmar() {
    if (!confirmando || !confProveedorId || !confMonto) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/equipos-cotizacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineaId: confirmando, proveedorId: confProveedorId, monto: parseFloat(confMonto), fechaCompromiso: confFecha || undefined, generarCxP: confGenerarCxP }),
      });
      if (!res.ok) { alert('Error al confirmar'); return; }
      setConfirmando(null);
      await load();
    } finally { setSaving(false); }
  }

  async function reclasificar(lineaId: string, nuevoTipo: 'EQUIPO_PROPIO' | 'EQUIPO_EXTERNO') {
    setMenuAbierto(null);
    setReclasificando(lineaId);
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/equipos-cotizacion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineaId, nuevoTipo }),
      });
      if (!res.ok) { alert('Error al reclasificar'); return; }
      await load();
    } finally { setReclasificando(null); }
  }

  if (loading) return (
    <div className="space-y-3 py-4">
      <div className="h-4 w-48 bg-[#1a1a1a] rounded animate-pulse" />
      {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-[#111] rounded-xl animate-pulse" />)}
    </div>
  );

  if (loadError) return (
    <div className="bg-red-900/10 border border-red-800/30 rounded-xl p-5 text-center">
      <p className="text-red-400 text-sm font-medium mb-1">Error al cargar equipos</p>
      <p className="text-[#555] text-xs font-mono">{loadError}</p>
      <button onClick={load} className="mt-3 text-xs text-[#B3985B] hover:underline">Reintentar</button>
    </div>
  );

  if (!data || data.lineas.length === 0) return (
    <div className="text-center py-16 text-[#333]">
      <Package strokeWidth={1.75} className="w-9 h-9 mx-auto mb-3" />
      <p className="text-sm">Este proyecto no tiene equipos cotizados vinculados al inventario.</p>
      <p className="text-xs text-[#444] mt-1">Agrega equipos desde la cotización para verlos aquí.</p>
    </div>
  );

  const propios     = data.lineas.filter(l => l.tipo === 'EQUIPO_PROPIO');
  const externos    = data.lineas.filter(l => l.tipo === 'EQUIPO_EXTERNO' && l.clasificacion === 'EXTERNO_CONFIRMADO');
  const aConseguir  = data.lineas.filter(l => l.tipo === 'EQUIPO_EXTERNO' && l.clasificacion !== 'EXTERNO_CONFIRMADO');
  // Solo es "conflicto" real cuando no alcanzan las unidades disponibles (déficit), no cuando solo hay traslape de fechas.
  const conflictos  = propios.filter(l => l.cantidadTotal != null && l.disponible < l.cantidad);

  const fmtFechaCorta = (iso: string | null) =>
    iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—';

  const fechaRango = data.proyecto.fechaMontaje
    ? `${fmtFechaCorta(data.proyecto.fechaMontaje.split('T')[0])} → ${fmtFechaCorta(data.proyecto.fechaEvento.split('T')[0])}`
    : fmtFechaCorta(data.proyecto.fechaEvento.split('T')[0]);

  // Render de una fila de equipo (propios y externos comparten estructura)
  function FilaEquipo({ linea, mostrarAccion }: { linea: LineaEquipo; mostrarAccion?: boolean }) {
    const cfg = CLASIF_CFG[linea.clasificacion];
    // Alertar solo cuando faltan unidades (déficit), no por simple traslape de fechas con inventario aún disponible.
    const esConflicto = linea.tipo === 'EQUIPO_PROPIO' && linea.cantidadTotal != null && linea.disponible < linea.cantidad;
    const esConfirmando = confirmando === linea.id;
    const esReclasificando = reclasificando === linea.id;
    const menuOpen = menuAbierto === linea.id;

    return (
      <React.Fragment>
        <tr className={`border-t border-[#161616] transition-colors ${esConfirmando ? 'bg-[#0d0d0d]' : 'hover:bg-[#0d0d0d]'}`}>
          {/* Nombre */}
          <td className="px-4 py-2.5">
            <p className="text-white font-medium text-sm">
              {(linea.marca || linea.modelo) ? [linea.marca, linea.modelo].filter(Boolean).join(' · ') : linea.descripcion}
            </p>
            {(linea.marca || linea.modelo) && <p className="text-[#555] text-[10px]">{linea.descripcion}</p>}
            {linea.clasificacion === 'PROPIO_MANUAL' && (
              <p className="inline-flex items-center gap-1 text-[10px] text-yellow-700 mt-0.5"><AlertTriangle strokeWidth={1.75} className="w-3 h-3" /> Sin vínculo al inventario</p>
            )}
          </td>
          {/* Cantidad */}
          <td className="px-3 py-2.5 text-center">
            <span className="text-white font-medium text-sm">{linea.cantidad}</span>
            <span className="text-[#555] text-[10px] block">{linea.dias}d</span>
          </td>
          {/* Badge */}
          <td className="px-3 py-2.5 text-center">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
              {esConflicto && linea.tipo === 'EQUIPO_PROPIO'
                ? <><AlertTriangle strokeWidth={1.75} className="w-3 h-3" /> Conflicto</>
                : cfg.label
              }
            </span>
          </td>
          {/* Proveedor / fuente */}
          <td className="px-3 py-2.5 hidden md:table-cell">
            {linea.tipo === 'EQUIPO_PROPIO' ? (
              <span className="text-[11px] text-[#B3985B] font-medium">
                Mainstage Pro
                {linea.cantidadTotal != null && (
                  <span className="text-[#444] font-normal"> · {linea.disponible}/{linea.cantidadTotal} disp.</span>
                )}
              </span>
            ) : linea.proveedor ? (
              <span className="text-[11px] text-white">{linea.proveedor.nombre}</span>
            ) : (
              <span className="text-[#444] italic text-[11px]">Sin proveedor</span>
            )}
          </td>
          {/* Precio */}
          <td className="px-3 py-2.5 text-right hidden md:table-cell">
            {linea.cxp ? (
              <span className="text-[#B3985B] font-semibold tabular-nums text-xs">{fmxEquipo(linea.cxp.monto)}</span>
            ) : linea.costoExterno != null ? (
              <span className="text-[#9ca3af] tabular-nums text-xs">{fmxEquipo(linea.costoExterno)}</span>
            ) : (
              <span className="text-[#9ca3af] tabular-nums text-xs">{fmxEquipo(linea.precioUnitario * linea.dias)}/d</span>
            )}
          </td>
          {/* Acción */}
          <td className="px-3 py-2.5 text-center">
            <div className="flex items-center justify-center gap-1.5">
              {/* Botón de acción principal */}
              {linea.tipo === 'EQUIPO_PROPIO' ? (
                esConflicto
                  ? <span className="text-yellow-500 text-[10px]">Ver conflicto ↓</span>
                  : <span className="text-emerald-500 text-[10px]">✓ Listo</span>
              ) : (
                mostrarAccion && (
                  <button
                    onClick={() => abrirConfirmacion(linea)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                      linea.yaConfirmado
                        ? 'text-[#555] hover:text-[#B3985B]'
                        : 'bg-[#B3985B] hover:bg-[#c9a96a] text-black'
                    }`}
                  >
                    {linea.yaConfirmado ? 'Editar' : 'Confirmar'}
                  </button>
                )
              )}
              {/* Menú de reclasificación */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuAbierto(menuOpen ? null : linea.id); }}
                  disabled={esReclasificando}
                  className="text-[#333] hover:text-[#555] text-[10px] px-1 py-0.5 rounded transition-colors disabled:opacity-40"
                  title="Reclasificar equipo"
                >
                  {esReclasificando ? '...' : '⋮'}
                </button>
                {menuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1 z-50 bg-[#111] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 min-w-[160px]"
                  >
                    <p className="text-[9px] text-[#444] uppercase tracking-wider px-3 pt-1.5 pb-1">Reclasificar como:</p>
                    <button
                      onClick={() => reclasificar(linea.id, 'EQUIPO_PROPIO')}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-[#1a1a1a] transition-colors ${
                        linea.tipo === 'EQUIPO_PROPIO' ? 'text-emerald-400' : 'text-[#9ca3af]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      Equipo propio
                      {linea.tipo === 'EQUIPO_PROPIO' && <span className="ml-auto text-[9px] text-[#444]">✓ actual</span>}
                    </button>
                    <button
                      onClick={() => reclasificar(linea.id, 'EQUIPO_EXTERNO')}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-[#1a1a1a] transition-colors ${
                        linea.tipo === 'EQUIPO_EXTERNO' ? 'text-blue-400' : 'text-[#9ca3af]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      Externo / A conseguir
                      {linea.tipo === 'EQUIPO_EXTERNO' && <span className="ml-auto text-[9px] text-[#444]">✓ actual</span>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
        {/* Conflicto detalle */}
        {esConflicto && linea.tipo === 'EQUIPO_PROPIO' && (
          <tr className="border-t border-yellow-900/20 bg-yellow-900/5">
            <td colSpan={6} className="px-4 py-2.5">
              <p className="text-[10px] text-yellow-600 uppercase tracking-widest mb-1.5">Comprometido en:</p>
              <div className="space-y-1">
                {linea.conflictos.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="font-mono text-[#555]">{c.ref}</span>
                    <span className="text-white">{c.nombre}</span>
                    <span className="text-[#444] ml-auto">{fmtFechaCorta(c.fecha)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-yellow-700 mt-2">Coordina con el equipo o usa el menú \u22ee para reclasificar como externo.</p>
            </td>
          </tr>
        )}
        {/* Formulario confirmación proveedor */}
        {esConfirmando && (
          <tr className="border-t border-[#B3985B]/20 bg-[#0a0a0a]">
            <td colSpan={6} className="px-4 py-4">
              <div className="max-w-xl">
                <p className="text-xs font-semibold text-white mb-3">
                  {linea.yaConfirmado ? 'Editar confirmación' : 'Confirmar equipo externo'}: {linea.descripcion}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">Proveedor *</label>
                    <select value={confProveedorId} onChange={e => setConfProveedorId(e.target.value)}
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]/50">
                      <option value="">— Selecciona —</option>
                      {(data?.proveedores ?? []).map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}{p.empresa ? ` · ${p.empresa}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">Precio confirmado *</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555] text-xs">$</span>
                      <input type="number" value={confMonto} onChange={e => setConfMonto(e.target.value)} min={0}
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg pl-6 pr-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]/50"
                        placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">Fecha compromiso pago</label>
                    <input type="date" value={confFecha} onChange={e => setConfFecha(e.target.value)}
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]/50" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-[#9ca3af] mb-3 cursor-pointer">
                  <input type="checkbox" checked={confGenerarCxP} onChange={e => setConfGenerarCxP(e.target.checked)}
                    className="accent-[#B3985B] w-3.5 h-3.5" />
                  Generar cuenta por pagar al proveedor
                </label>
                <div className="flex items-center gap-2">
                  <button onClick={confirmar} disabled={saving || !confProveedorId || !confMonto}
                    className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                    {saving ? 'Guardando...' : linea.yaConfirmado ? 'Guardar cambios' : 'Confirmar equipo'}
                  </button>
                  <button onClick={() => setConfirmando(null)}
                    className="border border-[#333] text-[#6b7280] hover:text-white text-xs px-3 py-2 rounded-lg transition-colors">Cancelar</button>
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Equipos del proyecto</h2>
          <p className="text-[#6b7280] text-xs mt-0.5">Disponibilidad verificada para: {fechaRango}</p>
        </div>
        <button onClick={load} className="text-xs text-[#555] hover:text-[#B3985B] transition-colors">↻ Actualizar</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="ms-card p-3">
          <p className="text-[#6b7280] text-[10px] mb-1">Propios</p>
          <p className="text-white text-xl font-semibold">{propios.length}</p>
          <p className="text-[#444] text-[10px]">{conflictos.length > 0 ? `${conflictos.length} con faltante` : 'Inventario suficiente'}</p>
        </div>
        <div className="ms-card p-3">
          <p className="text-[#6b7280] text-[10px] mb-1">Externos confirmados</p>
          <p className="text-emerald-400 text-xl font-semibold">{externos.length}</p>
          <p className="text-[#444] text-[10px]">Proveedor asignado</p>
        </div>
        <div className={`border rounded-xl p-3 ${aConseguir.length > 0 ? 'bg-orange-900/10 border-orange-800/30' : 'bg-[#111] border-[#1e1e1e]'}`}>
          <p className="text-[#6b7280] text-[10px] mb-1">A conseguir</p>
          <p className={`text-xl font-semibold ${aConseguir.length > 0 ? 'text-orange-400' : 'text-white'}`}>{aConseguir.length}</p>
          <p className="text-[#444] text-[10px]">{aConseguir.length > 0 ? 'Requieren atención' : 'Todo resuelto'}</p>
        </div>
      </div>

      {/* Sección: A conseguir — siempre primera si hay pendientes */}
      {aConseguir.length > 0 && (
        <div className="bg-[#111] border border-orange-900/30 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-orange-900/10 border-b border-orange-900/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-[10px] text-orange-400 uppercase tracking-widest font-semibold">A conseguir ({aConseguir.length})</span>
            </div>
            <span className="text-[10px] text-[#555]">Asigna proveedor + genera CxP</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                  <th className="text-left px-4 py-2 font-medium">Equipo</th>
                  <th className="text-center px-3 py-2 font-medium w-20">Cant.</th>
                  <th className="text-center px-3 py-2 font-medium w-32">Estado</th>
                  <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Proveedor</th>
                  <th className="text-right px-3 py-2 font-medium hidden md:table-cell w-24">Precio ref.</th>
                  <th className="text-center px-3 py-2 font-medium w-28">Acción</th>
                </tr>
              </thead>
              <tbody>
                {aConseguir.map(l => <FilaEquipo key={l.id} linea={l} mostrarAccion />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sección: Externos confirmados */}
      {externos.length > 0 && (
        <div className="ms-table-wrapper">
          <div className="px-4 py-2.5 bg-blue-900/5 border-b border-blue-900/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-[10px] text-blue-400 uppercase tracking-widest font-semibold">Proveedor externo ({externos.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                  <th className="text-left px-4 py-2 font-medium">Equipo</th>
                  <th className="text-center px-3 py-2 font-medium w-20">Cant.</th>
                  <th className="text-center px-3 py-2 font-medium w-32">Estado</th>
                  <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Proveedor</th>
                  <th className="text-right px-3 py-2 font-medium hidden md:table-cell w-24">Monto CxP</th>
                  <th className="text-center px-3 py-2 font-medium w-28">Acción</th>
                </tr>
              </thead>
              <tbody>
                {externos.map(l => <FilaEquipo key={l.id} linea={l} mostrarAccion />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sección: Equipos propios */}
      {propios.length > 0 && (
        <div className="ms-table-wrapper">
          <div className="px-4 py-2.5 bg-emerald-900/5 border-b border-emerald-900/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">Equipo propio ({propios.length})</span>
            {conflictos.length > 0 && (
              <span className="ml-auto text-[10px] text-yellow-500">{conflictos.length} con faltante de inventario</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a1a] text-[#6b7280]">
                  <th className="text-left px-4 py-2 font-medium">Equipo</th>
                  <th className="text-center px-3 py-2 font-medium w-20">Cant.</th>
                  <th className="text-center px-3 py-2 font-medium w-32">Estado</th>
                  <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Fuente</th>
                  <th className="text-right px-3 py-2 font-medium hidden md:table-cell w-24">Precio/d</th>
                  <th className="text-center px-3 py-2 font-medium w-28">Acción</th>
                </tr>
              </thead>
              <tbody>
                {propios.map(l => <FilaEquipo key={l.id} linea={l} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[10px] text-[#333] text-right">
        Usa el menú (⋮) en cada fila para reclasificar entre propio, externo o a conseguir.
      </p>
    </div>
  );
}


export default function ProyectoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMsg, setLoadErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [openDocs, setOpenDocs] = useState<Set<string>>(new Set());
  const [gastosOp, setGastosOp] = useState<GastoOp[]>([]);
  const [gastosLoaded, setGastosLoaded] = useState(false);
  const [showGastoOpForm, setShowGastoOpForm] = useState(false);
  const [gastoOpForm, setGastoOpForm] = useState({ tipo: "COMIDA", concepto: "", monto: "", cantidad: "1", notas: "" });
  const [togglingGasto, setTogglingGasto] = useState<string | null>(null);
  const [editingGastoOpId, setEditingGastoOpId] = useState<string | null>(null);
  const [editGastoOpForm, setEditGastoOpForm] = useState({ tipo: "COMIDA", concepto: "", monto: "", cantidad: "1", notas: "" });
  const [savingEditGastoOp, setSavingEditGastoOp] = useState(false);

  // Evaluación interna
  type EvalData = {
    planeacionPrevia: number; cumplimientoTecnico: number; puntualidad: number;
    resolucionOperativa: number; desempenoPersonal: number; comunicacionInterna: number;
    comunicacionCliente: number; usoEquipo: number; rentabilidadReal: number;
    resultadoGeneral: number; notas: string; promedioCalculado: number | null;
    comentariosCriterios: Record<string, string>; // comentario por criterio
  };
  type ReporteItem = { area: string; problema: string; causa: string; solucion: string };
  const EVAL_EMPTY: EvalData = {
    planeacionPrevia: 0, cumplimientoTecnico: 0, puntualidad: 0,
    resolucionOperativa: 0, desempenoPersonal: 0, comunicacionInterna: 0,
    comunicacionCliente: 0, usoEquipo: 0, rentabilidadReal: 0,
    resultadoGeneral: 0, notas: "", promedioCalculado: null,
    comentariosCriterios: {},
  };
  const [evaluacion, setEvaluacion] = useState<EvalData>(EVAL_EMPTY);
  const [reportePostEvento, setReportePostEvento] = useState<ReporteItem[]>([]);
  const [savingReporte, setSavingReporte] = useState(false);
  const [evalLoaded, setEvalLoaded] = useState(false);
  const [savingEval, setSavingEval] = useState(false);

  // Esquema de cobro
  const [editandoEsquema, setEditandoEsquema] = useState(false);
  const [esquemaAnticipoPct, setEsquemaAnticipoPct] = useState("25");
  const [esquemaAnticipoMonto, setEsquemaAnticipoMonto] = useState("");
  const [esquemaAnticipoTipo, setEsquemaAnticipoTipo] = useState<"porcentaje" | "monto">("porcentaje");
  const [esquemaAnticipoFecha, setEsquemaAnticipoFecha] = useState("");
  const [esquemaLiqFecha, setEsquemaLiqFecha] = useState("");
  const [savingEsquema, setSavingEsquema] = useState(false);
  const [syncingCxC, setSyncingCxC] = useState(false);


  // Evaluación cliente
  type EvalClienteData = {
    id: string; tokenAcceso: string; enviada: boolean; respondida: boolean;
    satisfaccionGeneral: number | null; calidadServicio: number | null;
    puntualidad: number | null; atencionEquipo: number | null;
    claridadComunicacion: number | null; relacionCalidadPrecio: number | null;
    probabilidadRecontratacion: number | null;
    loMejor: string | null; loMejorable: string | null; comentarioAdicional: string | null;
    promedioCalculado: number | null;
  };
  const [evalCliente, setEvalCliente] = useState<EvalClienteData | null>(null);
  const [evalClienteLoaded, setEvalClienteLoaded] = useState(false);
  const [loadingEvalCliente, setLoadingEvalCliente] = useState(false);
  const [generandoLink, setGenerandoLink] = useState(false);
  // Usuario actual (para gate de la evaluación de dirección)
  const [yo, setYo] = useState<{ role: string | null; area: string | null } | null>(null);
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.user) setYo({ role: d.user.role ?? null, area: d.user.area ?? null }); })
      .catch(() => {});
  }, []);
  const esDireccion = yo?.role === "ADMIN" || yo?.area === "DIRECCION";
  // Reporte post-evento

  // Cierre financiero
  type CierreData = {
    estimado: { granTotalEstimado: number; costoEstimado: number; utilidadEstimada: number };
    real: { totalCobrado: number; totalGastado: number; utilidadReal: number; margenReal: number };
    desgloseCostos: { categoria: string; monto: number }[];
    cierreExistente: { cerradoEn: string; notas: string | null } | null;
  };
  const [cierreData, setCierreData] = useState<CierreData | null>(null);
  const [loadingCierre, setLoadingCierre] = useState(false);
  const [savingCierre, setSavingCierre] = useState(false);
  const [cierreNotas, setCierreNotas] = useState("");
  const [showCierreModal, setShowCierreModal] = useState(false);
  // Checklist de cierre de evento (local, solo UI)
  const [cierreChecklist, setCierreChecklist] = useState({ desmontaje: false, bodega: false, evalCliente: false });
  const [showCierreFlow, setShowCierreFlow] = useState(false);
  const [showAnuncioCierre, setShowAnuncioCierre] = useState(false);

  async function loadCierre() {
    setLoadingCierre(true);
    const res = await fetch(`/api/proyectos/${id}/cierre`, { cache: "no-store" });
    const d = await res.json();
    setCierreData(d);
    setCierreNotas(d.cierreExistente?.notas ?? "");
    setLoadingCierre(false);
  }

  async function guardarCierre() {
    if (!cierreData) return;
    setSavingCierre(true);
    const res = await fetch(`/api/proyectos/${id}/cierre`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cierreData.real, ...cierreData.estimado, desgloseCostos: cierreData.desgloseCostos, notas: cierreNotas }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSavingCierre(false);
      return;
    }
    setSavingCierre(false);
    setShowCierreModal(false);
    toast.success("Cierre financiero guardado");
    await load();
  }

  // Portal de clientes
  const [generandoToken, setGenerandoToken] = useState(false);
  const [revocandoToken, setRevocandoToken] = useState(false);
  const [notasPortal, setNotasPortal] = useState("");
  const [savingNotasPortal, setSavingNotasPortal] = useState(false);

  async function generarPortalToken() {
    setGenerandoToken(true);
    const res = await fetch(`/api/proyectos/${id}/portal-token`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al generar enlace");
      setGenerandoToken(false);
      return;
    }
    setGenerandoToken(false);
    toast.success("Enlace de portal generado");
    await load();
  }

  async function revocarPortalToken() {
    const ok = await confirm({ message: "¿Revocar el enlace del portal? El cliente ya no podrá acceder con el enlace anterior.", danger: true, confirmText: "Revocar" });
    if (!ok) return;
    setRevocandoToken(true);
    const res = await fetch(`/api/proyectos/${id}/portal-token`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al revocar");
      setRevocandoToken(false);
      return;
    }
    setRevocandoToken(false);
    toast.success("Enlace revocado");
    await load();
  }

  // Enlace de confirmación de información (cliente completa el resumen)
  const [generandoInfoToken, setGenerandoInfoToken] = useState(false);
  const [revocandoInfoToken, setRevocandoInfoToken] = useState(false);

  async function generarInfoToken() {
    setGenerandoInfoToken(true);
    const res = await fetch(`/api/proyectos/${id}/info-token`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al generar enlace");
      setGenerandoInfoToken(false);
      return;
    }
    const d = await res.json();
    if (d.token) {
      const url = `${window.location.origin}/confirmar/proyecto/${d.token}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Enlace generado y copiado al portapapeles");
    }
    setGenerandoInfoToken(false);
    await load();
  }

  async function copiarInfoLink() {
    if (!proyecto?.infoToken) return;
    const url = `${window.location.origin}/confirmar/proyecto/${proyecto.infoToken}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Enlace copiado");
  }

  async function revocarInfoToken() {
    const ok = await confirm({ message: "¿Revocar el enlace de confirmación? El cliente ya no podrá acceder con el enlace anterior.", danger: true, confirmText: "Revocar" });
    if (!ok) return;
    setRevocandoInfoToken(true);
    const res = await fetch(`/api/proyectos/${id}/info-token`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al revocar");
      setRevocandoInfoToken(false);
      return;
    }
    setRevocandoInfoToken(false);
    toast.success("Enlace revocado");
    await load();
  }

  async function guardarNotasPortal() {
    setSavingNotasPortal(true);
    const res = await fetch(`/api/proyectos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notasPortal: notasPortal || null }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSavingNotasPortal(false);
      return;
    }
    setSavingNotasPortal(false);
    toast.success("Notas del portal guardadas");
    await load();
  }

  async function guardarResponsables(data?: typeof responsables) {
    const toSave = data ?? responsables;
    setSavingResp(true);
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responsables: JSON.stringify(toSave) }),
    });
    setSavingResp(false);
  }

  // Catálogos
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [roles, setRoles] = useState<RolTecnico[]>([]);
  const [categorias, setCategorias] = useState<CatFinanciera[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  // Estado de cronograma (tabla JSON)
  const [cronoRows, setCronoRows] = useState<CronoRow[]>([]);
  const [savingCrono, setSavingCrono] = useState(false);
  const cronoLoaded = useRef(false);
  const cronoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const CRONO_BASE: CronoRow[] = [
    { horaInicio: "", horaFin: "", actividad: "Llamado en bodega", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Cargar transporte", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Traslado a venue", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Llegada a venue y descarga de equipos", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Acomodo seccionado de equipos", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Inicio de montaje", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Fin de montaje", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Pruebas de sonido", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Pruebas de iluminación", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Inicio de evento", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Fin de evento / Inicio de desmontaje", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Orden de equipos para carga a transporte", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Carga de equipos a transporte", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Traslado a bodega", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Llegada a bodega y descarga de equipos", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Acomodo de equipos en bodega", responsable: "", involucrados: "" },
    { horaInicio: "", horaFin: "", actividad: "Fin de la jornada", responsable: "", involucrados: "" },
  ];

  // Estado de transportes (3 fichas JSON)
  const [transporteSlots, setTransporteSlots] = useState<TransporteSlot[]>([
    { vehiculoId: "", choferId: "", horaSalida: "", comentarios: "" },
  ]);
  const [savingTransporte, setSavingTransporte] = useState(false);

  // Estado catering
  type CateringData = {
    proveedorId: string; contactoNombre: string; contactoTelefono: string;
    personasCrew: string; comidasPorDia: string; notas: string; confirmado: boolean;
  };
  const CATERING_EMPTY: CateringData = { proveedorId: "", contactoNombre: "", contactoTelefono: "", personasCrew: "", comidasPorDia: "", notas: "", confirmado: false };
  const [catering, setCatering] = useState<CateringData>(CATERING_EMPTY);
  const [savingCatering, setSavingCatering] = useState(false);
  const cateringLoaded = useRef(false);
  const cateringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estado para documentos
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);

  // Estados para equipos
  const [showAddEquipo, setShowAddEquipo] = useState(false);
  const [equipoCatalogo, setEquipoCatalogo] = useState<{ id: string; descripcion: string; marca: string | null; categoria: { nombre: string } }[]>([]);
  const [selEquipoId, setSelEquipoId] = useState("");
  const [selEquipoTipo, setSelEquipoTipo] = useState("PROPIO");
  const [selEquipoCantidad, setSelEquipoCantidad] = useState("1");
  const [selEquipoDias, setSelEquipoDias] = useState("1");
  const [selEquipoCosto, setSelEquipoCosto] = useState("");
  const [selEquipoProveedor, setSelEquipoProveedor] = useState("");
  const [addingEquipo, setAddingEquipo] = useState(false);
  const [agregarACot, setAgregarACot] = useState(false);
  const [dispEquipo, setDispEquipo] = useState<{ disponible: boolean; cantidadTotal: number; cantidadComprometida: number; cantidadDisponible: number; conflictos: { id: string; nombre: string; numeroProyecto: string; cantidadUsada: number }[] } | null>(null);

  // Estados para agregar personal
  const [showAddPersonal, setShowAddPersonal] = useState(false);
  const [selTecnico, setSelTecnico] = useState("");
  const [selRol, setSelRol] = useState("");
  const [selNivel, setSelNivel] = useState("AAA");
  const [selJornada, setSelJornada] = useState("MEDIA");
  const [selTarifa, setSelTarifa] = useState("");
  const [selResp, setSelResp] = useState("");
  const [selParticipacion, setSelParticipacion] = useState("OPERACION");
  const [selFechaJornada, setSelFechaJornada] = useState("");
  const [selRolEnEvento, setSelRolEnEvento] = useState("");
  const [addingPersonal, setAddingPersonal] = useState(false);
  // Quick-add inline: state for the mini-form shown when clicking "+ Agregar" on a date block
  const [quickAddFechaId, setQuickAddFechaId] = useState<string | null>(null); // key = fecha string or "__new__"
  const [quickAddPart, setQuickAddPart] = useState("OPERACION");
  const [quickAddFecha, setQuickAddFecha] = useState("");
  const [disponibilidad, setDisponibilidad] = useState<{ disponible: boolean; conflictos: { id: string; nombre: string; numeroProyecto: string }[] } | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const [agregandoLinea, setAgregandoLinea] = useState<string | null>(null);
  // Sugerencias de técnicos por disciplina (operación técnica)
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState<string | null>(null); // key de la línea/disciplina expandida
  const [sugerenciasCache, setSugerenciasCache] = useState<Record<string, SugerenciaTecnico[]>>({});
  const [sugerenciasLoading, setSugerenciasLoading] = useState<string | null>(null);
  const [agregandoSugerido, setAgregandoSugerido] = useState<string | null>(null); // tecnicoId en curso
  // Flag "técnico adicional" (fuera de lo cotizado) para el form de alta
  const [selEsAdicional, setSelEsAdicional] = useState(false);
  // Proveedores y subrentas
  const [showAddProveedor, setShowAddProveedor] = useState(false);
  const { downloading, downloadPdf } = usePdfDownload();
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string; filename: string } | null>(null);
  const previewPdf = (url: string, title: string, filename: string) => setPdfPreview({ url, title, filename });
  const [provNombre, setProvNombre] = useState("");
  const [provServicio, setProvServicio] = useState("");
  const [provTelefono, setProvTelefono] = useState("");
  const [addingProveedor, setAddingProveedor] = useState(false);
  const [editandoProveedorId, setEditandoProveedorId] = useState<string | null>(null);
  const [editProvForm, setEditProvForm] = useState({ nombre: "", servicio: "", telefono: "" });

  // Estados para nuevo técnico inline
  const [showNuevoTecnico, setShowNuevoTecnico] = useState(false);
  const [nuevoTecNombre, setNuevoTecNombre] = useState("");
  const [nuevoTecCelular, setNuevoTecCelular] = useState("");
  const [nuevoTecRolId, setNuevoTecRolId] = useState("");
  const [nuevoTecNivel, setNuevoTecNivel] = useState("A");
  const [creandoTecnico, setCreandoTecnico] = useState(false);

  // Estados para checklist
  const [nuevoItem, setNuevoItem] = useState("");
  const [aplicandoPlantilla, setAplicandoPlantilla] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [nuevoItemRider, setNuevoItemRider] = useState("");
  const [addingItemRider, setAddingItemRider] = useState(false);
  const [generandoRider, setGenerandoRider] = useState(false);
  // Rider visual por equipo (estado local, no persiste — guía de carga)
  const [equipoCargado, setEquipoCargado] = useState<Record<string, boolean>>({});
  const [accesorioCargado, setAccesorioCargado] = useState<Record<string, boolean>>({});
  const [equipoExpanded, setEquipoExpanded] = useState<Record<string, boolean>>({});
  // Rider accesorios — estado persistido por proyecto
  const [riderEquipos, setRiderEquipos] = useState<ProyectoEquipoItem[]>([]);
  const [riderExpandido, setRiderExpandido] = useState<Record<string, boolean>>({});
  const [riderAddOpen, setRiderAddOpen] = useState<string | null>(null); // proyectoEquipoId
  const [riderAddNombre, setRiderAddNombre] = useState("");
  const [riderAddCantidad, setRiderAddCantidad] = useState(1);
  const [riderAddCategoria, setRiderAddCategoria] = useState("");
  const [riderAddGuardar, setRiderAddGuardar] = useState(true);
  const [riderAddSaving, setRiderAddSaving] = useState(false);
  // Cantidad pendiente por sugerencia de accesorio, key = `${proyectoEquipoId}::${nombre}`
  const [sugCantidad, setSugCantidad] = useState<Record<string, number>>({});

  // Proveedores de subarriendo (manuales)
  type ProveedorRenta = { id: string; nombre: string; contacto: string; equipos: string[] };
  const [proveedoresRentaData, setProveedoresRentaData] = useState<ProveedorRenta[]>([]);
  const [addingProvRenta, setAddingProvRenta] = useState(false);
  const [newProvNombre, setNewProvNombre] = useState("");
  const [newProvContacto, setNewProvContacto] = useState("");
  const [newProvEquipos, setNewProvEquipos] = useState("");

  async function saveProveedoresRenta(data: ProveedorRenta[]) {
    setProveedoresRentaData(data);
    const body = JSON.stringify({ proveedoresRenta: JSON.stringify(data) });
    const res = await fetch(`/api/proyectos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    const d = await res.json();
    if (d.proyecto) setProyecto(prev => prev ? { ...prev, proveedoresRenta: d.proyecto.proveedoresRenta } : prev);
  }

  // Equipos extra al rider (fuera de cotización)
  type EquipoRiderExtra = { id: string; descripcion: string; cantidad: number; notas: string; completado: boolean; accesorios?: { id: string; nombre: string; cantidad: number }[] };
  const [equiposRiderExtra, setEquiposRiderExtra] = useState<EquipoRiderExtra[]>([]);
  const [addingEquipoExtra, setAddingEquipoExtra] = useState(false);
  const [newExtraEquipoId, setNewExtraEquipoId] = useState("");
  const [newExtraCant, setNewExtraCant] = useState(1);
  const [newExtraNotas, setNewExtraNotas] = useState("");
  const [extraEditId, setExtraEditId] = useState<string | null>(null);
  const [extraEditDesc, setExtraEditDesc] = useState("");
  const [extraEditCant, setExtraEditCant] = useState(1);
  const [extraEditNotas, setExtraEditNotas] = useState("");
  const [extraAddMode, setExtraAddMode] = useState<"inventario" | "manual">("inventario");
  // Edición de cantidad en rider de carga
  const [riderEquipoEditId, setRiderEquipoEditId] = useState<string | null>(null);
  const [riderEquipoEditCant, setRiderEquipoEditCant] = useState(1);
  const [riderNotasEditId, setRiderNotasEditId] = useState<string | null>(null);
  const [riderNotasText, setRiderNotasText] = useState("");
  const [newExtraManualDesc, setNewExtraManualDesc] = useState("");
  const [extraAccOpen, setExtraAccOpen] = useState<string | null>(null);
  const [extraAccNombre, setExtraAccNombre] = useState("");
  const [extraAccCant, setExtraAccCant] = useState(1);

  async function saveEquiposRiderExtra(data: EquipoRiderExtra[]) {
    setEquiposRiderExtra(data);
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equiposRiderExtra: JSON.stringify(data) }),
    });
  }

  // Estados para bitácora
  const [notaBitacora, setNotaBitacora] = useState("");
  const [addingNota, setAddingNota] = useState(false);

  // Estados para registrar pago
  const [pagando, setPagando] = useState<string | null>(null);
  const [montoPago, setMontoPago] = useState("");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0]);
  const [cuentaPagoId, setCuentaPagoId] = useState("");
  const [metodoPagoFinanzas, setMetodoPagoFinanzas] = useState("TRANSFERENCIA");
  const [cuentasBancarias, setCuentasBancarias] = useState<Array<{ id: string; nombre: string; banco: string | null }>>([]);
  const [anulando, setAnulando] = useState<string | null>(null);

  // Estados para ajuste de monto en CxC/CxP
  const [ajustando, setAjustando] = useState<string | null>(null);    // id de la cuenta en edición
  const [ajusteMonto, setAjusteMonto] = useState("");
  const [ajusteMotivo, setAjusteMotivo] = useState("");
  const [ajusteFecha, setAjusteFecha] = useState("");
  const [ajusteHistorial, setAjusteHistorial] = useState<string | null>(null); // id cuyo historial está expandido
  // Extra como gasto operativo al subir monto CxC
  const [ajusteRegistrarExtra, setAjusteRegistrarExtra] = useState(false);
  const [ajusteExtraTipo, setAjusteExtraTipo] = useState("OTRO");
  const [ajusteExtraConcepto, setAjusteExtraConcepto] = useState("");

  // Estados para asignar técnico a fila sin asignar
  const [asignandoId, setAsignandoId] = useState<string | null>(null);
  const [selAsignar, setSelAsignar] = useState("");
  const [crearParaSlotId, setCrearParaSlotId] = useState<string | null>(null);
  // Estado para editar slot de personal completo
  const [editandoPersonalId, setEditandoPersonalId] = useState<string | null>(null);
  const [editPersonalForm, setEditPersonalForm] = useState({ tecnicoId: "", rolTecnicoId: "", nivel: "A", jornada: "MEDIA", tarifa: "", participacion: "OPERACION", responsabilidad: "", rolEnEvento: "", fechaJornada: "" });
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Estados para otros gastos
  const [showGastoForm, setShowGastoForm] = useState(false);
  const [gastoConcepto, setGastoConcepto] = useState("");
  const [gastoMonto, setGastoMonto] = useState("");
  const [gastoFecha, setGastoFecha] = useState(new Date().toISOString().split("T")[0]);
  const [gastoNotas, setGastoNotas] = useState("");
  const [gastoMetodo, setGastoMetodo] = useState("TRANSFERENCIA");
  const [gastoCategoria, setGastoCategoria] = useState("");
  const [gastoReferencia, setGastoReferencia] = useState("");
  const [gastoProveedor, setGastoProveedor] = useState("");
  const [gastoCuenta, setGastoCuenta] = useState("");
  const [addingGasto, setAddingGasto] = useState(false);
  const [editGasto, setEditGasto] = useState<Gasto | null>(null);
  const [editGastoForm, setEditGastoForm] = useState({ concepto: "", monto: "", fecha: "", notas: "", referencia: "", metodoPago: "TRANSFERENCIA", categoriaId: "", proveedorId: "", cuentaOrigenId: "" });
  const [editGastoEstado, setEditGastoEstado] = useState<"PENDIENTE" | "PAGADO">("PAGADO");
  const [editingCxPId, setEditingCxPId] = useState<string | null>(null);
  const [savingGasto, setSavingGasto] = useState(false);
  const [gastoEstado, setGastoEstado] = useState<"PENDIENTE" | "PAGADO">("PENDIENTE");
  const [refCotOpen, setRefCotOpen] = useState(true);
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [marcarPagadoId, setMarcarPagadoId] = useState<string | null>(null);
  const [marcarPagadoFecha, setMarcarPagadoFecha] = useState(new Date().toISOString().split("T")[0]);
  const [savingMarcarPagado, setSavingMarcarPagado] = useState(false);

  // Estados para nueva CxP manual desde el proyecto
  const [showNuevaCxP, setShowNuevaCxP] = useState(false);
  const [nuevaCxPConcepto, setNuevaCxPConcepto] = useState("");
  const [nuevaCxPMonto, setNuevaCxPMonto] = useState("");
  const [nuevaCxPFecha, setNuevaCxPFecha] = useState(new Date().toISOString().split("T")[0]);
  const [nuevaCxPTipo, setNuevaCxPTipo] = useState("OTRO");
  const [nuevaCxPTecnicoId, setNuevaCxPTecnicoId] = useState("");
  const [nuevaCxPProveedorId, setNuevaCxPProveedorId] = useState("");
  const [nuevaCxPNotas, setNuevaCxPNotas] = useState("");
  const [savingNuevaCxP, setSavingNuevaCxP] = useState(false);

  // Estado para confirmación de borrado
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumen'|'operacion'|'extras'|'finanzas'|'tareas'>('resumen');

  // ── Pago a inversionistas por uso de equipos propios ──────────────────────
  type PagoSociosData = {
    viabilidad: { pctUtilidad: number; pctFormateado: string; tier: { label: string; pct: number; pctFormateado: string; color: string } };
    equipoPropio: { lineas: { id: string; descripcion: string; marca: string | null; cantidad: number; precioUnitario: number; subtotal: number }[]; total: number };
    montoInversionista: number;
    socios: { id: string; nombre: string; tipo: string; cxpExistente: { id: string; monto: number; estado: string; fechaCompromiso: string } | null }[];
    tiers: { min: number; pct: number; label: string; color: string; activo: boolean }[];
    diasEvento: number;
  };
  const [pagoSocios, setPagoSocios] = useState<PagoSociosData | null>(null);
  const [loadingPagoSocios, setLoadingPagoSocios] = useState(false);
  const [pctOverride, setPctOverride] = useState<string>("");
  const [fechaCompromisoSocio, setFechaCompromisoSocio] = useState<string>("");
  const [savingPagoSocio, setSavingPagoSocio] = useState<string | null>(null);
  const [notasPagoSocio, setNotasPagoSocio] = useState<string>("");

  async function loadPagoSocios() {
    setLoadingPagoSocios(true);
    try {
      const res = await fetch(`/api/proyectos/${id}/pago-socios`);
      if (!res.ok) return;
      const data = await res.json();
      setPagoSocios(data);
      // Pre-llenar % con el automático
      setPctOverride((data.viabilidad.tier.pct * 100).toFixed(0));
      // Pre-llenar fecha: evento + 15 días
      if (data.proyecto?.fechaEvento) {
        const d = new Date(data.proyecto.fechaEvento);
        d.setDate(d.getDate() + 15);
        setFechaCompromisoSocio(d.toISOString().slice(0, 10));
      }
    } finally {
      setLoadingPagoSocios(false);
    }
  }

  async function generarPagoSocio(socioId: string) {
    if (!pagoSocios || !fechaCompromisoSocio) return;
    const pct = (parseFloat(pctOverride) || 0) / 100;
    const monto = pagoSocios.equipoPropio.total * pct;
    if (monto <= 0) { toast.error("El monto calculado es $0 — revisa el porcentaje y equipos"); return; }
    setSavingPagoSocio(socioId);
    try {
      const res = await fetch(`/api/proyectos/${id}/pago-socios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socioId, monto, fechaCompromiso: fechaCompromisoSocio, notas: notasPagoSocio || null, pctAplicado: pct }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error ?? "Error al generar cuenta por pagar"); return; }
      toast.success("Cuenta por pagar generada correctamente");
      await loadPagoSocios();
    } finally {
      setSavingPagoSocio(null);
    }
  }

  const [vehiculos, setVehiculos] = useState<{ id: string; nombre: string; marca: string | null; modelo: string | null; placas: string | null }[]>([]);

  // Viabilidad
  const [viabilidad, setViabilidad] = useState<{
    viabilidadActiva: ViabilidadActiva | null;
    historico: ViabilidadHistoricoItem[];
  } | null>(null);
  const [usuariosActivos, setUsuariosActivos] = useState<{ id: string; name: string; area: string | null }[]>([]);
  type Responsables = { produccion: string; logistica: string; finanzas: string; marketing: string };
  const [responsables, setResponsables] = useState<Responsables>({ produccion: "", logistica: "", finanzas: "", marketing: "" });
  const [savingResp, setSavingResp] = useState(false);

  // Notificación de cambios en campos clave
  type CambioNotif = {
    campoLabel: string;
    valor: string;
    contactos: Array<{ nombre: string; tipo: "tecnico" | "proveedor"; waUrl: string | null }>;
  };
  const [pendingNotif, setPendingNotif] = useState<CambioNotif | null>(null);
  const [directorioOpen, setDirectorioOpen] = useState(false);

  const KEY_CAMPOS: Record<string, string> = {
    fechaEvento: "Fecha del evento",
    horaInicioEvento: "Hora inicio del evento",
    horaFinEvento: "Hora fin del evento",
    lugarEvento: "Lugar del evento",
    fechaMontaje: "Día de montaje",
    horaInicioMontaje: "Hora inicio montaje",
  };

  async function load() {
    setLoadError(false);
    setLoadErrorMsg("");
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, 15000);
    try {
      const res = await fetch(`/api/proyectos/${id}`, { cache: "no-store", signal: controller.signal });
      clearTimeout(timeout);
      const text = await res.text();
      let d: Record<string, unknown> = {};
      try { d = JSON.parse(text); } catch { setLoadError(true); setLoadErrorMsg(`Respuesta no válida (${res.status}): ${text.slice(0, 200)}`); return; }
      if (!res.ok) { setLoadError(true); setLoadErrorMsg(`Error ${res.status}: ${(d.error as string) ?? text.slice(0, 200)}`); return; }
      if (!d.proyecto) { setLoadError(true); setLoadErrorMsg("API no devolvió proyecto"); return; }
      const p = d.proyecto as Proyecto;
      setProyecto(p);
      setRiderEquipos(p.equipos ?? []);
      try { setProveedoresRentaData(p.proveedoresRenta ? JSON.parse(p.proveedoresRenta) : []); } catch { /* ignore */ }
      try { setEquiposRiderExtra(p.equiposRiderExtra ? JSON.parse(p.equiposRiderExtra) : []); } catch { /* ignore */ }
      setNotasPortal(p.notasPortal ?? "");
      try {
        const resp = p.responsables ? JSON.parse(p.responsables) : {};
        setResponsables({ produccion: resp.produccion ?? "", logistica: resp.logistica ?? "", finanzas: resp.finanzas ?? "", marketing: resp.marketing ?? "" });
      } catch { /* ignore */ }
    } catch (e) {
      clearTimeout(timeout);
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Error cargando proyecto:", msg);
      setLoadError(true);
      setLoadErrorMsg(msg.includes("abort") ? "Tiempo de espera agotado (15s)" : msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadGastosOp() {
    const r = await fetch(`/api/proyectos/gastos-operativos?proyectoId=${id}`, { cache: "no-store" });
    const d = await r.json();
    setGastosOp(d.gastos ?? []);
    setGastosLoaded(true);
  }

  async function agregarGastoOp() {
    if (!gastoOpForm.concepto || !gastoOpForm.monto) return;
    const r = await fetch("/api/proyectos/gastos-operativos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proyectoId: id, ...gastoOpForm, monto: parseFloat(gastoOpForm.monto), cantidad: parseInt(gastoOpForm.cantidad) || 1 }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
    setGastoOpForm({ tipo: "COMIDA", concepto: "", monto: "", cantidad: "1", notas: "" });
    setShowGastoOpForm(false);
    loadGastosOp();
  }

  async function toggleEntregadoOp(g: GastoOp) {
    setTogglingGasto(g.id);
    const res = await fetch("/api/proyectos/gastos-operativos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: g.id, entregado: !g.entregado }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setTogglingGasto(null);
      return;
    }
    await loadGastosOp();
    setTogglingGasto(null);
  }

  async function eliminarGastoOp(gId: string) {
    const res = await fetch("/api/proyectos/gastos-operativos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: gId }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
    loadGastosOp();
  }

  async function editarGastoOp() {
    if (!editingGastoOpId || !editGastoOpForm.concepto.trim() || !editGastoOpForm.monto) return;
    setSavingEditGastoOp(true);
    const res = await fetch("/api/proyectos/gastos-operativos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingGastoOpId,
        tipo: editGastoOpForm.tipo,
        concepto: editGastoOpForm.concepto.trim(),
        monto: parseFloat(editGastoOpForm.monto),
        cantidad: parseInt(editGastoOpForm.cantidad) || 1,
        notas: editGastoOpForm.notas || null,
      }),
    });
    setSavingEditGastoOp(false);
    if (res.ok) {
      setEditingGastoOpId(null);
      loadGastosOp();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al editar");
    }
  }

  async function eliminarCxP(cxpId: string) {
    const ok = await confirm({ message: "¿Eliminar esta cuenta por pagar? Esta acción no se puede deshacer." });
    if (!ok) return;
    const res = await fetch(`/api/cuentas-pagar/${cxpId}`, { method: "DELETE" });
    if (res.ok) {
      setProyecto(prev => prev ? { ...prev, cuentasPagar: prev.cuentasPagar.filter(c => c.id !== cxpId) } : prev);
      toast.success("CxP eliminada");
    } else {
      toast.error("Error al eliminar");
    }
  }

  async function loadEval() {
    const res = await fetch(`/api/proyectos/${id}/evaluacion`, { cache: "no-store" });
    const d = await res.json();
    if (d.evaluacion) {
      let comentariosCriterios: Record<string, string> = {};
      try { comentariosCriterios = d.evaluacion.comentariosCriterios ? JSON.parse(d.evaluacion.comentariosCriterios) : {}; } catch { /* vacío */ }
      let reporte: ReporteItem[] = [];
      try { reporte = d.evaluacion.reportePostEvento ? JSON.parse(d.evaluacion.reportePostEvento) : []; } catch { /* vacío */ }
      setEvaluacion({ ...EVAL_EMPTY, ...d.evaluacion, notas: d.evaluacion.notas ?? "", comentariosCriterios });
      setReportePostEvento(reporte);
    }
    setEvalLoaded(true);
  }

  async function guardarEval() {
    setSavingEval(true);
    const payload = {
      ...evaluacion,
      comentariosCriterios: JSON.stringify(evaluacion.comentariosCriterios),
    };
    const res = await fetch(`/api/proyectos/${id}/evaluacion`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (d.evaluacion) {
      let comentariosCriterios: Record<string, string> = {};
      try { comentariosCriterios = d.evaluacion.comentariosCriterios ? JSON.parse(d.evaluacion.comentariosCriterios) : {}; } catch { /* vacío */ }
      setEvaluacion({ ...EVAL_EMPTY, ...d.evaluacion, notas: d.evaluacion.notas ?? "", comentariosCriterios });
    }
    setSavingEval(false);
  }

  async function guardarReporte() {
    setSavingReporte(true);
    await fetch(`/api/proyectos/${id}/evaluacion`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportePostEvento: JSON.stringify(reportePostEvento) }),
    });
    setSavingReporte(false);
  }

  async function agregarEquipo() {
    if (!selEquipoId) return;
    setAddingEquipo(true);
    const cantidad = parseInt(selEquipoCantidad) || 1;
    const dias = parseInt(selEquipoDias) || 1;
    await fetch(`/api/proyectos/${id}/equipos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipoId: selEquipoId,
        tipo: selEquipoTipo,
        cantidad,
        dias,
        costoExterno: selEquipoCosto ? parseFloat(selEquipoCosto) : null,
        proveedorId: selEquipoProveedor || null,
      }),
    });

    // Si hay cotización vinculada y se pidió agregar a ella
    if (agregarACot && proyecto?.cotizacion) {
      const eq = equipoCatalogo.find(e => e.id === selEquipoId);
      if (eq) {
        await fetch(`/api/cotizaciones/${proyecto.cotizacion.id}/lineas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: selEquipoTipo === "EXTERNO" ? "EQUIPO_EXTERNO" : "EQUIPO_PROPIO",
            descripcion: eq.descripcion,
            equipoId: selEquipoId,
            proveedorId: selEquipoProveedor || null,
            cantidad,
            dias,
            precioUnitario: 0, // coordinador puede editar la cotización después
            costoUnitario: selEquipoCosto ? parseFloat(selEquipoCosto) : 0,
            esExterno: selEquipoTipo === "EXTERNO",
          }),
        });
      }
    }

    // Auto-actualizar rider
    await fetch(`/api/proyectos/${id}/checklist/generar-rider`, { method: "POST" });

    await load();
    setShowAddEquipo(false);
    setSelEquipoId(""); setSelEquipoTipo("PROPIO"); setSelEquipoCantidad("1");
    setSelEquipoDias("1"); setSelEquipoCosto(""); setSelEquipoProveedor("");
    setAgregarACot(false);
    setAddingEquipo(false);
  }

  async function toggleConfirmadoEquipo(eqId: string, actual: boolean) {
    await fetch(`/api/proyectos/${id}/equipos/${eqId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmado: !actual }),
    });
    await load();
  }

  async function eliminarEquipo(eqId: string) {
    await fetch(`/api/proyectos/${id}/equipos/${eqId}`, { method: "DELETE" });
    await load();
  }

  async function actualizarCantidadEquipo(eqId: string, cantidad: number) {
    await fetch(`/api/proyectos/${id}/equipos/${eqId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cantidad }),
    });
    setRiderEquipos(prev => prev.map(e => e.id === eqId ? { ...e, cantidad } : e));
    setRiderEquipoEditId(null);
  }

  async function saveRiderNotas(eqId: string, notas: string) {
    await fetch(`/api/proyectos/${id}/equipos/${eqId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notas: notas.trim() || null }),
    });
    setRiderEquipos(prev => prev.map(e => e.id === eqId ? { ...e, notas: notas.trim() || null } : e));
    setRiderNotasEditId(null);
  }

  async function loadEvalCliente() {
    if (evalClienteLoaded) return;
    setLoadingEvalCliente(true);
    const res = await fetch(`/api/evaluacion-cliente?proyectoId=${id}`, { cache: "no-store" }).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setEvalCliente(d.evaluacion ?? null);
    }
    setEvalClienteLoaded(true);
    setLoadingEvalCliente(false);
  }

  async function generarLinkEvalCliente(): Promise<string | null> {
    setGenerandoLink(true);
    const res = await fetch("/api/evaluacion-cliente", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proyectoId: id }),
    });
    const d = await res.json();
    setEvalCliente(d.evaluacion ?? null);
    setGenerandoLink(false);
    return d.evaluacion?.tokenAcceso ?? null;
  }

  useEffect(() => {
    load();
    loadEval();
    Promise.all([
      fetch("/api/tecnicos").then(r => r.json()),
      fetch("/api/roles-tecnicos").then(r => r.json()),
      fetch("/api/categorias-financieras").then(r => r.json()),
      fetch("/api/proveedores").then(r => r.json()),
      fetch("/api/equipos?todos=true").then(r => r.json()),
      fetch("/api/vehiculos").then(r => r.json()),
      fetch("/api/usuarios-activos").then(r => r.json()),
      fetch("/api/cuentas", { cache: "no-store" }).then(r => r.json()),
    ]).then(([t, r, c, p, eq, v, u, cu]) => {
      setTecnicos(t.tecnicos ?? []);
      setRoles(r.roles ?? []);
      setCategorias((c.categorias ?? []).filter((x: CatFinanciera) => x.tipo === "GASTO"));
      setProveedores(p.proveedores ?? []);
      setEquipoCatalogo(eq.equipos ?? []);
      setVehiculos((v.vehiculos ?? []).filter((x: { activo: boolean }) => x.activo));
      setUsuariosActivos(u.usuarios ?? []);
      setCuentasBancarias(cu.cuentas ?? []);
    });
  }, [id]);

  // Lazy-load gastos operativos when proyecto loads
  useEffect(() => {
    if (proyecto && !gastosLoaded) loadGastosOp();
  }, [proyecto?.id]); // eslint-disable-line

  // Lazy-load evaluación cliente when proyecto loads
  useEffect(() => {
    if (proyecto) loadEvalCliente();
  }, [proyecto?.id]); // eslint-disable-line

  // Docs start closed — user opens them manually

  // Auto-calcular tarifa desde tabulador cuando cambia rol, jornada o nivel
  useEffect(() => {
    if (!selRol || !proyecto) return;
    const rol = roles.find(r => r.id === selRol);
    if (!rol) return;
    const zonaBonus = proyecto.zona === "BAJIO" ? 500 : proyecto.zona === "NACIONAL" ? 800 : 0;
    let base: number | null = null;
    if (rol.tipoPago === "POR_JORNADA") {
      base = selJornada === "CORTA" ? rol.tarifaAAACorta : selJornada === "MEDIA" ? rol.tarifaAAAMedia : rol.tarifaAAALarga;
    } else if (rol.tipoPago === "TARIFA_PLANA" || rol.tipoPago === "POR_PROYECTO") {
      const key = `tarifaPlana${selNivel}` as keyof RolTecnico;
      base = rol[key] as number | null;
    } else if (rol.tipoPago === "POR_HORA") {
      const key = `tarifaHora${selNivel}` as keyof RolTecnico;
      base = rol[key] as number | null;
    }
    if (base != null) setSelTarifa(String(base + zonaBonus));
  }, [selRol, selJornada, selNivel, proyecto?.zona]); // eslint-disable-line

  // Check disponibilidad cuando cambia el técnico seleccionado
  useEffect(() => {
    if (!selTecnico || !proyecto?.fechaEvento) { setDisponibilidad(null); return; }
    const fecha = proyecto.fechaEvento.slice(0, 10);
    fetch(`/api/tecnicos/${selTecnico}/disponibilidad?fecha=${fecha}&proyectoId=${id}`)
      .then(r => r.json())
      .then(d => setDisponibilidad(d))
      .catch(() => setDisponibilidad(null));
  }, [selTecnico, proyecto?.fechaEvento, id]);

  // Check disponibilidad de equipo físico
  useEffect(() => {
    if (!selEquipoId || selEquipoTipo !== "PROPIO" || !proyecto?.fechaEvento) { setDispEquipo(null); return; }
    const fecha = proyecto.fechaEvento.slice(0, 10);
    const cantidad = parseInt(selEquipoCantidad) || 1;
    fetch(`/api/equipos/${selEquipoId}/disponibilidad?fecha=${fecha}&proyectoId=${id}&cantidad=${cantidad}`)
      .then(r => r.json())
      .then(d => setDispEquipo(d))
      .catch(() => setDispEquipo(null));
  }, [selEquipoId, selEquipoTipo, selEquipoCantidad, proyecto?.fechaEvento, id]);

  // Pre-fill esquema form when opening editor
  useEffect(() => {
    if (!editandoEsquema || !proyecto) return;
    const granTotal = proyecto.cotizacion?.granTotal ?? 0;
    const existeAnticipo = proyecto.cuentasCobrar.find(c => c.tipoPago === "ANTICIPO");
    const existeLiq = proyecto.cuentasCobrar.find(c => c.tipoPago === "LIQUIDACION");
    if (existeAnticipo) {
      setEsquemaAnticipoTipo("monto");
      setEsquemaAnticipoMonto(String(existeAnticipo.monto));
      if (granTotal > 0) {
        setEsquemaAnticipoPct(String(Math.round(existeAnticipo.monto / granTotal * 100)));
      }
      setEsquemaAnticipoFecha(existeAnticipo.fechaCompromiso.slice(0, 10));
    }
    if (existeLiq) {
      setEsquemaLiqFecha(existeLiq.fechaCompromiso.slice(0, 10));
    } else if (proyecto.fechaEvento) {
      setEsquemaLiqFecha(proximoLunesTraEvento(proyecto.fechaEvento));
    }
  }, [editandoEsquema]);

  // Auto-sync personasCrew con número de personal confirmado
  useEffect(() => {
    if (!proyecto) return;
    const count = proyecto.personal.length;
    if (count > 0) {
      setCatering(prev => ({
        ...prev,
        personasCrew: prev.personasCrew || String(count),
      }));
    }
  }, [proyecto?.personal?.length]);

  // Sync JSON states when proyecto loads
  useEffect(() => {
    if (!proyecto) return;
    try {
      const parsed = proyecto.cronograma ? JSON.parse(proyecto.cronograma) : [];
      setCronoRows(Array.isArray(parsed) ? parsed : []);
    } catch { setCronoRows([]); }
    try {
      const parsed = proyecto.transportes ? JSON.parse(proyecto.transportes) : [];
      const normalized: TransporteSlot[] = (Array.isArray(parsed) && parsed.length > 0)
        ? parsed.map((s: Partial<TransporteSlot>) => ({ vehiculoId: s.vehiculoId ?? "", choferId: s.choferId ?? "", horaSalida: s.horaSalida ?? "", comentarios: s.comentarios ?? "" }))
        : [{ vehiculoId: "", choferId: "", horaSalida: "", comentarios: "" }];
      setTransporteSlots(normalized);
    } catch {
      setTransporteSlots([{ vehiculoId: "", choferId: "", horaSalida: "", comentarios: "" }]);
    }
    try {
      const c = proyecto.reporteCatering ? JSON.parse(proyecto.reporteCatering) : {};
      const autoPersonas = (!c.personasCrew || c.personasCrew === "0") && proyecto.personal.length > 0
        ? String(proyecto.personal.length) : (c.personasCrew ?? "");
      const autoDias = (!c.comidasPorDia || c.comidasPorDia === "0") && (proyecto.cotizacion?.diasComidas ?? 0) > 0
        ? String(proyecto.cotizacion!.diasComidas) : (c.comidasPorDia ?? "");
      setCatering({ ...CATERING_EMPTY, ...c, personasCrew: autoPersonas, comidasPorDia: autoDias });
    } catch { setCatering(CATERING_EMPTY); }
    // Mark as loaded after a short delay so initial setState doesn't trigger auto-save
    setTimeout(() => { cronoLoaded.current = true; cateringLoaded.current = true; }, 300);
  }, [proyecto?.id]);

  // Auto-save cronograma
  useEffect(() => {
    if (!cronoLoaded.current || !proyecto) return;
    if (cronoTimer.current) clearTimeout(cronoTimer.current);
    cronoTimer.current = setTimeout(() => { guardarCronograma(cronoRows); }, 1500);
  }, [cronoRows]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save catering
  useEffect(() => {
    if (!cateringLoaded.current || !proyecto) return;
    if (cateringTimer.current) clearTimeout(cateringTimer.current);
    cateringTimer.current = setTimeout(() => { guardarCatering(catering); }, 1500);
  }, [catering]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar viabilidad
  useEffect(() => {
    if (!id) return;
    fetch(`/api/proyectos/${id}/viabilidad`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setViabilidad(d); })
      .catch(() => {});
  }, [id]);

  // Cargar datos de pago a inversionistas al entrar a la pestaña finanzas
  useEffect(() => {
    if (activeTab === 'finanzas' && !pagoSocios && !loadingPagoSocios) {
      loadPagoSocios();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Section nav — now managed by activeTab state (real tabs, no scroll) ──

  // ── Cambiar estado del proyecto ──
  async function cambiarEstado(estado: string) {
    // Al marcar como COMPLETADO sin cierre financiero → generar cierre automáticamente
    if (estado === "COMPLETADO" && !proyecto?.cierreFinanciero) {
      const ok = await confirm({
        message: "Este proyecto no tiene cierre financiero. ¿Generar el cierre automáticamente con los datos actuales (cobros, gastos y cotización)?",
        confirmText: "Generar cierre y completar",
        danger: false,
      });
      if (!ok) {
        // Permitir continuar sin cierre si el usuario cancela el confirm
        const skip = await confirm({
          message: "¿Marcar como Completado sin generar el cierre financiero?",
          confirmText: "Continuar sin cierre",
          danger: true,
        });
        if (!skip) return;
      } else {
        // Generar cierre automáticamente
        setSaving(true);
        try {
          const resCalc = await fetch(`/api/proyectos/${id}/cierre`, { cache: "no-store" });
          const dataCalc = await resCalc.json();
          if (dataCalc) {
            await fetch(`/api/proyectos/${id}/cierre`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...dataCalc.real,
                ...dataCalc.estimado,
                desgloseCostos: dataCalc.desgloseCostos,
                notas: "Cierre generado automáticamente al completar el proyecto.",
              }),
            });
            toast.success("Cierre financiero generado automáticamente");
          }
        } catch {
          toast.warning("No se pudo generar el cierre — continuando sin él");
        }
        setSaving(false);
      }
    }
    setSaving(true);
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    setProyecto(prev => prev ? { ...prev, estado } : prev);
    // Si se marca como COMPLETADO → cargar encuesta auto-generada y cambiar a esa tab
    if (estado === "COMPLETADO") {
      const r = await fetch(`/api/evaluacion-cliente?proyectoId=${id}`, { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (d.evaluacion) {
        setEvalCliente(d.evaluacion);
        setEvalClienteLoaded(true);
        setActiveTab('extras');
      }
      await load(); // recargar para mostrar el cierre generado
    }
    setSaving(false);
  }

  // ── Guardar campo de info ──
  async function guardarCampo(field: string, value: string) {
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    setProyecto(prev => {
      if (!prev) return prev;
      // encargadoId: also update the encargado object for display
      if (field === "encargadoId") {
        const u = value ? usuariosActivos.find(u => u.id === value) : null;
        return { ...prev, encargado: u ? { id: u.id, name: u.name } : null };
      }
      const updated = { ...prev, [field]: value || null };

      // Si el campo es clave (fecha/hora/lugar), construir panel de notificaciones
      if (field in KEY_CAMPOS && (updated.personal.length > 0 || updated.equipos.some(e => e.tipo === "EXTERNO"))) {
        const campoLabel = KEY_CAMPOS[field];
        const fechaStr = new Date(updated.fechaEvento.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });

        const buildMsg = (nombre: string, extra: string) =>
          `Hola ${nombre.split(" ")[0]}, hay una actualización en el proyecto *${updated.nombre}*:\n\n📋 *${campoLabel}:* ${value || "—"}\n\n📅 ${fechaStr}${updated.horaInicioEvento ? `\n⏰ ${updated.horaInicioEvento}${updated.horaFinEvento ? `–${updated.horaFinEvento}` : ""}` : ""}${updated.lugarEvento ? `\n📍 ${updated.lugarEvento}` : ""}${extra}\n\nPor favor confirma que todo sigue en orden.`;

        const contactos: CambioNotif["contactos"] = [];
        const tecnicosVistos = new Set<string>();
        for (const p of updated.personal) {
          if (!p.tecnico?.celular) continue;
          if (tecnicosVistos.has(p.tecnico.id)) continue;
          tecnicosVistos.add(p.tecnico.id);
          const tel = p.tecnico.celular.replace(/\D/g, "");
          const num = tel.startsWith("52") ? tel : `52${tel}`;
          contactos.push({
            nombre: p.tecnico.nombre,
            tipo: "tecnico",
            waUrl: `https://wa.me/${num}?text=${encodeURIComponent(buildMsg(p.tecnico.nombre, ""))}`,
          });
        }
        const proveedoresVistos = new Set<string>();
        for (const eq of updated.equipos) {
          if (eq.tipo !== "EXTERNO" || !eq.proveedor?.telefono) continue;
          if (proveedoresVistos.has(eq.proveedor.nombre)) continue;
          proveedoresVistos.add(eq.proveedor.nombre);
          const tel = eq.proveedor.telefono.replace(/\D/g, "");
          const num = tel.startsWith("52") ? tel : `52${tel}`;
          contactos.push({
            nombre: eq.proveedor.nombre,
            tipo: "proveedor",
            waUrl: `https://wa.me/${num}?text=${encodeURIComponent(buildMsg(eq.proveedor.nombre, updated.horaInicioMontaje ? `\n🔧 Montaje desde: ${updated.horaInicioMontaje}` : ""))}`,
          });
        }
        if (contactos.length > 0) setPendingNotif({ campoLabel, valor: value, contactos });
      }

      return updated;
    });
  }

  // ── Guardar horario de un día concreto ──
  // Día 1 (índice 0) se guarda en los campos escalares del proyecto (compatibilidad).
  // Días 2+ se guardan en el JSON horariosEvento { "YYYY-MM-DD": {inicio, fin, llamado, montaje, aplicaMontaje} }.
  async function guardarHorarioDia(
    fecha: string,
    indice: number,
    campo: "inicio" | "fin" | "llamado" | "montaje" | "aplicaMontaje",
    value: string | boolean,
  ) {
    if (indice === 0) {
      if (campo === "aplicaMontaje") return; // el día 1 siempre aplica montaje
      const v = String(value);
      if (campo === "inicio") return void guardarCampo("horaInicioEvento", v);
      if (campo === "fin") return void guardarCampo("horaFinEvento", v);
      if (campo === "montaje") return void guardarCampo("horaInicioMontaje", v);
      // llamado — conserva la fecha existente del llamado (o usa la del día 1)
      const fechaLlamado = proyecto?.llamadoBodega ? proyecto.llamadoBodega.substring(0, 10) : fecha;
      return void guardarCampo("llamadoBodega", v ? `${fechaLlamado}T${v}:00.000Z` : "");
    }
    const mapa = parseHorariosEvento(proyecto?.horariosEvento);
    const prev = mapa[fecha] ?? { inicio: null, fin: null, llamado: null, montaje: null, aplicaMontaje: false };
    mapa[fecha] = { ...prev, [campo]: campo === "aplicaMontaje" ? Boolean(value) : (String(value) || null) };
    const json = JSON.stringify(mapa);
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ horariosEvento: json }),
    });
    setProyecto(p => p ? { ...p, horariosEvento: json } : p);
  }

  // ── Guardar un campo booleano (toggle) ──
  async function guardarBool(field: string, value: boolean) {
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setProyecto(p => p ? { ...p, [field]: value } : p);
  }

  // ── Guardar cronograma (auto-sort por hora) ──
  async function guardarCronograma(rows: CronoRow[]) {
    setSavingCrono(true);
    const sorted = [...rows].sort((a, b) => {
      // Primero por día (las filas sin día van al final), luego por hora de inicio.
      const da = a.dia || "", db = b.dia || "";
      if (da !== db) { if (!da) return 1; if (!db) return -1; return da.localeCompare(db); }
      if (!a.horaInicio && !b.horaInicio) return 0;
      if (!a.horaInicio) return 1;
      if (!b.horaInicio) return -1;
      return a.horaInicio.localeCompare(b.horaInicio);
    });
    setCronoRows(sorted);
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cronograma: JSON.stringify(sorted) }),
    });
    setProyecto(prev => prev ? { ...prev, cronograma: JSON.stringify(sorted) } : prev);
    setSavingCrono(false);
  }

  async function cargarPlantillaCrono(dia?: string) {
    const horaInicio = proyecto?.horaInicioEvento ?? "";
    const horaFin = proyecto?.horaFinEvento ?? "";
    const base = CRONO_BASE.map(r => {
      const row: CronoRow = { ...r, ...(dia ? { dia } : {}) };
      if (r.actividad === "Inicio de evento" && horaInicio) row.horaInicio = horaInicio;
      if (r.actividad === "Fin de evento / Inicio de desmontaje" && horaFin) row.horaInicio = horaFin;
      return row;
    });
    if (dia) {
      // Multidía: reemplaza solo las filas de ese día (deja intactos los demás días).
      const yaTiene = cronoRows.some(r => r.dia === dia);
      if (yaTiene && !await confirm({ message: "¿Reemplazar el cronograma de este día con la plantilla base?", danger: false, confirmText: "Reemplazar" })) return;
      setCronoRows(prev => [...prev.filter(r => r.dia !== dia), ...base]);
      return;
    }
    if (cronoRows.length > 0 && !await confirm({ message: "¿Reemplazar el cronograma actual con la plantilla base?", danger: false, confirmText: "Reemplazar" })) return;
    setCronoRows(base);
  }

  function addCronoRow(dia?: string) {
    setCronoRows(prev => [...prev, { horaInicio: "", horaFin: "", actividad: "", responsable: "", involucrados: "", ...(dia ? { dia } : {}) }]);
  }

  function updateCronoRow(i: number, field: keyof CronoRow, value: string) {
    setCronoRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  function removeCronoRow(i: number) {
    const next = cronoRows.filter((_, idx) => idx !== i);
    setCronoRows(next);
    guardarCronograma(next);
  }

  // Tabla de cronograma reutilizable: recibe las filas ya emparejadas con su índice real
  // en `cronoRows` para que editar/eliminar funcione igual en modo un-día y por-día.
  function renderCronoTabla(entries: { row: CronoRow; i: number }[]) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-xs">
          <thead>
            <tr className="text-gray-500 uppercase tracking-wider border-b border-[#222]">
              <th className="text-left py-2 pr-2 font-medium w-24">Inicio</th>
              <th className="text-left py-2 pr-2 font-medium w-24">Fin</th>
              <th className="text-left py-2 pr-2 font-medium">Actividad</th>
              <th className="text-left py-2 pr-2 font-medium w-28">Responsable</th>
              <th className="text-left py-2 pr-2 font-medium w-32">Involucrados</th>
              <th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {entries.map(({ row, i }, pos) => (
              <tr key={i} className={`border-b border-[#1a1a1a] last:border-0 ${pos % 2 === 1 ? "bg-[#0d0d0d]" : ""}`}>
                <td className="py-1 pr-2 w-[84px]">
                  <InlinePicker value={row.horaInicio} onChange={v => updateCronoRow(i, "horaInicio", v)} />
                </td>
                <td className="py-1 pr-2 w-[84px]">
                  <InlinePicker value={row.horaFin} onChange={v => updateCronoRow(i, "horaFin", v)} />
                </td>
                <td className="py-1 pr-2">
                  <input value={row.actividad} onChange={e => updateCronoRow(i, "actividad", e.target.value)}
                    placeholder="Actividad"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white focus:outline-none focus:border-[#B3985B]" />
                </td>
                <td className="py-1 pr-2">
                  <input value={row.responsable} onChange={e => updateCronoRow(i, "responsable", e.target.value)}
                    placeholder="Responsable"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white focus:outline-none focus:border-[#B3985B]" />
                </td>
                <td className="py-1 pr-2">
                  <input value={row.involucrados} onChange={e => updateCronoRow(i, "involucrados", e.target.value)}
                    placeholder="Involucrados"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white focus:outline-none focus:border-[#B3985B]" />
                </td>
                <td className="py-1 text-center">
                  <button onClick={() => removeCronoRow(i)}
                    className="text-gray-600 hover:text-red-400 text-base leading-none transition-colors">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Guardar transportes ──
  async function guardarTransportes(slots: TransporteSlot[]) {
    setSavingTransporte(true);
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transportes: JSON.stringify(slots) }),
    });
    setProyecto(prev => prev ? { ...prev, transportes: JSON.stringify(slots) } : prev);
    setSavingTransporte(false);
  }

  function updateTransporte(i: number, field: keyof TransporteSlot, value: string) {
    setTransporteSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  async function guardarCatering(data: typeof catering) {
    setSavingCatering(true);
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reporteCatering: JSON.stringify(data) }),
    });
    setProyecto(prev => prev ? { ...prev, reporteCatering: JSON.stringify(data) } : prev);
    setSavingCatering(false);
  }

  function abrirWhatsAppCatering() {
    if (!catering.contactoTelefono) return;
    const tel = catering.contactoTelefono.replace(/\D/g, "");
    const num = tel.startsWith("52") ? tel : `52${tel}`;
    const fechaStr = new Date(proyecto!.fechaEvento.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const personas = catering.personasCrew || "—";
    const dias = proyecto!.cotizacion?.diasComidas ?? 1;
    const porDia = catering.comidasPorDia || "1";
    const nombre = catering.contactoNombre ? ` ${catering.contactoNombre.split(" ")[0]}` : "";
    const msg = `Hola${nombre}! 👋 Te contactamos de *Mainstage Pro*.\n\nPara el proyecto *${proyecto!.nombre}* el ${fechaStr}${proyecto!.lugarEvento ? ` en ${proyecto!.lugarEvento}` : ""}, necesitamos servicio de catering para *${personas} personas* de crew.\n\n📅 *${dias} día${dias !== 1 ? "s" : ""}* · *${porDia} servicio${Number(porDia) !== 1 ? "s" : ""} por día*\n👥 *${personas} elementos*${catering.notas ? `\n\n📝 Notas: ${catering.notas}` : ""}\n\n¿Puedes confirmarnos disponibilidad y precio? 🙏`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // ── Subir archivo ──
  async function subirArchivo(e: React.ChangeEvent<HTMLInputElement>, tipo: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTipo(tipo);
    try {
      // Client upload: directo browser → Vercel Blob, sin límite de tamaño
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const pathname = `proyectos/${id}/${Date.now()}-${tipo.toLowerCase()}.${ext}`;
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/upload/token",
      });
      // Registrar metadata en base de datos
      const res = await fetch(`/api/proyectos/${id}/archivos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url, tipo, nombre: file.name }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "Error al guardar archivo");
      } else if (d.archivo) {
        setProyecto(prev => prev ? { ...prev, archivos: [...prev.archivos, d.archivo] } : prev);
      }
    } catch {
      toast.error("Error de conexión al subir archivo");
    } finally {
      setUploadingTipo(null);
      e.target.value = "";
    }
  }

  async function eliminarArchivo(archivoId: string) {
    await fetch(`/api/proyectos/${id}/archivos/${archivoId}`, { method: "DELETE" });
    setProyecto(prev => prev ? { ...prev, archivos: prev.archivos.filter(a => a.id !== archivoId) } : prev);
  }

  // ── Toggle checklist ──
  async function toggleCheck(checkId: string, completado: boolean) {
    await fetch(`/api/proyectos/${id}/checklist`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkId, completado: !completado }),
    });
    setProyecto(prev => prev ? {
      ...prev,
      checklist: prev.checklist.map(c => c.id === checkId ? { ...c, completado: !completado } : c),
    } : prev);
  }

  // ── Checklist Templates ──
  const CHECKLIST_TEMPLATES: Record<string, string[]> = {
    GENERAL: [
      "Confirmar rider técnico con cliente",
      "Verificar plano del venue",
      "Confirmar acceso vehicular y hora de entrada",
      "Revisar restricciones eléctricas del lugar",
      "Confirmar personal técnico asignado",
      "Preparar kit de herramientas de campo",
      "Cargar cables, consumibles y refacciones",
      "Coordinar logística de transporte de equipo",
      "Crear grupo de WhatsApp del evento",
      "Imprimir o compartir cronograma del día",
    ],
    MUSICAL: [
      "Solicitar stage plot y rider de la banda",
      "Confirmar sistema PA requerido",
      "Verificar requerimiento de monitores",
      "Confirmar si hay IEM (in-ear monitors)",
      "Verificar necesidad de backline",
      "Coordinar soundcheck — hora y duración",
      "Verificar sistema de luces escénicas",
      "Confirmar pantallas o pantalla de fondo",
      "Coordinar con producción de contenido",
      "Revisar acústica del recinto",
    ],
    CORPORATIVO: [
      "Confirmar sistema de audio para conferencias",
      "Verificar pantallas y resolución requerida",
      "Revisar sistema de micrófonos (inalámbricos/corbateros)",
      "Confirmar señal de video HDMI/DP desde laptops",
      "Coordinar telepromter si aplica",
      "Confirmar sistema de traducción simultánea si aplica",
      "Revisar iluminación corporativa del escenario",
      "Confirmar sistema de grabación/transmisión",
      "Verificar internet para streaming o presentaciones",
      "Confirmar señalética y branding del cliente",
    ],
    SOCIAL: [
      "Confirmar sistema de música ambiente / DJ",
      "Verificar iluminación ambiental y efectos",
      "Confirmar sistema de micrófono inalámbrico para brindis",
      "Revisar pantalla para presentaciones o foto-slideshow",
      "Coordinar con decoradores en horarios",
      "Confirmar sistema de fotografía/video",
      "Verificar restricción de decibeles del venue",
      "Confirmar horario de cierre con el venue",
      "Coordinar protocolo de montaje/desmontaje",
    ],
  };

  async function aplicarPlantilla(tipo: string) {
    if (!proyecto) return;
    const items = CHECKLIST_TEMPLATES[tipo] ?? CHECKLIST_TEMPLATES.GENERAL;
    setAplicandoPlantilla(true);
    for (const item of items) {
      // Skip if already exists (case-insensitive check)
      const exists = proyecto.checklist.some(c => c.item.toLowerCase() === item.toLowerCase());
      if (exists) continue;
      const res = await fetch(`/api/proyectos/${id}/checklist`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item }),
      });
      const d = await res.json();
      if (d.check) {
        setProyecto(prev => prev ? { ...prev, checklist: [...prev.checklist, d.check] } : prev);
      }
    }
    setAplicandoPlantilla(false);
  }

  // ── Agregar item checklist ──
  async function agregarItem() {
    if (!nuevoItem.trim()) return;
    setAddingItem(true);
    const res = await fetch(`/api/proyectos/${id}/checklist`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: nuevoItem.trim() }),
    });
    const d = await res.json();
    setProyecto(prev => prev ? { ...prev, checklist: [...prev.checklist, d.check] } : prev);
    setNuevoItem("");
    setAddingItem(false);
  }

  // ── Eliminar item checklist ──
  async function eliminarItem(itemId: string) {
    await fetch(`/api/proyectos/${id}/checklist/${itemId}`, { method: "DELETE" });
    setProyecto(prev => prev ? { ...prev, checklist: prev.checklist.filter(c => c.id !== itemId) } : prev);
  }

  // ── Agregar item rider ──
  async function agregarItemRider() {
    if (!nuevoItemRider.trim()) return;
    setAddingItemRider(true);
    const res = await fetch(`/api/proyectos/${id}/checklist`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: nuevoItemRider.trim(), tipo: "RIDER" }),
    });
    const d = await res.json();
    setProyecto(prev => prev ? { ...prev, checklist: [...prev.checklist, d.check] } : prev);
    setNuevoItemRider("");
    setAddingItemRider(false);
  }

  // ── Generar rider automático desde equipos ──
  async function generarRiderAutomatico() {
    setGenerandoRider(true);
    const res = await fetch(`/api/proyectos/${id}/checklist/generar-rider`, { method: "POST" });
    const d = await res.json();
    if (d.items) {
      setProyecto(prev => {
        if (!prev) return prev;
        const sinRider = prev.checklist.filter(c => c.tipo !== "RIDER");
        return { ...prev, checklist: [...sinRider, ...d.items] };
      });
    }
    setGenerandoRider(false);
    if (d.mensaje) toast.info(d.mensaje);
  }

  // ── Rider: agregar accesorio persistido ──
  async function riderAgregarAccesorio(proyectoEquipoId: string) {
    if (!riderAddNombre.trim()) return;
    setRiderAddSaving(true);
    const res = await fetch(`/api/proyectos/${id}/rider-accesorios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proyectoEquipoId,
        nombre: riderAddNombre.trim(),
        cantidad: riderAddCantidad,
        categoria: riderAddCategoria || null,
        guardarEnBiblioteca: riderAddGuardar,
      }),
    });
    const d = await res.json();
    if (d.accesorio) {
      setRiderEquipos(prev => prev.map(e =>
        e.id === proyectoEquipoId
          ? { ...e, riderAccesorios: [...e.riderAccesorios, d.accesorio] }
          : e
      ));
    }
    setRiderAddNombre("");
    setRiderAddCantidad(1);
    setRiderAddCategoria("");
    setRiderAddGuardar(true);
    setRiderAddOpen(null);
    setRiderAddSaving(false);
  }

  async function riderToggleAccesorio(proyectoEquipoId: string, accesorioId: string, completado: boolean) {
    await fetch(`/api/rider-accesorios/${accesorioId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completado: !completado }),
    });
    setRiderEquipos(prev => prev.map(e =>
      e.id === proyectoEquipoId
        ? { ...e, riderAccesorios: e.riderAccesorios.map(a => a.id === accesorioId ? { ...a, completado: !completado } : a) }
        : e
    ));
  }

  async function riderEliminarAccesorio(proyectoEquipoId: string, accesorioId: string) {
    await fetch(`/api/rider-accesorios/${accesorioId}`, { method: "DELETE" });
    setRiderEquipos(prev => prev.map(e =>
      e.id === proyectoEquipoId
        ? { ...e, riderAccesorios: e.riderAccesorios.filter(a => a.id !== accesorioId) }
        : e
    ));
  }

  async function riderActualizarCantidad(proyectoEquipoId: string, accesorioId: string, cantidad: number) {
    const res = await fetch(`/api/rider-accesorios/${accesorioId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cantidad }),
    });
    const d = await res.json();
    setRiderEquipos(prev => prev.map(e =>
      e.id === proyectoEquipoId
        ? { ...e, riderAccesorios: e.riderAccesorios.map(a => a.id === accesorioId ? { ...a, cantidad: d.accesorio.cantidad } : a) }
        : e
    ));
  }

  async function riderAgregarSugerencia(proyectoEquipoId: string, nombre: string, cantidad: number = 1) {
    const res = await fetch(`/api/proyectos/${id}/rider-accesorios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proyectoEquipoId, nombre, cantidad, guardarEnBiblioteca: false }),
    });
    const d = await res.json();
    if (d.accesorio) {
      setRiderEquipos(prev => prev.map(e =>
        e.id === proyectoEquipoId
          ? { ...e, riderAccesorios: [...e.riderAccesorios, d.accesorio] }
          : e
      ));
    }
    // Reset la cantidad pendiente de esta sugerencia
    setSugCantidad(prev => { const n = { ...prev }; delete n[`${proyectoEquipoId}::${nombre}`]; return n; });
  }

  // ── Crear técnico inline ──
  async function crearTecnicoInline() {
    if (!nuevoTecNombre.trim()) return;
    setCreandoTecnico(true);
    const res = await fetch("/api/tecnicos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nuevoTecNombre.trim(),
        celular: nuevoTecCelular.trim() || null,
        rolId: nuevoTecRolId || null,
        nivel: nuevoTecNivel,
      }),
    });
    const d = await res.json();
    if (d.tecnico) {
      setTecnicos(prev => [...prev, d.tecnico].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setSelTecnico(d.tecnico.id);
    }
    setShowNuevoTecnico(false);
    setNuevoTecNombre(""); setNuevoTecCelular(""); setNuevoTecRolId(""); setNuevoTecNivel("A");
    setCreandoTecnico(false);
  }

  // ── Agregar personal ──
  async function agregarPersonal() {
    if (!selTecnico && !selRol) return;
    setAddingPersonal(true);
    const res = await fetch(`/api/proyectos/${id}/personal`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tecnicoId: selTecnico || null,
        rolTecnicoId: selRol || null,
        participacion: selParticipacion,
        nivel: selNivel,
        jornada: selJornada,
        tarifaAcordada: selTarifa || null,
        responsabilidad: selResp || null,
        rolEnEvento: selRolEnEvento || null,
        fechaJornada: selFechaJornada || null,
        esAdicional: selEsAdicional,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setAddingPersonal(false);
      return;
    }
    const d = await res.json();
    setProyecto(prev => prev ? { ...prev, personal: [...prev.personal, d.personal] } : prev);
    setSelTecnico(""); setSelRol(""); setSelNivel("AAA"); setSelTarifa(""); setSelResp(""); setSelRolEnEvento(""); setSelFechaJornada(""); setSelEsAdicional(false);
    setShowAddPersonal(false);
    setAddingPersonal(false);
  }

  // ── Sugerencias de técnicos por disciplina (operación técnica) ──
  async function cargarSugerencias(disciplina: string, nivel: string | null, key: string) {
    if (sugerenciasAbiertas === key) { setSugerenciasAbiertas(null); return; }
    setSugerenciasAbiertas(key);
    if (sugerenciasCache[key]) return; // ya cacheado
    setSugerenciasLoading(key);
    const qs = new URLSearchParams({ disciplina });
    if (nivel) qs.set("nivel", nivel);
    const res = await fetch(`/api/proyectos/${id}/sugerencias-tecnicos?${qs.toString()}`);
    if (res.ok) {
      const d = await res.json();
      setSugerenciasCache(prev => ({ ...prev, [key]: d.sugerencias ?? [] }));
    }
    setSugerenciasLoading(null);
  }

  // Extrae fecha (YYYY-MM-DD) y fase de la descripción de una línea de operación,
  // p.ej. "Operador de Audio (Operación · 2026-07-24)" o "Montaje / Desmontaje (Montaje · 2026-07-23)".
  // Así cada slot conserva su jornada real en vez de caer todos en el día 1 del evento.
  function datosOperacionDeLinea(desc: string | null | undefined): { fechaJornada: string | null; participacion: string } {
    const d = desc ?? "";
    const mFecha = d.match(/·\s*(\d{4}-\d{2}-\d{2})/);
    const mFase = d.match(/\(\s*(Montaje|Desmontaje|Operaci[óo]n)\b/i);
    let participacion = "OPERACION";
    if (mFase) {
      const f = mFase[1].toLowerCase();
      participacion = f.startsWith("montaje") ? "MONTAJE" : f.startsWith("desmontaje") ? "DESMONTAJE" : "OPERACION";
    }
    return { fechaJornada: mFecha ? mFecha[1] : null, participacion };
  }

  // ── Agregar técnico sugerido a la operación (ya asignado según la línea cotizada) ──
  async function agregarTecnicoSugerido(
    tecnico: SugerenciaTecnico,
    linea: NonNullable<NonNullable<typeof proyecto>["cotizacion"]>["lineas"][0],
  ) {
    setAgregandoSugerido(tecnico.id);
    const { fechaJornada, participacion } = datosOperacionDeLinea(linea.descripcion);
    const res = await fetch(`/api/proyectos/${id}/personal`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tecnicoId: tecnico.id,
        rolTecnicoId: linea.rolTecnicoId || null,
        participacion,
        fechaJornada,
        nivel: linea.nivel || tecnico.nivel || "A",
        jornada: linea.jornada || "MEDIA",
        tarifaAcordada: linea.precioUnitario > 0 ? linea.precioUnitario : null,
        responsabilidad: linea.descripcion || null,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setProyecto(prev => prev ? { ...prev, personal: [...prev.personal, d.personal] } : prev);
      // Marcar como ya asignado en la caché de sugerencias
      setSugerenciasCache(prev => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          next[k] = next[k].map(s => s.id === tecnico.id ? { ...s, yaAsignado: true } : s);
        }
        return next;
      });
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al agregar técnico");
    }
    setAgregandoSugerido(null);
  }

  // ── Agregar slot(s) desde sugerencia de cotización ──
  async function agregarDesdeLinea(linea: NonNullable<NonNullable<typeof proyecto>["cotizacion"]>["lineas"][0]) {
    setAgregandoLinea(linea.id);
    const { fechaJornada, participacion } = datosOperacionDeLinea(linea.descripcion);
    const slots: Personal[] = [];
    for (let i = 0; i < linea.cantidad; i++) {
      const res = await fetch(`/api/proyectos/${id}/personal`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tecnicoId: null,
          rolTecnicoId: linea.rolTecnicoId || null,
          participacion,
          fechaJornada,
          nivel: linea.nivel || "A",
          jornada: linea.jornada || "MEDIA",
          tarifaAcordada: linea.precioUnitario > 0 ? linea.precioUnitario : null,
          responsabilidad: linea.descripcion || null,
        }),
      });
      if (res.ok) { const d = await res.json(); slots.push(d.personal); }
    }
    setProyecto(prev => prev ? { ...prev, personal: [...prev.personal, ...slots] } : prev);
    setAgregandoLinea(null);
  }

  // ── Editar slot de personal completo ──
  function abrirEditPersonal(p: Personal) {
    setEditandoPersonalId(p.id);
    setEditPersonalForm({
      tecnicoId: p.tecnico?.id ?? "",
      rolTecnicoId: "", // se rellena abajo buscando por nombre en roles
      nivel: p.nivel ?? "A",
      jornada: p.jornada ?? "MEDIA",
      tarifa: p.tarifaAcordada != null ? String(p.tarifaAcordada) : "",
      participacion: p.participacion ?? "OPERACION",
      responsabilidad: p.responsabilidad ?? "",
      rolEnEvento: p.rolEnEvento ?? "",
      fechaJornada: p.fechaJornada ?? "",
    });
    // Buscar rolTecnicoId desde la lista de roles por nombre
    const rolNombre = p.rolTecnico?.nombre ?? p.tecnico?.rol?.nombre;
    if (rolNombre) {
      const found = roles.find(r => r.nombre === rolNombre);
      if (found) setEditPersonalForm(prev => ({ ...prev, rolTecnicoId: found.id }));
    }
  }

  async function guardarEditPersonal(pId: string) {
    setSavingPersonal(true);
    const res = await fetch(`/api/proyectos/${id}/personal/${pId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tecnicoId: editPersonalForm.tecnicoId || null,
        rolTecnicoId: editPersonalForm.rolTecnicoId || null,
        nivel: editPersonalForm.nivel || null,
        jornada: editPersonalForm.jornada || null,
        tarifaAcordada: editPersonalForm.tarifa ? parseFloat(editPersonalForm.tarifa) : null,
        participacion: editPersonalForm.participacion || null,
        responsabilidad: editPersonalForm.responsabilidad || null,
        rolEnEvento: editPersonalForm.rolEnEvento || null,
        fechaJornada: editPersonalForm.fechaJornada || null,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setProyecto(prev => prev ? { ...prev, personal: prev.personal.map(p => p.id === pId ? d.personal : p) } : prev);
      setEditandoPersonalId(null);
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
    }
    setSavingPersonal(false);
  }

  // ── Confirmar/desconfirmar personal ──
  async function toggleConfirmar(pId: string, confirmado: boolean) {
    await fetch(`/api/proyectos/${id}/personal/${pId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmado: !confirmado }),
    });
    setProyecto(prev => prev ? {
      ...prev,
      personal: prev.personal.map(p => p.id === pId ? { ...p, confirmado: !confirmado } : p),
    } : prev);
  }

  // ── Confirmar todos los de un grupo ──
  async function confirmarGrupo(grupo: NonNullable<typeof proyecto>["personal"]) {
    const pendientes = grupo.filter(p => !p.confirmado && p.tecnico);
    await Promise.all(pendientes.map(p =>
      fetch(`/api/proyectos/${id}/personal/${p.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmado: true }),
      })
    ));
    setProyecto(prev => prev ? {
      ...prev,
      personal: prev.personal.map(p => pendientes.some(pp => pp.id === p.id) ? { ...p, confirmado: true } : p),
    } : prev);
  }

  // ── Marcar pago de personal (toggle PAGADO ↔ PENDIENTE) ──
  const [marcandoPago, setMarcandoPago] = useState<Set<string>>(new Set());

  async function togglePagoPersonal(pId: string, estadoActual: string) {
    const nuevoEstado = estadoActual === "PAGADO" ? "PENDIENTE" : "PAGADO";
    setMarcandoPago(prev => new Set([...prev, pId]));
    const res = await fetch(`/api/proyectos/${id}/personal/${pId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estadoPago: nuevoEstado }),
    });
    if (res.ok) {
      setProyecto(prev => prev ? {
        ...prev,
        personal: prev.personal.map(p => p.id === pId ? { ...p, estadoPago: nuevoEstado } : p),
      } : prev);
    }
    setMarcandoPago(prev => { const s = new Set(prev); s.delete(pId); return s; });
  }

  async function marcarTodosPagado() {
    const pendientes = proyecto!.personal.filter(p => p.tecnico && p.estadoPago !== "PAGADO");
    if (pendientes.length === 0) return;
    pendientes.forEach(p => setMarcandoPago(prev => new Set([...prev, p.id])));
    await Promise.all(pendientes.map(p =>
      fetch(`/api/proyectos/${id}/personal/${p.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estadoPago: "PAGADO" }),
      })
    ));
    setProyecto(prev => prev ? {
      ...prev,
      personal: prev.personal.map(p => pendientes.some(pp => pp.id === p.id) ? { ...p, estadoPago: "PAGADO" } : p),
    } : prev);
    setMarcandoPago(new Set());
  }

  // ── Eliminar personal ──
  async function eliminarPersonal(pId: string) {
    await fetch(`/api/proyectos/${id}/personal/${pId}`, { method: "DELETE" });
    setProyecto(prev => prev ? { ...prev, personal: prev.personal.filter(p => p.id !== pId) } : prev);
  }

  // ── Asignar técnico a fila sin asignar ──
  async function asignarTecnico(pId: string, tecnicoIdOverride?: string) {
    const tid = tecnicoIdOverride ?? selAsignar;
    if (!tid) return;
    const res = await fetch(`/api/proyectos/${id}/personal/${pId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tecnicoId: tid }),
    });
    const d = await res.json();
    setProyecto(prev => prev ? {
      ...prev,
      personal: prev.personal.map(p => p.id === pId ? d.personal : p),
    } : prev);
    setAsignandoId(null);
    setSelAsignar("");
  }

  // ── Desasignar técnico de slot (mantiene la fila) ──
  async function desasignarTecnico(pId: string) {
    const res = await fetch(`/api/proyectos/${id}/personal/${pId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tecnicoId: null }),
    });
    const d = await res.json();
    setProyecto(prev => prev ? {
      ...prev,
      personal: prev.personal.map(p => p.id === pId ? d.personal : p),
    } : prev);
  }

  // ── Agregar slot vacío a un grupo ──
  async function agregarSlotVacio(participacion: string, fechaJornada: string | null) {
    const res = await fetch(`/api/proyectos/${id}/personal`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participacion, fechaJornada: fechaJornada || null }),
    });
    const d = await res.json();
    if (d.personal) {
      setProyecto(prev => prev ? { ...prev, personal: [...prev.personal, d.personal] } : prev);
    }
  }

  // ── Crear técnico nuevo y asignarlo directamente al slot ──
  async function crearTecnicoYAsignar() {
    if (!nuevoTecNombre.trim() || !crearParaSlotId) return;
    setCreandoTecnico(true);
    const res = await fetch("/api/tecnicos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nuevoTecNombre.trim(),
        celular: nuevoTecCelular.trim() || null,
        rolId: nuevoTecRolId || null,
        nivel: nuevoTecNivel,
      }),
    });
    const d = await res.json();
    if (d.tecnico) {
      setTecnicos(prev => [...prev, d.tecnico].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      await asignarTecnico(crearParaSlotId, d.tecnico.id);
    }
    setCrearParaSlotId(null);
    setAsignandoId(null);
    setNuevoTecNombre(""); setNuevoTecCelular(""); setNuevoTecRolId(""); setNuevoTecNivel("A");
    setCreandoTecnico(false);
  }

  // ── Registrar gasto directo ──
  async function agregarGasto() {
    if (!gastoConcepto.trim() || !gastoMonto) return;
    setAddingGasto(true);
    const res = await fetch(`/api/proyectos/${id}/gastos`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concepto: gastoConcepto.trim(),
        monto: parseFloat(gastoMonto),
        fecha: gastoFecha,
        notas: gastoNotas || null,
        metodoPago: gastoMetodo,
        categoriaId: gastoCategoria || null,
        proveedorId: gastoProveedor || null,
        cuentaOrigenId: gastoCuenta || null,
        referencia: gastoReferencia || null,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setAddingGasto(false);
      return;
    }
    const d = await res.json();
    setProyecto(prev => prev ? { ...prev, movimientos: [d.gasto, ...prev.movimientos] } : prev);
    setGastoConcepto(""); setGastoMonto(""); setGastoNotas(""); setGastoReferencia(""); setGastoCategoria(""); setGastoProveedor(""); setGastoCuenta(""); setShowGastoForm(false);
    setAddingGasto(false);
  }

  // ── Agregar gasto unificado (PENDIENTE=CxP, PAGADO=movimiento) ──
  async function agregarGastoProy(): Promise<boolean> {
    if (!gastoConcepto.trim() || !gastoMonto) return false;
    setAddingGasto(true);
    try {
      if (gastoEstado === "PENDIENTE") {
        const res = await fetch("/api/cuentas-pagar", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concepto: gastoConcepto.trim(),
            monto: parseFloat(gastoMonto),
            fechaCompromiso: gastoFecha,
            tipoAcreedor: gastoCategoria === "PROVEEDOR_EXTERNO" || gastoProveedor ? "PROVEEDOR" : "OTRO",
            proveedorId: gastoProveedor || null,
            notas: gastoNotas || null,
            proyectoId: id,
          }),
        });
        const d = await res.json();
        if (res.ok && d.cxp) {
          setProyecto(prev => prev ? {
            ...prev,
            cuentasPagar: [...prev.cuentasPagar, { id: d.cxp.id, concepto: d.cxp.concepto, monto: d.cxp.monto, estado: d.cxp.estado, fechaCompromiso: d.cxp.fechaCompromiso, tipoAcreedor: d.cxp.tipoAcreedor, montoOriginal: null, ajustesLog: null }],
          } : prev);
          toast.success("Gasto registrado");
        } else {
          toast.error(d.error ?? "Error al registrar");
          return false;
        }
      } else {
        const validCategoriaId = categorias.some(c => c.id === gastoCategoria) ? gastoCategoria : null;
        const res = await fetch(`/api/proyectos/${id}/gastos`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concepto: gastoConcepto.trim(),
            monto: parseFloat(gastoMonto),
            fecha: gastoFecha,
            notas: gastoNotas || null,
            metodoPago: gastoMetodo,
            categoriaId: validCategoriaId,
            proveedorId: gastoProveedor || null,
            cuentaOrigenId: gastoCuenta || null,
            referencia: gastoReferencia || null,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          toast.error(d.error ?? "Error al registrar");
          return false;
        }
        const d = await res.json();
        setProyecto(prev => prev ? { ...prev, movimientos: [d.gasto, ...prev.movimientos] } : prev);
        toast.success("Gasto registrado");
      }
      setGastoConcepto(""); setGastoMonto(""); setGastoNotas(""); setGastoReferencia("");
      setGastoCategoria(""); setGastoProveedor(""); setGastoCuenta(""); setShowGastoForm(false);
      return true;
    } finally {
      setAddingGasto(false);
    }
  }

  // ── Marcar CxP como pagado (mini modal) ──
  async function marcarPagadoGasto(cxpId: string) {
    setSavingMarcarPagado(true);
    const res = await fetch(`/api/cuentas-pagar/${cxpId}/pagar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha: marcarPagadoFecha }),
    });
    if (res.ok) {
      await load();
      toast.success("Marcado como pagado");
    } else {
      toast.error("Error al marcar como pagado");
    }
    setMarcarPagadoId(null);
    setSavingMarcarPagado(false);
  }

  // ── Editar gasto directo ──
  function abrirEditarGasto(g: Gasto) {
    setEditGastoEstado("PAGADO");
    setEditingCxPId(null);
    setEditGasto(g);
    setEditGastoForm({
      concepto: g.concepto,
      monto: String(g.monto),
      fecha: g.fecha.slice(0, 10),
      notas: g.notas ?? "",
      referencia: g.referencia ?? "",
      metodoPago: g.metodoPago,
      categoriaId: g.categoria?.id ?? "",
      proveedorId: g.proveedor?.id ?? "",
      cuentaOrigenId: g.cuentaOrigen?.id ?? "",
    });
  }

  // ── Editar CxP (pendiente) ──
  function abrirEditarCxP(c: { id: string; concepto: string; monto: number; fechaCompromiso: string | null; tipoAcreedor: string }) {
    setEditGastoEstado("PENDIENTE");
    setEditingCxPId(c.id);
    setEditGasto({ id: c.id, concepto: c.concepto, monto: c.monto, fecha: c.fechaCompromiso ?? new Date().toISOString().split("T")[0], notas: null, referencia: null, metodoPago: "TRANSFERENCIA", categoriaId: null, categoria: null, proveedorId: null, proveedor: null, cuentaOrigenId: null, cuentaOrigen: null });
    setEditGastoForm({
      concepto: c.concepto,
      monto: String(c.monto),
      fecha: c.fechaCompromiso ? c.fechaCompromiso.slice(0, 10) : new Date().toISOString().split("T")[0],
      notas: "",
      referencia: "",
      metodoPago: "TRANSFERENCIA",
      categoriaId: "",
      proveedorId: "",
      cuentaOrigenId: "",
    });
  }

  async function guardarEdicionGasto() {
    if (!editGasto) return;
    setSavingGasto(true);

    try {
      const esEdicionCxP = editGastoEstado === "PENDIENTE" && editingCxPId;
      const esCambioAPendiente = editGastoEstado === "PENDIENTE" && !editingCxPId;

      if (esEdicionCxP) {
        // PENDIENTE → PENDIENTE: editar CxP existente
        const res = await fetch(`/api/cuentas-pagar/${editingCxPId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concepto: editGastoForm.concepto,
            monto: parseFloat(editGastoForm.monto),
            motivo: "Edición de gasto",
            fechaCompromiso: editGastoForm.fecha,
            notas: editGastoForm.notas || null,
          }),
        });
        if (res.ok) {
          setProyecto(prev => prev ? {
            ...prev,
            cuentasPagar: prev.cuentasPagar.map(c => c.id !== editingCxPId ? c : {
              ...c,
              concepto: editGastoForm.concepto,
              monto: parseFloat(editGastoForm.monto),
              fechaCompromiso: editGastoForm.fecha,
            }),
          } : prev);
        }
      } else if (esCambioAPendiente) {
        // PAGADO → PENDIENTE: eliminar movimiento + crear CxP
        const delRes = await fetch(`/api/movimientos/${editGasto.id}`, { method: "DELETE" });
        if (delRes.ok) {
          const cxpRes = await fetch("/api/cuentas-pagar", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              concepto: editGastoForm.concepto,
              monto: parseFloat(editGastoForm.monto),
              fechaCompromiso: editGastoForm.fecha,
              tipoAcreedor: editGastoForm.proveedorId ? "PROVEEDOR" : "OTRO",
              proveedorId: editGastoForm.proveedorId || null,
              notas: editGastoForm.notas || null,
              proyectoId: id,
            }),
          });
          if (cxpRes.ok) {
            const d = await cxpRes.json();
            setProyecto(prev => prev ? {
              ...prev,
              movimientos: prev.movimientos.filter(m => m.id !== editGasto.id),
              cuentasPagar: [...prev.cuentasPagar, { id: d.cxp.id, concepto: d.cxp.concepto, monto: d.cxp.monto, estado: d.cxp.estado, fechaCompromiso: d.cxp.fechaCompromiso, tipoAcreedor: d.cxp.tipoAcreedor, montoOriginal: null, ajustesLog: null }],
            } : prev);
          }
        }
      } else {
        // PAGADO → PAGADO: editar movimiento existente
        const res = await fetch(`/api/movimientos/${editGasto.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concepto: editGastoForm.concepto,
            monto: parseFloat(editGastoForm.monto),
            fecha: editGastoForm.fecha,
            notas: editGastoForm.notas || null,
            referencia: editGastoForm.referencia || null,
            metodoPago: editGastoForm.metodoPago,
            categoriaId: editGastoForm.categoriaId || null,
            proveedorId: editGastoForm.proveedorId || null,
            cuentaOrigenId: editGastoForm.cuentaOrigenId || null,
          }),
        });
        if (res.ok) {
          const cuentaSeleccionada = cuentasBancarias.find(c => c.id === editGastoForm.cuentaOrigenId) ?? null;
          const catSeleccionada = categorias.find(c => c.id === editGastoForm.categoriaId) ?? null;
          const provSeleccionado = proveedores.find(p => p.id === editGastoForm.proveedorId) ?? null;
          setProyecto(prev => prev ? {
            ...prev,
            movimientos: prev.movimientos.map(m => m.id !== editGasto.id ? m : {
              ...m,
              concepto: editGastoForm.concepto,
              monto: parseFloat(editGastoForm.monto),
              fecha: editGastoForm.fecha,
              notas: editGastoForm.notas || null,
              referencia: editGastoForm.referencia || null,
              metodoPago: editGastoForm.metodoPago,
              categoriaId: editGastoForm.categoriaId || null,
              categoria: catSeleccionada ? { id: catSeleccionada.id, nombre: catSeleccionada.nombre } : null,
              proveedorId: editGastoForm.proveedorId || null,
              proveedor: provSeleccionado ? { id: provSeleccionado.id, nombre: provSeleccionado.nombre } : null,
              cuentaOrigenId: editGastoForm.cuentaOrigenId || null,
              cuentaOrigen: cuentaSeleccionada ? { id: cuentaSeleccionada.id, nombre: cuentaSeleccionada.nombre, banco: cuentaSeleccionada.banco } : null,
            }),
          } : prev);
        }
      }
    } finally {
      setEditGasto(null);
      setEditingCxPId(null);
      setSavingGasto(false);
    }
  }

  async function eliminarMovimiento(movId: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    const res = await fetch(`/api/movimientos/${movId}`, { method: "DELETE" });
    if (res.ok) {
      setProyecto(prev => prev ? { ...prev, movimientos: prev.movimientos.filter(m => m.id !== movId) } : prev);
    } else {
      toast.error("Error al eliminar el gasto");
    }
  }

  // ── Eliminar proyecto ──
  async function eliminarProyecto() {
    setBorrando(true);
    const res = await fetch(`/api/proyectos/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.ok) {
      router.push(`/cotizaciones/${d.cotizacionId}`);
    } else {
      toast.error("Error al eliminar el proyecto: " + (d.error ?? "desconocido"));
      setBorrando(false);
    }
  }

  // ── Agregar nota bitácora ──
  async function agregarNota() {
    if (!notaBitacora.trim()) return;
    setAddingNota(true);
    const res = await fetch(`/api/proyectos/${id}/bitacora`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: notaBitacora.trim(), tipo: "NOTA" }),
    });
    const d = await res.json();
    setProyecto(prev => prev ? { ...prev, bitacora: [d.entrada, ...prev.bitacora] } : prev);
    setNotaBitacora("");
    setAddingNota(false);
  }

  // ── Registrar pago CxC ──
  async function registrarPagoCxC(cxcId: string) {
    setPagando(cxcId);
    const res = await fetch(`/api/cuentas-cobrar/${cxcId}/pagar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: montoPago || undefined, fecha: fechaPago, cuentaId: cuentaPagoId || undefined, metodoPago: metodoPagoFinanzas }),
    });
    if (res.ok) {
      await load();
    }
    setPagando(null);
    setMontoPago("");
    setCuentaPagoId("");
    setMetodoPagoFinanzas("TRANSFERENCIA");
  }

  // ── Guardar esquema de cobro (anticipo + liquidación) ──
  async function guardarEsquema() {
    if (!proyecto) return;
    const granTotal = proyecto.cotizacion?.granTotal ?? 0;
    if (granTotal <= 0) return;
    const montoAnticipo = esquemaAnticipoTipo === "porcentaje"
      ? Math.round(granTotal * (parseFloat(esquemaAnticipoPct) / 100) * 100) / 100
      : Math.round(parseFloat(esquemaAnticipoMonto) * 100) / 100;
    if (!montoAnticipo || isNaN(montoAnticipo) || montoAnticipo <= 0 || !esquemaAnticipoFecha) return;
    const montoLiq = Math.round((granTotal - montoAnticipo) * 100) / 100;
    setSavingEsquema(true);
    const body: Record<string, unknown> = {
      anticipo: { monto: montoAnticipo, fechaCompromiso: esquemaAnticipoFecha },
    };
    if (montoLiq > 0 && esquemaLiqFecha) {
      body.liquidacion = { monto: montoLiq, fechaCompromiso: esquemaLiqFecha };
    }
    const res = await fetch(`/api/proyectos/${id}/esquema-cobro`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditandoEsquema(false);
      await load();
    }
    setSavingEsquema(false);
  }

  // ── Sincronizar CxC desde cotización ──
  async function sincronizarCxC() {
    if (!proyecto) return;
    setSyncingCxC(true);
    const res = await fetch(`/api/proyectos/${id}/sincronizar-cxc`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      if (data.actualizadas > 0) {
        toast.success(`${data.actualizadas} cuenta(s) actualizadas desde la cotización`);
        await load();
      } else {
        toast.success(data.mensaje ?? "Las cuentas ya están sincronizadas");
      }
    } else {
      toast.error(data.error ?? "Error al sincronizar");
    }
    setSyncingCxC(false);
  }

  // ── Eliminar CxC individual ──
  async function eliminarCxC(cxcId: string) {
    if (!await confirm({ message: "¿Eliminar esta cuenta por cobrar?", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/cuentas-cobrar/${cxcId}`, { method: "DELETE" });
    await load();
  }

  // ── Ajustar monto/fecha CxC ──
  async function ajustarMontoCxC(cxcId: string, montoActual: number) {
    const monto = parseFloat(ajusteMonto);
    const montoChanged = !isNaN(monto) && monto > 0 && monto !== montoActual;
    if (montoChanged && (!ajusteMotivo.trim() || ajusteMotivo.trim().length < 5)) { toast.error("El motivo es obligatorio al ajustar el monto"); return; }
    if (ajusteRegistrarExtra && !ajusteExtraConcepto.trim()) { toast.error("Escribe el concepto del gasto extra"); return; }
    const payload: Record<string, unknown> = {};
    if (montoChanged) { payload.monto = monto; payload.motivo = ajusteMotivo.trim(); }
    if (ajusteFecha) payload.fechaCompromiso = ajusteFecha;
    if (Object.keys(payload).length === 0) { toast.error("Sin cambios"); return; }
    const res = await fetch(`/api/cuentas-cobrar/${cxcId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Error al guardar"); return; }
    // Registrar el excedente como gasto operativo si el usuario lo eligió
    if (montoChanged && ajusteRegistrarExtra && monto > montoActual) {
      const delta = Math.round((monto - montoActual) * 100) / 100;
      await fetch("/api/proyectos/gastos-operativos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proyectoId: id,
          tipo: ajusteExtraTipo,
          concepto: ajusteExtraConcepto.trim(),
          monto: delta,
          cantidad: 1,
          notas: `Extra registrado desde ajuste CxC — motivo: ${ajusteMotivo.trim()}`,
        }),
      });
      toast.success(`Guardado + gasto extra de ${fmt(delta)} registrado`);
    } else {
      toast.success("Guardado correctamente");
    }
    setAjustando(null); setAjusteMonto(""); setAjusteMotivo(""); setAjusteFecha("");
    setAjusteRegistrarExtra(false); setAjusteExtraTipo("OTRO"); setAjusteExtraConcepto("");
    await load();
  }

  // ── Ajustar monto/fecha CxP ──
  async function ajustarMontoCxP(cxpId: string, montoActual: number) {
    const monto = parseFloat(ajusteMonto);
    const montoChanged = !isNaN(monto) && monto > 0 && monto !== montoActual;
    if (montoChanged && (!ajusteMotivo.trim() || ajusteMotivo.trim().length < 5)) { toast.error("El motivo es obligatorio al ajustar el monto"); return; }
    const payload: Record<string, unknown> = {};
    if (montoChanged) { payload.monto = monto; payload.motivo = ajusteMotivo.trim(); }
    if (ajusteFecha) payload.fechaCompromiso = ajusteFecha;
    if (Object.keys(payload).length === 0) { toast.error("Sin cambios"); return; }
    const res = await fetch(`/api/cuentas-pagar/${cxpId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Error al guardar"); return; }
    toast.success("Guardado correctamente");
    setAjustando(null); setAjusteMonto(""); setAjusteMotivo(""); setAjusteFecha("");
    await load();
  }

  // ── Registrar pago CxP ──
  async function registrarPagoCxP(cxpId: string) {
    setPagando(cxpId);
    const res = await fetch(`/api/cuentas-pagar/${cxpId}/pagar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: montoPago || undefined, fecha: fechaPago, cuentaId: cuentaPagoId || undefined, metodoPago: metodoPagoFinanzas }),
    });
    if (res.ok) {
      await load();
    }
    setPagando(null);
    setMontoPago("");
    setCuentaPagoId("");
    setMetodoPagoFinanzas("TRANSFERENCIA");
  }

  // ── Crear CxP manual desde el proyecto ──
  async function crearNuevaCxP() {
    if (!nuevaCxPConcepto.trim() || !nuevaCxPMonto || !nuevaCxPFecha) return;
    setSavingNuevaCxP(true);
    const res = await fetch("/api/cuentas-pagar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concepto: nuevaCxPConcepto.trim(),
        monto: parseFloat(nuevaCxPMonto),
        fechaCompromiso: nuevaCxPFecha,
        tipoAcreedor: nuevaCxPTipo,
        tecnicoId: nuevaCxPTipo === "TECNICO" ? (nuevaCxPTecnicoId || null) : null,
        proveedorId: nuevaCxPTipo === "PROVEEDOR" ? (nuevaCxPProveedorId || null) : null,
        notas: nuevaCxPNotas || null,
        proyectoId: id,
      }),
    });
    const d = await res.json();
    if (res.ok && d.cxp) {
      setProyecto(prev => prev ? {
        ...prev,
        cuentasPagar: [...prev.cuentasPagar, { id: d.cxp.id, concepto: d.cxp.concepto, monto: d.cxp.monto, estado: d.cxp.estado, fechaCompromiso: d.cxp.fechaCompromiso, tipoAcreedor: d.cxp.tipoAcreedor, montoOriginal: null, ajustesLog: null }],
      } : prev);
      toast.success("CxP registrada");
      setNuevaCxPConcepto(""); setNuevaCxPMonto(""); setNuevaCxPFecha(new Date().toISOString().split("T")[0]);
      setNuevaCxPTipo("OTRO"); setNuevaCxPTecnicoId(""); setNuevaCxPProveedorId(""); setNuevaCxPNotas("");
      setShowNuevaCxP(false);
    } else {
      toast.error(d.error ?? "Error al crear CxP");
    }
    setSavingNuevaCxP(false);
  }

  async function anularMovimiento(id: string, tipo: "cobro" | "pago") {
    const label = tipo === "cobro" ? "cobro" : "pago";
    if (!await confirm({ message: `¿Anular este ${label}? El movimiento financiero asociado será eliminado y el registro volverá a estado Pendiente.`, danger: true, confirmText: "Anular" })) return;
    setAnulando(id);
    const endpoint = tipo === "cobro" ? `/api/cuentas-cobrar/${id}/anular` : `/api/cuentas-pagar/${id}/anular`;
    const res = await fetch(endpoint, { method: "POST" });
    if (res.ok) {
      toast.success("Registro anulado — vuelve a estado Pendiente");
      await load();
    } else {
      toast.error("Error al anular");
    }
    setAnulando(null);
  }

  if (loading) return <SkeletonPage rows={6} cols={4} />;
  if (loadError || !proyecto) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
      <p className="text-white/60 text-sm">No se pudo cargar el proyecto</p>
      {loadErrorMsg && (
        <p className="text-red-400/80 text-xs max-w-md text-center bg-red-950/30 border border-red-900/30 rounded-lg px-4 py-2 font-mono break-all">
          {loadErrorMsg}
        </p>
      )}
      <button
        onClick={() => { setLoading(true); load(); }}
        className="ms-btn-primary">
        Reintentar
      </button>
      <a href="/proyectos" className="text-white/30 text-xs hover:text-white/60 transition-colors">← Volver a proyectos</a>
    </div>
  );

  const checkOp = proyecto.checklist.filter(c => c.tipo !== "RIDER");
  const checkRider = proyecto.checklist.filter(c => c.tipo === "RIDER");
  const checkTotal = checkOp.length;
  const checkDone = checkOp.filter(c => c.completado).length;
  const checkPct = checkTotal > 0 ? (checkDone / checkTotal) * 100 : 0;
  const personalConfirmado = proyecto.personal.filter(p => p.confirmado).length;
  const hoyStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const eventoStr = proyecto.fechaEvento.substring(0, 10);
  const diasRestantes = Math.round((new Date(eventoStr).getTime() - new Date(hoyStr).getTime()) / 86400000);
  // Servicio de varios días: lista canónica de fechas (día 1 = fechaEvento)
  const diasDelEvento = diasEvento(proyecto.fechaEvento, proyecto.fechasEvento);
  const esMultidia = diasDelEvento.length > 1;
  const fmtDiaCorto = (iso: string) =>
    new Date(iso + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
  const esRenta = proyecto.tipoServicio === "RENTA" || proyecto.trato?.tipoServicio === "RENTA";

  return (
    <>
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-12">
      <div className="mb-2"><BackButton /></div>

      {/* ── Header ── */}
      <div className="flex flex-col gap-4">
        {/* Título e intención */}
        <div className="min-w-0">
          <h1 className="text-xl md:ms-h1">{proyecto.nombre}</h1>
          <p className="text-[#444] text-xs mt-1 italic">
            Estamos creando una experiencia memorable para {proyecto.cliente.nombre.split(" ")[0]}.
          </p>
        </div>

        {/* Datos clave del evento: Cliente · Fecha · Lugar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Cliente</p>
            <Link href={`/crm/clientes/${proyecto.cliente.id}`} className="text-[#B3985B] text-sm font-medium hover:underline block truncate">
              {proyecto.cliente.nombre}
            </Link>
            {proyecto.cliente.empresa && (
              <p className="text-gray-500 text-xs truncate">{proyecto.cliente.empresa}</p>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">
              {esMultidia ? `Días del evento · ${diasDelEvento.length}` : "Fecha del evento"}
            </p>
            {esMultidia ? (
              <div className="space-y-1">
                {diasDelEvento.map((d, i) => (
                  <div key={d} className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold text-black bg-[#B3985B] rounded px-1.5 py-0.5 shrink-0">D{i + 1}</span>
                    <span className="text-white text-sm capitalize">{fmtDiaCorto(d)}</span>
                  </div>
                ))}
                {proyecto.horaInicioEvento && (
                  <p className="text-gray-400 text-xs mt-0.5">{proyecto.horaInicioEvento}{proyecto.horaFinEvento ? ` – ${proyecto.horaFinEvento}` : ""}</p>
                )}
              </div>
            ) : (
              <>
                <p className="text-white font-semibold text-sm leading-tight">{fmtDate(proyecto.fechaEvento)}</p>
                {proyecto.horaInicioEvento && (
                  <p className="text-gray-400 text-xs mt-0.5">{proyecto.horaInicioEvento}{proyecto.horaFinEvento ? ` – ${proyecto.horaFinEvento}` : ""}</p>
                )}
              </>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Lugar del evento</p>
            <p className="text-gray-300 text-sm inline-flex items-start gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5 text-gray-600"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{proyecto.lugarEvento ?? <span className="text-red-500/60 italic">Sin lugar</span>}</span>
            </p>
          </div>
        </div>

        {/* Contexto: etapa · tipo de servicio · cuenta regresiva */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] ${ESTADO_COLORS[proyecto.estado]}`}>
            <span className="opacity-60">Etapa del proyecto</span>
            <span className="font-semibold">{ESTADO_LABELS[proyecto.estado] ?? proyecto.estado.replace("_", " ")}</span>
          </span>
          {proyecto.tipoServicio && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] text-[11px]">
              <span className="text-gray-500">Tipo de servicio</span>
              <span className="font-semibold text-[#B3985B]">{proyecto.tipoServicio === "RENTA" ? "Renta de Equipo" : proyecto.tipoServicio === "PRODUCCION_TECNICA" ? "Producción Técnica" : proyecto.tipoServicio === "DIRECCION_TECNICA" ? "Dirección Técnica" : proyecto.tipoServicio}</span>
            </span>
          )}
          {diasRestantes >= 0 && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] ${diasRestantes <= 7 ? "bg-red-900/40 text-red-300" : diasRestantes <= 30 ? "bg-yellow-900/30 text-yellow-400" : "bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400"}`}>
              <span className="opacity-60">Cuenta regresiva</span>
              <span className="font-semibold">{diasRestantes === 0 ? "Es hoy" : `Faltan ${diasRestantes} día${diasRestantes !== 1 ? "s" : ""}`}</span>
            </span>
          )}
        </div>

        {/* Referencias: Proyecto y Cotización bajo un mismo formato */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#2a2a2a] bg-[#111] text-[11px] text-gray-400">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span className="text-gray-500">Proyecto</span>
            <span className="font-mono text-gray-300">{proyecto.numeroProyecto}</span>
            <CopyButton value={proyecto.numeroProyecto} size="xs" />
          </span>
          {proyecto.cotizacion && (
            <Link href={`/cotizaciones/${proyecto.cotizacion.id}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#2a2a2a] bg-[#111] text-[11px] text-gray-400 hover:border-[#B3985B]/40 hover:text-[#B3985B] transition-colors">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span className="text-gray-500">Cotización</span>
              <span className="font-mono">{proyecto.cotizacion.numeroCotizacion}</span>
            </Link>
          )}
          {proyecto.tratoId && (
            <Link href={`/crm/tratos/${proyecto.tratoId}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#2a2a2a] bg-[#111] text-[11px] text-gray-400 hover:border-[#B3985B]/40 hover:text-[#B3985B] transition-colors">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg>
              <span className="text-gray-500">Trato</span>
              <span>{proyecto.cliente.nombre}{proyecto.nombre ? ` · ${proyecto.nombre}` : ""}</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Two-column layout: left (tabs+content) + right (sidebar) ── */}
      <div className="flex flex-col md:flex-row gap-5 items-start mt-5">

        {/* Left column — 70% — tabs + content */}
        <div className="flex-1 min-w-0 space-y-4">

        {/* ──── Sticky tab navigation ──── */}
        <div className="sticky top-0 z-30 -mx-3 md:-mx-6 px-3 md:px-6 py-2 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#1a1a1a]">
          <div className="flex gap-1">
            {([
              { id: 'resumen',   label: 'Resumen' },
              { id: 'operacion', label: 'Operación' },
              { id: 'extras',    label: 'Producción' },
              ...(proyecto?._canViewFinances ? [{ id: 'finanzas', label: 'Finanzas' } as const] : []),
              { id: 'tareas',    label: 'Tareas' },
            ] as const).map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === item.id
                    ? 'bg-[#B3985B]/20 text-[#B3985B] border border-[#B3985B]/40'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* ──── RESUMEN tab ──── */}
        {activeTab === 'resumen' && (
          <div className="space-y-4">

      {/* ── Confirmación de información del cliente ── */}
      <div className="ms-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Confirmación del cliente</p>
            <p className="text-gray-500 text-xs mt-0.5">Enlace para que el cliente confirme y complete los datos del evento. Al guardar, se llenan aquí automáticamente.</p>
          </div>
          {proyecto.infoToken ? (
            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${proyecto.infoRecibidoEn ? "bg-green-900/50 text-green-300" : "bg-yellow-900/50 text-yellow-300"}`}>
              {proyecto.infoRecibidoEn ? "Recibido" : "Pendiente"}
            </span>
          ) : null}
        </div>

        {!proyecto.infoToken ? (
          <button
            onClick={generarInfoToken}
            disabled={generandoInfoToken}
            className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            {generandoInfoToken ? "Generando..." : "Generar enlace de confirmación"}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 flex items-center gap-2">
              <span className="text-gray-500 text-xs flex-1 truncate font-mono">{`${typeof window !== "undefined" ? window.location.origin : ""}/confirmar/proyecto/${proyecto.infoToken}`}</span>
              <button onClick={copiarInfoLink} className="text-[10px] text-[#B3985B] hover:text-white shrink-0 transition-colors">Copiar</button>
              {proyecto.cliente.telefono && (
                <a
                  href={`https://wa.me/${proyecto.cliente.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${proyecto.cliente.nombre}, para tu evento "${proyecto.nombre}" nos ayudas confirmando los datos en este enlace: ${window.location.origin}/confirmar/proyecto/${proyecto.infoToken}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-green-400 hover:text-green-300 shrink-0 transition-colors flex items-center gap-1"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.984-1.31A9.944 9.944 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                  WhatsApp
                </a>
              )}
            </div>
            <div className="flex items-center gap-3">
              {proyecto.infoRecibidoEn && (
                <span className="text-xs text-gray-500">Recibido {fmtDateTime(proyecto.infoRecibidoEn)}</span>
              )}
              <button
                onClick={revocarInfoToken}
                disabled={revocandoInfoToken}
                className="text-[10px] text-red-400/70 hover:text-red-400 disabled:opacity-50 transition-colors ml-auto"
              >
                {revocandoInfoToken ? "Revocando..." : "Revocar enlace"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Progreso del proyecto (Avance) ── */}
      {(() => {
        // ── Protocolo salida / entrada ──────────────────────────────────────
        let _salidaData: { estado?: string } = {};
        let _entradaData: { estado?: string } = {};
        try { _salidaData = proyecto.protocoloSalida ? JSON.parse(proyecto.protocoloSalida) : {}; } catch { /* noop */ }
        try { _entradaData = proyecto.protocoloEntrada ? JSON.parse(proyecto.protocoloEntrada) : {}; } catch { /* noop */ }

        const anticipoCxC = proyecto.cuentasCobrar.find(c => c.tipoPago === "ANTICIPO");
        const liquidacionCxC = proyecto.cuentasCobrar.find(c => c.tipoPago === "LIQUIDACION");
        const checkOp2 = proyecto.checklist.filter(c => c.tipo !== "RIDER");
        const checkPct2 = checkOp2.length > 0 ? checkOp2.filter(c => c.completado).length / checkOp2.length : 0;

        // ── Campos ponderados de PRODUCCIÓN (suman 100) ─────────────────────
        // El progreso mide únicamente pre-producción / producción técnica.
        // Nada de finanzas ni cobranza entra en esta medición. Fuente única
        // compartida con la lista de proyectos (src/lib/proyecto-avance.ts).
        const wChecks = checksAvanceProduccion({
          lugarEvento: proyecto.lugarEvento,
          tieneEncargado: !!proyecto.encargado,
          equiposCount: proyecto.equipos.length,
          personalCount: proyecto.personal.length,
          protocoloSalida: proyecto.protocoloSalida,
          direccionVenue: proyecto.direccionVenue,
          linkMaps: proyecto.linkMaps,
          fechaMontaje: proyecto.fechaMontaje,
          horaInicioMontaje: proyecto.horaInicioMontaje,
          encargadoLugar: proyecto.encargadoLugar,
          encargadoCliente: proyecto.encargadoCliente,
        });

        const pct = Math.round(wChecks.reduce((sum, c) => sum + (c.ok ? c.peso : 0), 0));
        const barColor = pct >= 90 ? "#10b981" : pct >= 71 ? "#60a5fa" : pct >= 41 ? "#f59e0b" : "#ef4444";

        // ── Sub-barras (mantener visualización por área) ────────────────────
        type CheckItem = { ok: boolean; label: string };
        const infoChecks: CheckItem[] = [
          { ok: !!proyecto.lugarEvento,                                              label: "Lugar del evento" },
          { ok: !!proyecto.encargadoCliente && !!proyecto.encargadoClienteContacto, label: "Contacto cliente" },
          { ok: !!proyecto.encargado,                                                label: "Coordinador de producción" },
        ];
        const prodChecks: CheckItem[] = [
          { ok: proyecto.equipos.length > 0,                                         label: "Equipo registrado" },
          { ok: proyecto.equipos.length > 0 && proyecto.equipos.every((e: { confirmado: boolean }) => e.confirmado), label: "Equipos confirmados" },
          { ok: checkPct2 >= 0.8,                                                    label: "Checklist (≥80%)" },
          { ok: proyecto.personal.length > 0,                                        label: "Personal asignado" },
          { ok: _salidaData.estado === "OK",                                         label: "Protocolo salida" },
          { ok: _entradaData.estado === "OK",                                        label: "Protocolo entrada" },
        ];
        const finChecks: CheckItem[] = proyecto._canViewFinances ? [
          { ok: !!proyecto.cotizacion,                                                label: "Cotización" },
          { ok: !!anticipoCxC && anticipoCxC.montoCobrado >= anticipoCxC.monto,      label: "Anticipo cobrado" },
          { ok: !!liquidacionCxC && liquidacionCxC.montoCobrado >= liquidacionCxC.monto, label: "Liquidación cobrada" },
        ] : [];

        const allChecks = [...infoChecks, ...prodChecks, ...finChecks];

        const ESTADO_OPTS = ["PLANEACION","EN_CURSO","COMPLETADO","CANCELADO"] as const;
        const ESTADO_LABELS_SHORT: Record<string, string> = { PLANEACION:"Planeación", EN_CURSO:"En Curso", COMPLETADO:"Completado", CANCELADO:"Cancelado" };

        const AreaCard = ({ title, checks, color }: { title: string; checks: CheckItem[]; color: string }) => {
          const done = checks.filter(c => c.ok).length;
          const areaPct = checks.length > 0 ? Math.round((done / checks.length) * 100) : 100;
          return (
            <div className="flex-1 min-w-0 bg-[#0d0d0d] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{title}</span>
                <span className="text-[10px] tabular-nums font-semibold" style={{ color: areaPct === 100 ? "#10b981" : areaPct >= 50 ? color : "#ef4444" }}>
                  {done}/{checks.length}
                </span>
              </div>
              <div className="h-1 bg-[#222] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${areaPct}%`, backgroundColor: areaPct === 100 ? "#10b981" : color }} />
              </div>
              <div className="space-y-0.5">
                {checks.map(c => (
                  <div key={c.label} className={`flex items-center gap-1.5 text-[10px] ${c.ok ? "text-[#3a3a3a]" : "text-gray-500"}`}>
                    <span className={`shrink-0 text-[9px] font-bold ${c.ok ? "text-[#2a2a2a]" : "text-red-500/70"}`}>
                      {c.ok ? "✓" : "○"}
                    </span>
                    <span className={c.ok ? "line-through" : ""}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }


        const pendientes = wChecks.filter(c => !c.ok);

        return (
          <div className="ms-stat-card">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold tabular-nums" style={{ color: barColor }}>{pct}%</span>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider leading-none">Avance del proyecto</p>
                  {pendientes.length > 0 && proyecto.estado !== "CANCELADO" && (
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      {pendientes.length} pendiente{pendientes.length > 1 ? 's' : ''}: {pendientes.slice(0, 2).map(p => p.label).join(', ')}{pendientes.length > 2 ? ` +${pendientes.length - 2}` : ''}
                    </p>
                  )}
                  {pendientes.length === 0 && proyecto.estado !== "CANCELADO" && (
                    <p className="text-[11px] text-emerald-500/70 mt-0.5">✓ Todo completado
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {proyecto.estado === "PENDIENTE_CIERRE" && (
                  <button
                    onClick={() => cambiarEstado("COMPLETADO")}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B3985B] text-black font-semibold text-xs hover:bg-[#c9a96a] transition-colors disabled:opacity-40"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Cerrar proyecto
                  </button>
                )}
                {proyecto.estado !== "CANCELADO" ? (
                  <select
                    value={proyecto.estado}
                    onChange={e => cambiarEstado(e.target.value)}
                    disabled={saving}
                    className="text-[11px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-gray-300 focus:outline-none focus:border-[#B3985B]">
                    {ESTADO_OPTS.map(e => <option key={e} value={e}>{ESTADO_LABELS_SHORT[e]}</option>)}
                  </select>
                ) : (
                  <button onClick={() => cambiarEstado("PLANEACION")} disabled={saving}
                    className="text-xs text-gray-500 hover:text-white border border-[#2a2a2a] px-2 py-1 rounded-lg transition-colors">
                    Reactivar
                  </button>
                )}
                {proyecto.estado !== "CANCELADO" && (
                  <button onClick={() => cambiarEstado("CANCELADO")} disabled={saving}
                    className="text-xs text-red-800 hover:text-red-500 border border-red-900/30 hover:border-red-700/50 px-2 py-1 rounded-lg transition-colors"
                    title="Cancelar proyecto">✕</button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: barColor }} />
            </div>
          </div>
        );
      })()}

      {/* ── Semáforo de preparación del evento ── */}
      {(() => {
        const anticipo = proyecto.cuentasCobrar.find(c => c.tipoPago === "ANTICIPO");
        const anticipoCobrado = anticipo ? anticipo.montoCobrado >= anticipo.monto : false;
        const equiposTotal = proyecto.equipos?.length ?? 0;
        const equiposConf = proyecto.equipos?.filter((e: { confirmado: boolean }) => e.confirmado).length ?? 0;
        const fichaOk = esRenta
          ? !!proyecto.lugarEvento
          : !!(proyecto.horaInicioEvento && proyecto.horaFinEvento && proyecto.lugarEvento);
        const items = [
          {
            label: "Ficha",
            ok: fichaOk,
            warn: !fichaOk,
            txt: fichaOk ? "Completa" : (esRenta ? "lugar faltante" : [!proyecto.horaInicioEvento && "hora", !proyecto.lugarEvento && "lugar"].filter(Boolean).join(", ") + " faltante"),
          },
          ...(!esRenta ? [{
            label: "Personal",
            ok: proyecto.personal.length > 0 && personalConfirmado === proyecto.personal.length,
            warn: proyecto.personal.length > 0 && personalConfirmado < proyecto.personal.length,
            txt: proyecto.personal.length === 0 ? "Sin asignar" : `${personalConfirmado}/${proyecto.personal.length} confirmados`,
          }] : []),
          {
            label: "Anticipo",
            ok: anticipoCobrado,
            warn: !!(anticipo && !anticipoCobrado),
            txt: anticipo ? (anticipoCobrado ? "Cobrado" : "Pendiente") : "Sin esquema",
          },
        ];
        const allOk = items.every(i => i.ok);
        const anyWarn = items.some(i => i.warn);
        return (
          <div className={`rounded-xl border px-5 py-3.5 bg-[#0d0d0d] flex flex-wrap items-center gap-x-6 gap-y-2.5 ${allOk ? "border-white/[0.08]" : "border-[#1a1a1a]"}`}>
            <p className={`text-[10px] font-bold uppercase tracking-[0.14em] shrink-0 ${allOk ? "text-white" : "text-gray-600"}`}>
              {allOk ? "✓ Listo" : "Preparación"}
            </p>
            <span className="w-px h-3 bg-[#252525] shrink-0" />
            {items.map((item, idx) => (
              <div key={item.label} className="flex items-baseline gap-1.5">
                <span className="text-[9px] uppercase tracking-[0.12em] text-gray-700 shrink-0">{item.label}</span>
                <span className={`text-[11px] font-medium ${item.ok ? "text-white" : item.warn ? "text-gray-400" : "text-gray-600"}`}>{item.txt}</span>
                {item.ok && <span className="text-[9px] text-gray-600">✓</span>}
              </div>
            ))}
          </div>
        );
      })()}

            {/* ── Datos de la sección Resumen ── */}
      {(() => {
        const fichaCamposFaltantes: string[] = [];
        if (!esRenta && !proyecto.horaInicioEvento) fichaCamposFaltantes.push("hora inicio");
        if (!esRenta && !proyecto.horaFinEvento) fichaCamposFaltantes.push("hora fin");
        if (!proyecto.lugarEvento) fichaCamposFaltantes.push("lugar del evento");
        const fichaCompleta = fichaCamposFaltantes.length === 0;
        return (
          <div className="space-y-4">

            {!fichaCompleta && (
              <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-xl px-4 py-3 flex items-center gap-3">
                <AlertTriangle strokeWidth={1.75} className="w-4 h-4 shrink-0 text-yellow-400" />
                <p className="text-yellow-400/80 text-xs">
                  <span className="font-semibold text-yellow-400">Ficha incompleta — </span>
                  falta: <span className="font-medium">{fichaCamposFaltantes.join(", ")}</span>.
                </p>
              </div>
            )}
            {/* Cliente */}
            <div className="ms-card p-5">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Cliente</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Nombre</p>
                  <Link href={`/crm/clientes/${proyecto.cliente.id}`} className="text-white hover:text-[#B3985B] font-medium">
                    {proyecto.cliente.nombre}
                  </Link>
                  {proyecto.cliente.empresa && <p className="text-gray-400 text-xs">{proyecto.cliente.empresa}</p>}
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Contacto</p>
                  <p className="text-white">{proyecto.cliente.telefono ?? "—"}</p>
                  {proyecto.cliente.correo && <p className="text-gray-400 text-xs">{proyecto.cliente.correo}</p>}
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs mb-1">Coordinador de producción</p>
                  <Combobox
                    value={proyecto.encargado?.id ?? ""}
                    onChange={v => guardarCampo("encargadoId", v)}
                    options={[{ value: "", label: "— Sin asignar —" }, ...usuariosActivos.map(u => ({ value: u.id, label: u.name + (u.area ? ` (${u.area})` : "") }))]}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] hover:border-[#444] transition-colors"
                  />
                </div>
                {esRenta && (<>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-gray-500 text-xs">Encargado del cliente</p>
                      <button
                        onClick={async () => {
                          await guardarCampo("encargadoCliente", proyecto.cliente.nombre);
                          if (proyecto.cliente.telefono) await guardarCampo("encargadoClienteContacto", proyecto.cliente.telefono);
                        }}
                        className="text-[10px] text-[#B3985B]/70 hover:text-[#B3985B] transition-colors"
                        title="Usar datos del cliente"
                      >
                        → usar cliente
                      </button>
                    </div>
                    <Campo label="Encargado del cliente" noLabel value={proyecto.encargadoCliente} field="encargadoCliente" onSave={guardarCampo} />
                  </div>
                  <Campo label="Contacto del cliente" value={proyecto.encargadoClienteContacto} field="encargadoClienteContacto" onSave={guardarCampo} />
                  <div className="col-span-2">
                    <Campo label="Indicaciones para el cliente" value={proyecto.indicacionesCliente} field="indicacionesCliente" type="textarea" onSave={guardarCampo} />
                  </div>
                </>)}
              </div>
            </div>
            {/* Evento */}
            <div className="ms-card p-5">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Datos del evento</p>

              {/* Tipo de evento + servicio — badges estáticos */}
              <div className="flex flex-wrap gap-2 mb-5">
                {proyecto.tipoEvento && (() => {
                  const TE: Record<string, string> = { MUSICAL: "Musical", SOCIAL: "Social", EMPRESARIAL: "Empresarial", OTRO: "Otro" };
                  return <span className="px-2.5 py-1 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-gray-300 text-xs">{TE[proyecto.tipoEvento] ?? proyecto.tipoEvento}</span>;
                })()}
                {proyecto.tipoServicio && (() => {
                  const TS: Record<string, string> = { PRODUCCION_TECNICA: "Producción técnica", RENTA: "Renta de equipo", DIRECCION_TECNICA: "Dirección técnica" };
                  return <span className="px-2.5 py-1 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-gray-300 text-xs">{TS[proyecto.tipoServicio] ?? proyecto.tipoServicio}</span>;
                })()}
                {!esRenta && (
                  <span className="px-2.5 py-1 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-gray-400 text-xs">
                    {proyecto.zona === "BAJIO" ? "Bajío" : proyecto.zona === "NACIONAL" ? "Nacional" : "Local"}
                  </span>
                )}
              </div>

              {!esRenta && (<>
                {/* ── Subsección 1: Información general ── */}
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold whitespace-nowrap">Información general</p>
                  <div className="flex-1 h-px bg-[#1e1e1e]" />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5">
                  <div className="col-span-2">
                    <Campo label="Lugar del evento" value={proyecto.lugarEvento} field="lugarEvento" onSave={guardarCampo} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-gray-500 text-xs">Encargado del lugar</p>
                      <button
                        onClick={async () => {
                          await guardarCampo("encargadoLugar", proyecto.cliente.nombre);
                          if (proyecto.cliente.telefono) await guardarCampo("encargadoLugarContacto", proyecto.cliente.telefono);
                        }}
                        className="text-[10px] text-[#B3985B]/70 hover:text-[#B3985B] transition-colors"
                        title="Usar datos del cliente"
                      >
                        → usar cliente
                      </button>
                    </div>
                    <Campo label="Encargado del lugar" noLabel value={proyecto.encargadoLugar} field="encargadoLugar" onSave={guardarCampo} />
                  </div>
                  <Campo label="Contacto del lugar" value={proyecto.encargadoLugarContacto} field="encargadoLugarContacto" onSave={guardarCampo} />
                  <Campo label="Fecha del evento" value={proyecto.fechaEvento?.substring(0, 10) ?? null} field="fechaEvento" type="date" onSave={guardarCampo} />
                  <div className="col-span-1" />
                  {esMultidia ? (
                    <div className="col-span-2 space-y-2">
                      <p className="text-gray-500 text-xs">Horarios por día</p>
                      {diasDelEvento.map((fecha, di) => {
                        const h = horarioDeDia(fecha, di, diasDelEvento, proyecto.horariosEvento, {
                          inicio: proyecto.horaInicioEvento,
                          fin: proyecto.horaFinEvento,
                          llamado: proyecto.llamadoBodega ? proyecto.llamadoBodega.substring(11, 16) : null,
                          montaje: proyecto.horaInicioMontaje,
                        });
                        const propio = parseHorariosEvento(proyecto.horariosEvento)[fecha];
                        const heredado = di > 0 && !(propio && (propio.inicio || propio.fin));
                        return (
                          <div key={fecha} className="rounded-lg border border-[#1e1e1e] bg-[#141414] p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-bold text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/30 rounded px-1.5 py-0.5">D{di + 1}</span>
                              <p className="text-gray-300 text-xs capitalize">{fmtDiaCorto(fecha)}</p>
                              {heredado && <span className="text-[10px] text-gray-600">· mismos horarios del Día 1</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                              <HourPicker label="Hora inicio del evento" value={h.inicio} field={`inicio-${fecha}`} onSave={(_f, v) => guardarHorarioDia(fecha, di, "inicio", v)} />
                              <HourPicker label="Hora fin del evento" value={h.fin} field={`fin-${fecha}`} onSave={(_f, v) => guardarHorarioDia(fecha, di, "fin", v)} />
                              <HourPicker label="Llamado en bodega" value={h.llamado} field={`llamado-${fecha}`} onSave={(_f, v) => guardarHorarioDia(fecha, di, "llamado", v)} />
                              <div>
                                {di > 0 && (
                                  <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={h.aplicaMontaje}
                                      onChange={e => guardarHorarioDia(fecha, di, "aplicaMontaje", e.target.checked)}
                                      className="accent-[#B3985B] w-3.5 h-3.5"
                                    />
                                    <span className="text-xs text-gray-500">Aplica montaje este día</span>
                                  </label>
                                )}
                                {(di === 0 || h.aplicaMontaje) ? (
                                  <HourPicker label="Hora de montaje" noLabel={di > 0} value={h.montaje} field={`montaje-${fecha}`} onSave={(_f, v) => guardarHorarioDia(fecha, di, "montaje", v)} />
                                ) : (
                                  <p className="text-[11px] text-gray-600 italic">Sin montaje este día</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (<>
                    <HourPicker label="Hora inicio del evento" value={proyecto.horaInicioEvento} field="horaInicioEvento" onSave={guardarCampo} />
                    <HourPicker label="Hora fin del evento" value={proyecto.horaFinEvento} field="horaFinEvento" onSave={guardarCampo} />
                  </>)}
                </div>

                {/* ── Subsección 2: Información del venue ── */}
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold whitespace-nowrap">Información del venue</p>
                  <div className="flex-1 h-px bg-[#1e1e1e]" />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5">
                  <div className="col-span-2">
                    <Campo label="Dirección del venue" value={proyecto.direccionVenue} field="direccionVenue" onSave={guardarCampo} />
                  </div>
                  <div className="col-span-2">
                    <Campo label="Link de Google Maps" value={proyecto.linkMaps} field="linkMaps" onSave={guardarCampo} />
                  </div>
                  <div className="col-span-2">
                    <Campo label="Indicaciones de acceso" value={proyecto.indicacionesAcceso} field="indicacionesAcceso" type="textarea" onSave={guardarCampo} />
                  </div>
                </div>

                {/* ── Subsección 3: Logística de montaje ── */}
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold whitespace-nowrap">Logística de montaje</p>
                  <div className="flex-1 h-px bg-[#1e1e1e]" />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {/* ── Toggle: montaje como día adicional ── */}
                  <label className="col-span-2 flex items-start gap-2 cursor-pointer rounded-lg border border-[#1e1e1e] bg-[#141414] p-3">
                    <input
                      type="checkbox"
                      checked={proyecto.montajeDiaAparte ?? false}
                      onChange={e => guardarBool("montajeDiaAparte", e.target.checked)}
                      className="accent-[#B3985B] w-3.5 h-3.5 mt-0.5"
                    />
                    <span className="text-xs text-gray-300">
                      El montaje es un <b>día adicional</b> (día previo al evento)
                      <span className="block text-[11px] text-gray-600 mt-0.5">
                        Actívalo solo si el montaje se hace un día antes. Si el montaje es el mismo día del evento, déjalo desactivado y no contará como día extra.
                      </span>
                    </span>
                  </label>
                  {/* ── Fecha de montaje (solo si es día aparte) ── */}
                  {proyecto.montajeDiaAparte && (
                    <>
                      <Campo label="Fecha de montaje" value={proyecto.fechaMontaje?.toString().substring(0, 10) ?? null} field="fechaMontaje" type="date" onSave={guardarCampo} />
                      <div className="col-span-1" />
                    </>
                  )}
                  {/* ── Llamado en bodega (fecha + hora) ── */}
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 block mb-1">Llamado en bodega</label>
                    <div className="flex gap-2">
                      {/* Date part */}
                      <input
                        type="date"
                        defaultValue={proyecto.llamadoBodega ? proyecto.llamadoBodega.substring(0, 10) : ''}
                        onBlur={e => {
                          const fechaPart = e.target.value;
                          const horaPart = proyecto.llamadoBodega
                            ? proyecto.llamadoBodega.substring(11, 16)
                            : '08:00';
                          if (fechaPart) {
                            // Guardar la hora de pared literal como UTC para que
                            // no se desplace al leerla (substring UTC) ni en PDFs.
                            guardarCampo('llamadoBodega', `${fechaPart}T${horaPart}:00.000Z`);
                          } else {
                            guardarCampo('llamadoBodega', '');
                          }
                        }}
                        className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                      />
                      {/* Time part */}
                      <TimePicker
                        value={proyecto.llamadoBodega ? proyecto.llamadoBodega.substring(11, 16) : ''}
                        onChange={v => {
                          const fechaPart = proyecto.llamadoBodega
                            ? proyecto.llamadoBodega.substring(0, 10)
                            : (proyecto.fechaMontaje?.toString().substring(0, 10) ?? new Date().toISOString().substring(0, 10));
                          // Hora de pared literal como UTC (ver nota arriba).
                          guardarCampo('llamadoBodega', `${fechaPart}T${v}:00.000Z`);
                        }}
                      />
                    </div>
                  </div>
                  {/* ── Lugar de llamado ── */}
                  <div className="col-span-2">
                    <Campo label="Lugar de llamado" value={proyecto.lugarLlamado} field="lugarLlamado" onSave={guardarCampo} />
                  </div>
                  {/* ── Secuencia del día de montaje ── */}
                  <HourPicker label="Hora salida bodega" value={proyecto.horaSalidaBodega} field="horaSalidaBodega" onSave={guardarCampo} />
                  <HourPicker label="Llegada al venue" value={proyecto.horaMontaje} field="horaMontaje" onSave={guardarCampo} />
                  <HourPicker label="Inicio de montaje" value={proyecto.horaInicioMontaje} field="horaInicioMontaje" onSave={guardarCampo} />
                  <Campo label="Duración montaje (hrs)" value={proyecto.duracionMontajeHrs?.toString() ?? null} field="duracionMontajeHrs" type="number" onSave={guardarCampo} />
                </div>

                {/* ── Subsección 4: Logística de desmontaje ── */}
                <div className="flex items-center gap-3 mb-3 mt-5">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold whitespace-nowrap">Logística de desmontaje</p>
                  <div className="flex-1 h-px bg-[#1e1e1e]" />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {/* ── Toggle: desmontaje como día adicional ── */}
                  <label className="col-span-2 flex items-start gap-2 cursor-pointer rounded-lg border border-[#1e1e1e] bg-[#141414] p-3">
                    <input
                      type="checkbox"
                      checked={proyecto.desmontajeDiaAparte ?? false}
                      onChange={e => guardarBool("desmontajeDiaAparte", e.target.checked)}
                      className="accent-[#B3985B] w-3.5 h-3.5 mt-0.5"
                    />
                    <span className="text-xs text-gray-300">
                      El desmontaje es un <b>día adicional</b> (día posterior al evento)
                      <span className="block text-[11px] text-gray-600 mt-0.5">
                        Actívalo solo si el desmontaje se hace un día después. Si el desmontaje es el mismo día que termina el evento, déjalo desactivado y no contará como día extra.
                      </span>
                    </span>
                  </label>
                  {/* ── Fecha de desmontaje (solo si es día aparte) ── */}
                  {proyecto.desmontajeDiaAparte && (
                    <>
                      <Campo label="Fecha de desmontaje" value={proyecto.fechaDesmontaje?.toString().substring(0, 10) ?? null} field="fechaDesmontaje" type="date" onSave={guardarCampo} />
                      <div className="col-span-1" />
                    </>
                  )}
                  {/* ── Secuencia del desmontaje ── */}
                  <HourPicker label="Inicio de desmontaje" value={proyecto.horaDesmontaje} field="horaDesmontaje" onSave={guardarCampo} />
                  <Campo label="Duración desmontaje (hrs)" value={proyecto.duracionDesmontajeHrs?.toString() ?? null} field="duracionDesmontajeHrs" type="number" onSave={guardarCampo} />
                </div>
              </>)}

              {/* Campos para RENTA (sin subsecciones) */}
              {esRenta && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="col-span-2">
                    <Campo label="Lugar del evento" value={proyecto.lugarEvento} field="lugarEvento" onSave={guardarCampo} />
                  </div>
                </div>
              )}

            </div>

            {/* Notas */}
            <div className="ms-card p-5 space-y-3">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Notas del proyecto</p>
            {/* Notas del descubrimiento */}
            {(() => {
              let notasDesc: string | null = null;
              try {
                if (esRenta) {
                  const d = JSON.parse(proyecto.trato?.ideasReferencias ?? "{}");
                  notasDesc = d?.notas ?? null;
                } else {
                  notasDesc = (proyecto.trato as { notas?: string | null } | null)?.notas ?? null;
                }
              } catch { /* ignore */ }
              return notasDesc ? (
                <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Del descubrimiento</p>
                  <p className="text-gray-400 text-xs whitespace-pre-wrap">{notasDesc}</p>
                </div>
              ) : null;
            })()}
            {/* Notas internas editables */}
            <div className="space-y-1">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Notas internas del proyecto</p>
              <Campo
                label="Notas internas"
                noLabel
                value={proyecto.comentariosFinales}
                field="comentariosFinales"
                type="textarea"
                onSave={guardarCampo}
              />
            </div>
            {/* Notas para el técnico (Brief Técnico) */}
            {(proyecto.tipoServicio === 'PRODUCCION_TECNICA' || proyecto.tipoServicio === 'RENTA') && (
              <div className="space-y-1">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Notas para el equipo técnico</p>
                <Campo
                  label="Notas para el técnico"
                  noLabel
                  value={proyecto.notasBriefTecnico}
                  field="notasBriefTecnico"
                  type="textarea"
                  onSave={guardarCampo}
                />
              </div>
            )}
          </div>

          </div>
        );
      })()}
          </div>
        )}

        {/* ──── OPERACION tab ──── */}
        {activeTab === 'operacion' && (
          <div id="section-operacion" className="scroll-mt-14">
      {(() => {
        // Campos mínimos requeridos para habilitar invitaciones a técnicos y proveedores
        const fichaCamposFaltantes: string[] = [];
        if (!esRenta && !proyecto.horaInicioEvento) fichaCamposFaltantes.push("hora inicio del evento");
        if (!esRenta && !proyecto.horaFinEvento) fichaCamposFaltantes.push("hora fin del evento");
        if (!proyecto.lugarEvento) fichaCamposFaltantes.push("lugar del evento");
        const fichaCompleta = fichaCamposFaltantes.length === 0;
        const fichaTooltip = fichaCompleta
          ? ""
          : `Completa la ficha técnica antes de invitar: falta ${fichaCamposFaltantes.join(", ")}.`;
        return (
        <div className="space-y-4">
          {!fichaCompleta && (
            <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <AlertTriangle strokeWidth={1.75} className="w-4 h-4 shrink-0 text-yellow-400" />
              <p className="text-yellow-400/80 text-xs">
                <span className="font-semibold text-yellow-400">Ficha incompleta — </span>
                para enviar invitaciones a técnicos y proveedores necesitas llenar: <span className="font-medium">{fichaCamposFaltantes.join(", ")}</span>.
              </p>
            </div>
          )}




          {/* ── Traslados (solo producción) ── */}
          {!esRenta && <div className="ms-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Traslados</p>
              {savingTransporte && <p className="text-xs text-gray-600">Guardando...</p>}
            </div>
            <div className="space-y-3">
              {transporteSlots.map((slot, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-600 font-semibold">Vehículo {i + 1}</p>
                    {transporteSlots.length > 1 && (
                      <button onClick={() => { const n = transporteSlots.filter((_, idx) => idx !== i); setTransporteSlots(n); guardarTransportes(n); }}
                        className="text-[10px] text-red-500/60 hover:text-red-400 transition-colors">Quitar</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Vehículo</label>
                      <VehiculoIdSelector
                        value={slot.vehiculoId}
                        onChange={v => { const n = transporteSlots.map((s, idx) => idx === i ? { ...s, vehiculoId: v } : s); setTransporteSlots(n); guardarTransportes(n); }}
                        vehiculos={vehiculos}
                        onAddVehiculo={v => setVehiculos(prev => [...prev, v].sort((a, b) => a.nombre.localeCompare(b.nombre)))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Chofer</label>
                      <input
                        list={`chofer-list-${i}`}
                        value={slot.choferId}
                        onChange={e => { const n = transporteSlots.map((s, idx) => idx === i ? { ...s, choferId: e.target.value } : s); setTransporteSlots(n); }}
                        onBlur={() => guardarTransportes(transporteSlots)}
                        placeholder="Nombre o seleccionar..."
                        autoComplete="off"
                        className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                      />
                      <datalist id={`chofer-list-${i}`}>
                        {tecnicos.map(t => <option key={t.id} value={t.nombre} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Notas</label>
                      <input value={slot.comentarios} onChange={e => { const n = transporteSlots.map((s, idx) => idx === i ? { ...s, comentarios: e.target.value } : s); setTransporteSlots(n); }} onBlur={() => guardarTransportes(transporteSlots)}
                        placeholder="Instrucciones, destino, etc."
                        className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => { const n = [...transporteSlots, { vehiculoId: "", choferId: "", horaSalida: "", comentarios: "" }]; setTransporteSlots(n); }}
                className="text-xs text-[#B3985B] border border-[#B3985B]/30 hover:border-[#B3985B] px-3 py-1.5 rounded-lg transition-colors">
                + Agregar vehículo
              </button>
            </div>
          </div>}

          {/* ── Equipo cotizado (solo RENTA) ── */}
          {esRenta && proyecto.cotizacion && (() => {
            const equipoLineas = proyecto.cotizacion.lineas.filter(l =>
              ["EQUIPO_PROPIO", "EQUIPO_EXTERNO", "PAQUETE", "OTRO"].includes(l.tipo)
            );
            const TIPO_LABELS: Record<string, string> = {
              EQUIPO_PROPIO:  "Propio",
              EQUIPO_EXTERNO: "Externo",
              PAQUETE:        "Paquete",
              OTRO:           "Otro",
            };
            return (
              <div className="ms-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Equipo cotizado</p>
                  <a
                    href={`/cotizaciones/${proyecto.cotizacion.id}`}
                    className="text-[10px] text-[#B3985B]/60 hover:text-[#B3985B] transition-colors"
                    target="_blank" rel="noreferrer"
                  >
                    {proyecto.cotizacion.numeroCotizacion} → ver cotización
                  </a>
                </div>
                {equipoLineas.length === 0 ? (
                  <p className="text-gray-600 text-xs italic">Sin equipos en la cotización.</p>
                ) : (
                  <div className="space-y-1">
                    {equipoLineas.map(l => (
                      <div key={l.id} className="flex items-start gap-3 py-1.5 border-b border-[#1a1a1a] last:border-0">
                        <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                          {TIPO_LABELS[l.tipo] ?? l.tipo}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs">
                            {l.marca ? <span className="text-gray-400">{l.marca} </span> : null}
                            {l.descripcion}
                          </p>
                          {l.notas && <p className="text-gray-600 text-[10px] italic mt-0.5">{l.notas}</p>}
                        </div>
                        <span className="text-gray-400 text-xs font-mono shrink-0">x{l.cantidad}</span>
                      </div>
                    ))}
                  </div>
                )}
                {proyecto.cotizacion.observaciones && (
                  <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Observaciones de cotización</p>
                    <p className="text-gray-400 text-xs whitespace-pre-wrap">{proyecto.cotizacion.observaciones}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Logística de renta (editable) ── */}
          {esRenta && (() => {
            // Leer datos: primero logisticaRenta del proyecto, si no del trato
            let rentaData: Record<string, string> = {};
            try {
              if (proyecto.logisticaRenta) {
                rentaData = JSON.parse(proyecto.logisticaRenta);
              } else if (proyecto.trato?.ideasReferencias) {
                const d = JSON.parse(proyecto.trato.ideasReferencias);
                if (d && typeof d === "object" && (d.nivelServicio || d.modalidadServicio || d.fechaEntrega)) rentaData = d;
              }
            } catch { /* vacío */ }

            // Guarda un campo específico dentro del JSON de logisticaRenta
            function saveRentaField(field: string, value: string) {
              const updated = { ...rentaData, [field]: value };
              guardarCampo("logisticaRenta", JSON.stringify(updated));
            }

            const inputCls = "w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#B3985B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors";
            const labelCls = "text-gray-500 text-xs mb-1 block";

            return (
              <div className="bg-[#111] border border-[#B3985B]/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Logística de renta</p>
                  <span className="text-[10px] text-[#B3985B]/50 bg-[#B3985B]/8 px-2 py-0.5 rounded-full">RENTA DE EQUIPO</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  {/* Nivel de servicio */}
                  <div>
                    <label className={labelCls}>Nivel de servicio</label>
                    <select
                      value={rentaData.nivelServicio ?? rentaData.modalidadServicio ?? ""}
                      onChange={e => saveRentaField("nivelServicio", e.target.value)}
                      className={inputCls + " cursor-pointer"}
                    >
                      <option value="">— Sin especificar —</option>
                      <option value="SOLO_RENTA">Solo renta (cliente recoge)</option>
                      <option value="RENTA_ENTREGA">Renta + entrega</option>
                      <option value="RENTA_MONTAJE">Renta + montaje</option>
                      <option value="RENTA_FULL">Renta + operación</option>
                    </select>
                  </div>

                  {/* Modalidad de entrega */}
                  <div>
                    <label className={labelCls}>Modalidad de entrega</label>
                    <select
                      value={rentaData.entrega ?? rentaData.modalidadEntrega ?? ""}
                      onChange={e => saveRentaField("entrega", e.target.value)}
                      className={inputCls + " cursor-pointer"}
                    >
                      <option value="">— Sin especificar —</option>
                      <option value="RECOGE_BODEGA">Recoge en bodega (Querétaro)</option>
                      <option value="ENTREGA_BODEGA">Llevamos a su bodega</option>
                      <option value="ENTREGA_VENUE">Llevamos al venue</option>
                    </select>
                  </div>

                  {/* Fecha y hora de entrega */}
                  <div>
                    <label className={labelCls}>Fecha de entrega</label>
                    <input
                      type="date"
                      value={rentaData.fechaEntrega ?? ""}
                      onChange={e => saveRentaField("fechaEntrega", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Hora de entrega</label>
                    <TimePicker
                      value={rentaData.horaEntrega ?? ""}
                      onChange={v => saveRentaField("horaEntrega", v)}
                      placeholder="Por definir"
                    />
                  </div>

                  {/* Fecha y hora de devolución / recolección */}
                  <div>
                    <label className={labelCls}>Fecha de devolución / recolección</label>
                    <input
                      type="date"
                      value={rentaData.fechaDevolucion ?? ""}
                      onChange={e => saveRentaField("fechaDevolucion", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Hora de devolución / recolección</label>
                    <TimePicker
                      value={rentaData.horaDevolucion ?? ""}
                      onChange={v => saveRentaField("horaDevolucion", v)}
                      placeholder="Por definir"
                    />
                  </div>

                  {/* Dirección de entrega */}
                  <div className="col-span-2">
                    <label className={labelCls}>Dirección de entrega</label>
                    <Campo
                      label=""
                      noLabel
                      value={rentaData.direccionEntrega ?? null}
                      field="logisticaRenta"
                      onSave={(_, v) => saveRentaField("direccionEntrega", v)}
                    />
                  </div>

                  {/* Quién entrega (nuestro personal) */}
                  <div>
                    <label className={labelCls}>Quién entrega (Mainstage)</label>
                    <Campo
                      label=""
                      noLabel
                      value={rentaData.quienEntrega ?? null}
                      field="logisticaRenta"
                      onSave={(_, v) => saveRentaField("quienEntrega", v)}
                    />
                  </div>
                  {/* Quién recibe (cliente) */}
                  <div>
                    <label className={labelCls}>Quién recibe (cliente)</label>
                    <Campo
                      label=""
                      noLabel
                      value={rentaData.quienRecibe ?? null}
                      field="logisticaRenta"
                      onSave={(_, v) => saveRentaField("quienRecibe", v)}
                    />
                  </div>

                  {/* ¿Cliente tiene técnico propio? */}
                  <div>
                    <label className={labelCls}>¿Cliente tiene técnico propio?</label>
                    <select
                      value={rentaData.tecnicoPropio ?? ""}
                      onChange={e => saveRentaField("tecnicoPropio", e.target.value)}
                      className={inputCls + " cursor-pointer"}
                    >
                      <option value="">— Sin especificar —</option>
                      <option value="SI">Sí</option>
                      <option value="NO">No</option>
                    </select>
                  </div>

                  {/* Notas adicionales de logística */}
                  <div className="col-span-2">
                    <label className={labelCls}>Notas adicionales de logística</label>
                    <Campo
                      label=""
                      noLabel
                      multiline
                      value={rentaData.notasLogistica ?? rentaData.descripcionEquipos ?? null}
                      field="logisticaRenta"
                      onSave={(_, v) => saveRentaField("notasLogistica", v)}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Recolección de equipo (solo RENTA) ── */}
          {proyecto.recoleccionStatus !== "NO_APLICA" && (() => {
            let rentaData: Record<string, string> = {};
            try {
              const src = proyecto.logisticaRenta || proyecto.trato?.ideasReferencias;
              if (src) rentaData = JSON.parse(src);
            } catch { /* ignore */ }
            const stConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
              PENDIENTE:  { label: "Pendiente",   bg: "bg-yellow-900/20", text: "text-yellow-400",  border: "border-yellow-800/30" },
              EN_CAMINO:  { label: "En camino",   bg: "bg-blue-900/20",   text: "text-blue-400",    border: "border-blue-800/30" },
              COMPLETADA: { label: "Recolectado", bg: "bg-green-900/20",  text: "text-green-400",   border: "border-green-800/30" },
            };
            const sc = stConfig[proyecto.recoleccionStatus] ?? stConfig.PENDIENTE;
            return (
              <div className={`border rounded-xl p-5 ${sc.border} ${sc.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#B3985B" }}>
                    <Package strokeWidth={1.75} className="w-3.5 h-3.5" /> Recolección de equipo
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.text} bg-black/20`}>{sc.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  {rentaData.fechaDevolucion && (
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Fecha de devolución/recolección</p>
                      <p className={`font-medium ${sc.text}`}>
                        {new Date(rentaData.fechaDevolucion + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
                        {rentaData.horaDevolucion && <span className="text-gray-400 ml-1 font-normal">· {rentaData.horaDevolucion}</span>}
                      </p>
                    </div>
                  )}
                  {rentaData.direccionEntrega && (
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Dirección</p>
                      <p className="text-gray-300 text-xs">{rentaData.direccionEntrega}</p>
                    </div>
                  )}
                  {proyecto.recoleccionStatus === "COMPLETADA" && proyecto.recoleccionFechaReal && (
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Recolectado el</p>
                      <p className="text-green-400 text-sm font-medium">
                        {(() => { const iso = typeof proyecto.recoleccionFechaReal === "string" ? proyecto.recoleccionFechaReal : (proyecto.recoleccionFechaReal as Date).toISOString(); const [y, m, d] = iso.substring(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }); })()}
                      </p>
                    </div>
                  )}
                  {proyecto.recoleccionNotas && (
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs mb-0.5">Observaciones</p>
                      <p className="text-gray-300 text-xs italic">"{proyecto.recoleccionNotas}"</p>
                    </div>
                  )}
                </div>
                {proyecto.recoleccionStatus !== "COMPLETADA" && (
                  <div className="flex gap-2">
                    {proyecto.recoleccionStatus !== "EN_CAMINO" && (
                      <button onClick={async () => {
                        await fetch(`/api/proyectos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recoleccionStatus: "EN_CAMINO" }) });
                        setProyecto(prev => prev ? { ...prev, recoleccionStatus: "EN_CAMINO" } : prev);
                      }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/30 border border-blue-800/40 text-blue-400 text-xs font-semibold hover:bg-blue-900/50 transition-colors">
                        <Truck strokeWidth={1.75} className="w-3.5 h-3.5" /> Salió a recolectar
                      </button>
                    )}
                    <button onClick={async () => {
                      const notas = window.prompt("Observaciones al recibir (daños, faltantes, estado) — opcional:");
                      if (notas === null) return;
                      const body = { recoleccionStatus: "COMPLETADA", recoleccionNotas: notas || null, recoleccionFechaReal: new Date().toISOString() };
                      await fetch(`/api/proyectos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                      setProyecto(prev => prev ? { ...prev, recoleccionStatus: "COMPLETADA", recoleccionNotas: notas || null } : prev);
                    }} className="px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-800/40 text-green-400 text-xs font-semibold hover:bg-green-900/50 transition-colors">
                      ✓ Equipo en bodega
                    </button>
                    <a href="/inventario/recolecciones" className="px-3 py-1.5 rounded-lg bg-[#111] border border-[#333] text-gray-400 text-xs hover:text-white transition-colors ml-auto">
                      Ver todas las recolecciones →
                    </a>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Personal del evento (sección unificada) — solo producción técnica; en renta se usa "Quién entrega/recibe" ── */}
          {!esRenta && (
          <div className="ms-table-wrapper">
            {/* ── Cabecera ── */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Personal técnico del evento</p>
                <div className="flex items-center gap-2">
                  {proyecto.personal.length > 0 && (
                    <button
                      onClick={() => setShowBroadcast(v => !v)}
                      className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium border border-green-800/40 rounded-lg px-2 py-1"
                      title="Enviar detalles del evento a todo el equipo por WhatsApp"
                    >
                      <span className="inline-flex items-center gap-1.5"><Radio strokeWidth={1.75} className="w-3.5 h-3.5" /> Broadcast WA</span>
                    </button>
                  )}
                  <button onClick={() => setShowAddPersonal(v => !v)}
                    className="text-sm text-[#B3985B] hover:text-white transition-colors font-medium">
                    {showAddPersonal ? "− Cancelar" : "+ Nueva jornada"}
                  </button>
                </div>
              </div>

              {/* Broadcast panel */}
              {showBroadcast && (() => {
                const fecha = new Date(proyecto.fechaEvento.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
                const lugar = proyecto.lugarEvento ?? "lugar a confirmar";
                const hora = proyecto.horaInicioEvento ? ` a las ${proyecto.horaInicioEvento}` : "";
                const msg = `Hola, te confirmamos tu participación en el evento *${proyecto.nombre}* del cliente *${proyecto.cliente.nombre}*.\n\n📅 Fecha: ${fecha}${hora}\n📍 Lugar: ${lugar}\n\nPor favor confirma tu asistencia. ¡Gracias!`;
                return (
                  <div className="mt-3 bg-[#0a0a0a] border border-green-800/30 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-green-400 font-medium">Mensaje a enviar:</p>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans">{msg}</pre>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {proyecto.personal.filter(p => p.tecnico?.celular).map(p => {
                        const tel = (p.tecnico!.celular!).replace(/\D/g, "");
                        return (
                          <a key={p.id}
                            href={`https://wa.me/52${tel}?text=${encodeURIComponent(msg)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-green-800/30 hover:bg-green-700/40 border border-green-700/40 text-green-300 text-xs px-2 py-1 rounded-lg transition-colors"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.12 1.524 5.855L0 24l6.29-1.498A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.899 0-3.68-.5-5.225-1.378l-.375-.224-3.884.925.98-3.774-.244-.389A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                            {p.tecnico!.nombre.split(" ")[0]}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ── PASO 1: Crear jornada ── */}
              {showAddPersonal && (
                <div className="mt-4 space-y-3">
                  <div className="bg-[#0d0d0d] border border-[#B3985B]/30 rounded-xl p-4">
                    <p className="text-[10px] text-[#B3985B] font-bold uppercase tracking-wider mb-3">Paso 1 — Define la jornada</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Tipo de participación *</label>
                        <Combobox
                          value={selParticipacion}
                          onChange={v => setSelParticipacion(v)}
                          options={[{ value: "OPERACION", label: "⚡ Operación (día del evento)" }, { value: "MONTAJE", label: "🔧 Montaje (día previo)" }, { value: "DESMONTAJE", label: "📦 Desmontaje" }, { value: "TRANSPORTE", label: "🚛 Transporte" }, { value: "OTRO", label: "✦ Otro" }]}
                          className="w-full bg-[#1a1a1a] border border-[#B3985B]/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Día de la jornada *</label>
                        <input
                          type="date"
                          value={selFechaJornada}
                          onChange={e => setSelFechaJornada(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-[#B3985B]/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                        />
                        {!selFechaJornada && proyecto.fechaEvento && (
                          <button
                            type="button"
                            onClick={() => setSelFechaJornada(proyecto.fechaEvento!.substring(0, 10))}
                            className="mt-1 text-[10px] text-gray-500 hover:text-[#B3985B] transition-colors"
                          >
                            Usar fecha del evento ({new Date(proyecto.fechaEvento!.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── PASO 2: Técnico dentro de la jornada ── */}
                  {selParticipacion && selFechaJornada && (
                    <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">Paso 2 — Asigna el técnico</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-xs text-gray-500 block mb-1">Rol técnico</label>
                          <Combobox
                            value={selRol}
                            onChange={v => setSelRol(v)}
                            options={[{ value: "", label: "— Rol —" }, ...roles.map(r => ({ value: r.id, label: r.nombre }))]}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                          />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-xs text-gray-500 block mb-1">Técnico</label>
                          <Combobox
                            value={selTecnico}
                            onChange={v => {
                              if (v === "__nuevo__") { setShowNuevoTecnico(true); setSelTecnico(""); }
                              else { setSelTecnico(v); setShowNuevoTecnico(false); }
                            }}
                            options={[
                              { value: "", label: "— Sin asignar —" },
                              { value: "__nuevo__", label: "＋ Nuevo técnico..." },
                              ...(() => {
                                const selRolNombre = selRol ? roles.find(r => r.id === selRol)?.nombre : null;
                                const coinciden = tecnicos.filter(t => !selRolNombre || t.rol?.nombre === selRolNombre);
                                const resto     = tecnicos.filter(t => selRolNombre && t.rol?.nombre !== selRolNombre);
                                return [...coinciden, ...resto].map(t => ({ value: t.id, label: `${t.nombre} · ${t.rol?.nombre ?? 'Sin rol'} · ${t.nivel}` }));
                              })()
                            ]}
                            className={`w-full bg-[#1a1a1a] border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] ${disponibilidad && !disponibilidad.disponible ? "border-red-500/60" : "border-[#333]"}`}
                          />
                          {disponibilidad && !disponibilidad.disponible && (
                            <p className="inline-flex items-center gap-1 text-red-400 text-xs mt-1"><AlertTriangle strokeWidth={1.75} className="w-3 h-3 shrink-0" /> Conflicto en {disponibilidad.conflictos.map(c => c.nombre).join(", ")}</p>
                          )}
                          {disponibilidad?.disponible && selTecnico && (
                            <p className="text-green-500 text-xs mt-1">✓ Disponible</p>
                          )}
                          {/* Mini-form nuevo técnico */}
                          {showNuevoTecnico && (
                            <div className="mt-2 p-3 bg-[#0d0d0d] border border-[#B3985B]/40 rounded-lg space-y-2">
                              <p className="text-[#B3985B] text-xs font-semibold mb-2">Registrar nuevo técnico</p>
                              <input value={nuevoTecNombre} onChange={e => setNuevoTecNombre(e.target.value)}
                                placeholder="Nombre completo *"
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                              <input value={nuevoTecCelular} onChange={e => setNuevoTecCelular(e.target.value)}
                                placeholder="Celular (WhatsApp)"
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                              <div className="flex gap-2">
                                <Combobox value={nuevoTecRolId} onChange={v => setNuevoTecRolId(v)}
                                  options={[{ value: "", label: "— Rol (opcional) —" }, ...roles.map(r => ({ value: r.id, label: r.nombre }))]}
                                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                                <Combobox value={nuevoTecNivel} onChange={v => setNuevoTecNivel(v)}
                                  options={[{ value: "AAA", label: "AAA" }, { value: "AA", label: "AA" }, { value: "A", label: "A" }]}
                                  className="w-20 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button onClick={crearTecnicoInline} disabled={creandoTecnico || !nuevoTecNombre.trim()}
                                  className="flex-1 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold py-1.5 rounded-lg transition-colors">
                                  {creandoTecnico ? "Guardando..." : "Guardar y seleccionar"}
                                </button>
                                <button onClick={() => { setShowNuevoTecnico(false); setNuevoTecNombre(""); setNuevoTecCelular(""); setNuevoTecRolId(""); setNuevoTecNivel("A"); }}
                                  className="px-3 text-gray-500 hover:text-white text-xs transition-colors">Cancelar</button>
                              </div>
                            </div>
                          )}
                        </div>
                        {(!selRol || roles.find(r => r.id === selRol)?.tipoPago === "POR_JORNADA") && (
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Jornada</label>
                            <Combobox
                              value={selJornada}
                              onChange={v => setSelJornada(v)}
                              options={[{ value: "CORTA", label: "0–8 hrs" }, { value: "MEDIA", label: "8–12 hrs" }, { value: "LARGA", label: "12+ hrs" }]}
                              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                            />
                          </div>
                        )}
                        {selRol && roles.find(r => r.id === selRol)?.tipoPago !== "POR_JORNADA" && (
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Nivel</label>
                            <Combobox
                              value={selNivel}
                              onChange={v => setSelNivel(v)}
                              options={[{ value: "AAA", label: "AAA" }, { value: "AA", label: "AA" }, { value: "A", label: "A" }]}
                              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Tarifa acordada ($)</label>
                          <input type="number" value={selTarifa} onChange={e => setSelTarifa(e.target.value)}
                            placeholder="0"
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500 block mb-1">Rol en el evento</label>
                          <input value={selRolEnEvento} onChange={e => setSelRolEnEvento(e.target.value)}
                            placeholder="Ej: Operador de audio, Iluminación, Montaje..."
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                        </div>
                        <div className="col-span-2 md:col-span-3">
                          <label className="text-xs text-gray-500 block mb-1">Descripción · ¿qué hará en el evento?</label>
                          <textarea
                            value={selResp}
                            onChange={e => setSelResp(e.target.value)}
                            placeholder="Describe las actividades y responsabilidades..."
                            rows={2}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                          />
                        </div>
                        <div className="col-span-2 md:col-span-3 flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={selEsAdicional} onChange={e => setSelEsAdicional(e.target.checked)}
                              className="accent-[#B3985B] w-4 h-4" />
                            <span className="text-xs text-gray-400">Técnico adicional <span className="text-gray-600">(fuera de lo cotizado · marcador interno, no aparece en PDFs)</span></span>
                          </label>
                          <button onClick={agregarPersonal} disabled={addingPersonal || (!selTecnico && !selRol)}
                            className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-6 py-2 rounded-lg transition-colors">
                            {addingPersonal ? "Agregando..." : "Agregar técnico a esta jornada"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Sugerencias de cotización — siempre visibles ── */}
            {proyecto.cotizacion && (() => {
              const lineas = (proyecto.cotizacion.lineas ?? []).filter(l => l.tipo === "OPERACION_TECNICA");
              if (lineas.length === 0) return null;
              const presupuestoCotizado = lineas.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0);
              const presupuestoAsignado = proyecto.personal.reduce((s, p) => s + (p.tarifaAcordada ?? 0), 0);
              const restante = presupuestoCotizado - presupuestoAsignado;
              return (
                <div className="border-t border-[#1a1a1a] px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#B3985B] font-bold uppercase tracking-wider">Roles cotizados (referencia)</span>
                      <span className="text-[10px] text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded">{lineas.length} rol{lineas.length !== 1 ? "es" : ""}</span>
                    </div>
                    {proyecto._canViewTecnicoCosts && (
                      <div className={`text-xs font-semibold ${restante >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {restante >= 0 ? `${fmt(restante)} disponible` : `${fmt(Math.abs(restante))} sobre presupuesto`}
                      </div>
                    )}
                  </div>
                  <div className="divide-y divide-[#1a1a1a]">
                    {lineas.map(linea => {
                      const disciplina = linea.rolTecnico?.disciplina ?? null;
                      const sugKey = linea.id;
                      const abierto = sugerenciasAbiertas === sugKey;
                      const sugerencias = sugerenciasCache[sugKey] ?? [];
                      const cargando = sugerenciasLoading === sugKey;
                      return (
                      <div key={linea.id} className="py-2">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-white font-medium truncate">{linea.rolTecnico?.nombre ?? linea.descripcion}</span>
                              {disciplina && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ color: DISCIPLINA_COLORS[disciplina] ?? "#888", backgroundColor: `${DISCIPLINA_COLORS[disciplina] ?? "#888"}1a` }}>
                                  {DISCIPLINA_LABELS[disciplina] ?? disciplina}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {linea.nivel && <span className="text-[10px] text-gray-500">{linea.nivel}</span>}
                              {linea.jornada && <span className="text-[10px] text-gray-500">· {linea.jornada === "CORTA" ? "0–8h" : linea.jornada === "MEDIA" ? "8–12h" : "12+h"}</span>}
                              {linea.descripcion && linea.rolTecnico && <span className="text-[10px] text-gray-600 truncate">· {linea.descripcion}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs text-[#B3985B] font-semibold">{fmt(linea.precioUnitario)}<span className="text-gray-600 font-normal"> × {linea.cantidad}</span></div>
                          </div>
                          {disciplina ? (
                            <button
                              onClick={() => cargarSugerencias(disciplina, linea.nivel, sugKey)}
                              className={`shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors border ${abierto ? "bg-[#B3985B]/20 border-[#B3985B]/40 text-[#B3985B]" : "bg-[#1e1e1e] hover:bg-[#2a2a2a] border-[#2a2a2a] text-gray-300"}`}
                            >
                              {abierto ? "Ocultar" : "Sugerir técnicos"}
                            </button>
                          ) : (
                            <a
                              href="/catalogo/roles"
                              title="Este rol no tiene disciplina asignada. Asígnala en el catálogo para ver sugerencias de técnicos."
                              className="shrink-0 text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-[#333] text-gray-600 hover:text-[#B3985B] hover:border-[#B3985B]/40 transition-colors"
                            >
                              Asignar disciplina
                            </a>
                          )}
                          <button
                            onClick={() => agregarDesdeLinea(linea)}
                            disabled={agregandoLinea === linea.id}
                            className="shrink-0 text-xs bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {agregandoLinea === linea.id ? "..." : `+ ${linea.cantidad} slot${linea.cantidad !== 1 ? "s" : ""}`}
                          </button>
                        </div>
                        {/* Panel de técnicos sugeridos por disciplina */}
                        {abierto && (
                          <div className="mt-2 ml-1 pl-3 border-l-2 border-[#B3985B]/30 space-y-1">
                            {cargando ? (
                              <div className="text-[11px] text-gray-500 py-2">Cargando técnicos…</div>
                            ) : sugerencias.length === 0 ? (
                              <div className="text-[11px] text-gray-600 py-2">Sin técnicos de esta disciplina en la base.</div>
                            ) : (
                              sugerencias.map(s => (
                                <div key={s.id} className="flex items-center gap-2 py-1">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-xs truncate ${s.yaAsignado ? "text-gray-500 line-through" : "text-white"}`}>{s.nombre}</span>
                                      {s.nivel && <span className="text-[9px] text-gray-500 shrink-0">{s.nivel}</span>}
                                      {s.prioridad > 0 && <span className="text-[9px] text-[#B3985B] shrink-0">{"★".repeat(s.prioridad)}</span>}
                                      {s.ocupado && <span className="text-[9px] text-red-400 bg-red-900/20 px-1 rounded shrink-0">ocupado ese día</span>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {s.rol?.nombre && <span className="text-[9px] text-gray-600">{s.rol.nombre}</span>}
                                      {s.zonaHabitual && <span className="text-[9px] text-gray-600">· {s.zonaHabitual}</span>}
                                      {s.evaluacionPromedio != null && <span className="text-[9px] text-gray-600">· {s.evaluacionPromedio.toFixed(1)}★</span>}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => agregarTecnicoSugerido(s, linea)}
                                    disabled={s.yaAsignado || agregandoSugerido === s.id}
                                    className="shrink-0 text-[11px] bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-30 disabled:cursor-not-allowed text-black font-semibold px-2.5 py-1 rounded transition-colors"
                                  >
                                    {s.yaAsignado ? "Agregado" : agregandoSugerido === s.id ? "…" : "+ Agregar"}
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}


            {/* Lista personal: fecha → tipo de participación */}
            {proyecto.personal.length === 0 ? (
              <div className="border-t border-[#1a1a1a] py-6 text-center text-gray-600 text-sm">
                Sin personal asignado aún
              </div>
            ) : (() => {
              // ── Badges por tipo de participación ─────────────────────────────
              const PART_BADGE: Record<string, { label: string; cls: string }> = {
                OPERACION:  { label: "Operación",  cls: "bg-blue-900/30 text-blue-300 border-blue-800/40" },
                MONTAJE:    { label: "Montaje",    cls: "bg-amber-900/30 text-amber-300 border-amber-800/40" },
                DESMONTAJE: { label: "Desmontaje", cls: "bg-orange-900/30 text-orange-300 border-orange-800/40" },
                TRANSPORTE: { label: "Transporte", cls: "bg-purple-900/30 text-purple-300 border-purple-800/40" },
                OTRO:       { label: "Otro",       cls: "bg-gray-800/60 text-gray-400 border-gray-700/40" },
              };

              // ── Fechas base del proyecto (yyyy-mm-dd) ─────────────────────────
              const fechaEvento  = proyecto.fechaEvento  ? proyecto.fechaEvento.substring(0, 10)  : null;
              const fechaMontaje = proyecto.fechaMontaje ? proyecto.fechaMontaje.substring(0, 10) : null;

              // Fecha efectiva: MONTAJE→fechaMontaje, resto→fechaEvento
              // fechaJornada manual tiene prioridad si está seteado
              const fechaEf = (p: Personal): string =>
                p.fechaJornada
                  ? p.fechaJornada
                  : (p.participacion === "MONTAJE" && fechaMontaje)
                    ? fechaMontaje
                    : (fechaEvento ?? "__sin_fecha__");

              // ── Agrupar por fecha ─────────────────────────────────────────────
              const grupoMap = new Map<string, Personal[]>();
              for (const p of proyecto.personal) {
                const key = fechaEf(p);
                if (!grupoMap.has(key)) grupoMap.set(key, []);
                grupoMap.get(key)!.push(p);
              }
              const fechasOrdenadas = [...grupoMap.keys()].sort((a, b) => {
                if (a === "__sin_fecha__") return 1;
                if (b === "__sin_fecha__") return -1;
                return a.localeCompare(b);
              });

              const fmtFecha = (s: string) => {
                try {
                  return new Date(s + "T12:00:00Z").toLocaleDateString("es-MX", {
                    timeZone: "UTC", weekday: "long", day: "numeric", month: "long",
                  });
                } catch { return s; }
              };

              // ── Render de tarjeta de técnico ──────────────────────────────────
              const renderCard = (p: Personal) => {
                const badge = PART_BADGE[p.participacion ?? "OPERACION"] ?? PART_BADGE.OPERACION;
                return (
                  <div key={p.id} className={`p-4 border-b border-[#0d0d0d] last:border-0 border-l-2 ${p.confirmado ? "border-l-green-700/60" : "border-l-[#1e1e1e]"}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        {!p.tecnico ? (
                          asignandoId === p.id ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Combobox
                                  value=""
                                  placeholder="Buscar técnico..."
                                  onChange={v => {
                                    if (v === "__nuevo__") { setCrearParaSlotId(p.id); }
                                    else if (v) { asignarTecnico(p.id, v); }
                                  }}
                                  options={[
                                    { value: "__nuevo__", label: "＋ Registrar nuevo técnico" },
                                    ...tecnicos.map(t => ({ value: t.id, label: `${t.nombre} · ${t.rol?.nombre ?? "Sin rol"} · ${t.nivel}` })),
                                  ]}
                                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-white text-sm focus:outline-none"
                                />
                                <button onClick={() => { setAsignandoId(null); setCrearParaSlotId(null); setSelAsignar(""); setNuevoTecNombre(""); setNuevoTecCelular(""); setNuevoTecRolId(""); setNuevoTecNivel("A"); }}
                                  className="text-gray-500 hover:text-white text-xs shrink-0">Cancelar</button>
                              </div>
                              {crearParaSlotId === p.id && (
                                <div className="p-3 bg-[#0d0d0d] border border-[#333] rounded-lg space-y-2">
                                  <p className="text-gray-300 text-xs font-semibold">Registrar nuevo técnico</p>
                                  <input value={nuevoTecNombre} onChange={e => setNuevoTecNombre(e.target.value)} placeholder="Nombre completo *" autoFocus className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#555]" />
                                  <input value={nuevoTecCelular} onChange={e => setNuevoTecCelular(e.target.value)} placeholder="Celular (WhatsApp)" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#555]" />
                                  <div className="flex gap-2">
                                    <Combobox value={nuevoTecRolId} onChange={v => setNuevoTecRolId(v)} options={[{ value: "", label: "— Rol (opcional) —" }, ...roles.map(r => ({ value: r.id, label: r.nombre }))]} className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                                    <Combobox value={nuevoTecNivel} onChange={v => setNuevoTecNivel(v)} options={[{ value: "AAA", label: "AAA" }, { value: "AA", label: "AA" }, { value: "A", label: "A" }]} className="w-20 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <button onClick={crearTecnicoYAsignar} disabled={creandoTecnico || !nuevoTecNombre.trim()} className="flex-1 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors">{creandoTecnico ? "Guardando..." : "Guardar y asignar"}</button>
                                    <button onClick={() => { setCrearParaSlotId(null); setNuevoTecNombre(""); setNuevoTecCelular(""); setNuevoTecRolId(""); setNuevoTecNivel("A"); }} className="px-3 text-gray-500 hover:text-white text-xs transition-colors">Cancelar</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-gray-500 text-sm">Pendiente de asignar</span>
                              {p.nivel && <span className={`text-xs font-semibold ${NIVEL_COLORS[p.nivel] ?? "text-gray-400"}`}>{p.nivel}</span>}
                              <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${badge.cls}`}>{badge.label}</span>
                              {p.necesitaRevision && <span className="px-1.5 py-0.5 rounded border border-amber-700/50 bg-amber-900/20 text-amber-300 text-[10px] font-medium" title="Este rol se quitó o cambió en la cotización — revísalo (no se borró automáticamente)">Revisar</span>}
                              <button onClick={() => { setAsignandoId(p.id); setSelAsignar(""); setCrearParaSlotId(null); }} className="text-xs text-gray-400 hover:text-white border border-[#333] hover:border-[#555] px-2 py-0.5 rounded transition-colors">Asignar</button>
                            </div>
                          )
                        ) : (
                          asignandoId === p.id ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Combobox
                                  value={p.tecnico.id}
                                  placeholder="Cambiar técnico..."
                                  onChange={v => {
                                    if (v === "__nuevo__") { setCrearParaSlotId(p.id); }
                                    else if (v) { asignarTecnico(p.id, v); setAsignandoId(null); }
                                  }}
                                  options={[
                                    { value: "__nuevo__", label: "＋ Registrar nuevo técnico" },
                                    ...tecnicos.map(t => ({ value: t.id, label: `${t.nombre} · ${t.rol?.nombre ?? "Sin rol"} · ${t.nivel}` })),
                                  ]}
                                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-white text-sm focus:outline-none"
                                />
                                <button onClick={() => { setAsignandoId(null); setCrearParaSlotId(null); }} className="text-gray-500 hover:text-white text-xs shrink-0">Cancelar</button>
                              </div>
                              {crearParaSlotId === p.id && (
                                <div className="p-3 bg-[#0d0d0d] border border-[#333] rounded-lg space-y-2">
                                  <p className="text-gray-300 text-xs font-semibold">Registrar nuevo técnico</p>
                                  <input value={nuevoTecNombre} onChange={e => setNuevoTecNombre(e.target.value)} placeholder="Nombre completo *" autoFocus className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#555]" />
                                  <input value={nuevoTecCelular} onChange={e => setNuevoTecCelular(e.target.value)} placeholder="Celular (WhatsApp)" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#555]" />
                                  <div className="flex gap-2">
                                    <Combobox value={nuevoTecRolId} onChange={v => setNuevoTecRolId(v)} options={[{ value: "", label: "— Rol (opcional) —" }, ...roles.map(r => ({ value: r.id, label: r.nombre }))]} className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                                    <Combobox value={nuevoTecNivel} onChange={v => setNuevoTecNivel(v)} options={[{ value: "AAA", label: "AAA" }, { value: "AA", label: "AA" }, { value: "A", label: "A" }]} className="w-20 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <button onClick={crearTecnicoYAsignar} disabled={creandoTecnico || !nuevoTecNombre.trim()} className="flex-1 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors">{creandoTecnico ? "Guardando..." : "Guardar y asignar"}</button>
                                    <button onClick={() => { setCrearParaSlotId(null); setNuevoTecNombre(""); setNuevoTecCelular(""); setNuevoTecRolId(""); setNuevoTecNivel("A"); }} className="px-3 text-gray-500 hover:text-white text-xs transition-colors">Cancelar</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white text-sm font-medium">{p.tecnico.nombre}</p>
                              <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${badge.cls}`}>{badge.label}</span>
                              {p.esAdicional && <span className="px-1.5 py-0.5 rounded border border-fuchsia-800/40 bg-fuchsia-900/20 text-fuchsia-300 text-[10px] font-medium" title="Agregado fuera de lo cotizado — solo visible internamente">Adicional</span>}
                              {p.necesitaRevision && <span className="px-1.5 py-0.5 rounded border border-amber-700/50 bg-amber-900/20 text-amber-300 text-[10px] font-medium" title="Este rol se quitó o cambió en la cotización — revísalo (no se borró automáticamente)">Revisar</span>}
                            </div>
                          )
                        )}
                        <p className="text-gray-500 text-xs mt-0.5">
                          {p.rolTecnico?.nombre ?? p.tecnico?.rol?.nombre ?? "Sin rol"}
                          {p.rolEnEvento ? ` · ${p.rolEnEvento}` : ""}
                          {p.jornada ? ` · ${p.jornada}` : ""}
                        </p>
                        {p.responsabilidad && <p className="text-gray-400 text-xs mt-1 leading-relaxed">{p.responsabilidad}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {asignandoId !== p.id && (
                          <button onClick={() => { abrirEditPersonal(p); setAsignandoId(null); }}
                            className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${editandoPersonalId === p.id ? "border-[#B3985B]/60 text-[#B3985B]" : "border-transparent text-gray-600 hover:text-gray-300 hover:border-[#333]"}`}>
                            {editandoPersonalId === p.id ? "Editando" : "Editar"}
                          </button>
                        )}
                        <button onClick={async () => { const ok = await confirm({ message: "¿Eliminar este técnico del proyecto? Se borrarán también las cuentas por pagar pendientes vinculadas.", confirmText: "Eliminar", danger: true }); if (ok) eliminarPersonal(p.id); }} title="Eliminar slot" className="text-gray-600 hover:text-red-400 text-base leading-none transition-colors px-1">×</button>
                      </div>
                    </div>

                    {/* Formulario edición */}
                    {editandoPersonalId === p.id && (
                      <div className="mt-3 p-3 bg-[#0d0d0d] border border-[#B3985B]/20 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Técnico</label>
                            <Combobox value={editPersonalForm.tecnicoId} onChange={v => { if (v === "__nuevo__") { setShowNuevoTecnico(true); } else setEditPersonalForm(prev => ({ ...prev, tecnicoId: v })); }} options={[{ value: "", label: "— Sin asignar —" }, { value: "__nuevo__", label: "＋ Nuevo técnico..." }, ...tecnicos.map(t => ({ value: t.id, label: `${t.nombre} · ${t.rol?.nombre ?? "Sin rol"}` }))]} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#555]" /></div>
                          <div><label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Rol técnico</label>
                            <Combobox value={editPersonalForm.rolTecnicoId} onChange={v => setEditPersonalForm(prev => ({ ...prev, rolTecnicoId: v }))} options={[{ value: "", label: "— Sin rol —" }, ...roles.map(r => ({ value: r.id, label: r.nombre }))]} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#555]" /></div>
                          <div><label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Participación</label>
                            <Combobox value={editPersonalForm.participacion} onChange={v => setEditPersonalForm(prev => ({ ...prev, participacion: v }))} options={[{ value: "OPERACION", label: "Operación" }, { value: "MONTAJE", label: "Montaje" }, { value: "DESMONTAJE", label: "Desmontaje" }, { value: "TRANSPORTE", label: "Transporte" }, { value: "OTRO", label: "Otro" }]} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#555]" /></div>
                          <div><label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Jornada</label>
                            <Combobox value={editPersonalForm.jornada} onChange={v => setEditPersonalForm(prev => ({ ...prev, jornada: v }))} options={[{ value: "CORTA", label: "0–8 hrs" }, { value: "MEDIA", label: "8–12 hrs" }, { value: "LARGA", label: "12+ hrs" }]} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#555]" /></div>
                          <div><label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Nivel</label>
                            <Combobox value={editPersonalForm.nivel} onChange={v => setEditPersonalForm(prev => ({ ...prev, nivel: v }))} options={[{ value: "AAA", label: "AAA" }, { value: "AA", label: "AA" }, { value: "A", label: "A" }]} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#555]" /></div>
                          {proyecto._canViewTecnicoCosts && (
                          <div><label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Tarifa acordada ($)</label>
                            <input type="number" value={editPersonalForm.tarifa} onChange={e => setEditPersonalForm(prev => ({ ...prev, tarifa: e.target.value }))} placeholder="0" className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#555]" /></div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Fecha de jornada (override)</label>
                            <input type="date" value={editPersonalForm.fechaJornada} onChange={e => setEditPersonalForm(prev => ({ ...prev, fechaJornada: e.target.value }))} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" /></div>
                          <div><label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Rol en el evento</label>
                            <input value={editPersonalForm.rolEnEvento} onChange={e => setEditPersonalForm(prev => ({ ...prev, rolEnEvento: e.target.value }))} placeholder="Ej: Operador FOH, Iluminación..." className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#555]" /></div>
                        </div>
                        <div><label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Descripción · ¿qué hará en el evento?</label>
                          <textarea value={editPersonalForm.responsabilidad} onChange={e => setEditPersonalForm(prev => ({ ...prev, responsabilidad: e.target.value }))} placeholder="Describe las actividades..." rows={2} className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#555] resize-none" /></div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => guardarEditPersonal(p.id)} disabled={savingPersonal} className="flex-1 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold py-1.5 rounded-lg transition-colors">{savingPersonal ? "Guardando..." : "Guardar cambios"}</button>
                          <button onClick={() => setEditandoPersonalId(null)} className="px-4 text-gray-500 hover:text-white text-xs transition-colors">Cancelar</button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {proyecto._canViewTecnicoCosts && (
                        <span className={`text-sm font-medium ${p.tarifaAcordada != null ? "text-gray-300" : "text-gray-600 italic"}`}>{p.tarifaAcordada != null ? fmt(p.tarifaAcordada) : "Sin tarifa"}</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.estadoPago === "PAGADO" ? "bg-green-900/40 text-green-400" : "bg-[#1a1a1a] text-gray-500 border border-[#2a2a2a]"}`}>{p.estadoPago === "PAGADO" ? "Pagado" : "Pendiente"}</span>
                      {p.confirmRespuesta && <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.confirmRespuesta === "CONFIRMADO" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"}`}>{p.confirmRespuesta === "CONFIRMADO" ? "✓ Confirmó" : "✗ Rechazó"}</span>}
                      <button onClick={() => toggleConfirmar(p.id, p.confirmado)} className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${p.confirmado ? "border-green-700 text-green-400 hover:bg-red-900/20 hover:text-red-400 hover:border-red-700" : "border-[#333] text-gray-500 hover:border-green-700 hover:text-green-400"}`}>{p.confirmado ? "✓ Confirmado" : "Confirmar"}</button>
                      {p.tecnico && (
                        <button disabled={!fichaCompleta} title={fichaCompleta ? "Enviar invitación por WhatsApp" : fichaTooltip}
                          onClick={async () => {
                            const res = await fetch(`/api/proyectos/${id}/personal/${p.id}/invitar`, { method: "POST" });
                            const d = await res.json();
                            if (d.whatsappUrl) { window.open(d.whatsappUrl, "_blank"); await load(); }
                            else if (d.token) { const url = `${window.location.origin}/confirmar/tecnico/${d.token}`; await navigator.clipboard.writeText(url).catch(() => {}); toast.info("Sin número registrado. Link copiado al portapapeles."); await load(); }
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${fichaCompleta ? "border-green-800/50 text-green-500 hover:bg-green-900/20 hover:border-green-600 cursor-pointer" : "border-[#333] text-gray-600 cursor-not-allowed opacity-50"}`}>
                          <Smartphone strokeWidth={1.75} className="w-3 h-3" /> Invitar
                        </button>
                      )}
                      {p.tecnico && (
                        <a href={`/api/proyectos/${proyecto.id}/personal/${p.id}/carta`} target="_blank" rel="noopener noreferrer" title="Descargar carta responsiva freelance" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#333] text-gray-500 hover:border-[#B3985B]/50 hover:text-[#B3985B] transition-colors"><FileText strokeWidth={1.75} className="w-3 h-3" /> Carta</a>
                      )}
                    </div>
                  </div>
                );
              };

              // ── Render: bloques por fecha ──────────────────────────────────────
              return (
                <>
                  {fechasOrdenadas.map(fecha => {
                    const grupo = grupoMap.get(fecha)!;
                    const esSinFecha = fecha === "__sin_fecha__";
                    const sinAsignar = grupo.filter(p => !p.tecnico).length;
                    return (
                      <div key={fecha} className="border-t border-[#1a1a1a]">
                        <div className={`px-4 py-3 flex items-center justify-between ${esSinFecha ? "bg-[#0d0d0d]" : "bg-[#0a0a0a]"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-1 h-5 rounded-full ${esSinFecha ? "bg-[#333]" : "bg-[#B3985B]"}`} />
                            <div>
                              <p className={`text-sm font-bold capitalize ${esSinFecha ? "text-gray-500" : "text-white"}`}>
                                {esSinFecha ? "Sin fecha asignada" : fmtFecha(fecha)}
                              </p>
                              <p className="text-[11px] text-gray-600 mt-0.5">
                                {grupo.length} técnico{grupo.length !== 1 ? "s" : ""}
                                {sinAsignar > 0 && ` · ${sinAsignar} pendiente${sinAsignar !== 1 ? "s" : ""} de asignar`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {grupo.some(p => !p.confirmado && p.tecnico) && (
                              <button onClick={() => confirmarGrupo(grupo)} className="text-xs text-gray-500 hover:text-green-400 border border-[#2a2a2a] hover:border-green-800/60 px-2 py-0.5 rounded transition-colors">Confirmar todos</button>
                            )}
                            <button
                              onClick={() => {
                                if (quickAddFechaId === fecha) {
                                  setQuickAddFechaId(null);
                                } else {
                                  setQuickAddFechaId(fecha);
                                  setQuickAddPart("OPERACION");
                                  setQuickAddFecha(esSinFecha ? "" : fecha);
                                }
                              }}
                              className={`text-xs border px-2 py-0.5 rounded transition-colors ${quickAddFechaId === fecha ? "border-[#B3985B]/50 text-[#B3985B]" : "border-[#2a2a2a] text-gray-500 hover:text-white hover:border-[#444]"}`}>
                              {quickAddFechaId === fecha ? "− Cancelar" : "+ Agregar"}
                            </button>
                          </div>
                        </div>
                        {/* Mini-form rápido */}
                        {quickAddFechaId === fecha && (
                          <div className="mx-4 mb-3 mt-2 p-3 bg-[#0d0d0d] border border-[#B3985B]/20 rounded-lg">
                            <p className="text-[10px] text-[#B3985B] uppercase tracking-widest font-semibold mb-3">Nuevo slot de técnico</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Tipo de participación</label>
                                <select
                                  value={quickAddPart}
                                  onChange={e => setQuickAddPart(e.target.value)}
                                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                                >
                                  <option value="OPERACION">⚡ Operación (día del evento)</option>
                                  <option value="MONTAJE">🔧 Montaje (día previo)</option>
                                  <option value="DESMONTAJE">📦 Desmontaje</option>
                                  <option value="TRANSPORTE">🚛 Transporte</option>
                                  <option value="OTRO">✦ Otro</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Día de la jornada</label>
                                <input
                                  type="date"
                                  value={quickAddFecha}
                                  onChange={e => setQuickAddFecha(e.target.value)}
                                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                                />
                                {!quickAddFecha && proyecto.fechaEvento && (
                                  <button type="button" onClick={() => setQuickAddFecha(proyecto.fechaEvento!.substring(0, 10))} className="mt-1 text-[10px] text-gray-600 hover:text-[#B3985B] transition-colors">
                                    Usar fecha del evento
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                onClick={async () => {
                                  await agregarSlotVacio(quickAddPart, quickAddFecha || null);
                                  setQuickAddFechaId(null);
                                }}
                                className="flex-1 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold py-1.5 rounded-lg transition-colors"
                              >
                                Crear slot
                              </button>
                              <button onClick={() => setQuickAddFechaId(null)} className="px-3 text-gray-500 hover:text-white text-xs transition-colors">Cancelar</button>
                            </div>
                          </div>
                        )}
                        {/* Lista plana de técnicos */}
                        {grupo.map(p => renderCard(p))}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
          )}

          {/* ── Proveedores y Subrentas ── */}
          <div className="space-y-3">
            <div className="ms-stat-card">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Proveedores y subrentas</p>
                <button onClick={() => setShowAddProveedor(v => !v)}
                  className="text-sm text-[#B3985B] hover:text-white transition-colors font-medium">
                  {showAddProveedor ? "− Cancelar" : "+ Agregar proveedor"}
                </button>
              </div>
              {showAddProveedor && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="col-span-3 md:col-span-1">
                    <label className="text-xs text-gray-500 block mb-1">Nombre del proveedor *</label>
                    <input value={provNombre} onChange={e => setProvNombre(e.target.value)}
                      placeholder="Proveedor o empresa..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <label className="text-xs text-gray-500 block mb-1">Equipo / Servicio</label>
                    <input value={provServicio} onChange={e => setProvServicio(e.target.value)}
                      placeholder="Qué equipo o servicio provee..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <label className="text-xs text-gray-500 block mb-1">Teléfono</label>
                    <input value={provTelefono} onChange={e => setProvTelefono(e.target.value)}
                      placeholder="Teléfono de contacto"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div className="col-span-3 flex gap-2">
                    <button
                      disabled={addingProveedor || !provNombre.trim()}
                      onClick={async () => {
                        if (!provNombre.trim()) return;
                        setAddingProveedor(true);
                        const res = await fetch(`/api/proyectos/${id}/proveedores-evento`, {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ nombreProveedor: provNombre, servicioEquipo: provServicio || null, telefonoProveedor: provTelefono || null }),
                        });
                        if (res.ok) {
                          const d = await res.json();
                          setProyecto(prev => prev ? { ...prev, proveedoresEvento: [...(prev.proveedoresEvento ?? []), d.proveedor] } : prev);
                          setProvNombre(""); setProvServicio(""); setProvTelefono(""); setShowAddProveedor(false);
                        } else { toast.error("Error al agregar proveedor"); }
                        setAddingProveedor(false);
                      }}
                      className="flex-1 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                      {addingProveedor ? "Guardando..." : "Agregar"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de proveedores */}
            {(proyecto.proveedoresEvento ?? []).length > 0 && (
              <div className="ms-table-wrapper">
                <div className="divide-y divide-[#1a1a1a]">
                  {(proyecto.proveedoresEvento ?? []).map(prov => (
                    <div key={prov.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {editandoProveedorId === prov.id ? (
                            <div className="grid grid-cols-3 gap-2">
                              <input value={editProvForm.nombre} onChange={e => setEditProvForm(p => ({ ...p, nombre: e.target.value }))}
                                placeholder="Nombre *"
                                className="bg-[#0d0d0d] border border-[#B3985B]/40 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                              <input value={editProvForm.servicio} onChange={e => setEditProvForm(p => ({ ...p, servicio: e.target.value }))}
                                placeholder="Equipo/Servicio"
                                className="bg-[#0d0d0d] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                              <input value={editProvForm.telefono} onChange={e => setEditProvForm(p => ({ ...p, telefono: e.target.value }))}
                                placeholder="Teléfono"
                                className="bg-[#0d0d0d] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                              <div className="col-span-3 flex gap-2">
                                <button onClick={async () => {
                                  const res = await fetch(`/api/proyectos/${id}/proveedores-evento/${prov.id}`, {
                                    method: "PATCH", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ nombreProveedor: editProvForm.nombre, servicioEquipo: editProvForm.servicio || null, telefonoProveedor: editProvForm.telefono || null }),
                                  });
                                  if (res.ok) {
                                    const d = await res.json();
                                    setProyecto(prev => prev ? { ...prev, proveedoresEvento: (prev.proveedoresEvento ?? []).map(p => p.id === prov.id ? d.proveedor : p) } : prev);
                                    setEditandoProveedorId(null);
                                  }
                                }}
                                  className="flex-1 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold py-1.5 rounded-lg transition-colors">Guardar</button>
                                <button onClick={() => setEditandoProveedorId(null)}
                                  className="px-3 text-gray-500 hover:text-white text-xs transition-colors">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-white text-sm font-medium">{prov.nombreProveedor}</p>
                              <p className="text-gray-500 text-xs mt-0.5">
                                {[prov.servicioEquipo, prov.telefonoProveedor].filter(Boolean).join(" · ")}
                              </p>
                            </>
                          )}
                        </div>
                        {editandoProveedorId !== prov.id && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditandoProveedorId(prov.id); setEditProvForm({ nombre: prov.nombreProveedor, servicio: prov.servicioEquipo ?? "", telefono: prov.telefonoProveedor ?? "" }); }}
                              className="text-xs px-1.5 py-0.5 rounded border border-transparent text-gray-600 hover:text-gray-300 hover:border-[#333] transition-colors">Editar</button>
                            <button
                              onClick={async () => {
                                const ok = await confirm({ message: "¿Eliminar este proveedor del proyecto?", confirmText: "Eliminar", danger: true });
                                if (!ok) return;
                                const res = await fetch(`/api/proyectos/${id}/proveedores-evento/${prov.id}`, { method: "DELETE" });
                                if (res.ok) setProyecto(prev => prev ? { ...prev, proveedoresEvento: (prev.proveedoresEvento ?? []).filter(p => p.id !== prov.id) } : prev);
                              }}
                              className="text-gray-600 hover:text-red-400 text-base leading-none transition-colors px-1">×</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Cronograma (tabla) — solo producción técnica / dirección técnica ── */}
          {!esRenta && (
          <div className="ms-card p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">
                {esMultidia ? "Cronología por día" : "Cronología general del evento"}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {savingCrono && <span className="text-xs text-gray-600">Guardando...</span>}
                {!esMultidia && (
                  <>
                    <button onClick={() => cargarPlantillaCrono()}
                      className="text-xs text-gray-400 hover:text-white border border-[#333] hover:border-[#555] px-3 py-1 rounded-lg transition-colors">
                      Plantilla base
                    </button>
                    <button onClick={() => addCronoRow()}
                      className="text-xs text-[#B3985B] hover:text-white border border-[#B3985B]/40 hover:border-[#B3985B] px-3 py-1 rounded-lg transition-colors">
                      + Agregar fila
                    </button>
                  </>
                )}
                {cronoRows.length > 0 && (
                  <button onClick={() => guardarCronograma(cronoRows)} disabled={savingCrono}
                    className="text-xs bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold px-3 py-1 rounded-lg transition-colors">
                    Guardar
                  </button>
                )}
              </div>
            </div>
            {esMultidia ? (
              <div className="space-y-6">
                {diasDelEvento.map((dia, di) => {
                  const entries = cronoRows
                    .map((row, i) => ({ row, i }))
                    .filter(({ row }) => (row.dia && diasDelEvento.includes(row.dia)) ? row.dia === dia : di === 0);
                  return (
                    <div key={dia}>
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2 border-b border-[#222] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-semibold text-black bg-[#B3985B] rounded px-1.5 py-0.5 shrink-0">D{di + 1}</span>
                          <span className="text-white text-sm capitalize font-medium">{fmtDiaCorto(dia)}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => cargarPlantillaCrono(dia)}
                            className="text-xs text-gray-400 hover:text-white border border-[#333] hover:border-[#555] px-3 py-1 rounded-lg transition-colors">
                            Plantilla base
                          </button>
                          <button onClick={() => addCronoRow(dia)}
                            className="text-xs text-[#B3985B] hover:text-white border border-[#B3985B]/40 hover:border-[#B3985B] px-3 py-1 rounded-lg transition-colors">
                            + Agregar fila
                          </button>
                        </div>
                      </div>
                      {entries.length === 0 ? (
                        <p className="text-gray-600 text-xs py-3">Sin actividades para este día. Usa <span className="text-gray-400">Plantilla base</span> o <span className="text-gray-400">+ Agregar fila</span>.</p>
                      ) : (
                        renderCronoTabla(entries)
                      )}
                    </div>
                  );
                })}
              </div>
            ) : cronoRows.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-gray-600 text-sm">Sin actividades aún.</p>
                <p className="text-gray-700 text-xs">Presiona <span className="text-gray-400 font-medium">Plantilla base</span> para cargar las 17 actividades estándar del evento.</p>
              </div>
            ) : (
              renderCronoTabla(cronoRows.map((row, i) => ({ row, i })))
            )}
          </div>
          )}

          {/* ── Documentos operativos ── */}
          {!esRenta && <div className="ms-card p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Documentos operativos</p>
              <label className={`cursor-pointer text-xs border px-3 py-1.5 rounded-lg transition-colors ${
                uploadingTipo ? "border-gray-700 text-gray-600" : "border-[#B3985B]/40 text-[#B3985B] hover:border-[#B3985B] hover:text-white"
              }`}>
                {uploadingTipo ? "Subiendo..." : "+ Subir archivo"}
                <input type="file" className="hidden" disabled={!!uploadingTipo}
                  onChange={e => subirArchivo(e, "OTRO")} />
              </label>
            </div>
            <p className="text-[11px] text-gray-600 mb-4">
              {esRenta
                ? "Contrato de renta · Fotos de entrega · Rider técnico · Otros"
                : "Render · Plot / patch · Input list · Rider · Ficha técnica · Itinerario · Otros"}
            </p>
            {proyecto.archivos.length === 0 ? (
              <p className="text-gray-700 text-xs italic">Sin archivos cargados</p>
            ) : (
              <div className="space-y-1">
                {proyecto.archivos.map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">
                    <a href={a.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline truncate flex-1 mr-3">
                      {a.nombre}
                    </a>
                    <button onClick={() => eliminarArchivo(a.id)}
                      className="text-gray-600 hover:text-red-400 text-sm leading-none transition-colors shrink-0">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>}

          {/* ── Directorio Mainstage Pro — al final de operación ── */}
          {!esRenta && (() => {
            const DIRECTORIO = [
              { nombre: "Mauricio Hernández",  cargo: "Dirección General",              tel: "4461432565", desc: "Liderazgo estratégico, cierre de tratos y decisiones críticas" },
              { nombre: "Carlos Luna",          cargo: "Coordinador de Producción",      tel: "4428633023", desc: "Dirección técnica en campo, rider de carga y coordinación de equipo" },
              { nombre: "Daniel Guarneros",     cargo: "Atención a Clientes y Ventas",   tel: "4428078646", desc: "Contacto con cliente, seguimiento comercial y ventas" },
              { nombre: "Emiliano Pérez",       cargo: "Coordinador Administrativo",     tel: "4428635398", desc: "Finanzas, CxC, CxP, nómina y administración general" },
              { nombre: "Sebastián Pérez",      cargo: "Community Manager",              tel: "4428159359", desc: "Contenido, redes sociales y levantamientos foto/video" },
              { nombre: "Rodrigo Vera",         cargo: "Auxiliar de Producción",         tel: "4428633175", desc: "Apoyo en montaje, bodega y logística de equipo" },
              { nombre: "Zaid Bautista",        cargo: "Auxiliar de Producción",         tel: "4428634195", desc: "Apoyo en montaje, bodega y logística de equipo" },
            ];
            return (
              <div className="ms-table-wrapper">
                <button onClick={() => setDirectorioOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-[#1a1a1a] transition-colors">
                  <p className="text-xs text-white font-semibold uppercase tracking-wider">Directorio Mainstage Pro</p>
                  <svg className={`w-4 h-4 text-gray-600 transition-transform ${directorioOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
                {directorioOpen && (
                  <div className="border-t border-[#1a1a1a] divide-y divide-[#1a1a1a]">
                    {DIRECTORIO.map(p => (
                      <div key={p.nombre} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-white text-sm font-medium">{p.nombre}</p>
                          <p className="text-gray-400 text-xs">{p.cargo}</p>
                          <p className="text-gray-600 text-[11px] mt-0.5">{p.desc}</p>
                        </div>
                        <a href={`https://wa.me/52${p.tel}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-green-400 border border-green-800/40 hover:bg-green-900/20 px-2.5 py-1 rounded-lg transition-colors shrink-0">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.12 1.524 5.855L0 24l6.29-1.498A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.899 0-3.68-.5-5.225-1.378l-.375-.224-3.884.925.98-3.774-.244-.389A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                          {p.tel.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

        </div>
        );
      })()}

      {/* ── Equipos (dentro de Operación) ── */}
      {(() => {
        const equiposPropios  = proyecto.equipos.filter(e => e.tipo === "PROPIO");
        const equiposExternos = proyecto.equipos.filter(e => e.tipo === "EXTERNO");
        const camposFaltantesEq: string[] = [];
        if (!proyecto.horaInicioEvento) camposFaltantesEq.push("hora inicio del evento");
        if (!proyecto.horaFinEvento) camposFaltantesEq.push("hora fin del evento");
        if (!proyecto.lugarEvento) camposFaltantesEq.push("lugar del evento");
        const fichaCompletaEq = camposFaltantesEq.length === 0;
        const fichaTooltipEq = fichaCompletaEq ? "" : `Completa la ficha técnica antes de invitar: falta ${camposFaltantesEq.join(", ")}.`;

        return (
          <div className="space-y-4">
            {showAddEquipo && (
              <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-3">
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Agregar equipo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Equipo *</label>
                    <Combobox
                      value={selEquipoId}
                      onChange={v => setSelEquipoId(v)}
                      options={[{ value: "", label: "Seleccionar equipo..." }, ...equipoCatalogo.map(eq => ({ value: eq.id, label: `${eq.categoria.nombre} — ${eq.descripcion}${eq.marca ? ` (${eq.marca})` : ""}` }))]}
                      className={`w-full bg-[#0d0d0d] border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] ${dispEquipo && !dispEquipo.disponible ? "border-red-500/60" : "border-[#2a2a2a]"}`}
                    />
                    {dispEquipo && selEquipoTipo === "PROPIO" && selEquipoId && (
                      dispEquipo.disponible ? (
                        <p className="text-green-500 text-xs mt-1">✓ Disponible: {dispEquipo.cantidadDisponible} de {dispEquipo.cantidadTotal} unidades libres</p>
                      ) : (
                        <p className="inline-flex items-center gap-1 text-red-400 text-xs mt-1">
                          <AlertTriangle strokeWidth={1.75} className="w-3 h-3 shrink-0" /> Solo {dispEquipo.cantidadDisponible} disponibles de {dispEquipo.cantidadTotal} · comprometido en: {dispEquipo.conflictos.map(c => c.nombre).join(", ")}
                        </p>
                      )
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                    <Combobox
                      value={selEquipoTipo}
                      onChange={v => setSelEquipoTipo(v)}
                      options={[{ value: "PROPIO", label: "Propio" }, { value: "EXTERNO", label: "Externo (renta)" }]}
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Cantidad</label>
                    <input type="number" min="1" value={selEquipoCantidad} onChange={e => setSelEquipoCantidad(e.target.value)}
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Días</label>
                    <input type="number" min="1" value={selEquipoDias} onChange={e => setSelEquipoDias(e.target.value)}
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  {selEquipoTipo === "EXTERNO" && (
                    <>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Costo x día x unidad</label>
                        <input type="number" value={selEquipoCosto} onChange={e => setSelEquipoCosto(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Proveedor</label>
                        <Combobox
                          value={selEquipoProveedor}
                          onChange={v => setSelEquipoProveedor(v)}
                          options={[{ value: "", label: "Sin proveedor" }, ...proveedores.map(p => ({ value: p.id, label: p.nombre }))]}
                          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                        />
                      </div>
                    </>
                  )}
                </div>
                {proyecto.cotizacion && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={agregarACot} onChange={e => setAgregarACot(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#B3985B]" />
                    <span className="text-xs text-gray-400">
                      Agregar también a la cotización <span className="text-[#B3985B]">{proyecto.cotizacion.numeroCotizacion}</span>
                    </span>
                  </label>
                )}
                {selEquipoTipo === "EXTERNO" && selEquipoCosto && selEquipoProveedor && (
                  <p className="text-xs text-yellow-400">Se creará CxP: {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(selEquipoCosto) * (parseInt(selEquipoCantidad) || 1) * (parseInt(selEquipoDias) || 1))} al agregar</p>
                )}
                <div className="flex gap-3">
                  <button onClick={agregarEquipo} disabled={addingEquipo || !selEquipoId}
                    className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">
                    {addingEquipo ? "Agregando..." : "Agregar"}
                  </button>
                  <button onClick={() => setShowAddEquipo(false)} className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
                </div>
              </div>
            )}


            {/* Externos */}
            {equiposExternos.length > 0 && (
              <div className="ms-table-wrapper">
                <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Equipo externo / renta ({equiposExternos.length})</p>
                  <p className="text-xs text-yellow-400 font-semibold">
                    Total: {fmt(equiposExternos.reduce((s, e) => s + (e.costoExterno ?? 0) * e.cantidad * e.dias, 0))}
                  </p>
                </div>
                {equiposExternos.map(eq => (
                  <EquipoRow key={eq.id} eq={eq}
                    proyectoId={id}
                    fichaCompleta={fichaCompletaEq}
                    fichaTooltip={fichaTooltipEq}
                    onToggleConfirmado={toggleConfirmadoEquipo}
                    onEliminar={eliminarEquipo}
                    onRefresh={load}
                    onToastInfo={msg => toast.info(msg)}
                  />
                ))}
              </div>
            )}

            {proyecto.equipos.length === 0 && (
              <div className="ms-card py-12 text-center">
                <p className="text-gray-600 text-sm">Sin equipos asignados</p>
                <p className="text-gray-700 text-xs mt-1">Agrega equipo propio o externo para este proyecto</p>
              </div>
            )}
          </div>
        );
      })()}
          </div>
        )}

        {/* ──── EXTRAS tab ──── */}
        {activeTab === 'extras' && (
          <div id="section-extras" className="scroll-mt-14">
            {/* ── Equipos del proyecto ── */}
            <EquiposTab proyectoId={proyecto.id} />

      {(() => {
        const tipoEvento = (proyecto.tipoEvento || "").toUpperCase();
        const esMusical = tipoEvento.includes("MUSICAL") || tipoEvento.includes("CONCIERTO") || tipoEvento.includes("FESTIVAL");
        const esEmpresarial = tipoEvento.includes("EMPRESARIAL") || tipoEvento.includes("CORPORATIVO") || tipoEvento.includes("CONGRESO") || tipoEvento.includes("CONFERENCIA");
        const esSocial = !esMusical && !esEmpresarial;
        type DocsData = {
          soundcheck: { hora: string; artista: string; duracion: string; notas: string }[];
          programaEvento: { hora: string; actividad: string; responsable: string; notas: string }[];
          coordinacionProveedores: { proveedor: string; contacto: string; horario: string; notas: string }[];
        };

        const defaultDocs: DocsData = {
          soundcheck: [{ hora: "", artista: "", duracion: "", notas: "" }],
          programaEvento: [{ hora: "", actividad: "", responsable: "", notas: "" }],
          coordinacionProveedores: [{ proveedor: "", contacto: "", horario: "", notas: "" }],
        };

        let docs: DocsData;
        try {
          docs = proyecto.docsTecnicos ? { ...defaultDocs, ...JSON.parse(proyecto.docsTecnicos) } : defaultDocs;
        } catch { docs = defaultDocs; }

        const saveDocs = async (updated: DocsData) => {
          const res = await fetch(`/api/proyectos/${proyecto.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ docsTecnicos: JSON.stringify(updated) }),
          });
          if (res.ok) {
            const d = await res.json();
            setProyecto(prev => prev ? { ...prev, docsTecnicos: d.proyecto?.docsTecnicos ?? JSON.stringify(updated) } : prev);
          }
        };

        // ── Protocolo helpers ──────────────────────────���───────────────
        let salida: ProtocoloData;
        let entrada: ProtocoloData;
        try { salida = proyecto.protocoloSalida ? { ...defaultProtocolo, ...JSON.parse(proyecto.protocoloSalida) } : defaultProtocolo; } catch { salida = defaultProtocolo; }
        try { entrada = proyecto.protocoloEntrada ? { ...defaultProtocolo, ...JSON.parse(proyecto.protocoloEntrada) } : defaultProtocolo; } catch { entrada = defaultProtocolo; }
        const saveProtocolo = async (tipo: "salida" | "entrada", data: ProtocoloData) => {
          const field = tipo === "salida" ? "protocoloSalida" : "protocoloEntrada";
          const res = await fetch(`/api/proyectos/${proyecto.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: JSON.stringify(data) }) });
          if (res.ok) { const d = await res.json(); setProyecto(prev => prev ? { ...prev, [field]: d.proyecto?.[field] ?? JSON.stringify(data) } : prev); }
        };
        // ── Evaluación helpers ──────────────────────────────────────────
        const CRITERIOS: { key: keyof EvalData; label: string; desc: string }[] = esRenta ? [
          { key: "puntualidad", label: "Puntualidad en entrega", desc: "Equipo entregado en el horario y fecha acordados con el cliente" },
          { key: "usoEquipo", label: "Estado del equipo", desc: "Equipo regresado completo, sin daños y en buen estado" },
          { key: "comunicacionCliente", label: "Comunicación con cliente", desc: "Claridad en la coordinación, firma de responsiva y trato durante el proceso" },
          { key: "resolucionOperativa", label: "Resolución de imprevistos", desc: "Manejo de faltantes, cambios de última hora y situaciones no previstas" },
          { key: "resultadoGeneral", label: "Resultado general", desc: "Impresión global de la renta: ¿la repetiríamos en las mismas condiciones?" },
        ] : [
          { key: "planeacionPrevia", label: "Planeación previa", desc: "Preparación técnica, logística y coordinación antes del evento" },
          { key: "cumplimientoTecnico", label: "Cumplimiento técnico", desc: "Calidad del sonido, iluminación, video y operación en sitio" },
          { key: "puntualidad", label: "Puntualidad", desc: "Llegada, montaje y apertura en los tiempos acordados" },
          { key: "resolucionOperativa", label: "Resolución operativa", desc: "Manejo de imprevistos, problemas técnicos y decisiones en tiempo real" },
          { key: "resultadoGeneral", label: "Resultado general", desc: "Impresión global del proyecto como equipo" },
        ];
        const evalPromedio = evalLoaded && evaluacion.promedioCalculado != null
          ? evaluacion.promedioCalculado
          : CRITERIOS.map(c => evaluacion[c.key] as number).filter(v => v > 0).reduce((a, b, _, arr) => a + b / arr.length, 0) || null;
        function colorCalif(v: number) { return v === 0 ? "text-gray-600" : v >= 9 ? "text-green-400" : v >= 7 ? "text-[#B3985B]" : v >= 5 ? "text-yellow-400" : "text-red-400"; }
        function colorBg(v: number) { return v === 0 ? "bg-[#222]" : v >= 9 ? "bg-green-900/40 border-green-700/40" : v >= 7 ? "bg-[#B3985B]/10 border-[#B3985B]/30" : v >= 5 ? "bg-yellow-900/30 border-yellow-700/40" : "bg-red-900/30 border-red-700/40"; }

        // ── Accordion helpers ──────────────────────────────────────────
        const toggleDoc = (key: string) => setOpenDocs(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });

        // ── Notas de cotización por sección ──
        let cotNotasSecciones: Record<string, string> = {};
        try { cotNotasSecciones = proyecto.cotizacion?.notasSecciones ? JSON.parse(proyecto.cotizacion.notasSecciones) : {}; } catch { /* ignore */ }
        const cotObservaciones = proyecto.cotizacion?.observaciones ?? null;

        return (
          <div className="space-y-6">

            {/* ═══════ ZONA 0: NOTAS DE COTIZACIÓN (solo renta — en producción van inline en rider) ═══════ */}
            {esRenta && proyecto.cotizacion && (cotObservaciones || Object.keys(cotNotasSecciones).some(k => cotNotasSecciones[k]?.trim())) && (() => {
              const secciones = Object.entries(cotNotasSecciones).filter(([, v]) => v?.trim());
              return (
                <div className="bg-[#111] border border-[#B3985B]/20 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Notas de la cotización</p>
                    <span className="text-[10px] text-[#B3985B]/40 ml-auto">{proyecto.cotizacion!.numeroCotizacion}</span>
                  </div>
                  <div className="p-5 space-y-3">
                    {cotObservaciones && (
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Observaciones generales</p>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{cotObservaciones}</p>
                      </div>
                    )}
                    {secciones.length > 0 && (
                      <div className={cotObservaciones ? "border-t border-[#1a1a1a] pt-3" : ""}>
                        {cotObservaciones && <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Notas por sección</p>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {secciones.map(([cat, nota]) => (
                            <div key={cat} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2.5">
                              <p className="text-[10px] text-[#B3985B]/70 font-semibold uppercase tracking-wider mb-1">{cat}</p>
                              <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">{nota}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ═══════ ZONA 1: BASE — Rider · Checklist · Bitácora ═══════ */}
            <><SectionDivider label={esRenta ? "Rider de entrega" : "Rider & Checklist"} />

            {/* ══ RIDER DE CARGA ══ */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">Rider de carga</p>
                  <p className="text-gray-500 text-xs mt-0.5">Listado de equipos con accesorios y herramientas necesarias para montaje</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => previewPdf(`/api/proyectos/${id}/rider-pdf`, 'Rider de Carga', `rider-carga-${proyecto.numeroProyecto}.pdf`)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 border border-[#2a2a2a] hover:border-[#B3985B]/40 hover:text-[#B3985B] px-3 py-1.5 rounded-lg transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Vista previa
                  </button>
                  <a
                    href={`/api/proyectos/${id}/rider-pdf`}
                    download
                    className="flex items-center gap-1.5 text-xs text-[#B3985B] border border-[#B3985B]/30 hover:border-[#B3985B]/60 hover:bg-[#B3985B]/5 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Descargar rider
                  </a>
                </div>
              </div>

              {esRenta && (() => {
                let rd: Record<string, string> = {};
                try { if (proyecto.logisticaRenta) rd = JSON.parse(proyecto.logisticaRenta); } catch {}
                const modalidad = rd.entrega ?? rd.modalidadEntrega ?? "";
                const entregamos = modalidad === "ENTREGA_BODEGA" || modalidad === "ENTREGA_VENUE";
                const destino = modalidad === "ENTREGA_VENUE" ? "el venue del evento" : "la bodega del cliente";
                return (
                  <div className={`rounded-xl px-4 py-3 border ${entregamos ? "bg-[#B3985B]/5 border-[#B3985B]/30" : "bg-yellow-900/10 border-yellow-800/30"}`}>
                    <p className={`text-xs font-semibold ${entregamos ? "text-[#B3985B]" : "text-yellow-500"}`}>
                      {entregamos ? "Aplica el rider de carga" : "El rider de carga no aplica para este servicio"}
                    </p>
                    <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                      {entregamos
                        ? `El rider de carga solo aplica en renta cuando nosotros entregamos el equipo. En este servicio llevamos el equipo a ${destino}, así que úsalo como lista de carga.`
                        : modalidad === "RECOGE_BODEGA"
                          ? "El cliente recoge el equipo en bodega (Querétaro), por lo que no se realiza entrega de nuestra parte. Genera el rider de carga únicamente cuando nosotros vayamos a entregar el equipo."
                          : "Define la modalidad de entrega en la logística. El rider de carga solo aplica cuando nosotros entregamos el equipo (a su bodega o al venue)."}
                    </p>
                  </div>
                );
              })()}

              {cotObservaciones && (
                <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-4 py-3">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Observaciones (cotización)</p>
                  <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">{cotObservaciones}</p>
                </div>
              )}

              {(() => {
                // Compute cotización lines FIRST so empty state is aware of them.
                // When no inventory is linked (riderEquipos empty) → show ALL cot equipment (PROPIO+EXTERNO+OTRO).
                // When inventory IS linked → only show EXTERNO+OTRO to avoid duplicating inventory rows.
                const tiposAMostrar = riderEquipos.length === 0
                  ? ["EQUIPO_PROPIO", "EQUIPO_EXTERNO", "OTRO"]
                  : ["EQUIPO_EXTERNO", "OTRO"];
                const cotLineas = (proyecto.cotizacion?.lineas ?? []).filter(
                  (l: { tipo: string; descripcion: string }) =>
                    tiposAMostrar.includes(l.tipo) && !!l.descripcion
                ) as { id: string; tipo: string; descripcion: string; marca: string | null; cantidad: number; notas: string | null }[];

                if (riderEquipos.length === 0 && cotLineas.length === 0) {
                  return (
                    <div className="ms-card py-12 text-center">
                      <p className="text-gray-600 text-sm">Sin equipos en este proyecto</p>
                      <p className="text-gray-700 text-xs mt-1">Agrega equipos en la pestaña Equipos o cotización</p>
                    </div>
                  );
                }

                const grupos: Record<string, typeof riderEquipos> = {};
                for (const e of riderEquipos) { const cat = e.equipo.categoria.nombre; if (!grupos[cat]) grupos[cat] = []; grupos[cat].push(e); }
                return (
                  <div className="ms-table-wrapper">
                    {Object.entries(grupos).map(([cat, items]) => (
                      <div key={cat}>
                        <div className="px-4 py-1.5 bg-[#0a0a0a] border-b border-[#1a1a1a]">
                          <span className="text-[10px] text-[#B3985B]/60 font-bold uppercase tracking-widest">{cat}</span>
                        </div>
                        {cotNotasSecciones[cat] && (
                          <div className="px-4 py-2 bg-[#0a0a0a] border-b border-[#111]">
                            <p className="text-xs text-[#6b7280] italic">{cotNotasSecciones[cat]}</p>
                          </div>
                        )}
                        {items.map(e => {
                          const isExpanded = !!riderExpandido[e.id];
                          const riderNames = new Set(e.riderAccesorios.map(a => a.nombre.toLowerCase()));
                          const libNames = new Set(e.equipo.accesorios.map(a => a.nombre.toLowerCase()));
                          const sistemaSugs = accesoriosPorEquipo(e.equipo.descripcion, e.equipo.categoria.nombre)
                            .filter(s => !riderNames.has(s.toLowerCase()) && !libNames.has(s.toLowerCase()));
                          const libSugs = e.equipo.accesorios.filter(a => !riderNames.has(a.nombre.toLowerCase()));
                          const completados = e.riderAccesorios.filter(a => a.completado).length;
                          const totalGuardados = e.riderAccesorios.length;
                          const isAddOpen = riderAddOpen === e.id;

                          const isEditingCant = riderEquipoEditId === e.id;
                          return (
                            <div key={e.id} className="border-b border-[#0d0d0d] last:border-0">
                              {/* Equipo header row */}
                              <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors group">
                                <svg
                                  className={`w-3.5 h-3.5 text-[#444] transition-transform shrink-0 cursor-pointer ${isExpanded ? "rotate-90" : ""}`}
                                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                                  onClick={() => setRiderExpandido(prev => ({ ...prev, [e.id]: !isExpanded }))}
                                ><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                <div
                                  className="flex-1 min-w-0 cursor-pointer select-none"
                                  onClick={() => setRiderExpandido(prev => ({ ...prev, [e.id]: !isExpanded }))}
                                >
                                  <p className="text-sm font-medium text-white">
                                    {e.equipo.marca ?? "Sin marca"}
                                    {e.equipo.modelo && <span className="font-normal text-gray-300"> {e.equipo.modelo}</span>}
                                  </p>
                                  <p className="text-gray-500 text-xs mt-0.5 leading-snug">{e.equipo.descripcion}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {totalGuardados > 0 && (
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${completados === totalGuardados ? "text-green-400 bg-green-900/20" : "text-[#B3985B] bg-[#B3985B]/10"}`}>
                                      {completados}/{totalGuardados} acc
                                    </span>
                                  )}
                                  {isEditingCant ? (
                                    <div className="flex items-center gap-1" onClick={ev => ev.stopPropagation()}>
                                      <button onClick={() => setRiderEquipoEditCant(v => Math.max(1, v - 1))} className="text-gray-500 hover:text-white w-5 text-center text-lg leading-none">−</button>
                                      <span className="text-white text-sm w-6 text-center">{riderEquipoEditCant}</span>
                                      <button onClick={() => setRiderEquipoEditCant(v => v + 1)} className="text-gray-500 hover:text-white w-5 text-center text-lg leading-none">+</button>
                                      <button onClick={() => actualizarCantidadEquipo(e.id, riderEquipoEditCant)} className="ml-1 px-2 py-0.5 bg-[#B3985B] text-black text-xs font-semibold rounded">✓</button>
                                      <button onClick={() => setRiderEquipoEditId(null)} className="text-gray-600 hover:text-white text-xs">×</button>
                                    </div>
                                  ) : (
                                    <span className="text-[#B3985B] text-xs font-bold">×{e.cantidad}</span>
                                  )}
                                  {!isEditingCant && (
                                    <>
                                      <button
                                        onClick={ev => { ev.stopPropagation(); setRiderEquipoEditId(e.id); setRiderEquipoEditCant(e.cantidad); }}
                                        className="text-xs text-gray-600 hover:text-[#B3985B] transition-colors opacity-0 group-hover:opacity-100"
                                      >Editar</button>
                                      <button
                                        onClick={ev => { ev.stopPropagation(); setRiderNotasEditId(e.id); setRiderNotasText(e.notas ?? ""); }}
                                        className={`text-xs transition-colors opacity-0 group-hover:opacity-100 ${e.notas ? "text-[#B3985B]" : "text-gray-600 hover:text-[#B3985B]"}`}
                                        title={e.notas ? "Editar nota" : "Agregar nota"}
                                      ><FileText strokeWidth={1.75} className="w-3.5 h-3.5" /></button>
                                      <button
                                        onClick={async ev => { ev.stopPropagation(); await eliminarEquipo(e.id); }}
                                        className="text-xs text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                      >Eliminar</button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Notes row */}
                              {riderNotasEditId === e.id ? (
                                <div className="px-4 pb-2 flex gap-2">
                                  <textarea
                                    autoFocus
                                    value={riderNotasText}
                                    onChange={ev => setRiderNotasText(ev.target.value)}
                                    onKeyDown={ev => { if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) saveRiderNotas(e.id, riderNotasText); }}
                                    placeholder="Comentarios de carga, instrucciones especiales..."
                                    rows={2}
                                    className="flex-1 bg-[#0d0d0d] border border-[#333] focus:border-[#B3985B] rounded-lg px-3 py-2 text-white text-xs focus:outline-none resize-none placeholder-gray-700"
                                  />
                                  <div className="flex flex-col gap-1">
                                    <button onClick={() => saveRiderNotas(e.id, riderNotasText)} className="px-2 py-1 bg-[#B3985B] text-black text-xs font-semibold rounded transition-colors">✓</button>
                                    <button onClick={() => { setRiderNotasEditId(null); }} className="px-2 py-1 bg-[#1a1a1a] text-gray-500 text-xs rounded transition-colors">×</button>
                                  </div>
                                </div>
                              ) : e.notas ? (
                                <div
                                  className="px-4 pb-2 flex items-start gap-2 group/notas cursor-pointer"
                                  onClick={() => { setRiderNotasEditId(e.id); setRiderNotasText(e.notas ?? ""); }}
                                >
                                  <FileText strokeWidth={1.75} className="w-3 h-3 text-gray-600 mt-0.5 shrink-0" />
                                  <p className="text-xs text-gray-500 flex-1 leading-relaxed">{e.notas}</p>
                                  <span className="text-[10px] text-gray-700 opacity-0 group-hover/notas:opacity-100 transition-opacity shrink-0">Editar</span>
                                </div>
                              ) : null}

                              {/* Expanded panel */}
                              {isExpanded && (
                                <div className="bg-[#0a0a0a] border-t border-[#1a1a1a] px-4 py-3 space-y-4">

                                  {/* Confirmed accessories */}
                                  {e.riderAccesorios.length > 0 && (
                                    <div>
                                      <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2 font-semibold">Accesorios confirmados</p>
                                      <div className="space-y-1">
                                        {e.riderAccesorios.map(a => (
                                          <div key={a.id} className="flex items-center gap-2.5 group py-1">
                                            <span className="text-[#B3985B] font-bold text-sm w-8 shrink-0">×{a.cantidad ?? 1}</span>
                                            <span className="flex-1 text-sm text-gray-200">{a.nombre}</span>
                                            {a.categoria && <span className="text-[9px] text-[#444] bg-[#1a1a1a] px-1.5 rounded">{a.categoria}</span>}
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                              <button onClick={() => riderActualizarCantidad(e.id, a.id, Math.max(1, (a.cantidad ?? 1) - 1))} className="text-gray-600 hover:text-white w-5 text-center text-sm leading-none transition-colors">−</button>
                                              <button onClick={() => riderActualizarCantidad(e.id, a.id, (a.cantidad ?? 1) + 1)} className="text-gray-600 hover:text-white w-5 text-center text-sm leading-none transition-colors">+</button>
                                            </div>
                                            <button onClick={() => riderEliminarAccesorio(e.id, a.id)} className="text-[#333] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-xs leading-none">×</button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Library suggestions */}
                                  {libSugs.length > 0 && (
                                    <div>
                                      <p className="text-[10px] text-[#444] uppercase tracking-widest mb-0.5 font-semibold">Sugerencias guardadas (biblioteca)</p>
                                      <p className="text-[10px] text-gray-600 mb-2">Elige la cantidad y agrégalo al rider de salida.</p>
                                      <div className="space-y-0.5">
                                        {libSugs.map(a => {
                                          const sk = `${e.id}::${a.nombre}`;
                                          const cant = sugCantidad[sk] ?? 1;
                                          return (
                                          <div key={a.id} className="w-full flex items-center gap-2.5 py-1 px-1 -mx-1 rounded-md group/sug hover:bg-[#111] transition-colors">
                                            <span className="flex-1 text-xs text-gray-400 group-hover/sug:text-gray-200 transition-colors">{a.nombre}</span>
                                            <div className="flex items-center gap-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-1 shrink-0">
                                              <button type="button" onClick={() => setSugCantidad(prev => ({ ...prev, [sk]: Math.max(1, cant - 1) }))} className="text-gray-500 hover:text-white w-5 text-center text-sm leading-none transition-colors">−</button>
                                              <span className="text-white text-xs font-semibold w-5 text-center">{cant}</span>
                                              <button type="button" onClick={() => setSugCantidad(prev => ({ ...prev, [sk]: cant + 1 }))} className="text-gray-500 hover:text-white w-5 text-center text-sm leading-none transition-colors">+</button>
                                            </div>
                                            <button type="button" onClick={() => riderAgregarSugerencia(e.id, a.nombre, cant)} className="text-[10px] font-semibold text-gray-500 hover:text-black hover:bg-[#B3985B] border border-[#333] hover:border-[#B3985B] px-2 py-1 rounded-md shrink-0 transition-colors">Agregar</button>
                                          </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* System suggestions */}
                                  {sistemaSugs.length > 0 && (
                                    <div>
                                      <p className="text-[10px] text-[#444] uppercase tracking-widest mb-0.5 font-semibold">Sugerencias del sistema</p>
                                      <p className="text-[10px] text-gray-600 mb-2">Elige la cantidad y agrégalo al rider de salida.</p>
                                      <div className="space-y-0.5">
                                        {sistemaSugs.map((s, i) => {
                                          const sk = `${e.id}::${s}`;
                                          const cant = sugCantidad[sk] ?? 1;
                                          return (
                                          <div key={i} className="w-full flex items-center gap-2.5 py-1 px-1 -mx-1 rounded-md group/sug hover:bg-[#111] transition-colors">
                                            <span className="flex-1 text-xs text-gray-500 group-hover/sug:text-gray-300 transition-colors">{s}</span>
                                            <div className="flex items-center gap-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-1 shrink-0">
                                              <button type="button" onClick={() => setSugCantidad(prev => ({ ...prev, [sk]: Math.max(1, cant - 1) }))} className="text-gray-500 hover:text-white w-5 text-center text-sm leading-none transition-colors">−</button>
                                              <span className="text-white text-xs font-semibold w-5 text-center">{cant}</span>
                                              <button type="button" onClick={() => setSugCantidad(prev => ({ ...prev, [sk]: cant + 1 }))} className="text-gray-500 hover:text-white w-5 text-center text-sm leading-none transition-colors">+</button>
                                            </div>
                                            <button type="button" onClick={() => riderAgregarSugerencia(e.id, s, cant)} className="text-[10px] font-semibold text-gray-500 hover:text-black hover:bg-[#B3985B] border border-[#333] hover:border-[#B3985B] px-2 py-1 rounded-md shrink-0 transition-colors">Agregar</button>
                                          </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Add accessory form */}
                                  {isAddOpen ? (
                                    <div className="ms-card rounded-lg p-3 space-y-2">
                                      <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold">Agregar accesorio</p>
                                      <div className="flex gap-2">
                                        <input
                                          autoFocus
                                          value={riderAddNombre}
                                          onChange={e => setRiderAddNombre(e.target.value)}
                                          onKeyDown={ev => { if (ev.key === "Enter") riderAgregarAccesorio(e.id); if (ev.key === "Escape") setRiderAddOpen(null); }}
                                          placeholder="Nombre del accesorio o herramienta..."
                                          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/60"
                                        />
                                        <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-2">
                                          <button onClick={() => setRiderAddCantidad(v => Math.max(1, v - 1))} className="text-gray-500 hover:text-white w-5 text-center leading-none text-lg transition-colors">−</button>
                                          <span className="text-white text-sm font-semibold w-6 text-center">{riderAddCantidad}</span>
                                          <button onClick={() => setRiderAddCantidad(v => v + 1)} className="text-gray-500 hover:text-white w-5 text-center leading-none text-lg transition-colors">+</button>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Combobox
                                          value={riderAddCategoria}
                                          onChange={v => setRiderAddCategoria(v)}
                                          options={[{ value: "", label: "Categoría (opcional)" }, { value: "cable", label: "Cable" }, { value: "herramienta", label: "Herramienta" }, { value: "consumible", label: "Consumible" }, { value: "soporte", label: "Soporte / Stand" }, { value: "otro", label: "Otro" }]}
                                          className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-gray-400 text-xs focus:outline-none focus:border-[#B3985B]/60"
                                        />
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                          <input type="checkbox" checked={riderAddGuardar} onChange={ev => setRiderAddGuardar(ev.target.checked)} className="w-3.5 h-3.5 rounded accent-[#B3985B]" />
                                          <span className="text-[11px] text-gray-400">Guardar en biblioteca</span>
                                        </label>
                                      </div>
                                      <div className="flex gap-2">
                                        <button onClick={() => riderAgregarAccesorio(e.id)} disabled={riderAddSaving || !riderAddNombre.trim()} className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors">
                                          {riderAddSaving ? "Guardando..." : "Agregar"}
                                        </button>
                                        <button onClick={() => { setRiderAddOpen(null); setRiderAddNombre(""); setRiderAddCantidad(1); }} className="text-gray-500 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-[#333] transition-colors">
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={ev => { ev.stopPropagation(); setRiderAddOpen(e.id); setRiderAddNombre(""); setRiderAddCategoria(""); setRiderAddGuardar(true); }}
                                      className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#B3985B] border border-dashed border-[#222] hover:border-[#B3985B]/30 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                      Agregar accesorio
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {/* ── Equipos adicionales / terceros desde cotización ── */}
                    {cotLineas.length > 0 && (
                      <div>
                        <div className="px-4 py-1.5 bg-[#0a0a0a] border-b border-t border-[#1a1a1a] flex items-center gap-2">
                          <span className="text-[10px] text-orange-400/70 font-bold uppercase tracking-widest">
                            {riderEquipos.length === 0 ? "Equipos de cotización" : "Equipos adicionales / Terceros"}
                          </span>
                          <span className="text-[10px] text-gray-600">desde cotización · {cotLineas.length} ítem{cotLineas.length !== 1 ? "s" : ""}</span>
                        </div>
                        {cotLineas.map(l => (
                          <div key={l.id} className="border-b border-[#0d0d0d] last:border-0 px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white">
                                  {l.descripcion}
                                  {l.marca && <span className="text-gray-500"> · {l.marca}</span>}
                                </p>
                                {l.notas && <p className="text-gray-500 text-xs mt-0.5">{l.notas}</p>}
                              </div>
                              <span className="text-gray-400 text-xs shrink-0">×{l.cantidad}</span>
                              <span className={`text-[10px] border px-1.5 py-0.5 rounded shrink-0 ${
                                l.tipo === "EQUIPO_PROPIO"
                                  ? "text-[#B3985B]/80 border-[#B3985B]/30"
                                  : l.tipo === "EQUIPO_EXTERNO"
                                    ? "text-orange-400/70 border-orange-400/20"
                                    : "text-blue-400/70 border-blue-400/20"
                              }`}>
                                {l.tipo === "EQUIPO_PROPIO" ? "Inventario" : l.tipo === "EQUIPO_EXTERNO" ? "Tercero" : "Adicional"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>



            {/* ═══════ ZONA 1.25: EQUIPOS EXTRA AL RIDER ═══════ */}
            <SectionDivider label="Equipos adicionales al rider" />
            <div className="space-y-3">
              <p className="text-gray-500 text-xs">Equipos que se agregan al rider pero no están en la cotización original. La disponibilidad no se verifica aquí.</p>

              {equiposRiderExtra.length > 0 && (
                <div className="ms-table-wrapper divide-y divide-[#1a1a1a]">
                  {equiposRiderExtra.map(eq => (
                    <div key={eq.id} className="px-4 py-3">
                      {extraEditId === eq.id ? (
                        /* ── Modo edición inline ── */
                        <div className="space-y-2">
                          <input
                            value={extraEditDesc}
                            onChange={e => setExtraEditDesc(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                            placeholder="Descripción del equipo"
                          />
                          <div className="flex gap-2">
                            <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 shrink-0">
                              <button onClick={() => setExtraEditCant(v => Math.max(1, v - 1))} className="text-gray-500 hover:text-white w-5 text-center text-lg leading-none">−</button>
                              <span className="text-white text-sm w-6 text-center">{extraEditCant}</span>
                              <button onClick={() => setExtraEditCant(v => v + 1)} className="text-gray-500 hover:text-white w-5 text-center text-lg leading-none">+</button>
                            </div>
                            <input
                              value={extraEditNotas}
                              onChange={e => setExtraEditNotas(e.target.value)}
                              placeholder="Notas opcionales"
                              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#B3985B]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (!extraEditDesc.trim()) return;
                                saveEquiposRiderExtra(equiposRiderExtra.map(e => e.id === eq.id ? { ...e, descripcion: extraEditDesc.trim(), cantidad: extraEditCant, notas: extraEditNotas.trim() } : e));
                                setExtraEditId(null);
                              }}
                              className="px-3 py-1.5 bg-[#B3985B] text-black text-xs font-semibold rounded transition-colors"
                            >Guardar</button>
                            <button onClick={() => setExtraEditId(null)} className="px-3 py-1.5 bg-[#1a1a1a] text-gray-400 text-xs rounded transition-colors">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        /* ── Vista normal ── */
                        <div>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={eq.completado}
                              onChange={() => saveEquiposRiderExtra(equiposRiderExtra.map(e => e.id === eq.id ? { ...e, completado: !e.completado } : e))}
                              className="w-4 h-4 rounded accent-[#B3985B] shrink-0 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${eq.completado ? "line-through text-gray-600" : "text-white"}`}>{eq.descripcion}</p>
                              {eq.notas && <p className="text-gray-600 text-xs truncate mt-0.5">{eq.notas}</p>}
                            </div>
                            <span className="text-gray-500 text-xs shrink-0">×{eq.cantidad}</span>
                            <button
                              onClick={() => { setExtraEditId(eq.id); setExtraEditDesc(eq.descripcion); setExtraEditCant(eq.cantidad); setExtraEditNotas(eq.notas); }}
                              className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors shrink-0"
                            >Editar</button>
                            <button
                              onClick={() => saveEquiposRiderExtra(equiposRiderExtra.filter(e => e.id !== eq.id))}
                              className="text-xs text-gray-600 hover:text-red-500 transition-colors shrink-0"
                            >Eliminar</button>
                          </div>

                          {/* Accesorios del item extra */}
                          {(eq.accesorios ?? []).length > 0 && (
                            <div className="mt-2 ml-7 space-y-1">
                              {(eq.accesorios ?? []).map(a => (
                                <div key={a.id} className="flex items-center gap-2 text-xs text-gray-400">
                                  <span className="w-3 h-3 border border-[#333] rounded-sm shrink-0" />
                                  <span className="flex-1">{a.nombre}</span>
                                  {a.cantidad > 1 && <span className="text-[#B3985B]">×{a.cantidad}</span>}
                                  <button
                                    onClick={() => saveEquiposRiderExtra(equiposRiderExtra.map(e => e.id === eq.id ? { ...e, accesorios: (e.accesorios ?? []).filter(x => x.id !== a.id) } : e))}
                                    className="text-[#333] hover:text-red-500 leading-none"
                                  >×</button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Agregar accesorio a este item */}
                          {extraAccOpen === eq.id ? (
                            <div className="mt-2 ml-7 flex items-center gap-2">
                              <input
                                value={extraAccNombre}
                                onChange={e => setExtraAccNombre(e.target.value)}
                                placeholder="Nombre del accesorio"
                                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#B3985B]"
                                onKeyDown={e => {
                                  if (e.key === "Enter" && extraAccNombre.trim()) {
                                    const acc = { id: crypto.randomUUID(), nombre: extraAccNombre.trim(), cantidad: extraAccCant };
                                    saveEquiposRiderExtra(equiposRiderExtra.map(ex => ex.id === eq.id ? { ...ex, accesorios: [...(ex.accesorios ?? []), acc] } : ex));
                                    setExtraAccNombre(""); setExtraAccCant(1); setExtraAccOpen(null);
                                  }
                                }}
                              />
                              <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#333] rounded px-1.5 py-1 shrink-0">
                                <button onClick={() => setExtraAccCant(v => Math.max(1, v - 1))} className="text-gray-500 hover:text-white w-4 text-center text-base leading-none">−</button>
                                <span className="text-white text-xs w-4 text-center">{extraAccCant}</span>
                                <button onClick={() => setExtraAccCant(v => v + 1)} className="text-gray-500 hover:text-white w-4 text-center text-base leading-none">+</button>
                              </div>
                              <button
                                disabled={!extraAccNombre.trim()}
                                onClick={() => {
                                  const acc = { id: crypto.randomUUID(), nombre: extraAccNombre.trim(), cantidad: extraAccCant };
                                  saveEquiposRiderExtra(equiposRiderExtra.map(ex => ex.id === eq.id ? { ...ex, accesorios: [...(ex.accesorios ?? []), acc] } : ex));
                                  setExtraAccNombre(""); setExtraAccCant(1); setExtraAccOpen(null);
                                }}
                                className="px-2 py-1 bg-[#B3985B] text-black text-xs font-semibold rounded disabled:opacity-40"
                              >+</button>
                              <button onClick={() => { setExtraAccOpen(null); setExtraAccNombre(""); setExtraAccCant(1); }} className="text-gray-600 hover:text-white text-xs">×</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setExtraAccOpen(eq.id); setExtraAccNombre(""); setExtraAccCant(1); }}
                              className="mt-1.5 ml-7 text-[10px] text-gray-600 hover:text-[#B3985B] transition-colors"
                            >+ accesorio</button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {addingEquipoExtra ? (
                <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                  {/* Toggle inventario / manual */}
                  <div className="flex gap-1 bg-[#111] rounded-lg p-0.5 w-fit">
                    {(["inventario", "manual"] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setExtraAddMode(mode)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${extraAddMode === mode ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"}`}
                      >
                        {mode === "inventario" ? "Del inventario" : "Manual"}
                      </button>
                    ))}
                  </div>

                  {extraAddMode === "inventario" ? (
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Combobox
                          value={newExtraEquipoId}
                          onChange={v => setNewExtraEquipoId(v)}
                          options={[{ value: "", label: "Buscar en inventario…" }, ...equipoCatalogo.map(eq => ({ value: eq.id, label: `${eq.categoria.nombre} — ${eq.marca ? `${eq.marca} — ${eq.descripcion}` : eq.descripcion}` }))]}
                          className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50"
                        />
                      </div>
                      <div className="flex items-center gap-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-2 shrink-0">
                        <button onClick={() => setNewExtraCant(v => Math.max(1, v - 1))} className="text-gray-500 hover:text-white w-5 text-center leading-none text-lg transition-colors">−</button>
                        <span className="text-white text-sm w-5 text-center">{newExtraCant}</span>
                        <button onClick={() => setNewExtraCant(v => v + 1)} className="text-gray-500 hover:text-white w-5 text-center leading-none text-lg transition-colors">+</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input
                        value={newExtraManualDesc}
                        onChange={e => setNewExtraManualDesc(e.target.value)}
                        placeholder="Nombre del equipo (ej. Cable XLR, DI Box, etc.)"
                        className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#B3985B]/50"
                      />
                      <div className="flex items-center gap-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-2 shrink-0">
                        <button onClick={() => setNewExtraCant(v => Math.max(1, v - 1))} className="text-gray-500 hover:text-white w-5 text-center leading-none text-lg transition-colors">−</button>
                        <span className="text-white text-sm w-5 text-center">{newExtraCant}</span>
                        <button onClick={() => setNewExtraCant(v => v + 1)} className="text-gray-500 hover:text-white w-5 text-center leading-none text-lg transition-colors">+</button>
                      </div>
                    </div>
                  )}

                  <input
                    value={newExtraNotas}
                    onChange={e => setNewExtraNotas(e.target.value)}
                    placeholder="Notas opcionales (proveedor, condición, etc.)"
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={extraAddMode === "inventario" ? !newExtraEquipoId : !newExtraManualDesc.trim()}
                      onClick={() => {
                        let descripcion = "";
                        if (extraAddMode === "inventario") {
                          const eq = equipoCatalogo.find(e => e.id === newExtraEquipoId);
                          if (!eq) return;
                          descripcion = eq.marca ? `${eq.marca} — ${eq.descripcion}` : eq.descripcion;
                        } else {
                          if (!newExtraManualDesc.trim()) return;
                          descripcion = newExtraManualDesc.trim();
                        }
                        const nuevo: EquipoRiderExtra = { id: crypto.randomUUID(), descripcion, cantidad: newExtraCant, notas: newExtraNotas.trim(), completado: false, accesorios: [] };
                        saveEquiposRiderExtra([...equiposRiderExtra, nuevo]);
                        setNewExtraEquipoId(""); setNewExtraCant(1); setNewExtraNotas(""); setNewExtraManualDesc("");
                        setAddingEquipoExtra(false);
                      }}
                      className="px-4 py-2 bg-[#B3985B] hover:bg-[#c9ac6a] text-black text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                    >Agregar</button>
                    <button onClick={() => { setAddingEquipoExtra(false); setNewExtraEquipoId(""); setNewExtraCant(1); setNewExtraNotas(""); setNewExtraManualDesc(""); setExtraAddMode("inventario"); }} className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] text-gray-400 text-xs rounded-lg transition-colors">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingEquipoExtra(true)} className="flex items-center gap-1.5 text-xs text-[#B3985B] hover:text-[#c9ac6a] transition-colors">
                  <span className="text-base leading-none">+</span> Agregar equipo extra
                </button>
              )}
            </div></>

            {/* ═══════ ZONA 2: DOCUMENTOS DEL SHOW (accordion) ═══════ */}
            {!esRenta && <><SectionDivider label="Documentos del show" />
            <div className="space-y-3">
              <DocAccordion docKey="soundcheck" title="Orden de Soundcheck" desc="Secuencia y horario de pruebas de sonido" isOpen={openDocs.has("soundcheck")} onToggle={() => toggleDoc("soundcheck")}>
                <div className="p-4 space-y-2 overflow-x-auto">
                  <TableHeader cols={["Hora", "Artista / Acto", "Duración", "Notas"]} />
                  {docs.soundcheck.map((row, i) => { const update = (field: string, val: string) => { const next = docs.soundcheck.map((r, j) => j === i ? { ...r, [field]: val } : r); saveDocs({ ...docs, soundcheck: next }); }; return (<div key={i} className="grid gap-1" style={{ gridTemplateColumns: "100px 1fr 100px 1fr 32px" }}><input defaultValue={row.hora} onBlur={e => update("hora", e.target.value)} placeholder="00:00" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" /><input defaultValue={row.artista} onBlur={e => update("artista", e.target.value)} placeholder="Artista" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" /><input defaultValue={row.duracion} onBlur={e => update("duracion", e.target.value)} placeholder="30 min" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" /><input defaultValue={row.notas} onBlur={e => update("notas", e.target.value)} placeholder="Notas" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" /><button onClick={() => { const next = docs.soundcheck.filter((_, j) => j !== i); saveDocs({ ...docs, soundcheck: next.length ? next : [{ hora: "", artista: "", duracion: "", notas: "" }] }); }} className="text-red-600 hover:text-red-400 text-xs flex items-center justify-center">✕</button></div>); })}
                  <button onClick={() => saveDocs({ ...docs, soundcheck: [...docs.soundcheck, { hora: "", artista: "", duracion: "", notas: "" }] })} className="text-xs text-[#B3985B] hover:text-[#d4b068] flex items-center gap-1 mt-1">+ Agregar artista</button>
                </div>
              </DocAccordion>
              <DocAccordion docKey="programaEvento" title="Programa general del evento" desc="Secuencia completa de actividades" isOpen={openDocs.has("programaEvento")} onToggle={() => toggleDoc("programaEvento")}>
                <div className="p-4 space-y-2 overflow-x-auto">
                  <TableHeader cols={["Hora", "Actividad", "Responsable", "Notas"]} />
                  {docs.programaEvento.map((row, i) => { const update = (field: string, val: string) => { const next = docs.programaEvento.map((r, j) => j === i ? { ...r, [field]: val } : r); saveDocs({ ...docs, programaEvento: next }); }; return (<div key={i} className="grid gap-1" style={{ gridTemplateColumns: "100px 1fr 1fr 1fr 32px" }}><input defaultValue={row.hora} onBlur={e => update("hora", e.target.value)} placeholder="00:00" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" /><input defaultValue={row.actividad} onBlur={e => update("actividad", e.target.value)} placeholder="Actividad" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" /><input defaultValue={row.responsable} onBlur={e => update("responsable", e.target.value)} placeholder="Responsable" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" /><input defaultValue={row.notas} onBlur={e => update("notas", e.target.value)} placeholder="Notas" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" /><button onClick={() => { const next = docs.programaEvento.filter((_, j) => j !== i); saveDocs({ ...docs, programaEvento: next.length ? next : [{ hora: "", actividad: "", responsable: "", notas: "" }] }); }} className="text-red-600 hover:text-red-400 text-xs flex items-center justify-center">✕</button></div>); })}
                  <button onClick={() => saveDocs({ ...docs, programaEvento: [...docs.programaEvento, { hora: "", actividad: "", responsable: "", notas: "" }] })} className="text-xs text-[#B3985B] hover:text-[#d4b068] flex items-center gap-1 mt-1">+ Agregar actividad</button>
                </div>
              </DocAccordion>
              <DocAccordion docKey="coordinacionProveedores" title="Coordinación de proveedores" desc="Catering, decoración, fotografía, etc." isOpen={openDocs.has("coordinacionProveedores")} onToggle={() => toggleDoc("coordinacionProveedores")}>
                <div className="p-4 space-y-2 overflow-x-auto">
                  <TableHeader cols={["Proveedor", "Contacto", "Horario llegada", "Notas"]} />
                  {docs.coordinacionProveedores.map((row, i) => { const update = (field: string, val: string) => { const next = docs.coordinacionProveedores.map((r, j) => j === i ? { ...r, [field]: val } : r); saveDocs({ ...docs, coordinacionProveedores: next }); }; return (<div key={i} className="grid gap-1" style={{ gridTemplateColumns: "1fr 1fr 120px 1fr 32px" }}><input defaultValue={row.proveedor} onBlur={e => update("proveedor", e.target.value)} placeholder="Nombre proveedor" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" /><input defaultValue={row.contacto} onBlur={e => update("contacto", e.target.value)} placeholder="Tel / nombre" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" /><input defaultValue={row.horario} onBlur={e => update("horario", e.target.value)} placeholder="00:00" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" /><input defaultValue={row.notas} onBlur={e => update("notas", e.target.value)} placeholder="Notas" className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" /><button onClick={() => { const next = docs.coordinacionProveedores.filter((_, j) => j !== i); saveDocs({ ...docs, coordinacionProveedores: next.length ? next : [{ proveedor: "", contacto: "", horario: "", notas: "" }] }); }} className="text-red-600 hover:text-red-400 text-xs flex items-center justify-center">✕</button></div>); })}
                  <button onClick={() => saveDocs({ ...docs, coordinacionProveedores: [...docs.coordinacionProveedores, { proveedor: "", contacto: "", horario: "", notas: "" }] })} className="text-xs text-[#B3985B] hover:text-[#d4b068] flex items-center gap-1 mt-1">+ Agregar proveedor</button>
                </div>
              </DocAccordion>
              <p className="text-center text-gray-700 text-[10px] pb-2">Los cambios se guardan automáticamente al salir de cada campo</p>
            </div></>}

            {/* ═══════ ZONA 3: CIERRE — Protocolo · Evaluación ═══════ */}
            <SectionDivider label="Cierre & Evaluación" />

            {esRenta && (
              <div className="space-y-5">
                <div><p className="text-white font-semibold">Protocolo de entrada / salida</p><p className="text-gray-500 text-xs mt-0.5">Verificación del estado de los equipos al salir y al regresar del evento</p></div>
                <ProtocoloPanel tipo="salida" data={salida} onSave={saveProtocolo} />
                <ProtocoloPanel tipo="entrada" data={entrada} onSave={saveProtocolo} />
              </div>
            )}

            {(() => {
                const linkBase = typeof window !== "undefined" ? `${window.location.origin}/reporte-evento/` : "/reporte-evento/";
                const linkBaseEval = typeof window !== "undefined" ? `${window.location.origin}/evaluacion/` : "/evaluacion/";

                return (
                  <div className="space-y-4">

                  {/* ── Reporte Post Evento / Post Renta (coordinador: hechos + evidencia) ── */}
                  {aplicaEvaluacion(proyecto.tipoServicio) && (() => {
                    const config = getEvalConfig(proyecto.tipoServicio);
                    const evalPost = proyecto.evaluacionPostEvento;
                    const items = evalPost?.items ?? {};
                    const { respondidos, total } = contarRespondidos(items, config.secciones);
                    const incidencias = evalPost ? contarIncidencias(items, config.secciones) : 0;
                    const iniciada = !!evalPost?.respondidoEn;
                    const enviado = !!evalPost?.completado;
                    return (
                      <div className="ms-card p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{config.etiqueta}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{config.resumenSubtitulo}</p>
                          </div>
                          <Link
                            href={`/proyectos/${proyecto.id}/evaluacion-post-evento`}
                            className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white text-xs px-4 py-2 rounded-lg transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            {enviado ? "Ver / corregir" : iniciada ? "Continuar reporte" : "Elaborar reporte"}
                          </Link>
                        </div>
                        {iniciada ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${enviado ? "bg-green-900/50 text-green-300" : "bg-yellow-900/40 text-yellow-300"}`}>{enviado ? "Enviado" : "Borrador"}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#1a1a1a] text-gray-300 border border-[#333]">{respondidos}/{total} respondidos</span>
                              {incidencias > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-900/40 text-red-300">{incidencias} incidencia(s)</span>}
                              {evalPost?.llenadoPorNombre && <span className="text-xs text-gray-500">Por {evalPost.llenadoPorNombre}</span>}
                            </div>
                            {evalPost?.resumenEvento && (
                              <div className="bg-[#0d0d0d] rounded-lg px-3 py-2">
                                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Resumen del evento</p>
                                <p className="text-gray-300 text-sm whitespace-pre-wrap line-clamp-3">{evalPost.resumenEvento}</p>
                              </div>
                            )}
                            {evalPost?.faltantes && (
                              <div className="bg-[#0d0d0d] rounded-lg px-3 py-2">
                                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Qué faltó</p>
                                <p className="text-gray-300 text-sm whitespace-pre-wrap line-clamp-2">{evalPost.faltantes}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-600 text-sm">Aún no se ha elaborado. El coordinador debe registrar el reporte del evento con evidencia.</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── Evaluación de Dirección (solo dirección / admin) ── */}
                  {aplicaEvaluacion(proyecto.tipoServicio) && esDireccion && (() => {
                    const dir = proyecto.evaluacionDireccion;
                    const dirConfig = getDireccionConfig(proyecto.tipoServicio);
                    const prom = dir ? promedioDireccion(dir, dirConfig) : null;
                    const nivel = nivelResultado(prom);
                    const finalizada = !!dir?.finalizada;
                    return (
                      <div className="ms-card p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{dirConfig.etiqueta}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{dirConfig.subtitulo}</p>
                          </div>
                          <Link
                            href={`/proyectos/${proyecto.id}/evaluacion-direccion`}
                            className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white text-xs px-4 py-2 rounded-lg transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.036 10.8c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                            {dir ? "Ver / editar" : "Evaluar evento"}
                          </Link>
                        </div>
                        {dir ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${finalizada ? "bg-green-900/50 text-green-300" : "bg-yellow-900/40 text-yellow-300"}`}>{finalizada ? "Finalizada" : "En progreso"}</span>
                              <div className="rounded-lg px-3 py-1 border" style={{ backgroundColor: `${nivel.color}14`, borderColor: `${nivel.color}40` }}>
                                <span className="text-sm font-bold" style={{ color: nivel.color }}>{prom ? `${prom.toFixed(1)}/5` : "—"}</span>
                                <span className="text-[10px] ml-1 font-medium" style={{ color: nivel.color }}>{nivel.label}</span>
                              </div>
                              {dir.evaluadorNombre && <span className="text-xs text-gray-500">Por {dir.evaluadorNombre}</span>}
                            </div>
                            {dir.comentario && (
                              <div className="bg-[#0d0d0d] rounded-lg px-3 py-2">
                                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Conclusión de dirección</p>
                                <p className="text-gray-300 text-sm whitespace-pre-wrap line-clamp-3">{dir.comentario}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-600 text-sm">Califica el desempeño del evento con base en el reporte y la evidencia del coordinador.</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── Evaluación del cliente ── */}
                  <div className="ms-card p-5 space-y-4">
                    <div className="flex items-center justify-between"><div><p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Evaluación del cliente</p><p className="text-gray-500 text-xs mt-0.5">Formulario externo para que el cliente califique el servicio</p></div><button onClick={async () => { const token = evalCliente?.tokenAcceso ?? await generarLinkEvalCliente(); if (token) { try { await navigator.clipboard.writeText(`${linkBaseEval}${token}`); } catch { /* noop */ } } }} disabled={generandoLink || loadingEvalCliente || evalCliente?.respondida} className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg transition-colors"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>{generandoLink ? "Copiando..." : evalCliente?.respondida ? "Respondida" : "Copiar link"}</button></div>
                    {loadingEvalCliente && <p className="text-gray-600 text-sm">Cargando...</p>}
                    {evalCliente && (
                      <div className="space-y-3">
                        <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 flex items-center gap-2"><span className="text-gray-500 text-xs flex-1 truncate font-mono">{linkBase}{evalCliente.tokenAcceso}</span><button onClick={() => navigator.clipboard.writeText(`${linkBase}${evalCliente.tokenAcceso}`)} className="text-[10px] text-[#B3985B] hover:text-white shrink-0 transition-colors">Copiar</button>{proyecto.cliente.telefono && (<a href={`https://wa.me/${proyecto.cliente.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${proyecto.cliente.nombre}, fue un placer trabajar contigo en ${proyecto.nombre}. Te compartimos este breve formulario para conocer tu experiencia: ${linkBase}${evalCliente.tokenAcceso}`)}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-green-400 hover:text-green-300 shrink-0 transition-colors flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.984-1.31A9.944 9.944 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>WhatsApp</a>)}</div>
                        <div className="flex items-center gap-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${evalCliente.respondida ? "bg-green-900/50 text-green-300" : evalCliente.enviada ? "bg-yellow-900/50 text-yellow-300" : "bg-gray-800 text-gray-500"}`}>{evalCliente.respondida ? "Respondida" : evalCliente.enviada ? "Enviada" : "Pendiente"}</span>{evalCliente.promedioCalculado && (<span className="text-sm text-white font-semibold">Promedio: <span className="text-[#B3985B]">{evalCliente.promedioCalculado.toFixed(1)}</span>/10</span>)}</div>
                        {evalCliente.respondida && (<div className="grid grid-cols-2 gap-2 pt-1">{[{ label: "Satisfacción general", val: evalCliente.satisfaccionGeneral }, { label: "Calidad del servicio", val: evalCliente.calidadServicio }, { label: "Puntualidad", val: evalCliente.puntualidad }, { label: "Atención del equipo", val: evalCliente.atencionEquipo }, { label: "Comunicación", val: evalCliente.claridadComunicacion }, { label: "Calidad-precio", val: evalCliente.relacionCalidadPrecio }].map(({ label, val }) => val != null && (<div key={label} className="flex items-center justify-between bg-[#0d0d0d] rounded-lg px-3 py-2"><span className="text-xs text-gray-500">{label}</span><span className={`text-sm font-bold ${val >= 9 ? "text-green-400" : val >= 7 ? "text-[#B3985B]" : val >= 5 ? "text-yellow-400" : "text-red-400"}`}>{val}</span></div>))}{evalCliente.probabilidadRecontratacion != null && (<div className="flex items-center justify-between bg-[#0d0d0d] rounded-lg px-3 py-2 col-span-2"><span className="text-xs text-gray-500">Probabilidad de recontratación (NPS)</span><span className={`text-sm font-bold ${evalCliente.probabilidadRecontratacion >= 9 ? "text-green-400" : evalCliente.probabilidadRecontratacion >= 7 ? "text-[#B3985B]" : evalCliente.probabilidadRecontratacion >= 5 ? "text-yellow-400" : "text-red-400"}`}>{evalCliente.probabilidadRecontratacion}/10</span></div>)}</div>)}
                        {evalCliente.loMejor && (<div className="bg-[#0d0d0d] rounded-lg px-3 py-2"><p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Lo mejor</p><p className="text-gray-300 text-sm">{evalCliente.loMejor}</p></div>)}
                        {evalCliente.loMejorable && (<div className="bg-[#0d0d0d] rounded-lg px-3 py-2"><p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Áreas de mejora</p><p className="text-gray-300 text-sm">{evalCliente.loMejorable}</p></div>)}
                        {evalCliente.comentarioAdicional && (<div className="bg-[#0d0d0d] rounded-lg px-3 py-2"><p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Comentario adicional</p><p className="text-gray-300 text-sm">{evalCliente.comentarioAdicional}</p></div>)}
                      </div>
                    )}
                  </div>

                  </div>
                );
            })()}

          </div>
        );
      })()}
          </div>
        )}

        {/* ──── FINANZAS tab ──── */}
        {activeTab === 'tareas' && (
          <div id="section-tareas" className="scroll-mt-14">
            <ChecklistEventoTab
              proyectoId={proyecto.id}
              proyectoNombre={proyecto.nombre}
              tipoServicio={proyecto.tipoServicio ?? null}
              usuarios={usuariosActivos}
            />
          </div>
        )}

        {activeTab === 'finanzas' && (
          <div id="section-finanzas" className="scroll-mt-14">
      {(() => {
        // ── P&L en tiempo real ──────────────────────────────────────────────
        const ingresoContratado = proyecto.cotizacion?.granTotal ?? 0;
        const ingresoCobrado = proyecto.cuentasCobrar.reduce((s, c) => s + c.montoCobrado, 0);
        // Costos personal: usar CxP de técnicos si existen (fuente de verdad); fallback a tarifas acordadas
        const tarifaTotal = proyecto.personal
          .filter(p => p.tarifaAcordada && p.tarifaAcordada > 0)
          .reduce((s, p) => s + (p.tarifaAcordada ?? 0), 0);
        const tecnicoCxPTotal = proyecto.cuentasPagar
          .filter(c => c.tipoAcreedor === "TECNICO")
          .reduce((s, c) => s + c.monto, 0);
        const costosPersonal = Math.max(tarifaTotal, tecnicoCxPTotal);
        const gastosProyPendientes = proyecto.cuentasPagar
          .filter(c => c.tipoAcreedor !== "TECNICO" && c.estado !== "LIQUIDADO")
          .reduce((s, c) => s + c.monto, 0);
        const gastosProyPagados = proyecto.movimientos.reduce((s, m) => s + m.monto, 0);
        const gastosProyTotal = gastosProyPendientes + gastosProyPagados;
        // Equipos externos: se suman siempre al costo real (igual que en el cierre)
        const costoEquiposExternos = (proyecto.equipos ?? []).reduce(
          (s: number, e: { costoExterno: number | null; cantidad: number }) => s + (e.costoExterno ?? 0) * e.cantidad, 0
        );
        const costosTotales = gastosProyTotal + costoEquiposExternos;
        const utilidadBruta = ingresoContratado - costosTotales;
        const margen = ingresoContratado > 0 ? (utilidadBruta / ingresoContratado) * 100 : 0;

        return (
        <div className="space-y-4">

          {/* ── Viabilidad del proyecto ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600 mb-3">Viabilidad del proyecto</p>
            <ViabilidadWidget
              viabilidadActiva={viabilidad?.viabilidadActiva ?? null}
              historico={viabilidad?.historico ?? []}
            />
          </div>

          {/* ── P&L Summary ── */}
          <div className="ms-table-wrapper">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Estado de resultados</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                margen >= 40 ? "bg-green-900/40 text-green-300" :
                margen >= 20 ? "bg-[#B3985B]/20 text-[#B3985B]" :
                margen >= 0  ? "bg-yellow-900/30 text-yellow-400" :
                "bg-red-900/30 text-red-400"
              }`}>
                Margen: {margen.toFixed(1)}%
              </span>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Ingresos */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Ingresos</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Contratado</span>
                  <span className="text-white font-medium">{fmt(ingresoContratado)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Cobrado</span>
                  <span className="text-green-400 font-medium">{fmt(ingresoCobrado)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-[#1a1a1a] pt-2">
                  <span className="text-gray-500">Por cobrar</span>
                  <span className="text-yellow-400">{fmt(ingresoContratado - ingresoCobrado)}</span>
                </div>
              </div>
              {/* Costos */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Costos</p>
                 {costosPersonal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 italic">Personal (ref.)</span>
                    <span className="text-gray-600 italic">{fmt(costosPersonal)}</span>
                  </div>
                )}
                {gastosProyPendientes > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Por pagar</span>
                    <span className="text-yellow-400">{fmt(gastosProyPendientes)}</span>
                  </div>
                )}
                {gastosProyPagados > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Pagado</span>
                    <span className="text-red-300">{fmt(gastosProyPagados)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-[#1a1a1a] pt-2">
                  <span className="text-gray-500 font-medium">Total costos</span>
                  <span className="text-red-400 font-semibold">{fmt(costosTotales)}</span>
                </div>
              </div>
              {/* Resultado */}
              <div className="space-y-2 border-l border-[#1a1a1a] pl-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Resultado</p>
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Utilidad bruta</p>
                  <p className={`text-2xl font-bold ${utilidadBruta >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {fmt(utilidadBruta)}
                  </p>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Margen sobre contratado</p>
                  <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      margen >= 40 ? "bg-green-500" : margen >= 20 ? "bg-[#B3985B]" : margen >= 0 ? "bg-yellow-500" : "bg-red-600"
                    }`} style={{ width: `${Math.min(Math.max(margen, 0), 100)}%` }} />
                  </div>
                  <p className={`text-sm font-semibold mt-1 ${
                    margen >= 40 ? "text-green-400" : margen >= 20 ? "text-[#B3985B]" : margen >= 0 ? "text-yellow-400" : "text-red-400"
                  }`}>{margen.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* CxC */}
          {(() => {
            const granTotal = proyecto.cotizacion?.granTotal ?? 0;
            const cxcAnticipo = proyecto.cuentasCobrar.find(c => c.tipoPago === "ANTICIPO");
            const cxcLiq = proyecto.cuentasCobrar.find(c => c.tipoPago === "LIQUIDACION");
            const cxcOtras = proyecto.cuentasCobrar.filter(c => c.tipoPago !== "ANTICIPO" && c.tipoPago !== "LIQUIDACION");

            // Calc preview en el editor
            const montoAnticipoPreview = esquemaAnticipoTipo === "porcentaje"
              ? (granTotal * (parseFloat(esquemaAnticipoPct) || 0) / 100)
              : (parseFloat(esquemaAnticipoMonto) || 0);
            const montoLiqPreview = Math.max(0, granTotal - montoAnticipoPreview);

            return (
              <div className="ms-table-wrapper">
                <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Cuentas por cobrar</h3>
                  {!editandoEsquema && (
                    <div className="flex items-center gap-2">
                      {proyecto.cotizacion && proyecto.cuentasCobrar.some(c => c.estado !== "LIQUIDADO") && (
                        <button onClick={sincronizarCxC} disabled={syncingCxC}
                          className="text-xs text-gray-500 border border-[#333] hover:text-yellow-400 hover:border-yellow-400/40 px-3 py-1 rounded-lg transition-colors disabled:opacity-50">
                          {syncingCxC ? "Actualizando..." : "↺ Sincronizar"}
                        </button>
                      )}
                      <button onClick={() => setEditandoEsquema(true)}
                        className="text-xs text-[#B3985B] border border-[#B3985B]/40 hover:bg-[#B3985B]/10 hover:border-[#B3985B] px-3 py-1 rounded-lg transition-colors">
                        {(cxcAnticipo || cxcLiq) ? "Editar esquema" : "Configurar pagos"}
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Editor de esquema ── */}
                {editandoEsquema && (
                  <div className="px-5 py-5 border-b border-[#1a1a1a] bg-[#0a0a0a] space-y-4">
                    {granTotal > 0 && (
                      <p className="text-xs text-gray-500">
                        Total cotización: <span className="text-white font-semibold">{fmt(granTotal)}</span>
                      </p>
                    )}

                    {/* Anticipo */}
                    <div className="space-y-2">
                      <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Anticipo</p>
                      <div className="flex gap-2">
                        {(["porcentaje", "monto"] as const).map(t => (
                          <button key={t} onClick={() => setEsquemaAnticipoTipo(t)}
                            className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                              esquemaAnticipoTipo === t
                                ? "bg-[#B3985B] border-[#B3985B] text-black font-semibold"
                                : "border-[#333] text-gray-400 hover:border-[#555]"
                            }`}>
                            {t === "porcentaje" ? "%" : "$ Fijo"}
                          </button>
                        ))}
                      </div>
                      {esquemaAnticipoTipo === "porcentaje" ? (
                        <div className="flex gap-2 items-center flex-wrap">
                          {["10", "25", "50"].map(p => (
                            <button key={p} onClick={() => setEsquemaAnticipoPct(p)}
                              className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                                esquemaAnticipoPct === p
                                  ? "bg-[#B3985B]/20 border-[#B3985B] text-[#B3985B] font-semibold"
                                  : "border-[#333] text-gray-400 hover:border-[#555]"
                              }`}>
                              {p}%
                            </button>
                          ))}
                          <input type="number" value={esquemaAnticipoPct} onChange={e => setEsquemaAnticipoPct(e.target.value)}
                            placeholder="%" min="1" max="99"
                            className="w-14 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                          {granTotal > 0 && montoAnticipoPreview > 0 && (
                            <span className="text-[#B3985B] text-xs font-semibold">= {fmt(montoAnticipoPreview)}</span>
                          )}
                        </div>
                      ) : (
                        <input type="number" value={esquemaAnticipoMonto} onChange={e => setEsquemaAnticipoMonto(e.target.value)}
                          placeholder="Monto" min="0"
                          className="w-36 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                      )}
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Fecha compromiso del anticipo</label>
                        <input type="date" value={esquemaAnticipoFecha} onChange={e => setEsquemaAnticipoFecha(e.target.value)}
                          className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                      </div>
                    </div>

                    {/* Liquidación — auto-calculada */}
                    {granTotal > 0 && montoAnticipoPreview > 0 && montoLiqPreview > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[#1a1a1a]">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-green-400 font-semibold uppercase tracking-wider">Liquidación</p>
                          <span className="text-white text-sm font-bold">{fmt(montoLiqPreview)}</span>
                          <span className="text-gray-500 text-xs">(automático)</span>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Fecha compromiso de la liquidación</label>
                          <input type="date" value={esquemaLiqFecha} onChange={e => setEsquemaLiqFecha(e.target.value)}
                            className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      <button onClick={guardarEsquema} disabled={savingEsquema}
                        className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-xs px-5 py-2 rounded-lg transition-colors">
                        {savingEsquema ? "Guardando..." : "Guardar esquema"}
                      </button>
                      <button onClick={() => setEditandoEsquema(false)} className="text-gray-500 text-xs hover:text-white">Cancelar</button>
                    </div>
                  </div>
                )}

                {/* ── Sin esquema configurado ── */}
                {!editandoEsquema && !cxcAnticipo && !cxcLiq && cxcOtras.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-6">Sin esquema de cobro. Presiona &ldquo;Configurar pagos&rdquo; para crear anticipo + liquidación.</p>
                )}

                {/* ── Filas CxC (anticipo, liquidación y otras) ── */}
                {[...([cxcAnticipo, cxcLiq].filter(Boolean) as CxC[]), ...cxcOtras].map(c => {
                  const ajustesEntradas: AjusteEntry[] = c.ajustesLog ? JSON.parse(c.ajustesLog) : [];
                  const tieneAjustes = ajustesEntradas.length > 0;
                  const esEsquema = c.tipoPago === "ANTICIPO" || c.tipoPago === "LIQUIDACION";
                  return (
                    <div key={c.id} className="px-5 py-4 border-b border-[#0d0d0d] last:border-0">
                      {/* Fila principal */}
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="text-white text-sm font-medium">
                              {esEsquema ? (c.tipoPago === "ANTICIPO" ? "Anticipo" : "Liquidación") : c.concepto}
                            </p>
                            {esEsquema && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                c.tipoPago === "ANTICIPO" ? "bg-[#B3985B]/20 text-[#B3985B]" : "bg-green-900/30 text-green-400"
                              }`}>
                                {c.tipoPago === "ANTICIPO" ? "ANTICIPO" : "LIQUIDACIÓN"}
                              </span>
                            )}
                            {granTotal > 0 && esEsquema && (
                              <span className="text-gray-600 text-[10px]">{Math.round(c.monto / granTotal * 100)}%</span>
                            )}
                            {tieneAjustes && (
                              <button onClick={() => setAjusteHistorial(prev => prev === c.id ? null : c.id)}
                                className="text-[10px] text-blue-400/70 hover:text-blue-400 border border-blue-900/30 hover:border-blue-700 px-1.5 py-0.5 rounded transition-colors">
                                {ajustesEntradas.length} ajuste{ajustesEntradas.length > 1 ? "s" : ""}
                              </button>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs">Fecha: {fmtDate(c.fechaCompromiso)}</p>
                          {c.montoOriginal && c.montoOriginal !== c.monto && (
                            <p className="text-gray-600 text-[10px] mt-0.5">
                              Original: <span className="line-through">{fmt(c.montoOriginal)}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {esEsquema && (
                            <a href={`/api/cuentas-cobrar/${c.id}/recibo`} download
                              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white border border-[#333] hover:border-[#555] px-2 py-1 rounded-lg transition-colors">
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              Recibo
                            </a>
                          )}
                          {c.estado !== "LIQUIDADO" && (
                            <>
                              <button
                                onClick={() => { setAjustando(prev => prev === c.id ? null : c.id); setAjusteMonto(String(c.monto)); setAjusteMotivo(""); setAjusteFecha(c.fechaCompromiso.slice(0, 10)); setPagando(null); }}
                                title="Editar"
                                className={`text-[10px] border px-2 py-1 rounded-lg transition-colors ${ajustando === c.id ? "bg-orange-900/30 border-orange-700 text-orange-300" : "text-gray-400 hover:text-white border-[#333] hover:border-[#555]"}`}>
                                ✏ Editar
                              </button>
                              {esEsquema && (
                                <button onClick={() => eliminarCxC(c.id)}
                                  className="text-red-500/60 hover:text-red-400 text-[10px] border border-red-900/30 hover:border-red-700 px-2 py-1 rounded-lg transition-colors">
                                  ✕
                                </button>
                              )}
                            </>
                          )}
                          {c.montoCobrado > 0 && c.estado !== "LIQUIDADO" ? (
                            <div className="text-right">
                              <span className="text-yellow-400 font-semibold">{fmt(c.monto - c.montoCobrado)}</span>
                              <span className="text-gray-500 text-[10px] block">restante de {fmt(c.monto)}</span>
                            </div>
                          ) : (
                            <span className="text-white font-semibold">{fmt(c.monto)}</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            c.estado === "LIQUIDADO" ? "bg-green-900/50 text-green-300" :
                            c.estado === "VENCIDO" ? "bg-red-900/50 text-red-300" :
                            c.estado === "PARCIAL" ? "bg-blue-900/50 text-blue-300" :
                            "bg-yellow-900/30 text-yellow-400"
                          }`}>{c.estado}</span>
                        </div>
                      </div>

                      {/* Cobrado parcial */}
                      {c.montoCobrado > 0 && c.estado !== "LIQUIDADO" && (
                        <p className="text-green-600 text-xs mb-2">✓ Cobrado: {fmt(c.montoCobrado)}</p>
                      )}

                      {/* Inline: editar */}
                      {ajustando === c.id && (
                        <div className="mt-2 bg-[#0a0a0a] border border-orange-900/30 rounded-lg p-3 space-y-2">
                          <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider">Editar cobro</p>
                          <div className="flex gap-2 flex-wrap items-start">
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">Monto</label>
                              <input type="number" value={ajusteMonto} onChange={e => { setAjusteMonto(e.target.value); setAjusteRegistrarExtra(false); }}
                                placeholder="0.00" min="0" step="0.01"
                                className="w-36 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white text-sm font-semibold focus:outline-none focus:border-orange-600" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">Fecha compromiso</label>
                              <input type="date" value={ajusteFecha} onChange={e => setAjusteFecha(e.target.value)}
                                className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-orange-600" />
                            </div>
                            {parseFloat(ajusteMonto) !== c.monto && (
                              <div className="flex-1 min-w-[200px]">
                                <label className="text-[10px] text-gray-500 block mb-1">Motivo del ajuste <span className="text-red-500">*</span></label>
                                <textarea value={ajusteMotivo} onChange={e => setAjusteMotivo(e.target.value)}
                                  placeholder="Explica brevemente por qué se ajusta este monto..."
                                  rows={2}
                                  className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-orange-600 resize-none" />
                              </div>
                            )}
                          </div>

                          {/* Extra como gasto operativo — solo si el monto sube */}
                          {parseFloat(ajusteMonto) > c.monto && (
                            <div className="border border-[#2a2a2a] rounded-lg p-2.5 space-y-2 bg-[#111]">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={ajusteRegistrarExtra} onChange={e => setAjusteRegistrarExtra(e.target.checked)}
                                  className="w-3.5 h-3.5 accent-orange-500" />
                                <span className="text-xs text-gray-300">
                                  Registrar excedente de <span className="text-orange-400 font-semibold">{fmt(parseFloat(ajusteMonto) - c.monto)}</span> como gasto operativo
                                </span>
                              </label>
                              {ajusteRegistrarExtra && (
                                <div className="flex gap-2 flex-wrap ml-5">
                                  <div>
                                    <label className="text-[10px] text-gray-500 block mb-1">Tipo</label>
                                    <select value={ajusteExtraTipo} onChange={e => setAjusteExtraTipo(e.target.value)}
                                      className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-orange-600">
                                      <option value="OTRO">Otro / Extra</option>
                                      <option value="TRANSPORTE">Transporte</option>
                                      <option value="COMIDA">Comida</option>
                                      <option value="HOSPEDAJE">Hospedaje</option>
                                    </select>
                                  </div>
                                  <div className="flex-1 min-w-[180px]">
                                    <label className="text-[10px] text-gray-500 block mb-1">Concepto del gasto <span className="text-red-500">*</span></label>
                                    <input type="text" value={ajusteExtraConcepto} onChange={e => setAjusteExtraConcepto(e.target.value)}
                                      placeholder="Ej: Honorarios extra técnico / Material imprevistos..."
                                      className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-orange-600" />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button onClick={() => ajustarMontoCxC(c.id, c.monto)}
                              className="bg-orange-700 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors">
                              Guardar
                            </button>
                            <button onClick={() => { setAjustando(null); setAjusteFecha(""); setAjusteRegistrarExtra(false); setAjusteExtraConcepto(""); }} className="text-gray-500 text-xs hover:text-white">Cancelar</button>
                          </div>
                        </div>
                      )}

                      {/* Historial de ajustes */}
                      {ajusteHistorial === c.id && tieneAjustes && (
                        <div className="mt-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
                          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Historial de ajustes</p>
                          <div className="space-y-1.5">
                            {ajustesEntradas.map((a, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className="text-gray-600 text-[10px] shrink-0 mt-0.5">{(() => { const iso = typeof a.fecha === "string" ? a.fecha : (a.fecha as Date).toISOString(); const [y, m, d] = iso.substring(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }); })()}</span>
                                <div className="flex-1">
                                  <span className="text-red-400 line-through">{fmt(a.de)}</span>
                                  <span className="text-gray-600 mx-1">→</span>
                                  <span className="text-white font-semibold">{fmt(a.a)}</span>
                                  <p className="text-gray-500 text-[10px] mt-0.5">{a.motivo}</p>
                                  <p className="text-gray-700 text-[10px]">por {a.usuario}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Registrar cobro */}
                      {c.estado !== "LIQUIDADO" && ajustando !== c.id && (
                        pagando === c.id ? (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <input type="number" value={montoPago} onChange={e => setMontoPago(e.target.value)}
                              placeholder={String(c.monto - c.montoCobrado)} className="w-28 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                            <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                              className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none" />
                            <Combobox
                              value={cuentaPagoId}
                              onChange={v => setCuentaPagoId(v)}
                              options={[{ value: "", label: "— Cuenta —" }, ...cuentasBancarias.map(cu => ({ value: cu.id, label: cu.nombre + (cu.banco ? ` · ${cu.banco}` : "") }))]}
                              className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                            />
                            <Combobox
                              value={metodoPagoFinanzas}
                              onChange={v => setMetodoPagoFinanzas(v)}
                              options={[{ value: "TRANSFERENCIA", label: "Transferencia" }, { value: "EFECTIVO", label: "Efectivo" }, { value: "TARJETA", label: "Tarjeta" }, { value: "CHEQUE", label: "Cheque" }]}
                              className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                            />
                            <button onClick={() => registrarPagoCxC(c.id)}
                              className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded transition-colors">Confirmar</button>
                            <button onClick={() => setPagando(null)} className="text-gray-500 text-xs hover:text-white">Cancelar</button>
                          </div>
                        ) : (
                          <button onClick={() => { setPagando(c.id); setMontoPago(String(c.monto - c.montoCobrado)); setAjustando(null); setCuentaPagoId(""); setMetodoPagoFinanzas("TRANSFERENCIA"); }}
                            className="text-xs text-green-400 hover:text-green-300 border border-green-800 hover:border-green-600 px-3 py-1 rounded-lg transition-colors">
                            + Registrar cobro
                          </button>
                        )
                      )}
                      {c.estado === "LIQUIDADO" && (
                        <button onClick={() => anularMovimiento(c.id, "cobro")} disabled={anulando === c.id}
                          className="text-[11px] text-red-400/60 border border-red-900/30 hover:border-red-700 hover:text-red-400 px-2 py-0.5 rounded transition-colors disabled:opacity-40 mt-1">
                          {anulando === c.id ? "Anulando..." : "Anular cobro"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Pagos a personal */}
          <div className="ms-table-wrapper">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Pagos a personal</h3>
              {proyecto.personal.some(p => !p.tarifaAcordada) && proyecto.cotizacion && (
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/proyectos/${id}/sincronizar-tarifas`, { method: "POST" });
                    const d = await res.json();
                    if (res.ok) {
                      toast.success(`${d.actualizados} tarifa(s) sincronizada(s) desde la cotización.`);
                      const r2 = await fetch(`/api/proyectos/${id}`, { cache: "no-store" });
                      const d2 = await r2.json();
                      if (d2.proyecto) setProyecto(d2.proyecto);
                    } else {
                      toast.error(d.error ?? "Error al sincronizar");
                    }
                  }}
                  className="text-xs text-gray-400 hover:text-white border border-[#333] hover:border-[#555] px-3 py-1 rounded-lg transition-colors"
                >
                  Sincronizar tarifas
                </button>
              )}
            </div>

            {/* Tabla de personal — estilo pagos a personal */}
            {(() => {
              const TIPO_COLOR: Record<string, string> = {
                MONTAJE: "text-blue-400", OPERACION: "text-[#B3985B]",
                DESMONTAJE: "text-purple-400", TRANSPORTE: "text-cyan-400", OTRO: "text-gray-400",
              };
              const TIPO_LABEL: Record<string, string> = {
                MONTAJE: "Montaje", OPERACION: "Operación", DESMONTAJE: "Desmontaje",
                TRANSPORTE: "Transporte", OTRO: "Otro",
              };
              const JORNADA_LABEL: Record<string, string> = {
                COMPLETA: "Completa", MEDIA: "Media", CUARTO: "Cuarto",
              };
              const personal = proyecto.personal;
              const totalPersonal = personal.reduce((s, p) => s + (p.tarifaAcordada ?? 0), 0);
              const hayPendientes = personal.some(p => p.tecnico && p.estadoPago !== "PAGADO");

              // Agrupar por participacion
              const grupos = new Map<string, NonNullable<typeof proyecto>["personal"]>();
              const ORDER = ["MONTAJE", "OPERACION", "DESMONTAJE", "TRANSPORTE", "OTRO"];
              for (const p of personal) {
                const key = p.participacion ?? "OTRO";
                if (!grupos.has(key)) grupos.set(key, []);
                grupos.get(key)!.push(p);
              }
              const gruposOrdenados = ORDER
                .filter(k => grupos.has(k))
                .map(k => [k, grupos.get(k)!] as [string, typeof personal]);

              if (personal.length === 0) return (
                <p className="text-gray-600 text-sm text-center py-6 italic">Sin personal registrado</p>
              );

              return (
                <>
                  {/* Headers */}
                  <div className="grid grid-cols-[1fr_1fr_72px_80px_72px] gap-2 px-5 py-1.5 border-b border-[#0d0d0d]">
                    {["Técnico", "Rol", "Jornada", "Tarifa", "Estado"].map(h => (
                      <p key={h} className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">{h}</p>
                    ))}
                  </div>

                  {gruposOrdenados.map(([tipo, slots]) => (
                    <div key={tipo}>
                      <div className="px-5 py-1.5 bg-[#0d0d0d] flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${TIPO_COLOR[tipo] ?? "text-gray-400"}`}>
                          {TIPO_LABEL[tipo] ?? tipo}
                        </span>
                        <span className="text-[10px] text-gray-700 ml-auto">{slots.length} técnico{slots.length !== 1 ? "s" : ""}</span>
                      </div>
                      {slots.map(p => {
                        const nombre = p.tecnico?.nombre ?? "Sin asignar";
                        const rol = p.rolTecnico?.nombre ?? p.tecnico?.rol?.nombre ?? "—";
                        const pagado = p.estadoPago === "PAGADO";
                        const marcando = marcandoPago.has(p.id);
                        return (
                          <div key={p.id} className="grid grid-cols-[1fr_1fr_72px_80px_72px] gap-2 px-5 py-2.5 border-b border-[#0d0d0d] last:border-0 items-center">
                            <p className={`text-sm truncate ${p.tecnico ? "text-white" : "text-yellow-500 italic"}`}>{nombre}</p>
                            <p className="text-xs text-gray-400 truncate">{rol}</p>
                            <p className="text-xs text-gray-500">{JORNADA_LABEL[p.jornada ?? ""] ?? p.jornada ?? "—"}</p>
                            <p className={`text-sm font-medium text-right ${p.tarifaAcordada != null ? "text-white" : "text-gray-600"}`}>
                              {p.tarifaAcordada != null ? fmt(p.tarifaAcordada) : "—"}
                            </p>
                            <div className="flex justify-end">
                              <button
                                onClick={() => p.tecnico && togglePagoPersonal(p.id, p.estadoPago)}
                                disabled={marcando || !p.tecnico}
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
                                  !p.tecnico ? "text-gray-700" :
                                  pagado ? "bg-green-900/40 text-green-400 hover:bg-red-900/30 hover:text-red-400" :
                                  "bg-yellow-900/30 text-yellow-400 hover:bg-green-900/30 hover:text-green-400"
                                } ${marcando ? "opacity-40" : ""}`}>
                                {!p.tecnico ? "—" : pagado ? "Pagado" : "Pend."}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Footer con presupuesto/real/diferencia */}
                  {(() => {
                    const presupuesto = proyecto.cotizacion?.subtotalOperacion ?? 0;
                    const real = totalPersonal;
                    const diff = presupuesto - real;
                    return (
                      <div className="px-5 py-3 bg-[#0d0d0d] border-t border-[#111] flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-5 flex-wrap">
                          {presupuesto > 0 && (
                            <>
                              <span className="text-xs text-gray-500">Presupuesto: <span className="text-gray-300">{fmt(presupuesto)}</span></span>
                              <span className="text-xs text-gray-500">Real: <span className="text-white font-semibold">{fmt(real)}</span></span>
                              <span className={`text-xs font-semibold ${diff >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {diff >= 0 ? `+${fmt(diff)}` : fmt(diff)}
                              </span>
                            </>
                          )}
                          {presupuesto === 0 && (
                            <span className="text-xs text-gray-500">Total personal: <span className="text-white font-semibold">{fmt(real)}</span></span>
                          )}
                        </div>
                        {hayPendientes && (
                          <button onClick={marcarTodosPagado}
                            className="text-xs bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold px-3 py-1.5 rounded-lg transition-colors">
                            Marcar todos pagado
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </>
              );
            })()}
          </div>

          {/* ── Gastos del proyecto ── */}
          {(() => {
            const cot = proyecto.cotizacion;
            // Bloque 1: Referencia cotización
            const TIPO_LABEL: Record<string, string> = {
              EQUIPO_EXTERNO: "Proveedores externos",
              OPERACION_TECNICA: "Operación técnica",
              COMIDA: "Comidas",
              TRANSPORTE: "Transporte",
              HOSPEDAJE: "Hospedaje",
              OTRO: "Otros",
            };
            type LinCot = { id: string; tipo: string; descripcion: string; cantidad: number; dias?: number; precioUnitario: number };
            const lineasConCosto: LinCot[] = (cot?.lineas ?? []).filter(l =>
              l.precioUnitario > 0 && !["EQUIPO_PROPIO","DESCUENTO_BENEFICIO","PAQUETE"].includes(l.tipo)
            );
            const grouped: Record<string, LinCot[]> = {};
            for (const l of lineasConCosto) {
              const key = ["EQUIPO_EXTERNO","OPERACION_TECNICA","COMIDA","TRANSPORTE","HOSPEDAJE"].includes(l.tipo) ? l.tipo : "OTRO";
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(l);
            }
            const estimadoTotal = cot
              ? cot.subtotalComidas + cot.subtotalOperacion + cot.subtotalTransporte + cot.subtotalHospedaje + cot.subtotalTerceros
              : 0;

            // Bloque 2: Gastos registrados
            const cxpGastos = proyecto.cuentasPagar.filter(c => c.tipoAcreedor !== "TECNICO" && c.estado !== "LIQUIDADO");
            const pagados = proyecto.movimientos;
            const totalPendiente = cxpGastos.reduce((s, c) => s + c.monto, 0);
            const totalPagado = pagados.reduce((s, m) => s + m.monto, 0);
            // Equipos externos con costo registrado (fuente: campo costoExterno en rider)
            const costoEquipExt = (proyecto.equipos ?? []).reduce(
              (s: number, e: { costoExterno: number | null; cantidad: number }) => s + (e.costoExterno ?? 0) * e.cantidad, 0
            );
            const totalGastosProy = totalPendiente + totalPagado + costoEquipExt;

            // Bloque 3: Desviacion
            const desviacion = totalGastosProy - estimadoTotal;
            const pctDesviacion = estimadoTotal > 0 ? (desviacion / estimadoTotal) * 100 : 0;

            return (
              <div className="ms-table-wrapper">

                {/* Header */}
                <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Gastos del proyecto</h3>
                    {totalGastosProy > 0 && <span className="text-xs text-gray-500">{fmt(totalGastosProy)}</span>}
                  </div>
                  <button onClick={() => {
                    setGastoEstado("PENDIENTE"); setGastoConcepto(""); setGastoMonto("");
                    setGastoFecha(new Date().toISOString().split("T")[0]); setGastoNotas("");
                    setGastoProveedor(""); setGastoMetodo("TRANSFERENCIA"); setGastoCuenta("");
                    setGastoReferencia(""); setGastoCategoria(""); setShowGastoModal(true);
                  }} className="text-xs text-[#B3985B] hover:text-white border border-[#B3985B]/40 hover:border-[#B3985B] px-3 py-1 rounded-lg transition-colors shrink-0">
                    + Agregar gasto
                  </button>
                </div>

                {/* Bloque 1: Referencia cotizacion */}
                {cot && (
                  <div className="border-b border-[#1a1a1a]">
                    <button onClick={() => setRefCotOpen(v => !v)}
                      className="w-full px-5 py-2.5 bg-[#0a0a0a] flex items-center justify-between hover:bg-[#0d0d0d] transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-gray-600 uppercase tracking-[0.12em] font-semibold shrink-0">Referencia — {cot.numeroCotizacion}</span>
                        <span className="text-gray-700 text-[10px]">·</span>
                        <span className="text-[10px] text-gray-700">Estimado costos: {fmt(estimadoTotal)}</span>
                      </div>
                      <span className="text-gray-600 text-[10px] shrink-0 ml-2">{refCotOpen ? "▲ Colapsar" : "▼ Ver"}</span>
                    </button>
                    {refCotOpen && (
                      <div className="px-5 pt-3 pb-4 bg-[#0a0a0a] space-y-3">
                        {lineasConCosto.length === 0 ? (
                          <p className="text-xs text-gray-700 italic">Sin líneas de costo en la cotización</p>
                        ) : (
                          Object.entries(grouped).map(([tipo, lineas]) => {
                            const grupoTotal = lineas.reduce((s, l) => s + l.precioUnitario * l.cantidad * (l.dias || 1), 0);
                            return (
                              <div key={tipo}>
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{TIPO_LABEL[tipo] ?? "Otros"}</p>
                                  <span className="text-[10px] text-gray-400 font-semibold">{fmt(grupoTotal)}</span>
                                </div>
                                {lineas.map(l => (
                                  <div key={l.id} className="flex items-center justify-between py-0.5 pl-3">
                                    <span className="text-xs text-gray-600 truncate mr-2">· {l.descripcion}{l.cantidad > 1 ? ` ×${Math.round(l.cantidad)}` : ""}{(l.dias ?? 1) > 1 ? ` · ${l.dias}d` : ""}</span>
                                    <span className="text-xs text-gray-600 shrink-0">{fmt(l.precioUnitario * l.cantidad * (l.dias || 1))}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Bloque 2: POR PAGAR */}
                {cxpGastos.length > 0 && (
                  <div>
                    <div className="px-5 pt-3 pb-1 flex items-center justify-between border-b border-[#1a1a1a]">
                      <p className="text-[10px] text-yellow-600/90 uppercase tracking-[0.12em] font-semibold">Por pagar</p>
                      <span className="text-xs text-yellow-400 font-semibold">{fmt(totalPendiente)}</span>
                    </div>
                    {cxpGastos.map(c => (
                      <div key={c.id} className="px-5 py-3 border-b border-[#1a1a1a]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-white">{c.concepto}</span>
                              {c.tipoAcreedor !== "OTRO" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-600 shrink-0">{c.tipoAcreedor}</span>
                              )}
                            </div>
                            {c.fechaCompromiso && (
                              <p className="text-xs text-gray-600 mt-0.5">Fecha estimada: {fmtDate(c.fechaCompromiso)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm text-yellow-400 font-semibold">{fmt(c.monto)}</span>
                            <button onClick={() => abrirEditarCxP(c)} className="text-gray-600 hover:text-[#B3985B] text-xs transition-colors">✎</button>
                            <button onClick={() => eliminarCxP(c.id)} className="text-gray-700 hover:text-red-400 text-xs transition-colors">✕</button>
                          </div>
                        </div>
                        <div className="mt-2">
                          {marcarPagadoId === c.id ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-gray-500">Fecha en que se pagó:</span>
                              <input type="date" value={marcarPagadoFecha} onChange={e => setMarcarPagadoFecha(e.target.value)}
                                className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                              <button onClick={() => marcarPagadoGasto(c.id)} disabled={savingMarcarPagado}
                                className="bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1 rounded transition-colors">
                                {savingMarcarPagado ? "..." : "Confirmar pago"}
                              </button>
                              <button onClick={() => setMarcarPagadoId(null)} className="text-gray-500 text-xs hover:text-white">Cancelar</button>
                            </div>
                          ) : (
                            <button onClick={() => { setMarcarPagadoId(c.id); setMarcarPagadoFecha(new Date().toISOString().split("T")[0]); }}
                              className="text-xs text-green-600 hover:text-green-400 border border-green-900/40 hover:border-green-700 px-3 py-1 rounded-lg transition-colors">
                              ✓ Marcar pagado
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bloque 2: PAGADOS */}
                {pagados.length > 0 && (
                  <div>
                    <div className="px-5 pt-3 pb-1 flex items-center justify-between border-b border-[#1a1a1a]">
                      <p className="text-[10px] text-green-700/90 uppercase tracking-[0.12em] font-semibold">Pagados</p>
                      <span className="text-xs text-green-400 font-semibold">{fmt(totalPagado)}</span>
                    </div>
                    {pagados.map(g => (
                      <div key={g.id} className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white text-sm">{g.concepto}</p>
                            {g.categoria && <span className="text-xs px-1.5 py-0.5 bg-[#222] text-gray-400 rounded">{g.categoria.nombre}</span>}
                            {g.proveedor && <span className="text-xs px-1.5 py-0.5 bg-blue-900/30 text-blue-400 rounded">{g.proveedor.empresa || g.proveedor.nombre}</span>}
                          </div>
                          <p className="text-gray-600 text-xs">Pagó {fmtDate(g.fecha)} · {g.metodoPago}{g.cuentaOrigen ? ` · ${g.cuentaOrigen.nombre}` : ""}{g.referencia ? ` · Ref: ${g.referencia}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => abrirEditarGasto(g)}
                            className="text-xs text-gray-500 hover:text-[#B3985B] border border-[#333] hover:border-[#555] px-2 py-1 rounded transition-colors">Editar</button>
                          <button onClick={() => eliminarMovimiento(g.id)}
                            className="text-gray-700 hover:text-red-400 text-xs transition-colors">✕</button>
                          <span className="text-green-400 font-semibold text-sm">{fmt(g.monto)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {cxpGastos.length === 0 && pagados.length === 0 && (
                  <div className="px-5 py-10 text-center">
                    <p className="text-gray-600 text-sm">Sin gastos registrados</p>
                    <p className="text-gray-700 text-xs mt-1">Usa "+ Agregar gasto" para registrar un pago pendiente o ya realizado</p>
                  </div>
                )}

                {/* Bloque 3: Resumen de desviacion */}
                <div className={`px-5 py-3 border-t border-[#1a1a1a] bg-[#0a0a0a] grid gap-4 ${cot && estimadoTotal > 0 ? "grid-cols-3" : "grid-cols-1"}`}>
                  {cot && estimadoTotal > 0 && (
                    <div className="text-center">
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Estimado (cotización)</p>
                      <p className="text-sm text-gray-300 font-semibold">{fmt(estimadoTotal)}</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Real registrado</p>
                    <p className="text-sm text-white font-semibold">{fmt(totalGastosProy)}</p>
                    <p className="text-[10px] text-gray-700 mt-0.5">{fmt(totalPendiente)} pendiente + {fmt(totalPagado)} pagado</p>
                  </div>
                  {cot && estimadoTotal > 0 && (
                    <div className="text-center">
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Desviación</p>
                      <p className={`text-sm font-bold ${desviacion > 0 ? "text-red-400" : desviacion < 0 ? "text-green-400" : "text-gray-400"}`}>
                        {desviacion === 0 ? "Sin desviación" : `${desviacion > 0 ? "+" : ""}${fmt(desviacion)}`}
                        {desviacion !== 0 && (
                          <span className="text-xs ml-1 font-normal">({desviacion > 0 ? "+" : ""}{pctDesviacion.toFixed(0)}%)</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── Cierre financiero ── */}
          {(() => {
            const cierreReqs = [
              { ok: !!proyecto.cotizacion, label: "Cotización generada" },
              { ok: proyecto.personal.some(p => p.confirmado), label: "Personal confirmado" },
              { ok: proyecto.cuentasCobrar.length > 0, label: "CxC configurada" },
            ];
            const cierreReady = cierreReqs.every(r => r.ok) || !!proyecto.cierreFinanciero;
            return (
              <div className="ms-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold text-sm">Cierre financiero</h3>
                    <p className="text-gray-600 text-xs mt-0.5">Comparativa real vs estimado al cerrar el proyecto</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!cierreReady) {
                        const faltantes = cierreReqs.filter(r => !r.ok).map(r => r.label).join(", ");
                        toast.error(`Completa antes de cerrar: ${faltantes}`);
                        return;
                      }
                      await loadCierre(); setShowCierreModal(true);
                    }}
                    disabled={loadingCierre}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${cierreReady ? "bg-[#B3985B] text-black hover:bg-[#c9a96a]" : "bg-[#1a1a1a] text-gray-500 border border-[#333] cursor-not-allowed"}`}
                  >
                    {loadingCierre ? "Calculando..." : proyecto.cierreFinanciero ? "Ver cierre" : "Generar cierre"}
                  </button>
                </div>
                {!proyecto.cierreFinanciero && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {cierreReqs.map(r => (
                      <span key={r.label} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.ok ? "bg-green-900/30 text-green-400" : "bg-[#1a1a1a] text-gray-600"}`}>
                        {r.ok ? "✓" : "○"} {r.label}
                      </span>
                    ))}
                  </div>
                )}
                {proyecto.cierreFinanciero && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Cobrado real</p>
                        <p className="text-white font-bold text-sm">{fmt(proyecto.cierreFinanciero.totalCobrado)}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">Est. {fmt(proyecto.cierreFinanciero.granTotalEstimado)}</p>
                      </div>
                      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Gastado real</p>
                        <p className="text-red-400 font-bold text-sm">{fmt(proyecto.cierreFinanciero.totalGastado)}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">Est. {fmt(proyecto.cierreFinanciero.costoEstimado)}</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center border ${proyecto.cierreFinanciero.utilidadReal >= 0 ? "bg-green-950/20 border-green-900/30" : "bg-red-950/20 border-red-900/30"}`}>
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Utilidad real</p>
                        <p className={`font-bold text-sm ${proyecto.cierreFinanciero.utilidadReal >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(proyecto.cierreFinanciero.utilidadReal)}</p>
                        <p className={`text-[10px] mt-0.5 font-semibold ${proyecto.cierreFinanciero.margenReal >= 20 ? "text-green-500" : proyecto.cierreFinanciero.margenReal >= 0 ? "text-yellow-500" : "text-red-500"}`}>{proyecto.cierreFinanciero.margenReal.toFixed(1)}% margen</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-700">
                        Cerrado el {new Date(proyecto.cierreFinanciero.cerradoEn).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                      <button
                        onClick={async () => { await loadCierre(); setShowCierreModal(true); }}
                        disabled={loadingCierre}
                        className="text-[10px] text-gray-600 hover:text-[#B3985B] transition-colors disabled:opacity-40"
                      >
                        {loadingCierre ? "Calculando..." : "↻ Recalcular cierre"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Liquidación a inversionistas por uso de equipos propios ── */}
          <div className="ms-table-wrapper">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">
                Liquidación a inversionistas · Equipos propios
              </h3>
              <button onClick={loadPagoSocios} disabled={loadingPagoSocios}
                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-40">
                {loadingPagoSocios ? "Calculando..." : "↻ Recalcular"}
              </button>
            </div>

            {loadingPagoSocios ? (
              <div className="p-5 space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-[#1a1a1a] rounded animate-pulse" />)}
              </div>
            ) : !pagoSocios ? (
              <div className="p-5 text-center">
                <p className="text-gray-600 text-sm">Sin cotización asociada o sin equipos propios en la cotización.</p>
              </div>
            ) : (
              <div className="p-5 space-y-5">

                {/* Tabla de tiers */}
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Tabla de viabilidad → % al inversionista</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {pagoSocios.tiers.map(t => (
                      <div key={t.min} className={`rounded-lg p-3 border text-center transition-all ${
                        t.activo
                          ? t.color === "emerald" ? "border-emerald-700/60 bg-emerald-900/20"
                          : t.color === "green"   ? "border-green-700/60 bg-green-900/20"
                          : t.color === "yellow"  ? "border-yellow-700/60 bg-yellow-900/20"
                          : "border-[#2a2a2a] bg-[#0f0f0f]"
                          : "border-[#1e1e1e] bg-[#0d0d0d] opacity-50"
                      }`}>
                        <p className={`text-xs font-bold mb-0.5 ${
                          t.activo
                            ? t.color === "emerald" ? "text-emerald-400"
                            : t.color === "green"   ? "text-green-400"
                            : t.color === "yellow"  ? "text-yellow-400"
                            : "text-gray-500"
                            : "text-gray-600"
                        }`}>{(t.pct * 100).toFixed(0)}%</p>
                        <p className="text-[10px] text-gray-500">{t.label}</p>
                        {t.activo && <div className="mt-1 w-full h-0.5 rounded-full bg-current opacity-40" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Viabilidad + equipos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="ms-card-deep p-4">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Viabilidad de cotización</p>
                    <div className="flex items-baseline gap-2">
                      <p className="ms-h1 tabular-nums">{pagoSocios.viabilidad.pctFormateado}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        pagoSocios.viabilidad.tier.color === "emerald" ? "bg-emerald-900/30 text-emerald-400"
                        : pagoSocios.viabilidad.tier.color === "green"   ? "bg-green-900/30 text-green-400"
                        : pagoSocios.viabilidad.tier.color === "yellow"  ? "bg-yellow-900/30 text-yellow-400"
                        : "bg-gray-800/50 text-gray-500"
                      }`}>{pagoSocios.viabilidad.tier.label}</span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">Porcentaje automático: {pagoSocios.viabilidad.tier.pctFormateado}</p>
                  </div>

                  <div className="ms-card-deep p-4">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                      Equipos propios en cotización ({pagoSocios.equipoPropio.lineas.length})
                    </p>
                    <p className="ms-h1 tabular-nums">{fmt(pagoSocios.equipoPropio.total)}</p>
                    <p className="text-[10px] text-gray-600 mt-1">Total generado por equipos propios</p>
                  </div>
                </div>

                {/* Detalle equipos */}
                {pagoSocios.equipoPropio.lineas.length > 0 && (
                  <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#1a1a1a] text-gray-500">
                          <th className="text-left px-4 py-2 font-medium">Equipo</th>
                          <th className="text-right px-3 py-2 font-medium">Cant.</th>
                          <th className="text-right px-3 py-2 font-medium">P. Unitario</th>
                          <th className="text-right px-4 py-2 font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#161616]">
                        {pagoSocios.equipoPropio.lineas.map(l => (
                          <tr key={l.id} className="hover:bg-[#0d0d0d]">
                            <td className="px-4 py-2 text-white">{l.descripcion}{l.marca ? ` · ${l.marca}` : ""}</td>
                            <td className="px-3 py-2 text-right text-gray-400 tabular-nums">{l.cantidad}</td>
                            <td className="px-3 py-2 text-right text-gray-400 tabular-nums">{fmt(l.precioUnitario)}</td>
                            <td className="px-4 py-2 text-right text-[#B3985B] font-semibold tabular-nums">{fmt(l.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-[#222]">
                          <td colSpan={3} className="px-4 py-2 text-right text-gray-500 text-xs">Total equipos propios</td>
                          <td className="px-4 py-2 text-right text-white font-bold tabular-nums">{fmt(pagoSocios.equipoPropio.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Configuración de pago */}
                <div className="border border-[#B3985B]/20 rounded-xl p-4 space-y-4">
                  <p className="text-[10px] text-[#B3985B] uppercase tracking-wider font-semibold">Generar cuenta por pagar</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">% al inversionista</label>
                      <div className="relative">
                        <input type="number" value={pctOverride} min={0} max={100} step={1}
                          onChange={e => setPctOverride(e.target.value)}
                          className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 pr-7 text-white text-sm focus:outline-none focus:border-[#B3985B]/50" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1">Automático: {pagoSocios.viabilidad.tier.pctFormateado}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Fecha de compromiso</label>
                      <input type="date" value={fechaCompromisoSocio}
                        onChange={e => setFechaCompromisoSocio(e.target.value)}
                        className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Monto calculado</label>
                      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-[#B3985B] text-sm font-bold tabular-nums">
                        {fmt(pagoSocios.equipoPropio.total * ((parseFloat(pctOverride) || 0) / 100))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Notas (opcional)</label>
                    <input value={notasPagoSocio} onChange={e => setNotasPagoSocio(e.target.value)}
                      placeholder="Observaciones sobre el pago..."
                      className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]/50 placeholder-gray-700" />
                  </div>

                  {/* Inversionistas */}
                  {pagoSocios.socios.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-600 text-xs">No hay inversionistas activos registrados en el módulo de Socios.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pagoSocios.socios.map(socio => {
                        const monto = pagoSocios.equipoPropio.total * ((parseFloat(pctOverride) || 0) / 100);
                        const cxp = socio.cxpExistente;
                        return (
                          <div key={socio.id} className="flex items-center gap-3 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium">{socio.nombre}</p>
                              <p className="text-gray-600 text-[10px]">Inversionista · {socio.tipo === "FISICA" ? "Persona física" : "Persona moral"}</p>
                            </div>
                            {cxp ? (
                              <div className="text-right shrink-0">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  cxp.estado === "LIQUIDADO" ? "bg-green-900/30 text-green-400"
                                  : cxp.estado === "PARCIAL"  ? "bg-yellow-900/30 text-yellow-400"
                                  : "bg-orange-900/20 text-orange-400"
                                }`}>{cxp.estado}</span>
                                <p className="text-[10px] text-gray-500 mt-0.5">{fmt(cxp.monto)} generado</p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <p className="text-[#B3985B] font-bold text-sm tabular-nums">{fmt(monto)}</p>
                                  <p className="text-[10px] text-gray-600">{pctOverride}% de equipos propios</p>
                                </div>
                                <button
                                  onClick={() => generarPagoSocio(socio.id)}
                                  disabled={savingPagoSocio === socio.id || monto <= 0 || !fechaCompromisoSocio}
                                  className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                                >
                                  {savingPagoSocio === socio.id ? "Generando..." : "Generar CxP"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>
        );
      })()}
          </div>
        )}

        </div>{/* /left column */}

        {/* Right sidebar — 30% */}
        <div className="w-full md:w-72 shrink-0 space-y-3 md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto md:overflow-x-hidden md:pr-1">

          {/* Cliente card */}
          <div className="ms-card p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-600">Cliente</p>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/crm/clientes/${proyecto.cliente.id}`} className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors truncate block">
                  {proyecto.cliente.nombre}
                </Link>
                {proyecto.cliente.empresa && (
                  <p className="text-gray-600 text-xs truncate">{proyecto.cliente.empresa}</p>
                )}
              </div>
              {proyecto.cliente.telefono && (() => {
                const tel = proyecto.cliente.telefono!.replace(/^p:/i, '').replace(/[^\d+]/g, '');
                const nombre = proyecto.cliente.nombre.split(' ')[0];
                const tipoEvento = proyecto.tipoEvento ?? '';
                const msgs: Record<string, string> = {
                  MUSICAL: `Hola ${nombre}, te escribo de Mainstage Pro sobre tu evento musical.`,
                  SOCIAL: `Hola ${nombre}, te escribo de Mainstage Pro sobre tu evento.`,
                  EMPRESARIAL: `Hola ${nombre}, te escribo de Mainstage Pro sobre tu evento corporativo.`,
                };
                const msg = msgs[tipoEvento] ?? `Hola ${nombre}, te escribo de Mainstage Pro.`;
                const waUrl = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
                return (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-900/20 border border-green-800/30 text-green-500 hover:bg-green-900/30 transition-colors text-[11px] font-medium">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WA
                  </a>
                );
              })()}
            </div>
          </div>

          {/* Proyecto info card — solo datos no repetidos en el header */}
          <div className="ms-stat-card space-y-2.5">
            <p className="text-[10px] uppercase tracking-wider text-gray-600">Proyecto</p>
            <div className="space-y-2">
              {!esRenta && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-600 shrink-0">Coordinador</span>
                  <span className="text-[11px] text-gray-300 text-right truncate">{proyecto.encargado?.name ?? "— Sin asignar —"}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600">Creado</span>
                <span className="text-[11px] text-gray-400">{new Date(proyecto.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Documentos card */}
          <div className="ms-stat-card space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-3">Documentos</p>
            <div className="space-y-1.5">
              {esRenta && (
                <button
                  onClick={() => downloadPdf(`/api/proyectos/${proyecto.id}/hoja-entrega`, `hoja-entrega-${proyecto.numeroProyecto}.pdf`)}
                  disabled={downloading === `hoja-entrega-${proyecto.numeroProyecto}.pdf`}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#444] text-xs font-medium transition-colors disabled:opacity-60"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  {downloading === `hoja-entrega-${proyecto.numeroProyecto}.pdf` ? 'Generando...' : 'Hoja de Entrega'}
                </button>
              )}
              <button
                onClick={() => downloadPdf(`/api/proyectos/${proyecto.id}/fichas/cliente`, `confirmacion-cliente-${proyecto.numeroProyecto}.pdf`)}
                disabled={!!downloading}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#444] text-xs font-medium transition-colors disabled:opacity-60"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {downloading === `confirmacion-cliente-${proyecto.numeroProyecto}.pdf` ? 'Generando...' : 'Confirmación Cliente'}
              </button>
              {esRenta && (() => {
                let rd: Record<string, string> = {};
                try { if (proyecto.logisticaRenta) rd = JSON.parse(proyecto.logisticaRenta); } catch {}
                const modalidad = rd.entrega ?? rd.modalidadEntrega ?? "";
                const entregamos = modalidad === "ENTREGA_BODEGA" || modalidad === "ENTREGA_VENUE";
                if (!entregamos) return null;
                return (
                  <a
                    href={`/api/proyectos/${proyecto.id}/rider-pdf`}
                    download
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#444] text-xs font-medium transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    Rider de Carga
                  </a>
                );
              })()}
              {!esRenta && (
                <button
                  onClick={() => downloadPdf(`/api/proyectos/${proyecto.id}/fichas/operativa`, `ficha-operativa-${proyecto.numeroProyecto}.pdf`)}
                  disabled={!!downloading}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#444] text-xs font-medium transition-colors disabled:opacity-60"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="11" y2="16"/></svg>
                  {downloading === `ficha-operativa-${proyecto.numeroProyecto}.pdf` ? 'Generando...' : 'Ficha Operativa'}
                </button>
              )}
              {proyecto.tipoServicio === 'PRODUCCION_TECNICA' && (
                <button
                  onClick={() => downloadPdf(`/api/proyectos/${proyecto.id}/brief-tecnico`, `info-tecnicos-${proyecto.numeroProyecto}.pdf`)}
                  disabled={!!downloading}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#444] text-xs font-medium transition-colors disabled:opacity-60"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                  {downloading === `info-tecnicos-${proyecto.numeroProyecto}.pdf` ? 'Generando...' : 'Info para Técnicos'}
                </button>
              )}
              {!esRenta && (
                <Link
                  href={`/carta-responsiva/${proyecto.id}`}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#444] text-xs font-medium transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="11" y2="16"/></svg>
                  Carta Responsiva
                </Link>
              )}
              <div className="border-t border-[#1e1e1e] my-1" />
              <button
                onClick={() => setShowAnuncioCierre(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#444] text-xs font-medium transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Confirmación a Team Mainstage
              </button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="border border-[#1e1e1e] rounded-xl p-4">
            <button
              onClick={async () => {
                const ok = await confirm({ message: `¿Eliminar el proyecto "${proyecto.nombre}"? Esta acción no se puede deshacer.`, danger: true, confirmText: 'Eliminar proyecto' });
                if (!ok) return;
                await fetch(`/api/proyectos/${proyecto.id}`, { method: 'DELETE' });
                router.push('/proyectos');
              }}
              className="w-full py-2 rounded-lg border border-red-500/20 text-red-500/60 text-xs font-medium hover:bg-red-500/5 hover:border-red-500/40 hover:text-red-500/80 transition-colors"
            >
              Eliminar proyecto
            </button>
          </div>

        </div>{/* /right sidebar */}

      </div>{/* /two-column layout */}

      {/* ── Modal agregar gasto ── */}
      {showGastoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.80)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowGastoModal(false); }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Agregar gasto</h3>
              <button onClick={() => setShowGastoModal(false)} className="text-gray-600 hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="flex gap-1 p-1 bg-[#0a0a0a] border border-[#222] rounded-xl mb-4">
              <button onClick={() => setGastoEstado("PENDIENTE")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${gastoEstado === "PENDIENTE" ? "bg-yellow-800/60 text-yellow-200" : "text-gray-500 hover:text-gray-300"}`}>
                Por pagar
              </button>
              <button onClick={() => setGastoEstado("PAGADO")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${gastoEstado === "PAGADO" ? "bg-green-900/50 text-green-200" : "text-gray-500 hover:text-gray-300"}`}>
                Ya pagado
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Concepto *</label>
                <input value={gastoConcepto} onChange={e => setGastoConcepto(e.target.value)}
                  placeholder="Ej: Renta equipo externo, gasolina, comida crew..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Monto ($) *</label>
                  <input type="number" step="0.01" min="0" value={gastoMonto} onChange={e => setGastoMonto(e.target.value)} placeholder="0"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{gastoEstado === "PENDIENTE" ? "Fecha estimada de pago" : "Fecha en que se pagó"}</label>
                  <input type="date" value={gastoFecha} onChange={e => setGastoFecha(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Categoría</label>
                  <select value={gastoCategoria} onChange={e => setGastoCategoria(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="">— Sin categoría —</option>
                    <option value="PROVEEDOR_EXTERNO">Proveedor externo</option>
                    <option value="OPERACION_TECNICA">Operación técnica</option>
                    <option value="COMIDAS">Comidas</option>
                    <option value="TRANSPORTE">Transporte</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Proveedor</label>
                  <Combobox value={gastoProveedor} onChange={v => setGastoProveedor(v)}
                    options={[{ value: "", label: "— Sin proveedor —" }, ...proveedores.map(p => ({ value: p.id, label: p.compania?.nombre || p.empresa || p.nombre }))]}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>
              {gastoEstado === "PAGADO" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Método de pago</label>
                    <Combobox value={gastoMetodo} onChange={v => setGastoMetodo(v)}
                      options={[{ value: "TRANSFERENCIA", label: "Transferencia" }, { value: "EFECTIVO", label: "Efectivo" }, { value: "CHEQUE", label: "Cheque" }, { value: "TARJETA", label: "Tarjeta" }]}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Cuenta (cargo)</label>
                    <Combobox value={gastoCuenta} onChange={v => setGastoCuenta(v)}
                      options={[{ value: "", label: "— Sin cuenta —" }, ...cuentasBancarias.map(c => ({ value: c.id, label: c.nombre + (c.banco ? ` · ${c.banco}` : "") }))]}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 block mb-1">Referencia / Folio</label>
                    <input value={gastoReferencia} onChange={e => setGastoReferencia(e.target.value)}
                      placeholder="Núm. transferencia, folio..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notas</label>
                <input value={gastoNotas} onChange={e => setGastoNotas(e.target.value)} placeholder="Opcional"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowGastoModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={async () => { const ok = await agregarGastoProy(); if (ok) setShowGastoModal(false); }}
                disabled={addingGasto || !gastoConcepto.trim() || !gastoMonto}
                className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c9a96a] disabled:opacity-40 transition-colors">
                {addingGasto ? "Guardando..." : gastoEstado === "PENDIENTE" ? "Registrar gasto pendiente" : "Registrar pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal editar gasto ── */}
      {editGasto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setEditGasto(null); }}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Editar gasto</h3>
              <button onClick={() => setEditGasto(null)} className="text-gray-600 hover:text-white text-lg leading-none">✕</button>
            </div>
            {/* Toggle estado */}
            <p className="text-xs text-gray-500 mb-1.5">Estado del gasto</p>
            <div className="flex gap-1 p-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setEditGastoEstado("PENDIENTE")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${editGastoEstado === "PENDIENTE" ? "bg-yellow-700/30 text-yellow-300 border border-yellow-700/40" : "text-gray-400 hover:text-white hover:bg-[#1a1a1a] border border-transparent"}`}>
                Por pagar
              </button>
              <button
                type="button"
                onClick={() => setEditGastoEstado("PAGADO")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${editGastoEstado === "PAGADO" ? "bg-green-800/30 text-green-300 border border-green-800/40" : "text-gray-400 hover:text-white hover:bg-[#1a1a1a] border border-transparent"}`}>
                Ya pagado
              </button>
            </div>
            {editGastoEstado === "PENDIENTE" && !editingCxPId && (
              <p className="text-xs text-yellow-600/80 bg-yellow-900/10 border border-yellow-900/20 rounded-lg px-3 py-2 mb-3">
                Al guardar, este gasto se convertirá en una cuenta por pagar y aparecerá en Cobros y Pagos.
              </p>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Concepto *</label>
                <input value={editGastoForm.concepto} onChange={e => setEditGastoForm(p => ({ ...p, concepto: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Monto *</label>
                  <input type="number" step="0.01" min="0" value={editGastoForm.monto}
                    onChange={e => setEditGastoForm(p => ({ ...p, monto: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{editGastoEstado === "PENDIENTE" ? "Fecha estimada de pago" : "Fecha de pago"}</label>
                  <input type="date" value={editGastoForm.fecha}
                    onChange={e => setEditGastoForm(p => ({ ...p, fecha: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                {editGastoEstado === "PAGADO" && (<>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Método de pago</label>
                  <Combobox value={editGastoForm.metodoPago} onChange={v => setEditGastoForm(p => ({ ...p, metodoPago: v }))}
                    options={[{ value: "TRANSFERENCIA", label: "Transferencia" }, { value: "EFECTIVO", label: "Efectivo" }, { value: "CHEQUE", label: "Cheque" }, { value: "TARJETA", label: "Tarjeta" }]}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Cuenta (cargo)</label>
                  <Combobox value={editGastoForm.cuentaOrigenId} onChange={v => setEditGastoForm(p => ({ ...p, cuentaOrigenId: v }))}
                    options={[{ value: "", label: "— Sin cuenta —" }, ...cuentasBancarias.map(c => ({ value: c.id, label: c.nombre + (c.banco ? ` · ${c.banco}` : "") }))]}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                </>)}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Categoría</label>
                  <Combobox value={editGastoForm.categoriaId} onChange={v => setEditGastoForm(p => ({ ...p, categoriaId: v }))}
                    options={[{ value: "", label: "— Sin categoría —" }, ...categorias.map(c => ({ value: c.id, label: c.nombre }))]}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Proveedor</label>
                  <Combobox value={editGastoForm.proveedorId} onChange={v => setEditGastoForm(p => ({ ...p, proveedorId: v }))}
                    options={[{ value: "", label: "— Sin proveedor —" }, ...proveedores.map(p => ({ value: p.id, label: p.compania?.nombre || p.empresa || p.nombre }))]}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>
              {editGastoEstado === "PAGADO" && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Referencia / Folio</label>
                <input value={editGastoForm.referencia} onChange={e => setEditGastoForm(p => ({ ...p, referencia: e.target.value }))}
                  placeholder="Núm. transferencia, folio..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              )}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notas</label>
                <input value={editGastoForm.notas} onChange={e => setEditGastoForm(p => ({ ...p, notas: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditGasto(null)} className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={guardarEdicionGasto} disabled={savingGasto || !editGastoForm.concepto || !editGastoForm.monto}
                className="flex-1 py-2.5 rounded-xl bg-[#B3985B] text-black text-sm font-semibold hover:bg-[#c9a96a] disabled:opacity-40 transition-colors">
                {savingGasto ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal cierre financiero ── */}
      {showCierreModal && cierreData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
              <h2 className="text-white font-semibold">Cierre financiero · {proyecto.nombre}</h2>
              <button onClick={() => setShowCierreModal(false)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Comparativa */}
              <div className="grid grid-cols-2 gap-4">
                <div className="ms-stat-card">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-3">Estimado (cotización)</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-gray-400">Gran total</span><span className="text-white font-semibold">{fmt(cierreData.estimado.granTotalEstimado)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-400">Costo est.</span><span className="text-red-400">{fmt(cierreData.estimado.costoEstimado)}</span></div>
                    <div className="flex justify-between text-xs border-t border-[#1e1e1e] pt-2"><span className="text-gray-400">Utilidad est.</span><span className="text-green-400 font-semibold">{fmt(cierreData.estimado.utilidadEstimada)}</span></div>
                  </div>
                </div>
                <div className="ms-stat-card">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-3">Real (al cierre)</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-gray-400">Total cobrado</span><span className="text-white font-semibold">{fmt(cierreData.real.totalCobrado)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-400">Total gastado</span><span className="text-red-400">{fmt(cierreData.real.totalGastado)}</span></div>
                    <div className="flex justify-between text-xs border-t border-[#1e1e1e] pt-2">
                      <span className="text-gray-400">Utilidad real</span>
                      <span className={`font-semibold ${cierreData.real.utilidadReal >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(cierreData.real.utilidadReal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Margen */}
              <div className={`border rounded-xl p-4 text-center ${cierreData.real.margenReal >= 20 ? "border-green-800/40 bg-green-900/10" : cierreData.real.margenReal >= 0 ? "border-yellow-800/40 bg-yellow-900/10" : "border-red-800/40 bg-red-900/10"}`}>
                <p className="text-gray-500 text-xs mb-1">Margen real</p>
                <p className={`text-3xl font-bold ${cierreData.real.margenReal >= 20 ? "text-green-400" : cierreData.real.margenReal >= 0 ? "text-yellow-400" : "text-red-400"}`}>
                  {cierreData.real.margenReal.toFixed(1)}%
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  {cierreData.real.margenReal >= 20 ? "Excelente rentabilidad" : cierreData.real.margenReal >= 10 ? "Rentabilidad aceptable" : cierreData.real.margenReal >= 0 ? "Margen bajo — revisar costos" : "Evento con pérdida"}
                </p>
              </div>

              {/* Desglose */}
              {cierreData.desgloseCostos.length > 0 && (
                <div className="ms-stat-card">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-3">Desglose de costos reales</p>
                  <div className="space-y-2">
                    {cierreData.desgloseCostos.map(d => (
                      <div key={d.categoria} className="flex justify-between text-xs">
                        <span className="text-gray-400">{d.categoria}</span>
                        <span className="text-red-400">{fmt(d.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="text-gray-500 text-xs block mb-1">Notas del cierre (opcional)</label>
                <textarea
                  value={cierreNotas}
                  onChange={e => setCierreNotas(e.target.value)}
                  placeholder="Observaciones, aprendizajes, ajustes para futuros eventos..."
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
                />
              </div>

              <button
                onClick={guardarCierre}
                disabled={savingCierre}
                className="w-full py-3 bg-[#B3985B] text-black font-semibold rounded-xl hover:bg-[#c9a96a] transition-colors disabled:opacity-50"
              >
                {savingCierre ? "Guardando..." : "Guardar cierre y marcar como Completado"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Zona de peligro ── */}
      <div className="border border-red-900/40 rounded-xl p-4">
        <p className="text-xs text-red-500/70 uppercase tracking-wider font-semibold mb-3">Zona de peligro</p>
        {!confirmarBorrado ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">Eliminar este proyecto</p>
              <p className="text-gray-600 text-xs mt-0.5">
                Borra el proyecto y todo su contenido. La cotización queda aprobada — puedes crear un nuevo proyecto desde ella inmediatamente o editarla antes.
              </p>
            </div>
            <button onClick={() => setConfirmarBorrado(true)}
              className="shrink-0 ml-4 text-sm text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-4 py-2 rounded-lg transition-colors">
              Eliminar proyecto
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-red-300 text-sm flex-1">
              ¿Seguro? Se eliminará <strong>{proyecto.nombre}</strong> con todo su personal, equipos, checklist y finanzas. La cotización quedará aprobada — podrás crear un nuevo proyecto desde ella.
            </p>
            <button onClick={eliminarProyecto} disabled={borrando}
              className="shrink-0 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              {borrando ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button onClick={() => setConfirmarBorrado(false)} disabled={borrando}
              className="shrink-0 text-gray-500 hover:text-white text-sm transition-colors">
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="mt-6">
        <VersionHistorial entidad="proyecto" entidadId={proyecto.id} />
      </div>
    </div>

    {/* ── Panel flotante de notificación de cambios ── */}
    {pendingNotif && (

      <div className="fixed bottom-6 right-6 z-50 bg-[#111] border border-[#B3985B]/50 rounded-xl p-5 shadow-2xl w-80">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-white font-semibold text-sm"><Bell strokeWidth={1.75} className="w-4 h-4" /> Notificar cambio al equipo</p>
            <p className="text-gray-500 text-xs mt-0.5">
              <span className="text-[#B3985B]">{pendingNotif.campoLabel}</span> actualizado
              {pendingNotif.valor ? `: ${pendingNotif.valor}` : ""}
            </p>
          </div>
          <button onClick={() => setPendingNotif(null)} className="text-gray-600 hover:text-white transition-colors ml-3 shrink-0">✕</button>
        </div>
        <div className="space-y-2 mb-3">
          {pendingNotif.contactos.map((c, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 text-gray-500">{c.tipo === "tecnico" ? <User strokeWidth={1.75} className="w-3.5 h-3.5" /> : <Factory strokeWidth={1.75} className="w-3.5 h-3.5" />}</span>
                <span className="text-white text-xs truncate">{c.nombre}</span>
              </div>
              {c.waUrl ? (
                <a href={c.waUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 shrink-0 bg-green-800 hover:bg-green-700 text-white text-[11px] font-semibold px-3 py-1 rounded-lg transition-colors">
                  <MessageCircle strokeWidth={1.75} className="w-3.5 h-3.5" /> WA
                </a>
              ) : (
                <span className="text-gray-600 text-xs shrink-0">Sin tel.</span>
              )}
            </div>
          ))}
        </div>
        {pendingNotif.contactos.filter(c => c.waUrl).length > 1 && (
          <button
            onClick={() => {
              pendingNotif.contactos.filter(c => c.waUrl).forEach(c => window.open(c.waUrl!, "_blank"));
              setPendingNotif(null);
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-green-800 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
            <MessageCircle strokeWidth={1.75} className="w-3.5 h-3.5" /> Notificar a todos ({pendingNotif.contactos.filter(c => c.waUrl).length})
          </button>
        )}
      </div>
    )}

    {/* ── Modal Confirmación a Team Mainstage ── */}
    {showAnuncioCierre && (() => {
      const TIPO_SERVICIO_LABEL: Record<string, string> = {
        PRODUCCION_TECNICA: "Producción técnica",
        RENTA: "Renta de equipo",
        DIRECCION_TECNICA: "Dirección técnica",
      };
      const tipoServicioLabel = proyecto.tipoServicio ? (TIPO_SERVICIO_LABEL[proyecto.tipoServicio] ?? proyecto.tipoServicio) : null;

      const equiposLineas = proyecto.equipos.map(e =>
        `• ${e.cantidad}x ${e.equipo.descripcion}${e.equipo.marca ? ` ${e.equipo.marca}` : ""}${e.equipo.modelo ? ` ${e.equipo.modelo}` : ""}`
      ).join("\n");

      const personalConfirmado = proyecto.personal.filter(p => p.confirmado);
      const personalLineas = personalConfirmado.map(p => {
        const rol = p.rolTecnico?.nombre ?? p.tecnico?.rol?.nombre ?? null;
        return `• ${p.tecnico?.nombre ?? "—"}${rol ? ` (${rol})` : ""}`;
      }).join("\n");

      const accesoLink = `https://mainstagepro.vercel.app/proyectos/${proyecto.id}`;

      const bloquesBrief = construirCronologia({
        fechaEvento: proyecto.fechaEvento, fechasEvento: proyecto.fechasEvento, horariosEvento: proyecto.horariosEvento,
        horaInicioEvento: proyecto.horaInicioEvento, horaFinEvento: proyecto.horaFinEvento,
        fechaMontaje: proyecto.fechaMontaje, horaMontaje: proyecto.horaMontaje, horaInicioMontaje: proyecto.horaInicioMontaje,
        duracionMontajeHrs: proyecto.duracionMontajeHrs, montajeDiaAparte: proyecto.montajeDiaAparte,
        horaSalidaBodega: proyecto.horaSalidaBodega, horaDesmontaje: proyecto.horaDesmontaje,
        duracionDesmontajeHrs: proyecto.duracionDesmontajeHrs, desmontajeDiaAparte: proyecto.desmontajeDiaAparte,
        fechaDesmontaje: proyecto.fechaDesmontaje,
        llamadoBodega: proyecto.llamadoBodega, lugarLlamado: proyecto.lugarLlamado, lugarEvento: proyecto.lugarEvento,
      });
      const cronoTexto = bloquesBrief.map(b => {
        const head = b.subtitulo ? `${b.titulo} — ${b.subtitulo}` : b.titulo;
        const items = b.items.map(it => `   ${it.hora}  ${it.label}${it.nota ? ` (${it.nota})` : ""}`).join("\n");
        return `${head}\n${items}`;
      }).join("\n");

      const briefText = [
        "🎉 ¡Servicio confirmado!",
        "",
        `👤 Cliente: ${proyecto.cliente.nombre}${proyecto.cliente.empresa ? ` / ${proyecto.cliente.empresa}` : ""}`,
        `📋 Proyecto: ${proyecto.nombre} (${proyecto.numeroProyecto})`,
        tipoServicioLabel ? `🎛️ Servicio: ${tipoServicioLabel}${proyecto.tipoEvento ? ` · ${proyecto.tipoEvento}` : ""}` : (proyecto.tipoEvento ? `🎭 Evento: ${proyecto.tipoEvento}` : null),
        `📅 Fecha: ${fmtDate(proyecto.fechaEvento)}`,
        proyecto.lugarEvento ? `📍 Lugar: ${proyecto.lugarEvento}` : null,
        cronoTexto ? `\n🗓️ Cronología:\n${cronoTexto}` : null,
        proyecto.equipos.length > 0 ? `\nEquipos:\n${equiposLineas}` : null,
        personalConfirmado.length > 0 ? `\nPersonal confirmado:\n${personalLineas}` : null,
        `\n🔗 Acceso: ${accesoLink}`,
      ].filter(Boolean).join("\n");

      return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">Confirmación a Team Mainstage</h2>
              <button onClick={() => setShowAnuncioCierre(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <pre className="text-xs text-gray-300 ms-stat-card whitespace-pre-wrap leading-relaxed font-sans select-all">
                {briefText}
              </pre>
              <div className="flex gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(briefText); }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 hover:text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <ClipboardList strokeWidth={1.75} className="w-3.5 h-3.5" /> Copiar texto
                </button>
                <a
                  href={`/api/proyectos/${proyecto.id}/brief-imagen`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold py-2.5 rounded-xl transition-colors text-center"
                >
                  <FileImage strokeWidth={1.75} className="w-3.5 h-3.5" /> Descargar imagen
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    })()}

    {/* ── PDF Preview Modal ── */}
    {pdfPreview && (
      <PDFPreviewModal
        isOpen={!!pdfPreview}
        onClose={() => setPdfPreview(null)}
        title={pdfPreview.title}
        apiUrl={pdfPreview.url}
        filename={pdfPreview.filename}
      />
    )}
    </>
  );
}
