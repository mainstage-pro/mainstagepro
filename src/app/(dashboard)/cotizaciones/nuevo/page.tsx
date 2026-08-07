"use client";

import React, { useEffect, useState, useMemo, Suspense, useRef } from "react";
import { useConfirm } from "@/components/Confirm";
import { useRouter, useSearchParams } from "next/navigation";
import { calcularDescuentoVolumen, calcularDescuentoMultidia, formatCurrency, formatPct } from "@/lib/cotizador";
import { DESCUENTO_B2B, IVA, VIABILIDAD, JORNADA_LABELS } from "@/lib/constants";
import { getSugerenciasTecnicos } from "@/lib/sugerencias-tecnicos";
import { diasEvento } from "@/lib/fechas-evento";
import VenuePicker from "@/components/ui/VenuePicker";
import NumSelect from "@/components/ui/NumSelect";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { ClipboardList, Sparkles, Package, SlidersHorizontal, AlertTriangle, Ban, Utensils, Bus, BedDouble, File, FileText, BarChart3, Paperclip, type LucideIcon } from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Equipo {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  tipo: string; // PROPIO | EXTERNO
  precioRenta: number;
  costoProveedor: number | null;
  cantidadTotal: number;
  proveedorDefaultId: string | null;
  categoria: { id: string; nombre: string; orden: number };
  proveedoresPrecios: { precio: number; proveedor: { id: string; nombre: string; empresa: string | null; prioridad: number } }[];
}

interface LineaOcasional {
  id: string;
  descripcion: string;
  cantidad: number;
  dias: number;
  precioUnitario: number;
  subtotal: number;
}

interface RolTecnico {
  id: string;
  nombre: string;
  tipoPago: string;
  tarifaAAACorta: number | null; tarifaAAAMedia: number | null; tarifaAAALarga: number | null;
  tarifaAACorta: number | null;  tarifaAAMedia: number | null;  tarifaAALarga: number | null;
  tarifaACorta: number | null;   tarifaAMedia: number | null;   tarifaALarga: number | null;
  tarifaPlanaAAA: number | null; tarifaPlanaAA: number | null;  tarifaPlanaA: number | null;
  tarifaHoraAAA: number | null;  tarifaHoraAA: number | null;   tarifaHoraA: number | null;
}

interface LineaEquipo {
  id: string; equipoId: string; descripcion: string; marca: string; modelo: string;
  cantidad: number; dias: number; precioUnitario: number; subtotal: number;
  categoria: string; // nombre de la categoría para subsecciones
  notas: string;     // nota libre por concepto
}

// Paquete/producto armado agregado como UN concepto (no expandido en equipos sueltos).
// `componentes` = equipos que lo integran por 1 unidad de paquete → se usan para contar
// disponibilidad de inventario y al convertir a proyecto, sin aparecer como líneas sueltas.
interface LineaPaquete {
  id: string; productoId: string; nombre: string;
  cantidad: number; dias: number; precioUnitario: number; subtotal: number;
  componentes: { equipoId: string; cantidad: number }[];
  categoria: string;
}

// ─── Helpers de codificación notas ────────────────────────────────────────────
// Formato en DB: "cat:XXX" | "cat:XXX|nota:YYY" | null
function extractUserNote(raw: string | null | undefined): string {
  if (!raw) return "";
  const part = raw.split("|").find(p => p.startsWith("nota:"));
  return part ? part.slice(5) : "";
}
function buildNotasValue(categoria: string, nota: string): string | null {
  const c = categoria ? `cat:${categoria}` : "";
  const n = nota.trim() ? `nota:${nota.trim()}` : "";
  if (c && n) return `${c}|${n}`;
  if (c) return c;
  if (n) return n;
  return null;
}

interface LineaExterno {
  id: string; equipoId: string; descripcion: string; marca: string;
  cantidad: number; dias: number;
  precioUnitario: number; // precio al cliente
  costoProveedor: number;  // costo que nos cobra el proveedor
  subtotal: number;        // precioUnitario × cantidad × días
  costoTotal: number;      // costoProveedor × cantidad × días (para viabilidad)
  proveedorId: string | null; // proveedor por defecto del equipo → se transfiere al proyecto
  categoria: string;       // categoría del equipo (para integrarlo a su sección en el PDF)
}

interface LineaOp {
  id: string; rolTecnicoId: string; descripcion: string;
  nivel: string; jornada: string; cantidad: number; dias: number;
  precioUnitario: number; subtotal: number;
}

interface LineaDJ {
  id: string; nivel: string; horas: number; tarifa: number; subtotal: number;
}

interface LineaLogistica {
  id: string; tipo: "COMIDA" | "TRANSPORTE" | "HOSPEDAJE";
  concepto: string; precioUnitario: number; cantidad: number; dias: number; subtotal: number;
}

// Paquete comercial del catálogo (incluye equipos, productos armados y conceptos operativos).
// Al agregarlo desde el descubrimiento se DESGLOSA en líneas individuales de la cotización.
interface PaqueteCat {
  id: string;
  nombre: string;
  tipoEvento: string;
  rangoPersonas: string | null;
  resumen: string | null;
  imagenes: { url: string }[];
  items: {
    cantidad: number;
    tipo: string; // EQUIPO | PRODUCTO
    equipo: { id: string; descripcion: string; marca: string | null; modelo: string | null; precioRenta: number; categoria: { id: string; nombre: string } | null } | null;
    producto: { id: string; nombre: string; categoria: string | null; precioFinal: number; items: { cantidad: number; equipo: { id: string; descripcion: string; marca: string | null; modelo: string | null } }[] } | null;
  }[];
  conceptos: {
    tipo: string; // OPERACION_TECNICA | TRANSPORTE | HOSPEDAJE | COMIDA | OTRO
    descripcion: string;
    rolTecnicoId: string | null;
    rolTecnico: { id: string; nombre: string } | null;
    nivel: string | null;
    jornada: string | null;
    cantidad: number;
    dias: number;
    precioUnitario: number;
  }[];
}

interface JornadaSlot {
  id: string;
  rolId: string;
  rolNombre: string;
  cantidad: number;
  nivel: string;    // AAA | AA | A
  jornada: string;  // CORTA | MEDIA | LARGA
  tarifa: number;
}

