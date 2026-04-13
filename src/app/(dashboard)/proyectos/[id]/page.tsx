"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
interface Proveedor { id: string; nombre: string }
interface CheckItem { id: string; item: string; completado: boolean; orden: number; tipo: string }
interface Archivo { id: string; tipo: string; nombre: string; url: string; createdAt: string }
interface CxC { id: string; concepto: string; tipoPago: string; monto: number; montoCobrado: number; estado: string; fechaCompromiso: string }
interface CxP { id: string; concepto: string; monto: number; estado: string; fechaCompromiso: string; tipoAcreedor: string }
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
  cotizacion: { id: string; numeroCotizacion: string; granTotal: number } | null;
  logisticaRenta: string | null;
  personal: Personal[];
  equipos: ProyectoEquipoItem[];
  checklist: CheckItem[];
  archivos: Archivo[];
  cuentasCobrar: CxC[];
  cuentasPagar: CxP[];
  bitacora: Bitacora[];
  movimientos: Gasto[];
}

// ─── Constantes ──────────────────────────────────────────────────────────────
const ESTADOS = ["PLANEACION", "CONFIRMADO", "EN_CURSO", "COMPLETADO", "CANCELADO"];
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

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ProyectoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"info" | "personal" | "equipos" | "checklist" | "finanzas" | "gastos" | "bitacora" | "evaluacion">("info");
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
  };
  const EVAL_EMPTY: EvalData = {
    planeacionPrevia: 0, cumplimientoTecnico: 0, puntualidad: 0,
    resolucionOperativa: 0, desempenoPersonal: 0, comunicacionInterna: 0,
    comunicacionCliente: 0, usoEquipo: 0, rentabilidadReal: 0,
    resultadoGeneral: 0, notas: "", promedioCalculado: null,
  };
  const [evaluacion, setEvaluacion] = useState<EvalData>(EVAL_EMPTY);
  const [evalLoaded, setEvalLoaded] = useState(false);
  const [savingEval, setSavingEval] = useState(false);

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

  // Catálogos
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [roles, setRoles] = useState<RolTecnico[]>([]);
  const [categorias, setCategorias] = useState<CatFinanciera[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  // Estado de cronograma (tabla JSON)
  const [cronoRows, setCronoRows] = useState<CronoRow[]>([]);
  const [savingCrono, setSavingCrono] = useState(false);

  // Estado de transportes (3 fichas JSON)
  const [transporteSlots, setTransporteSlots] = useState<TransporteSlot[]>([
    { proveedor: "", marcaModelo: "", comentarios: "" },
    { proveedor: "", marcaModelo: "", comentarios: "" },
    { proveedor: "", marcaModelo: "", comentarios: "" },
  ]);
  const [savingTransporte, setSavingTransporte] = useState(false);

  // Estado catering
  type CateringData = {
    contactoNombre: string; contactoTelefono: string;
    personasCrew: string; comidas: string[]; notas: string;
  };
  const CATERING_EMPTY: CateringData = { contactoNombre: "", contactoTelefono: "", personasCrew: "", comidas: [], notas: "" };
  const [catering, setCatering] = useState<CateringData>(CATERING_EMPTY);
  const [savingCatering, setSavingCatering] = useState(false);
  const COMIDAS_OPTS = ["Desayuno", "Almuerzo", "Comida", "Cena", "Snack / coffee break"];

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

  // Estados para checklist
  const [nuevoItem, setNuevoItem] = useState("");
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
    setLoading(false);
  }

  async function loadEval() {
    const res = await fetch(`/api/proyectos/${id}/evaluacion`);
    const d = await res.json();
    if (d.evaluacion) {
      setEvaluacion({ ...EVAL_EMPTY, ...d.evaluacion, notas: d.evaluacion.notas ?? "" });
    }
    setEvalLoaded(true);
  }

  async function guardarEval() {
    setSavingEval(true);
    const res = await fetch(`/api/proyectos/${id}/evaluacion`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evaluacion),
    });
    const d = await res.json();
    if (d.evaluacion) {
      setEvaluacion({ ...EVAL_EMPTY, ...d.evaluacion, notas: d.evaluacion.notas ?? "" });
    }
    setSavingEval(false);
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
    await fetch(`/api/proyectos/${id}/equipos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipoId: selEquipoId,
        tipo: selEquipoTipo,
        cantidad: parseInt(selEquipoCantidad) || 1,
        dias: parseInt(selEquipoDias) || 1,
        costoExterno: selEquipoCosto ? parseFloat(selEquipoCosto) : null,
        proveedorId: selEquipoProveedor || null,
      }),
    });
    await load();
    setShowAddEquipo(false);
    setSelEquipoId(""); setSelEquipoTipo("PROPIO"); setSelEquipoCantidad("1");
    setSelEquipoDias("1"); setSelEquipoCosto(""); setSelEquipoProveedor("");
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
    ]).then(([t, r, c, p, eq]) => {
      setTecnicos(t.tecnicos ?? []);
      setRoles(r.roles ?? []);
      setCategorias((c.categorias ?? []).filter((x: CatFinanciera) => x.tipo === "GASTO"));
      setProveedores(p.proveedores ?? []);
      setEquipoCatalogo(eq.equipos ?? []);
    });
  }, [id]);

  // Lazy-load evaluación cliente when evaluacion tab opens
  useEffect(() => {
    if (tab === "evaluacion") loadEvalCliente();
    if (tab === "gastos" && !gastosLoaded) {
      fetch(`/api/proyectos/gastos-operativos?proyectoId=${id}`)
        .then(r => r.json())
        .then(d => { setGastosOp(d.gastos ?? []); setGastosLoaded(true); });
    }
  }, [tab]);

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
      setCatering({ ...CATERING_EMPTY, ...c, comidas: Array.isArray(c.comidas) ? c.comidas : [] });
    } catch { setCatering(CATERING_EMPTY); }
  }, [proyecto?.id]);

  // ── Cambiar estado del proyecto ──
  async function cambiarEstado(estado: string) {
    setSaving(true);
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    setProyecto(prev => prev ? { ...prev, estado } : prev);
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

  // ── Guardar cronograma ──
  async function guardarCronograma(rows: CronoRow[]) {
    setSavingCrono(true);
    await fetch(`/api/proyectos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cronograma: JSON.stringify(rows) }),
    });
    setProyecto(prev => prev ? { ...prev, cronograma: JSON.stringify(rows) } : prev);
    setSavingCrono(false);
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
    const comidasStr = catering.comidas.length > 0 ? catering.comidas.join(", ") : "a definir";
    const personas = catering.personasCrew || "—";
    const msg = `Hola${catering.contactoNombre ? ` ${catering.contactoNombre}` : ""}! Te contactamos de Mainstage Pro. Para el proyecto *${proyecto!.nombre}* el ${fechaStr}${proyecto!.lugarEvento ? ` en ${proyecto!.lugarEvento}` : ""}, necesitamos servicio de catering para *${personas} personas* de crew. Comidas requeridas: *${comidasStr}*.${catering.notas ? ` Notas: ${catering.notas}.` : ""} ¿Puedes confirmarnos disponibilidad y precio?`;
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
    if (d.mensaje) alert(d.mensaje);
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
  async function asignarTecnico(pId: string) {
    if (!selAsignar) return;
    const res = await fetch(`/api/proyectos/${id}/personal/${pId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tecnicoId: selAsignar }),
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
      alert("Error al eliminar el proyecto: " + (d.error ?? "desconocido"));
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

  if (loading) return <div className="text-gray-400 text-sm p-6">Cargando...</div>;
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
            <span className="text-gray-400 text-sm font-mono">{proyecto.numeroProyecto}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[proyecto.estado]}`}>
              {proyecto.estado.replace("_", " ")}
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
          <div className="flex items-center gap-2">
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
              {e.replace("_", " ")}
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

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1">
        {(["info", "personal", "equipos", "checklist", "finanzas", "gastos", "bitacora", "evaluacion"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
              tab === t ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"
            }`}>
            {t === "info" ? "Info" : t === "personal" ? "Personal" : t === "equipos" ? "Equipos" : t === "checklist" ? "Checklist" : t === "finanzas" ? "Finanzas" : t === "gastos" ? "Gastos Op." : t === "bitacora" ? "Bitácora" : "Eval."}
          </button>
        ))}
      </div>

      {/* ────── TAB: INFO ────── */}
      {tab === "info" && (
        <div className="space-y-4">
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
              <div className="col-span-2">
                <Campo label="Descripción general del proyecto" value={proyecto.descripcionGeneral} field="descripcionGeneral" onSave={guardarCampo} multiline />
              </div>
              <div className="col-span-2">
                <Campo label="Detalles específicos del proyecto" value={proyecto.detallesEspecificos} field="detallesEspecificos" onSave={guardarCampo} multiline />
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
              <div className="bg-[#111] border border-blue-900/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Logística de renta</p>
                  <span className="text-[10px] text-blue-400/60 bg-blue-900/20 px-2 py-0.5 rounded-full">RENTA DE EQUIPO</span>
                </div>
                {Object.keys(rentaData).length === 0 ? (
                  <p className="text-gray-600 text-sm italic">Sin datos de logística. Completa el descubrimiento en el trato para ver esta información.</p>
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
                        <p className="text-gray-500 text-xs mb-1">Fecha de devolución</p>
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
              <Campo label="Hora inicio montaje" value={proyecto.horaInicioMontaje} field="horaInicioMontaje" onSave={guardarCampo} />
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
                <Campo label="Lugar del evento" value={proyecto.lugarEvento} field="lugarEvento" onSave={guardarCampo} />
              </div>
              <Campo label="Encargado del lugar" value={proyecto.encargadoLugar} field="encargadoLugar" onSave={guardarCampo} />
              <Campo label="Contacto del lugar" value={proyecto.encargadoLugarContacto} field="encargadoLugarContacto" onSave={guardarCampo} />
            </div>
          </div>

          {/* ── Personal (resumen) ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Personal del evento</p>
              <button onClick={() => setTab("personal")} className="text-xs text-gray-500 hover:text-[#B3985B] transition-colors">Ver tab Personal →</button>
            </div>
            {(["OPERACION", "MONTAJE", "DESMONTAJE", "TRANSPORTE", "OTRO"] as const).map(tipo => {
              const grupo = proyecto.personal.filter(p => (p.participacion ?? "OPERACION") === tipo);
              if (grupo.length === 0) return null;
              const labels: Record<string, string> = { OPERACION: "Operadores del evento", MONTAJE: "Técnicos de montaje", DESMONTAJE: "Técnicos de desmontaje", TRANSPORTE: "Transportes", OTRO: "Otros" };
              return (
                <div key={tipo} className="mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{labels[tipo]}</p>
                  {grupo.map(p => (
                    <div key={p.id} className="flex items-center gap-2 py-1 text-sm border-b border-[#1a1a1a] last:border-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${p.confirmado ? "bg-green-500" : "bg-gray-600"}`} />
                      <span className="text-white flex-1">{p.tecnico?.nombre ?? <span className="text-gray-500 italic">Sin asignar</span>}</span>
                      <span className="text-gray-500 text-xs">{p.rolTecnico?.nombre ?? p.tecnico?.rol?.nombre ?? "—"}</span>
                      {p.responsabilidad && <span className="text-gray-600 text-xs">· {p.responsabilidad}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
            {proyecto.personal.length === 0 && <p className="text-gray-600 text-sm">Sin personal asignado aún</p>}
          </div>

          {/* ── Logística ── */}
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
                      📲 WhatsApp catering
                    </button>
                  )}
                  <button onClick={() => guardarCatering(catering)} disabled={savingCatering}
                    className="text-xs bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    Guardar
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Contacto (nombre)</label>
                  <input value={catering.contactoNombre}
                    onChange={e => setCatering(p => ({ ...p, contactoNombre: e.target.value }))}
                    placeholder="Nombre del proveedor o contacto"
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Teléfono / WhatsApp</label>
                  <input value={catering.contactoTelefono}
                    onChange={e => setCatering(p => ({ ...p, contactoTelefono: e.target.value }))}
                    placeholder="Ej: 4421234567"
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Personas de crew a alimentar</label>
                  <input type="number" min="1" value={catering.personasCrew}
                    onChange={e => setCatering(p => ({ ...p, personasCrew: e.target.value }))}
                    placeholder="Ej: 8"
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Comidas requeridas</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {COMIDAS_OPTS.map(c => (
                      <button key={c} type="button"
                        onClick={() => setCatering(p => ({
                          ...p,
                          comidas: p.comidas.includes(c) ? p.comidas.filter(x => x !== c) : [...p.comidas, c],
                        }))}
                        className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                          catering.comidas.includes(c)
                            ? "bg-[#B3985B]/20 border-[#B3985B] text-[#B3985B]"
                            : "border-[#333] text-gray-500 hover:border-gray-500 hover:text-gray-300"
                        }`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Notas especiales (alergias, vegetarianos, restricciones…)</label>
                  <input value={catering.notas}
                    onChange={e => setCatering(p => ({ ...p, notas: e.target.value }))}
                    placeholder="Ej: 2 vegetarianos, sin gluten para técnico de iluminación"
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Cronograma (tabla) ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Cronología general del evento</p>
              <div className="flex items-center gap-2">
                {savingCrono && <span className="text-xs text-gray-600">Guardando...</span>}
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
              <p className="text-gray-600 text-sm text-center py-6">Sin actividades. Agrega una fila para comenzar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 uppercase tracking-wider border-b border-[#222]">
                      <th className="text-left py-2 pr-3 font-medium w-20">Inicio</th>
                      <th className="text-left py-2 pr-3 font-medium w-20">Fin</th>
                      <th className="text-left py-2 pr-3 font-medium">Actividad</th>
                      <th className="text-left py-2 pr-3 font-medium w-32">Responsable</th>
                      <th className="text-left py-2 pr-3 font-medium w-36">Involucrados</th>
                      <th className="w-6" />
                    </tr>
                  </thead>
                  <tbody>
                    {cronoRows.map((row, i) => (
                      <tr key={i} className="border-b border-[#1a1a1a] last:border-0">
                        <td className="py-1.5 pr-2">
                          <input value={row.horaInicio} onChange={e => updateCronoRow(i, "horaInicio", e.target.value)}
                            placeholder="09:00"
                            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white focus:outline-none focus:border-[#B3985B]" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input value={row.horaFin} onChange={e => updateCronoRow(i, "horaFin", e.target.value)}
                            placeholder="10:00"
                            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white focus:outline-none focus:border-[#B3985B]" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input value={row.actividad} onChange={e => updateCronoRow(i, "actividad", e.target.value)}
                            placeholder="Descripción de la actividad"
                            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white focus:outline-none focus:border-[#B3985B]" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input value={row.responsable} onChange={e => updateCronoRow(i, "responsable", e.target.value)}
                            placeholder="Quién lidera"
                            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white focus:outline-none focus:border-[#B3985B]" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input value={row.involucrados} onChange={e => updateCronoRow(i, "involucrados", e.target.value)}
                            placeholder="Quiénes participan"
                            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white focus:outline-none focus:border-[#B3985B]" />
                        </td>
                        <td className="py-1.5 text-center">
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

          {/* ── Documentos operativos ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Documentos operativos</p>
            {(["RENDER", "PLOT_PATCH", "INPUT_LIST", "RIDER", "FICHA_TECNICA", "ITINERARIO", "OTRO"] as const).map(tipo => {
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

          {/* ── Marketing / Contenido ── */}
          {(() => {
            let mkt: { activo: boolean; telefono: string; nombre: string } = { activo: false, telefono: "", nombre: "" };
            try { if (proyecto.marketingData) mkt = { ...mkt, ...JSON.parse(proyecto.marketingData) }; } catch { /* defaults */ }

            async function toggleMarketing() {
              const nuevo = { ...mkt, activo: !mkt.activo };
              await guardarCampo("marketingData", JSON.stringify(nuevo));
            }
            async function saveContacto(field: "telefono" | "nombre", val: string) {
              const nuevo = { ...mkt, [field]: val };
              await guardarCampo("marketingData", JSON.stringify(nuevo));
            }

            const tel = mkt.telefono.replace(/\D/g, "");
            const waLink = tel ? `https://wa.me/52${tel}?text=${encodeURIComponent(`Hola ${mkt.nombre || ""}! 📸 Hay un evento el ${new Date(proyecto.fechaEvento).toLocaleDateString("es-MX", { day: "numeric", month: "long" })} — "${proyecto.nombre}". ¿Puedes confirmar disponibilidad para levantar contenido?`)}` : null;

            return (
              <div className="bg-[#111] border border-[#222] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">📸</span>
                    <div>
                      <p className="text-white text-sm font-medium">Contenido de marketing</p>
                      <p className="text-gray-600 text-xs">¿Se levanta contenido en este evento?</p>
                    </div>
                  </div>
                  <button onClick={toggleMarketing}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${mkt.activo ? "bg-[#B3985B]" : "bg-[#333]"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${mkt.activo ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>

                {mkt.activo && (
                  <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex items-center gap-3 flex-wrap">
                    <div className="flex gap-2 flex-1 min-w-0">
                      <input defaultValue={mkt.nombre} onBlur={e => saveContacto("nombre", e.target.value)}
                        placeholder="Nombre contacto marketing"
                        className="flex-1 min-w-0 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                      <input defaultValue={mkt.telefono} onBlur={e => saveContacto("telefono", e.target.value)}
                        placeholder="Teléfono (10 dígitos)"
                        className="w-36 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                    </div>
                    {waLink ? (
                      <a href={waLink} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1.5 bg-green-800 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                        💬 Contactar
                      </a>
                    ) : (
                      <span className="text-gray-600 text-xs shrink-0">Agrega teléfono para WA</span>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Comentarios ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-5">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Comentarios finales / adicionales</p>
            <Campo label="" value={proyecto.comentariosFinales} field="comentariosFinales" onSave={guardarCampo} multiline />
          </div>
        </div>
      )}

      {/* ────── TAB: EQUIPOS ────── */}
      {tab === "equipos" && (() => {
        const equiposPropios  = proyecto.equipos.filter(e => e.tipo === "PROPIO");
        const equiposExternos = proyecto.equipos.filter(e => e.tipo === "EXTERNO");
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
                    onClick={async () => {
                      const res = await fetch(`/api/proyectos/${id}/equipos/${eq.id}/invitar-proveedor`, { method: "POST" });
                      const d = await res.json();
                      if (d.whatsappUrl) {
                        window.open(d.whatsappUrl, "_blank");
                        await load();
                      } else if (d.token) {
                        const url = `${window.location.origin}/confirmar/proveedor/${d.token}`;
                        await navigator.clipboard.writeText(url).catch(() => {});
                        alert(`Sin número registrado. Link copiado:\n${url}`);
                        await load();
                      }
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium border border-blue-800/50 text-blue-400 hover:bg-blue-900/20 hover:border-blue-600 transition-colors"
                    title="Consultar disponibilidad al proveedor">
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
                      className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                      <option value="">Seleccionar equipo...</option>
                      {equipoCatalogo.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.categoria.nombre} — {eq.descripcion}{eq.marca ? ` (${eq.marca})` : ""}</option>
                      ))}
                    </select>
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

      {/* ────── TAB: PERSONAL ────── */}
      {tab === "personal" && (
        <div className="space-y-3">
          {/* Formulario agregar */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <button onClick={() => setShowAddPersonal(v => !v)}
              className="text-sm text-[#B3985B] hover:text-white transition-colors font-medium">
              {showAddPersonal ? "− Cancelar" : "+ Agregar técnico al evento"}
            </button>

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
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                    <option value="">— Sin asignar —</option>
                    {tecnicos.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre} · {t.rol?.nombre ?? "Sin rol"} · {t.nivel}</option>
                    ))}
                  </select>
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

          {/* Lista personal agrupada por participación */}
          {proyecto.personal.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center text-gray-500 text-sm">
              Sin personal asignado aún
            </div>
          ) : (
            <>
              {(["OPERACION", "MONTAJE", "DESMONTAJE", "TRANSPORTE", "OTRO"] as const).map(tipo => {
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
                                  <select value={selAsignar} onChange={e => setSelAsignar(e.target.value)}
                                    className="flex-1 bg-[#1a1a1a] border border-[#B3985B] rounded-lg px-2 py-1 text-white text-sm focus:outline-none">
                                    <option value="">— Seleccionar técnico —</option>
                                    {tecnicos.map(t => (
                                      <option key={t.id} value={t.id}>{t.nombre} · {t.rol?.nombre ?? "Sin rol"} · {t.nivel}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => asignarTecnico(p.id)} disabled={!selAsignar}
                                    className="bg-[#B3985B] disabled:opacity-40 text-black text-xs font-bold px-3 py-1 rounded-lg">✓</button>
                                  <button onClick={() => { setAsignandoId(null); setSelAsignar(""); }}
                                    className="text-gray-500 hover:text-white text-xs">Cancelar</button>
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
                            {/* Respuesta de confirmación vía link */}
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
                            {/* Botón invitar por WhatsApp */}
                            {p.tecnico && (
                              <button
                                onClick={async () => {
                                  const res = await fetch(`/api/proyectos/${id}/personal/${p.id}/invitar`, { method: "POST" });
                                  const d = await res.json();
                                  if (d.whatsappUrl) {
                                    window.open(d.whatsappUrl, "_blank");
                                    await load();
                                  } else if (d.token) {
                                    const url = `${window.location.origin}/confirmar/tecnico/${d.token}`;
                                    await navigator.clipboard.writeText(url).catch(() => {});
                                    alert(`Sin número registrado. Link copiado al portapapeles:\n${url}`);
                                    await load();
                                  }
                                }}
                                className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-green-800/50 text-green-500 hover:bg-green-900/20 hover:border-green-600 transition-colors"
                                title="Enviar invitación por WhatsApp">
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
              })}
            </>
          )}
        </div>
      )}

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

            {checkOp.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6 italic">Sin items de operación</p>
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

          {/* ── Sección RIDER por equipo ── */}
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a1a1a]">
              <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Rider técnico</span>
              <p className="text-gray-600 text-[10px] mt-0.5">Equipos del proyecto · toca cada fila para ver accesorios sugeridos</p>
            </div>

            {proyecto.equipos.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6 italic">Sin equipos en este proyecto.</p>
            ) : (() => {
              // Agrupar por categoría
              const grupos: Record<string, typeof proyecto.equipos> = {};
              for (const e of proyecto.equipos) {
                const cat = e.equipo.categoria.nombre;
                if (!grupos[cat]) grupos[cat] = [];
                grupos[cat].push(e);
              }
              return Object.entries(grupos).map(([cat, items]) => (
                <div key={cat}>
                  <div className="px-4 py-1.5 bg-[#0d0d0d]">
                    <span className="text-[10px] text-[#555] font-bold uppercase tracking-widest">{cat}</span>
                  </div>
                  {items.map(e => {
                    const accesorios = accesoriosPorEquipo(e.equipo.descripcion, e.equipo.categoria.nombre);
                    const isExpanded = !!equipoExpanded[e.id];
                    const isCargado = !!equipoCargado[e.id];
                    const totalAcc = accesorios.length;
                    const cargadosAcc = accesorios.filter((_, i) => !!accesorioCargado[`${e.id}_${i}`]).length;
                    return (
                      <div key={e.id} className="border-b border-[#0d0d0d] last:border-0">
                        {/* Fila principal del equipo */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors cursor-pointer select-none"
                          onClick={() => setEquipoExpanded(prev => ({ ...prev, [e.id]: !isExpanded }))}
                        >
                          <input
                            type="checkbox"
                            checked={isCargado}
                            onChange={ev => { ev.stopPropagation(); setEquipoCargado(prev => ({ ...prev, [e.id]: !isCargado })); }}
                            onClick={ev => ev.stopPropagation()}
                            className="w-4 h-4 rounded accent-blue-500 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium ${isCargado ? "line-through text-gray-600" : "text-white"}`}>
                              {e.equipo.descripcion}
                              {e.equipo.marca && <span className="text-gray-500 font-normal"> · {e.equipo.marca}</span>}
                            </span>
                            <span className="ml-2 text-[#B3985B] text-xs">×{e.cantidad}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {cargadosAcc > 0 && (
                              <span className="text-[10px] text-blue-400">{cargadosAcc}/{totalAcc}</span>
                            )}
                            <svg
                              className={`w-3.5 h-3.5 text-[#444] transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>

                        {/* Accesorios sugeridos */}
                        {isExpanded && (
                          <div className="bg-[#0a0a0a] border-t border-[#1a1a1a] px-4 py-2 space-y-1">
                            <p className="text-[10px] text-[#444] uppercase tracking-widest mb-2">Accesorios sugeridos</p>
                            {accesorios.map((acc, i) => {
                              const key = `${e.id}_${i}`;
                              const checked = !!accesorioCargado[key];
                              return (
                                <label key={key} className="flex items-center gap-2.5 py-1 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => setAccesorioCargado(prev => ({ ...prev, [key]: !checked }))}
                                    className="w-3.5 h-3.5 rounded accent-blue-500 shrink-0"
                                  />
                                  <span className={`text-xs ${checked ? "line-through text-gray-600" : "text-gray-300"}`}>
                                    {acc}
                                  </span>
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

            {/* Items de bodega manuales (RIDER del DB) */}
            {checkRider.length > 0 && (
              <div className="border-t border-[#1a1a1a]">
                <div className="px-4 py-1.5 bg-[#0d0d0d]">
                  <span className="text-[10px] text-[#555] font-bold uppercase tracking-widest">Items adicionales de bodega</span>
                </div>
                {checkRider.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#0d0d0d] last:border-0 group hover:bg-[#1a1a1a] transition-colors">
                    <input type="checkbox" checked={c.completado} onChange={() => toggleCheck(c.id, c.completado)}
                      className="w-4 h-4 rounded accent-blue-500 shrink-0" />
                    <span className={`flex-1 text-sm ${c.completado ? "line-through text-gray-600" : "text-white"}`}>
                      {c.item}
                    </span>
                    <button onClick={() => eliminarItem(c.id)}
                      className="text-gray-700 hover:text-red-400 text-lg leading-none opacity-0 group-hover:opacity-100 transition-all">×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar item manual */}
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
        </div>
      )}

      {/* ────── TAB: FINANZAS ────── */}
      {tab === "finanzas" && (() => {
        // ── P&L en tiempo real ──────────────────────────────────────────────
        const ingresoContratado = proyecto.cotizacion?.granTotal ?? 0;
        const ingresoCobrado = proyecto.cuentasCobrar.reduce((s, c) => s + c.montoCobrado, 0);
        const costosPersonal = proyecto.cuentasPagar
          .filter(c => c.tipoAcreedor === "TECNICO")
          .reduce((s, c) => s + c.monto, 0);
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
            <div className="p-5 grid grid-cols-3 gap-4">
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
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a]">
              <h3 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Cuentas por cobrar</h3>
            </div>
            {proyecto.cuentasCobrar.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">Sin cuentas por cobrar</p>
            ) : (
              proyecto.cuentasCobrar.map(c => (
                <div key={c.id} className="px-5 py-4 border-b border-[#0d0d0d] last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white text-sm font-medium">{c.concepto}</p>
                      <p className="text-gray-500 text-xs">Vence: {fmtDate(c.fechaCompromiso)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-semibold">{fmt(c.monto)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.estado === "LIQUIDADO" ? "bg-green-900/50 text-green-300" :
                        c.estado === "VENCIDO" ? "bg-red-900/50 text-red-300" :
                        c.estado === "PARCIAL" ? "bg-blue-900/50 text-blue-300" :
                        "bg-yellow-900/30 text-yellow-400"
                      }`}>{c.estado}</span>
                    </div>
                  </div>
                  {c.montoCobrado > 0 && c.estado !== "LIQUIDADO" && (
                    <p className="text-green-600 text-xs mb-2">Cobrado: {fmt(c.montoCobrado)} / Pendiente: {fmt(c.monto - c.montoCobrado)}</p>
                  )}
                  {c.estado !== "LIQUIDADO" && (
                    pagando === c.id ? (
                      <div className="flex gap-2 mt-2">
                        <input type="number" value={montoPago} onChange={e => setMontoPago(e.target.value)}
                          placeholder={String(c.monto)} className="w-32 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                        <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                          className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none" />
                        <button onClick={() => registrarPagoCxC(c.id)}
                          className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded transition-colors">
                          Confirmar
                        </button>
                        <button onClick={() => setPagando(null)} className="text-gray-500 text-xs hover:text-white">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => { setPagando(c.id); setMontoPago(String(c.monto)); }}
                        className="text-xs text-green-400 hover:text-green-300 border border-green-800 hover:border-green-600 px-3 py-1 rounded-lg transition-colors">
                        + Registrar cobro
                      </button>
                    )
                  )}
                </div>
              ))
            )}
          </div>

          {/* CxP */}
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a]">
              <h3 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Cuentas por pagar</h3>
            </div>
            {proyecto.cuentasPagar.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">Sin cuentas por pagar</p>
            ) : (
              proyecto.cuentasPagar.map(c => (
                <div key={c.id} className="px-5 py-4 border-b border-[#0d0d0d] last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-white text-sm font-medium">{c.concepto}</p>
                      <p className="text-gray-500 text-xs">{c.tipoAcreedor} · Vence: {fmtDate(c.fechaCompromiso)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-semibold">{fmt(c.monto)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.estado === "LIQUIDADO" ? "bg-green-900/50 text-green-300" :
                        c.estado === "VENCIDO" ? "bg-red-900/50 text-red-300" :
                        "bg-yellow-900/30 text-yellow-400"
                      }`}>{c.estado}</span>
                    </div>
                  </div>
                  {c.estado !== "LIQUIDADO" && (
                    pagando === c.id ? (
                      <div className="flex gap-2 mt-2">
                        <input type="number" value={montoPago} onChange={e => setMontoPago(e.target.value)}
                          placeholder={String(c.monto)} className="w-32 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                        <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                          className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none" />
                        <button onClick={() => registrarPagoCxP(c.id)}
                          className="bg-red-800 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1 rounded transition-colors">
                          Confirmar pago
                        </button>
                        <button onClick={() => setPagando(null)} className="text-gray-500 text-xs hover:text-white">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => { setPagando(c.id); setMontoPago(String(c.monto)); }}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1 rounded-lg transition-colors">
                        + Registrar pago
                      </button>
                    )
                  )}
                </div>
              ))
            )}
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
              <div className="bg-[#111] border border-[#222] rounded-xl p-5 grid grid-cols-4 gap-4 text-center">
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
        </div>
        );
      })()}

      {/* ────── TAB: GASTOS OPERATIVOS ────── */}
      {tab === "gastos" && (() => {
        const fmt2 = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
        const TIPO_LABELS: Record<string, string> = { COMIDA: "Comida", TRANSPORTE: "Transporte", HOSPEDAJE: "Hospedaje", OTRO: "Otro" };
        const TIPO_COLORS: Record<string, string> = {
          COMIDA: "bg-orange-900/30 text-orange-300",
          TRANSPORTE: "bg-blue-900/30 text-blue-300",
          HOSPEDAJE: "bg-purple-900/30 text-purple-300",
          OTRO: "bg-gray-800 text-gray-400",
        };

        async function reloadGastos() {
          const r = await fetch(`/api/proyectos/gastos-operativos?proyectoId=${id}`);
          const d = await r.json();
          setGastosOp(d.gastos ?? []);
        }

        async function agregarGasto() {
          if (!gastoOpForm.concepto || !gastoOpForm.monto) return;
          await fetch("/api/proyectos/gastos-operativos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proyectoId: id, ...gastoOpForm, monto: parseFloat(gastoOpForm.monto), cantidad: parseInt(gastoOpForm.cantidad) }),
          });
          setGastoOpForm({ tipo: "COMIDA", concepto: "", monto: "", cantidad: "1", notas: "" });
          setShowGastoOpForm(false);
          await reloadGastos();
        }

        async function toggleGasto(g: GastoOp) {
          setTogglingGasto(g.id);
          await fetch("/api/proyectos/gastos-operativos", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: g.id, entregado: !g.entregado }),
          });
          await reloadGastos();
          setTogglingGasto(null);
        }

        async function eliminarGasto(g: GastoOp) {
          await fetch("/api/proyectos/gastos-operativos", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: g.id }),
          });
          await reloadGastos();
        }

        const pendientes  = gastosOp.filter(g => !g.entregado);
        const entregados  = gastosOp.filter(g =>  g.entregado);
        const totalPendiente = pendientes.reduce((s, g) => s + g.monto * g.cantidad, 0);
        const totalTotal     = gastosOp.reduce((s, g) => s + g.monto * g.cantidad, 0);

        return (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 text-center">
                <p className="text-white text-lg font-bold">{gastosOp.length}</p>
                <p className="text-gray-500 text-xs mt-0.5">Total gastos</p>
              </div>
              <div className="bg-[#111] border border-yellow-900/30 rounded-xl p-4 text-center">
                <p className="text-yellow-300 text-lg font-bold">{fmt2(totalPendiente)}</p>
                <p className="text-gray-500 text-xs mt-0.5">Por entregar</p>
              </div>
              <div className="bg-[#111] border border-green-900/30 rounded-xl p-4 text-center">
                <p className="text-green-400 text-lg font-bold">{fmt2(totalTotal - totalPendiente)}</p>
                <p className="text-gray-500 text-xs mt-0.5">Entregado</p>
              </div>
            </div>

            {/* Botón agregar */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-4">
              <button onClick={() => setShowGastoOpForm(v => !v)}
                className="text-sm text-[#B3985B] hover:text-white transition-colors font-medium">
                {showGastoOpForm ? "− Cancelar" : "+ Agregar gasto operativo"}
              </button>
              {showGastoOpForm && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Tipo</label>
                    <select value={gastoOpForm.tipo} onChange={e => setGastoOpForm(p => ({ ...p, tipo: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                      <option value="COMIDA">Comida</option>
                      <option value="TRANSPORTE">Transporte</option>
                      <option value="HOSPEDAJE">Hospedaje</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-xs text-gray-500 block mb-1">Concepto *</label>
                    <input value={gastoOpForm.concepto} onChange={e => setGastoOpForm(p => ({ ...p, concepto: e.target.value }))}
                      placeholder="Ej: Cenas crew (8 personas)"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Monto ($) *</label>
                    <input type="number" value={gastoOpForm.monto} onChange={e => setGastoOpForm(p => ({ ...p, monto: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Cantidad</label>
                    <input type="number" min="1" value={gastoOpForm.cantidad} onChange={e => setGastoOpForm(p => ({ ...p, cantidad: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <label className="text-xs text-gray-500 block mb-1">Notas</label>
                    <input value={gastoOpForm.notas} onChange={e => setGastoOpForm(p => ({ ...p, notas: e.target.value }))}
                      placeholder="Opcional"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={agregarGasto} disabled={!gastoOpForm.concepto || !gastoOpForm.monto}
                      className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                      Agregar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lista pendientes */}
            {pendientes.length > 0 && (
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#1e1e1e] flex items-center justify-between">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Por entregar</p>
                  <p className="text-xs text-gray-500">Total: {fmt2(totalPendiente)}</p>
                </div>
                {pendientes.map(g => (
                  <div key={g.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] last:border-0 hover:bg-[#0d0d0d] transition-colors">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${TIPO_COLORS[g.tipo] ?? TIPO_COLORS.OTRO}`}>
                      {TIPO_LABELS[g.tipo] ?? g.tipo}
                    </span>
                    <p className="flex-1 text-white/80 text-sm">{g.concepto}</p>
                    {g.cantidad > 1 && <span className="text-gray-600 text-xs shrink-0">×{g.cantidad}</span>}
                    <p className="text-white text-sm font-medium w-20 text-right shrink-0">{fmt2(g.monto * g.cantidad)}</p>
                    <button onClick={() => toggleGasto(g)} disabled={togglingGasto === g.id}
                      className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        togglingGasto === g.id ? "opacity-50 cursor-wait border-[#333] text-gray-500" :
                        "border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B] hover:text-black hover:border-[#B3985B]"
                      }`}>
                      Entregar
                    </button>
                    <button onClick={() => eliminarGasto(g)} className="text-gray-700 hover:text-red-400 text-xs transition-colors shrink-0">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Lista entregados */}
            {entregados.length > 0 && (
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden opacity-60">
                <div className="px-4 py-2.5 border-b border-[#1a1a1a]">
                  <p className="text-xs text-green-500 font-semibold uppercase tracking-wider">Entregados</p>
                </div>
                {entregados.map(g => (
                  <div key={g.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] last:border-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${TIPO_COLORS[g.tipo] ?? TIPO_COLORS.OTRO}`}>
                      {TIPO_LABELS[g.tipo] ?? g.tipo}
                    </span>
                    <p className="flex-1 text-white/50 text-sm">{g.concepto}</p>
                    <p className="text-gray-600 text-sm w-20 text-right shrink-0">{fmt2(g.monto * g.cantidad)}</p>
                    <button onClick={() => toggleGasto(g)} className="text-gray-600 text-xs hover:text-white transition-colors shrink-0 px-2">
                      Deshacer
                    </button>
                  </div>
                ))}
              </div>
            )}

            {gastosOp.length === 0 && (
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-12 text-center">
                <p className="text-gray-600 text-sm">Sin gastos operativos registrados</p>
                <p className="text-gray-700 text-xs mt-1">Agrega comidas, transportes y hospedaje para que administración prepare el efectivo</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ────── TAB: BITÁCORA ────── */}
      {tab === "bitacora" && (
        <div className="space-y-3">
          {/* Agregar nota */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <textarea value={notaBitacora} onChange={e => setNotaBitacora(e.target.value)}
              rows={3} placeholder="Escribe una nota, cambio o acción importante..."
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
        const CRITERIOS: { key: keyof EvalData; label: string; desc: string }[] = [
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
