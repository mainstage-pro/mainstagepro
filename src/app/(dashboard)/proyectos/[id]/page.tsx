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
  tecnico: { id: string; nombre: string; rol: { nombre: string } | null } | null;
  rolTecnico: { nombre: string } | null;
}
interface CatFinanciera { id: string; nombre: string; tipo: string }
interface Proveedor { id: string; nombre: string }
interface CheckItem { id: string; item: string; completado: boolean; orden: number }
interface Archivo { id: string; tipo: string; nombre: string; url: string; createdAt: string }
interface CxC { id: string; concepto: string; tipoPago: string; monto: number; montoCobrado: number; estado: string; fechaCompromiso: string }
interface CxP { id: string; concepto: string; monto: number; estado: string; fechaCompromiso: string; tipoAcreedor: string }
interface Bitacora { id: string; tipo: string; contenido: string; createdAt: string; usuario: { name: string } | null }
interface Gasto { id: string; fecha: string; concepto: string; monto: number; metodoPago: string; notas: string | null; referencia: string | null; categoria: { nombre: string } | null; proveedor: { nombre: string } | null }
interface ProyectoEquipoItem { id: string; tipo: string; cantidad: number; dias: number; costoExterno: number | null; confirmado: boolean; equipo: { descripcion: string; marca: string | null; categoria: { nombre: string } }; proveedor: { nombre: string } | null }
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
  cronograma: string | null; contactosEmergencia: string | null; comentariosFinales: string | null;
  scoreFotoVideo: number | null; recomendacionFotoVideo: string | null;
  cliente: { id: string; nombre: string; empresa: string | null; telefono: string | null; correo: string | null };
  encargado: { name: string } | null;
  trato: { tipoEvento: string; tipoServicio: string | null; responsable: { name: string } | null } | null;
  cotizacion: { id: string; numeroCotizacion: string; granTotal: number } | null;
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
  const [tab, setTab] = useState<"info" | "personal" | "equipos" | "checklist" | "finanzas" | "bitacora" | "evaluacion">("info");

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
    setProyecto(prev => prev ? { ...prev, [field]: value || null } : prev);
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

  const checkTotal = proyecto.checklist.length;
  const checkDone = proyecto.checklist.filter(c => c.completado).length;
  const checkPct = checkTotal > 0 ? (checkDone / checkTotal) * 100 : 0;
  const personalConfirmado = proyecto.personal.filter(p => p.confirmado).length;
  const diasRestantes = Math.ceil((new Date(proyecto.fechaEvento).getTime() - Date.now()) / 86400000);
  const totalCxC = proyecto.cuentasCobrar.reduce((s, c) => s + c.monto, 0);
  const cobrado = proyecto.cuentasCobrar.reduce((s, c) => s + c.montoCobrado, 0);

  return (
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
        {(["info", "personal", "equipos", "checklist", "finanzas", "bitacora", "evaluacion"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
              tab === t ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"
            }`}>
            {t === "info" ? "Info" : t === "personal" ? "Personal" : t === "equipos" ? "Equipos" : t === "checklist" ? "Checklist" : t === "finanzas" ? "Finanzas" : t === "bitacora" ? "Bitácora" : "Eval."}
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

            <div>
              <Campo label="Proveedor de catering / alimentación producción" value={proyecto.proveedorCatering} field="proveedorCatering" onSave={guardarCampo} />
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
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleConfirmadoEquipo(eq.id, eq.confirmado)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${eq.confirmado ? "bg-green-900/50 text-green-300 hover:bg-green-900/70" : "bg-[#222] text-gray-500 hover:bg-[#2a2a2a] hover:text-white"}`}>
                  {eq.confirmado ? "Confirmado" : "Confirmar"}
                </button>
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
                    <option value="CORTA">Corta (0–8h)</option>
                    <option value="MEDIA">Media (8–12h)</option>
                    <option value="LARGA">Larga (12h+)</option>
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
                          <div className="flex items-center gap-3 shrink-0">
                            {p.tarifaAcordada != null && (
                              <span className="text-gray-300 text-sm">{fmt(p.tarifaAcordada)}</span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.estadoPago === "PAGADO" ? "bg-green-900/50 text-green-300" : "bg-yellow-900/30 text-yellow-400"
                            }`}>
                              {p.estadoPago === "PAGADO" ? "Pagado" : "Pend."}
                            </span>
                            <button onClick={() => toggleConfirmar(p.id, p.confirmado)}
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                                p.confirmado
                                  ? "border-green-700 text-green-400 hover:bg-red-900/20 hover:text-red-400 hover:border-red-700"
                                  : "border-[#333] text-gray-500 hover:border-green-700 hover:text-green-400"
                              }`}>
                              {p.confirmado ? "✓ Confirmado" : "Confirmar"}
                            </button>
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
        <div className="space-y-3">
          {/* Agregar item */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 flex gap-2">
            <input value={nuevoItem} onChange={e => setNuevoItem(e.target.value)}
              onKeyDown={e => e.key === "Enter" && agregarItem()}
              placeholder="Agregar nuevo item al checklist..."
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
            <button onClick={agregarItem} disabled={addingItem || !nuevoItem.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              + Agregar
            </button>
          </div>

          {/* Lista */}
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Items ({checkDone}/{checkTotal})</span>
              <div className="w-24 h-1.5 bg-[#222] rounded-full overflow-hidden">
                <div className="h-full bg-[#B3985B] rounded-full" style={{ width: `${checkPct}%` }} />
              </div>
            </div>
            {proyecto.checklist.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Sin items en el checklist</p>
            ) : (
              proyecto.checklist.map(c => (
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
  );
}
