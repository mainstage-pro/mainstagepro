"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TimePicker from "@/components/ui/TimePicker";
import VenuePicker from "@/components/ui/VenuePicker";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { CopyButton } from "@/components/CopyButton";
import { SkeletonPage } from "@/components/Skeleton";
import VersionHistorial from "@/components/VersionHistorial";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Tecnico { id: string; nombre: string; nivel: string; rol: { nombre: string } | null }
interface RolTecnico { id: string; nombre: string; tarifaAAMedia: number | null; tarifaAACorta: number | null; tarifaAALarga: number | null }
interface Personal {
  id: string; confirmado: boolean; estadoPago: string;
  participacion: string | null;
  nivel: string | null; jornada: string | null; responsabilidad: string | null;
  tarifaAcordada: number | null; notas: string | null;
  confirmToken: string | null; confirmRespuesta: string | null;
  tecnico: { id: string; nombre: string; celular: string | null; rol: { nombre: string } | null } | null;
  rolTecnico: { nombre: string } | null;
}
interface CatFinanciera { id: string; nombre: string; tipo: string }
interface Proveedor { id: string; nombre: string; telefono: string | null; giro: string | null }
interface CheckItem { id: string; item: string; completado: boolean; orden: number; tipo: string }
interface Archivo { id: string; tipo: string; nombre: string; url: string; createdAt: string }
interface AjusteEntry { fecha: string; de: number; a: number; motivo: string; usuario: string }
interface CxC { id: string; concepto: string; tipoPago: string; monto: number; montoCobrado: number; estado: string; fechaCompromiso: string; montoOriginal: number | null; ajustesLog: string | null }
interface CxP { id: string; concepto: string; monto: number; estado: string; fechaCompromiso: string; tipoAcreedor: string; montoOriginal: number | null; ajustesLog: string | null }
interface Bitacora { id: string; tipo: string; contenido: string; createdAt: string; usuario: { name: string } | null }
interface GastoOp { id: string; tipo: string; concepto: string; monto: number; cantidad: number; entregado: boolean; fechaEntrega: string | null; notas: string | null }
interface Gasto { id: string; fecha: string; concepto: string; monto: number; metodoPago: string; notas: string | null; referencia: string | null; categoria: { nombre: string } | null; proveedor: { nombre: string } | null }
interface ProyectoEquipoItem { id: string; tipo: string; cantidad: number; dias: number; costoExterno: number | null; confirmado: boolean; confirmToken: string | null; confirmDisponible: boolean | null; equipo: { descripcion: string; marca: string | null; categoria: { nombre: string } }; proveedor: { nombre: string; telefono: string | null } | null }
interface CronoRow { horaInicio: string; horaFin: string; actividad: string; responsable: string; involucrados: string }
interface TransporteSlot { proveedor: string; marcaModelo: string; comentarios: string }
interface Proyecto {
  id: string; numeroProyecto: string; nombre: string; estado: string;
  tipoEvento: string; tipoServicio: string | null;
  fechaEvento: string; horaInicioEvento: string | null; horaFinEvento: string | null;
  fechaMontaje: string | null; horaInicioMontaje: string | null; duracionMontajeHrs: number | null;
  lugarEvento: string | null; encargadoLugar: string | null; encargadoLugarContacto: string | null;
  descripcionGeneral: string | null; detallesEspecificos: string | null;
  encargadoCliente: string | null; transportes: string | null;
  proveedorCatering: string | null; contactosDireccion: string | null;
  reporteCatering: string | null;
  cronograma: string | null; contactosEmergencia: string | null; comentariosFinales: string | null;
  scoreFotoVideo: number | null; recomendacionFotoVideo: string | null;
  marketingData: string | null;
  cliente: { id: string; nombre: string; empresa: string | null; telefono: string | null; correo: string | null };
  encargado: { name: string } | null;
  trato: { tipoEvento: string; tipoServicio: string | null; ideasReferencias: string | null; ventanaMontajeInicio: string | null; ventanaMontajeFin: string | null; responsable: { name: string } | null } | null;
  cotizacion: { id: string; numeroCotizacion: string; granTotal: number; diasComidas: number; subtotalComidas: number } | null;
  logisticaRenta: string | null;
  docsTecnicos: string | null;
  protocoloSalida: string | null;
  protocoloEntrada: string | null;
  recoleccionStatus: string;
  recoleccionNotas: string | null;
  recoleccionFechaReal: string | null;
  choferNombre: string | null;
  choferExterno: boolean;
  choferCosto: number | null;
  personal: Personal[];
  equipos: ProyectoEquipoItem[];
  checklist: CheckItem[];
  archivos: Archivo[];
  cuentasCobrar: CxC[];
  cuentasPagar: CxP[];
  bitacora: Bitacora[];
  movimientos: Gasto[];
  cierreFinanciero: { cerradoEn: string; notas: string | null } | null;
  portalToken: string | null;
  notasPortal: string | null;
  responsables: string | null;
}