interface Jornada {
  id: string;
  fecha: string;   // YYYY-MM-DD
  tipo: string;    // MONTAJE | OPERACION | DESMONTAJE | OTRO
  slots: JornadaSlot[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CONCEPTOS_COMIDA = [
  { label: "1 comida por persona", precio: 150 },
  { label: "2 comidas por persona", precio: 300 },
  { label: "3 comidas por persona", precio: 450 },
];
const CONCEPTOS_TRANSPORTE = [
  { label: "Gasolina (corta)", precio: 250 },
  { label: "Gasolina (media)", precio: 500 },
  { label: "Gasolina (larga)", precio: 1000 },
  { label: "Gasolina (foránea)", precio: 1500 },
  { label: "Gasolina (muy foránea)", precio: 2000 },
  { label: "Casetas", precio: 0 },
  { label: "Otros gastos", precio: 0 },
];
const CONCEPTOS_HOSPEDAJE = [
  { label: "Habitación doble", precio: 1200 },
  { label: "Habitación sencilla", precio: 1500 },
  { label: "Viáticos por elemento", precio: 500 },
];

function uid() { return Math.random().toString(36).slice(2); }

function getRolTarifa(rol: RolTecnico, nivel: string, jornada: string): number {
  if (rol.tipoPago === "TARIFA_PLANA" || rol.tipoPago === "POR_PROYECTO") {
    const key = `tarifaPlana${nivel}` as keyof RolTecnico;
    return (rol[key] as number | null) ?? 0;
  }
  if (rol.tipoPago === "POR_HORA") {
    const key = `tarifaHora${nivel}` as keyof RolTecnico;
    return (rol[key] as number | null) ?? 0;
  }
  // POR_JORNADA: tarifa por nivel + tipo de jornada
  const j = jornada.charAt(0) + jornada.slice(1).toLowerCase();
  const key = `tarifa${nivel}${j}` as keyof RolTecnico;
  return (rol[key] as number | null) ?? 0;
}

const SEMAFORO_STYLE: Record<string, { border: string; text: string; bg: string; label: string }> = {
  IDEAL:    { border: "border-green-500",  text: "text-green-400",  bg: "bg-green-900/20",  label: "IDEAL" },
  REGULAR:  { border: "border-yellow-500", text: "text-yellow-400", bg: "bg-yellow-900/20", label: "REGULAR" },
  MINIMO:   { border: "border-orange-500", text: "text-orange-400", bg: "bg-orange-900/20", label: "MÍNIMO" },
  RIESGO:   { border: "border-[#333]",    text: "text-gray-400",    bg: "bg-[#0f0f0f]",    label: "Riesgo" },
};

// ─── Subcomponente de sección ─────────────────────────────────────────────────
function Seccion({ titulo, children, hint }: { titulo: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="ms-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">{titulo}</h2>
        {hint && <span className="text-gray-600 text-xs">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Nota por concepto de equipo propio ───────────────────────────────────────
function ConceptoNotaEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-4 pb-2">
      {!open && !value && (
        <button
          onClick={() => setOpen(true)}
          className="text-[10px] text-[#444] hover:text-[#B3985B] transition-colors"
        >
          + nota de montaje
        </button>
      )}
      {(open || value) && (
        <input
          autoFocus={open && !value}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={() => { if (!value) setOpen(false); }}
          placeholder="Nota de montaje / particularidades..."
          className="w-full bg-transparent text-xs text-[#6b7280] placeholder-[#333] border-b border-[#1e1e1e] focus:border-[#B3985B]/40 focus:outline-none focus:text-white transition-colors py-0.5"
        />
      )}
    </div>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        {...props}
        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
      />
    </div>
  );
}


// ─── Componente principal ─────────────────────────────────────────────────────
function CotizadorForm() {
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tratoId = searchParams.get("tratoId") ?? "";
  const clienteId = searchParams.get("clienteId") ?? "";
  const editId = searchParams.get("editId") ?? ""; // ID de cotización existente (modo edición)

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [roles, setRoles] = useState<RolTecnico[]>([]);
  const [tipoCliente, setTipoCliente] = useState("POR_DESCUBRIR");
  const [clienteNombre, setClienteNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // IDs resueltos (para modo edición)
  const [resolvedTratoId, setResolvedTratoId] = useState(tratoId);
  const [resolvedClienteId, setResolvedClienteId] = useState(clienteId);

  // ── Selector manual de cliente (cuando no vienen params en URL) ──
  const noParams = !tratoId && !clienteId && !editId;
  const [manualClienteId, setManualClienteId] = useState("");
  const [manualClienteNombre, setManualClienteNombre] = useState("");
  const [manualClienteQuery, setManualClienteQuery] = useState("");
  const [manualClienteResults, setManualClienteResults] = useState<{id:string;nombre:string;empresa:string|null}[]>([]);
  const [manualClienteOpen, setManualClienteOpen] = useState(false);
  const [manualTratoId, setManualTratoId] = useState("");
  const [manualTratos, setManualTratos] = useState<{id:string;tipoEvento:string|null;nombreEvento:string|null}[]>([]);
  const [clienteSelectorError, setClienteSelectorError] = useState(false);

  // Briefing del trato (solo lectura en cotizador)
  const [tratoNotas, setTratoNotas] = useState<string | null>(null);
  const [tratoArchivos, setTratoArchivos] = useState<Array<{ id: string; nombre: string; url: string; tipo: string }>>([]);
  const [tratoFormEstado, setTratoFormEstado] = useState<string | null>(null);
  // Equipos/categorías seleccionados en el descubrimiento del trato: { categorias: CategoriaEquipo IDs, equipos: Equipo IDs }
  // `extras` = equipos escritos a mano en el descubrimiento (no existen en inventario);
  // se agregan como conceptos ocasionales con precio editable.
  const [equiposInteres, setEquiposInteres] = useState<{ categorias: string[]; equipos: string[]; cantidades: Record<string, number>; extras: { id: string; nombre: string; categoria?: string; cantidad?: number }[]; productos: { id: string; cantidad?: number }[]; paquetes: { id: string; cantidad?: number }[] }>({ categorias: [], equipos: [], cantidades: {}, extras: [], productos: [], paquetes: [] });
  // Precio capturado por cada extra antes de agregarlo, y los extras ya agregados.
  const [extrasPrecios, setExtrasPrecios] = useState<Record<string, string>>({});
  const [extrasAgregados, setExtrasAgregados] = useState<string[]>([]);
  // Catálogo de paquetes/productos (para expandir en líneas de equipo al agregarlos).
  const [productosCatalogo, setProductosCatalogo] = useState<Array<{ id: string; nombre: string; categoria: string | null; precioFinal: number; items: { cantidad: number; equipo: { id: string; descripcion: string; marca: string | null; modelo: string | null; precioRenta: number } }[] }>>([]);
  const [paquetesAgregados, setPaquetesAgregados] = useState<string[]>([]);
  // Catálogo de paquetes comerciales (para desglosar en líneas al agregarlos desde el descubrimiento).
  const [paquetesCatalogo, setPaquetesCatalogo] = useState<PaqueteCat[]>([]);
  const [paquetesExpandidos, setPaquetesExpandidos] = useState<string[]>([]);
  // Precios especiales del cliente: { equipoId → precio }
  const [preciosCliente, setPreciosCliente] = useState<Record<string, number>>({});
  // Precio original de lista al momento de registrar el especial: { equipoId → precioOriginal }
  const [preciosClienteOriginal, setPreciosClienteOriginal] = useState<Record<string, number | null>>({});
  const [guardandoPrecio, setGuardandoPrecio] = useState<string | null>(null);
  const [asistentesEstimados, setAsistentesEstimados] = useState<number | null>(null);
  // Plantillas
  const [plantillas, setPlantillas] = useState<{ id: string; nombre: string; tipoEvento: string | null; lineas: unknown[] }[]>([]);
  const [showPlantillas, setShowPlantillas] = useState(false);
  const [cargandoPlantilla, setCargandoPlantilla] = useState(false);
  const [evento, setEvento] = useState({
    nombreEvento: "",
    tipoEvento: "MUSICAL",
    tipoServicio: "",
    fechaEvento: "",
    lugarEvento: "",
    horasOperacion: "8",
    diasEquipo: "1",
    diasOperacion: "1",
  });

  // Líneas
  const [lineasEquipo, setLineasEquipo] = useState<LineaEquipo[]>([]);
  const [lineasPaquete, setLineasPaquete] = useState<LineaPaquete[]>([]);
  const [lineasExterno, setLineasExterno] = useState<LineaExterno[]>([]);
  const [lineasOp, setLineasOp] = useState<LineaOp[]>([]);
  const [lineasDJ, setLineasDJ] = useState<LineaDJ[]>([]);
  const [lineasLog, setLineasLog] = useState<LineaLogistica[]>([]);

  // Notas por categoría de equipo
  const [notasSecciones, setNotasSecciones] = useState<Record<string, string>>({});

  // Selectores rápidos

  const [selEq, setSelEq] = useState(""); const [selEqCant, setSelEqCant] = useState("1"); const [selEqDias, setSelEqDias] = useState("1");
  // Caja de "Equipos propios": pestaña individual (default) vs. catálogo de paquetes
  const [equipoTab, setEquipoTab] = useState<"individual" | "paquete">("individual");
  const [selPaq, setSelPaq] = useState(""); const [selPaqCant, setSelPaqCant] = useState("1");
  const [selExt, setSelExt] = useState(""); const [selExtCant, setSelExtCant] = useState("1"); const [selExtDias, setSelExtDias] = useState("1");
  const [selRol, setSelRol] = useState(""); const [selRolJornada, setSelRolJornada] = useState("CORTA"); const [selRolCant, setSelRolCant] = useState("1"); const [selRolNivel, setSelRolNivel] = useState("AAA");
  const [selDJHoras, setSelDJHoras] = useState("4"); const [selDJNivel, setSelDJNivel] = useState("AAA"); const [selDJTarifa, setSelDJTarifa] = useState("");
  const [logConcepto, setLogConcepto] = useState({ COMIDA: CONCEPTOS_COMIDA[0].label, TRANSPORTE: CONCEPTOS_TRANSPORTE[0].label, HOSPEDAJE: CONCEPTOS_HOSPEDAJE[0].label });
  const [logPrecio, setLogPrecio] = useState({ COMIDA: String(CONCEPTOS_COMIDA[0].precio), TRANSPORTE: String(CONCEPTOS_TRANSPORTE[0].precio), HOSPEDAJE: String(CONCEPTOS_HOSPEDAJE[0].precio) });
  const [logCant, setLogCant] = useState({ COMIDA: "1", TRANSPORTE: "1", HOSPEDAJE: "1" });
  const [logDias, setLogDias] = useState({ COMIDA: "1", TRANSPORTE: "1", HOSPEDAJE: "1" });

  // Proveedores para selector en modal nuevo equipo
  const [proveedores, setProveedores] = useState<Array<{ id: string; nombre: string; telefono: string | null }>>([]);
  const [showConfirmDisp, setShowConfirmDisp] = useState(false);

  // ── Déficit de stock propio ──
  const [deficitInfo, setDeficitInfo] = useState<{
    equipoId: string; lineaId: string; stockPropio: number; deficit: number;
  } | null>(null);
  const [deficitProveedores, setDeficitProveedores] = useState<{ precio: number; proveedor: { id: string; nombre: string; empresa: string | null; prioridad: number } }[]>([]);
  const [deficitProveedorId, setDeficitProveedorId] = useState('');
  const [deficitProveedorTexto, setDeficitProveedorTexto] = useState('');

  // Nuevos: modal nuevo equipo proveedor + adicionales
  const [showNuevoEqModal, setShowNuevoEqModal] = useState(false);
  const [nuevoEqForm, setNuevoEqForm] = useState({ descripcion: "", marca: "", categoriaId: "", precioRenta: "", costoProveedor: "", cantidadTotal: "1", proveedorId: "" });
  const [guardandoEq, setGuardandoEq] = useState(false);
  const [showNuevoEqPropioModal, setShowNuevoEqPropioModal] = useState(false);
  const [nuevoEqPropioForm, setNuevoEqPropioForm] = useState({ tipo: "PROPIO", marca: "", modelo: "", descripcion: "", precioRenta: "", categoriaId: "", costoProveedor: "", proveedorId: "", cantidadTotal: "1" });
  const [nuevoEqPropioDescEditado, setNuevoEqPropioDescEditado] = useState(false);
  const [guardandoEqPropio, setGuardandoEqPropio] = useState(false);
  const [lineasOcasional, setLineasOcasional] = useState<LineaOcasional[]>([]);
  const [jornadasPlan, setJornadasPlan] = useState<Jornada[]>([]);
  // Selector pendiente por jornada (antes de hacer clic en Agregar)
  const [pendingSlots, setPendingSlots] = useState<Record<string, { rolId: string; nivel: string; jornada: string; cantidad: string }>>({});
  const [zonaEvento, setZonaEvento] = useState<"LOCAL"|"BAJIO"|"NACIONAL">("LOCAL");
  const [numTecnicosZona, setNumTecnicosZona] = useState(0);
  const [selOcDesc, setSelOcDesc] = useState("");
  const [selOcPrecio, setSelOcPrecio] = useState("");
  const [selOcCant, setSelOcCant] = useState("1");
  const [selOcDias, setSelOcDias] = useState("1");
  // Comisión interna / Gastos de producción
  const [gastosActivo, setGastosActivo] = useState(false);
  const [gastosEsMonto, setGastosEsMonto] = useState(false); // false=%, true=$
  const [gastosValor, setGastosValor] = useState("10"); // default 10%

  // ─── Descuentos ───────────────────────────────────────────────────────────────
  const [volumenActivo, setVolumenActivo]         = useState(false);
  // Guard: inicializar en true si ya estamos en modo edición, para bloquear
  // los auto-efectos desde el primer render (antes de que cargue la Promise).
  const [volumenManualToggle, setVolumenManualToggle] = useState(() => Boolean(editId));
  const [b2bActivo, setB2bActivo]                 = useState(false);
  const [b2bManualToggle, setB2bManualToggle]     = useState(() => Boolean(editId));
  const [manualActivo, setManualActivo]           = useState(false);
  const [manualEsMonto, setManualEsMonto]         = useState(false); // false=%, true=$
  const [manualValor, setManualValor]             = useState("");
  const [manualRazon, setManualRazon]             = useState("");
  const [pagoAnticipadoActivo, setPagoAnticipadoActivo] = useState(false);
  const [pagoAnticipadoFecha, setPagoAnticipadoFecha]   = useState("");
  const [pagoAnticipadoTexto, setPagoAnticipadoTexto]   = useState("");
  // Config de descuentos (cargados del servidor)
  const [cfgUmbralVolumen, setCfgUmbralVolumen]   = useState(30000);
  const [cfgPctVolumen, setCfgPctVolumen]         = useState(10);
  const [cfgPctB2b, setCfgPctB2b]               = useState(10);
  const [cfgPctAnticipado, setCfgPctAnticipado]   = useState(10);
  const [cfgMaxManual, setCfgMaxManual]           = useState(30);
  const [cfgTextoAnticipado, setCfgTextoAnticipado] = useState("Si realizas el pago total del servicio antes de la fecha límite, aplicamos un descuento adicional del {pct}% sobre equipos Mainstage.");
  // Descuentos preservados de cotizaciones antiguas (sin control de UI)
  const [dMultidiaPreservado, setDMultidiaPreservado] = useState(0);
  const [dEspecialPreservado, setDEspecialPreservado] = useState(0);
  const [dPatrocinioPreservado, setDPatrocinioPreservado] = useState(0);
  const [dEspecialNotaPreservada, setDEspecialNotaPreservada] = useState<string | null>(null);
  const [dPatrocinioNotaPreservada, setDPatrocinioNotaPreservada] = useState<string | null>(null);
  const [dFijoPreservado, setDFijoPreservado]     = useState(0); // desc fijo $ legacy
  const [aplicaIva, setAplicaIva] = useState(false);
  const [incluirChofer, setIncluirChofer] = useState(false);
  const [observaciones, setObservaciones] = useState("");

  // ── Auto-save (solo modo edición) ──
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  // Prevent saving on first render (before data is loaded from server)
  const isInitialized = useRef(false);

  // Disponibilidad de inventario para la fecha del evento
  const [dispMap, setDispMap] = useState<Record<string, { disponible: number; comprometido: number; total: number; eventos: Array<{ ref: string; nombre: string; estado: string }> }>>({});
  const [loadingDisp, setLoadingDisp] = useState(false);

  // Cargar datos (modo nuevo O modo edición)
  useEffect(() => {
    fetch("/api/plantillas-cotizacion").then(r => r.json()).then(d => setPlantillas(d.plantillas ?? [])).catch(() => {});
    fetch("/api/productos/publico").then(r => r.json()).then(d => setProductosCatalogo(d.productos ?? [])).catch(() => {});
    fetch("/api/paquetes/publico").then(r => r.json()).then(d => setPaquetesCatalogo(d.paquetes ?? [])).catch(() => {});
    Promise.all([
      fetch("/api/equipos").then(r => r.json()),
      fetch("/api/roles-tecnicos").then(r => r.json()),
      clienteId ? fetch(`/api/clientes/${clienteId}`).then(r => r.json()) : Promise.resolve(null),
      tratoId ? fetch(`/api/tratos/${tratoId}`).then(r => r.json()) : Promise.resolve(null),
      editId ? fetch(`/api/cotizaciones/${editId}`).then(r => r.json()) : Promise.resolve(null),
      clienteId ? fetch(`/api/clientes/${clienteId}/precios-equipos`).then(r => r.json()) : Promise.resolve(null),
      fetch("/api/proveedores").then(r => r.json()),
      fetch("/api/admin/config").then(r => r.json()),
    ]).then(([eq, rol, cl, tr, editData, preciosData, provData, configData]) => {
      const eqs: Equipo[] = eq.equipos ?? [];
      setEquipos(eqs);
      setRoles(rol.roles ?? []);
      setProveedores(provData?.proveedores ?? []);
      // Cargar configuración de descuentos
      if (configData?.entries) {
        const cfg = configData.entries as Array<{key: string; value: string}>;
        const get = (k: string, def: number) => {
          const found = cfg.find((c: {key: string; value: string}) => c.key === k);
          return found ? parseFloat(found.value) || def : def;
        };
        const getStr = (k: string, def: string) => cfg.find((c: {key: string; value: string}) => c.key === k)?.value ?? def;
        setCfgUmbralVolumen(get("descuentos.umbralVolumen", 30000));
        setCfgPctVolumen(get("descuentos.pctVolumen", 10));
        setCfgPctB2b(get("descuentos.pctB2b", 10));
        setCfgPctAnticipado(get("descuentos.pctPagoAnticipado", 5));
        setCfgMaxManual(get("descuentos.maxManual", 30));
        setCfgTextoAnticipado(getStr("descuentos.textoPagoAnticipado", "Si realizas el pago total del servicio antes de la fecha límite, aplicamos un descuento adicional del {pct}% sobre equipos Mainstage."));
      }

      // Cargar precios especiales del cliente
      if (preciosData?.precios) {
        const mapa: Record<string, number> = {};
        const mapaOrig: Record<string, number | null> = {};
        for (const [eqId, v] of Object.entries(preciosData.precios as Record<string, { precio: number; precioOriginal: number | null }>)) {
          mapa[eqId] = v.precio;
          mapaOrig[eqId] = v.precioOriginal ?? null;
        }
        setPreciosCliente(mapa);
        setPreciosClienteOriginal(mapaOrig);
      }

      // Modo edición: cargar cotización existente
      if (editData?.cotizacion) {
        const cot = editData.cotizacion;
        setResolvedTratoId(cot.tratoId);
        setResolvedClienteId(cot.clienteId);
        // Cargar precios del cliente en modo edición (si no vinieron por clienteId param)
        if (!preciosData && cot.clienteId) {
          fetch(`/api/clientes/${cot.clienteId}/precios-equipos`).then(r => r.json()).then(pd => {
            if (pd?.precios) {
              const mapa: Record<string, number> = {};
              const mapaOrig: Record<string, number | null> = {};
              for (const [eqId, v] of Object.entries(pd.precios as Record<string, { precio: number; precioOriginal: number | null }>)) {
                mapa[eqId] = v.precio;
                mapaOrig[eqId] = v.precioOriginal ?? null;
              }
              setPreciosCliente(mapa);
              setPreciosClienteOriginal(mapaOrig);
            }
          });
        }
        setClienteNombre(cot.cliente?.nombre + (cot.cliente?.empresa ? ` · ${cot.cliente.empresa}` : ""));
        // Bloquear los useEffects de auto-descuento ANTES de setear tipoCliente,
        // para que no sobreescriban el estado guardado en la cotización.
        setB2bManualToggle(true);
        setVolumenManualToggle(true);
        setTipoCliente(cot.cliente?.tipoCliente ?? "POR_DESCUBRIR");
        setEvento({
          nombreEvento: cot.nombreEvento ?? "",
          tipoEvento: cot.tipoEvento ?? "MUSICAL",
          tipoServicio: cot.tipoServicio ?? "",
          fechaEvento: cot.fechaEvento ? cot.fechaEvento.split("T")[0] : "",
          lugarEvento: cot.lugarEvento ?? "",
          horasOperacion: String(cot.horasOperacion ?? 8),
          diasEquipo: String(cot.diasEquipo ?? 1),
          diasOperacion: String(cot.diasOperacion ?? 1),
        });
        setObservaciones(cot.observaciones ?? "");
        setIncluirChofer(cot.incluirChofer ?? false);
        setAplicaIva(cot.aplicaIva ?? false);
        // Cargar descuentos exactamente como estaban guardados
        setB2bActivo((cot.descuentoB2bPct ?? 0) > 0);
        setVolumenActivo((cot.descuentoVolumenPct ?? 0) > 0);
        // Usar los porcentajes EXACTOS de la cotización guardada, no los del server config.
        // El config del servidor es sólo para cotizaciones NUEVAS.
        if ((cot.descuentoB2bPct ?? 0) > 0) setCfgPctB2b(Math.round((cot.descuentoB2bPct ?? 0) * 100));
        if ((cot.descuentoVolumenPct ?? 0) > 0) setCfgPctVolumen(Math.round((cot.descuentoVolumenPct ?? 0) * 100));

        // Descuento manual (nuevo): viene de descuentoFamilyFriendsPct (%) o descuentoFijoMonto ($) con descuentoManualEsMonto
        const esManualMonto = cot.descuentoManualEsMonto ?? false;
        const montoFijo = cot.descuentoFijoMonto ?? 0;
        const pctFF = cot.descuentoFamilyFriendsPct ?? 0;
        if (esManualMonto && montoFijo > 0) {
          setManualActivo(true); setManualEsMonto(true); setManualValor(String(montoFijo));
          setManualRazon(cot.descuentoManualRazon ?? "");
        } else if (!esManualMonto && pctFF > 0) {
          setManualActivo(true); setManualEsMonto(false); setManualValor(String(Math.round(pctFF * 100)));
          setManualRazon(cot.descuentoManualRazon ?? "");
        }
        // Pago anticipado
        if (cot.pagoAnticipadoActivo) {
          setPagoAnticipadoActivo(true);
          setPagoAnticipadoFecha(cot.pagoAnticipadoFecha ?? "");
          setPagoAnticipadoTexto(cot.pagoAnticipadoTexto ?? "");
        }
        // Comisión interna — leer de gastosProduccion* o de las líneas OTRO con descripción 'Gastos de Producción'
        if (cot.gastosProduccionActivo) {
          setGastosActivo(true);
          setGastosEsMonto(cot.gastosProduccionEsMonto ?? false);
          if (cot.gastosProduccionEsMonto && cot.gastosProduccionMonto > 0) {
            setGastosValor(String(cot.gastosProduccionMonto));
          } else if (!cot.gastosProduccionEsMonto && cot.gastosProduccionPct > 0) {
            setGastosValor(String(Math.round(cot.gastosProduccionPct * 100)));
          }
        }
        // Retrocompat: preservar descuentos legacy sin control de UI
        if ((cot.descuentoMultidiaPct ?? 0) > 0) setDMultidiaPreservado(cot.descuentoMultidiaPct);
        if ((cot.descuentoEspecialPct ?? 0) > 0) { setDEspecialPreservado(cot.descuentoEspecialPct); setDEspecialNotaPreservada(cot.descuentoEspecialNota ?? null); }
        if ((cot.descuentoPatrocinioPct ?? 0) > 0) { setDPatrocinioPreservado(cot.descuentoPatrocinioPct); setDPatrocinioNotaPreservada(cot.descuentoPatrocinioNota ?? null); }
        // Si hay descuento fijo legacy (sin manualEsMonto flag) → preservar
        if (!esManualMonto && montoFijo > 0 && pctFF === 0) setDFijoPreservado(montoFijo);
        if (cot.notasSecciones) {
          try { setNotasSecciones(JSON.parse(cot.notasSecciones)); } catch { /* ignore */ }
        }
        // Reconstruir líneas
        const lineas = cot.lineas ?? [];
        setLineasEquipo(lineas.filter((l: {tipo:string}) => l.tipo === "EQUIPO_PROPIO").map((l: {id:string;equipoId:string;descripcion:string;marca:string|null;modelo:string|null;cantidad:number;dias:number;precioUnitario:number;subtotal:number;notas:string|null}) => ({
          id: uid(), equipoId: l.equipoId ?? "", descripcion: l.descripcion,
          marca: l.marca ?? "",
          modelo: l.modelo ?? "",
          cantidad: l.cantidad, dias: l.dias,
          precioUnitario: l.precioUnitario, subtotal: l.subtotal,
          categoria: l.notas?.startsWith("cat:") ? (l.notas.split("|")[0].slice(4)) : "",
          notas: extractUserNote(l.notas),
        })));
        // Paquetes: reconstruir concepto + componentes desde notasInternas
        const paqueteLineas = lineas.filter((l: {tipo:string}) => l.tipo === "PAQUETE") as Array<{descripcion:string;cantidad:number;dias:number;precioUnitario:number;subtotal:number;notas:string|null;notasInternas:string|null}>;
        setLineasPaquete(paqueteLineas.map((l) => {
          let componentes: { equipoId: string; cantidad: number }[] = [];
          let productoId = "";
          try {
            const meta = JSON.parse(l.notasInternas ?? "{}");
            componentes = Array.isArray(meta.componentes) ? meta.componentes : [];
            productoId = meta.paqueteId ?? "";
          } catch { /* ignore */ }
          return {
            id: uid(), productoId, nombre: l.descripcion,
            cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario, subtotal: l.subtotal,
            componentes, categoria: l.notas?.startsWith("cat:") ? l.notas.slice(4) : "",
          };
        }));
        setPaquetesAgregados(paqueteLineas.map((l) => {
          try { return (JSON.parse(l.notasInternas ?? "{}").paqueteId as string) ?? ""; } catch { return ""; }
        }).filter(Boolean));
        setLineasExterno(lineas.filter((l: {tipo:string}) => l.tipo === "EQUIPO_EXTERNO").map((l: {equipoId:string;descripcion:string;marca:string|null;cantidad:number;dias:number;precioUnitario:number;costoUnitario:number;subtotal:number;proveedorId:string|null;notas:string|null}) => ({
          id: uid(), equipoId: l.equipoId ?? "", descripcion: l.descripcion,
          marca: l.marca ?? "", cantidad: l.cantidad, dias: l.dias,
          precioUnitario: l.precioUnitario, costoProveedor: l.costoUnitario ?? 0,
          subtotal: l.subtotal, costoTotal: (l.costoUnitario ?? 0) * l.cantidad * l.dias,
          proveedorId: l.proveedorId ?? null,
          categoria: l.notas?.startsWith("cat:") ? l.notas.split("|")[0].slice(4) : "",
        })));
        setLineasOp(lineas.filter((l: {tipo:string;notas?:string|null}) => l.tipo === "OPERACION_TECNICA" && l.notas !== "from:jornada" && l.notas !== "zona:bonus").map((l: {id:string;rolTecnicoId:string|null;descripcion:string;nivel:string|null;jornada:string|null;cantidad:number;dias:number;precioUnitario:number;subtotal:number}) => ({
          id: uid(), rolTecnicoId: l.rolTecnicoId ?? "",
          descripcion: l.descripcion, nivel: l.nivel ?? "AA", jornada: l.jornada ?? "MEDIA",
          cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario, subtotal: l.subtotal,
        })));
        setLineasDJ(lineas.filter((l: {tipo:string}) => l.tipo === "DJ").map((l: {nivel:string|null;cantidad:number;precioUnitario:number;subtotal:number}) => ({
          id: uid(), nivel: l.nivel ?? "AA", horas: l.cantidad,
          tarifa: l.precioUnitario, subtotal: l.subtotal,
        })));
        setLineasLog(lineas.filter((l: {tipo:string}) => ["TRANSPORTE","COMIDA","HOSPEDAJE"].includes(l.tipo)).map((l: {tipo:string;descripcion:string;cantidad:number;dias:number;precioUnitario:number;subtotal:number}) => ({
          id: uid(), tipo: l.tipo as "COMIDA"|"TRANSPORTE"|"HOSPEDAJE",
          concepto: l.descripcion, precioUnitario: l.precioUnitario,
          cantidad: l.cantidad, dias: l.dias, subtotal: l.subtotal,
        })));
        setLineasOcasional(lineas.filter((l: {tipo:string}) => l.tipo === "OTRO").map((l: {descripcion:string;cantidad:number;dias:number;precioUnitario:number;subtotal:number}) => ({
          id: uid(), descripcion: l.descripcion,
          cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario, subtotal: l.subtotal,
        })));
        if (cot.jornadasPlan) {
          try {
            const jp: Jornada[] = JSON.parse(cot.jornadasPlan);
            setJornadasPlan(jp.map(j => ({ ...j, id: j.id || uid(), slots: j.slots.map(s => ({ ...s, id: s.id || uid() })) })));
          } catch { /* ignore */ }
        }
        if (cot.zonaEvento) setZonaEvento(cot.zonaEvento as "LOCAL"|"BAJIO"|"NACIONAL");
        if (cot.numTecnicosZona) setNumTecnicosZona(cot.numTecnicosZona);
        // Heredar la selección del descubrimiento del trato. Si la cotización es
        // el panel de sugerencias, donde el vendedor los agrega manualmente
        // (checklist consciente).
        if (cot.trato?.equiposInteres) {
          try {
            const ei = JSON.parse(cot.trato.equiposInteres);
            setEquiposInteres({ categorias: ei.categorias ?? [], equipos: ei.equipos ?? [], cantidades: ei.cantidades ?? {}, extras: ei.extras ?? [], productos: ei.productos ?? [], paquetes: ei.paquetes ?? [] });
          } catch { /* noop */ }
        }
        // Mark as initialized so auto-save can start on next change
        setTimeout(() => { isInitialized.current = true; }, 500);
        return;
      }

      if (cl?.cliente) {
        setTipoCliente(cl.cliente.tipoCliente);
        setClienteNombre(cl.cliente.nombre + (cl.cliente.empresa ? ` · ${cl.cliente.empresa}` : ""));
      }
      // Pre-llenar desde el trato
      if (tr?.trato) {
        const t = tr.trato;
        setEvento(prev => ({
          ...prev,
          nombreEvento: t.nombreEvento || prev.nombreEvento,
          tipoEvento: t.tipoEvento || prev.tipoEvento,
          tipoServicio: t.tipoServicio || prev.tipoServicio,
          fechaEvento: t.fechaEventoEstimada ? t.fechaEventoEstimada.split("T")[0] : prev.fechaEvento,
          lugarEvento: t.lugarEstimado || prev.lugarEvento,
          diasEquipo: t.diasServicio ? String(t.diasServicio) : prev.diasEquipo,
          diasOperacion: t.diasServicio ? String(t.diasServicio) : prev.diasOperacion,
        }));
        if (t.notas) setTratoNotas(t.notas);
        if (t.archivos?.length) setTratoArchivos(t.archivos);
        // Servicio de varios días: sembrar una jornada de OPERACIÓN por cada fecha del
        // evento para que el vendedor solo asigne técnicos por día. Solo si aún no hay plan.
        const diasDelEvento = diasEvento(t.fechaEventoEstimada, t.fechasEvento);
        if (diasDelEvento.length > 1) {
          setJornadasPlan(prev => prev.length > 0
            ? prev
            : diasDelEvento.map(f => ({ id: uid(), fecha: f, tipo: "OPERACION", slots: [] })));
        }
        // Auto-activate descuento manual si trato es Family & Friends
        if (t.familyAndFriends) {
          setManualActivo(true);
          setManualEsMonto(false);
          setManualValor("10");
          setManualRazon("Family & Friends");
        }
        if (t.asistentesEstimados) setAsistentesEstimados(t.asistentesEstimados);
        if (t.formEstado) setTratoFormEstado(t.formEstado);
        if (t.equiposInteres) { try { const ei = JSON.parse(t.equiposInteres); setEquiposInteres({ categorias: ei.categorias ?? [], equipos: ei.equipos ?? [], cantidades: ei.cantidades ?? {}, extras: ei.extras ?? [], productos: ei.productos ?? [], paquetes: ei.paquetes ?? [] }); } catch { /* noop */ } }
      }
    });
  }, [clienteId, tratoId]);

  // La selección del descubrimiento NO se vuelca automáticamente a las líneas de
  // la cotización. Se muestra en el panel de sugerencias como checklist, y el
  // vendedor decide conscientemente qué agregar con los botones "+ Agregar".

  // Auto-activación B2B desactivada intencionalmente:
  // El vendedor decide manualmente si aplica descuento B2B para cada cotización.

  // Auto-calcular cantidad de comidas = total técnicos en cotización
  useEffect(() => {
    const totalTecnicos = lineasOp.reduce((s, l) => s + Math.round(l.cantidad), 0)
      + lineasDJ.length;
    if (totalTecnicos > 0) setLogCant(p => ({ ...p, COMIDA: String(totalTecnicos) }));
  }, [lineasOp, lineasDJ]);

  // Cargar disponibilidad cuando cambia la fecha del evento
  useEffect(() => {
    const fecha = evento.fechaEvento;
    if (!fecha) { setDispMap({}); return; }
    setLoadingDisp(true);
    const params = new URLSearchParams({ fecha });
    if (editId) params.set("excludeCotizacionId", editId);
    fetch(`/api/equipos/disponibilidad?${params}`)
      .then(r => r.json())
      .then(d => { setDispMap(d.disponibilidad ?? {}); })
      .catch(() => {})
      .finally(() => setLoadingDisp(false));
  }, [evento.fechaEvento, editId]);

  // Cargar proveedores cuando hay déficit detectado
  useEffect(() => {
    if (!deficitInfo) { setDeficitProveedores([]); return; }
    fetch(`/api/equipos/${deficitInfo.equipoId}/proveedores`)
      .then(r => r.json())
      .then(d => setDeficitProveedores(d.proveedores?.map((pp: { precio: number; proveedor: { id: string; nombre: string; empresa: string | null; prioridad: number } }) => ({ precio: pp.precio, proveedor: pp.proveedor })) ?? []))
      .catch(() => {});
  }, [deficitInfo]);

  // Equipos propios agrupados por categoría
  const equiposPorCategoria = useMemo(() => {
    const propios = equipos.filter(e => e.tipo === "PROPIO");
    const map = new Map<string, Equipo[]>();
    for (const eq of propios) {
      const cat = eq.categoria.nombre;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(eq);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const oa = propios.find(e => e.categoria.nombre === a[0])?.categoria.orden ?? 99;
      const ob = propios.find(e => e.categoria.nombre === b[0])?.categoria.orden ?? 99;
      return oa - ob;
    });
  }, [equipos]);

  // Equipos externos (de terceros)
  const equiposExternos = useMemo(() => equipos.filter(e => e.tipo === "EXTERNO"), [equipos]);

  // Categorías únicas derivadas del catálogo cargado
  const categoriasList = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>();
    for (const eq of equipos) {
      if (!map.has(eq.categoria.id)) map.set(eq.categoria.id, { id: eq.categoria.id, nombre: eq.categoria.nombre });
    }
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [equipos]);

  // ── Agregar equipo ──
  async function agregarEquipo() {
    const eq = equipos.find(e => e.id === selEq);
    if (!eq) return;
    const cant = parseFloat(selEqCant) || 1;
    const dias = parseInt(selEqDias) || 1;
    const precio = preciosCliente[eq.id] ?? eq.precioRenta;

    // Verificar disponibilidad si hay fecha seleccionada
    if (evento.fechaEvento && dispMap[eq.id] !== undefined) {
      const disp = dispMap[eq.id];
      // Sumar lo que ya está en la cotización actual para ese equipo
      const yaEnCot = lineasEquipo.filter(l => l.equipoId === eq.id).reduce((s, l) => s + l.cantidad, 0);
      const totalPedido = yaEnCot + cant;
      if (totalPedido > disp.total) {
        const confirmar = await confirm({
          message: `⚠ Stock insuficiente para "${eq.descripcion}"\n\nDisponible para ${evento.fechaEvento}: ${disp.disponible} de ${disp.total} unidad(es)\n` +
            (disp.comprometido > 0 ? `Comprometido en ${disp.eventos.length} evento(s): ${disp.eventos.map(e => e.ref).join(", ")}\n\n` : "\n") +
            `Estás intentando agregar ${cant} unidad(es) (total en esta cotización: ${totalPedido}).\n\n¿Deseas agregarlo de todas formas?`,
          danger: false,
          confirmText: "Agregar de todas formas",
        });
        if (!confirmar) return;
      }
    }

    setLineasEquipo(prev => [...prev, {
      id: uid(), equipoId: eq.id, descripcion: eq.descripcion,
      marca: eq.marca ?? "",
      modelo: eq.modelo ?? "",
      cantidad: cant, dias, precioUnitario: precio,
      subtotal: precio * cant * dias,
      categoria: eq.categoria.nombre,
      notas: "",
    }]);
    // Déficit check para equipos PROPIOS
    const disponible = dispMap[eq.id]?.disponible ?? eq.cantidadTotal;
    if (cant > disponible) {
      const deficit = cant - disponible;
      const lineaId = uid(); // track which line has the deficit
      setDeficitInfo({ equipoId: eq.id, lineaId, stockPropio: disponible, deficit });
    }
    setSelEq(""); setSelEqCant("1"); setSelEqDias(evento.diasEquipo);
  }

  // ── Sugerencias de equipo (derivadas del descubrimiento) ──
  function agregarEquipoDescubrimiento(eq: Equipo, cantidad?: number) {
    if (lineasEquipo.some(l => l.equipoId === eq.id)) return;
    const precio = preciosCliente[eq.id] ?? eq.precioRenta;
    const dias = parseInt(evento.diasEquipo) || 1;
    const cant = cantidad && cantidad > 0 ? cantidad : 1;
    setLineasEquipo(prev => [...prev, {
      id: uid(), equipoId: eq.id, descripcion: eq.descripcion,
      marca: eq.marca ?? "",
      modelo: eq.modelo ?? "",
      cantidad: cant, dias,
      precioUnitario: precio,
      subtotal: precio * cant * dias,
      categoria: eq.categoria.nombre,
      notas: "",
    }]);
  }

  function agregarTodasSugerencias() {
    equiposInteres.equipos.forEach(id => {
      const eq = equipos.find(e => e.id === id);
      if (eq && !lineasEquipo.some(l => l.equipoId === eq.id)) {
        agregarEquipoDescubrimiento(eq, equiposInteres.cantidades[eq.id]);
      }
    });
  }

  // Agrega un paquete como UN concepto (línea PAQUETE), no expandido en equipos sueltos.
  // Sus componentes se conservan para contar disponibilidad y heredar al proyecto.
  function agregarLineaPaquete(prod: typeof productosCatalogo[number], cant: number, dias: number) {
    const componentes = prod.items
      .filter(it => it.equipo)
      .map(it => ({ equipoId: it.equipo.id, cantidad: it.cantidad }));
    setLineasPaquete(prev => {
      const idx = prev.findIndex(l => l.productoId === prod.id);
      if (idx >= 0) {
        const l = prev[idx];
        const nuevaCant = l.cantidad + cant;
        const next = [...prev];
        next[idx] = { ...l, cantidad: nuevaCant, subtotal: l.precioUnitario * nuevaCant * l.dias };
        return next;
      }
      return [...prev, {
        id: uid(), productoId: prod.id, nombre: prod.nombre,
        cantidad: cant, dias, precioUnitario: prod.precioFinal,
        subtotal: prod.precioFinal * cant * dias,
        componentes, categoria: prod.categoria ?? "",
      }];
    });
  }

  // Paquete del descubrimiento → se agrega tal cual como concepto/paquete.
  function agregarPaqueteDescubrimiento(prod: typeof productosCatalogo[number]) {
    if (paquetesAgregados.includes(prod.id)) return;
    const sel = equiposInteres.productos.find(p => p.id === prod.id);
    const paqCant = sel?.cantidad && sel.cantidad > 0 ? sel.cantidad : 1;
    const dias = parseInt(evento.diasEquipo) || 1;
    agregarLineaPaquete(prod, paqCant, dias);
    setPaquetesAgregados(prev => prev.includes(prod.id) ? prev : [...prev, prod.id]);
  }

  // Paquete elegido manualmente desde el catálogo (caja de Equipos propios).
  function agregarPaqueteManual() {
    const prod = productosCatalogo.find(p => p.id === selPaq);
    if (!prod) return;
    const cant = parseInt(selPaqCant) || 1;
    const dias = parseInt(selEqDias) || 1;
    agregarLineaPaquete(prod, cant, dias);
    setPaquetesAgregados(prev => prev.includes(prod.id) ? prev : [...prev, prod.id]);
    setSelPaq(""); setSelPaqCant("1");
  }

  function updatePaquete(id: string, field: "cantidad" | "dias" | "precioUnitario", val: number) {
    setLineasPaquete(prev => prev.map(l => {
      if (l.id !== id) return l;
      const u = { ...l, [field]: val };
      u.subtotal = u.precioUnitario * u.cantidad * u.dias;
      return u;
    }));
  }

  function removePaquete(id: string) {
    setLineasPaquete(prev => {
      const l = prev.find(x => x.id === id);
      if (l) setPaquetesAgregados(p => p.filter(pid => pid !== l.productoId));
      return prev.filter(x => x.id !== id);
    });
  }

  // Paquete comercial → se DESGLOSA en líneas individuales de la cotización:
  // equipos → líneas de equipo, productos → líneas de paquete armado,
  // conceptos → operación técnica / logística / ocasional según su tipo.
  function expandirPaquete(paq: PaqueteCat, paqCant: number) {
    if (paquetesExpandidos.includes(paq.id)) return;
    const veces = paqCant > 0 ? paqCant : 1;
    const diasEq = parseInt(evento.diasEquipo) || 1;

    // 1. Equipos individuales
    const nuevasEq: LineaEquipo[] = [];
    const nuevasPaq: LineaPaquete[] = [];
    for (const it of paq.items) {
      const cant = (it.cantidad || 1) * veces;
      if (it.tipo === "PRODUCTO" && it.producto) {
        const prod = it.producto;
        const componentes = prod.items.filter(x => x.equipo).map(x => ({ equipoId: x.equipo.id, cantidad: x.cantidad }));
        nuevasPaq.push({
          id: uid(), productoId: prod.id, nombre: prod.nombre,
          cantidad: cant, dias: diasEq, precioUnitario: prod.precioFinal,
          subtotal: prod.precioFinal * cant * diasEq,
          componentes, categoria: prod.categoria ?? "",
        });
      } else if (it.equipo) {
        const eq = it.equipo;
        const precio = preciosCliente[eq.id] ?? eq.precioRenta;
        nuevasEq.push({
          id: uid(), equipoId: eq.id, descripcion: eq.descripcion,
          marca: eq.marca ?? "", modelo: eq.modelo ?? "",
          cantidad: cant, dias: diasEq, precioUnitario: precio,
          subtotal: precio * cant * diasEq,
          categoria: eq.categoria?.nombre ?? "Equipos", notas: "",
        });
      }
    }
    if (nuevasEq.length) setLineasEquipo(prev => [...prev, ...nuevasEq.filter(n => !prev.some(l => l.equipoId === n.equipoId))]);
    if (nuevasPaq.length) setLineasPaquete(prev => [...prev, ...nuevasPaq.filter(n => !prev.some(l => l.productoId === n.productoId))]);

    // 2. Conceptos operativos
    const nuevasOp: LineaOp[] = [];
    const nuevasLog: LineaLogistica[] = [];
    const nuevasOca: LineaOcasional[] = [];
    for (const c of paq.conceptos) {
      const cant = (c.cantidad || 1) * veces;
      const dias = c.dias || 1;
      const precio = c.precioUnitario || 0;
      if (c.tipo === "OPERACION_TECNICA" && c.rolTecnicoId) {
        nuevasOp.push({
          id: uid(), rolTecnicoId: c.rolTecnicoId,
          descripcion: c.rolTecnico?.nombre ?? c.descripcion,
          nivel: c.nivel ?? "AAA", jornada: c.jornada ?? "CORTA",
          cantidad: cant, dias, precioUnitario: precio, subtotal: precio * cant * dias,
        });
      } else if (c.tipo === "COMIDA" || c.tipo === "TRANSPORTE" || c.tipo === "HOSPEDAJE") {
        nuevasLog.push({
          id: uid(), tipo: c.tipo, concepto: c.descripcion,
          precioUnitario: precio, cantidad: cant, dias, subtotal: precio * cant * dias,
        });
      } else {
        nuevasOca.push({
          id: uid(), descripcion: c.descripcion,
          cantidad: cant, dias, precioUnitario: precio, subtotal: precio * cant * dias,
        });
      }
    }
    if (nuevasOp.length) setLineasOp(prev => [...prev, ...nuevasOp]);
    if (nuevasLog.length) setLineasLog(prev => [...prev, ...nuevasLog]);
    if (nuevasOca.length) setLineasOcasional(prev => [...prev, ...nuevasOca]);

    setPaquetesExpandidos(prev => prev.includes(paq.id) ? prev : [...prev, paq.id]);
  }

  function expandirPaqueteDescubrimiento(paq: PaqueteCat) {
    const sel = equiposInteres.paquetes.find(p => p.id === paq.id);
    expandirPaquete(paq, sel?.cantidad && sel.cantidad > 0 ? sel.cantidad : 1);
  }

  // Extra del descubrimiento (equipo a mano) → concepto ocasional con precio editable.
  function agregarExtraDescubrimiento(extra: { id: string; nombre: string; categoria?: string; cantidad?: number }) {
    const precio = parseFloat(extrasPrecios[extra.id] ?? "") || 0;
    if (precio <= 0) return;
    const cant = extra.cantidad && extra.cantidad > 0 ? extra.cantidad : 1;
    const dias = parseInt(evento.diasEquipo) || 1;
    const desc = extra.categoria ? `${extra.nombre} (${extra.categoria})` : extra.nombre;
    setLineasOcasional(prev => [...prev, {
      id: uid(), descripcion: desc,
      cantidad: cant, dias, precioUnitario: precio,
      subtotal: precio * cant * dias,
    }]);
    setExtrasAgregados(prev => prev.includes(extra.id) ? prev : [...prev, extra.id]);
  }

  function agregarSugerenciaTecnico(keyword: string, cantidad: number) {
    const kw = keyword.toLowerCase();
    const rol = roles.find(r => r.nombre.toLowerCase().includes(kw));
    if (!rol) return;
    const dias = parseInt(evento.diasOperacion) || 1;
    const nivel = rol.tipoPago === "POR_JORNADA" ? "AAA" : selRolNivel;
    const tarifa = getRolTarifa(rol, nivel, selRolJornada);
    const yaExiste = lineasOp.some(l => l.rolTecnicoId === rol.id && l.jornada === selRolJornada);
    if (yaExiste) return;
    setLineasOp(prev => [...prev, {
      id: uid(), rolTecnicoId: rol.id, descripcion: rol.nombre,
      nivel, jornada: selRolJornada, cantidad, dias,
      precioUnitario: tarifa, subtotal: tarifa * cantidad * dias,
    }]);
  }

  function updateEquipo(id: string, field: keyof LineaEquipo, val: number) {
    setLineasEquipo(prev => prev.map(l => {
      if (l.id !== id) return l;
      const u = { ...l, [field]: val };
      u.subtotal = u.precioUnitario * u.cantidad * u.dias;
      return u;
    }));
  }

  // ── Guardar precio especial del cliente para un equipo ──
  async function guardarPrecioCliente(linea: LineaEquipo) {
    const cId = resolvedClienteId || clienteId;
    if (!cId || !linea.equipoId) return;
    setGuardandoPrecio(linea.id);
    // precioOriginal = precio de lista del catálogo (se guarda para comparación futura)
    const precioOriginal = equipos.find(e => e.id === linea.equipoId)?.precioRenta ?? null;
    await fetch(`/api/clientes/${cId}/precios-equipos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipoId: linea.equipoId, precio: linea.precioUnitario, precioOriginal }),
    });
    setPreciosCliente(prev => ({ ...prev, [linea.equipoId]: linea.precioUnitario }));
    setPreciosClienteOriginal(prev => ({ ...prev, [linea.equipoId]: precioOriginal }));
    setGuardandoPrecio(null);
  }

  // ── Agregar equipo externo (tercero) ──
  function agregarExterno() {
    const eq = equiposExternos.find(e => e.id === selExt);
    if (!eq) return;
    const cant = parseFloat(selExtCant) || 1;
    const dias = parseInt(selExtDias) || 1;
    const costo = eq.costoProveedor ?? 0;
    // Auto-seleccionar proveedor de mayor prioridad si existe
    const mejorProveedor = (eq.proveedoresPrecios ?? [])[0] ?? null;
    setLineasExterno(prev => [...prev, {
      id: uid(), equipoId: eq.id, descripcion: eq.descripcion,
      marca: [eq.marca, eq.modelo].filter(Boolean).join(" "),
      cantidad: cant, dias,
      precioUnitario: eq.precioRenta,
      costoProveedor: mejorProveedor ? mejorProveedor.precio : costo,
      subtotal: eq.precioRenta * cant * dias,
      costoTotal: (mejorProveedor ? mejorProveedor.precio : costo) * cant * dias,
      proveedorId: mejorProveedor ? mejorProveedor.proveedor.id : (eq.proveedorDefaultId ?? null),
      categoria: eq.categoria?.nombre ?? "",
    }]);
    setSelExt(""); setSelExtCant("1"); setSelExtDias(evento.diasEquipo);
  }

  // ── Registrar nuevo equipo proveedor en DB y agregar a cotización ──
  async function crearEquipoProveedor() {
    if (!nuevoEqForm.descripcion || !nuevoEqForm.categoriaId) return;
    setGuardandoEq(true);
    try {
      const res = await fetch("/api/equipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcion: nuevoEqForm.descripcion,
          marca: nuevoEqForm.marca || null,
          categoriaId: nuevoEqForm.categoriaId,
          tipo: "EXTERNO",
          precioRenta: parseFloat(nuevoEqForm.precioRenta) || 0,
          costoProveedor: nuevoEqForm.costoProveedor ? parseFloat(nuevoEqForm.costoProveedor) : null,
          cantidadTotal: parseInt(nuevoEqForm.cantidadTotal) || 1,
          proveedorDefaultId: nuevoEqForm.proveedorId || null,
        }),
      });
      if (!res.ok) return;
      const { equipo: newEq } = await res.json();
      // Añadir al catálogo local
      setEquipos(prev => [...prev, newEq]);
      // Agregar línea a la cotización
      setLineasExterno(prev => [...prev, {
        id: uid(),
        equipoId: newEq.id,
        descripcion: newEq.descripcion,
        marca: newEq.marca ?? "",
        cantidad: 1,
        dias: parseInt(evento.diasEquipo) || 1,
        precioUnitario: newEq.precioRenta,
        costoProveedor: newEq.costoProveedor ?? 0,
        subtotal: newEq.precioRenta * 1 * (parseInt(evento.diasEquipo) || 1),
        costoTotal: (newEq.costoProveedor ?? 0) * 1 * (parseInt(evento.diasEquipo) || 1),
        proveedorId: newEq.proveedorDefaultId ?? null,
        categoria: newEq.categoria?.nombre ?? "",
      }]);
      setNuevoEqForm({ descripcion: "", marca: "", categoriaId: "", precioRenta: "", costoProveedor: "", cantidadTotal: "1", proveedorId: "" });
      setShowNuevoEqModal(false);
    } finally {
      setGuardandoEq(false);
    }
  }

  // ── Registrar nuevo equipo propio en DB ──
  async function crearEquipoPropio() {
    const f = nuevoEqPropioForm;
    const categoriaId = f.categoriaId || categoriasList[0]?.id || "";
    if (!f.marca.trim() || !f.descripcion.trim() || !f.precioRenta || !categoriaId) {
      toast.error("Completa todos los campos requeridos.");
      return;
    }
    setGuardandoEqPropio(true);
    try {
      const esExterno = f.tipo === "EXTERNO";
      const res = await fetch("/api/equipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcion: f.descripcion.trim(),
          marca: f.marca.trim() || null,
          modelo: f.modelo.trim() || null,
          categoriaId,
          tipo: f.tipo,
          precioRenta: parseFloat(f.precioRenta) || 0,
          cantidadTotal: esExterno ? (parseInt(f.cantidadTotal) || 1) : 1,
          costoProveedor: esExterno && f.costoProveedor ? parseFloat(f.costoProveedor) : null,
          proveedorDefaultId: esExterno ? (f.proveedorId || null) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error ? `No se pudo registrar: ${err.error}` : "No se pudo registrar el equipo. Intenta de nuevo.");
        return;
      }
      const { equipo: newEq } = await res.json();
      setEquipos(prev => [...prev, newEq]);
      const dias = parseInt(evento.diasEquipo) || 1;
      if (esExterno) {
        setLineasExterno(prev => [...prev, {
          id: uid(),
          equipoId: newEq.id,
          descripcion: newEq.descripcion,
          marca: newEq.marca ?? "",
          cantidad: 1,
          dias,
          precioUnitario: newEq.precioRenta,
          costoProveedor: newEq.costoProveedor ?? 0,
          subtotal: newEq.precioRenta * 1 * dias,
          costoTotal: (newEq.costoProveedor ?? 0) * 1 * dias,
          proveedorId: newEq.proveedorDefaultId ?? null,
          categoria: newEq.categoria?.nombre ?? "",
        }]);
      } else {
        setLineasEquipo(prev => [...prev, {
          id: uid(),
          equipoId: newEq.id,
          descripcion: newEq.descripcion,
          marca: newEq.marca ?? "",
          modelo: newEq.modelo ?? "",
          cantidad: 1,
          dias,
          precioUnitario: newEq.precioRenta,
          subtotal: newEq.precioRenta * 1 * dias,
          categoria: newEq.categoria.nombre,
          notas: "",
        }]);
      }
      toast.success(esExterno ? "Equipo de proveedor registrado y agregado ✓" : "Equipo registrado y agregado ✓");
      setNuevoEqPropioForm({ tipo: "PROPIO", marca: "", modelo: "", descripcion: "", precioRenta: "", categoriaId: "", costoProveedor: "", proveedorId: "", cantidadTotal: "1" });
      setNuevoEqPropioDescEditado(false);
      setShowNuevoEqPropioModal(false);
    } catch {
      toast.error("No se pudo registrar el equipo. Intenta de nuevo.");
    } finally {
      setGuardandoEqPropio(false);
    }
  }

  // ── Agregar equipo/concepto ocasional (sin registro en DB) ──
  function agregarOcasional() {
    if (!selOcDesc.trim() || !selOcPrecio) return;
    const precio = parseFloat(selOcPrecio) || 0;
    const cant = parseFloat(selOcCant) || 1;
    const dias = parseInt(selOcDias) || 1;
    setLineasOcasional(prev => [...prev, {
      id: uid(), descripcion: selOcDesc.trim(),
      cantidad: cant, dias, precioUnitario: precio,
      subtotal: precio * cant * dias,
    }]);
    setSelOcDesc(""); setSelOcPrecio(""); setSelOcCant("1"); setSelOcDias("1");
  }

  function updateExterno(id: string, field: "cantidad" | "dias" | "precioUnitario", val: number) {
    setLineasExterno(prev => prev.map(l => {
      if (l.id !== id) return l;
      const u = { ...l, [field]: val };
      u.subtotal = u.precioUnitario * u.cantidad * u.dias;
      u.costoTotal = u.costoProveedor * u.cantidad * u.dias;
      return u;
    }));
  }

  // ── Agregar rol técnico ──
  function agregarRol() {
    const rol = roles.find(r => r.id === selRol);
    if (!rol) return;
    const cant = parseFloat(selRolCant) || 1;
    const dias = parseInt(evento.diasOperacion) || 1;
    const nivel = rol.tipoPago === "POR_JORNADA" ? "AAA" : selRolNivel;
    const tarifa = getRolTarifa(rol, nivel, selRolJornada);
    setLineasOp(prev => [...prev, {
      id: uid(), rolTecnicoId: rol.id, descripcion: rol.nombre,
      nivel, jornada: selRolJornada, cantidad: cant, dias,
      precioUnitario: tarifa, subtotal: tarifa * cant * dias,
    }]);
    setSelRol(""); setSelRolCant("1");
  }

  function updateOp(id: string, field: keyof LineaOp, val: number) {
    setLineasOp(prev => prev.map(l => {
      if (l.id !== id) return l;
      const u = { ...l, [field]: val };
      u.subtotal = u.precioUnitario * u.cantidad * u.dias;
      return u;
    }));
  }

  // ── Agregar DJ ──
  function agregarDJ() {
    const horas = parseFloat(selDJHoras) || 1;
    const djRol = roles.find(r => r.nombre === "DJ");
    const tarifaKey = `tarifaHora${selDJNivel}` as keyof RolTecnico;
    const tarifaDefault = djRol ? ((djRol[tarifaKey] as number | null) ?? 0) : 0;
    const tarifa = parseFloat(selDJTarifa) || tarifaDefault;
    setLineasDJ(prev => [...prev, {
      id: uid(), nivel: selDJNivel, horas, tarifa, subtotal: tarifa * horas,
    }]);
  }

  // ─── Cálculo del resumen ──────────────────────────────────────────────────
  const resumen = useMemo(() => {
    const subtotalEquiposBruto = lineasEquipo.reduce((s, l) => s + l.subtotal, 0);
    // Paquetes: precio fijo, sin descuentos de equipo. Se suman al total tal cual.
    const subtotalPaquetes = lineasPaquete.reduce((s, l) => s + l.subtotal, 0);
    // Externos: precio al cliente (sin descuento) y costo de proveedor (para viabilidad)
    const subtotalExternos = lineasExterno.reduce((s, l) => s + l.subtotal, 0);
    const costoExternos = lineasExterno.reduce((s, l) => s + l.costoTotal, 0);

    const subtotalJornadas = jornadasPlan.flatMap(j => j.slots).reduce((s, slot) => s + slot.tarifa * slot.cantidad, 0);
    const zonaBonus = zonaEvento === "BAJIO" ? 500 : zonaEvento === "NACIONAL" ? 800 : 0;
    const bonusZonaTotal = zonaBonus * numTecnicosZona;
    const subtotalOperacion = lineasOp.reduce((s, l) => s + l.subtotal, 0) + subtotalJornadas + bonusZonaTotal;
    const subtotalDJ = lineasDJ.reduce((s, l) => s + l.subtotal, 0);
    const subtotalTransporte = lineasLog.filter(l => l.tipo === "TRANSPORTE").reduce((s, l) => s + l.subtotal, 0);
    const subtotalComidas = lineasLog.filter(l => l.tipo === "COMIDA").reduce((s, l) => s + l.subtotal, 0);
    const subtotalHospedaje = lineasLog.filter(l => l.tipo === "HOSPEDAJE").reduce((s, l) => s + l.subtotal, 0);

    // Descuentos en cascada — solo sobre equipos Mainstage (propios)
    const pctV   = cfgPctVolumen  / 100;
    const pctB   = cfgPctB2b      / 100;
    const pctA   = cfgPctAnticipado / 100;

    // Auto-activar volumen si subtotal supera umbral (solo si no ha sido tocado manualmente)
    const debeAutoVolumen = subtotalEquiposBruto > cfgUmbralVolumen;
    const volumenEfectivo = volumenActivo;

    // 1) Descuento por volumen
    const montoVolumen = volumenEfectivo ? subtotalEquiposBruto * pctV : 0;
    const basePostVolumen = subtotalEquiposBruto - montoVolumen;

    // 2) Descuento B2B (sobre base post-volumen)
    const montoB2b = b2bActivo ? basePostVolumen * pctB : 0;
    const basePostB2b = basePostVolumen - montoB2b;

    // 3) Descuento manual (% sobre base post-B2B, o $ fijo)
    const montoManual = manualActivo
      ? (manualEsMonto
          ? (parseFloat(manualValor) || 0)
          : basePostB2b * (parseFloat(manualValor) || 0) / 100)
      : 0;
    const pctManualEfectivo = manualActivo
      ? (manualEsMonto
          ? (basePostB2b > 0 ? montoManual / basePostB2b : 0)
          : (parseFloat(manualValor) || 0) / 100)
      : 0;
    const subtotalEquiposNeto = basePostB2b - montoManual;

    // Preservados (legacy retrocompat)
    const montoDescuentoLegacy = subtotalEquiposBruto * (dMultidiaPreservado + dEspecialPreservado + dPatrocinioPreservado) + dFijoPreservado;

    const montoDescuento = montoVolumen + montoB2b + montoManual + montoDescuentoLegacy;
    const descuentoTotalPct = subtotalEquiposBruto > 0 ? montoDescuento / subtotalEquiposBruto : 0;

    // Pago anticipado (sobre equipos neto, NO modifica total principal)
    const montoPagoAnticipadoFinal = pagoAnticipadoActivo ? subtotalEquiposNeto * pctA : 0;

    const subtotalOcasionales = lineasOcasional.reduce((s, l) => s + l.subtotal, 0);
    const subtotalChofer = incluirChofer ? 500 : 0;
    const baseTotal = subtotalEquiposNeto + subtotalPaquetes + subtotalExternos + subtotalOcasionales + subtotalOperacion + subtotalDJ + subtotalTransporte + subtotalComidas + subtotalHospedaje + subtotalChofer;

    // Comisión interna / Gastos de producción
    const gastosProduccionMonto = gastosActivo
      ? (gastosEsMonto
          ? (parseFloat(gastosValor) || 0)
          : baseTotal * (parseFloat(gastosValor) || 0) / 100)
      : 0;
    const gastosProduccionPct = !gastosEsMonto ? (parseFloat(gastosValor) || 0) / 100 : 0;

    const total = baseTotal + gastosProduccionMonto;
    const montoIva = aplicaIva ? total * IVA : 0;
    const granTotal = total + montoIva;
    const totalConPagoAnticipado = granTotal - montoPagoAnticipadoFinal;

    // Costo real = lo que pagamos a técnicos (tabulador) + logística + proveedor de equipos externos.
    // Equipo propio = sin costo (ya capitalizado), su renta es margen puro.
    // lineasOp = lo que le cobramos al cliente por operación → NO es un costo, es ingreso.
    const costos = subtotalJornadas                                  // pago real a técnicos (tabulador)
      + bonusZonaTotal                                               // bonus de zona que pagamos
      + lineasDJ.reduce((s, l) => s + l.subtotal, 0)               // DJ externo (pass-through)
      + subtotalTransporte + subtotalComidas + subtotalHospedaje     // logística / viáticos / hospedaje
      + costoExternos;                                               // lo que pagamos al proveedor de equipo externo

    const utilidad = total - costos;
    const pctUtilidad = total > 0 ? utilidad / total : 0;

    const semaforo = pctUtilidad >= VIABILIDAD.IDEAL ? "IDEAL"
      : pctUtilidad >= VIABILIDAD.REGULAR ? "REGULAR"
      : pctUtilidad >= VIABILIDAD.MINIMO ? "MINIMO" : "RIESGO";

    return {
      subtotalEquiposBruto, subtotalPaquetes, subtotalExternos, subtotalOcasionales, costoExternos,
      subtotalOperacion, subtotalDJ, subtotalChofer,
      subtotalTransporte, subtotalComidas, subtotalHospedaje,
      montoVolumen, basePostVolumen, montoB2b, basePostB2b,
      montoManual, pctManualEfectivo,
      descuentoTotalPct, montoDescuento,
      subtotalEquiposNeto, gastosProduccionMonto, gastosProduccionPct, baseTotal,
      total, montoIva, granTotal,
      montoPagoAnticipadoFinal, totalConPagoAnticipado,
      debeAutoVolumen,
      costos, utilidad, pctUtilidad, semaforo,
      zonaBonus, bonusZonaTotal,
    };
  }, [lineasEquipo, lineasPaquete, lineasExterno, lineasOcasional, lineasOp, lineasDJ, lineasLog, jornadasPlan,
    volumenActivo, b2bActivo, manualActivo, manualEsMonto, manualValor, pagoAnticipadoActivo,
    cfgUmbralVolumen, cfgPctVolumen, cfgPctB2b, cfgPctAnticipado, cfgMaxManual,
    dMultidiaPreservado, dEspecialPreservado, dPatrocinioPreservado, dFijoPreservado,
    aplicaIva, incluirChofer, zonaEvento, numTecnicosZona,
    gastosActivo, gastosEsMonto, gastosValor]);

  const sem = SEMAFORO_STYLE[resumen.semaforo];

  // Auto-activar descuento por volumen si supera el umbral (y el usuario no lo ha desactivado manualmente)
  useEffect(() => {
    // En modo edición, no auto-activar: el usuario controla esto manualmente
    if (!volumenManualToggle && !editId) {
      setVolumenActivo(resumen.debeAutoVolumen);
    }
  }, [resumen.debeAutoVolumen, volumenManualToggle, editId]);

  // ── Auto-save con debounce (solo en modo edición, tras inicialización) ──
  useEffect(() => {
    if (!editId || !isInitialized.current) return;
    setAutoSaved(false);
    const timer = setTimeout(async () => {
      const cId = resolvedClienteId || clienteId || manualClienteId;
      if (!cId) return; // sin cliente no se puede guardar
      setAutoSaving(true);
      try {
        const todasLineasAuto = [
          ...lineasEquipo.map(l => {
            const notasRaw = l.notas ?? '';
            const deficitMatch = notasRaw.match(/\|?deficit:(\{.*\})$/);
            let deficitFields = {};
            let notasLimpia = notasRaw;
            if (deficitMatch) {
              try { deficitFields = JSON.parse(deficitMatch[1]); } catch { /* ignore */ }
              notasLimpia = notasRaw.replace(/\|?deficit:\{.*\}$/, '');
            }
            return {
              tipo: "EQUIPO_PROPIO", descripcion: l.descripcion, marca: l.marca, modelo: l.modelo,
              cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario,
              costoUnitario: 0, subtotal: l.subtotal,
              esExterno: false, esIncluido: false, equipoId: l.equipoId,
              notas: buildNotasValue(l.categoria, notasLimpia),
              ...deficitFields,
            };
          }),
          ...lineasPaquete.map(l => ({
            tipo: "PAQUETE", descripcion: l.nombre,
            cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario,
            costoUnitario: 0, subtotal: l.subtotal,
            esExterno: false, esIncluido: false,
            notas: l.categoria ? `cat:${l.categoria}` : null,
            notasInternas: JSON.stringify({ paqueteId: l.productoId, componentes: l.componentes }),
          })),
          ...lineasExterno.map(l => ({
            tipo: "EQUIPO_EXTERNO", descripcion: l.descripcion, marca: l.marca,
            cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario,
            costoUnitario: l.costoProveedor,
            subtotal: l.subtotal, esExterno: true, esIncluido: false, equipoId: l.equipoId,
            proveedorId: l.proveedorId ?? null,
            notas: l.categoria ? `cat:${l.categoria}` : null,
          })),
          ...lineasOp.map(l => ({
            tipo: "OPERACION_TECNICA", descripcion: l.descripcion,
            nivel: l.nivel, jornada: l.jornada, cantidad: l.cantidad, dias: l.dias,
            precioUnitario: l.precioUnitario, costoUnitario: l.precioUnitario,
            subtotal: l.subtotal, esExterno: false, esIncluido: false, rolTecnicoId: l.rolTecnicoId,
          })),
          ...jornadasPlan.flatMap(j =>
            j.slots
              .filter(s => s.rolId && s.tarifa > 0)
              .map(s => ({
                tipo: "OPERACION_TECNICA",
                descripcion: `${s.rolNombre} (${j.tipo === "MONTAJE" ? "Montaje" : j.tipo === "OPERACION" ? "Operación" : j.tipo === "DESMONTAJE" ? "Desmontaje" : j.tipo}${j.fecha ? ` · ${j.fecha}` : ""})`,
                nivel: s.nivel, jornada: s.jornada,
                cantidad: s.cantidad, dias: 1,
                precioUnitario: s.tarifa, costoUnitario: s.tarifa,
                subtotal: s.tarifa * s.cantidad,
                esExterno: false, esIncluido: false,
                rolTecnicoId: s.rolId,
                notas: "from:jornada",
              }))
          ),
          ...lineasDJ.map(l => ({
            tipo: "DJ", descripcion: `DJ ${l.nivel} (${l.horas}h)`,
            nivel: l.nivel, cantidad: l.horas, dias: 1,
            precioUnitario: l.tarifa, costoUnitario: l.tarifa,
            subtotal: l.subtotal, esExterno: false, esIncluido: false,
          })),
          ...lineasLog.map(l => ({
            tipo: l.tipo, descripcion: l.concepto, cantidad: l.cantidad, dias: l.dias,
            precioUnitario: l.precioUnitario, costoUnitario: l.precioUnitario,
            subtotal: l.subtotal, esExterno: false, esIncluido: false,
          })),
          ...lineasOcasional.map(l => ({
            tipo: "OTRO", descripcion: l.descripcion, cantidad: l.cantidad, dias: l.dias,
            precioUnitario: l.precioUnitario, costoUnitario: 0,
            subtotal: l.subtotal, esExterno: false, esIncluido: false,
          })),
          ...(resumen.bonusZonaTotal > 0 ? [{
            tipo: "OPERACION_TECNICA",
            descripcion: `Extra de zona ${zonaEvento === "BAJIO" ? "Bajío" : "Nacional"} · ${numTecnicosZona} técnico${numTecnicosZona !== 1 ? "s" : ""}`,
            cantidad: numTecnicosZona, dias: 1,
            precioUnitario: resumen.zonaBonus, costoUnitario: resumen.zonaBonus,
            subtotal: resumen.bonusZonaTotal, esExterno: false, esIncluido: false,
            notas: "zona:bonus",
          }] : []),
        ];

        const autoPayload = {
          clienteId: cId,
          ...evento,
          zonaEvento,
          numTecnicosZona,
          notasSecciones: Object.keys(notasSecciones).length > 0 ? JSON.stringify(notasSecciones) : null,
          jornadasPlan: jornadasPlan.length > 0 ? jornadasPlan : null,
          observaciones,
          lineas: todasLineasAuto,
          subtotalEquiposBruto: resumen.subtotalEquiposBruto,
          descuentoVolumenPct: volumenActivo ? cfgPctVolumen / 100 : 0,
          descuentoB2bPct: b2bActivo ? cfgPctB2b / 100 : 0,
          descuentoMultidiaPct: dMultidiaPreservado,
          descuentoEspecialPct: dEspecialPreservado,
          descuentoEspecialNota: dEspecialNotaPreservada,
          descuentoPatrocinioPct: dPatrocinioPreservado,
          descuentoPatrocinioNota: dPatrocinioNotaPreservada,
          descuentoFamilyFriendsPct: manualActivo && !manualEsMonto ? (parseFloat(manualValor) || 0) / 100 : 0,
          descuentoFijoMonto: manualActivo && manualEsMonto ? (parseFloat(manualValor) || 0) : (dFijoPreservado || 0),
          descuentoManualRazon: manualActivo ? manualRazon : null,
          descuentoManualEsMonto: manualActivo && manualEsMonto,
          descuentoTotalPct: resumen.descuentoTotalPct,
          montoDescuento: resumen.montoDescuento,
          montoBeneficio: resumen.montoDescuento,
          subtotalEquiposNeto: resumen.subtotalEquiposNeto,
          pagoAnticipadoActivo,
          pagoAnticipadoFecha: pagoAnticipadoFecha || null,
          pagoAnticipadoTexto: pagoAnticipadoActivo ? (pagoAnticipadoTexto || cfgTextoAnticipado.replace("{pct}", String(cfgPctAnticipado))) : null,
          subtotalPaquetes: resumen.subtotalPaquetes,
          subtotalTerceros: resumen.subtotalExternos + resumen.subtotalOcasionales,
          subtotalOperacion: resumen.subtotalOperacion + resumen.subtotalDJ,
          subtotalTransporte: resumen.subtotalTransporte,
          subtotalComidas: resumen.subtotalComidas,
          subtotalHospedaje: resumen.subtotalHospedaje,
          total: resumen.total,
          aplicaIva,
          incluirChofer,
          montoIva: resumen.montoIva,
          granTotal: resumen.granTotal,
          costosTotalesEstimados: resumen.costos,
          utilidadEstimada: resumen.utilidad,
          porcentajeUtilidad: resumen.pctUtilidad,
        };

        await fetch(`/api/cotizaciones/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(autoPayload),
        });
        setAutoSaved(true);
        // Ocultar el indicador tras 3 segundos
        setTimeout(() => setAutoSaved(false), 3000);
      } catch {
        // Silencioso — no interrumpir al usuario con errores de red
      } finally {
        setAutoSaving(false);
      }
    }, 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editId,
    evento, observaciones, aplicaIva, incluirChofer,
    lineasEquipo, lineasPaquete, lineasExterno, lineasOp, lineasDJ, lineasLog, lineasOcasional,
    jornadasPlan, notasSecciones, zonaEvento, numTecnicosZona,
    volumenActivo, b2bActivo, manualActivo, manualEsMonto, manualValor, manualRazon,
    pagoAnticipadoActivo, pagoAnticipadoFecha, pagoAnticipadoTexto,
  ]);

  // ── Guardar ──
  async function guardar() {
    const tId = resolvedTratoId || tratoId || manualTratoId;
    const cId = resolvedClienteId || clienteId || manualClienteId;
    if (!cId) {
      setClienteSelectorError(true);
      setError("Selecciona un cliente para continuar");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setClienteSelectorError(false);
    setSaving(true); setError("");

    const todasLineas = [
      ...lineasEquipo.map(l => {
        const notasRaw = l.notas ?? '';
        const deficitMatch = notasRaw.match(/\|?deficit:(\{.*\})$/);
        let deficitFields = {};
        let notasLimpia = notasRaw;
        if (deficitMatch) {
          try { deficitFields = JSON.parse(deficitMatch[1]); } catch { /* ignore */ }
          notasLimpia = notasRaw.replace(/\|?deficit:\{.*\}$/, '');
        }
        return {
          tipo: "EQUIPO_PROPIO", descripcion: l.descripcion, marca: l.marca, modelo: l.modelo,
          cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario,
          costoUnitario: 0, subtotal: l.subtotal,
          esExterno: false, esIncluido: false, equipoId: l.equipoId,
          notas: buildNotasValue(l.categoria, notasLimpia),
          ...deficitFields,
        };
      }),
      ...lineasPaquete.map(l => ({
        tipo: "PAQUETE", descripcion: l.nombre,
        cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario,
        costoUnitario: 0, subtotal: l.subtotal,
        esExterno: false, esIncluido: false,
        notas: l.categoria ? `cat:${l.categoria}` : null,
        notasInternas: JSON.stringify({ paqueteId: l.productoId, componentes: l.componentes }),
      })),
      ...lineasExterno.map(l => ({
        tipo: "EQUIPO_EXTERNO", descripcion: l.descripcion, marca: l.marca,
        cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario,
        costoUnitario: l.costoProveedor, // guardamos el costo del proveedor para recuperarlo en edición
        subtotal: l.subtotal,
        esExterno: true, esIncluido: false, equipoId: l.equipoId,
        proveedorId: l.proveedorId ?? null,
        notas: l.categoria ? `cat:${l.categoria}` : null,
      })),
      ...lineasOp.map(l => ({
        tipo: "OPERACION_TECNICA", descripcion: l.descripcion,
        nivel: l.nivel, jornada: l.jornada, cantidad: l.cantidad, dias: l.dias,
        precioUnitario: l.precioUnitario, costoUnitario: l.precioUnitario,
        subtotal: l.subtotal, esExterno: false, esIncluido: false, rolTecnicoId: l.rolTecnicoId,
      })),
      ...jornadasPlan.flatMap(j =>
        j.slots
          .filter(s => s.rolId && s.tarifa > 0)
          .map(s => ({
            tipo: "OPERACION_TECNICA",
            descripcion: `${s.rolNombre} (${j.tipo === "MONTAJE" ? "Montaje" : j.tipo === "OPERACION" ? "Operación" : j.tipo === "DESMONTAJE" ? "Desmontaje" : j.tipo}${j.fecha ? ` · ${j.fecha}` : ""})`,
            nivel: s.nivel, jornada: s.jornada,
            cantidad: s.cantidad, dias: 1,
            precioUnitario: s.tarifa, costoUnitario: s.tarifa,
            subtotal: s.tarifa * s.cantidad,
            esExterno: false, esIncluido: false,
            rolTecnicoId: s.rolId,
            notas: "from:jornada",
          }))
      ),
      ...lineasDJ.map(l => ({
        tipo: "DJ", descripcion: `DJ ${l.nivel} (${l.horas}h)`,
        nivel: l.nivel, cantidad: l.horas, dias: 1,
        precioUnitario: l.tarifa, costoUnitario: l.tarifa,
        subtotal: l.subtotal, esExterno: false, esIncluido: false,
      })),
      ...lineasLog.map(l => ({
        tipo: l.tipo, descripcion: l.concepto, cantidad: l.cantidad, dias: l.dias,
        precioUnitario: l.precioUnitario, costoUnitario: l.precioUnitario,
        subtotal: l.subtotal, esExterno: false, esIncluido: false,
      })),
      ...lineasOcasional.map(l => ({
        tipo: "OTRO", descripcion: l.descripcion, cantidad: l.cantidad, dias: l.dias,
        precioUnitario: l.precioUnitario, costoUnitario: 0,
        subtotal: l.subtotal, esExterno: false, esIncluido: false,
      })),
      // Comisión interna como línea OTRO al guardar
      ...(gastosActivo && resumen.gastosProduccionMonto > 0 ? [{
        tipo: "OTRO", descripcion: "Gastos de Producción", cantidad: 1, dias: 1,
        precioUnitario: resumen.gastosProduccionMonto, costoUnitario: 0,
        subtotal: resumen.gastosProduccionMonto, esExterno: false, esIncluido: false,
      }] : []),
      ...(resumen.bonusZonaTotal > 0 ? [{
        tipo: "OPERACION_TECNICA",
        descripcion: `Extra de zona ${zonaEvento === "BAJIO" ? "Bajío" : "Nacional"} · ${numTecnicosZona} técnico${numTecnicosZona !== 1 ? "s" : ""}`,
        cantidad: numTecnicosZona, dias: 1,
        precioUnitario: resumen.zonaBonus, costoUnitario: resumen.zonaBonus,
        subtotal: resumen.bonusZonaTotal, esExterno: false, esIncluido: false,
        notas: "zona:bonus",
      }] : []),
    ];

    const payload = {
      tratoId: tId || null, clienteId: cId, ...evento,
      zonaEvento,
      numTecnicosZona,
      notasSecciones: Object.keys(notasSecciones).length > 0 ? JSON.stringify(notasSecciones) : null,
      jornadasPlan: jornadasPlan.length > 0 ? jornadasPlan : null,
      observaciones,
      lineas: todasLineas,
      // Descuentos
      subtotalEquiposBruto: resumen.subtotalEquiposBruto,
      descuentoVolumenPct:      volumenActivo  ? cfgPctVolumen  / 100 : 0,
      descuentoB2bPct:           b2bActivo      ? cfgPctB2b      / 100 : 0,
      descuentoMultidiaPct:      dMultidiaPreservado,
      descuentoEspecialPct:      dEspecialPreservado,
      descuentoEspecialNota:     dEspecialNotaPreservada,
      descuentoPatrocinioPct:    dPatrocinioPreservado,
      descuentoPatrocinioNota:   dPatrocinioNotaPreservada,
      // Manual: guarda en FamilyFriendsPct (%) o FijoMonto ($) según modo
      descuentoFamilyFriendsPct: manualActivo && !manualEsMonto ? (parseFloat(manualValor) || 0) / 100 : 0,
      descuentoFijoMonto:        manualActivo && manualEsMonto  ? (parseFloat(manualValor) || 0) : (dFijoPreservado || 0),
      descuentoManualRazon:      manualActivo ? manualRazon : null,
      descuentoManualEsMonto:    manualActivo && manualEsMonto,
      descuentoTotalPct:  resumen.descuentoTotalPct,
      montoDescuento:     resumen.montoDescuento,
      montoBeneficio:     resumen.montoDescuento,
      subtotalEquiposNeto: resumen.subtotalEquiposNeto,
      // Pago anticipado
      pagoAnticipadoActivo:  pagoAnticipadoActivo,
      pagoAnticipadoFecha:   pagoAnticipadoFecha || null,
      pagoAnticipadoTexto:   pagoAnticipadoActivo ? (pagoAnticipadoTexto || cfgTextoAnticipado.replace("{pct}", String(cfgPctAnticipado))) : null,
      subtotalPaquetes: resumen.subtotalPaquetes,
      subtotalTerceros: resumen.subtotalExternos + resumen.subtotalOcasionales + (gastosActivo ? resumen.gastosProduccionMonto : 0),
      subtotalOperacion: resumen.subtotalOperacion + resumen.subtotalDJ,
      subtotalTransporte: resumen.subtotalTransporte,
      subtotalComidas: resumen.subtotalComidas,
      subtotalHospedaje: resumen.subtotalHospedaje,
      total: resumen.total,
      aplicaIva,
      incluirChofer,
      montoIva: resumen.montoIva,
      granTotal: resumen.granTotal,
      costosTotal: resumen.costos,
      utilidadEstimada: resumen.utilidad,
      porcentajeUtilidad: resumen.pctUtilidad,
      // Comisión interna
      gastosProduccionActivo: gastosActivo,
      gastosProduccionEsMonto: gastosEsMonto,
      gastosProduccionPct: !gastosEsMonto ? (parseFloat(gastosValor) || 0) / 100 : 0,
      gastosProduccionMonto: gastosActivo ? resumen.gastosProduccionMonto : 0,
    };

    try {
      // Modo edición: PATCH al ID existente
      if (editId) {
        const res = await fetch(`/api/cotizaciones/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); setSaving(false); return; }
        router.push(`/cotizaciones/${editId}`);
        return;
      }
      // Modo nuevo: POST
      const res = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error desconocido al crear"); setSaving(false); return; }
      const { cotizacion } = await res.json();
      router.push(`/cotizaciones/${cotizacion.id}`);
    } catch (e) { setError(`Error de conexión: ${e instanceof Error ? e.message : String(e)}`); setSaving(false); }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ms-h1">{editId ? "Editar Cotización" : "Nueva Cotización"}</h1>
          {clienteNombre && <p className="text-[#B3985B] text-sm mt-0.5">{clienteNombre}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {plantillas.length > 0 && (
            <button
              onClick={() => setShowPlantillas(true)}
              className="px-4 py-2 rounded-lg border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10 text-sm font-medium inline-flex items-center gap-1.5"
            >
              <ClipboardList strokeWidth={1.75} className="w-3.5 h-3.5" /> Cargar plantilla
            </button>
          )}
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm">Cancelar</button>
          <button onClick={guardar} disabled={saving} className="px-6 py-2.5 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50">
            {saving ? "Guardando..." : editId ? "Guardar cambios" : "Guardar borrador"}
          </button>
        </div>
        {editId && (
          <div className="text-xs text-right mt-1 min-h-[16px]">
            {autoSaving && <span className="text-gray-500">Guardando automáticamente...</span>}
            {!autoSaving && autoSaved && <span className="text-green-500">✓ Guardado automáticamente</span>}
          </div>
        )}
      </div>

      {/* Modal cargar plantilla */}
      {showPlantillas && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
              <h2 className="text-white font-semibold">Cargar plantilla</h2>
              <button onClick={() => setShowPlantillas(false)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {plantillas.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">Sin plantillas guardadas aún</p>
              ) : plantillas.map(p => (
                <button
                  key={p.id}
                  disabled={cargandoPlantilla}
                  onClick={async () => {
                    const hasItems = lineasEquipo.length > 0 || lineasExterno.length > 0 || lineasOp.length > 0 || lineasDJ.length > 0 || lineasLog.length > 0 || lineasOcasional.length > 0;
                    if (hasItems) {
                      const ok = await confirm({
                        message: "Cargar una plantilla reemplazará todos los conceptos actuales de la cotización. ¿Deseas continuar?",
                        confirmText: "Reemplazar y cargar",
                        danger: true
                      });
                      if (!ok) return;
                    }
                    setCargandoPlantilla(true);
                    const res = await fetch(`/api/plantillas-cotizacion`, { cache: "no-store" });
                    const d = await res.json();
                    const plantilla = d.plantillas?.find((pl: { id: string }) => pl.id === p.id);
                    if (plantilla) {
                      type PL = { tipo: string; equipoId: string | null; rolTecnicoId: string | null; descripcion: string; marca: string | null; nivel: string | null; jornada: string | null; cantidad: number; dias: number; precioUnitario: number; costoUnitario: number; subtotal: number; proveedorId: string | null; notas: string | null };
                      const lineas = plantilla.lineas as PL[];

                      const propios = lineas.filter(l => l.tipo === "EQUIPO_PROPIO");
                      if (propios.length > 0) setLineasEquipo(propios.map(l => ({
                        id: uid(), equipoId: l.equipoId ?? "", descripcion: l.descripcion,
                        marca: l.marca ?? "",
                        modelo: (l as {modelo?:string|null}).modelo ?? "",
                        categoria: l.notas?.startsWith("cat:") ? (l.notas.split("|")[0].slice(4)) : "",
                        notas: extractUserNote(l.notas),
                        cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario,
                        subtotal: l.precioUnitario * l.cantidad * l.dias,
                      })));

                      const externos = lineas.filter(l => l.tipo === "EQUIPO_EXTERNO");
                      if (externos.length > 0) setLineasExterno(externos.map(l => ({
                        id: uid(), equipoId: l.equipoId ?? "", descripcion: l.descripcion,
                        marca: l.marca ?? "", cantidad: l.cantidad, dias: l.dias,
                        precioUnitario: l.precioUnitario, costoProveedor: l.costoUnitario ?? 0,
                        subtotal: l.subtotal, costoTotal: (l.costoUnitario ?? 0) * l.cantidad * l.dias,
                        proveedorId: l.proveedorId ?? null,
                        categoria: l.notas?.startsWith("cat:") ? l.notas.split("|")[0].slice(4) : "",
                      })));

                      const ops = lineas.filter(l => l.tipo === "OPERACION_TECNICA");
                      if (ops.length > 0) setLineasOp(ops.map(l => ({
                        id: uid(), rolTecnicoId: l.rolTecnicoId ?? "", descripcion: l.descripcion,
                        nivel: l.nivel ?? "AA", jornada: l.jornada ?? "MEDIA",
                        cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario, subtotal: l.subtotal,
                      })));

                      const djs = lineas.filter(l => l.tipo === "DJ");
                      if (djs.length > 0) setLineasDJ(djs.map(l => ({
                        id: uid(), nivel: l.nivel ?? "AA", horas: l.cantidad,
                        tarifa: l.precioUnitario, subtotal: l.subtotal,
                      })));

                      const logs = lineas.filter(l => ["TRANSPORTE","COMIDA","HOSPEDAJE"].includes(l.tipo));
                      if (logs.length > 0) setLineasLog(logs.map(l => ({
                        id: uid(), tipo: l.tipo as "COMIDA"|"TRANSPORTE"|"HOSPEDAJE",
                        concepto: l.descripcion, precioUnitario: l.precioUnitario,
                        cantidad: l.cantidad, dias: l.dias, subtotal: l.subtotal,
                      })));

                      const ocasionales = lineas.filter(l => l.tipo === "OTRO");
                      if (ocasionales.length > 0) setLineasOcasional(ocasionales.map(l => ({
                        id: uid(), descripcion: l.descripcion,
                        cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario, subtotal: l.subtotal,
                      })));
                    }
                    setCargandoPlantilla(false);
                    setShowPlantillas(false);
                  }}
                  className="w-full text-left bg-[#111] border border-[#222] hover:border-[#B3985B]/50 rounded-xl px-4 py-3 transition-colors"
                >
                  <p className="text-white text-sm font-medium">{p.nombre}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{p.tipoEvento ?? "Todos los tipos"} · {p.lineas.length} líneas</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <div className="mb-4 bg-red-900/20 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* ── Selector de cliente cuando no vienen params en URL ── */}
      {noParams && (
        <div className="mb-5 bg-[#111] border border-[#262626] rounded-xl p-5">
          <p className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-4">Datos del cliente</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente searchable */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Cliente <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="manual-cliente-input"
                  type="text"
                  value={manualClienteId ? manualClienteNombre : manualClienteQuery}
                  onChange={async e => {
                    const q = e.target.value;
                    setManualClienteQuery(q);
                    setManualClienteId("");
                    setManualClienteNombre("");
                    setClienteSelectorError(false);
                    setManualClienteOpen(true);
                    if (q.length >= 1) {
                      const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}&limit=10`);
                      const d = await res.json();
                      setManualClienteResults(d.clientes ?? []);
                    } else {
                      setManualClienteResults([]);
                    }
                  }}
                  onFocus={() => setManualClienteOpen(true)}
                  onBlur={() => setTimeout(() => setManualClienteOpen(false), 200)}
                  placeholder="Buscar cliente..."
                  className={`w-full bg-[#0d0d0d] border rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#B3985B]/60 transition-colors ${
                    clienteSelectorError && !manualClienteId
                      ? 'border-red-500'
                      : manualClienteId
                      ? 'border-[#B3985B]/40 text-[#B3985B]'
                      : 'border-[#262626]'
                  }`}
                />
                {manualClienteOpen && manualClienteResults.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#111] border border-[#262626] rounded-lg shadow-xl max-h-52 overflow-y-auto">
                    {manualClienteResults.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => {
                          setManualClienteId(c.id);
                          setManualClienteNombre(`${c.nombre}${c.empresa ? ` · ${c.empresa}` : ''}`);
                          setManualClienteQuery(`${c.nombre}${c.empresa ? ` · ${c.empresa}` : ''}`);
                          setManualClienteOpen(false);
                          setClienteSelectorError(false);
                          // Cargar tratos del cliente
                          fetch(`/api/tratos?clienteId=${c.id}`).then(r => r.json()).then(d => {
                            setManualTratos((d.tratos ?? []).filter((t: {etapa:string}) => !['VENTA_CERRADA','VENTA_PERDIDA'].includes(t.etapa)));
                          });
                          // Cargar precios especiales del cliente
                          fetch(`/api/clientes/${c.id}/precios-equipos`).then(r => r.json()).then(pd => {
                            if (pd?.precios) {
                              const mapa: Record<string, number> = {};
                              const mapaOrig: Record<string, number | null> = {};
                              for (const [eqId, v] of Object.entries(pd.precios as Record<string, { precio: number; precioOriginal: number | null }>)) {
                                mapa[eqId] = v.precio;
                                mapaOrig[eqId] = v.precioOriginal ?? null;
                              }
                              setPreciosCliente(mapa);
                              setPreciosClienteOriginal(mapaOrig);
                            }
                          });
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#1a1a1a] transition-colors"
                      >
                        <p className="text-sm text-white">{c.nombre}</p>
                        {c.empresa && <p className="text-xs text-gray-500">{c.empresa}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {clienteSelectorError && !manualClienteId && (
                <p className="text-red-400 text-xs mt-1">Selecciona un cliente para continuar</p>
              )}
            </div>

            {/* Trato vinculado (opcional) */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Trato vinculado <span className="text-gray-600">(opcional)</span>
              </label>
              <select
                value={manualTratoId}
                onChange={e => setManualTratoId(e.target.value)}
                disabled={!manualClienteId}
                className="w-full bg-[#0d0d0d] border border-[#262626] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#B3985B]/60 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">— Sin trato vinculado —</option>
                {manualTratos.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.tipoEvento ?? 'Evento'}{t.nombreEvento ? ` — ${t.nombreEvento}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Briefing del trato ── */}
      {(tratoNotas || tratoArchivos.length > 0 || tratoFormEstado === "COMPLETADO") && (
        <details className="mb-5 bg-[#0d0d0d] border border-[#B3985B]/30 rounded-xl group" open>
          <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none">
            <span className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">Briefing del cliente</span>
            {tratoFormEstado === "COMPLETADO" && (
              <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded">Formulario completado ✓</span>
            )}
            {tratoArchivos.length > 0 && (
              <span className="text-gray-600 text-xs">{tratoArchivos.length} archivo{tratoArchivos.length !== 1 ? "s" : ""}</span>
            )}
            <span className="text-gray-600 text-xs ml-auto group-open:hidden">▶ ver</span>
            <span className="text-gray-600 text-xs ml-auto hidden group-open:inline">▼ ocultar</span>
          </summary>
          <div className="px-5 pb-4 space-y-4">
            {tratoFormEstado === "COMPLETADO" && resolvedTratoId && (
              <div className="flex items-center justify-between bg-[#111] rounded-lg px-3 py-2">
                <p className="text-green-400 text-xs">El prospecto completó el formulario de descubrimiento</p>
                <a
                  href={`/api/tratos/${resolvedTratoId}/form-pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-gray-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  ↓ Ver formulario PDF
                </a>
              </div>
            )}
            {tratoNotas && (
              <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{tratoNotas}</pre>
            )}
            {tratoArchivos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:grid-cols-4 border-t border-[#1a1a1a] pt-3">
                {tratoArchivos.map((a) => {
                  const esImagen = a.tipo === "IMAGEN" || /\.(jpe?g|png|gif|webp|heic)$/i.test(a.url);
                  return (
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                      className="ms-card rounded-lg overflow-hidden hover:border-[#B3985B]/40 transition-colors">
                      {esImagen ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.url} alt={a.nombre} className="w-full h-20 object-cover" />
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-3">
                          <span className="text-gray-500">
                            {/\.pdf$/i.test(a.url) ? <File strokeWidth={1.75} className="w-5 h-5" /> : /\.(doc|docx)$/i.test(a.url) ? <FileText strokeWidth={1.75} className="w-5 h-5" /> : /\.(xls|xlsx)$/i.test(a.url) ? <BarChart3 strokeWidth={1.75} className="w-5 h-5" /> : <Paperclip strokeWidth={1.75} className="w-5 h-5" />}
                          </span>
                          <span className="text-gray-400 text-xs truncate">{a.nombre}</span>
                        </div>
                      )}
                      <p className="px-2 py-1 text-gray-600 text-xs truncate border-t border-[#1a1a1a]">{a.nombre}</p>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </details>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* ── Datos del evento ── */}
          <Seccion titulo="Datos del evento">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input label="Nombre del evento" value={evento.nombreEvento} onChange={e => setEvento(p => ({ ...p, nombreEvento: e.target.value }))} placeholder="Boda García, Concierto XYZ..." />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo de evento</label>
                <Combobox
                  value={evento.tipoEvento}
                  onChange={v => setEvento(p => ({ ...p, tipoEvento: v }))}
                  options={[{ value: "MUSICAL", label: "Musical" }, { value: "SOCIAL", label: "Social" }, { value: "EMPRESARIAL", label: "Empresarial" }, { value: "OTRO", label: "Otro" }]}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo de servicio</label>
                <Combobox
                  value={evento.tipoServicio}
                  onChange={v => setEvento(p => ({ ...p, tipoServicio: v }))}
                  options={[{ value: "", label: "— Sin especificar —" }, { value: "RENTA", label: "Renta de Equipo" }, { value: "PRODUCCION_TECNICA", label: "Producción Técnica" }, { value: "DIRECCION_TECNICA", label: "Dirección Técnica" }]}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <Input label="Fecha del evento" type="date" value={evento.fechaEvento} onChange={e => setEvento(p => ({ ...p, fechaEvento: e.target.value }))} />
              <div>
                <VenuePicker label="Lugar del evento" value={evento.lugarEvento} onChange={(v) => setEvento(p => ({ ...p, lugarEvento: v }))} placeholder="Venue, ciudad..." />
              </div>
              <Input label="Asistentes estimados" type="number" min="1" value={asistentesEstimados ?? ""} onChange={e => setAsistentesEstimados(e.target.value ? parseInt(e.target.value) : null)} placeholder="Número de invitados" />
              <Input label="Horas de operación" type="number" min="1" value={evento.horasOperacion} onChange={e => setEvento(p => ({ ...p, horasOperacion: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2 col-span-1">
                <Input label="Días equipo" type="number" min="1" value={evento.diasEquipo} onChange={e => setEvento(p => ({ ...p, diasEquipo: e.target.value }))} />
                <Input label="Días operación" type="number" min="1" value={evento.diasOperacion} onChange={e => setEvento(p => ({ ...p, diasOperacion: e.target.value }))} />
              </div>
            </div>
          </Seccion>

          {/* ── Sugerencia de equipo (derivada del descubrimiento) ── */}
          {(equiposInteres.categorias.length > 0 || equiposInteres.equipos.length > 0 || equiposInteres.extras.length > 0 || equiposInteres.productos.length > 0 || equiposInteres.paquetes.length > 0) && (() => {
            const catsSel = equiposInteres.categorias
              .map(id => categoriasList.find(c => c.id === id)?.nombre)
              .filter((n): n is string => !!n);
            const eqsSel = equiposInteres.equipos
              .map(id => equipos.find(e => e.id === id))
              .filter((e): e is Equipo => !!e);
            const extrasSel = equiposInteres.extras ?? [];
            const paqSel = equiposInteres.productos
              .map(p => productosCatalogo.find(pc => pc.id === p.id))
              .filter((p): p is typeof productosCatalogo[number] => !!p);
            const paqComSel = equiposInteres.paquetes
              .map(p => paquetesCatalogo.find(pc => pc.id === p.id))
              .filter((p): p is PaqueteCat => !!p);
            if (catsSel.length === 0 && eqsSel.length === 0 && extrasSel.length === 0 && paqSel.length === 0 && paqComSel.length === 0) return null;
            return (
              <details className="bg-[#0d0d0d] border border-[#B3985B]/30 rounded-xl group" open>
                <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none">
                  <span className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">Sugerencia de equipo</span>
                  <span className="text-gray-500 text-xs">Seleccionado en descubrimiento</span>
                  <span className="ml-auto text-gray-600 text-xs group-open:hidden">▶ ver</span>
                  <span className="ml-auto text-gray-600 text-xs hidden group-open:inline">▼ ocultar</span>
                </summary>
                {eqsSel.some(eq => !lineasEquipo.some(l => l.equipoId === eq.id)) && (
                  <div className="px-5 -mt-1 pb-2">
                    <button
                      onClick={agregarTodasSugerencias}
                      className="text-[11px] px-3 py-1 rounded-lg bg-[#B3985B] text-black font-semibold hover:bg-[#c9a96a] transition-colors"
                    >
                      + Agregar todos a la cotización
                    </button>
                  </div>
                )}
                <div className="px-5 pb-5 space-y-4">
                  {paqComSel.length > 0 && (
                    <div>
                      <p className="text-[#B3985B] text-[10px] font-bold uppercase tracking-wider mb-2 inline-flex items-center gap-1.5"><Sparkles strokeWidth={1.75} className="w-3.5 h-3.5" /> Paquetes seleccionados</p>
                      <div className="space-y-1.5">
                        {paqComSel.map(paq => {
                          const sel = equiposInteres.paquetes.find(p => p.id === paq.id);
                          const paqCant = sel?.cantidad && sel.cantidad > 0 ? sel.cantidad : 1;
                          const yaExpandido = paquetesExpandidos.includes(paq.id);
                          const numEq = paq.items.filter(it => it.tipo !== "PRODUCTO").length;
                          const numProd = paq.items.filter(it => it.tipo === "PRODUCTO").length;
                          return (
                            <div key={paq.id} className="flex items-start gap-2 text-sm">
                              <span className="flex-1 leading-snug text-gray-300 min-w-0">
                                <span className="font-medium">{paq.nombre}</span>
                                {paqCant > 1 && <span className="ml-1.5 text-[10px] text-[#B3985B] font-semibold bg-[#B3985B]/10 rounded px-1.5 py-0.5">{paqCant}×</span>}
                                <span className="block text-[10px] text-gray-500 mt-0.5">
                                  {[numEq ? `${numEq} equipo${numEq !== 1 ? "s" : ""}` : "", numProd ? `${numProd} producto${numProd !== 1 ? "s" : ""}` : "", paq.conceptos.length ? `${paq.conceptos.length} concepto${paq.conceptos.length !== 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ")}
                                </span>
                              </span>
                              {!yaExpandido ? (
                                <button
                                  onClick={() => expandirPaqueteDescubrimiento(paq)}
                                  className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-[#B3985B]/15 text-[#B3985B] hover:bg-[#B3985B]/30 transition-colors leading-5"
                                >
                                  + Desglosar paquete
                                </button>
                              ) : (
                                <span className="shrink-0 text-[10px] text-green-500 px-1 leading-5">✓ desglosado</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-gray-700 text-[11px] mt-2">El paquete se desglosa en líneas individuales (equipos, productos y conceptos) que puedes ajustar libremente.</p>
                    </div>
                  )}
                  {paqSel.length > 0 && (
                    <div>
                      <p className="text-[#B3985B] text-[10px] font-bold uppercase tracking-wider mb-2 inline-flex items-center gap-1.5"><Package strokeWidth={1.75} className="w-3.5 h-3.5" /> Productos seleccionados</p>
                      <div className="space-y-1.5">
                        {paqSel.map(prod => {
                          const sel = equiposInteres.productos.find(p => p.id === prod.id);
                          const paqCant = sel?.cantidad && sel.cantidad > 0 ? sel.cantidad : 1;
                          const yaAgregado = paquetesAgregados.includes(prod.id);
                          return (
                            <div key={prod.id} className="flex items-start gap-2 text-sm">
                              <span className="flex-1 leading-snug text-gray-300 min-w-0">
                                <span className="font-medium">{prod.nombre}</span>
                                {paqCant > 1 && <span className="ml-1.5 text-[10px] text-[#B3985B] font-semibold bg-[#B3985B]/10 rounded px-1.5 py-0.5">{paqCant}×</span>}
                                <span className="block text-[10px] text-gray-500 mt-0.5">
                                  {prod.items.map(it => `${it.cantidad * paqCant}× ${it.equipo?.descripcion ?? ""}`).join(" · ")}
                                </span>
                              </span>
                              {!yaAgregado ? (
                                <button
                                  onClick={() => agregarPaqueteDescubrimiento(prod)}
                                  className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-[#B3985B]/15 text-[#B3985B] hover:bg-[#B3985B]/30 transition-colors leading-5"
                                >
                                  + Agregar paquete
                                </button>
                              ) : (
                                <span className="shrink-0 text-[10px] text-green-500 px-1 leading-5">✓ agregado</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-gray-700 text-[11px] mt-2">El paquete se agrega como un solo concepto; sus equipos cuentan para la disponibilidad de inventario.</p>
                    </div>
                  )}
                  {catsSel.length > 0 && (
                    <div>
                      <p className="text-[#B3985B] text-[10px] font-bold uppercase tracking-wider mb-2">Categorías de interés</p>
                      <div className="flex flex-wrap gap-2">
                        {catsSel.map(nombre => (
                          <span key={nombre} className="text-sm text-gray-300 bg-[#111] border border-[#1e1e1e] rounded-full px-3 py-1">{nombre}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {eqsSel.length > 0 && (
                    <div>
                      <p className="text-[#B3985B] text-[10px] font-bold uppercase tracking-wider mb-2">Equipos específicos</p>
                      <div className="space-y-1.5">
                        {eqsSel.map(eq => {
                          const yaAgregado = lineasEquipo.some(l => l.equipoId === eq.id);
                          const cant = equiposInteres.cantidades[eq.id];
                          return (
                            <div key={eq.id} className="flex items-start gap-2 text-sm">
                              <span className="flex-1 leading-snug text-gray-300">
                                {eq.descripcion}
                                {(eq.marca || eq.modelo) && <span className="ml-1 text-[10px] text-gray-500">{[eq.marca, eq.modelo].filter(Boolean).join(" ")}</span>}
                                {cant ? (
                                  <span className="ml-1.5 text-[10px] text-[#B3985B] font-semibold bg-[#B3985B]/10 rounded px-1.5 py-0.5">{cant} pz</span>
                                ) : (
                                  <span className="ml-1.5 text-[10px] text-gray-500 bg-[#1a1a1a] rounded px-1.5 py-0.5">sin cantidad</span>
                                )}
                              </span>
                              {!yaAgregado ? (
                                <button
                                  onClick={() => agregarEquipoDescubrimiento(eq, cant)}
                                  className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-[#B3985B]/15 text-[#B3985B] hover:bg-[#B3985B]/30 transition-colors leading-5"
                                >
                                  + Agregar
                                </button>
                              ) : (
                                <span className="shrink-0 text-[10px] text-green-500 px-1 leading-5">✓</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {extrasSel.length > 0 && (
                    <div>
                      <p className="text-[#B3985B] text-[10px] font-bold uppercase tracking-wider mb-2">Equipos a mano (define su precio)</p>
                      <div className="space-y-1.5">
                        {extrasSel.map(ex => {
                          const yaAgregado = extrasAgregados.includes(ex.id);
                          const precio = extrasPrecios[ex.id] ?? "";
                          const cant = ex.cantidad && ex.cantidad > 0 ? ex.cantidad : 1;
                          return (
                            <div key={ex.id} className="flex items-center gap-2 text-sm">
                              <span className="flex-1 leading-snug text-gray-300 min-w-0">
                                <span className="truncate">{ex.nombre}</span>
                                {ex.categoria && <span className="ml-1 text-[10px] text-gray-500">{ex.categoria}</span>}
                                <span className="ml-1.5 text-[10px] text-[#B3985B] font-semibold bg-[#B3985B]/10 rounded px-1.5 py-0.5">{cant} pz</span>
                              </span>
                              {!yaAgregado ? (
                                <>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-gray-500 text-xs">$</span>
                                    <input
                                      type="number" min="0" inputMode="decimal"
                                      value={precio}
                                      onChange={e => setExtrasPrecios(p => ({ ...p, [ex.id]: e.target.value }))}
                                      onKeyDown={e => { if (e.key === "Enter") agregarExtraDescubrimiento(ex); }}
                                      placeholder="precio"
                                      className="w-20 bg-[#111] border border-[#2a2a2a] rounded px-2 py-0.5 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                                    />
                                  </div>
                                  <button
                                    onClick={() => agregarExtraDescubrimiento(ex)}
                                    disabled={!(parseFloat(precio) > 0)}
                                    className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-[#B3985B]/15 text-[#B3985B] hover:bg-[#B3985B]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors leading-5"
                                  >
                                    + Agregar
                                  </button>
                                </>
                              ) : (
                                <span className="shrink-0 text-[10px] text-green-500 px-1 leading-5">✓ agregado</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <p className="text-gray-700 text-xs pt-3 border-t border-[#1a1a1a]">
                    Basado en lo seleccionado durante el descubrimiento. Los equipos con cantidad la traen desde ahí; los que dicen “sin cantidad” se agregan con 1 pieza para que la ajustes manualmente. Los equipos a mano se agregan como conceptos adicionales con el precio que definas.
                  </p>
                </div>
              </details>
            );
          })()}

          {/* ── Equipos propios ── */}
          <Seccion titulo="Equipos propios" hint="aplican descuentos · precio editable por línea · ★ = precio especial del cliente">
            {/* Pestañas de la caja: equipo individual vs. catálogo de paquetes */}
            <div className="flex items-center gap-1.5 p-1 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setEquipoTab("individual")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${
                  equipoTab === "individual" ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                <SlidersHorizontal strokeWidth={1.75} className="w-3.5 h-3.5" /> Equipo individual
              </button>
              {productosCatalogo.length > 0 && (
                <button
                  type="button"
                  onClick={() => setEquipoTab("paquete")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 ${
                    equipoTab === "paquete"
                      ? "bg-gradient-to-r from-[#B3985B] to-[#d4b876] text-black shadow-lg shadow-[#B3985B]/25"
                      : "text-[#B3985B] bg-gradient-to-r from-[#B3985B]/15 to-[#B3985B]/5 ring-1 ring-[#B3985B]/40 hover:from-[#B3985B]/25"
                  }`}
                >
                  <Sparkles strokeWidth={1.75} className="w-3.5 h-3.5" /> Del catálogo de paquetes
                </button>
              )}
            </div>

            {/* Selector — equipo individual */}
            {equipoTab === "individual" && (
            <div className="flex gap-2 mb-4 items-end">
              {/* Cascade selector */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#555] mb-1 px-1">Equipo</p>
                <CascadeEquipoSelect
                  value={selEq}
                  onChange={setSelEq}
                  equiposPorCategoria={equiposPorCategoria}
                  dispMap={dispMap}
                  loadingDisp={loadingDisp}
                  preciosCliente={preciosCliente}
                  fechaEvento={evento.fechaEvento}
                />
              </div>
              {/* Cantidad */}
              <div className="shrink-0">
                <p className="text-[10px] text-[#555] mb-1 text-center">Cantidad</p>
                <NumSelect value={selEqCant} onChange={setSelEqCant} max={50} className="w-20 py-2" />
              </div>

              {/* Días */}
              <div className="shrink-0">
                <p className="text-[10px] text-[#555] mb-1 text-center">Días</p>
                <NumSelect value={selEqDias} onChange={setSelEqDias} max={10} className="w-20 py-2" />
              </div>

              {/* Agregar */}
              <button
                type="button"
                onClick={agregarEquipo}
                disabled={!selEq}
                className="shrink-0 px-3 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40 hover:bg-[#c9a96a] transition-colors"
              >
                + Agregar
              </button>
            </div>
            )}

            {/* Selector — catálogo de paquetes */}
            {equipoTab === "paquete" && (
            <div className="flex gap-2 mb-4 items-end">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#555] mb-1 px-1">Paquete / producto armado</p>
                <select
                  value={selPaq}
                  onChange={e => setSelPaq(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                >
                  <option value="">— Elige un paquete —</option>
                  {productosCatalogo.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} · {formatCurrency(p.precioFinal)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="shrink-0">
                <p className="text-[10px] text-[#555] mb-1 text-center">Cantidad</p>
                <NumSelect value={selPaqCant} onChange={setSelPaqCant} max={50} className="w-20 py-2" />
              </div>
              <div className="shrink-0">
                <p className="text-[10px] text-[#555] mb-1 text-center">Días</p>
                <NumSelect value={selEqDias} onChange={setSelEqDias} max={10} className="w-20 py-2" />
              </div>
              <button
                type="button"
                onClick={agregarPaqueteManual}
                disabled={!selPaq}
                className="shrink-0 px-3 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40 hover:bg-[#c9a96a] transition-colors"
              >
                + Agregar
              </button>
            </div>
            )}

            {(lineasEquipo.length === 0 && lineasPaquete.length === 0) ? (
              <p className="text-gray-600 text-sm text-center py-3">Sin equipos agregados</p>
            ) : (
              /* Subsecciones por categoría (equipos sueltos + paquetes armados) */
              (() => {
                const cats = Array.from(new Set([...lineasEquipo, ...lineasPaquete].map(l => l.categoria || "Sin categoría")));
                return cats.map(cat => {
                  const paqs = lineasPaquete.filter(l => (l.categoria || "Sin categoría") === cat);
                  const lins = lineasEquipo.filter(l => (l.categoria || "Sin categoría") === cat);
                  const subTotal = [...paqs, ...lins].reduce((s, l) => s + l.subtotal, 0);
                  return (
                    <div key={cat} className="mb-4 border border-[#222] rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between bg-[#0d0d0d] px-3 py-2">
                        <span className="text-[10px] font-semibold text-[#B3985B] uppercase tracking-wider">{cat}</span>
                        <span className="text-xs text-gray-400">{formatCurrency(subTotal)}</span>
                      </div>
                      {/* Nota por categoría */}
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#080808] border-b border-[#111]">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" className="shrink-0"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        <input
                          type="text"
                          placeholder="Descripción de categoría (aparece en el PDF)…"
                          value={notasSecciones[cat] ?? ""}
                          onChange={e => {
                            const val = e.target.value;
                            setNotasSecciones(prev => {
                              const next = { ...prev };
                              if (val.trim()) next[cat] = val;
                              else delete next[cat];
                              return next;
                            });
                          }}
                          className="flex-1 bg-transparent text-xs text-[#6b7280] placeholder-[#333] focus:outline-none focus:text-[#B3985B]/80 transition-colors"
                        />
                        {notasSecciones[cat] && (
                          <button
                            onClick={() => setNotasSecciones(prev => { const n = { ...prev }; delete n[cat]; return n; })}
                            className="text-[#333] hover:text-red-500 transition-colors shrink-0"
                            title="Borrar nota"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        )}
                      </div>

                      {paqs.map(l => (
                        <div key={l.id} className="border-t border-[#111] px-3 py-2 bg-[#B3985B]/[0.04]">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex-1 min-w-0 basis-full sm:basis-auto">
                              <div className="flex items-center gap-1.5">
                                <Package strokeWidth={1.75} className="w-3.5 h-3.5 text-[#B3985B] shrink-0" />
                                <p className="text-white text-sm truncate">{l.nombre}</p>
                                <span className="text-[10px] px-1.5 py-0.5 bg-[#B3985B]/20 text-[#B3985B] rounded font-medium shrink-0">paquete</span>
                              </div>
                              {l.componentes.length > 0 && (
                                <p className="text-gray-500 text-[10px] truncate pl-5">
                                  {l.componentes.map(c => {
                                    const eq = equipos.find(e => e.id === c.equipoId);
                                    return `${c.cantidad * l.cantidad}× ${eq?.descripcion ?? "equipo"}`;
                                  }).join(" · ")}
                                </p>
                              )}
                            </div>
                            <NumSelect value={String(l.cantidad)} onChange={v => updatePaquete(l.id, "cantidad", parseInt(v) || 1)} max={50} className="w-14 py-1" title="Cantidad" />
                            <NumSelect value={String(l.dias)} onChange={v => updatePaquete(l.id, "dias", parseInt(v) || 1)} max={10} className="w-14 py-1" title="Días" />
                            <input
                              type="number"
                              value={l.precioUnitario}
                              min="0"
                              onChange={e => updatePaquete(l.id, "precioUnitario", parseFloat(e.target.value) || 0)}
                              className="w-24 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white text-sm text-right"
                              title="Precio unitario"
                            />
                            <span className="w-24 text-right text-[#B3985B] text-sm font-medium shrink-0">{formatCurrency(l.subtotal)}</span>
                            <button
                              type="button"
                              onClick={() => removePaquete(l.id)}
                              className="text-gray-600 hover:text-red-400 text-lg leading-none shrink-0"
                              title="Quitar paquete"
                            >×</button>
                          </div>
                        </div>
                      ))}

                      {lins.map(l => {
                        const precioBase = equipos.find(e => e.id === l.equipoId)?.precioRenta ?? 0;
                        const tienePrecioEspecial = preciosCliente[l.equipoId] != null;
                        const precioOriginalCliente = preciosClienteOriginal[l.equipoId] ?? null;
                        const esPrecioModificado = l.precioUnitario !== precioBase;
                        const esPrecioEspecialActivo = tienePrecioEspecial && l.precioUnitario === preciosCliente[l.equipoId];
                        const precioDifiere = l.precioUnitario !== (preciosCliente[l.equipoId] ?? precioBase);
                        return (
                        <>
                        {/* Badge de disponibilidad por línea */}
                        {(() => {
                          const d = dispMap[l.equipoId];
                          if (!evento.fechaEvento || !d) return null;
                          const totalEnCot = lineasEquipo.filter(x => x.equipoId === l.equipoId).reduce((s, x) => s + x.cantidad, 0);
                          if (totalEnCot > d.total) {
                            return (
                              <div className="mx-3 mt-1 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-1.5 flex items-start gap-2">
                                <span className="text-red-400 text-xs font-semibold shrink-0 inline-flex items-center gap-1"><Ban strokeWidth={1.75} className="w-3.5 h-3.5" /> Sobrestock</span>
                                <span className="text-red-300 text-xs">
                                  Tienes {totalEnCot} unid. en esta cotización pero solo hay {d.total} en inventario.
                                  {d.comprometido > 0 && ` Comprometido en: ${d.eventos.map(e => e.ref).join(", ")}.`}
                                </span>
                              </div>
                            );
                          }
                          if (d.disponible < totalEnCot) {
                            return (
                              <div className="mx-3 mt-1 bg-yellow-900/20 border border-yellow-800/40 rounded-lg px-3 py-1.5 flex items-start gap-2">
                                <span className="text-yellow-400 text-xs font-semibold shrink-0 inline-flex items-center gap-1"><AlertTriangle strokeWidth={1.75} className="w-3.5 h-3.5" /> Stock comprometido</span>
                                <span className="text-yellow-300 text-xs">
                                  Quedan {d.disponible} disp. para {evento.fechaEvento}.
                                  {d.comprometido > 0 && ` En uso: ${d.eventos.map(e => e.ref).join(", ")}.`}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div key={l.id} className="border-t border-[#111]">
                          <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                            <div className="flex-1 min-w-0 basis-full sm:basis-auto">
                              <div className="flex items-center gap-1.5">
                                <p className="text-white text-sm truncate">{[l.marca, l.modelo].filter(Boolean).join(" ") || l.descripcion}</p>
                                {esPrecioEspecialActivo && (
                                  <span
                                    title={precioOriginalCliente != null ? `Precio especial (lista original: ${formatCurrency(precioOriginalCliente)})` : "Precio especial de este cliente"}
                                    className="text-[10px] px-1.5 py-0.5 bg-[#B3985B]/20 text-[#B3985B] rounded font-medium shrink-0 cursor-help">
                                    ★ especial{precioOriginalCliente != null ? ` · lista ${formatCurrency(precioOriginalCliente)}` : ""}
                                  </span>
                                )}
                                {!esPrecioEspecialActivo && esPrecioModificado && (
                                  <span title="Precio modificado manualmente en esta cotización" className="text-[10px] px-1.5 py-0.5 bg-blue-900/30 text-blue-400 rounded font-medium shrink-0">editado</span>
                                )}
                              </div>
                              {([l.marca, l.modelo].filter(Boolean).join(" ") !== l.descripcion) && <p className="text-gray-500 text-xs">{l.descripcion}</p>}
                            </div>
                            <NumSelect value={l.cantidad} onChange={v => updateEquipo(l.id, "cantidad", parseFloat(v) || 1)} max={50} className="w-14 py-1" title="Cantidad" />
                            <NumSelect value={l.dias} onChange={v => updateEquipo(l.id, "dias", parseInt(v) || 1)} max={10} className="w-14 py-1" title="Días" />
                            <div className="flex flex-col items-end gap-0.5">
                              <input type="number" value={l.precioUnitario} min="0"
                                onChange={e => updateEquipo(l.id, "precioUnitario", parseFloat(e.target.value) || 0)}
                                className={`w-24 bg-[#1a1a1a] border rounded px-2 py-1 text-white text-sm text-right ${esPrecioEspecialActivo ? "border-[#B3985B]/50" : esPrecioModificado ? "border-blue-800" : "border-[#2a2a2a]"}`}
                                title="Precio unitario" />
                              {precioBase > 0 && l.precioUnitario !== precioBase && (
                                <span className="text-[10px] text-gray-600 line-through">{formatCurrency(precioBase)}</span>
                              )}
                            </div>
                            <span className="w-24 text-right text-white text-sm font-medium shrink-0">{formatCurrency(l.subtotal)}</span>
                            {/* Botón guardar precio especial */}
                            {precioDifiere && (resolvedClienteId || clienteId) && (
                              <button
                                onClick={() => guardarPrecioCliente(l)}
                                disabled={guardandoPrecio === l.id}
                                title="Guardar como precio especial de este cliente"
                                className="text-[10px] text-[#B3985B] hover:text-white border border-[#B3985B]/40 hover:border-[#B3985B] px-2 py-1 rounded transition-colors shrink-0 disabled:opacity-40"
                              >
                                {guardandoPrecio === l.id ? "..." : "★ guardar"}
                              </button>
                            )}
                            <button onClick={() => setLineasEquipo(p => p.filter(x => x.id !== l.id))} className="text-gray-600 hover:text-red-400 text-lg leading-none shrink-0">×</button>
                          </div>
                          <ConceptoNotaEditor
                            value={l.notas}
                            onChange={v => setLineasEquipo(p => p.map(x => x.id === l.id ? { ...x, notas: v } : x))}
                          />
                        </div>
                        </>
                        );
                      })}

                    </div>
                  );
                });
              })()
            )}

            <div className="mt-1 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowNuevoEqPropioModal(p => !p)}
                  className="text-xs text-[#B3985B] hover:text-white transition-colors flex items-center gap-1"
                >
                  <span className="text-base leading-none">+</span>
                  <span>Registrar equipo nuevo</span>
                </button>
                <button
                  onClick={() => fetch("/api/equipos").then(r => r.json()).then(data => setEquipos(data.equipos ?? []))}
                  className="text-[10px] text-[#555] hover:text-[#B3985B] transition-colors"
                  title="Recargar lista de equipos del catálogo"
                >
                  ↻ Recargar catálogo
                </button>
              </div>
              <a href="/catalogo/equipos" target="_blank" className="text-[10px] text-[#555] hover:text-[#B3985B] transition-colors">
                → Ir al catálogo de equipos
              </a>
            </div>
          </Seccion>

          {/* Panel: registrar nuevo equipo propio rápido */}
          {showNuevoEqPropioModal && (
            <div className="mb-4 bg-[#0a0a0a] border border-[#B3985B]/40 rounded-xl p-4">
              <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-1">Registrar equipo en inventario</p>
              <p className="text-[#555] text-[10px] mb-3">Se guardará en el Inventario Maestro automáticamente</p>
              <div className="flex gap-2 mb-3">
                {(["PROPIO", "EXTERNO"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNuevoEqPropioForm(p => ({ ...p, tipo: t }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${nuevoEqPropioForm.tipo === t ? "bg-[#B3985B] text-black border-[#B3985B]" : "bg-[#1a1a1a] text-gray-400 border-[#333] hover:text-white"}`}
                  >
                    {t === "PROPIO" ? "Equipo propio" : "Proveedor externo"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <input
                  value={nuevoEqPropioForm.marca}
                  onChange={e => {
                    const marca = e.target.value;
                    setNuevoEqPropioForm(p => ({
                      ...p,
                      marca,
                      descripcion: p.descripcion && nuevoEqPropioDescEditado ? p.descripcion : `${marca} ${p.modelo}`.trim(),
                    }));
                  }}
                  placeholder="Marca *"
                  className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
                <input
                  value={nuevoEqPropioForm.modelo}
                  onChange={e => {
                    const modelo = e.target.value;
                    setNuevoEqPropioForm(p => ({
                      ...p,
                      modelo,
                      descripcion: p.descripcion && nuevoEqPropioDescEditado ? p.descripcion : `${p.marca} ${modelo}`.trim(),
                    }));
                  }}
                  placeholder="Modelo"
                  className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
                <div className="col-span-2">
                  <input
                    value={nuevoEqPropioForm.descripcion}
                    onChange={e => {
                      setNuevoEqPropioForm(p => ({ ...p, descripcion: e.target.value }));
                      setNuevoEqPropioDescEditado(true);
                    }}
                    placeholder="Nombre / Descripción *"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  value={nuevoEqPropioForm.precioRenta}
                  onChange={e => setNuevoEqPropioForm(p => ({ ...p, precioRenta: e.target.value }))}
                  placeholder={nuevoEqPropioForm.tipo === "EXTERNO" ? "Precio público (MXN) *" : "Precio de renta (MXN) *"}
                  className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                />
                <select
                  value={nuevoEqPropioForm.categoriaId}
                  onChange={e => setNuevoEqPropioForm(p => ({ ...p, categoriaId: e.target.value }))}
                  className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                >
                  <option value="">Categoría (opcional)</option>
                  {categoriasList.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                {nuevoEqPropioForm.tipo === "EXTERNO" && (
                  <>
                    <input
                      type="number"
                      min="0"
                      value={nuevoEqPropioForm.costoProveedor}
                      onChange={e => setNuevoEqPropioForm(p => ({ ...p, costoProveedor: e.target.value }))}
                      placeholder="Costo del proveedor (MXN)"
                      className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    />
                    <input
                      type="number"
                      min="1"
                      value={nuevoEqPropioForm.cantidadTotal}
                      onChange={e => setNuevoEqPropioForm(p => ({ ...p, cantidadTotal: e.target.value }))}
                      placeholder="Cantidad en catálogo"
                      className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    />
                    <Combobox
                      value={nuevoEqPropioForm.proveedorId}
                      onChange={v => setNuevoEqPropioForm(p => ({ ...p, proveedorId: v }))}
                      options={[{ value: "", label: "— Proveedor (opcional)" }, ...proveedores.map(p => ({ value: p.id, label: p.nombre }))]}
                      className="col-span-2 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    />
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={crearEquipoPropio}
                  disabled={guardandoEqPropio || !nuevoEqPropioForm.marca.trim() || !nuevoEqPropioForm.descripcion.trim() || !nuevoEqPropioForm.precioRenta}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40"
                >
                  {guardandoEqPropio ? "Registrando..." : "Registrar equipo"}
                </button>
                <button
                  onClick={() => { setShowNuevoEqPropioModal(false); setNuevoEqPropioForm({ tipo: "PROPIO", marca: "", modelo: "", descripcion: "", precioRenta: "", categoriaId: "", costoProveedor: "", proveedorId: "", cantidadTotal: "1" }); setNuevoEqPropioDescEditado(false); }}
                  className="px-3 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ── Equipos de terceros ── */}
          <Seccion titulo="Equipos de terceros" hint="sin descuento por volumen · costo de proveedor afecta viabilidad">
            {/* ── Panel: confirmar disponibilidad con proveedor ── */}
            {showConfirmDisp && (() => {
              // Agrupar líneas externas por proveedor
              const grupos: Record<string, { proveedor: { id: string; nombre: string; telefono: string | null } | null; lineas: LineaExterno[] }> = {};
              for (const l of lineasExterno) {
                const key = l.proveedorId ?? "__sin_proveedor__";
                if (!grupos[key]) {
                  const prov = l.proveedorId ? proveedores.find(p => p.id === l.proveedorId) ?? null : null;
                  grupos[key] = { proveedor: prov, lineas: [] };
                }
                grupos[key].lineas.push(l);
              }
              const fechaEvento = evento.fechaEvento ? new Date(evento.fechaEvento + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "fecha por confirmar";
              return (
                <div className="mb-4 bg-[#0a0a0a] border border-[#B3985B]/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">Confirmar disponibilidad con proveedores</p>
                    <button onClick={() => setShowConfirmDisp(false)} className="text-gray-600 hover:text-white text-xs transition-colors">Cerrar</button>
                  </div>
                  {Object.entries(grupos).map(([key, grupo]) => {
                    const listaEquipos = grupo.lineas.map(l => `• ${l.descripcion}${l.marca ? ` (${l.marca})` : ""} — ${l.cantidad} u x ${l.dias} día${l.dias > 1 ? "s" : ""}`).join("\n");
                    const msg = `Hola ${grupo.proveedor?.nombre.split(" ")[0] ?? ""}! 👋\n\nNecesito confirmar disponibilidad de equipos para un evento:\n📅 ${fechaEvento}${evento.nombreEvento ? `\n🎪 ${evento.nombreEvento}` : ""}\n\nEquipos requeridos:\n${listaEquipos}\n\n¿Están disponibles para esa fecha? 🙏`;
                    const tel = grupo.proveedor?.telefono?.replace(/\D/g, "").replace(/^(?!52)/, "52") ?? "";
                    const waUrl = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(msg)}` : null;
                    return (
                      <div key={key} className="flex items-start gap-3 bg-[#111] border border-[#1e1e1e] rounded-lg p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{grupo.proveedor?.nombre ?? <span className="text-gray-500 italic">Sin proveedor asignado</span>}</p>
                          <ul className="mt-1 space-y-0.5">
                            {grupo.lineas.map(l => (
                              <li key={l.id} className="text-xs text-gray-400">{l.descripcion}{l.marca ? <span className="text-gray-600"> · {l.marca}</span> : null} — <span className="text-gray-300">{l.cantidad} u × {l.dias} día{l.dias > 1 ? "s" : ""}</span></li>
                            ))}
                          </ul>
                        </div>
                        {waUrl ? (
                          <a href={waUrl} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-1.5 text-xs text-green-400 border border-green-800/40 bg-green-900/20 hover:bg-green-900/30 px-3 py-1.5 rounded-lg transition-colors font-medium">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            Enviar WA
                          </a>
                        ) : (
                          <span className="shrink-0 text-[10px] text-yellow-600 border border-yellow-800/30 px-2 py-1.5 rounded-lg">Sin teléfono</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {/* Modal: registrar nuevo equipo proveedor */}
            {showNuevoEqModal && (
              <div className="mb-4 bg-[#0a0a0a] border border-[#B3985B]/40 rounded-xl p-4">
                <p className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider mb-3">Registrar nuevo equipo de proveedor</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <div className="col-span-2">
                    <input value={nuevoEqForm.descripcion} onChange={e => setNuevoEqForm(p => ({ ...p, descripcion: e.target.value }))}
                      placeholder="Descripción del equipo *"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <input value={nuevoEqForm.marca} onChange={e => setNuevoEqForm(p => ({ ...p, marca: e.target.value }))}
                    placeholder="Marca / modelo"
                    className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  <Combobox
                    value={nuevoEqForm.categoriaId}
                    onChange={v => setNuevoEqForm(p => ({ ...p, categoriaId: v }))}
                    options={[{ value: "", label: "— Categoría *" }, ...categoriasList.map(c => ({ value: c.id, label: c.nombre }))]}
                    className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                  <input type="number" min="0" value={nuevoEqForm.precioRenta} onChange={e => setNuevoEqForm(p => ({ ...p, precioRenta: e.target.value }))}
                    placeholder="Precio al cliente"
                    className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  <input type="number" min="0" value={nuevoEqForm.costoProveedor} onChange={e => setNuevoEqForm(p => ({ ...p, costoProveedor: e.target.value }))}
                    placeholder="Costo del proveedor"
                    className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  <input type="number" min="1" value={nuevoEqForm.cantidadTotal} onChange={e => setNuevoEqForm(p => ({ ...p, cantidadTotal: e.target.value }))}
                    placeholder="Cantidad en catálogo"
                    className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  <Combobox
                    value={nuevoEqForm.proveedorId}
                    onChange={v => setNuevoEqForm(p => ({ ...p, proveedorId: v }))}
                    options={[{ value: "", label: "— Proveedor (opcional)" }, ...proveedores.map(p => ({ value: p.id, label: p.nombre }))]}
                    className="col-span-2 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={crearEquipoProveedor} disabled={guardandoEq || !nuevoEqForm.descripcion || !nuevoEqForm.categoriaId}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40">
                    {guardandoEq ? "Guardando..." : "Guardar en catálogo y agregar"}
                  </button>
                  <button onClick={() => setShowNuevoEqModal(false)} className="px-3 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-4 items-end">
              <div className="flex-1">
                <p className="text-[10px] text-[#555] mb-1 px-1">Equipo del catálogo</p>
                <SearchableSelect
                  options={equiposExternos.map(eq => ({
                    value: eq.id,
                    label: `${eq.descripcion}${eq.marca ? ` · ${eq.marca}` : ""}${eq.modelo ? ` ${eq.modelo}` : ""} — cliente: ${formatCurrency(eq.precioRenta)} / costo: ${formatCurrency(eq.costoProveedor ?? 0)}`,
                  }))}
                  value={selExt}
                  onChange={setSelExt}
                  placeholder="— Buscar equipo externo —"
                />
              </div>
              <div>
                <p className="text-[10px] text-[#555] mb-1 text-center">Cantidad</p>
                <NumSelect value={selExtCant} onChange={setSelExtCant} max={50} className="w-20 py-2" />
              </div>
              <div>
                <p className="text-[10px] text-[#555] mb-1 text-center">Días</p>
                <NumSelect value={selExtDias} onChange={setSelExtDias} max={10} className="w-20 py-2" />
              </div>
              <button onClick={agregarExterno} disabled={!selExt} className="px-3 py-2 rounded-lg bg-[#333] text-white font-semibold text-sm disabled:opacity-40 hover:bg-[#444]">+ Agregar</button>
            </div>

            {lineasExterno.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-2">Sin equipos de terceros</p>
            ) : (
              <div className="border border-[#222] rounded-lg overflow-hidden">
                {lineasExterno.map(l => (
                  <div key={l.id} className="flex items-center gap-2 px-3 py-2 border-b border-[#111] last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white text-sm truncate">{l.marca || l.descripcion}</p>
                        {l.categoria && <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-[#1e1e1e] text-[#6b7280] rounded" title="En el PDF aparece dentro de esta categoría">{l.categoria}</span>}
                      </div>
                      {l.marca && <p className="text-gray-500 text-xs">{l.descripcion}</p>}
                      <p className="text-[#555] text-[10px]">Costo proveedor: {formatCurrency(l.costoProveedor)}/u · Total costo: {formatCurrency(l.costoTotal)}</p>
                    </div>
                    <NumSelect value={l.cantidad} onChange={v => updateExterno(l.id, "cantidad", parseFloat(v) || 1)} max={50} className="w-14 py-1" title="Cantidad" />
                    <NumSelect value={l.dias} onChange={v => updateExterno(l.id, "dias", parseInt(v) || 1)} max={10} className="w-14 py-1" title="Días" />
                    <input type="number" value={l.precioUnitario} min="0" onChange={e => updateExterno(l.id, "precioUnitario", parseFloat(e.target.value) || 0)} className="w-22 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white text-sm text-right" title="Precio al cliente" />
                    <span className="w-22 text-right text-white text-sm font-medium shrink-0">{formatCurrency(l.subtotal)}</span>
                    <button onClick={() => setLineasExterno(p => p.filter(x => x.id !== l.id))} className="text-gray-600 hover:text-red-400 text-lg leading-none shrink-0">×</button>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 bg-[#0d0d0d] border-t border-[#222]">
                  <span className="text-xs text-gray-500">Subtotal terceros (sin descuento)</span>
                  <span className="text-sm font-medium text-white">{formatCurrency(resumen.subtotalExternos)}</span>
                </div>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex items-center justify-between gap-3 flex-wrap">
              <button onClick={() => { setShowNuevoEqModal(p => !p); }}
                className="text-xs text-[#B3985B] hover:text-white transition-colors flex items-center gap-1.5">
                <span className="text-base leading-none">+</span>
                <span>Registrar nuevo equipo de proveedor en catálogo</span>
              </button>
              {lineasExterno.length > 0 && (
                <button
                  onClick={() => setShowConfirmDisp(v => !v)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${showConfirmDisp ? "text-green-400 border-green-700/50 bg-green-900/20" : "text-green-500 border-green-800/40 hover:bg-green-900/20"}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Confirmar disponibilidad con proveedor
                </button>
              )}
            </div>
          </Seccion>

          {/* ── Adicionales / conceptos ocasionales ── */}
          <Seccion titulo="Adicionales" hint="conceptos únicos · sin descuento · no se registran en catálogo">
            <div className="flex gap-2 mb-3 items-end flex-wrap">
              <div className="flex-1 min-w-48">
                <p className="text-[10px] text-[#555] mb-1 px-1">Descripción</p>
                <input value={selOcDesc} onChange={e => setSelOcDesc(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") agregarOcasional(); }}
                  placeholder="Nombre del concepto u equipo..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <p className="text-[10px] text-[#555] mb-1 text-center">Precio</p>
                <input type="number" min="0" value={selOcPrecio} onChange={e => setSelOcPrecio(e.target.value)}
                  placeholder="0"
                  className="w-28 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-2 text-white text-sm text-right focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <p className="text-[10px] text-[#555] mb-1 text-center">Cant</p>
                <NumSelect value={selOcCant} onChange={setSelOcCant} max={50} className="w-16 py-2" />
              </div>
              <div>
                <p className="text-[10px] text-[#555] mb-1 text-center">Días</p>
                <NumSelect value={selOcDias} onChange={setSelOcDias} max={10} className="w-16 py-2" />
              </div>
              <button onClick={agregarOcasional} disabled={!selOcDesc.trim() || !selOcPrecio}
                className="px-3 py-2 rounded-lg bg-[#333] text-white font-semibold text-sm disabled:opacity-40 hover:bg-[#444]">
                + Agregar
              </button>
            </div>
            {lineasOcasional.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-2">Sin adicionales</p>
            ) : (
              <div className="border border-[#222] rounded-lg overflow-hidden">
                {lineasOcasional.map(l => (
                  <div key={l.id} className="flex items-center gap-2 px-3 py-2 border-b border-[#111] last:border-0">
                    <p className="flex-1 text-white text-sm truncate">{l.descripcion}</p>
                    <span className="text-gray-500 text-xs shrink-0">×{l.cantidad} · {l.dias}d · {formatCurrency(l.precioUnitario)}</span>
                    <span className="w-22 text-right text-white text-sm font-medium shrink-0">{formatCurrency(l.subtotal)}</span>
                    <button onClick={() => setLineasOcasional(p => p.filter(x => x.id !== l.id))} className="text-gray-600 hover:text-red-400 text-lg leading-none shrink-0">×</button>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 bg-[#0d0d0d] border-t border-[#222]">
                  <span className="text-xs text-gray-500">Subtotal adicionales</span>
                  <span className="text-sm font-medium text-white">{formatCurrency(resumen.subtotalOcasionales)}</span>
                </div>
              </div>
            )}
          </Seccion>

          <Seccion titulo="Operación técnica" hint="sin descuento · tarifas por día y tipo de operación">
            {/* Zona selector + técnicos */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs text-gray-500">Zona del evento:</span>
              {(["LOCAL", "BAJIO", "NACIONAL"] as const).map(z => (
                <button
                  key={z}
                  type="button"
                  onClick={() => { setZonaEvento(z); if (z === "LOCAL") setNumTecnicosZona(0); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${zonaEvento === z ? "bg-[#B3985B] border-[#B3985B] text-black" : "border-[#333] text-gray-400 hover:border-[#B3985B] hover:text-[#B3985B]"}`}
                >
                  {z === "LOCAL" ? "Local" : z === "BAJIO" ? "Bajío +$500" : "Nacional +$800"}
                </button>
              ))}
              {zonaEvento !== "LOCAL" && (
                <>
                  <span className="text-xs text-gray-500 ml-1">·</span>
                  <span className="text-xs text-gray-500">Técnicos:</span>
                  <input
                    type="number" min="0" max="50" value={numTecnicosZona || ""}
                    onChange={e => setNumTecnicosZona(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-14 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-[#B3985B]"
                  />
                  {numTecnicosZona > 0 && (
                    <span className="text-xs text-[#B3985B]">= +{resumen.bonusZonaTotal.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })}</span>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">Define cada día de trabajo por fecha y tipo de operación (montaje, operación del evento, desmontaje). Puedes registrar desde un solo día hasta múltiples jornadas agregando días.</p>
            {jornadasPlan.map((jornada, ji) => {
              const pending = pendingSlots[jornada.id] ?? { rolId: "", nivel: "AA", jornada: "CORTA", cantidad: "1" };
              const pendingRol = roles.find(r => r.id === pending.rolId);
              const pendingTarifa = pendingRol ? getRolTarifa(pendingRol, pending.nivel, pending.jornada) : 0;
              return (
                <div key={jornada.id} className="mb-4 bg-[#0d0d0d] border border-[#222] rounded-xl p-4">
                  {/* Header de la jornada */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <input
                      type="date"
                      value={jornada.fecha}
                      onChange={e => setJornadasPlan(p => p.map((j, i) => i === ji ? { ...j, fecha: e.target.value } : j))}
                      className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    />
                    <select
                      value={jornada.tipo}
                      onChange={e => setJornadasPlan(p => p.map((j, i) => i === ji ? { ...j, tipo: e.target.value } : j))}
                      className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    >
                      <option value="MONTAJE">Montaje</option>
                      <option value="OPERACION">Operación del evento</option>
                      <option value="DESMONTAJE">Desmontaje</option>
                      <option value="OTRO">Otro</option>
                    </select>
                    <button
                      onClick={() => setJornadasPlan(p => p.filter((_, i) => i !== ji))}
                      className="ml-auto text-gray-600 hover:text-red-400 text-sm transition-colors"
                    >
                      × Quitar día
                    </button>
                  </div>

                  {/* Lista de técnicos ya agregados */}
                  {jornada.slots.length > 0 && (
                    <div className="mb-3 border border-[#1a1a1a] rounded-lg overflow-hidden">
                      {jornada.slots.map((slot, si) => (
                        <div key={slot.id} className="flex items-center gap-2 px-3 py-2 border-b border-[#111] last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{slot.rolNombre || "(sin rol)"}</p>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-gray-400 shrink-0">{slot.nivel}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-gray-400 shrink-0">
                            {slot.jornada === "CORTA" ? "0–8h" : slot.jornada === "MEDIA" ? "8–12h" : "12+h"}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-gray-500">×</span>
                            <input
                              type="number" min="1" max="20"
                              value={slot.cantidad === 0 ? "" : slot.cantidad}
                              onChange={e => setJornadasPlan(p => p.map((j, i) => i !== ji ? j : {
                                ...j, slots: j.slots.map((s, k) => k !== si ? s : { ...s, cantidad: parseInt(e.target.value) || 1 })
                              }))}
                              className="w-10 bg-[#1a1a1a] border border-[#333] rounded px-1 py-1 text-white text-xs text-center focus:outline-none focus:border-[#B3985B]"
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-gray-500">$</span>
                            <input
                              type="number" min="0"
                              value={slot.tarifa === 0 ? "" : slot.tarifa}
                              onChange={e => setJornadasPlan(p => p.map((j, i) => i !== ji ? j : {
                                ...j, slots: j.slots.map((s, k) => k !== si ? s : { ...s, tarifa: parseFloat(e.target.value) || 0 })
                              }))}
                              placeholder="0"
                              className="w-20 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-white text-xs text-right focus:outline-none focus:border-[#B3985B]"
                            />
                          </div>
                          <span className="text-white text-xs font-semibold w-20 text-right shrink-0">
                            {formatCurrency(slot.tarifa * slot.cantidad)}
                          </span>
                          <button
                            onClick={() => setJornadasPlan(p => p.map((j, i) => i !== ji ? j : {
                              ...j, slots: j.slots.filter((_, k) => k !== si)
                            }))}
                            className="text-gray-600 hover:text-red-400 text-lg leading-none shrink-0"
                          >×</button>
                        </div>
                      ))}
                      <div className="flex justify-between px-3 py-2 bg-[#0a0a0a] border-t border-[#222]">
                        <span className="text-[10px] text-gray-500">Subtotal día</span>
                        <span className="text-xs font-semibold text-white">{formatCurrency(jornada.slots.reduce((s, sl) => s + sl.tarifa * sl.cantidad, 0))}</span>
                      </div>
                    </div>
                  )}

                  {/* Selector para agregar técnico — igual que sección de equipos */}
                  <div className="flex gap-2 items-end flex-wrap border-t border-[#1a1a1a] pt-3">
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-[10px] text-[#555] mb-1 px-1">Rol técnico</p>
                      <select
                        value={pending.rolId}
                        onChange={e => setPendingSlots(p => ({ ...p, [jornada.id]: { ...pending, rolId: e.target.value } }))}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                      >
                        <option value="">— Seleccionar rol —</option>
                        {roles.filter(r => r.nombre !== "DJ").map(r => (
                          <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555] mb-1 text-center">Nivel</p>
                      <select
                        value={pending.nivel}
                        onChange={e => setPendingSlots(p => ({ ...p, [jornada.id]: { ...pending, nivel: e.target.value } }))}
                        className="w-20 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                      >
                        <option value="AAA">AAA</option>
                        <option value="AA">AA</option>
                        <option value="A">A</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555] mb-1 text-center">Jornada</p>
                      <select
                        value={pending.jornada}
                        onChange={e => setPendingSlots(p => ({ ...p, [jornada.id]: { ...pending, jornada: e.target.value } }))}
                        className="w-28 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                      >
                        <option value="CORTA">0–8 hrs</option>
                        <option value="MEDIA">8–12 hrs</option>
                        <option value="LARGA">12+ hrs</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555] mb-1 text-center">Cant.</p>
                      <NumSelect value={pending.cantidad} onChange={v => setPendingSlots(p => ({ ...p, [jornada.id]: { ...pending, cantidad: v } }))} max={50} className="w-16 py-2" />
                    </div>
                    {pendingTarifa > 0 && (
                      <div className="self-end pb-2">
                        <span className="text-xs text-[#B3985B] whitespace-nowrap">{formatCurrency(pendingTarifa)}/técnico</span>
                      </div>
                    )}
                    <button
                      disabled={!pending.rolId}
                      onClick={() => {
                        if (!pendingRol) return;
                        const tarifa = getRolTarifa(pendingRol, pending.nivel, pending.jornada);
                        setJornadasPlan(prev => prev.map(j => j.id !== jornada.id ? j : {
                          ...j,
                          slots: [...j.slots, {
                            id: uid(), rolId: pendingRol.id, rolNombre: pendingRol.nombre,
                            cantidad: parseInt(pending.cantidad) || 1,
                            nivel: pending.nivel, jornada: pending.jornada, tarifa,
                          }],
                        }));
                        setPendingSlots(prev => ({ ...prev, [jornada.id]: { rolId: "", nivel: "AA", jornada: "CORTA", cantidad: "1" } }));
                      }}
                      className="px-3 py-2 rounded-lg bg-[#333] text-white font-semibold text-sm disabled:opacity-40 hover:bg-[#444] self-end"
                    >+ Agregar</button>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => setJornadasPlan(p => [...p, { id: uid(), fecha: evento.fechaEvento || "", tipo: "OPERACION", slots: [] }])}
              className="w-full py-2 border border-dashed border-[#333] hover:border-[#B3985B] rounded-xl text-gray-500 hover:text-[#B3985B] text-sm transition-colors"
            >
              + Agregar día
            </button>

            {resumen.bonusZonaTotal > 0 && (
              <div className="mt-3 flex items-center justify-between px-3 py-2.5 bg-[#B3985B]/10 border border-[#B3985B]/20 rounded-xl">
                <div>
                  <span className="text-[#B3985B] text-sm font-medium">Extra de zona {zonaEvento === "BAJIO" ? "Bajío" : "Nacional"}</span>
                  <span className="text-gray-500 text-xs ml-2">{numTecnicosZona} técnico{numTecnicosZona !== 1 ? "s" : ""} × {resumen.zonaBonus.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })}</span>
                </div>
                <span className="text-white font-semibold text-sm">{resumen.bonusZonaTotal.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </Seccion>

          {/* ── Servicio de DJ ── */}
          <Seccion titulo="Servicio de DJ" hint="cobro por hora · sin descuento">
            {(() => {
              const djRol = roles.find(r => r.nombre === "DJ");
              const djTarifaKey = `tarifaHora${selDJNivel}` as keyof RolTecnico;
              const djTarifaDefault = djRol ? ((djRol[djTarifaKey] as number | null) ?? 0) : 0;
              const djTarifaDisplay = parseFloat(selDJTarifa) || djTarifaDefault;
              return (
                <div className="flex gap-2 mb-3 flex-wrap">
                  <Combobox
                    value={selDJNivel}
                    onChange={v => { setSelDJNivel(v); setSelDJTarifa(""); }}
                    options={[{ value: "AAA", label: "AAA" }, { value: "AA", label: "AA" }, { value: "A", label: "A" }]}
                    className="w-24 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-2 text-white text-sm focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <input type="number" min="1" value={selDJHoras} onChange={e => setSelDJHoras(e.target.value)} className="w-20 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none" placeholder="Horas" />
                    <span className="text-gray-600 text-xs">hrs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600 text-xs">$</span>
                    <input type="number" min="0" value={selDJTarifa !== "" ? selDJTarifa : djTarifaDefault || ""}
                      onChange={e => setSelDJTarifa(e.target.value)}
                      className="w-28 bg-[#1a1a1a] border border-[#B3985B]/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                      placeholder={String(djTarifaDefault)} />
                    <span className="text-gray-600 text-xs">/hr</span>
                  </div>
                  <div className="flex-1 flex items-center text-gray-500 text-sm">
                    Total: {formatCurrency(djTarifaDisplay * (parseFloat(selDJHoras) || 0))}
                  </div>
                  <button onClick={agregarDJ} disabled={!djRol} className="px-3 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40">+ Agregar</button>
                </div>
              );
            })()}
            {lineasDJ.length === 0 ? <p className="text-gray-600 text-sm text-center py-2">Sin DJ agregado</p> : lineasDJ.map(l => (
              <div key={l.id} className="flex items-center gap-2 py-2 border-b border-[#1a1a1a] flex-wrap">
                <p className="text-white text-sm w-16">DJ {l.nivel}</p>
                <div className="flex items-center gap-1">
                  <input type="number" min="1" value={l.horas}
                    onChange={e => setLineasDJ(prev => prev.map(x => x.id !== l.id ? x : { ...x, horas: parseFloat(e.target.value) || 1, subtotal: (parseFloat(e.target.value) || 1) * x.tarifa }))}
                    className="w-16 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-white text-sm focus:outline-none text-center" />
                  <span className="text-gray-600 text-xs">hrs</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-600 text-xs">$</span>
                  <input type="number" min="0" value={l.tarifa}
                    onChange={e => setLineasDJ(prev => prev.map(x => x.id !== l.id ? x : { ...x, tarifa: parseFloat(e.target.value) || 0, subtotal: (parseFloat(e.target.value) || 0) * x.horas }))}
                    className="w-24 bg-[#1a1a1a] border border-[#B3985B]/50 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-[#B3985B] text-right" />
                  <span className="text-gray-600 text-xs">/hr</span>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <span className="text-white text-sm font-medium">{formatCurrency(l.subtotal)}</span>
                  <button onClick={() => setLineasDJ(p => p.filter(x => x.id !== l.id))} className="text-gray-600 hover:text-red-400 text-lg leading-none">×</button>
                </div>
              </div>
            ))}
          </Seccion>

          {/* ── Logística ── */}
          <Seccion titulo="Logística" hint="sin descuento">
            {([
              { tipo: "COMIDA" as const, label: "Comida", conceptos: CONCEPTOS_COMIDA, icon: Utensils as LucideIcon },
              { tipo: "TRANSPORTE" as const, label: "Transporte", conceptos: CONCEPTOS_TRANSPORTE, icon: Bus as LucideIcon },
              { tipo: "HOSPEDAJE" as const, label: "Hospedaje", conceptos: CONCEPTOS_HOSPEDAJE, icon: BedDouble as LucideIcon },
            ]).map(({ tipo, label, conceptos, icon: Icon }) => {
              const lineas = lineasLog.filter(l => l.tipo === tipo);
              const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0);
              return (
                <div key={tipo} className="mb-4 last:mb-0">
                  <p className="text-xs font-semibold text-[#888] mb-2 uppercase tracking-wider inline-flex items-center gap-1.5"><Icon strokeWidth={1.75} className="w-3.5 h-3.5" /> {label}</p>
                  <div className="flex gap-2 mb-2 flex-wrap items-end">
                    <Combobox
                      value={logConcepto[tipo]}
                      onChange={v => {
                        const precio = conceptos.find(c => c.label === v)?.precio ?? 0;
                        setLogConcepto(p => ({ ...p, [tipo]: v }));
                        setLogPrecio(p => ({ ...p, [tipo]: String(precio) }));
                      }}
                      options={conceptos.map(c => ({ value: c.label, label: c.label }))}
                      className="flex-1 min-w-[160px] bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
                    />
                    <input type="number" value={logPrecio[tipo]} onChange={e => setLogPrecio(p => ({ ...p, [tipo]: e.target.value }))} placeholder="$" className="w-24 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    <NumSelect value={logCant[tipo]} onChange={v => setLogCant(p => ({ ...p, [tipo]: v }))} max={50} className="w-16 py-2" title="Cantidad" />
                    <NumSelect value={logDias[tipo]} onChange={v => setLogDias(p => ({ ...p, [tipo]: v }))} max={10} className="w-16 py-2" title="Días" />
                    <button onClick={() => {
                      const precio = parseFloat(logPrecio[tipo]) || 0;
                      const cant = parseFloat(logCant[tipo]) || 1;
                      const dias = parseInt(logDias[tipo]) || 1;
                      setLineasLog(prev => [...prev, { id: uid(), tipo, concepto: logConcepto[tipo], precioUnitario: precio, cantidad: cant, dias, subtotal: precio * cant * dias }]);
                      setLogCant(p => ({ ...p, [tipo]: "1" }));
                      setLogDias(p => ({ ...p, [tipo]: "1" }));
                    }} className="px-3 py-2 rounded-lg bg-[#333] text-white font-semibold text-sm hover:bg-[#444]">+ Agregar</button>
                  </div>
                  {lineas.length > 0 && (
                    <div className="border border-[#222] rounded-lg overflow-hidden">
                      {lineas.map(l => (
                        <div key={l.id} className="flex items-center gap-2 px-3 py-2 border-b border-[#111] last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{l.concepto}</p>
                            <p className="text-gray-500 text-xs">×{l.cantidad} · {l.dias} día(s) · {formatCurrency(l.precioUnitario)}/u</p>
                          </div>
                          <input type="number" value={l.precioUnitario} onChange={e => {
                            const p = parseFloat(e.target.value) || 0;
                            setLineasLog(pr => pr.map(x => x.id === l.id ? { ...x, precioUnitario: p, subtotal: p * x.cantidad * x.dias } : x));
                          }} className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white text-xs text-right focus:outline-none" />
                          <NumSelect value={l.cantidad} onChange={v => { const c = parseFloat(v) || 1; setLineasLog(pr => pr.map(x => x.id === l.id ? { ...x, cantidad: c, subtotal: x.precioUnitario * c * x.dias } : x)); }} max={50} className="w-14 py-1" />
                          <NumSelect value={l.dias} onChange={v => { const d = parseInt(v) || 1; setLineasLog(pr => pr.map(x => x.id === l.id ? { ...x, dias: d, subtotal: x.precioUnitario * x.cantidad * d } : x)); }} max={10} className="w-14 py-1" />
                          <span className="w-20 text-right text-white text-sm font-medium shrink-0">{formatCurrency(l.subtotal)}</span>
                          <button onClick={() => setLineasLog(p => p.filter(x => x.id !== l.id))} className="text-gray-600 hover:text-red-400 text-lg leading-none shrink-0">×</button>
                        </div>
                      ))}
                      {lineas.length > 1 && (
                        <div className="flex justify-between px-3 py-1.5 bg-[#0d0d0d] border-t border-[#222]">
                          <span className="text-xs text-gray-500">Subtotal {label.toLowerCase()}</span>
                          <span className="text-xs font-medium text-white">{formatCurrency(subtotal)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </Seccion>

          {/* ── Descuentos ── */}
          <Seccion titulo="Descuentos" hint="sobre subtotal de equipos Mainstage">
            <div className="space-y-3">
              {/* Aviso si hay descuentos legacy preservados */}
              {(dMultidiaPreservado > 0 || dEspecialPreservado > 0 || dPatrocinioPreservado > 0 || dFijoPreservado > 0) && (
                <div className="text-[10px] text-amber-600/70 bg-amber-900/10 border border-amber-900/20 rounded-lg px-3 py-2">
                  Cotización anterior: descuentos históricos preservados (multidía {formatPct(dMultidiaPreservado)}{dEspecialPreservado > 0 ? `, especial ${formatPct(dEspecialPreservado)}` : ""}{dPatrocinioPreservado > 0 ? `, patrocinio ${formatPct(dPatrocinioPreservado)}` : ""}{dFijoPreservado > 0 ? `, fijo ${formatCurrency(dFijoPreservado)}` : ""})
                </div>
              )}

              {/* 1. Descuento por volumen */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => { setVolumenManualToggle(true); setVolumenActivo(v => !v); }}
                  className={`flex items-center gap-2 w-48 shrink-0 text-sm font-medium transition-colors ${volumenActivo ? "text-[#B3985B]" : "text-gray-600 hover:text-gray-400"}`}>
                  <span className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${volumenActivo ? "bg-[#B3985B]" : "bg-[#333]"}`}>
                    <span className={`w-3 h-3 rounded-full bg-white transition-transform ${volumenActivo ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                  Descuento por volumen
                </button>
                {volumenActivo ? (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-white text-sm font-semibold">Auto · {cfgPctVolumen}%</span>
                    <span className="text-red-400 text-sm">-{formatCurrency(resumen.montoVolumen)}</span>
                  </div>
                ) : (
                  <span className="text-gray-700 text-xs flex-1 italic self-center">
                    {resumen.debeAutoVolumen ? "Activa automáticamente — desactivado manualmente" : `Auto · ${cfgPctVolumen}% · activo si equipos > ${formatCurrency(cfgUmbralVolumen)}`}
                  </span>
                )}
              </div>

              {/* 2. Descuento B2B */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => { setB2bManualToggle(true); setB2bActivo(v => !v); }}
                  className={`flex items-center gap-2 w-48 shrink-0 text-sm font-medium transition-colors ${b2bActivo ? "text-[#B3985B]" : "text-gray-600 hover:text-gray-400"}`}>
                  <span className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${b2bActivo ? "bg-[#B3985B]" : "bg-[#333]"}`}>
                    <span className={`w-3 h-3 rounded-full bg-white transition-transform ${b2bActivo ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                  Descuento B2B
                </button>
                {b2bActivo ? (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-white text-sm font-semibold">Auto · {cfgPctB2b}%</span>
                    <span className="text-red-400 text-sm">-{formatCurrency(resumen.montoB2b)}</span>
                  </div>
                ) : (
                  <span className="text-gray-700 text-xs flex-1 italic self-center">Auto · {cfgPctB2b}% · activo si cliente es B2B</span>
                )}
              </div>

              {/* 3. Descuento manual */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setManualActivo(v => !v)}
                  className={`flex items-center gap-2 w-48 shrink-0 text-sm font-medium transition-colors ${manualActivo ? "text-[#B3985B]" : "text-gray-600 hover:text-gray-400"}`}>
                  <span className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${manualActivo ? "bg-[#B3985B]" : "bg-[#333]"}`}>
                    <span className={`w-3 h-3 rounded-full bg-white transition-transform ${manualActivo ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                  Descuento manual
                </button>
                {manualActivo ? (
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {/* Selector % o $ */}
                      <div className="flex rounded-lg overflow-hidden border border-[#333]">
                        <button onClick={() => setManualEsMonto(false)}
                          className={`text-xs px-2.5 py-1 transition-colors ${!manualEsMonto ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>%</button>
                        <button onClick={() => setManualEsMonto(true)}
                          className={`text-xs px-2.5 py-1 transition-colors ${manualEsMonto ? "bg-[#B3985B] text-black font-semibold" : "text-gray-500 hover:text-white"}`}>$</button>
                      </div>
                      <input type="number" min="0" step={manualEsMonto ? "1" : "0.5"}
                        value={manualValor} onChange={e => setManualValor(e.target.value)}
                        placeholder="0"
                        className="w-24 bg-[#1a1a1a] border border-[#B3985B] rounded-lg px-2 py-1.5 text-white text-sm text-right focus:outline-none" />
                      {!manualEsMonto && <span className="text-gray-400 text-sm">%</span>}
                      <span className="text-red-400 text-sm ml-auto">-{formatCurrency(resumen.montoManual)}</span>
                    </div>
                    <input value={manualRazon} onChange={e => setManualRazon(e.target.value)}
                      placeholder="Razón del descuento (interno, no aparece en PDF)…"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                  </div>
                ) : (
                  <span className="text-gray-700 text-xs flex-1 italic self-center">% o $ · requiere razón interna</span>
                )}
              </div>

              {/* 4. Pago anticipado */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setPagoAnticipadoActivo(v => !v)}
                  className={`flex items-center gap-2 w-48 shrink-0 text-sm font-medium transition-colors ${pagoAnticipadoActivo ? "text-[#B3985B]" : "text-gray-600 hover:text-gray-400"}`}>
                  <span className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${pagoAnticipadoActivo ? "bg-[#B3985B]" : "bg-[#333]"}`}>
                    <span className={`w-3 h-3 rounded-full bg-white transition-transform ${pagoAnticipadoActivo ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                  Pago anticipado
                </button>
                {pagoAnticipadoActivo ? (
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-white text-sm font-semibold">{cfgPctAnticipado}% sobre equipos neto</span>
                      <span className="text-green-400 text-sm ml-auto">-{formatCurrency(resumen.montoPagoAnticipadoFinal)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 shrink-0">Válido antes del:</label>
                      <input type="date" value={pagoAnticipadoFecha} onChange={e => setPagoAnticipadoFecha(e.target.value)}
                        className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#B3985B]" />
                    </div>
                    <textarea value={pagoAnticipadoTexto || cfgTextoAnticipado.replace("{pct}", String(cfgPctAnticipado))}
                      onChange={e => setPagoAnticipadoTexto(e.target.value)}
                      rows={2} placeholder="Texto que aparecerá en el PDF…"
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B] resize-none" />
                    <p className="text-[10px] text-gray-600">El total principal NO cambia — esta sección aparece separada al final del PDF</p>
                  </div>
                ) : (
                  <span className="text-gray-700 text-xs flex-1 italic self-center">{cfgPctAnticipado}% · genera sección separada en PDF</span>
                )}
              </div>

              {/* Totales */}
              <div className="pt-2 border-t border-[#222] space-y-1">
                {resumen.montoVolumen > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Desc. volumen ({cfgPctVolumen}%)</span>
                    <span className="text-red-400">-{formatCurrency(resumen.montoVolumen)}</span>
                  </div>
                )}
                {resumen.montoB2b > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Desc. B2B ({cfgPctB2b}%) sobre {formatCurrency(resumen.basePostVolumen)}</span>
                    <span className="text-red-400">-{formatCurrency(resumen.montoB2b)}</span>
                  </div>
                )}
                {resumen.montoManual > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Desc. manual {manualEsMonto ? "" : `(${parseFloat(manualValor) || 0}%)`}</span>
                    <span className="text-red-400">-{formatCurrency(resumen.montoManual)}</span>
                  </div>
                )}
                {resumen.montoDescuento > 0 && (
                  <div className="flex justify-between text-sm font-medium border-t border-[#222] pt-1">
                    <span className="text-white">Total descuento equipos</span>
                    <span className="text-red-400 font-bold">-{formatCurrency(resumen.montoDescuento)}</span>
                  </div>
                )}
              </div>

              {/* Chofer + IVA (mantener) */}
              <div className="flex items-center gap-3 pt-2 border-t border-[#222]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={incluirChofer} onChange={e => setIncluirChofer(e.target.checked)} className="w-4 h-4 rounded accent-[#B3985B]" />
                  <span className="text-sm text-gray-300">Incluir chofer de producción <span className="text-[#B3985B] font-semibold">+$500</span></span>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={aplicaIva} onChange={e => setAplicaIva(e.target.checked)} className="w-4 h-4 rounded accent-[#B3985B]" />
                  <span className="text-sm text-gray-300">Aplica IVA 16% (cliente pide factura)</span>
                </label>
              </div>
            </div>
          </Seccion>

          {/* ── Comisión interna (Gastos de Producción) ────────────── */}
          {(() => {
            const base = resumen.total;
            const montoCalc = gastosActivo
              ? (gastosEsMonto
                  ? (parseFloat(gastosValor) || 0)
                  : base * (parseFloat(gastosValor) || 0) / 100)
              : 0;
            return (
              <Seccion titulo="Comisión interna" hint="gastos de producción · se agrega al total del cliente">
                {/* Toggle */}
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2.5 cursor-pointer" onClick={() => setGastosActivo(p => !p)}>
                    <div className={`relative w-10 h-5 rounded-full transition-colors ${gastosActivo ? 'bg-[#B3985B]' : 'bg-[#333]'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${gastosActivo ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <span className={`text-sm select-none ${gastosActivo ? 'text-white' : 'text-gray-500'}`}>
                      Agregar comisión interna
                    </span>
                  </label>
                  {gastosActivo && montoCalc > 0 && (
                    <span className="text-[#B3985B] font-bold text-base tabular-nums">{formatCurrency(montoCalc)}</span>
                  )}
                </div>

                {gastosActivo && (
                  <>
                    {/* Modo % o $ */}
                    <div className="flex gap-1 mb-3 bg-[#141414] border border-[#222] rounded-lg p-0.5 w-fit">
                      <button type="button" onClick={() => setGastosEsMonto(false)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${!gastosEsMonto ? 'bg-[#B3985B] text-black' : 'text-gray-400 hover:text-white'}`}>
                        Porcentaje %
                      </button>
                      <button type="button" onClick={() => setGastosEsMonto(true)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${gastosEsMonto ? 'bg-[#B3985B] text-black' : 'text-gray-400 hover:text-white'}`}>
                        Monto $
                      </button>
                    </div>

                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <p className="text-[10px] text-[#555] mb-1 px-1">
                          {gastosEsMonto ? 'Monto fijo de comisión' : 'Porcentaje sobre el total de la cotización'}
                        </p>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{gastosEsMonto ? '$' : '%'}</span>
                          <input
                            type="number" min="0"
                            step={gastosEsMonto ? "100" : "1"}
                            value={gastosValor}
                            onChange={e => setGastosValor(e.target.value)}
                            placeholder={gastosEsMonto ? '0.00' : '10'}
                            className="w-full bg-[#1a1a1a] border border-[#B3985B]/30 rounded-lg pl-7 pr-3 py-2 text-white text-sm text-right focus:outline-none focus:border-[#B3985B]"
                          />
                        </div>
                      </div>
                      {!gastosEsMonto && (
                        <button type="button" onClick={() => setGastosValor('10')}
                          className={`px-3 py-2 rounded-lg text-xs border transition-colors ${gastosValor === '10' ? 'bg-[#B3985B] border-[#B3985B] text-black font-bold' : 'border-[#333] text-gray-400 hover:border-[#B3985B] hover:text-[#B3985B]'}`}>
                          10%
                        </button>
                      )}
                    </div>

                    {!gastosEsMonto && (
                      <p className="text-[10px] text-gray-600 mt-2">
                        Base: {formatCurrency(base)} · {gastosValor || 0}% →{' '}
                        <span className="text-[#B3985B] font-semibold">{formatCurrency(montoCalc)}</span>
                      </p>
                    )}
                    <p className="text-[10px] text-gray-600 mt-1">
                      Se agrega como "Gastos de Producción" al total. No se muestra en el PDF del cliente.
                    </p>
                  </>
                )}
              </Seccion>
            );
          })()}

          {/* ── Observaciones ────────────────────────── */}
          <Seccion titulo="Observaciones">
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none"
              placeholder="Notas internas, condiciones especiales..." />
          </Seccion>
        </div>

        {/* ── Resumen sticky ── */}
        <div>
          <div className="sticky top-6 space-y-4">
            {/* Semáforo */}
            <div className={`rounded-xl border-2 p-4 ${sem.border} ${sem.bg}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${sem.text}`}>Viabilidad</p>
              <p className={`text-2xl font-bold mt-1 ${sem.text}`}>{sem.label}</p>
              <p className={`text-sm mt-0.5 ${sem.text}`}>{formatPct(resumen.pctUtilidad)} utilidad est.</p>
              <div className="mt-2 h-2 bg-black/20 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all bg-current ${sem.text}`} style={{ width: `${Math.min(resumen.pctUtilidad * 100, 100)}%` }} />
              </div>
            </div>

            {/* Resumen de precios */}
            <div className="ms-stat-card space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Equipos bruto</span>
                <span>{formatCurrency(resumen.subtotalEquiposBruto)}</span>
              </div>
              {resumen.montoVolumen > 0 && (
                <div className="flex justify-between text-red-400 text-xs">
                  <span>Desc. volumen ({cfgPctVolumen}%)</span>
                  <span>-{formatCurrency(resumen.montoVolumen)}</span>
                </div>
              )}
              {resumen.montoB2b > 0 && (
                <div className="flex justify-between text-red-400 text-xs">
                  <span>Desc. B2B ({cfgPctB2b}%)</span>
                  <span>-{formatCurrency(resumen.montoB2b)}</span>
                </div>
              )}
              {resumen.montoManual > 0 && (
                <div className="flex justify-between text-red-400 text-xs">
                  <span>Desc. especial {!manualEsMonto ? `(${parseFloat(manualValor)||0}%)` : ""}</span>
                  <span>-{formatCurrency(resumen.montoManual)}</span>
                </div>
              )}
              {(resumen.montoDescuento > 0) && (
                <div className="flex justify-between text-white font-medium">
                  <span>Equipos neto</span>
                  <span>{formatCurrency(resumen.subtotalEquiposNeto)}</span>
                </div>
              )}
              {resumen.subtotalPaquetes > 0 && <div className="flex justify-between text-gray-400"><span className="inline-flex items-center gap-1.5"><Package strokeWidth={1.75} className="w-3.5 h-3.5" /> Paquetes armados</span><span>{formatCurrency(resumen.subtotalPaquetes)}</span></div>}
              {resumen.subtotalExternos > 0 && <div className="flex justify-between text-gray-400"><span>Equipos terceros</span><span>{formatCurrency(resumen.subtotalExternos)}</span></div>}
              {resumen.subtotalOcasionales > 0 && <div className="flex justify-between text-gray-400"><span>Adicionales</span><span>{formatCurrency(resumen.subtotalOcasionales)}</span></div>}
              {resumen.subtotalOperacion > 0 && <div className="flex justify-between text-gray-400"><span>Operación técnica</span><span>{formatCurrency(resumen.subtotalOperacion)}</span></div>}
              {resumen.subtotalDJ > 0 && <div className="flex justify-between text-gray-400"><span>Servicio DJ</span><span>{formatCurrency(resumen.subtotalDJ)}</span></div>}
              {resumen.subtotalTransporte > 0 && <div className="flex justify-between text-gray-400"><span>Transporte</span><span>{formatCurrency(resumen.subtotalTransporte)}</span></div>}
              {resumen.subtotalComidas > 0 && <div className="flex justify-between text-gray-400"><span>Comidas</span><span>{formatCurrency(resumen.subtotalComidas)}</span></div>}
              {resumen.subtotalHospedaje > 0 && <div className="flex justify-between text-gray-400"><span>Hospedaje</span><span>{formatCurrency(resumen.subtotalHospedaje)}</span></div>}
              {resumen.subtotalChofer > 0 && <div className="flex justify-between text-gray-400"><span>Chofer de producción</span><span>{formatCurrency(resumen.subtotalChofer)}</span></div>}
              {resumen.gastosProduccionMonto > 0 && <div className="flex justify-between text-[#B3985B]"><span>Gastos de producción ({gastosEsMonto ? '' : `${gastosValor}% · `}{formatCurrency(resumen.gastosProduccionMonto)})</span><span>{formatCurrency(resumen.gastosProduccionMonto)}</span></div>}
              <div className="flex justify-between text-white font-semibold border-t border-[#333] pt-2"><span>Subtotal</span><span>{formatCurrency(resumen.total)}</span></div>
              {aplicaIva && <div className="flex justify-between text-gray-400"><span>IVA 16%</span><span>{formatCurrency(resumen.montoIva)}</span></div>}
              <div className="flex justify-between text-[#B3985B] font-bold text-base border-t border-[#333] pt-2"><span>Total</span><span>{formatCurrency(resumen.granTotal)}</span></div>
              {pagoAnticipadoActivo && resumen.montoPagoAnticipadoFinal > 0 && (
                <div className="mt-2 pt-2 border-t border-[#333] space-y-1 border border-green-900/30 rounded-lg p-2 bg-green-900/5">
                  <p className="text-green-400 text-xs font-semibold">Opción pago anticipado</p>
                  <div className="flex justify-between text-xs text-green-400"><span>Ahorro ({cfgPctAnticipado}%)</span><span>-{formatCurrency(resumen.montoPagoAnticipadoFinal)}</span></div>
                  <div className="flex justify-between text-xs text-white font-semibold"><span>Total c/ anticipo</span><span>{formatCurrency(resumen.totalConPagoAnticipado)}</span></div>
                </div>
              )}
              <div className="border-t border-[#222] pt-3 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between"><span>Anticipo 50%</span><span className="text-white">{formatCurrency(resumen.granTotal * 0.5)}</span></div>
                <div className="flex justify-between"><span>Liquidación 50%</span><span className="text-white">{formatCurrency(resumen.granTotal * 0.5)}</span></div>
              </div>
            </div>

            <button onClick={guardar} disabled={saving} className="w-full py-3 rounded-xl bg-[#B3985B] text-black font-bold hover:bg-[#c9a96a] disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar borrador"}
            </button>
          </div>
        </div>
      </div>

      {/* Panel déficit de stock */}
      {deficitInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <h3 className="text-white font-semibold">Stock insuficiente</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Tienes <strong className="text-white">{deficitInfo.stockPropio}</strong> unidades disponibles. Necesitas <strong className="text-orange-400">{deficitInfo.deficit} más</strong> de un proveedor externo.
            </p>
            <p className="text-xs text-gray-500 mb-4">Esta información es interna y NO aparece en la cotización al cliente.</p>

            {deficitProveedores.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">Proveedores recomendados</p>
                <div className="space-y-1.5">
                  {deficitProveedores.map(pp => (
                    <button key={pp.proveedor.id} type="button"
                      onClick={() => { setDeficitProveedorId(pp.proveedor.id); setDeficitProveedorTexto(''); }}
                      className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
                        deficitProveedorId === pp.proveedor.id
                          ? 'border-[#B3985B] bg-[#B3985B]/10'
                          : 'border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#0d0d0d]'
                      }`}>
                      <div>
                        <span className="text-sm text-white">{pp.proveedor.nombre}</span>
                        {pp.proveedor.empresa && <span className="text-xs text-gray-500 ml-1">— {pp.proveedor.empresa}</span>}
                        {pp.proveedor.prioridad > 0 && <span className="ml-2 text-[10px] text-yellow-500">{'⭐'.repeat(pp.proveedor.prioridad).slice(0, pp.proveedor.prioridad)}</span>}
                      </div>
                      <span className="text-xs text-[#B3985B] font-semibold">${pp.precio.toLocaleString('es-MX')}/día</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">O escribir proveedor</p>
              <input
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]/40 placeholder:text-gray-700"
                placeholder="Nombre del proveedor..."
                value={deficitProveedorTexto}
                onChange={e => { setDeficitProveedorTexto(e.target.value); setDeficitProveedorId(''); }}
              />
            </div>

            <div className="flex gap-2">
              <button type="button"
                onClick={() => {
                  if (deficitInfo) {
                    const deficitData = JSON.stringify({
                      cantidadPropia: deficitInfo.stockPropio,
                      cantidadExterna: deficitInfo.deficit,
                      proveedorRentaId: deficitProveedorId || null,
                      notasInternas: deficitProveedorTexto || null,
                    });
                    setLineasEquipo(prev => {
                      const idx = [...prev].reverse().findIndex(l => l.equipoId === deficitInfo.equipoId);
                      if (idx === -1) return prev;
                      const realIdx = prev.length - 1 - idx;
                      return prev.map((l, i) => i === realIdx
                        ? { ...l, notas: l.notas ? `${l.notas}|deficit:${deficitData}` : `deficit:${deficitData}` }
                        : l
                      );
                    });
                  }
                  setDeficitInfo(null);
                  setDeficitProveedorId('');
                  setDeficitProveedorTexto('');
                }}
                className="flex-1 bg-[#B3985B] hover:bg-[#c9a96a] text-black text-sm font-bold py-2.5 rounded-xl transition-colors">
                Confirmar
              </button>
              <button type="button" onClick={() => { setDeficitInfo(null); setDeficitProveedorId(''); setDeficitProveedorTexto(''); }}
                className="px-4 text-sm text-gray-500 hover:text-gray-300 border border-[#2a2a2a] rounded-xl transition-colors">
                Omitir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cascade Equipment Selector ────────────────────────────────────────────────
function CascadeEquipoSelect({
  value, onChange, equiposPorCategoria, dispMap, loadingDisp, preciosCliente, fechaEvento,
}: {
  value: string;
  onChange: (id: string) => void;
  equiposPorCategoria: [string, Equipo[]][];
  dispMap: Record<string, { disponible: number; total: number }>;
  loadingDisp: boolean;
  preciosCliente: Record<string, number>;
  fechaEvento: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Auto-select first category on open
  useEffect(() => {
    if (open && !activeCat && equiposPorCategoria.length > 0) {
      setActiveCat(equiposPorCategoria[0][0]);
    }
  }, [open, activeCat, equiposPorCategoria]);

  // Focus search when category changes
  useEffect(() => {
    if (activeCat && searchRef.current) {
      setSearch('');
      searchRef.current.focus();
    }
  }, [activeCat]);

  const allEquipos = equiposPorCategoria.flatMap(([, eqs]) => eqs);
  const selected = allEquipos.find(e => e.id === value);

  // Etiqueta principal: Marca + Modelo (o descripcion si no hay)
  const selectedLabel = selected
    ? [selected.marca, selected.modelo].filter(Boolean).join(' ') || selected.descripcion
    : null;
  const selectedSubLabel = (selectedLabel && selectedLabel !== selected?.descripcion)
    ? (selected?.descripcion ?? null)
    : null;

  // Cuando hay búsqueda: busca en TODAS las categorías e incluye modelo
  const q = search.toLowerCase().trim();
  const catEquipos = q
    ? allEquipos.filter(eq =>
        eq.descripcion.toLowerCase().includes(q) ||
        (eq.marca ?? '').toLowerCase().includes(q) ||
        (eq.modelo ?? '').toLowerCase().includes(q)
      )
    : activeCat
    ? (equiposPorCategoria.find(([cat]) => cat === activeCat)?.[1] ?? [])
    : [];

  function handleOpen() {
    setOpen(v => !v);
  }

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
    setSearch('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between bg-[#1a1a1a] border ${
          open ? 'border-[#B3985B]/60' : 'border-[#2a2a2a]'
        } rounded-lg px-3 py-2 text-sm text-left focus:outline-none hover:border-[#B3985B]/60 transition-colors`}
      >
        <span className={selected ? 'text-white truncate flex-1' : 'text-gray-500 flex-1'}>
          {selectedLabel
            ? (selectedSubLabel ? `${selectedLabel}  ·  ${selectedSubLabel}` : selectedLabel)
            : loadingDisp ? 'Cargando disponibilidad...' : '— Seleccionar equipo —'}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={e => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
              className="text-gray-600 hover:text-gray-300 text-sm leading-none px-0.5 cursor-pointer transition-colors"
            >×</span>
          )}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute z-50 top-full mt-1 left-0 bg-[#0d0d0d] border border-[#222] rounded-xl shadow-2xl overflow-hidden flex"
          style={{ minWidth: Math.max(460, containerRef.current?.offsetWidth ?? 460) }}
        >
          {/* Left: categories */}
          <div className="w-44 shrink-0 border-r border-[#1a1a1a] py-1 overflow-y-auto" style={{ maxHeight: 260 }}>
            {equiposPorCategoria.map(([cat, eqs]) => (
              <button
                key={cat}
                type="button"
                onMouseEnter={() => setActiveCat(cat)}
                onClick={() => setActiveCat(cat)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                  activeCat === cat
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#111]'
                }`}
              >
                <span className="truncate">{cat}</span>
                <span className="text-gray-700 text-[10px] shrink-0 ml-1">({eqs.length})</span>
              </button>
            ))}
          </div>

          {/* Right: equipment */}
          <div className="flex-1 flex flex-col min-w-0" style={{ maxHeight: 260 }}>
            {activeCat ? (
              <>
                {/* Search */}
                <div className="px-3 py-2 border-b border-[#1a1a1a] shrink-0">
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar equipo..."
                    className="w-full bg-[#111] border border-[#1a1a1a] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#B3985B]/50"
                  />
                </div>
                {/* Equipment list */}
                <div className="overflow-y-auto flex-1">
                  {catEquipos.length === 0 ? (
                    <p className="text-gray-600 text-xs px-3 py-4 text-center">Sin resultados</p>
                  ) : (
                    catEquipos.map(eq => {
                      const d = dispMap[eq.id];
                      const precio = preciosCliente[eq.id] ?? eq.precioRenta;

                      // Availability badge — readable text with semantic color
                      let dispText: string;
                      let dispColor: string;
                      if (fechaEvento && d !== undefined) {
                        if (d.disponible === 0) {
                          dispText = 'Sin disponibilidad';
                          dispColor = '#ef4444';
                        } else if (d.disponible < d.total) {
                          dispText = `${d.disponible} de ${d.total} disp.`;
                          dispColor = '#f59e0b';
                        } else {
                          dispText = `${d.disponible} disponibles`;
                          dispColor = '#22c55e';
                        }
                      } else if (loadingDisp) {
                        dispText = 'Verificando...';
                        dispColor = '#555';
                      } else {
                        dispText = `${eq.cantidadTotal} en inventario`;
                        dispColor = '#555';
                      }

                      const isSelected = value === eq.id;
                      return (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => handleSelect(eq.id)}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                            isSelected
                              ? 'bg-[#B3985B]/10 text-[#B3985B]'
                              : 'text-gray-400 hover:bg-[#111] hover:text-white'
                          }`}
                        >
                          <span className="flex-1 min-w-0">
                            <span className="block font-medium truncate">
                              {[eq.marca, eq.modelo].filter(Boolean).join(' ') || eq.descripcion}
                            </span>
                            {([eq.marca, eq.modelo].filter(Boolean).join(' ') !== eq.descripcion) && (
                              <span className="block text-[10px] text-gray-500 truncate">{eq.descripcion}</span>
                            )}
                          </span>
                          <span className="shrink-0 text-[10px] whitespace-nowrap flex items-center gap-1.5">
                            {q && <span className="text-[9px] text-gray-600 max-w-[60px] truncate font-normal">{eq.categoria.nombre}</span>}
                            <span className="text-gray-600">{precio > 0 ? formatCurrency(precio) : 'INCLUYE'}</span>
                            <span style={{ color: dispColor }}>{dispText}</span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-xs px-4 py-6 text-center">Pasa el cursor sobre una categoría</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NuevaCotizacionPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 text-sm p-8">Cargando cotizador...</div>}>
      <CotizadorForm />
    </Suspense>
  );
}