// ─── Constantes ──────────────────────────────────────────────────────────────
const ESTADOS = ["PLANEACION", "CONFIRMADO", "EN_CURSO", "COMPLETADO", "CANCELADO"];
const ESTADO_LABELS: Record<string, string> = {
  PLANEACION: "En preparación",
  CONFIRMADO: "Confirmado",
  EN_CURSO: "En evento",
  COMPLETADO: "Finalizado",
  CANCELADO: "Cancelado",
};
const ESTADO_COLORS: Record<string, string> = {
  PLANEACION: "bg-blue-900/50 text-blue-300",
  CONFIRMADO: "bg-green-900/50 text-green-300",
  EN_CURSO: "bg-yellow-900/50 text-yellow-300",
  COMPLETADO: "bg-gray-700 text-gray-300",
  CANCELADO: "bg-red-900/50 text-red-300",
};
const NIVEL_COLORS: Record<string, string> = {
  AAA: "text-yellow-400", AA: "text-blue-400", A: "text-gray-400",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
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

// ─── Componente campo editable ────────────────────────────────────────────────
function Campo({ label, value, field, onSave, type = "text", multiline = false }:
  { label: string; value: string | null; field: string; onSave: (f: string, v: string) => void; type?: string; multiline?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");

  function save() {
    onSave(field, val);
    setEditing(false);
  }

  if (editing) {
    return (
      <div>
        <label className="text-gray-500 text-xs mb-1 block">{label}</label>
        {multiline ? (
          <textarea value={val} onChange={e => setVal(e.target.value)} rows={3}
            className="w-full bg-[#1a1a1a] border border-[#B3985B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none" />
        ) : (
          <input type={type} value={val} onChange={e => setVal(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#B3985B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
        )}
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

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ProyectoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"info" | "personal" | "equipos" | "rider" | "docs" | "checklist" | "finanzas" | "bitacora" | "evaluacion" | "protocolo">("info");
  const [gastosOp, setGastosOp] = useState<GastoOp[]>([]);
  const [gastosLoaded, setGastosLoaded] = useState(false);
  const [showGastoOpForm, setShowGastoOpForm] = useState(false);
  const [gastoOpForm, setGastoOpForm] = useState({ tipo: "COMIDA", concepto: "", monto: "", cantidad: "1", notas: "" });
  const [togglingGasto, setTogglingGasto] = useState<string | null>(null);

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

  // Score foto/video
  const [scoreFotoVideo, setScoreFotoVideo] = useState<number>(0);
  const [recomendacionFotoVideo, setRecomendacionFotoVideo] = useState<string>("");
  const [savingScore, setSavingScore] = useState(false);

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

  async function loadCierre() {
    setLoadingCierre(true);
    const res = await fetch(`/api/proyectos/${id}/cierre`);
    const d = await res.json();
    setCierreData(d);
    setCierreNotas(d.cierreExistente?.notas ?? "");
    setLoadingCierre(false);
  }

  async function guardarCierre() {
    if (!cierreData) return;
    setSavingCierre(true);
    await fetch(`/api/proyectos/${id}/cierre`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cierreData.real, ...cierreData.estimado, desgloseCostos: cierreData.desgloseCostos, notas: cierreNotas }),
    });
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
    await fetch(`/api/proyectos/${id}/portal-token`, { method: "POST" });
    setGenerandoToken(false);
    toast.success("Enlace de portal generado");
    await load();
  }

  async function revocarPortalToken() {
    const ok = await confirm("¿Revocar el enlace del portal? El cliente ya no podrá acceder con el enlace anterior.");
    if (!ok) return;
    setRevocandoToken(true);
    await fetch(`/api/proyectos/${id}/portal-token`, { method: "DELETE" });
    setRevocandoToken(false);
    toast.success("Enlace revocado");
    await load();
  }

  async function guardarNotasPortal() {
    setSavingNotasPortal(true);
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notasPortal: notasPortal || null }),
    });
    setSavingNotasPortal(false);
    toast.success("Notas del portal guardadas");
    await load();
  }

  async function guardarResponsables() {
    setSavingResp(true);
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responsables: JSON.stringify(responsables) }),
    });
    setSavingResp(false);
    toast.success("Responsables guardados");
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
    { proveedor: "", marcaModelo: "", comentarios: "" },
    { proveedor: "", marcaModelo: "", comentarios: "" },
    { proveedor: "", marcaModelo: "", comentarios: "" },
  ]);
  const [savingTransporte, setSavingTransporte] = useState(false);

  // Estado catering
  type CateringData = {
    proveedorId: string; contactoNombre: string; contactoTelefono: string;
    personasCrew: string; comidasPorDia: string; notas: string;
  };
  const CATERING_EMPTY: CateringData = { proveedorId: "", contactoNombre: "", contactoTelefono: "", personasCrew: "", comidasPorDia: "", notas: "" };
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
  const [selNivel, setSelNivel] = useState("AA");
  const [selJornada, setSelJornada] = useState("MEDIA");
  const [selTarifa, setSelTarifa] = useState("");
  const [selResp, setSelResp] = useState("");
  const [selParticipacion, setSelParticipacion] = useState("OPERACION");
  const [addingPersonal, setAddingPersonal] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<{ disponible: boolean; conflictos: { id: string; nombre: string; numeroProyecto: string }[] } | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);

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

  // Estados para bitácora
  const [notaBitacora, setNotaBitacora] = useState("");
  const [addingNota, setAddingNota] = useState(false);

  // Estados para registrar pago
  const [pagando, setPagando] = useState<string | null>(null);
  const [montoPago, setMontoPago] = useState("");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0]);

  // Estados para ajuste de monto en CxC/CxP
  const [ajustando, setAjustando] = useState<string | null>(null);    // id de la cuenta en edición
  const [ajusteMonto, setAjusteMonto] = useState("");
  const [ajusteMotivo, setAjusteMotivo] = useState("");
  const [ajusteHistorial, setAjusteHistorial] = useState<string | null>(null); // id cuyo historial está expandido

  // Estados para asignar técnico a fila sin asignar
  const [asignandoId, setAsignandoId] = useState<string | null>(null);
  const [selAsignar, setSelAsignar] = useState("");

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
  const [addingGasto, setAddingGasto] = useState(false);

  // Estado para confirmación de borrado
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [borrando, setBorrando] = useState(false);

  // Chofer asignado
  const [choferEditando, setChoferEditando] = useState(false);
  const [choferTipo, setChoferTipo] = useState<"INTERNO" | "EXTERNO">("INTERNO");
  const [choferNombreInput, setChoferNombreInput] = useState("");
  const [choferPersonalId, setChoferPersonalId] = useState("");
  const [choferCostoInput, setChoferCostoInput] = useState("");
  const [guardandoChofer, setGuardandoChofer] = useState(false);
  const [vehiculos, setVehiculos] = useState<{ id: string; nombre: string; marca: string | null; modelo: string | null; placas: string | null }[]>([]);
  const [vehiculoId, setVehiculoId] = useState("");
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

  const KEY_CAMPOS: Record<string, string> = {
    fechaEvento: "Fecha del evento",
    horaInicioEvento: "Hora inicio del evento",
    horaFinEvento: "Hora fin del evento",
    lugarEvento: "Lugar del evento",
    fechaMontaje: "Día de montaje",
    horaInicioMontaje: "Hora inicio montaje",
  };

  async function load() {
    const res = await fetch(`/api/proyectos/${id}`);
    const d = await res.json();
    setProyecto(d.proyecto);
    setNotasPortal(d.proyecto?.notasPortal ?? "");
    try {
      const resp = d.proyecto?.responsables ? JSON.parse(d.proyecto.responsables) : {};
      setResponsables({ produccion: resp.produccion ?? "", logistica: resp.logistica ?? "", finanzas: resp.finanzas ?? "", marketing: resp.marketing ?? "" });
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadEval() {
    const res = await fetch(`/api/proyectos/${id}/evaluacion`);
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

  async function guardarScore() {
    setSavingScore(true);
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scoreFotoVideo: scoreFotoVideo || null, recomendacionFotoVideo: recomendacionFotoVideo || null }),
    });
    await load();
    setSavingScore(false);
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

  async function loadEvalCliente() {
    if (evalClienteLoaded) return;
    setLoadingEvalCliente(true);
    const res = await fetch(`/api/evaluacion-cliente?proyectoId=${id}`).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setEvalCliente(d.evaluacion ?? null);
    }
    setEvalClienteLoaded(true);
    setLoadingEvalCliente(false);
  }

  async function generarLinkEvalCliente() {
    setGenerandoLink(true);
    const res = await fetch("/api/evaluacion-cliente", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proyectoId: id }),
    });
    const d = await res.json();
    setEvalCliente(d.evaluacion ?? null);
    setGenerandoLink(false);
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
    ]).then(([t, r, c, p, eq, v, u]) => {
      setTecnicos(t.tecnicos ?? []);
      setRoles(r.roles ?? []);
      setCategorias((c.categorias ?? []).filter((x: CatFinanciera) => x.tipo === "GASTO"));
      setProveedores(p.proveedores ?? []);
      setEquipoCatalogo(eq.equipos ?? []);
      setVehiculos((v.vehiculos ?? []).filter((x: { activo: boolean }) => x.activo));
      setUsuariosActivos(u.usuarios ?? []);
    });
  }, [id]);

  // Lazy-load evaluación cliente when evaluacion tab opens
  useEffect(() => {
    if (tab === "evaluacion") loadEvalCliente();
  }, [tab]);

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
    setScoreFotoVideo(proyecto.scoreFotoVideo ?? 0);
    setRecomendacionFotoVideo(proyecto.recomendacionFotoVideo ?? "");
    try {
      const parsed = proyecto.cronograma ? JSON.parse(proyecto.cronograma) : [];
      setCronoRows(Array.isArray(parsed) ? parsed : []);
    } catch { setCronoRows([]); }
    try {
      const parsed = proyecto.transportes ? JSON.parse(proyecto.transportes) : [];
      const slots: TransporteSlot[] = [0, 1, 2].map(i => parsed[i] ?? { proveedor: "", marcaModelo: "", comentarios: "" });
      setTransporteSlots(slots);
    } catch {
      setTransporteSlots([
        { proveedor: "", marcaModelo: "", comentarios: "" },
        { proveedor: "", marcaModelo: "", comentarios: "" },
        { proveedor: "", marcaModelo: "", comentarios: "" },
      ]);
    }
    try {
      const c = proyecto.reporteCatering ? JSON.parse(proyecto.reporteCatering) : {};
      setCatering({ ...CATERING_EMPTY, ...c });
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
          const resCalc = await fetch(`/api/proyectos/${id}/cierre`);
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
      const r = await fetch(`/api/evaluacion-cliente?proyectoId=${id}`);
      const d = await r.json().catch(() => ({}));
      if (d.evaluacion) {
        setEvalCliente(d.evaluacion);
        setEvalClienteLoaded(true);
        setTab("evaluacion");
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
      const updated = { ...prev, [field]: value || null };

      // Si el campo es clave (fecha/hora/lugar), construir panel de notificaciones
      if (field in KEY_CAMPOS && (updated.personal.length > 0 || updated.equipos.some(e => e.tipo === "EXTERNO"))) {
        const campoLabel = KEY_CAMPOS[field];
        const fechaStr = new Date(updated.fechaEvento).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

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

  // ── Guardar cronograma (auto-sort por hora) ──
  // ── Guardar chofer ──
  async function guardarChofer() {
    if (!proyecto) return;
    setGuardandoChofer(true);
    let nombre = "";
    let externo = false;
    let costo: number | null = null;
    if (choferTipo === "INTERNO") {
      // Buscar nombre del personal seleccionado
      const p = proyecto.personal.find(p => p.id === choferPersonalId);
      nombre = p?.tecnico?.nombre ?? choferNombreInput;
      externo = false;
      costo = null;
    } else {
      nombre = choferNombreInput;
      externo = true;
      costo = choferCostoInput ? parseFloat(choferCostoInput) : null;
    }
    const res = await fetch(`/api/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choferNombre: nombre || null, choferExterno: externo, choferCosto: costo }),
    });
    if (res.ok) {
      setProyecto(prev => prev ? { ...prev, choferNombre: nombre || null, choferExterno: externo, choferCosto: costo } : prev);
      setChoferEditando(false);
    }
    setGuardandoChofer(false);
  }

  async function guardarCronograma(rows: CronoRow[]) {
    setSavingCrono(true);
    const sorted = [...rows].sort((a, b) => {
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

  function cargarPlantillaCrono() {
    if (cronoRows.length > 0 && !confirm("¿Reemplazar el cronograma actual con la plantilla base?")) return;
    setCronoRows(CRONO_BASE.map(r => ({ ...r })));
  }

  function addCronoRow() {
    setCronoRows(prev => [...prev, { horaInicio: "", horaFin: "", actividad: "", responsable: "", involucrados: "" }]);
  }

  function updateCronoRow(i: number, field: keyof CronoRow, value: string) {
    setCronoRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  function removeCronoRow(i: number) {
    const next = cronoRows.filter((_, idx) => idx !== i);
    setCronoRows(next);
    guardarCronograma(next);
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
    const fechaStr = new Date(proyecto!.fechaEvento).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
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
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tipo", tipo);
    fd.append("nombre", file.name);
    const res = await fetch(`/api/proyectos/${id}/archivos`, { method: "POST", body: fd });
    const d = await res.json();
    if (d.archivo) {
      setProyecto(prev => prev ? { ...prev, archivos: [...prev.archivos, d.archivo] } : prev);
    }
    setUploadingTipo(null);
    e.target.value = "";
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
      }),
    });
    const d = await res.json();
    setProyecto(prev => prev ? { ...prev, personal: [...prev.personal, d.personal] } : prev);
    setSelTecnico(""); setSelRol(""); setSelTarifa(""); setSelResp("");
    setShowAddPersonal(false);
    setAddingPersonal(false);
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
        referencia: gastoReferencia || null,
      }),
    });
    const d = await res.json();
    setProyecto(prev => prev ? { ...prev, movimientos: [d.gasto, ...prev.movimientos] } : prev);
    setGastoConcepto(""); setGastoMonto(""); setGastoNotas(""); setGastoReferencia(""); setGastoCategoria(""); setGastoProveedor(""); setShowGastoForm(false);
    setAddingGasto(false);
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
      body: JSON.stringify({ monto: montoPago || undefined, fecha: fechaPago }),
    });
    if (res.ok) {
      await load();
    }
    setPagando(null);
    setMontoPago("");
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

  // ── Eliminar CxC individual ──
  async function eliminarCxC(cxcId: string) {
    if (!await confirm({ message: "¿Eliminar esta cuenta por cobrar?", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/cuentas-cobrar/${cxcId}`, { method: "DELETE" });
    await load();
  }

  // ── Ajustar monto CxC ──
  async function ajustarMontoCxC(cxcId: string) {
    const monto = parseFloat(ajusteMonto);
    if (!monto || monto <= 0) { toast.error("Monto inválido"); return; }
    if (!ajusteMotivo.trim() || ajusteMotivo.trim().length < 5) { toast.error("El motivo es obligatorio"); return; }
    const res = await fetch(`/api/cuentas-cobrar/${cxcId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto, motivo: ajusteMotivo.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Error al ajustar"); return; }
    toast.success("Monto ajustado correctamente");
    setAjustando(null); setAjusteMonto(""); setAjusteMotivo("");
    await load();
  }

  // ── Ajustar monto CxP ──
  async function ajustarMontoCxP(cxpId: string) {
    const monto = parseFloat(ajusteMonto);
    if (!monto || monto <= 0) { toast.error("Monto inválido"); return; }
    if (!ajusteMotivo.trim() || ajusteMotivo.trim().length < 5) { toast.error("El motivo es obligatorio"); return; }
    const res = await fetch(`/api/cuentas-pagar/${cxpId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto, motivo: ajusteMotivo.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Error al ajustar"); return; }
    toast.success("Monto ajustado correctamente");
    setAjustando(null); setAjusteMonto(""); setAjusteMotivo("");
    await load();
  }

  // ── Registrar pago CxP ──
  async function registrarPagoCxP(cxpId: string) {
    setPagando(cxpId);
    const res = await fetch(`/api/cuentas-pagar/${cxpId}/pagar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: montoPago || undefined, fecha: fechaPago }),
    });
    if (res.ok) {
      await load();
    }
    setPagando(null);
    setMontoPago("");
  }

  if (loading) return <SkeletonPage rows={6} cols={4} />;
  if (!proyecto) return <div className="text-red-400 text-sm p-6">Proyecto no encontrado</div>;

  const checkOp = proyecto.checklist.filter(c => c.tipo !== "RIDER");
  const checkRider = proyecto.checklist.filter(c => c.tipo === "RIDER");
  const checkTotal = checkOp.length;
  const checkDone = checkOp.filter(c => c.completado).length;
  const checkPct = checkTotal > 0 ? (checkDone / checkTotal) * 100 : 0;
  const personalConfirmado = proyecto.personal.filter(p => p.confirmado).length;
  const diasRestantes = Math.ceil((new Date(proyecto.fechaEvento).getTime() - Date.now()) / 86400000);
  const totalCxC = proyecto.cuentasCobrar.reduce((s, c) => s + c.monto, 0);
  const cobrado = proyecto.cuentasCobrar.reduce((s, c) => s + c.montoCobrado, 0);

  return (
    <>
    <div className="max-w-5xl mx-auto space-y-5 pb-12">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="text-gray-400 text-sm font-mono">{proyecto.numeroProyecto}</span>
              <CopyButton value={proyecto.numeroProyecto} size="xs" />
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[proyecto.estado]}`}>
              {ESTADO_LABELS[proyecto.estado] ?? proyecto.estado.replace("_", " ")}
            </span>
            {diasRestantes >= 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${diasRestantes <= 7 ? "bg-red-900/50 text-red-300" : diasRestantes <= 30 ? "bg-yellow-900/30 text-yellow-400" : "bg-[#222] text-gray-400"}`}>
                {diasRestantes === 0 ? "¡Hoy!" : `En ${diasRestantes} días`}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">{proyecto.nombre}</h1>
          <Link href={`/crm/clientes/${proyecto.cliente.id}`} className="text-[#B3985B] text-sm hover:underline">
            {proyecto.cliente.nombre}{proyecto.cliente.empresa ? ` · ${proyecto.cliente.empresa}` : ""}
          </Link>
          <p className="text-[#444] text-xs mt-1 italic">
            Estamos creando una experiencia memorable para {proyecto.cliente.nombre.split(" ")[0]}.
          </p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-2">
          <div>
            <p className="text-white font-semibold">{fmtDate(proyecto.fechaEvento)}</p>
            {proyecto.horaInicioEvento && (
              <p className="text-gray-400 text-sm">{proyecto.horaInicioEvento}{proyecto.horaFinEvento ? ` – ${proyecto.horaFinEvento}` : ""}</p>
            )}
            {proyecto.lugarEvento && <p className="text-gray-500 text-xs mt-0.5">{proyecto.lugarEvento}</p>}
            {proyecto.cotizacion && (
              <Link href={`/cotizaciones/${proyecto.cotizacion.id}`} className="text-[10px] text-[#B3985B] hover:underline block mt-1">
                {proyecto.cotizacion.numeroCotizacion} · {fmt(proyecto.cotizacion.granTotal)}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Hoja de entrega — solo renta */}
            {(proyecto.tipoServicio === "RENTA" || proyecto.trato?.tipoServicio === "RENTA") ? (
              <a
                href={`/api/proyectos/${proyecto.id}/hoja-entrega`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Hoja de Entrega
              </a>
            ) : (
              <a
                href={`/api/proyectos/${proyecto.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Ficha Técnica PDF
              </a>
            )}
            <Link
              href={`/carta-responsiva/${proyecto.id}`}
              className="inline-flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="7" y1="8" x2="17" y2="8" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="7" y1="16" x2="11" y2="16" />
              </svg>
              Carta Responsiva
            </Link>
          </div>
        </div>
      </div>

      {/* ── Estado pipeline ── */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Estado del proyecto</p>
        <div className="flex gap-2">
          {ESTADOS.map(e => (
            <button key={e} disabled={saving || e === proyecto.estado} onClick={() => cambiarEstado(e)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                e === proyecto.estado ? ESTADO_COLORS[e] : "bg-[#1a1a1a] text-gray-500 hover:text-white border border-[#2a2a2a]"
              }`}>
              {ESTADO_LABELS[e] ?? e.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPIs rápidos ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Checklist</p>
          <p className="text-white text-lg font-bold">{checkDone}<span className="text-gray-500 font-normal text-sm">/{checkTotal}</span></p>
          <div className="h-1.5 bg-[#222] rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-[#B3985B] rounded-full transition-all" style={{ width: `${checkPct}%` }} />
          </div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Personal</p>
          <p className="text-white text-lg font-bold">{personalConfirmado}<span className="text-gray-500 font-normal text-sm">/{proyecto.personal.length}</span></p>
          <p className="text-gray-600 text-xs">confirmados</p>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Cobrado</p>
          <p className="text-green-400 text-lg font-bold">{fmt(cobrado)}</p>
          <p className="text-gray-600 text-xs">de {fmt(totalCxC)}</p>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Bitácora</p>
          <p className="text-white text-lg font-bold">{proyecto.bitacora.length}</p>
          <p className="text-gray-600 text-xs">entradas</p>
        </div>
      </div>

      {/* ── Semáforo de preparación del evento ── */}
      {(() => {
        const anticipo = proyecto.cuentasCobrar.find(c => c.tipoPago === "ANTICIPO");
        const anticipoCobrado = anticipo ? anticipo.montoCobrado >= anticipo.monto : false;
        const equiposTotal = proyecto.equipos?.length ?? 0;
        const equiposConf = proyecto.equipos?.filter((e: { confirmado: boolean }) => e.confirmado).length ?? 0;
        const items = [
          {
            label: "Personal",
            ok: proyecto.personal.length > 0 && personalConfirmado === proyecto.personal.length,
            warn: proyecto.personal.length > 0 && personalConfirmado < proyecto.personal.length,
            txt: proyecto.personal.length === 0 ? "Sin asignar" : `${personalConfirmado}/${proyecto.personal.length} confirmados`,
          },
          {
            label: "Equipos",
            ok: equiposTotal > 0 && equiposConf === equiposTotal,
            warn: equiposTotal > 0 && equiposConf < equiposTotal,
            txt: equiposTotal === 0 ? "Sin asignar" : `${equiposConf}/${equiposTotal} confirmados`,
          },
          {
            label: "Anticipo",
            ok: anticipoCobrado,
            warn: anticipo && !anticipoCobrado,
            txt: anticipo ? (anticipoCobrado ? "Cobrado" : "Pendiente") : "Sin esquema",
          },
          {
            label: "Checklist",
            ok: checkTotal > 0 && checkDone === checkTotal,
            warn: checkTotal > 0 && checkDone < checkTotal,
            txt: checkTotal === 0 ? "Sin items" : `${checkDone}/${checkTotal} listos`,
          },
        ];
        const allOk = items.every(i => i.ok);
        const anyWarn = items.some(i => i.warn);
        return (
          <div className={`rounded-xl border px-4 py-3 flex flex-wrap gap-4 items-center ${allOk ? "bg-green-900/10 border-green-800/40" : anyWarn ? "bg-yellow-900/10 border-yellow-800/30" : "bg-[#111] border-[#222]"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider shrink-0 ${allOk ? "text-green-400" : anyWarn ? "text-yellow-400" : "text-gray-500"}`}>
              {allOk ? "✓ Evento listo" : anyWarn ? "⚠ Preparación incompleta" : "Preparación"}
            </p>
            {items.map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${item.ok ? "bg-green-500" : item.warn ? "bg-yellow-500" : "bg-gray-600"}`} />
                <span className="text-xs text-gray-400">{item.label}:</span>
                <span className={`text-xs font-medium ${item.ok ? "text-green-400" : item.warn ? "text-yellow-400" : "text-gray-500"}`}>{item.txt}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 flex-wrap">
        {(["info", "equipos", "rider", "docs", "checklist", "protocolo", "finanzas", "bitacora", "evaluacion"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === t ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"
            }`}>
            {t === "info" ? "Info" : t === "equipos" ? "Equipos" : t === "rider" ? "Rider" : t === "docs" ? "Docs" : t === "checklist" ? "Checklist" : t === "protocolo" ? "Protocolo" : t === "finanzas" ? "Finanzas" : t === "bitacora" ? "Bitácora" : "Eval."}
          </button>
        ))}
      </div>

      {/* ────── TAB: INFO ────── */}
      {tab === "info" && (() => {
        // Campos mínimos requeridos para habilitar invitaciones a técnicos y proveedores
        const fichaCamposFaltantes: string[] = [];
        if (!proyecto.horaInicioEvento) fichaCamposFaltantes.push("hora inicio del evento");
        if (!proyecto.horaFinEvento) fichaCamposFaltantes.push("hora fin del evento");
        if (!proyecto.lugarEvento) fichaCamposFaltantes.push("lugar del evento");
        const fichaCompleta = fichaCamposFaltantes.length === 0;
        const fichaTooltip = fichaCompleta
          ? ""
          : `Completa la ficha técnica antes de invitar: falta ${fichaCamposFaltantes.join(", ")}.`;
        return (
        <div className="space-y-4">
          {!fichaCompleta && (
            <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-yellow-400">⚠</span>
              <p className="text-yellow-400/80 text-xs">
                <span className="font-semibold text-yellow-400">Ficha incompleta — </span>
                para enviar invitaciones a técnicos y proveedores necesitas llenar: <span className="font-medium">{fichaCamposFaltantes.join(", ")}</span>.
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500 uppercase tracking-wider px-1">Haz clic en cualquier campo para editar</p>

          {/* ── Cliente ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Cliente</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Nombre del cliente</p>
                <Link href={`/crm/clientes/${proyecto.cliente.id}`} className="text-white hover:text-[#B3985B] font-medium">
                  {proyecto.cliente.nombre}
                </Link>
                {proyecto.cliente.empresa && <p className="text-gray-400 text-xs">{proyecto.cliente.empresa}</p>}
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Contacto del cliente</p>
                <p className="text-white text-sm">{proyecto.cliente.telefono ?? "—"}</p>
                {proyecto.cliente.correo && <p className="text-gray-400 text-xs">{proyecto.cliente.correo}</p>}
              </div>
              <Campo label="Encargado de parte del cliente" value={proyecto.encargadoCliente} field="encargadoCliente" onSave={guardarCampo} />
              <div>
                <p className="text-gray-500 text-xs mb-1">Encargado interno (Mainstage)</p>
                <p className="text-white text-sm">{proyecto.encargado?.name ?? "—"}</p>
              </div>
              {proyecto.trato?.responsable && (
                <div>
                  <p className="text-gray-500 text-xs mb-1">Vendedor responsable</p>
                  <p className="text-[#B3985B] text-sm font-medium">{proyecto.trato.responsable.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Responsables por área ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Responsables por área</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(["produccion", "logistica", "finanzas", "marketing"] as const).map(area => (
                <div key={area}>
                  <label className="text-gray-500 text-xs mb-1 block capitalize">{area}</label>
                  <select
                    value={responsables[area]}
                    onChange={e => setResponsables(prev => ({ ...prev, [area]: e.target.value }))}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  >
                    <option value="">— Sin asignar —</option>
                    {usuariosActivos.map(u => (
                      <option key={u.id} value={u.id}>{u.name}{u.area ? ` (${u.area})` : ""}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button
              onClick={guardarResponsables}
              disabled={savingResp}
              className="mt-4 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {savingResp ? "Guardando..." : "Guardar responsables"}
            </button>
          </div>

          {/* ── Chofer ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Chofer de producción</p>
              {!choferEditando && (
                <button onClick={() => {
                  setChoferTipo(proyecto.choferExterno ? "EXTERNO" : "INTERNO");
                  setChoferNombreInput(proyecto.choferNombre ?? "");
                  setChoferPersonalId("");
                  setChoferCostoInput(proyecto.choferCosto?.toString() ?? "");
                  setChoferEditando(true);
                }} className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors">
                  {proyecto.choferNombre ? "Cambiar" : "Asignar chofer"}
                </button>
              )}
            </div>
            {!choferEditando ? (
              proyecto.choferNombre ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#B3985B]/20 flex items-center justify-center text-[#B3985B] text-sm font-bold">
                    {proyecto.choferNombre[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{proyecto.choferNombre}</p>
                    <p className="text-xs text-gray-500">
                      {proyecto.choferExterno ? `Chofer externo${proyecto.choferCosto ? ` · $${proyecto.choferCosto.toLocaleString("es-MX")}` : ""}` : "Del personal del proyecto"}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${proyecto.choferExterno ? "bg-orange-900/30 text-orange-400" : "bg-green-900/30 text-green-400"}`}>
                      {proyecto.choferExterno ? "Externo" : "Interno"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-sm italic">Sin chofer asignado</p>
              )
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button onClick={() => setChoferTipo("INTERNO")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${choferTipo === "INTERNO" ? "bg-[#B3985B]/20 border-[#B3985B] text-[#B3985B]" : "border-[#333] text-gray-400 hover:border-[#555]"}`}>
                    Del personal del proyecto
                  </button>
                  <button onClick={() => setChoferTipo("EXTERNO")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${choferTipo === "EXTERNO" ? "bg-orange-900/20 border-orange-700 text-orange-400" : "border-[#333] text-gray-400 hover:border-[#555]"}`}>
                    Chofer externo
                  </button>
                </div>
                {choferTipo === "INTERNO" ? (
                  <select value={choferPersonalId} onChange={e => setChoferPersonalId(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="">— Seleccionar del personal —</option>
                    {proyecto.personal.filter(p => p.tecnico).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.tecnico!.nombre} · {p.rolTecnico?.nombre ?? p.participacion ?? "Personal"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input value={choferNombreInput} onChange={e => setChoferNombreInput(e.target.value)}
                      placeholder="Nombre del chofer externo"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    <input type="number" value={choferCostoInput} onChange={e => setChoferCostoInput(e.target.value)}
                      placeholder="Costo ($) — genera CxP automáticamente"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                )}
                {vehiculos.length > 0 && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Vehículo asignado (opcional)</label>
                    <select value={vehiculoId} onChange={e => setVehiculoId(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                      <option value="">— Sin vehículo específico —</option>
                      {vehiculos.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.nombre}{v.marca ? ` · ${v.marca}` : ""}{v.modelo ? ` ${v.modelo}` : ""}{v.placas ? ` (${v.placas})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg px-3 py-2 text-xs text-yellow-500">
                  El chofer <strong>debe descansar durante el desmontaje</strong>. No asignarle carga física en esa etapa.
                </div>
                <div className="flex gap-2">
                  <button onClick={guardarChofer} disabled={guardandoChofer || (choferTipo === "INTERNO" && !choferPersonalId) || (choferTipo === "EXTERNO" && !choferNombreInput)}
                    className="flex-1 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                    {guardandoChofer ? "Guardando..." : "Guardar"}
                  </button>
                  <button onClick={() => setChoferEditando(false)}
                    className="px-4 py-2 border border-[#333] text-gray-400 hover:text-white text-sm rounded-lg transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Evento ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Evento</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Nombre del proyecto</p>
                <p className="text-white font-medium">{proyecto.nombre}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Tipo de evento</p>
                <p className="text-white">{proyecto.tipoEvento}{proyecto.tipoServicio ? ` · ${proyecto.tipoServicio}` : ""}</p>
              </div>
            </div>
          </div>

          {/* ── Logística de renta (solo si tipoServicio === RENTA) ── */}
          {(proyecto.tipoServicio === "RENTA" || proyecto.trato?.tipoServicio === "RENTA") && (() => {
            // Leer datos de renta: primero de logisticaRenta del proyecto, luego del trato
            let rentaData: Record<string, string> = {};
            try {
              if (proyecto.logisticaRenta) {
                rentaData = JSON.parse(proyecto.logisticaRenta);
              } else if (proyecto.trato?.ideasReferencias) {
                const d = JSON.parse(proyecto.trato.ideasReferencias);
                if (d && typeof d === "object" && d.nivelServicio) rentaData = d;
              }
            } catch { /* vacío */ }

            const NIVEL_LABELS: Record<string, string> = {
              SOLO_RENTA: "Solo renta (cliente recoge)",
              RENTA_ENTREGA: "Renta + entrega",
              RENTA_MONTAJE: "Renta + montaje",
              RENTA_FULL: "Renta + operación",
            };
            const ENTREGA_LABELS: Record<string, string> = {
              RECOGE_BODEGA: "Recoge en bodega (Querétaro)",
              ENTREGA_BODEGA: "Llevamos a su bodega",
              ENTREGA_VENUE: "Llevamos al venue",
            };

            return (
              <div className="bg-[#111] border border-[#B3985B]/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Logística de renta</p>
                  <span className="text-[10px] text-[#B3985B]/50 bg-[#B3985B]/8 px-2 py-0.5 rounded-full">RENTA DE EQUIPO</span>
                </div>
                <p className="text-gray-600 text-xs mb-4">Datos capturados en el descubrimiento del trato. Para modificarlos, edita el trato.</p>
                {Object.keys(rentaData).length === 0 ? (
                  <p className="text-gray-600 text-sm italic">Sin datos de logística. Completa el descubrimiento en el trato asociado para ver esta información.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    {rentaData.nivelServicio && (
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Nivel de servicio</p>
                        <p className="text-white">{NIVEL_LABELS[rentaData.nivelServicio] ?? rentaData.nivelServicio}</p>
                      </div>
                    )}
                    {rentaData.entrega && (
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Modalidad de entrega</p>
                        <p className="text-white">{ENTREGA_LABELS[rentaData.entrega] ?? rentaData.entrega}</p>
                      </div>
                    )}
                    {rentaData.fechaEntrega && (
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Fecha de entrega</p>
                        <p className="text-white">{fmtDate(rentaData.fechaEntrega)}{rentaData.horaEntrega ? ` · ${rentaData.horaEntrega}` : ""}</p>
                      </div>
                    )}
                    {rentaData.fechaDevolucion && (
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Fecha de devolución/recolección</p>
                        <p className="text-white">{fmtDate(rentaData.fechaDevolucion)}{rentaData.horaDevolucion ? ` · ${rentaData.horaDevolucion}` : ""}</p>
                      </div>
                    )}
                    {rentaData.direccionEntrega && (
                      <div className="col-span-2">
                        <p className="text-gray-500 text-xs mb-1">Dirección de entrega</p>
                        <p className="text-white">{rentaData.direccionEntrega}</p>
                      </div>
                    )}
                    {rentaData.tecnicoPropio !== undefined && rentaData.tecnicoPropio !== "" && (
                      <div>
                        <p className="text-gray-500 text-xs mb-1">¿Cliente tiene técnico propio?</p>
                        <p className="text-white">{rentaData.tecnicoPropio === "SI" ? "Sí" : rentaData.tecnicoPropio === "NO" ? "No" : rentaData.tecnicoPropio}</p>
                      </div>
                    )}
                    {rentaData.descripcionEquipos && (
                      <div className="col-span-2">
                        <p className="text-gray-500 text-xs mb-1">Descripción de equipos solicitados</p>
                        <p className="text-gray-300 whitespace-pre-wrap">{rentaData.descripcionEquipos}</p>
                      </div>
                    )}
                  </div>
                )}
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
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#B3985B" }}>
                    📦 Recolección de equipo
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
                        {new Date(proyecto.recoleccionFechaReal).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
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
                      }} className="px-3 py-1.5 rounded-lg bg-blue-900/30 border border-blue-800/40 text-blue-400 text-xs font-semibold hover:bg-blue-900/50 transition-colors">
                        🚚 Salió a recolectar
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

          {/* ── Horarios ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Fechas y horarios</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Fecha del evento</p>
                <p className="text-white font-medium">{fmtDate(proyecto.fechaEvento)}</p>
              </div>
              <Campo label="Horario del evento (inicio)" value={proyecto.horaInicioEvento} field="horaInicioEvento" onSave={guardarCampo} />
              <Campo label="Horario del evento (fin)" value={proyecto.horaFinEvento} field="horaFinEvento" onSave={guardarCampo} />
              <Campo label="Día de montaje" value={proyecto.fechaMontaje ? proyecto.fechaMontaje.split("T")[0] : ""} field="fechaMontaje" onSave={guardarCampo} type="date" />
              <div>
                <p className="text-gray-500 text-xs mb-1">Hora inicio montaje</p>
                <TimePicker
                  value={proyecto.horaInicioMontaje ?? ""}
                  onChange={v => guardarCampo("horaInicioMontaje", v)}
                />
              </div>
              <Campo label="Duración del montaje (hrs)" value={proyecto.duracionMontajeHrs?.toString() ?? ""} field="duracionMontajeHrs" onSave={guardarCampo} type="number" />
              {/* Ventana de montaje — dato del venue proporcionado por el cliente */}
              {(proyecto.trato?.ventanaMontajeInicio || proyecto.trato?.ventanaMontajeFin) && (
                <div className="col-span-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-3 flex items-center gap-3">
                  <span className="text-[#B3985B] text-sm">🏟</span>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Ventana permitida por el venue</p>
                    <p className="text-white text-sm font-medium">
                      {proyecto.trato.ventanaMontajeInicio ?? "—"}
                      {" → "}
                      {proyecto.trato.ventanaMontajeFin ?? "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Lugar ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Lugar del evento</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div className="col-span-2">
                <CampoVenue label="Lugar del evento" value={proyecto.lugarEvento} field="lugarEvento" onSave={guardarCampo} />
              </div>
              <Campo label="Encargado del lugar" value={proyecto.encargadoLugar} field="encargadoLugar" onSave={guardarCampo} />
              <Campo label="Contacto del lugar" value={proyecto.encargadoLugarContacto} field="encargadoLugarContacto" onSave={guardarCampo} />
            </div>
          </div>

          {/* ── Briefing del proyecto (handoff ventas → producción) ── */}
          <div className="bg-[#111] border border-[#B3985B]/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Briefing del proyecto</p>
              <span className="text-[10px] text-[#B3985B]/50 bg-[#B3985B]/10 px-2 py-0.5 rounded-full">Handoff ventas → producción</span>
            </div>
            <div className="space-y-4">
              <Campo label="Descripción general del proyecto" value={proyecto.descripcionGeneral} field="descripcionGeneral" onSave={guardarCampo} multiline />
              <Campo label="Detalles específicos del proyecto" value={proyecto.detallesEspecificos} field="detallesEspecificos" onSave={guardarCampo} multiline />
              {proyecto.trato?.ideasReferencias && (() => {
                let ideas: Record<string, string> = {};
                try { ideas = JSON.parse(proyecto.trato.ideasReferencias); } catch { return null; }
                if (!ideas.ideasReferencias) return null;
                return (
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Ideas / referencias del cliente (del descubrimiento)</p>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{ideas.ideasReferencias}</p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Personal del evento (gestión completa) ── */}
          <div className="space-y-3">
            {/* Formulario agregar */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Personal del evento</p>
                <div className="flex items-center gap-2">
                  {proyecto.personal.length > 0 && (
                    <button
                      onClick={() => setShowBroadcast(v => !v)}
                      className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium border border-green-800/40 rounded-lg px-2 py-1"
                      title="Enviar detalles del evento a todo el equipo por WhatsApp"
                    >
                      📣 Broadcast WA
                    </button>
                  )}
                  <button onClick={() => setShowAddPersonal(v => !v)}
                    className="text-sm text-[#B3985B] hover:text-white transition-colors font-medium">
                    {showAddPersonal ? "− Cancelar" : "+ Agregar técnico"}
                  </button>
                </div>
              </div>
              {showBroadcast && (() => {
                const fecha = new Date(proyecto.fechaEvento).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
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

              {showAddPersonal && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Participación en</label>
                    <select value={selParticipacion} onChange={e => setSelParticipacion(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#B3985B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                      <option value="OPERACION">Operación del evento</option>
                      <option value="MONTAJE">Montaje</option>
                      <option value="DESMONTAJE">Desmontaje</option>
                      <option value="TRANSPORTE">Transporte</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Técnico</label>
                    <select value={selTecnico} onChange={e => setSelTecnico(e.target.value)}
                      className={`w-full bg-[#1a1a1a] border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] ${disponibilidad && !disponibilidad.disponible ? "border-red-500/60" : "border-[#333]"}`}>
                      <option value="">— Sin asignar —</option>
                      {tecnicos.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre} · {t.rol?.nombre ?? "Sin rol"} · {t.nivel}</option>
                      ))}
                    </select>
                    {disponibilidad && !disponibilidad.disponible && (
                      <p className="text-red-400 text-xs mt-1">
                        ⚠ Conflicto: asignado en {disponibilidad.conflictos.map(c => c.nombre).join(", ")}
                      </p>
                    )}
                    {disponibilidad?.disponible && selTecnico && (
                      <p className="text-green-500 text-xs mt-1">✓ Disponible para esta fecha</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Rol técnico</label>
                    <select value={selRol} onChange={e => setSelRol(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                      <option value="">— Rol —</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Nivel</label>
                    <select value={selNivel} onChange={e => setSelNivel(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                      <option value="AAA">AAA</option><option value="AA">AA</option><option value="A">A</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Jornada</label>
                    <select value={selJornada} onChange={e => setSelJornada(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                      <option value="CORTA">0–8 hrs</option>
                      <option value="MEDIA">8–12 hrs</option>
                      <option value="LARGA">12+ hrs</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Tarifa acordada ($)</label>
                    <input type="number" value={selTarifa} onChange={e => setSelTarifa(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 block mb-1">Responsabilidad / descripción</label>
                    <input value={selResp} onChange={e => setSelResp(e.target.value)}
                      placeholder="Ej: Operador FOH, manejo de consola DiGiCo..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={agregarPersonal} disabled={addingPersonal || (!selTecnico && !selRol)}
                      className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                      {addingPersonal ? "Agregando..." : "Agregar"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lista personal agrupada */}
            {proyecto.personal.length === 0 ? (
              <div className="bg-[#111] border border-[#222] rounded-xl p-6 text-center text-gray-600 text-sm">
                Sin personal asignado aún
              </div>
            ) : (
              (["OPERACION", "MONTAJE", "DESMONTAJE", "TRANSPORTE", "OTRO"] as const).map(tipo => {
                const grupo = proyecto.personal.filter(p => (p.participacion ?? "OPERACION") === tipo);
                if (grupo.length === 0) return null;
                const labels: Record<string, string> = {
                  OPERACION: "Operadores del evento",
                  MONTAJE: "Técnicos de montaje",
                  DESMONTAJE: "Técnicos de desmontaje",
                  TRANSPORTE: "Transportes",
                  OTRO: "Otros",
                };
                const sinAsignar = grupo.filter(p => !p.tecnico).length;
                return (
                  <div key={tipo} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-[#1a1a1a] flex items-center justify-between">
                      <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">{labels[tipo]} ({grupo.length})</p>
                      {sinAsignar > 0 && <span className="text-xs text-yellow-500">{sinAsignar} sin asignar</span>}
                    </div>
                    {grupo.map(p => (
                      <div key={p.id} className="p-4 border-b border-[#0d0d0d] last:border-0">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            {!p.tecnico ? (
                              asignandoId === p.id ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    autoFocus
                                    defaultValue=""
                                    onChange={e => { if (e.target.value) asignarTecnico(p.id, e.target.value); }}
                                    className="flex-1 bg-[#1a1a1a] border border-[#B3985B] rounded-lg px-2 py-1 text-white text-sm focus:outline-none"
                                  >
                                    <option value="">— Seleccionar técnico —</option>
                                    {tecnicos.map(t => (
                                      <option key={t.id} value={t.id}>{t.nombre} · {t.rol?.nombre ?? "Sin rol"} · {t.nivel}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => { setAsignandoId(null); setSelAsignar(""); }}
                                    className="text-gray-500 hover:text-white text-xs shrink-0">Cancelar</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-yellow-500 text-sm italic">Sin asignar</span>
                                  {p.nivel && <span className={`text-xs font-bold ${NIVEL_COLORS[p.nivel] ?? "text-gray-400"}`}>{p.nivel}</span>}
                                  <button onClick={() => { setAsignandoId(p.id); setSelAsignar(""); }}
                                    className="text-xs text-[#B3985B] hover:text-white border border-[#B3985B]/40 hover:border-[#B3985B] px-2 py-0.5 rounded transition-colors">
                                    Asignar técnico
                                  </button>
                                </div>
                              )
                            ) : (
                              <div className="flex items-center gap-2">
                                <p className="text-white text-sm font-medium">{p.tecnico.nombre}</p>
                                {p.nivel && <span className={`text-xs font-bold ${NIVEL_COLORS[p.nivel] ?? "text-gray-400"}`}>{p.nivel}</span>}
                              </div>
                            )}
                            <p className="text-gray-500 text-xs mt-0.5">
                              {p.rolTecnico?.nombre ?? p.tecnico?.rol?.nombre ?? "Sin rol"}
                              {p.jornada ? ` · ${p.jornada}` : ""}
                              {p.responsabilidad ? ` · ${p.responsabilidad}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                            {p.tarifaAcordada != null && (
                              <span className="text-gray-300 text-sm">{fmt(p.tarifaAcordada)}</span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.estadoPago === "PAGADO" ? "bg-green-900/50 text-green-300" : "bg-yellow-900/30 text-yellow-400"
                            }`}>
                              {p.estadoPago === "PAGADO" ? "Pagado" : "Pend."}
                            </span>
                            {p.confirmRespuesta && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                p.confirmRespuesta === "CONFIRMADO" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                              }`}>
                                {p.confirmRespuesta === "CONFIRMADO" ? "✓ Confirmó" : "✗ Rechazó"}
                              </span>
                            )}
                            <button onClick={() => toggleConfirmar(p.id, p.confirmado)}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                                p.confirmado
                                  ? "border-green-700 text-green-400 hover:bg-red-900/20 hover:text-red-400 hover:border-red-700"
                                  : "border-[#333] text-gray-500 hover:border-green-700 hover:text-green-400"
                              }`}>
                              {p.confirmado ? "✓ Confirmado" : "Confirmar"}
                            </button>
                            {p.tecnico && (
                              <button
                                disabled={!fichaCompleta}
                                title={fichaCompleta ? "Enviar invitación por WhatsApp" : fichaTooltip}
                                onClick={async () => {
                                  const res = await fetch(`/api/proyectos/${id}/personal/${p.id}/invitar`, { method: "POST" });
                                  const d = await res.json();
                                  if (d.whatsappUrl) {
                                    window.open(d.whatsappUrl, "_blank");
                                    await load();
                                  } else if (d.token) {
                                    const url = `${window.location.origin}/confirmar/tecnico/${d.token}`;
                                    await navigator.clipboard.writeText(url).catch(() => {});
                                    toast.info("Sin número registrado. Link copiado al portapapeles.");
                                    await load();
                                  }
                                }}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${fichaCompleta ? "border-green-800/50 text-green-500 hover:bg-green-900/20 hover:border-green-600 cursor-pointer" : "border-[#333] text-gray-600 cursor-not-allowed opacity-50"}`}>
                                📲 Invitar
                              </button>
                            )}
                            {p.tecnico && (
                              <a
                                href={`/api/proyectos/${proyecto.id}/personal/${p.id}/carta`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Descargar carta responsiva freelance"
                                className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#333] text-gray-500 hover:border-[#B3985B]/50 hover:text-[#B3985B] transition-colors"
                              >
                                📄 Carta
                              </a>
                            )}
                            <button onClick={() => eliminarPersonal(p.id)}
                              className="text-gray-600 hover:text-red-400 text-lg leading-none transition-colors">×</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>

          {/* ── Logística (solo producción técnica / dirección técnica) ── */}
          {!(proyecto.tipoServicio === "RENTA" || proyecto.trato?.tipoServicio === "RENTA") && (
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Logística</p>

            {/* Transportes: 3 fichas */}
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Transportes del evento</p>
            <div className="grid grid-cols-1 gap-3 mb-5">
              {transporteSlots.map((slot, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-semibold mb-3">Transporte {i + 1}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Proveedor</label>
                      <input value={slot.proveedor} onChange={e => updateTransporte(i, "proveedor", e.target.value)}
                        onBlur={() => guardarTransportes(transporteSlots)}
                        placeholder="Nombre del proveedor"
                        className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Marca y modelo</label>
                      <input value={slot.marcaModelo} onChange={e => updateTransporte(i, "marcaModelo", e.target.value)}
                        onBlur={() => guardarTransportes(transporteSlots)}
                        placeholder="Ej: Mercedes Sprinter"
                        className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Comentarios</label>
                      <input value={slot.comentarios} onChange={e => updateTransporte(i, "comentarios", e.target.value)}
                        onBlur={() => guardarTransportes(transporteSlots)}
                        placeholder="Notas adicionales"
                        className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                    </div>
                  </div>
                </div>
              ))}
              {savingTransporte && <p className="text-xs text-gray-600">Guardando...</p>}
            </div>

            {/* Catering de producción */}
            <div className="border-t border-[#1a1a1a] pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Catering de producción</p>
                <div className="flex items-center gap-2">
                  {savingCatering && <span className="text-xs text-gray-600">Guardando...</span>}
                  {catering.contactoTelefono && (
                    <button onClick={abrirWhatsAppCatering}
                      className="text-xs border border-green-800/50 text-green-500 hover:bg-green-900/20 hover:border-green-600 px-3 py-1.5 rounded-lg transition-colors font-medium">
                      📲 Solicitar a proveedor
                    </button>
                  )}
                  <button onClick={() => guardarCatering(catering)} disabled={savingCatering}
                    className="text-xs bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    Guardar
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Proveedor de catering */}
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Proveedor de catering</label>
                  <select
                    value={catering.proveedorId}
                    onChange={e => {
                      const prov = proveedores.find(p => p.id === e.target.value);
                      setCatering(prev => ({
                        ...prev,
                        proveedorId: e.target.value,
                        contactoNombre: prov ? prov.nombre : prev.contactoNombre,
                        contactoTelefono: prov?.telefono ?? prev.contactoTelefono,
                      }));
                    }}
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]">
                    <option value="">— Seleccionar proveedor —</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}{p.giro ? ` · ${p.giro}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Contacto (se auto-llena al seleccionar proveedor, editable) */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nombre de contacto</label>
                  <input value={catering.contactoNombre}
                    onChange={e => setCatering(p => ({ ...p, contactoNombre: e.target.value }))}
                    placeholder="Nombre del contacto"
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Teléfono / WhatsApp</label>
                  <input value={catering.contactoTelefono}
                    onChange={e => setCatering(p => ({ ...p, contactoTelefono: e.target.value }))}
                    placeholder="Ej: 4421234567"
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                </div>
                {/* Personas */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-500">Elementos a alimentar</label>
                    {proyecto.personal.length > 0 && (
                      <button type="button"
                        onClick={() => setCatering(p => ({ ...p, personasCrew: String(proyecto.personal.length) }))}
                        className="text-[10px] text-[#B3985B] hover:text-white transition-colors">
                        ↺ {proyecto.personal.length} técnicos
                      </button>
                    )}
                  </div>
                  <input type="number" min="1" value={catering.personasCrew}
                    onChange={e => setCatering(p => ({ ...p, personasCrew: e.target.value }))}
                    placeholder="Ej: 8"
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                </div>
                {/* Servicios por día */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-500">Servicios por día</label>
                    {proyecto.cotizacion && proyecto.cotizacion.diasComidas > 0 && (
                      <span className="text-[10px] text-gray-600">
                        {proyecto.cotizacion.diasComidas} día{proyecto.cotizacion.diasComidas !== 1 ? "s" : ""} cotizados
                      </span>
                    )}
                  </div>
                  <input type="number" min="1" value={catering.comidasPorDia}
                    onChange={e => setCatering(p => ({ ...p, comidasPorDia: e.target.value }))}
                    placeholder="Ej: 2 (comida + cena)"
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Notas especiales (alergias, restricciones…)</label>
                  <input value={catering.notas}
                    onChange={e => setCatering(p => ({ ...p, notas: e.target.value }))}
                    placeholder="Ej: 2 vegetarianos, sin gluten para técnico de iluminación"
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>
            </div>
          </div>
          )}

          {/* ── Cronograma (tabla) — solo producción técnica / dirección técnica ── */}
          {!(proyecto.tipoServicio === "RENTA" || proyecto.trato?.tipoServicio === "RENTA") && (
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Cronología general del evento</p>
              <div className="flex items-center gap-2 flex-wrap">
                {savingCrono && <span className="text-xs text-gray-600">Guardando...</span>}
                <button onClick={cargarPlantillaCrono}
                  className="text-xs text-gray-400 hover:text-white border border-[#333] hover:border-[#555] px-3 py-1 rounded-lg transition-colors">
                  Plantilla base
                </button>
                <button onClick={addCronoRow}
                  className="text-xs text-[#B3985B] hover:text-white border border-[#B3985B]/40 hover:border-[#B3985B] px-3 py-1 rounded-lg transition-colors">
                  + Agregar fila
                </button>
                {cronoRows.length > 0 && (
                  <button onClick={() => guardarCronograma(cronoRows)} disabled={savingCrono}
                    className="text-xs bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold px-3 py-1 rounded-lg transition-colors">
                    Guardar
                  </button>
                )}
              </div>
            </div>
            {cronoRows.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-gray-600 text-sm">Sin actividades aún.</p>
                <p className="text-gray-700 text-xs">Presiona <span className="text-gray-400 font-medium">Plantilla base</span> para cargar las 17 actividades estándar del evento.</p>
              </div>
            ) : (
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
                    {cronoRows.map((row, i) => (
                      <tr key={i} className={`border-b border-[#1a1a1a] last:border-0 ${i % 2 === 1 ? "bg-[#0d0d0d]" : ""}`}>
                        <td className="py-1 pr-2">
                          <input type="time" value={row.horaInicio} onChange={e => updateCronoRow(i, "horaInicio", e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white focus:outline-none focus:border-[#B3985B] [color-scheme:dark]" />
                        </td>
                        <td className="py-1 pr-2">
                          <input type="time" value={row.horaFin} onChange={e => updateCronoRow(i, "horaFin", e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white focus:outline-none focus:border-[#B3985B] [color-scheme:dark]" />
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
            )}
          </div>
          )}

          {/* ── Documentos operativos ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Documentos operativos</p>
            {(() => {
              const esRenta = proyecto.tipoServicio === "RENTA" || proyecto.trato?.tipoServicio === "RENTA";
              const tiposDoc = esRenta
                ? (["RIDER", "OTRO"] as const)
                : (["RENDER", "PLOT_PATCH", "INPUT_LIST", "RIDER", "FICHA_TECNICA", "ITINERARIO", "OTRO"] as const);
              return tiposDoc;
            })().map(tipo => {
              const labels: Record<string, string> = {
                RENDER: "Render real",
                PLOT_PATCH: "Render plot / patch",
                INPUT_LIST: "Input list",
                RIDER: "Rider técnico",
                FICHA_TECNICA: "Ficha técnica",
                ITINERARIO: "Itinerario",
                OTRO: "Otros documentos",
              };
              const archivosDelTipo = proyecto.archivos.filter(a => a.tipo === tipo);
              return (
                <div key={tipo} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400 font-medium">{labels[tipo]}</p>
                    <label className={`cursor-pointer text-xs border px-3 py-1 rounded-lg transition-colors ${
                      uploadingTipo === tipo
                        ? "border-gray-700 text-gray-600"
                        : "border-[#B3985B]/40 text-[#B3985B] hover:border-[#B3985B] hover:text-white"
                    }`}>
                      {uploadingTipo === tipo ? "Subiendo..." : "+ Subir archivo"}
                      <input type="file" className="hidden" disabled={uploadingTipo !== null}
                        onChange={e => subirArchivo(e, tipo)} />
                    </label>
                  </div>
                  {archivosDelTipo.length === 0 ? (
                    <p className="text-gray-700 text-xs italic pl-1">Sin archivos</p>
                  ) : (
                    <div className="space-y-1">
                      {archivosDelTipo.map(a => (
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
                </div>
              );
            })}
          </div>

          {/* ── Contactos ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Contactos</p>
            <div className="grid grid-cols-1 gap-y-4 text-sm">
              <Campo label="Contactos de dirección y coordinación" value={proyecto.contactosDireccion} field="contactosDireccion" onSave={guardarCampo} multiline />
              <Campo label="Contactos de emergencia" value={proyecto.contactosEmergencia} field="contactosEmergencia" onSave={guardarCampo} multiline />
            </div>
          </div>

          {/* ── Captura de contenido / Marketing ── */}
          {(() => {
            type MktData = {
              activo: boolean; nombre: string; telefono: string;
              tiposContenido: string[];
              capturista: string; capturistaExterno: boolean;
              autorizacion: string;
              entregaFecha: string;
              usoRedes: boolean; usoPortfolio: boolean; usoWeb: boolean;
              publicadoEn: string[];
              notas: string;
            };
            const TIPOS = [
              { id: "fotos_evento", label: "Fotos del evento" },
              { id: "video_highlights", label: "Video highlights" },
              { id: "reels_sociales", label: "Reels / TikTok" },
              { id: "detras_camara", label: "Detrás de cámaras / making of" },
              { id: "setup_equipo", label: "Fotos del setup / equipo" },
              { id: "testimonio_video", label: "Testimonio en video" },
              { id: "testimonio_escrito", label: "Testimonio escrito" },
            ];
            const PLATAFORMAS = ["Instagram", "Facebook", "TikTok", "YouTube", "Web", "Portfolio"];
            let mkt: MktData = {
              activo: false, nombre: "", telefono: "",
              tiposContenido: [], capturista: "", capturistaExterno: false,
              autorizacion: "PENDIENTE", entregaFecha: "",
              usoRedes: true, usoPortfolio: true, usoWeb: false,
              publicadoEn: [], notas: "",
            };
            try { if (proyecto.marketingData) mkt = { ...mkt, ...JSON.parse(proyecto.marketingData) }; } catch { /* defaults */ }

            async function saveMkt(patch: Partial<MktData>) {
              const nuevo = { ...mkt, ...patch };
              await guardarCampo("marketingData", JSON.stringify(nuevo));
            }

            const tel = mkt.telefono.replace(/\D/g, "");
            const waLink = tel ? `https://wa.me/52${tel}?text=${encodeURIComponent(`Hola ${mkt.nombre || ""}! Para el evento "${proyecto.nombre}" del ${new Date(proyecto.fechaEvento).toLocaleDateString("es-MX", { day: "numeric", month: "long" })} — queremos coordinar el levantamiento de contenido. ¿Tienes disponibilidad? ¿Qué necesitamos confirmar?`)}` : null;

            return (
              <div className="bg-[#111] border border-[#222] rounded-xl p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">📸</span>
                    <div>
                      <p className="text-white text-sm font-medium">Captura de contenido</p>
                      <p className="text-gray-600 text-xs">¿Se levanta contenido para marketing en este evento?</p>
                    </div>
                  </div>
                  <button onClick={() => saveMkt({ activo: !mkt.activo })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${mkt.activo ? "bg-[#B3985B]" : "bg-[#333]"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${mkt.activo ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>

                {mkt.activo && (<>
                  {/* Tipo de contenido */}
                  <div className="pt-3 border-t border-[#1a1a1a]">
                    <p className="text-xs text-gray-400 mb-2">Tipo de contenido a capturar</p>
                    <div className="flex flex-wrap gap-1.5">
                      {TIPOS.map(t => {
                        const sel = mkt.tiposContenido.includes(t.id);
                        return (
                          <button key={t.id}
                            onClick={() => saveMkt({ tiposContenido: sel ? mkt.tiposContenido.filter(x => x !== t.id) : [...mkt.tiposContenido, t.id] })}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sel ? "border-[#B3985B]/50 bg-[#B3985B]/10 text-[#B3985B]" : "border-[#333] text-gray-500 hover:text-gray-300"}`}>
                            {sel ? "✓ " : ""}{t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Capturista */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Capturista / fotógrafo asignado</p>
                      <input defaultValue={mkt.capturista} onBlur={e => saveMkt({ capturista: e.target.value })}
                        placeholder="Nombre del capturista"
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Fecha límite de entrega de contenido</p>
                      <input type="date" defaultValue={mkt.entregaFecha} onBlur={e => saveMkt({ entregaFecha: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                    </div>
                  </div>

                  {/* Contacto de coordinación */}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Contacto para coordinación de contenido</p>
                    <div className="flex gap-2">
                      <input defaultValue={mkt.nombre} onBlur={e => saveMkt({ nombre: e.target.value })}
                        placeholder="Nombre"
                        className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                      <input defaultValue={mkt.telefono} onBlur={e => saveMkt({ telefono: e.target.value })}
                        placeholder="Teléfono"
                        className="w-36 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                      {waLink && (
                        <a href={waLink} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 flex items-center gap-1 bg-green-800 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                          💬
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Autorización y uso */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Autorización del cliente</p>
                      <select value={mkt.autorizacion} onChange={e => saveMkt({ autorizacion: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]">
                        <option value="PENDIENTE">Pendiente de confirmar</option>
                        <option value="AUTORIZADO">Autorizado por el cliente</option>
                        <option value="RECHAZADO">No autorizado — uso interno</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Usos autorizados</p>
                      <div className="flex gap-2 flex-wrap">
                        {[{ k: "usoRedes" as const, l: "Redes" }, { k: "usoPortfolio" as const, l: "Portfolio" }, { k: "usoWeb" as const, l: "Web" }].map(u => (
                          <button key={u.k} onClick={() => saveMkt({ [u.k]: !mkt[u.k] })}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${mkt[u.k] ? "border-[#B3985B]/50 bg-[#B3985B]/10 text-[#B3985B]" : "border-[#333] text-gray-500"}`}>
                            {mkt[u.k] ? "✓ " : ""}{u.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Publicado en */}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Publicado en</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {PLATAFORMAS.map(p => {
                        const pub = mkt.publicadoEn.includes(p);
                        return (
                          <button key={p} onClick={() => saveMkt({ publicadoEn: pub ? mkt.publicadoEn.filter(x => x !== p) : [...mkt.publicadoEn, p] })}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${pub ? "border-green-600/50 bg-green-900/20 text-green-400" : "border-[#333] text-gray-600 hover:text-gray-400"}`}>
                            {pub ? "✓ " : ""}{p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notas */}
                  <div>
                    <textarea defaultValue={mkt.notas} onBlur={e => saveMkt({ notas: e.target.value })}
                      rows={2} placeholder="Notas sobre el contenido: ángulos clave, momentos específicos, restricciones del venue..."
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B] resize-none" />
                  </div>

                  {/* Status badge */}
                  {mkt.autorizacion === "AUTORIZADO" && mkt.tiposContenido.length > 0 && (
                    <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 text-xs text-green-400">
                      Contenido autorizado: {mkt.tiposContenido.map(id => TIPOS.find(t => t.id === id)?.label).filter(Boolean).join(", ")}
                      {mkt.publicadoEn.length > 0 && ` · Publicado en: ${mkt.publicadoEn.join(", ")}`}
                    </div>
                  )}
                </>)}
              </div>
            );
          })()}

          {/* ── Comentarios ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Comentarios finales / adicionales</p>
            <Campo label="" value={proyecto.comentariosFinales} field="comentariosFinales" onSave={guardarCampo} multiline />
          </div>
        </div>
        );
      })()}

      {/* ────── TAB: EQUIPOS ────── */}
      {tab === "equipos" && (() => {
        const equiposPropios  = proyecto.equipos.filter(e => e.tipo === "PROPIO");
        const equiposExternos = proyecto.equipos.filter(e => e.tipo === "EXTERNO");
        const camposFaltantesEq: string[] = [];
        if (!proyecto.horaInicioEvento) camposFaltantesEq.push("hora inicio del evento");
        if (!proyecto.horaFinEvento) camposFaltantesEq.push("hora fin del evento");
        if (!proyecto.lugarEvento) camposFaltantesEq.push("lugar del evento");
        const fichaCompletaEq = camposFaltantesEq.length === 0;
        const fichaTooltipEq = fichaCompletaEq ? "" : `Completa la ficha técnica antes de invitar: falta ${camposFaltantesEq.join(", ")}.`;
        const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

        function EquipoRow({ eq }: { eq: ProyectoEquipoItem }) {
          const costo = eq.costoExterno ? eq.costoExterno * eq.cantidad * eq.dias : null;
          return (
            <div className={`flex items-center gap-3 px-5 py-3 border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#141414] transition-colors ${eq.confirmado ? "" : "opacity-80"}`}>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{eq.equipo.descripcion}</p>
                <p className="text-gray-500 text-xs">{eq.equipo.categoria.nombre}{eq.equipo.marca ? ` · ${eq.equipo.marca}` : ""}</p>
                {eq.proveedor && <p className="text-[#B3985B] text-xs">{eq.proveedor.nombre}</p>}
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
                {/* Respuesta del proveedor */}
                {eq.confirmDisponible !== null && eq.confirmDisponible !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    eq.confirmDisponible ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-300"
                  }`}>
                    {eq.confirmDisponible ? "✓ Disponible" : "✗ No disp."}
                  </span>
                )}
                <button onClick={() => toggleConfirmadoEquipo(eq.id, eq.confirmado)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${eq.confirmado ? "bg-green-900/50 text-green-300 hover:bg-green-900/70" : "bg-[#222] text-gray-500 hover:bg-[#2a2a2a] hover:text-white"}`}>
                  {eq.confirmado ? "Confirmado" : "Confirmar"}
                </button>
                {/* Botón invitar proveedor (solo equipo externo con proveedor) */}
                {eq.tipo === "EXTERNO" && eq.proveedor && (
                  <button
                    disabled={!fichaCompletaEq}
                    title={fichaCompletaEq ? "Consultar disponibilidad al proveedor" : fichaTooltipEq}
                    onClick={async () => {
                      const res = await fetch(`/api/proyectos/${id}/equipos/${eq.id}/invitar-proveedor`, { method: "POST" });
                      const d = await res.json();
                      if (d.whatsappUrl) {
                        window.open(d.whatsappUrl, "_blank");
                        await load();
                      } else if (d.token) {
                        const url = `${window.location.origin}/confirmar/proveedor/${d.token}`;
                        await navigator.clipboard.writeText(url).catch(() => {});
                        toast.info("Sin número registrado. Link copiado al portapapeles.");
                        await load();
                      }
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border transition-colors ${fichaCompletaEq ? "border-blue-800/50 text-blue-400 hover:bg-blue-900/20 hover:border-blue-600 cursor-pointer" : "border-[#333] text-gray-600 cursor-not-allowed opacity-50"}`}>
                    📲 Proveedor
                  </button>
                )}
                <button onClick={() => eliminarEquipo(eq.id)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">✕</button>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
                <p className="text-white text-xl font-bold">{proyecto.equipos.length}</p>
                <p className="text-gray-500 text-xs">items totales</p>
              </div>
              <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
                <p className="text-white text-xl font-bold">{proyecto.equipos.filter(e => e.confirmado).length}</p>
                <p className="text-gray-500 text-xs">confirmados</p>
              </div>
              <div className="bg-[#111] border border-[#222] rounded-xl p-4 text-center">
                <p className="text-yellow-400 text-xl font-bold">
                  {fmt(equiposExternos.reduce((s, e) => s + (e.costoExterno ?? 0) * e.cantidad * e.dias, 0))}
                </p>
                <p className="text-gray-500 text-xs">costo externo</p>
              </div>
            </div>

            {/* Botón agregar */}
            {!showAddEquipo ? (
              <button onClick={() => setShowAddEquipo(true)}
                className="w-full border border-dashed border-[#333] hover:border-[#B3985B] text-gray-500 hover:text-[#B3985B] py-3 rounded-xl text-sm transition-colors">
                + Agregar equipo
              </button>
            ) : (
              <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-3">
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Agregar equipo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Equipo *</label>
                    <select value={selEquipoId} onChange={e => setSelEquipoId(e.target.value)}
                      className={`w-full bg-[#0d0d0d] border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] ${dispEquipo && !dispEquipo.disponible ? "border-red-500/60" : "border-[#2a2a2a]"}`}>
                      <option value="">Seleccionar equipo...</option>
                      {equipoCatalogo.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.categoria.nombre} — {eq.descripcion}{eq.marca ? ` (${eq.marca})` : ""}</option>
                      ))}
                    </select>
                    {dispEquipo && selEquipoTipo === "PROPIO" && selEquipoId && (
                      dispEquipo.disponible ? (
                        <p className="text-green-500 text-xs mt-1">✓ Disponible: {dispEquipo.cantidadDisponible} de {dispEquipo.cantidadTotal} unidades libres</p>
                      ) : (
                        <p className="text-red-400 text-xs mt-1">
                          ⚠ Solo {dispEquipo.cantidadDisponible} disponibles de {dispEquipo.cantidadTotal} · comprometido en: {dispEquipo.conflictos.map(c => c.nombre).join(", ")}
                        </p>
                      )
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                    <select value={selEquipoTipo} onChange={e => setSelEquipoTipo(e.target.value)}
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                      <option value="PROPIO">Propio</option>
                      <option value="EXTERNO">Externo (renta)</option>
                    </select>
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
                        <select value={selEquipoProveedor} onChange={e => setSelEquipoProveedor(e.target.value)}
                          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                          <option value="">Sin proveedor</option>
                          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
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
                  <p className="text-xs text-yellow-400">Se creará CxP: {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(parseFloat(selEquipoCosto) * (parseInt(selEquipoCantidad) || 1) * (parseInt(selEquipoDias) || 1))} al agregar</p>
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

            {/* Propios */}
            {equiposPropios.length > 0 && (
              <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1a1a1a]">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Equipo propio ({equiposPropios.length})</p>
                </div>
                {equiposPropios.map(eq => <EquipoRow key={eq.id} eq={eq} />)}
              </div>
            )}

            {/* Externos */}
            {equiposExternos.length > 0 && (
              <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Equipo externo / renta ({equiposExternos.length})</p>
                  <p className="text-xs text-yellow-400 font-semibold">
                    Total: {fmt(equiposExternos.reduce((s, e) => s + (e.costoExterno ?? 0) * e.cantidad * e.dias, 0))}
                  </p>
                </div>
                {equiposExternos.map(eq => <EquipoRow key={eq.id} eq={eq} />)}
              </div>
            )}

            {proyecto.equipos.length === 0 && (
              <div className="bg-[#111] border border-[#222] rounded-xl py-12 text-center">
                <p className="text-gray-600 text-sm">Sin equipos asignados</p>
                <p className="text-gray-700 text-xs mt-1">Agrega equipo propio o externo para este proyecto</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ────── TAB: DOCS ────── */}
      {tab === "docs" && (() => {
        const tipoEvento = (proyecto.tipoEvento || "").toUpperCase();
        const esMusical = tipoEvento.includes("MUSICAL") || tipoEvento.includes("CONCIERTO") || tipoEvento.includes("FESTIVAL");
        const esEmpresarial = tipoEvento.includes("EMPRESARIAL") || tipoEvento.includes("CORPORATIVO") || tipoEvento.includes("CONGRESO") || tipoEvento.includes("CONFERENCIA");
        const esSocial = !esMusical && !esEmpresarial;

        type DocsData = {
          horarioGeneral: { hora: string; actividad: string; responsable: string }[];
          // Musical
          inputList: { canal: string; instrumento: string; artista: string; microfono: string; notas: string }[];
          soundcheck: { hora: string; artista: string; duracion: string; notas: string }[];
          runningOrder: { hora: string; acto: string; duracion: string; notas: string }[];
          // Social
          programaEvento: { hora: string; actividad: string; responsable: string; notas: string }[];
          indicacionesMusicales: string;
          coordinacionProveedores: { proveedor: string; contacto: string; horario: string; notas: string }[];
          // Empresarial
          avRundown: { hora: string; actividad: string; presentador: string; av: string; notas: string }[];
          requerimientosAV: { ponente: string; micro: string; presentacion: string; notas: string }[];
          setupTecnico: string;
        };

        const defaultDocs: DocsData = {
          horarioGeneral: [{ hora: "", actividad: "", responsable: "" }],
          inputList: [{ canal: "1", instrumento: "", artista: "", microfono: "", notas: "" }],
          soundcheck: [{ hora: "", artista: "", duracion: "", notas: "" }],
          runningOrder: [{ hora: "", acto: "", duracion: "", notas: "" }],
          programaEvento: [{ hora: "", actividad: "", responsable: "", notas: "" }],
          indicacionesMusicales: "",
          coordinacionProveedores: [{ proveedor: "", contacto: "", horario: "", notas: "" }],
          avRundown: [{ hora: "", actividad: "", presentador: "", av: "", notas: "" }],
          requerimientosAV: [{ ponente: "", micro: "", presentacion: "", notas: "" }],
          setupTecnico: "",
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

        const TableHeader = ({ cols }: { cols: string[] }) => (
          <div className={`grid gap-1 mb-1`} style={{ gridTemplateColumns: `repeat(${cols.length + 1}, minmax(0, 1fr))` }}>
            {cols.map(c => <div key={c} className="text-[10px] text-gray-600 uppercase tracking-widest px-2">{c}</div>)}
            <div />
          </div>
        );

        return (
          <div className="space-y-6">
            {/* Horario general del evento */}
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
                <div>
                  <p className="text-white text-sm font-semibold">Horario general del evento</p>
                  <p className="text-gray-500 text-xs mt-0.5">Cronograma maestro del día</p>
                </div>
              </div>
              <div className="p-4 space-y-2 overflow-x-auto">
                <TableHeader cols={["Hora", "Actividad", "Responsable"]} />
                {docs.horarioGeneral.map((row, i) => {
                  const update = (field: string, val: string) => {
                    const next = docs.horarioGeneral.map((r, j) => j === i ? { ...r, [field]: val } : r);
                    saveDocs({ ...docs, horarioGeneral: next });
                  };
                  return (
                    <div key={i} className="grid gap-1" style={{ gridTemplateColumns: "120px 1fr 1fr 32px" }}>
                      <input defaultValue={row.hora} onBlur={e => update("hora", e.target.value)} placeholder="00:00"
                        className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                      <input defaultValue={row.actividad} onBlur={e => update("actividad", e.target.value)} placeholder="Actividad"
                        className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                      <input defaultValue={row.responsable} onBlur={e => update("responsable", e.target.value)} placeholder="Responsable"
                        className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                      <button onClick={() => { const next = docs.horarioGeneral.filter((_, j) => j !== i); saveDocs({ ...docs, horarioGeneral: next.length ? next : [{ hora: "", actividad: "", responsable: "" }] }); }}
                        className="text-red-600 hover:text-red-400 text-xs flex items-center justify-center">✕</button>
                    </div>
                  );
                })}
                <button onClick={() => saveDocs({ ...docs, horarioGeneral: [...docs.horarioGeneral, { hora: "", actividad: "", responsable: "" }] })}
                  className="text-xs text-[#B3985B] hover:text-[#d4b068] flex items-center gap-1 mt-1">
                  + Agregar fila
                </button>
              </div>
            </div>

            {/* ── DOCUMENTOS MUSICALES ── */}
            {esMusical && (
              <>
                {/* Input List */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#222]">
                    <p className="text-white text-sm font-semibold">Input List</p>
                    <p className="text-gray-500 text-xs mt-0.5">Canal por canal · micrófono, instrumento, artista</p>
                  </div>
                  <div className="p-4 space-y-2 overflow-x-auto">
                    <TableHeader cols={["Ch", "Instrumento", "Artista", "Micrófono", "Notas"]} />
                    {docs.inputList.map((row, i) => {
                      const update = (field: string, val: string) => {
                        const next = docs.inputList.map((r, j) => j === i ? { ...r, [field]: val } : r);
                        saveDocs({ ...docs, inputList: next });
                      };
                      return (
                        <div key={i} className="grid gap-1" style={{ gridTemplateColumns: "50px 1fr 1fr 1fr 1fr 32px" }}>
                          <input defaultValue={row.canal} onBlur={e => update("canal", e.target.value)} placeholder="#"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white text-center placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.instrumento} onBlur={e => update("instrumento", e.target.value)} placeholder="Instrumento"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.artista} onBlur={e => update("artista", e.target.value)} placeholder="Artista"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.microfono} onBlur={e => update("microfono", e.target.value)} placeholder="Micrófono / DI"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.notas} onBlur={e => update("notas", e.target.value)} placeholder="Notas"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <button onClick={() => { const next = docs.inputList.filter((_, j) => j !== i); saveDocs({ ...docs, inputList: next.length ? next : [{ canal: "1", instrumento: "", artista: "", microfono: "", notas: "" }] }); }}
                            className="text-red-600 hover:text-red-400 text-xs flex items-center justify-center">✕</button>
                        </div>
                      );
                    })}
                    <button onClick={() => saveDocs({ ...docs, inputList: [...docs.inputList, { canal: String(docs.inputList.length + 1), instrumento: "", artista: "", microfono: "", notas: "" }] })}
                      className="text-xs text-[#B3985B] hover:text-[#d4b068] flex items-center gap-1 mt-1">+ Agregar canal</button>
                  </div>
                </div>

                {/* Soundcheck */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#222]">
                    <p className="text-white text-sm font-semibold">Orden de Soundcheck</p>
                    <p className="text-gray-500 text-xs mt-0.5">Secuencia y horario de pruebas de sonido</p>
                  </div>
                  <div className="p-4 space-y-2 overflow-x-auto">
                    <TableHeader cols={["Hora", "Artista / Acto", "Duración", "Notas"]} />
                    {docs.soundcheck.map((row, i) => {
                      const update = (field: string, val: string) => {
                        const next = docs.soundcheck.map((r, j) => j === i ? { ...r, [field]: val } : r);
                        saveDocs({ ...docs, soundcheck: next });
                      };
                      return (
                        <div key={i} className="grid gap-1" style={{ gridTemplateColumns: "100px 1fr 100px 1fr 32px" }}>
                          <input defaultValue={row.hora} onBlur={e => update("hora", e.target.value)} placeholder="00:00"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.artista} onBlur={e => update("artista", e.target.value)} placeholder="Artista"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.duracion} onBlur={e => update("duracion", e.target.value)} placeholder="30 min"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.notas} onBlur={e => update("notas", e.target.value)} placeholder="Notas"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <button onClick={() => { const next = docs.soundcheck.filter((_, j) => j !== i); saveDocs({ ...docs, soundcheck: next.length ? next : [{ hora: "", artista: "", duracion: "", notas: "" }] }); }}
                            className="text-red-600 hover:text-red-400 text-xs flex items-center justify-center">✕</button>
                        </div>
                      );
                    })}
                    <button onClick={() => saveDocs({ ...docs, soundcheck: [...docs.soundcheck, { hora: "", artista: "", duracion: "", notas: "" }] })}
                      className="text-xs text-[#B3985B] hover:text-[#d4b068] flex items-center gap-1 mt-1">+ Agregar artista</button>
                  </div>
                </div>

                {/* Running Order / Show Schedule */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#222]">
                    <p className="text-white text-sm font-semibold">Show Schedule / Running Order</p>
                    <p className="text-gray-500 text-xs mt-0.5">Secuencia y tiempos del show</p>
                  </div>
                  <div className="p-4 space-y-2 overflow-x-auto">
                    <TableHeader cols={["Hora", "Acto / Momento", "Duración", "Notas técnicas"]} />
                    {docs.runningOrder.map((row, i) => {
                      const update = (field: string, val: string) => {
                        const next = docs.runningOrder.map((r, j) => j === i ? { ...r, [field]: val } : r);
                        saveDocs({ ...docs, runningOrder: next });
                      };
                      return (
                        <div key={i} className="grid gap-1" style={{ gridTemplateColumns: "100px 1fr 100px 1fr 32px" }}>
                          <input defaultValue={row.hora} onBlur={e => update("hora", e.target.value)} placeholder="00:00"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.acto} onBlur={e => update("acto", e.target.value)} placeholder="Acto / Momento"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.duracion} onBlur={e => update("duracion", e.target.value)} placeholder="45 min"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.notas} onBlur={e => update("notas", e.target.value)} placeholder="Cambio de set, iluminación..."
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <button onClick={() => { const next = docs.runningOrder.filter((_, j) => j !== i); saveDocs({ ...docs, runningOrder: next.length ? next : [{ hora: "", acto: "", duracion: "", notas: "" }] }); }}
                            className="text-red-600 hover:text-red-400 text-xs flex items-center justify-center">✕</button>
                        </div>
                      );
                    })}
                    <button onClick={() => saveDocs({ ...docs, runningOrder: [...docs.runningOrder, { hora: "", acto: "", duracion: "", notas: "" }] })}
                      className="text-xs text-[#B3985B] hover:text-[#d4b068] flex items-center gap-1 mt-1">+ Agregar momento</button>
                  </div>
                </div>
              </>
            )}

            {/* ── DOCUMENTOS SOCIALES ── */}
            {esSocial && (
              <>
                {/* Programa del evento */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#222]">
                    <p className="text-white text-sm font-semibold">Programa del evento</p>
                    <p className="text-gray-500 text-xs mt-0.5">Secuencia completa de actividades</p>
                  </div>
                  <div className="p-4 space-y-2 overflow-x-auto">
                    <TableHeader cols={["Hora", "Actividad", "Responsable", "Notas"]} />
                    {docs.programaEvento.map((row, i) => {
                      const update = (field: string, val: string) => {
                        const next = docs.programaEvento.map((r, j) => j === i ? { ...r, [field]: val } : r);
                        saveDocs({ ...docs, programaEvento: next });
                      };
                      return (
                        <div key={i} className="grid gap-1" style={{ gridTemplateColumns: "100px 1fr 1fr 1fr 32px" }}>
                          <input defaultValue={row.hora} onBlur={e => update("hora", e.target.value)} placeholder="00:00"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.actividad} onBlur={e => update("actividad", e.target.value)} placeholder="Actividad"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.responsable} onBlur={e => update("responsable", e.target.value)} placeholder="Responsable"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.notas} onBlur={e => update("notas", e.target.value)} placeholder="Notas"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <button onClick={() => { const next = docs.programaEvento.filter((_, j) => j !== i); saveDocs({ ...docs, programaEvento: next.length ? next : [{ hora: "", actividad: "", responsable: "", notas: "" }] }); }}
                            className="text-red-600 hover:text-red-400 text-xs flex items-center justify-center">✕</button>
                        </div>
                      );
                    })}
                    <button onClick={() => saveDocs({ ...docs, programaEvento: [...docs.programaEvento, { hora: "", actividad: "", responsable: "", notas: "" }] })}
                      className="text-xs text-[#B3985B] hover:text-[#d4b068] flex items-center gap-1 mt-1">+ Agregar actividad</button>
                  </div>
                </div>

                {/* Indicaciones musicales */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#222]">
                    <p className="text-white text-sm font-semibold">Indicaciones musicales</p>
                    <p className="text-gray-500 text-xs mt-0.5">Géneros, canciones específicas, restricciones</p>
                  </div>
                  <div className="p-4">
                    <textarea defaultValue={docs.indicacionesMusicales}
                      onBlur={e => saveDocs({ ...docs, indicacionesMusicales: e.target.value })}
                      rows={4} placeholder="Ej: primer vals: 'A Thousand Years' · No reggaeton · Playlist de coctel: jazz suave..."
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50 resize-none" />
                  </div>
                </div>

                {/* Coordinación proveedores */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#222]">
                    <p className="text-white text-sm font-semibold">Coordinación de proveedores</p>
                    <p className="text-gray-500 text-xs mt-0.5">Catering, decoración, fotografía, etc.</p>
                  </div>
                  <div className="p-4 space-y-2 overflow-x-auto">
                    <TableHeader cols={["Proveedor", "Contacto", "Horario llegada", "Notas"]} />
                    {docs.coordinacionProveedores.map((row, i) => {
                      const update = (field: string, val: string) => {
                        const next = docs.coordinacionProveedores.map((r, j) => j === i ? { ...r, [field]: val } : r);
                        saveDocs({ ...docs, coordinacionProveedores: next });
                      };
                      return (
                        <div key={i} className="grid gap-1" style={{ gridTemplateColumns: "1fr 1fr 120px 1fr 32px" }}>
                          <input defaultValue={row.proveedor} onBlur={e => update("proveedor", e.target.value)} placeholder="Nombre proveedor"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.contacto} onBlur={e => update("contacto", e.target.value)} placeholder="Tel / nombre"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.horario} onBlur={e => update("horario", e.target.value)} placeholder="00:00"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.notas} onBlur={e => update("notas", e.target.value)} placeholder="Notas"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <button onClick={() => { const next = docs.coordinacionProveedores.filter((_, j) => j !== i); saveDocs({ ...docs, coordinacionProveedores: next.length ? next : [{ proveedor: "", contacto: "", horario: "", notas: "" }] }); }}
                            className="text-red-600 hover:text-red-400 text-xs flex items-center justify-center">✕</button>
                        </div>
                      );
                    })}
                    <button onClick={() => saveDocs({ ...docs, coordinacionProveedores: [...docs.coordinacionProveedores, { proveedor: "", contacto: "", horario: "", notas: "" }] })}
                      className="text-xs text-[#B3985B] hover:text-[#d4b068] flex items-center gap-1 mt-1">+ Agregar proveedor</button>
                  </div>
                </div>
              </>
            )}

            {/* ── DOCUMENTOS EMPRESARIALES ── */}
            {esEmpresarial && (
              <>
                {/* AV Rundown */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#222]">
                    <p className="text-white text-sm font-semibold">AV Rundown</p>
                    <p className="text-gray-500 text-xs mt-0.5">Agenda técnica audiovisual por sesión</p>
                  </div>
                  <div className="p-4 space-y-2 overflow-x-auto">
                    <TableHeader cols={["Hora", "Actividad / Sesión", "Presentador", "Req. AV", "Notas"]} />
                    {docs.avRundown.map((row, i) => {
                      const update = (field: string, val: string) => {
                        const next = docs.avRundown.map((r, j) => j === i ? { ...r, [field]: val } : r);
                        saveDocs({ ...docs, avRundown: next });
                      };
                      return (
                        <div key={i} className="grid gap-1" style={{ gridTemplateColumns: "100px 1fr 1fr 1fr 1fr 32px" }}>
                          <input defaultValue={row.hora} onBlur={e => update("hora", e.target.value)} placeholder="00:00"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.actividad} onBlur={e => update("actividad", e.target.value)} placeholder="Sesión / actividad"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.presentador} onBlur={e => update("presentador", e.target.value)} placeholder="Ponente"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.av} onBlur={e => update("av", e.target.value)} placeholder="Pantalla, micro, video..."
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.notas} onBlur={e => update("notas", e.target.value)} placeholder="Notas"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <button onClick={() => { const next = docs.avRundown.filter((_, j) => j !== i); saveDocs({ ...docs, avRundown: next.length ? next : [{ hora: "", actividad: "", presentador: "", av: "", notas: "" }] }); }}
                            className="text-red-600 hover:text-red-400 text-xs flex items-center justify-center">✕</button>
                        </div>
                      );
                    })}
                    <button onClick={() => saveDocs({ ...docs, avRundown: [...docs.avRundown, { hora: "", actividad: "", presentador: "", av: "", notas: "" }] })}
                      className="text-xs text-[#B3985B] hover:text-[#d4b068] flex items-center gap-1 mt-1">+ Agregar sesión</button>
                  </div>
                </div>

                {/* Requerimientos AV por ponente */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#222]">
                    <p className="text-white text-sm font-semibold">Requerimientos AV por ponente</p>
                    <p className="text-gray-500 text-xs mt-0.5">Necesidades técnicas individuales</p>
                  </div>
                  <div className="p-4 space-y-2 overflow-x-auto">
                    <TableHeader cols={["Ponente", "Micrófono", "Presentación/laptop", "Notas"]} />
                    {docs.requerimientosAV.map((row, i) => {
                      const update = (field: string, val: string) => {
                        const next = docs.requerimientosAV.map((r, j) => j === i ? { ...r, [field]: val } : r);
                        saveDocs({ ...docs, requerimientosAV: next });
                      };
                      return (
                        <div key={i} className="grid gap-1" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 32px" }}>
                          <input defaultValue={row.ponente} onBlur={e => update("ponente", e.target.value)} placeholder="Nombre ponente"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.micro} onBlur={e => update("micro", e.target.value)} placeholder="Solapa / diadema / mano"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.presentacion} onBlur={e => update("presentacion", e.target.value)} placeholder="Laptop / HDMI / USB"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <input defaultValue={row.notas} onBlur={e => update("notas", e.target.value)} placeholder="Notas"
                            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50" />
                          <button onClick={() => { const next = docs.requerimientosAV.filter((_, j) => j !== i); saveDocs({ ...docs, requerimientosAV: next.length ? next : [{ ponente: "", micro: "", presentacion: "", notas: "" }] }); }}
                            className="text-red-600 hover:text-red-400 text-xs flex items-center justify-center">✕</button>
                        </div>
                      );
                    })}
                    <button onClick={() => saveDocs({ ...docs, requerimientosAV: [...docs.requerimientosAV, { ponente: "", micro: "", presentacion: "", notas: "" }] })}
                      className="text-xs text-[#B3985B] hover:text-[#d4b068] flex items-center gap-1 mt-1">+ Agregar ponente</button>
                  </div>
                </div>

                {/* Setup técnico */}
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#222]">
                    <p className="text-white text-sm font-semibold">Setup técnico</p>
                    <p className="text-gray-500 text-xs mt-0.5">Descripción del montaje de audio y video</p>
                  </div>
                  <div className="p-4">
                    <textarea defaultValue={docs.setupTecnico}
                      onBlur={e => saveDocs({ ...docs, setupTecnico: e.target.value })}
                      rows={5} placeholder="Describe el setup: ubicación del mixer, pantallas, proyectores, cámaras, sistema de audio line array / puntual, etc."
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50 resize-none" />
                  </div>
                </div>
              </>
            )}

            <p className="text-center text-gray-700 text-[10px] pb-2">Los cambios se guardan automáticamente al salir de cada campo</p>
          </div>
        );
      })()}

      {/* ────── TAB: PERSONAL ────── */}
      {/* ────── TAB: CHECKLIST ────── */}
      {tab === "checklist" && (
        <div className="space-y-4">

          {/* ── Sección OPERACIÓN ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Checklist de operación</span>
                <span className="text-gray-600 text-xs ml-2">({checkDone}/{checkTotal})</span>
              </div>
              <div className="w-24 h-1.5 bg-[#222] rounded-full overflow-hidden">
                <div className="h-full bg-[#B3985B] rounded-full transition-all" style={{ width: `${checkPct}%` }} />
              </div>
            </div>

            {checkOp.length === 0 && (
              <div className="px-4 py-4 border-b border-[#1a1a1a] space-y-2">
                <p className="text-gray-500 text-xs font-medium mb-2">Aplicar plantilla:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "GENERAL", label: "General" },
                    { key: "MUSICAL", label: "Musical" },
                    { key: "CORPORATIVO", label: "Corporativo" },
                    { key: "SOCIAL", label: "Social" },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => aplicarPlantilla(key)} disabled={aplicandoPlantilla}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[#333] text-gray-400 hover:border-[#B3985B] hover:text-[#B3985B] disabled:opacity-40 transition-colors">
                      {aplicandoPlantilla ? "Aplicando..." : `+ ${label}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {checkOp.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4 italic">Sin items de operación</p>
            ) : (
              checkOp.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#0d0d0d] last:border-0 group hover:bg-[#1a1a1a] transition-colors">
                  <input type="checkbox" checked={c.completado} onChange={() => toggleCheck(c.id, c.completado)}
                    className="w-4 h-4 rounded accent-[#B3985B] shrink-0" />
                  <span className={`flex-1 text-sm ${c.completado ? "line-through text-gray-600" : "text-white"}`}>
                    {c.item}
                  </span>
                  <button onClick={() => eliminarItem(c.id)}
                    className="text-gray-700 hover:text-red-400 text-lg leading-none opacity-0 group-hover:opacity-100 transition-all">×</button>
                </div>
              ))
            )}

            {/* Agregar item operación */}
            <div className="px-4 py-3 border-t border-[#1a1a1a] flex gap-2">
              <input value={nuevoItem} onChange={e => setNuevoItem(e.target.value)}
                onKeyDown={e => e.key === "Enter" && agregarItem()}
                placeholder="Agregar item de operación..."
                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              <button onClick={agregarItem} disabled={addingItem || !nuevoItem.trim()}
                className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                + Agregar
              </button>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-xl p-4 flex items-center justify-between">
            <p className="text-gray-500 text-sm">El rider técnico con accesorios está en la pestaña <span className="text-blue-400 font-medium">Rider</span>.</p>
            <button onClick={() => setTab("rider")} className="text-xs text-blue-400 border border-blue-900/50 hover:border-blue-600 px-3 py-1.5 rounded-lg transition-colors">
              Ir al Rider →
            </button>
          </div>
        </div>
      )}

      {/* ────── TAB: RIDER ────── */}
      {tab === "rider" && (
        <div className="space-y-4">
          {/* Header + acciones */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">Rider técnico</p>
              <p className="text-gray-500 text-xs mt-0.5">Guía de carga del día del evento · toca un equipo para ver sus accesorios</p>
            </div>
            <div className="flex items-center gap-2">
              {proyecto.equipos.length > 0 && (
                <button onClick={generarRiderAutomatico} disabled={generandoRider}
                  className="text-xs text-blue-400 border border-blue-900/50 hover:border-blue-600 disabled:opacity-40 px-3 py-1.5 rounded-lg transition-colors">
                  {generandoRider ? "Generando..." : "↺ Regenerar rider"}
                </button>
              )}
            </div>
          </div>

          {/* Lista equipo + accesorios */}
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            {proyecto.equipos.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-600 text-sm">Sin equipos en este proyecto</p>
                <p className="text-gray-700 text-xs mt-1">Agrega equipos en la pestaña Equipos para ver el rider</p>
              </div>
            ) : (() => {
              const grupos: Record<string, typeof proyecto.equipos> = {};
              for (const e of proyecto.equipos) {
                const cat = e.equipo.categoria.nombre;
                if (!grupos[cat]) grupos[cat] = [];
                grupos[cat].push(e);
              }
              return Object.entries(grupos).map(([cat, items]) => (
                <div key={cat}>
                  <div className="px-4 py-1.5 bg-[#0d0d0d] border-b border-[#1a1a1a]">
                    <span className="text-[10px] text-blue-400/70 font-bold uppercase tracking-widest">{cat}</span>
                  </div>
                  {items.map(e => {
                    const accesorios = accesoriosPorEquipo(e.equipo.descripcion, e.equipo.categoria.nombre);
                    const isExpanded = !!equipoExpanded[e.id];
                    const isCargado = !!equipoCargado[e.id];
                    const totalAcc = accesorios.length;
                    const cargadosAcc = accesorios.filter((_, i) => !!accesorioCargado[`${e.id}_${i}`]).length;
                    return (
                      <div key={e.id} className="border-b border-[#0d0d0d] last:border-0">
                        <div
                          className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors cursor-pointer select-none"
                          onClick={() => setEquipoExpanded(prev => ({ ...prev, [e.id]: !isExpanded }))}
                        >
                          <input type="checkbox" checked={isCargado}
                            onChange={ev => { ev.stopPropagation(); setEquipoCargado(prev => ({ ...prev, [e.id]: !isCargado })); }}
                            onClick={ev => ev.stopPropagation()}
                            className="w-4 h-4 rounded accent-blue-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium ${isCargado ? "line-through text-gray-600" : "text-white"}`}>
                              {e.equipo.descripcion}
                              {e.equipo.marca && <span className="text-gray-500 font-normal"> · {e.equipo.marca}</span>}
                            </span>
                            <span className="ml-2 text-[#B3985B] text-xs">×{e.cantidad}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {cargadosAcc > 0 && <span className="text-[10px] text-blue-400">{cargadosAcc}/{totalAcc} acc</span>}
                            <svg className={`w-3.5 h-3.5 text-[#444] transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="bg-[#0a0a0a] border-t border-[#1a1a1a] px-5 py-3 space-y-1">
                            <p className="text-[10px] text-[#444] uppercase tracking-widest mb-2">Accesorios requeridos</p>
                            {accesorios.map((acc, i) => {
                              const key = `${e.id}_${i}`;
                              const checked = !!accesorioCargado[key];
                              return (
                                <label key={key} className="flex items-center gap-2.5 py-1 cursor-pointer">
                                  <input type="checkbox" checked={checked}
                                    onChange={() => setAccesorioCargado(prev => ({ ...prev, [key]: !checked }))}
                                    className="w-3.5 h-3.5 rounded accent-blue-500 shrink-0" />
                                  <span className={`text-xs ${checked ? "line-through text-gray-600" : "text-gray-300"}`}>{acc}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>

          {/* Items de rider persistidos (DB) */}
          {(checkRider.length > 0 || true) && (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  Items de bodega adicionales ({checkRider.length})
                </span>
              </div>
              {checkRider.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-5 italic">Sin items adicionales</p>
              ) : checkRider.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#0d0d0d] last:border-0 group hover:bg-[#1a1a1a] transition-colors">
                  <input type="checkbox" checked={c.completado} onChange={() => toggleCheck(c.id, c.completado)}
                    className="w-4 h-4 rounded accent-blue-500 shrink-0" />
                  <span className={`flex-1 text-sm ${c.completado ? "line-through text-gray-600" : "text-white"}`}>{c.item}</span>
                  <button onClick={() => eliminarItem(c.id)}
                    className="text-gray-700 hover:text-red-400 text-lg leading-none opacity-0 group-hover:opacity-100 transition-all">×</button>
                </div>
              ))}
              <div className="px-4 py-3 border-t border-[#1a1a1a] flex gap-2">
                <input value={nuevoItemRider} onChange={e => setNuevoItemRider(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && agregarItemRider()}
                  placeholder="Agregar accesorio / item extra de bodega..."
                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-700" />
                <button onClick={agregarItemRider} disabled={addingItemRider || !nuevoItemRider.trim()}
                  className="bg-blue-800 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  + Agregar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────── TAB: PROTOCOLO ────── */}
      {tab === "protocolo" && (() => {
        type ProtocoloData = {
          estado: string; // PENDIENTE | EN_REVISION | OK
          responsable: string;
          hora: string;
          observaciones: string;
          fotos: string[]; // base64
        };
        const defaultProtocolo: ProtocoloData = { estado: "PENDIENTE", responsable: "", hora: "", observaciones: "", fotos: [] };

        async function comprimirFoto(file: File): Promise<string> {
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

        let salida: ProtocoloData;
        let entrada: ProtocoloData;
        try { salida = proyecto.protocoloSalida ? { ...defaultProtocolo, ...JSON.parse(proyecto.protocoloSalida) } : defaultProtocolo; }
        catch { salida = defaultProtocolo; }
        try { entrada = proyecto.protocoloEntrada ? { ...defaultProtocolo, ...JSON.parse(proyecto.protocoloEntrada) } : defaultProtocolo; }
        catch { entrada = defaultProtocolo; }

        const saveProtocolo = async (tipo: "salida" | "entrada", data: ProtocoloData) => {
          const field = tipo === "salida" ? "protocoloSalida" : "protocoloEntrada";
          const res = await fetch(`/api/proyectos/${proyecto.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: JSON.stringify(data) }),
          });
          if (res.ok) {
            const d = await res.json();
            setProyecto(prev => prev ? { ...prev, [field]: d.proyecto?.[field] ?? JSON.stringify(data) } : prev);
          }
        };

        const ESTADO_OPTS = [
          { id: "PENDIENTE", label: "Pendiente", color: "border-gray-700 text-gray-400" },
          { id: "EN_REVISION", label: "En revisión", color: "border-yellow-700 text-yellow-400" },
          { id: "OK", label: "OK ✓", color: "border-green-700 text-green-400" },
        ];

        const ProtocoloPanel = ({ tipo, data }: { tipo: "salida" | "entrada"; data: ProtocoloData }) => {
          const title = tipo === "salida" ? "Salida de equipos" : "Entrada de equipos";
          const icon = tipo === "salida" ? "🚚" : "🏠";
          const desc = tipo === "salida" ? "Verificación antes de llevar al evento" : "Verificación al regresar a bodega";
          const [local, setLocal] = useState<ProtocoloData>(data);
          const [saving2, setSaving2] = useState(false);

          const addFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const b64 = await comprimirFoto(file);
            const next = { ...local, fotos: [...local.fotos, b64] };
            setLocal(next);
            await saveProtocolo(tipo, next);
            e.target.value = "";
          };

          const removeFoto = async (idx: number) => {
            const next = { ...local, fotos: local.fotos.filter((_, i) => i !== idx) };
            setLocal(next);
            await saveProtocolo(tipo, next);
          };

          const save = async () => {
            setSaving2(true);
            await saveProtocolo(tipo, local);
            setSaving2(false);
          };

          return (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#222]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="text-white text-sm font-semibold">{title}</p>
                    <p className="text-gray-500 text-xs">{desc}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {ESTADO_OPTS.map(opt => (
                    <button key={opt.id}
                      onClick={() => { const next = { ...local, estado: opt.id }; setLocal(next); saveProtocolo(tipo, next); }}
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
                    <input value={local.responsable} onChange={e => setLocal(p => ({ ...p, responsable: e.target.value }))}
                      placeholder="Nombre del técnico" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Hora de verificación</label>
                    <input value={local.hora} onChange={e => setLocal(p => ({ ...p, hora: e.target.value }))}
                      placeholder="ej. 09:30" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Observaciones</label>
                  <textarea value={local.observaciones} onChange={e => setLocal(p => ({ ...p, observaciones: e.target.value }))}
                    rows={3} placeholder="Estado del equipo, daños, faltantes, notas..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                </div>
                {/* Fotos */}
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
                            <img src={foto} alt={`Evidencia ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-[#2a2a2a] hover:border-[#B3985B] transition-colors" />
                          </a>
                          <button onClick={() => removeFoto(i)}
                            className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={save} disabled={saving2}
                  className="w-full py-2.5 rounded-lg bg-[#1a1a1a] border border-[#333] hover:border-[#B3985B] text-white text-sm font-medium transition-colors disabled:opacity-60">
                  {saving2 ? "Guardando..." : "Guardar protocolo"}
                </button>
              </div>
            </div>
          );
        };

        return (
          <div className="space-y-5">
            <div>
              <p className="text-white font-semibold">Protocolo de entrada / salida</p>
              <p className="text-gray-500 text-xs mt-0.5">Verificación del estado de los equipos al salir y al regresar del evento</p>
            </div>
            <ProtocoloPanel tipo="salida" data={salida} />
            <ProtocoloPanel tipo="entrada" data={entrada} />
          </div>
        );
      })()}

      {/* ────── TAB: FINANZAS ────── */}
      {tab === "finanzas" && (() => {
        // ── P&L en tiempo real ──────────────────────────────────────────────
        const ingresoContratado = proyecto.cotizacion?.granTotal ?? 0;
        const ingresoCobrado = proyecto.cuentasCobrar.reduce((s, c) => s + c.montoCobrado, 0);
        // Costos personal: suma directamente las tarifas acordadas del personal (fuente de verdad)
        const costosPersonal = proyecto.personal
          .filter(p => p.tarifaAcordada && p.tarifaAcordada > 0)
          .reduce((s, p) => s + (p.tarifaAcordada ?? 0), 0);
        const costosProveedor = proyecto.cuentasPagar
          .filter(c => c.tipoAcreedor === "PROVEEDOR")
          .reduce((s, c) => s + c.monto, 0);
        const otrosGastos = proyecto.movimientos.reduce((s, g) => s + g.monto, 0);
        const costosTotales = costosPersonal + costosProveedor + otrosGastos;
        const utilidadBruta = ingresoContratado - costosTotales;
        const margen = ingresoContratado > 0 ? (utilidadBruta / ingresoContratado) * 100 : 0;

        return (
        <div className="space-y-4">

          {/* ── P&L Summary ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
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
                    <span className="text-gray-400">Personal</span>
                    <span className="text-red-300">{fmt(costosPersonal)}</span>
                  </div>
                )}
                {costosProveedor > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Proveedores</span>
                    <span className="text-red-300">{fmt(costosProveedor)}</span>
                  </div>
                )}
                {otrosGastos > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Otros gastos</span>
                    <span className="text-red-300">{fmt(otrosGastos)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-[#1a1a1a] pt-2">
                  <span className="text-gray-500">Total costos</span>
                  <span className="text-red-400 font-medium">{fmt(costosTotales)}</span>
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
              <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Cuentas por cobrar</h3>
                  {!editandoEsquema && (
                    <button onClick={() => setEditandoEsquema(true)}
                      className="text-xs text-[#B3985B] border border-[#B3985B]/40 hover:bg-[#B3985B]/10 hover:border-[#B3985B] px-3 py-1 rounded-lg transition-colors">
                      {(cxcAnticipo || cxcLiq) ? "Editar esquema" : "Configurar pagos"}
                    </button>
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
                                onClick={() => { setAjustando(prev => prev === c.id ? null : c.id); setAjusteMonto(String(c.monto)); setAjusteMotivo(""); setPagando(null); }}
                                title="Ajustar monto"
                                className={`text-[10px] border px-2 py-1 rounded-lg transition-colors ${ajustando === c.id ? "bg-orange-900/30 border-orange-700 text-orange-300" : "text-gray-400 hover:text-white border-[#333] hover:border-[#555]"}`}>
                                ✏ Ajustar
                              </button>
                              {esEsquema && (
                                <button onClick={() => eliminarCxC(c.id)}
                                  className="text-red-500/60 hover:text-red-400 text-[10px] border border-red-900/30 hover:border-red-700 px-2 py-1 rounded-lg transition-colors">
                                  ✕
                                </button>
                              )}
                            </>
                          )}
                          <span className="text-white font-semibold">{fmt(c.monto)}</span>
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
                        <p className="text-green-600 text-xs mb-2">Cobrado: {fmt(c.montoCobrado)} / Pendiente: {fmt(c.monto - c.montoCobrado)}</p>
                      )}

                      {/* Inline: ajustar monto */}
                      {ajustando === c.id && (
                        <div className="mt-2 bg-[#0a0a0a] border border-orange-900/30 rounded-lg p-3 space-y-2">
                          <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider">Ajustar monto</p>
                          <div className="flex gap-2 flex-wrap items-start">
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">Nuevo monto</label>
                              <input type="number" value={ajusteMonto} onChange={e => setAjusteMonto(e.target.value)}
                                placeholder="0.00" min="0" step="0.01"
                                className="w-36 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white text-sm font-semibold focus:outline-none focus:border-orange-600" />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                              <label className="text-[10px] text-gray-500 block mb-1">Motivo del ajuste <span className="text-red-500">*</span></label>
                              <textarea value={ajusteMotivo} onChange={e => setAjusteMotivo(e.target.value)}
                                placeholder="Explica brevemente por qué se ajusta este monto..."
                                rows={2}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-orange-600 resize-none" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => ajustarMontoCxC(c.id)}
                              disabled={!ajusteMonto || !ajusteMotivo.trim() || ajusteMotivo.trim().length < 5}
                              className="bg-orange-700 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors">
                              Confirmar ajuste
                            </button>
                            <button onClick={() => setAjustando(null)} className="text-gray-500 text-xs hover:text-white">Cancelar</button>
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
                                <span className="text-gray-600 text-[10px] shrink-0 mt-0.5">{new Date(a.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</span>
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
                              placeholder={String(c.monto)} className="w-32 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                            <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                              className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none" />
                            <button onClick={() => registrarPagoCxC(c.id)}
                              className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded transition-colors">Confirmar</button>
                            <button onClick={() => setPagando(null)} className="text-gray-500 text-xs hover:text-white">Cancelar</button>
                          </div>
                        ) : (
                          <button onClick={() => { setPagando(c.id); setMontoPago(String(c.monto)); setAjustando(null); }}
                            className="text-xs text-green-400 hover:text-green-300 border border-green-800 hover:border-green-600 px-3 py-1 rounded-lg transition-colors">
                            + Registrar cobro
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* CxP */}
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Cuentas por pagar</h3>
              {proyecto.personal.some(p => !p.tarifaAcordada) && proyecto.cotizacion && (
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/proyectos/${id}/sincronizar-tarifas`, { method: "POST" });
                    const d = await res.json();
                    if (res.ok) {
                      toast.success(`${d.actualizados} tarifa(s) sincronizada(s) desde la cotización.`);
                      // Recargar proyecto
                      const r2 = await fetch(`/api/proyectos/${id}`);
                      const d2 = await r2.json();
                      if (d2.proyecto) setProyecto(d2.proyecto);
                    } else {
                      toast.error(d.error ?? "Error al sincronizar");
                    }
                  }}
                  className="text-xs text-[#B3985B] hover:text-white border border-[#B3985B]/40 hover:border-[#B3985B] px-3 py-1 rounded-lg transition-colors"
                >
                  Sincronizar tarifas desde cotización
                </button>
              )}
            </div>

            {/* Personal técnico (siempre visible si hay personal) */}
            {proyecto.personal.length > 0 && (
              <div className="border-b border-[#1a1a1a]">
                <div className="px-5 py-2 bg-[#0d0d0d]">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Personal técnico</p>
                </div>
                {proyecto.personal.map(p => {
                  const nombre = p.tecnico?.nombre ?? "Por asignar";
                  const rol = p.rolTecnico?.nombre ?? p.tecnico?.rol?.nombre ?? "Técnico";
                  const pagado = p.estadoPago === "PAGADO";
                  return (
                    <div key={p.id} className="px-5 py-3 border-b border-[#0d0d0d] last:border-0 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm">{nombre}</p>
                        <p className="text-gray-500 text-xs">{rol}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {p.tarifaAcordada != null && p.tarifaAcordada > 0 ? (
                          <span className="text-white font-semibold text-sm">{fmt(p.tarifaAcordada)}</span>
                        ) : (
                          <span className="text-gray-600 text-xs italic">Sin tarifa</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pagado ? "bg-green-900/50 text-green-300" : "bg-yellow-900/30 text-yellow-400"}`}>
                          {pagado ? "Pagado" : "Pendiente"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CXP de proveedores */}
            {proyecto.cuentasPagar.length === 0 && proyecto.personal.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">Sin cuentas por pagar</p>
            ) : proyecto.cuentasPagar.length > 0 ? (
              <>
              {proyecto.cuentasPagar.map(c => {
                const ajustesEntradas: AjusteEntry[] = c.ajustesLog ? JSON.parse(c.ajustesLog) : [];
                const tieneAjustes = ajustesEntradas.length > 0;
                return (
                  <div key={c.id} className="px-5 py-4 border-b border-[#0d0d0d] last:border-0">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white text-sm font-medium">{c.concepto}</p>
                          {tieneAjustes && (
                            <button onClick={() => setAjusteHistorial(prev => prev === c.id ? null : c.id)}
                              className="text-[10px] text-blue-400/70 hover:text-blue-400 border border-blue-900/30 hover:border-blue-700 px-1.5 py-0.5 rounded transition-colors">
                              {ajustesEntradas.length} ajuste{ajustesEntradas.length > 1 ? "s" : ""}
                            </button>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs">{c.tipoAcreedor} · Vence: {fmtDate(c.fechaCompromiso)}</p>
                        {c.montoOriginal && c.montoOriginal !== c.monto && (
                          <p className="text-gray-600 text-[10px] mt-0.5">
                            Original: <span className="line-through">{fmt(c.montoOriginal)}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {c.estado !== "LIQUIDADO" && (
                          <button
                            onClick={() => { setAjustando(prev => prev === c.id ? null : c.id); setAjusteMonto(String(c.monto)); setAjusteMotivo(""); setPagando(null); }}
                            className={`text-[10px] border px-2 py-1 rounded-lg transition-colors ${ajustando === c.id ? "bg-orange-900/30 border-orange-700 text-orange-300" : "text-gray-400 hover:text-white border-[#333] hover:border-[#555]"}`}>
                            ✏ Ajustar
                          </button>
                        )}
                        <span className="text-white font-semibold">{fmt(c.monto)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.estado === "LIQUIDADO" ? "bg-green-900/50 text-green-300" :
                          c.estado === "VENCIDO" ? "bg-red-900/50 text-red-300" :
                          "bg-yellow-900/30 text-yellow-400"
                        }`}>{c.estado}</span>
                      </div>
                    </div>

                    {/* Inline: ajustar monto */}
                    {ajustando === c.id && (
                      <div className="mt-2 bg-[#0a0a0a] border border-orange-900/30 rounded-lg p-3 space-y-2">
                        <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider">Ajustar monto</p>
                        <div className="flex gap-2 flex-wrap items-start">
                          <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Nuevo monto</label>
                            <input type="number" value={ajusteMonto} onChange={e => setAjusteMonto(e.target.value)}
                              placeholder="0.00" min="0" step="0.01"
                              className="w-36 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white text-sm font-semibold focus:outline-none focus:border-orange-600" />
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label className="text-[10px] text-gray-500 block mb-1">Motivo del ajuste <span className="text-red-500">*</span></label>
                            <textarea value={ajusteMotivo} onChange={e => setAjusteMotivo(e.target.value)}
                              placeholder="Explica brevemente por qué se ajusta este monto..."
                              rows={2}
                              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-orange-600 resize-none" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => ajustarMontoCxP(c.id)}
                            disabled={!ajusteMonto || !ajusteMotivo.trim() || ajusteMotivo.trim().length < 5}
                            className="bg-orange-700 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors">
                            Confirmar ajuste
                          </button>
                          <button onClick={() => setAjustando(null)} className="text-gray-500 text-xs hover:text-white">Cancelar</button>
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
                              <span className="text-gray-600 text-[10px] shrink-0 mt-0.5">{new Date(a.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</span>
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

                    {c.estado !== "LIQUIDADO" && ajustando !== c.id && (
                      pagando === c.id ? (
                        <div className="flex gap-2 mt-2">
                          <input type="number" value={montoPago} onChange={e => setMontoPago(e.target.value)}
                            placeholder={String(c.monto)} className="w-32 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                          <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                            className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none" />
                          <button onClick={() => registrarPagoCxP(c.id)}
                            className="bg-red-800 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1 rounded transition-colors">Confirmar pago</button>
                          <button onClick={() => setPagando(null)} className="text-gray-500 text-xs hover:text-white">Cancelar</button>
                        </div>
                      ) : (
                        <button onClick={() => { setPagando(c.id); setMontoPago(String(c.monto)); setAjustando(null); }}
                          className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1 rounded-lg transition-colors">
                          + Registrar pago
                        </button>
                      )
                    )}
                  </div>
                );
              })}
              </>
            ) : null}
          </div>

          {/* Otros gastos */}
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Otros gastos del proyecto</h3>
              <button onClick={() => setShowGastoForm(v => !v)}
                className="text-xs text-[#B3985B] hover:text-white border border-[#B3985B]/40 hover:border-[#B3985B] px-3 py-1 rounded-lg transition-colors">
                {showGastoForm ? "Cancelar" : "+ Registrar gasto"}
              </button>
            </div>

            {showGastoForm && (
              <div className="px-5 py-4 border-b border-[#1a1a1a] grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Concepto *</label>
                  <input value={gastoConcepto} onChange={e => setGastoConcepto(e.target.value)}
                    placeholder="Ej: Gasolina, comida crew, material, renta..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Monto ($) *</label>
                  <input type="number" value={gastoMonto} onChange={e => setGastoMonto(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Fecha</label>
                  <input type="date" value={gastoFecha} onChange={e => setGastoFecha(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Categoría</label>
                  <select value={gastoCategoria} onChange={e => setGastoCategoria(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="">— Sin categoría —</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Proveedor</label>
                  <select value={gastoProveedor} onChange={e => setGastoProveedor(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="">— No aplica / Genérico —</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Método de pago</label>
                  <select value={gastoMetodo} onChange={e => setGastoMetodo(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Referencia / comprobante</label>
                  <input value={gastoReferencia} onChange={e => setGastoReferencia(e.target.value)}
                    placeholder="Folio, número de transacción..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Notas</label>
                  <input value={gastoNotas} onChange={e => setGastoNotas(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button onClick={agregarGasto} disabled={addingGasto || !gastoConcepto || !gastoMonto}
                    className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-6 py-2 rounded-lg transition-colors">
                    {addingGasto ? "Guardando..." : "Guardar gasto"}
                  </button>
                </div>
              </div>
            )}

            {proyecto.movimientos.length === 0 && !showGastoForm ? (
              <p className="text-gray-500 text-sm text-center py-6">Sin gastos adicionales registrados</p>
            ) : (
              proyecto.movimientos.map(g => (
                <div key={g.id} className="px-5 py-3 border-b border-[#0d0d0d] last:border-0 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm">{g.concepto}</p>
                      {g.categoria && (
                        <span className="text-xs px-1.5 py-0.5 bg-[#222] text-gray-400 rounded">{g.categoria.nombre}</span>
                      )}
                      {g.proveedor && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-900/30 text-blue-400 rounded">{g.proveedor.nombre}</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs">
                      {fmtDate(g.fecha)} · {g.metodoPago}
                      {g.referencia ? ` · Ref: ${g.referencia}` : ""}
                      {g.notas ? ` · ${g.notas}` : ""}
                    </p>
                  </div>
                  <span className="text-red-400 font-semibold text-sm shrink-0">−{fmt(g.monto)}</span>
                </div>
              ))
            )}
          </div>

          {/* Resumen financiero */}
          {(() => {
            const totalGastos = proyecto.movimientos.reduce((s, g) => s + g.monto, 0);
            return (
              <div className="bg-[#111] border border-[#222] rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                {proyecto.cotizacion && (
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Total cotizado</p>
                    <p className="text-white font-bold">{fmt(proyecto.cotizacion.granTotal)}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 text-xs mb-1">Cobrado</p>
                  <p className="text-green-400 font-bold">{fmt(cobrado)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Por cobrar</p>
                  <p className="text-yellow-400 font-bold">{fmt(totalCxC - cobrado)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Otros gastos</p>
                  <p className="text-red-400 font-bold">{fmt(totalGastos)}</p>
                </div>
              </div>
            );
          })()}

          {/* ── Cierre financiero ── */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold text-sm">Cierre financiero</h3>
                <p className="text-gray-600 text-xs mt-0.5">Comparativa real vs estimado al cerrar el proyecto</p>
              </div>
              <button
                onClick={async () => { await loadCierre(); setShowCierreModal(true); }}
                disabled={loadingCierre}
                className="px-4 py-2 bg-[#B3985B] text-black text-sm font-semibold rounded-lg hover:bg-[#c9a96a] transition-colors disabled:opacity-50"
              >
                {loadingCierre ? "Calculando..." : proyecto.cierreFinanciero ? "Ver cierre" : "Generar cierre"}
              </button>
            </div>
            {proyecto.cierreFinanciero && (
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-4 py-3 flex items-center gap-3">
                <span className="text-green-400 text-sm">✓</span>
                <p className="text-green-400 text-xs font-medium">
                  Cierre registrado el {new Date(proyecto.cierreFinanciero.cerradoEn).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
            )}
          </div>

          {/* Portal de clientes */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-white font-semibold text-sm">Portal de cliente</h3>
                <p className="text-gray-600 text-xs mt-0.5">Enlace público con estado del proyecto, pagos y equipo</p>
              </div>
              {!proyecto.portalToken ? (
                <button
                  onClick={generarPortalToken}
                  disabled={generandoToken}
                  className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-gray-300 text-sm font-medium rounded-lg hover:bg-[#222] hover:text-white transition-colors disabled:opacity-50"
                >
                  {generandoToken ? "Generando..." : "Generar enlace"}
                </button>
              ) : (
                <button
                  onClick={revocarPortalToken}
                  disabled={revocandoToken}
                  className="px-3 py-1.5 text-red-500 border border-red-900/40 text-xs font-medium rounded-lg hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  {revocandoToken ? "Revocando..." : "Revocar"}
                </button>
              )}
            </div>
            {/* Notas para el cliente (siempre visible si tiene token) */}
            {proyecto.portalToken && (
              <div className="mt-4 pt-4 border-t border-[#1e1e1e] space-y-2">
                <label className="text-gray-500 text-xs block">Mensaje al cliente (visible en su portal)</label>
                <textarea
                  value={notasPortal}
                  onChange={e => setNotasPortal(e.target.value)}
                  placeholder="Ej: Todo confirmado para tu evento. Estaremos en contacto 48 hrs antes para coordinar acceso al venue..."
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B] resize-none"
                />
                <button
                  onClick={guardarNotasPortal}
                  disabled={savingNotasPortal}
                  className="px-3 py-1.5 bg-[#B3985B] text-black text-xs font-semibold rounded-lg hover:bg-[#c9a96a] transition-colors disabled:opacity-50"
                >
                  {savingNotasPortal ? "Guardando..." : "Guardar mensaje"}
                </button>
              </div>
            )}

            {proyecto.portalToken && (() => {
              const portalUrl = `https://mainstagepro.vercel.app/portal/${proyecto.portalToken}`;
              return (
                <div className="space-y-2 mt-4">
                  <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2.5 flex items-center gap-2">
                    <span className="text-[#B3985B] text-sm">🔗</span>
                    <p className="flex-1 text-[10px] text-gray-400 truncate font-mono">{portalUrl}</p>
                    <CopyButton value={portalUrl} />
                  </div>
                  <a href={portalUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-[#1a1a1a] border border-[#333] text-gray-300 text-xs font-medium rounded-lg hover:bg-[#222] hover:text-white transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Abrir portal del cliente
                  </a>
                </div>
              );
            })()}
          </div>

        </div>
        );
      })()}

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
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-3">Estimado (cotización)</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-gray-400">Gran total</span><span className="text-white font-semibold">{fmt(cierreData.estimado.granTotalEstimado)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-400">Costo est.</span><span className="text-red-400">{fmt(cierreData.estimado.costoEstimado)}</span></div>
                    <div className="flex justify-between text-xs border-t border-[#1e1e1e] pt-2"><span className="text-gray-400">Utilidad est.</span><span className="text-green-400 font-semibold">{fmt(cierreData.estimado.utilidadEstimada)}</span></div>
                  </div>
                </div>
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
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
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
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

      {/* ────── TAB: BITÁCORA ────── */}
      {tab === "bitacora" && (
        <div className="space-y-3">
          {/* Agregar nota */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <textarea value={notaBitacora} onChange={e => setNotaBitacora(e.target.value)}
              rows={3} placeholder="¿Qué pasó hoy? ¿Qué aprendimos? Cada detalle que documentes hoy le ahorra horas al equipo mañana..."
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none mb-2" />
            <div className="flex justify-end">
              <button onClick={agregarNota} disabled={addingNota || !notaBitacora.trim()}
                className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                {addingNota ? "Guardando..." : "Agregar nota"}
              </button>
            </div>
          </div>

          {/* Historial */}
          {proyecto.bitacora.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center text-gray-500 text-sm">
              Sin entradas en la bitácora
            </div>
          ) : (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              {proyecto.bitacora.map(b => (
                <div key={b.id} className="px-5 py-4 border-b border-[#0d0d0d] last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      b.tipo === "ACCION" ? "bg-blue-900/40 text-blue-300" :
                      b.tipo === "CAMBIO" ? "bg-yellow-900/40 text-yellow-300" :
                      b.tipo === "ALERTA" ? "bg-red-900/40 text-red-300" :
                      "bg-[#222] text-gray-400"
                    }`}>{b.tipo}</span>
                    <span className="text-gray-600 text-xs">{fmtDateTime(b.createdAt)} · {b.usuario?.name ?? "Sistema"}</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{b.contenido}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────── TAB: EVALUACIÓN ────── */}
      {tab === "evaluacion" && (() => {
        const esRenta = proyecto.tipoServicio === "RENTA" || proyecto.trato?.tipoServicio === "RENTA";
        const CRITERIOS: { key: keyof EvalData; label: string; desc: string }[] = esRenta ? [
          { key: "planeacionPrevia",    label: "Preparación de la renta",   desc: "Lista de equipos completa, revisión de inventario y empaque antes de salida" },
          { key: "puntualidad",         label: "Puntualidad en entrega",     desc: "Entrega del equipo en el horario y fecha acordados con el cliente" },
          { key: "usoEquipo",           label: "Estado del equipo",          desc: "Equipo entregado en buen estado, regresado completo y sin daños" },
          { key: "comunicacionCliente", label: "Comunicación con cliente",   desc: "Claridad en la coordinación, firma de responsiva y trato durante el proceso" },
          { key: "resolucionOperativa", label: "Resolución de imprevistos",  desc: "Manejo de situaciones no previstas: faltantes, cambios de última hora, daños" },
          { key: "rentabilidadReal",    label: "Rentabilidad real",          desc: "Resultó rentable considerando costos de logística, combustible y tiempo invertido" },
          { key: "resultadoGeneral",    label: "Resultado general",          desc: "Impresión global de la renta: ¿la repetiríamos en las mismas condiciones?" },
        ] : [
          { key: "planeacionPrevia",    label: "Planeación previa",         desc: "Preparación técnica, logística y coordinación antes del evento" },
          { key: "cumplimientoTecnico", label: "Cumplimiento técnico",      desc: "Calidad del sonido, iluminación, video y operación en sitio" },
          { key: "puntualidad",         label: "Puntualidad",               desc: "Llegada, montaje y apertura en los tiempos acordados" },
          { key: "resolucionOperativa", label: "Resolución operativa",      desc: "Manejo de imprevistos, problemas técnicos y decisiones en tiempo real" },
          { key: "desempenoPersonal",   label: "Desempeño del personal",    desc: "Actitud, profesionalismo y efectividad del equipo técnico" },
          { key: "comunicacionInterna", label: "Comunicación interna",      desc: "Coordinación entre los miembros del equipo durante el evento" },
          { key: "comunicacionCliente", label: "Comunicación con cliente",  desc: "Trato, respuesta y satisfacción comunicada por el cliente" },
          { key: "usoEquipo",           label: "Uso del equipo",            desc: "Cuidado, aprovechamiento y regreso en buen estado del material" },
          { key: "rentabilidadReal",    label: "Rentabilidad real",         desc: "Resultó rentable considerando costos reales vs. lo cobrado" },
          { key: "resultadoGeneral",    label: "Resultado general",         desc: "Impresión global del proyecto como equipo" },
        ];

        const promedio = evalLoaded && evaluacion.promedioCalculado != null
          ? evaluacion.promedioCalculado
          : CRITERIOS.map(c => evaluacion[c.key] as number).filter(v => v > 0).reduce((a, b, _, arr) => a + b / arr.length, 0) || null;

        function colorCalif(v: number) {
          if (v === 0) return "text-gray-600";
          if (v >= 9) return "text-green-400";
          if (v >= 7) return "text-[#B3985B]";
          if (v >= 5) return "text-yellow-400";
          return "text-red-400";
        }
        function colorBg(v: number) {
          if (v === 0) return "bg-[#222]";
          if (v >= 9) return "bg-green-900/40 border-green-700/40";
          if (v >= 7) return "bg-[#B3985B]/10 border-[#B3985B]/30";
          if (v >= 5) return "bg-yellow-900/30 border-yellow-700/40";
          return "bg-red-900/30 border-red-700/40";
        }

        return (
          <div className="space-y-4">
            {/* Promedio global */}
            {promedio !== null && promedio > 0 && (
              <div className="bg-[#111] border border-[#222] rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Promedio general</p>
                  <p className={`text-4xl font-bold ${colorCalif(promedio)}`}>{promedio.toFixed(1)}<span className="text-gray-600 text-lg font-normal">/10</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">
                    {CRITERIOS.filter(c => (evaluacion[c.key] as number) > 0).length} de {CRITERIOS.length} criterios evaluados
                  </p>
                  {promedio >= 9 && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-full">Excelente</span>}
                  {promedio >= 7 && promedio < 9 && <span className="text-xs text-[#B3985B] bg-[#B3985B]/10 px-2 py-1 rounded-full">Muy bueno</span>}
                  {promedio >= 5 && promedio < 7 && <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded-full">Regular</span>}
                  {promedio < 5 && promedio > 0 && <span className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded-full">Necesita mejorar</span>}
                </div>
              </div>
            )}

            {/* Criterios */}
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1a1a1a]">
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Criterios de evaluación</p>
                <p className="text-gray-500 text-xs mt-1">Califica del 1 al 10 cada criterio (0 = sin evaluar)</p>
              </div>
              <div className="divide-y divide-[#1a1a1a]">
                {CRITERIOS.map(({ key, label, desc }) => {
                  const val = evaluacion[key] as number;
                  const comentario = evaluacion.comentariosCriterios[key] ?? "";
                  return (
                    <div key={key} className={`px-5 py-4 border border-transparent ${colorBg(val)}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium">{label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-2xl font-bold w-10 text-right ${colorCalif(val)}`}>
                            {val === 0 ? "—" : val}
                          </span>
                          <div className="flex gap-1">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                              <button key={n} onClick={() => setEvaluacion(prev => ({ ...prev, [key]: n }))}
                                className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                                  val === n
                                    ? n === 0 ? "bg-[#333] text-gray-400" : n >= 9 ? "bg-green-600 text-white" : n >= 7 ? "bg-[#B3985B] text-black" : n >= 5 ? "bg-yellow-600 text-black" : "bg-red-700 text-white"
                                    : "bg-[#1a1a1a] text-gray-500 hover:bg-[#222] hover:text-white"
                                }`}>
                                {n === 0 ? "—" : n}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* Comentario por criterio */}
                      <input
                        value={comentario}
                        onChange={e => setEvaluacion(prev => ({
                          ...prev,
                          comentariosCriterios: { ...prev.comentariosCriterios, [key]: e.target.value },
                        }))}
                        placeholder="Comentario (opcional)..."
                        className="mt-2 w-full bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder-gray-700 focus:outline-none focus:border-[#B3985B]/50"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notas */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-5">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Notas y observaciones</p>
              <textarea
                value={evaluacion.notas}
                onChange={e => setEvaluacion(prev => ({ ...prev, notas: e.target.value }))}
                rows={4}
                placeholder="¿Qué funcionó bien? ¿Qué mejoraría para el siguiente evento similar? ¿Algún incidente relevante?"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B3985B] resize-none"
              />
            </div>

            {/* Guardar evaluación */}
            <div className="flex justify-end">
              <button onClick={guardarEval} disabled={savingEval}
                className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors">
                {savingEval ? "Guardando..." : "Guardar evaluación"}
              </button>
            </div>

            {/* ── Reporte post-evento ── */}
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Reporte de mejora post-evento</p>
                  <p className="text-gray-500 text-xs mt-0.5">Documenta problemas y sus soluciones por área para mejorar futuros eventos</p>
                </div>
                <button
                  onClick={() => setReportePostEvento(prev => [...prev, { area: "", problema: "", causa: "", solucion: "" }])}
                  className="text-xs text-[#B3985B] border border-[#B3985B]/40 hover:border-[#B3985B] hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Agregar área
                </button>
              </div>

              {reportePostEvento.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-600 text-sm">Sin registros aún</p>
                  <p className="text-gray-700 text-xs mt-1">Agrega cada área con el problema encontrado, causa y solución aplicada</p>
                </div>
              ) : (
                <div className="divide-y divide-[#1a1a1a]">
                  {reportePostEvento.map((item, i) => (
                    <div key={i} className="px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <input
                          value={item.area}
                          onChange={e => setReportePostEvento(prev => prev.map((x, j) => j === i ? { ...x, area: e.target.value } : x))}
                          placeholder="Área (ej: Audio, Iluminación, Logística...)"
                          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[#B3985B] font-semibold text-sm focus:outline-none focus:border-[#B3985B]/60"
                        />
                        <button onClick={() => setReportePostEvento(prev => prev.filter((_, j) => j !== i))}
                          className="ml-3 text-gray-600 hover:text-red-400 transition-colors text-lg shrink-0">×</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Problema</label>
                          <textarea
                            value={item.problema}
                            onChange={e => setReportePostEvento(prev => prev.map((x, j) => j === i ? { ...x, problema: e.target.value } : x))}
                            rows={3} placeholder="¿Qué falló o salió diferente?"
                            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-red-900/60 resize-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Causa raíz</label>
                          <textarea
                            value={item.causa}
                            onChange={e => setReportePostEvento(prev => prev.map((x, j) => j === i ? { ...x, causa: e.target.value } : x))}
                            rows={3} placeholder="¿Por qué ocurrió?"
                            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-yellow-900/60 resize-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Solución aplicada / propuesta</label>
                          <textarea
                            value={item.solucion}
                            onChange={e => setReportePostEvento(prev => prev.map((x, j) => j === i ? { ...x, solucion: e.target.value } : x))}
                            rows={3} placeholder="¿Qué se hizo o se hará diferente?"
                            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-green-900/60 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {reportePostEvento.length > 0 && (
                <div className="px-5 py-3 border-t border-[#1a1a1a] flex items-center gap-2 flex-wrap">
                  {/* Descargar PDF */}
                  <a
                    href={`/api/proyectos/${id}/reporte-post-evento/pdf`}
                    download
                    className="flex items-center gap-1.5 text-xs text-gray-300 border border-[#333] hover:bg-[#222] hover:border-[#555] px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Descargar PDF
                  </a>
                  {/* WhatsApp — compartir PDF via Web Share API */}
                  {proyecto.cliente?.telefono && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/proyectos/${id}/reporte-post-evento/pdf`);
                          const blob = await res.blob();
                          const file = new File([blob], `ReportePostEvento-${proyecto!.numeroProyecto}.pdf`, { type: "application/pdf" });
                          if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({ files: [file], title: `Reporte post-evento: ${proyecto!.nombre}` });
                          } else {
                            // Fallback: abrir WhatsApp con texto si Web Share no disponible
                            const tel = proyecto!.cliente!.telefono!.replace(/\D/g, "");
                            window.open(`https://wa.me/${tel}?text=${encodeURIComponent(`Hola ${proyecto!.cliente!.nombre}, adjunto el reporte de mejora del evento *${proyecto!.nombre}*.`)}`, "_blank");
                          }
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs text-green-500 border border-green-800/50 hover:bg-green-900/20 hover:border-green-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.984-1.31A9.944 9.944 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                      Enviar a cliente
                    </button>
                  )}
                  <button onClick={guardarReporte} disabled={savingReporte}
                    className="ml-auto bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-xs px-5 py-2 rounded-lg transition-colors">
                    {savingReporte ? "Guardando..." : "Guardar reporte"}
                  </button>
                </div>
              )}
            </div>

            {/* Evaluación cliente */}
            {(() => {
              const linkBase = typeof window !== "undefined" ? `${window.location.origin}/encuesta/` : "/encuesta/";
              return (
                <div className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Evaluación del cliente</p>
                      <p className="text-gray-500 text-xs mt-0.5">Formulario externo para que el cliente califique el servicio</p>
                    </div>
                    {!evalCliente && (
                      <button onClick={generarLinkEvalCliente} disabled={generandoLink || loadingEvalCliente}
                        className="bg-[#1a1a1a] hover:bg-[#222] border border-[#333] disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg transition-colors">
                        {generandoLink ? "Generando..." : "Generar link"}
                      </button>
                    )}
                  </div>

                  {loadingEvalCliente && <p className="text-gray-600 text-sm">Cargando...</p>}

                  {evalCliente && (
                    <div className="space-y-3">
                      {/* Link */}
                      <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 flex items-center gap-2">
                        <span className="text-gray-500 text-xs flex-1 truncate font-mono">{linkBase}{evalCliente.tokenAcceso}</span>
                        <button onClick={() => navigator.clipboard.writeText(`${linkBase}${evalCliente.tokenAcceso}`)}
                          className="text-[10px] text-[#B3985B] hover:text-white shrink-0 transition-colors">Copiar</button>
                        {proyecto.cliente.telefono && (
                          <a
                            href={`https://wa.me/${proyecto.cliente.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${proyecto.cliente.nombre}, fue un placer trabajar contigo en ${proyecto.nombre}. Te compartimos este breve formulario para conocer tu experiencia: ${linkBase}${evalCliente.tokenAcceso}`)}`}
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
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${evalCliente.respondida ? "bg-green-900/50 text-green-300" : evalCliente.enviada ? "bg-yellow-900/50 text-yellow-300" : "bg-gray-800 text-gray-500"}`}>
                          {evalCliente.respondida ? "Respondida" : evalCliente.enviada ? "Enviada" : "Pendiente"}
                        </span>
                        {evalCliente.promedioCalculado && (
                          <span className="text-sm text-white font-semibold">
                            Promedio: <span className="text-[#B3985B]">{evalCliente.promedioCalculado.toFixed(1)}</span>/10
                          </span>
                        )}
                      </div>

                      {/* Resultados si ya respondió */}
                      {evalCliente.respondida && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {[
                            { label: "Satisfacción general", val: evalCliente.satisfaccionGeneral },
                            { label: "Calidad del servicio", val: evalCliente.calidadServicio },
                            { label: "Puntualidad", val: evalCliente.puntualidad },
                            { label: "Atención del equipo", val: evalCliente.atencionEquipo },
                            { label: "Comunicación", val: evalCliente.claridadComunicacion },
                            { label: "Calidad-precio", val: evalCliente.relacionCalidadPrecio },
                          ].map(({ label, val }) => val != null && (
                            <div key={label} className="flex items-center justify-between bg-[#0d0d0d] rounded-lg px-3 py-2">
                              <span className="text-xs text-gray-500">{label}</span>
                              <span className={`text-sm font-bold ${val >= 9 ? "text-green-400" : val >= 7 ? "text-[#B3985B]" : val >= 5 ? "text-yellow-400" : "text-red-400"}`}>{val}</span>
                            </div>
                          ))}
                          {evalCliente.probabilidadRecontratacion != null && (
                            <div className="flex items-center justify-between bg-[#0d0d0d] rounded-lg px-3 py-2 col-span-2">
                              <span className="text-xs text-gray-500">Probabilidad de recontratación (NPS)</span>
                              <span className={`text-sm font-bold ${evalCliente.probabilidadRecontratacion >= 9 ? "text-green-400" : evalCliente.probabilidadRecontratacion >= 7 ? "text-[#B3985B]" : evalCliente.probabilidadRecontratacion >= 5 ? "text-yellow-400" : "text-red-400"}`}>{evalCliente.probabilidadRecontratacion}/10</span>
                            </div>
                          )}
                        </div>
                      )}
                      {evalCliente.loMejor && (
                        <div className="bg-[#0d0d0d] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Lo mejor</p>
                          <p className="text-gray-300 text-sm">{evalCliente.loMejor}</p>
                        </div>
                      )}
                      {evalCliente.loMejorable && (
                        <div className="bg-[#0d0d0d] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Áreas de mejora</p>
                          <p className="text-gray-300 text-sm">{evalCliente.loMejorable}</p>
                        </div>
                      )}
                      {evalCliente.comentarioAdicional && (
                        <div className="bg-[#0d0d0d] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Comentario adicional</p>
                          <p className="text-gray-300 text-sm">{evalCliente.comentarioAdicional}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Score Foto / Video */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
              <div>
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Score foto / video</p>
                <p className="text-gray-500 text-xs mt-0.5">Calidad del contenido fotográfico y/o audiovisual generado durante el evento</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-3xl font-bold w-10 ${scoreFotoVideo === 0 ? "text-gray-600" : scoreFotoVideo >= 9 ? "text-green-400" : scoreFotoVideo >= 7 ? "text-[#B3985B]" : scoreFotoVideo >= 5 ? "text-yellow-400" : "text-red-400"}`}>
                  {scoreFotoVideo === 0 ? "—" : scoreFotoVideo}
                </span>
                <div className="flex gap-1 flex-wrap">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <button key={n} onClick={() => setScoreFotoVideo(n)}
                      className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                        scoreFotoVideo === n
                          ? n === 0 ? "bg-[#333] text-gray-400" : n >= 9 ? "bg-green-600 text-white" : n >= 7 ? "bg-[#B3985B] text-black" : n >= 5 ? "bg-yellow-600 text-black" : "bg-red-700 text-white"
                          : "bg-[#1a1a1a] text-gray-500 hover:bg-[#222] hover:text-white"
                      }`}>
                      {n === 0 ? "—" : n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Recomendación para próximos eventos</label>
                <textarea
                  value={recomendacionFotoVideo}
                  onChange={e => setRecomendacionFotoVideo(e.target.value)}
                  rows={3}
                  placeholder="Fotógrafo recomendado, estilo, indicaciones técnicas..."
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B3985B] resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button onClick={guardarScore} disabled={savingScore}
                  className="bg-[#1a1a1a] hover:bg-[#222] border border-[#333] disabled:opacity-50 text-white text-sm px-5 py-2 rounded-lg transition-colors">
                  {savingScore ? "Guardando..." : "Guardar score"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
            <p className="text-white font-semibold text-sm">🔔 Notificar cambio al equipo</p>
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
                <span className="text-xs shrink-0">{c.tipo === "tecnico" ? "👤" : "🏭"}</span>
                <span className="text-white text-xs truncate">{c.nombre}</span>
              </div>
              {c.waUrl ? (
                <a href={c.waUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 bg-green-800 hover:bg-green-700 text-white text-[11px] font-semibold px-3 py-1 rounded-lg transition-colors">
                  💬 WA
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
            className="w-full bg-green-800 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
            💬 Notificar a todos ({pendingNotif.contactos.filter(c => c.waUrl).length})
          </button>
        )}
      </div>
    )}
    </>
  );
}
