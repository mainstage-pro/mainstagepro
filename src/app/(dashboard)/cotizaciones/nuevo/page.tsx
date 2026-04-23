"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useConfirm } from "@/components/Confirm";
import { useRouter, useSearchParams } from "next/navigation";
import { calcularDescuentoVolumen, calcularDescuentoMultidia, formatCurrency, formatPct } from "@/lib/cotizador";
import { DESCUENTO_B2B, IVA, VIABILIDAD, JORNADA_LABELS } from "@/lib/constants";
import { getSugerencias, type SugItem } from "@/lib/sugerencias-equipo";
import { getSugerenciasTecnicos } from "@/lib/sugerencias-tecnicos";
import VenuePicker from "@/components/ui/VenuePicker";
import NumSelect from "@/components/ui/NumSelect";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { Combobox } from "@/components/Combobox";

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
  id: string; equipoId: string; descripcion: string; marca: string;
  cantidad: number; dias: number; precioUnitario: number; subtotal: number;
  categoria: string; // nombre de la categoría para subsecciones
}

interface LineaExterno {
  id: string; equipoId: string; descripcion: string; marca: string;
  cantidad: number; dias: number;
  precioUnitario: number; // precio al cliente
  costoProveedor: number;  // costo que nos cobra el proveedor
  subtotal: number;        // precioUnitario × cantidad × días
  costoTotal: number;      // costoProveedor × cantidad × días (para viabilidad)
  proveedorId: string | null; // proveedor por defecto del equipo → se transfiere al proyecto
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

// ─── Constantes ───────────────────────────────────────────────────────────────
const DJ_TARIFAS: Record<string, number> = { AAA: 600, AA: 500, A: 400 };

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
  const j = jornada.charAt(0) + jornada.slice(1).toLowerCase();
  const key = `tarifa${nivel}${j}` as keyof RolTecnico;
  return (rol[key] as number | null) ?? 0;
}

const SEMAFORO_STYLE: Record<string, { border: string; text: string; bg: string; label: string }> = {
  IDEAL:    { border: "border-green-500",  text: "text-green-400",  bg: "bg-green-900/20",  label: "IDEAL" },
  REGULAR:  { border: "border-yellow-500", text: "text-yellow-400", bg: "bg-yellow-900/20", label: "REGULAR" },
  MINIMO:   { border: "border-orange-500", text: "text-orange-400", bg: "bg-orange-900/20", label: "MÍNIMO" },
  RIESGO:   { border: "border-red-500",    text: "text-red-400",    bg: "bg-red-900/20",    label: "RIESGO" },
};

// ─── Subcomponente de sección ─────────────────────────────────────────────────
function Seccion({ titulo, children, hint }: { titulo: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">{titulo}</h2>
        {hint && <span className="text-gray-600 text-xs">{hint}</span>}
      </div>
      {children}
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
  // Briefing del trato (solo lectura en cotizador)
  const [tratoNotas, setTratoNotas] = useState<string | null>(null);
  const [tratoArchivos, setTratoArchivos] = useState<Array<{ id: string; nombre: string; url: string; tipo: string }>>([]);
  const [tratoFormEstado, setTratoFormEstado] = useState<string | null>(null);
  const [tratoServicios, setTratoServicios] = useState<string[]>([]);
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
  const [lineasExterno, setLineasExterno] = useState<LineaExterno[]>([]);
  const [lineasOp, setLineasOp] = useState<LineaOp[]>([]);
  const [lineasDJ, setLineasDJ] = useState<LineaDJ[]>([]);
  const [lineasLog, setLineasLog] = useState<LineaLogistica[]>([]);

  // Notas por categoría de equipo
  const [notasSecciones, setNotasSecciones] = useState<Record<string, string>>({});

  // Selectores rápidos
  const [selEq, setSelEq] = useState(""); const [selEqCant, setSelEqCant] = useState("1"); const [selEqDias, setSelEqDias] = useState("1");
  const [selExt, setSelExt] = useState(""); const [selExtCant, setSelExtCant] = useState("1"); const [selExtDias, setSelExtDias] = useState("1");
  const [selRol, setSelRol] = useState(""); const [selRolNivel, setSelRolNivel] = useState("AA"); const [selRolJornada, setSelRolJornada] = useState("CORTA"); const [selRolCant, setSelRolCant] = useState("1");
  const [selDJNivel, setSelDJNivel] = useState("AA"); const [selDJHoras, setSelDJHoras] = useState("4");
  const [logConcepto, setLogConcepto] = useState({ COMIDA: CONCEPTOS_COMIDA[0].label, TRANSPORTE: CONCEPTOS_TRANSPORTE[0].label, HOSPEDAJE: CONCEPTOS_HOSPEDAJE[0].label });
  const [logPrecio, setLogPrecio] = useState({ COMIDA: String(CONCEPTOS_COMIDA[0].precio), TRANSPORTE: String(CONCEPTOS_TRANSPORTE[0].precio), HOSPEDAJE: String(CONCEPTOS_HOSPEDAJE[0].precio) });
  const [logCant, setLogCant] = useState({ COMIDA: "1", TRANSPORTE: "1", HOSPEDAJE: "1" });
  const [logDias, setLogDias] = useState({ COMIDA: "1", TRANSPORTE: "1", HOSPEDAJE: "1" });

  // Proveedores para selector en modal nuevo equipo
  const [proveedores, setProveedores] = useState<Array<{ id: string; nombre: string; telefono: string | null }>>([]);
  const [showConfirmDisp, setShowConfirmDisp] = useState(false);

  // Nuevos: modal nuevo equipo proveedor + adicionales
  const [showNuevoEqModal, setShowNuevoEqModal] = useState(false);
  const [nuevoEqForm, setNuevoEqForm] = useState({ descripcion: "", marca: "", categoriaId: "", precioRenta: "", costoProveedor: "", cantidadTotal: "1", proveedorId: "" });
  const [guardandoEq, setGuardandoEq] = useState(false);
  const [lineasOcasional, setLineasOcasional] = useState<LineaOcasional[]>([]);
  const [selOcDesc, setSelOcDesc] = useState("");
  const [selOcPrecio, setSelOcPrecio] = useState("");
  const [selOcCant, setSelOcCant] = useState("1");
  const [selOcDias, setSelOcDias] = useState("1");

  // Descuentos
  // Descuentos — todos con toggle (off por defecto, se activan manualmente o desde trato)
  const [b2bActivo, setB2bActivo] = useState(false);
  const [b2bEdit, setB2bEdit] = useState(false);
  const [dB2BManual, setDB2BManual] = useState<string>("");
  const [volumenActivo, setVolumenActivo] = useState(false);
  const [volumenEdit, setVolumenEdit] = useState(false);
  const [dVolumenManual, setDVolumenManual] = useState<string>("");
  const [multidiaActivo, setMultidiaActivo] = useState(false);
  const [multidiaEdit, setMultidiaEdit] = useState(false);
  const [dMultidiaManual, setDMultidiaManual] = useState<string>("");
  const [especialActivo, setEspecialActivo] = useState(false); // renombrado de Family & Friends
  const [especialEdit, setEspecialEdit] = useState(false);
  const [dFamilyFriends, setDFamilyFriends] = useState("10"); // % fijo por defecto
  const [aplicaIva, setAplicaIva] = useState(false);
  const [incluirChofer, setIncluirChofer] = useState(false);
  const [descuentoAplicaAdicionales, setDescuentoAplicaAdicionales] = useState(false);
  const [observaciones, setObservaciones] = useState("");

  // Disponibilidad de inventario para la fecha del evento
  const [dispMap, setDispMap] = useState<Record<string, { disponible: number; comprometido: number; total: number; eventos: Array<{ ref: string; nombre: string; estado: string }> }>>({});
  const [loadingDisp, setLoadingDisp] = useState(false);

  // Cargar datos (modo nuevo O modo edición)
  useEffect(() => {
    fetch("/api/plantillas-cotizacion").then(r => r.json()).then(d => setPlantillas(d.plantillas ?? [])).catch(() => {});
    Promise.all([
      fetch("/api/equipos").then(r => r.json()),
      fetch("/api/roles-tecnicos").then(r => r.json()),
      clienteId ? fetch(`/api/clientes/${clienteId}`).then(r => r.json()) : Promise.resolve(null),
      tratoId ? fetch(`/api/tratos/${tratoId}`).then(r => r.json()) : Promise.resolve(null),
      editId ? fetch(`/api/cotizaciones/${editId}`).then(r => r.json()) : Promise.resolve(null),
      clienteId ? fetch(`/api/clientes/${clienteId}/precios-equipos`).then(r => r.json()) : Promise.resolve(null),
      fetch("/api/proveedores").then(r => r.json()),
    ]).then(([eq, rol, cl, tr, editData, preciosData, provData]) => {
      const eqs: Equipo[] = eq.equipos ?? [];
      setEquipos(eqs);
      setRoles(rol.roles ?? []);
      setProveedores(provData?.proveedores ?? []);

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
        if ((cot.descuentoB2bPct ?? 0) > 0) { setB2bActivo(true); if (Math.round(cot.descuentoB2bPct * 100) !== 10) setDB2BManual(String(Math.round(cot.descuentoB2bPct * 100))); }
        if ((cot.descuentoVolumenPct ?? 0) > 0) setVolumenActivo(true);
        if ((cot.descuentoMultidiaPct ?? 0) > 0) { setMultidiaActivo(true); }
        if ((cot.descuentoFamilyFriendsPct ?? 0) > 0) { setEspecialActivo(true); setDFamilyFriends(String(Math.round(cot.descuentoFamilyFriendsPct * 100))); }
        if (cot.notasSecciones) {
          try { setNotasSecciones(JSON.parse(cot.notasSecciones)); } catch { /* ignore */ }
        }
        // Reconstruir líneas
        const lineas = cot.lineas ?? [];
        setLineasEquipo(lineas.filter((l: {tipo:string}) => l.tipo === "EQUIPO_PROPIO").map((l: {id:string;equipoId:string;descripcion:string;marca:string|null;cantidad:number;dias:number;precioUnitario:number;subtotal:number;notas:string|null}) => ({
          id: uid(), equipoId: l.equipoId ?? "", descripcion: l.descripcion,
          marca: l.marca ?? "", cantidad: l.cantidad, dias: l.dias,
          precioUnitario: l.precioUnitario, subtotal: l.subtotal,
          categoria: l.notas?.startsWith("cat:") ? l.notas.slice(4) : "",
        })));
        setLineasExterno(lineas.filter((l: {tipo:string}) => l.tipo === "EQUIPO_EXTERNO").map((l: {equipoId:string;descripcion:string;marca:string|null;cantidad:number;dias:number;precioUnitario:number;costoUnitario:number;subtotal:number;proveedorId:string|null}) => ({
          id: uid(), equipoId: l.equipoId ?? "", descripcion: l.descripcion,
          marca: l.marca ?? "", cantidad: l.cantidad, dias: l.dias,
          precioUnitario: l.precioUnitario, costoProveedor: l.costoUnitario ?? 0,
          subtotal: l.subtotal, costoTotal: (l.costoUnitario ?? 0) * l.cantidad * l.dias,
          proveedorId: l.proveedorId ?? null,
        })));
        setLineasOp(lineas.filter((l: {tipo:string}) => l.tipo === "OPERACION_TECNICA").map((l: {id:string;rolTecnicoId:string|null;descripcion:string;nivel:string|null;jornada:string|null;cantidad:number;dias:number;precioUnitario:number;subtotal:number}) => ({
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
        }));
        if (t.notas) setTratoNotas(t.notas);
        if (t.archivos?.length) setTratoArchivos(t.archivos);
        // Auto-activate "Descuento especial" if trato is Family & Friends
        if (t.familyAndFriends) {
          setEspecialActivo(true);
          setDFamilyFriends("10");
        }
        if (t.asistentesEstimados) setAsistentesEstimados(t.asistentesEstimados);
        if (t.formEstado) setTratoFormEstado(t.formEstado);
        if (t.serviciosInteres) { try { setTratoServicios(JSON.parse(t.serviciosInteres)); } catch { /* noop */ } }
      }
    });
  }, [clienteId, tratoId]);

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
      marca: [eq.marca, eq.modelo].filter(Boolean).join(" "),
      cantidad: cant, dias, precioUnitario: precio,
      subtotal: precio * cant * dias,
      categoria: eq.categoria.nombre,
    }]);
    setSelEq(""); setSelEqCant("1"); setSelEqDias(evento.diasEquipo);
  }

  // ── Sugerencias de equipo ──
  function matchInventario(keyword: string): Equipo | undefined {
    const kw = keyword.toLowerCase().trim();
    return equipos.find(e => {
      if (e.tipo !== "PROPIO") return false;
      const texto = `${e.descripcion} ${e.marca ?? ""} ${e.modelo ?? ""}`.toLowerCase();
      return texto.includes(kw);
    });
  }

  function agregarSugerencia(item: SugItem, eq: Equipo) {
    const yaExiste = lineasEquipo.some(l => l.equipoId === eq.id);
    if (yaExiste) return;
    const precio = preciosCliente[eq.id] ?? eq.precioRenta;
    const dias = parseInt(evento.diasEquipo) || 1;
    setLineasEquipo(prev => [...prev, {
      id: uid(), equipoId: eq.id, descripcion: eq.descripcion,
      marca: [eq.marca, eq.modelo].filter(Boolean).join(" "),
      cantidad: item.cant, dias,
      precioUnitario: precio,
      subtotal: precio * item.cant * dias,
      categoria: eq.categoria.nombre,
    }]);
  }

  function agregarSugerenciaTecnico(keyword: string, cantidad: number) {
    const kw = keyword.toLowerCase();
    const rol = roles.find(r => r.nombre.toLowerCase().includes(kw));
    if (!rol) return;
    const dias = parseInt(evento.diasOperacion) || 1;
    const tarifa = getRolTarifa(rol, selRolNivel, selRolJornada);
    // Si ya existe ese rol exacto con mismo nivel/jornada, no duplicar
    const yaExiste = lineasOp.some(l => l.rolTecnicoId === rol.id && l.nivel === selRolNivel && l.jornada === selRolJornada);
    if (yaExiste) return;
    setLineasOp(prev => [...prev, {
      id: uid(), rolTecnicoId: rol.id, descripcion: rol.nombre,
      nivel: selRolNivel, jornada: selRolJornada, cantidad, dias,
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
    setLineasExterno(prev => [...prev, {
      id: uid(), equipoId: eq.id, descripcion: eq.descripcion,
      marca: [eq.marca, eq.modelo].filter(Boolean).join(" "),
      cantidad: cant, dias,
      precioUnitario: eq.precioRenta,
      costoProveedor: costo,
      subtotal: eq.precioRenta * cant * dias,
      costoTotal: costo * cant * dias,
      proveedorId: eq.proveedorDefaultId ?? null,
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
      }]);
      setNuevoEqForm({ descripcion: "", marca: "", categoriaId: "", precioRenta: "", costoProveedor: "", cantidadTotal: "1", proveedorId: "" });
      setShowNuevoEqModal(false);
    } finally {
      setGuardandoEq(false);
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
    const tarifa = getRolTarifa(rol, selRolNivel, selRolJornada);
    setLineasOp(prev => [...prev, {
      id: uid(), rolTecnicoId: rol.id, descripcion: rol.nombre,
      nivel: selRolNivel, jornada: selRolJornada, cantidad: cant, dias,
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
    const tarifa = DJ_TARIFAS[selDJNivel] ?? 0;
    setLineasDJ(prev => [...prev, {
      id: uid(), nivel: selDJNivel, horas, tarifa, subtotal: tarifa * horas,
    }]);
  }

  // ─── Cálculo del resumen ──────────────────────────────────────────────────
  const resumen = useMemo(() => {
    const subtotalEquiposBruto = lineasEquipo.reduce((s, l) => s + l.subtotal, 0);
    // Externos: precio al cliente (sin descuento) y costo de proveedor (para viabilidad)
    const subtotalExternos = lineasExterno.reduce((s, l) => s + l.subtotal, 0);
    const costoExternos = lineasExterno.reduce((s, l) => s + l.costoTotal, 0);

    const subtotalOperacion = lineasOp.reduce((s, l) => s + l.subtotal, 0);
    const subtotalDJ = lineasDJ.reduce((s, l) => s + l.subtotal, 0);
    const subtotalTransporte = lineasLog.filter(l => l.tipo === "TRANSPORTE").reduce((s, l) => s + l.subtotal, 0);
    const subtotalComidas = lineasLog.filter(l => l.tipo === "COMIDA").reduce((s, l) => s + l.subtotal, 0);
    const subtotalHospedaje = lineasLog.filter(l => l.tipo === "HOSPEDAJE").reduce((s, l) => s + l.subtotal, 0);

    const dias = parseInt(evento.diasEquipo) || 1;

    // Descuentos: todos tienen toggle — solo aplican cuando están activos
    const autoVolumen = calcularDescuentoVolumen(subtotalEquiposBruto);
    const autoB2B = DESCUENTO_B2B; // 10% fijo para B2B
    const autoMultidia = calcularDescuentoMultidia(dias);

    const dB2B = b2bActivo ? (dB2BManual !== "" ? parseFloat(dB2BManual) / 100 : autoB2B) : 0;
    const dVolumen = volumenActivo ? (dVolumenManual !== "" ? parseFloat(dVolumenManual) / 100 : autoVolumen) : 0;
    const dMultidia = multidiaActivo ? (dMultidiaManual !== "" ? parseFloat(dMultidiaManual) / 100 : autoMultidia) : 0;
    const dFF = especialActivo ? (dFamilyFriends !== "" ? parseFloat(dFamilyFriends) / 100 : 0.10) : 0;

    const descuentoTotalPct = dB2B + dVolumen + dMultidia + dFF;
    const montoDescuento = subtotalEquiposBruto * descuentoTotalPct;
    const subtotalEquiposNeto = subtotalEquiposBruto - montoDescuento;

    const subtotalOcasionales = lineasOcasional.reduce((s, l) => s + l.subtotal, 0);
    // Cuando el checkbox está activo, aplica el mismo % de descuento a externos Y ocasionales
    const descuentoMontaExternos    = descuentoAplicaAdicionales ? subtotalExternos  * descuentoTotalPct : 0;
    const descuentoMontaAdicionales = descuentoAplicaAdicionales ? subtotalOcasionales * descuentoTotalPct : 0;
    const subtotalExternosNeto    = subtotalExternos    - descuentoMontaExternos;
    const subtotalOcasionalesNeto = subtotalOcasionales - descuentoMontaAdicionales;

    // Total incluye equipos propios (con descuento) + externos (con/sin descuento) + ocasionales + operación + logística
    const subtotalChofer = incluirChofer ? 500 : 0;
    const total = subtotalEquiposNeto + subtotalExternosNeto + subtotalOcasionalesNeto + subtotalOperacion + subtotalDJ + subtotalTransporte + subtotalComidas + subtotalHospedaje + subtotalChofer;
    const montoIva = aplicaIva ? total * IVA : 0;
    const granTotal = total + montoIva;

    // Costo real = operación + DJ + logística + costo de proveedor de equipos externos
    // Equipo propio = sin costo (ya capitalizado), su renta es margen puro.
    const costos = lineasOp.reduce((s, l) => s + l.subtotal, 0)
      + lineasDJ.reduce((s, l) => s + l.subtotal, 0)
      + subtotalTransporte + subtotalComidas + subtotalHospedaje
      + costoExternos;

    const utilidad = total - costos;
    const pctUtilidad = total > 0 ? utilidad / total : 0;

    const semaforo = pctUtilidad >= VIABILIDAD.IDEAL ? "IDEAL"
      : pctUtilidad >= VIABILIDAD.REGULAR ? "REGULAR"
      : pctUtilidad >= VIABILIDAD.MINIMO ? "MINIMO" : "RIESGO";

    return {
      subtotalEquiposBruto, subtotalExternos, subtotalExternosNeto, subtotalOcasionales, subtotalOcasionalesNeto,
      descuentoMontaExternos, descuentoMontaAdicionales, costoExternos,
      subtotalOperacion, subtotalDJ, subtotalChofer,
      subtotalTransporte, subtotalComidas, subtotalHospedaje,
      autoVolumen, autoB2B, autoMultidia,
      dB2B, dVolumen, dMultidia, dFF,
      descuentoTotalPct, montoDescuento,
      subtotalEquiposNeto, total, montoIva, granTotal,
      costos, utilidad, pctUtilidad, semaforo,
    };
  }, [lineasEquipo, lineasExterno, lineasOcasional, lineasOp, lineasDJ, lineasLog, evento.diasEquipo,
    b2bActivo, dB2BManual, volumenActivo, dVolumenManual, multidiaActivo, dMultidiaManual,
    especialActivo, dFamilyFriends, aplicaIva, incluirChofer, descuentoAplicaAdicionales]);

  const sem = SEMAFORO_STYLE[resumen.semaforo];

  // ── Guardar ──
  async function guardar() {
    const tId = resolvedTratoId || tratoId;
    const cId = resolvedClienteId || clienteId;
    if (!tId || !cId) { setError("Falta tratoId o clienteId"); return; }
    setSaving(true); setError("");

    const todasLineas = [
      ...lineasEquipo.map(l => ({
        tipo: "EQUIPO_PROPIO", descripcion: l.descripcion, marca: l.marca,
        cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario,
        costoUnitario: 0, subtotal: l.subtotal,
        esExterno: false, esIncluido: false, equipoId: l.equipoId,
        notas: l.categoria ? `cat:${l.categoria}` : null,
      })),
      ...lineasExterno.map(l => ({
        tipo: "EQUIPO_EXTERNO", descripcion: l.descripcion, marca: l.marca,
        cantidad: l.cantidad, dias: l.dias, precioUnitario: l.precioUnitario,
        costoUnitario: l.costoProveedor, // guardamos el costo del proveedor para recuperarlo en edición
        subtotal: l.subtotal,
        esExterno: true, esIncluido: false, equipoId: l.equipoId,
        proveedorId: l.proveedorId ?? null,
      })),
      ...lineasOp.map(l => ({
        tipo: "OPERACION_TECNICA", descripcion: l.descripcion,
        nivel: l.nivel, jornada: l.jornada, cantidad: l.cantidad, dias: l.dias,
        precioUnitario: l.precioUnitario, costoUnitario: l.precioUnitario,
        subtotal: l.subtotal, esExterno: false, esIncluido: false, rolTecnicoId: l.rolTecnicoId,
      })),
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
    ];

    const payload = {
      tratoId: tId, clienteId: cId, ...evento,
      notasSecciones: Object.keys(notasSecciones).length > 0 ? JSON.stringify(notasSecciones) : null,
      descuentoPatrocinioNota: null,
      descuentoEspecialNota: null,
      observaciones,
      lineas: todasLineas,
      subtotalEquiposBruto: resumen.subtotalEquiposBruto,
      descuentoB2bPct: resumen.dB2B,
      descuentoVolumenPct: resumen.dVolumen,
      descuentoMultidiaPct: resumen.dMultidia,
      descuentoPatrocinioPct: 0,
      descuentoEspecialPct: 0,
      descuentoFamilyFriendsPct: resumen.dFF,
      descuentoTotalPct: resumen.descuentoTotalPct,
      montoDescuento: resumen.montoDescuento,
      montoBeneficio: resumen.montoDescuento,
      subtotalEquiposNeto: resumen.subtotalEquiposNeto,
      subtotalPaquetes: 0,
      subtotalTerceros: resumen.subtotalExternosNeto + resumen.subtotalOcasionalesNeto,
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
    <div className="p-3 md:p-6 max-w-6xl mx-auto">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{editId ? "Editar Cotización" : "Nueva Cotización"}</h1>
          {clienteNombre && <p className="text-[#B3985B] text-sm mt-0.5">{clienteNombre}</p>}
        </div>
        <div className="flex gap-3">
          {!editId && plantillas.length > 0 && (
            <button
              onClick={() => setShowPlantillas(true)}
              className="px-4 py-2 rounded-lg border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10 text-sm font-medium"
            >
              📋 Cargar plantilla
            </button>
          )}
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm">Cancelar</button>
          <button onClick={guardar} disabled={saving} className="px-6 py-2.5 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50">
            {saving ? "Guardando..." : editId ? "Guardar cambios" : "Guardar borrador"}
          </button>
        </div>
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
                        marca: l.marca ?? "", categoria: l.notas?.startsWith("cat:") ? l.notas.slice(4) : "",
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
                      className="bg-[#111] border border-[#222] rounded-lg overflow-hidden hover:border-[#B3985B]/40 transition-colors">
                      {esImagen ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.url} alt={a.nombre} className="w-full h-20 object-cover" />
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-3">
                          <span className="text-xl">
                            {/\.pdf$/i.test(a.url) ? "📄" : /\.(doc|docx)$/i.test(a.url) ? "📝" : /\.(xls|xlsx)$/i.test(a.url) ? "📊" : "📎"}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">

          {/* ── Datos del evento ── */}
          <Seccion titulo="Datos del evento">
            <div className="grid grid-cols-2 gap-3">
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

          {/* ── Sugerencias de equipo ── */}
          {evento.tipoEvento && asistentesEstimados && asistentesEstimados > 0 && (
            <details className="bg-[#0d0d0d] border border-[#B3985B]/30 rounded-xl group" open>
              <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none">
                <span className="text-[#B3985B] text-xs font-semibold uppercase tracking-wider">Sugerencia de equipo</span>
                <span className="text-gray-500 text-xs">{evento.tipoEvento.charAt(0) + evento.tipoEvento.slice(1).toLowerCase()} · {asistentesEstimados} personas</span>
                <span className="ml-auto text-gray-600 text-xs group-open:hidden">▶ ver guía</span>
                <span className="ml-auto text-gray-600 text-xs hidden group-open:inline">▼ ocultar</span>
              </summary>
              <div className="px-5 pb-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getSugerencias(evento.tipoEvento, asistentesEstimados, tratoServicios.length > 0 ? tratoServicios : undefined).map((grupo) => (
                    <div key={grupo.cat} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-3">
                      <p className="text-[#B3985B] text-[10px] font-bold uppercase tracking-wider mb-2">{grupo.cat}</p>
                      <div className="space-y-1.5">
                        {grupo.items.map((item, i) => {
                          const eq = item.cant > 0 ? matchInventario(item.desc) : undefined;
                          const yaAgregado = eq ? lineasEquipo.some(l => l.equipoId === eq.id) : false;
                          return (
                            <div key={i} className={`flex items-start gap-2 text-sm ${item.esOpcional ? "opacity-55" : ""}`}>
                              {item.cant > 0 ? (
                                <span className="text-[#B3985B] text-xs font-mono w-5 shrink-0 pt-0.5 text-right">{item.cant}×</span>
                              ) : (
                                <span className="w-5 shrink-0" />
                              )}
                              <span className={`flex-1 leading-snug ${item.cant === 0 ? "text-yellow-500/80 text-xs italic" : "text-gray-300"}`}>
                                {item.desc}
                                {item.esOpcional && <span className="ml-1 text-[10px] text-gray-600">opcional</span>}
                                {item.nota && <span className="ml-1 text-[10px] text-gray-500">— {item.nota}</span>}
                              </span>
                              {eq && !yaAgregado && (
                                <button
                                  onClick={() => agregarSugerencia(item, eq)}
                                  className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-[#B3985B]/15 text-[#B3985B] hover:bg-[#B3985B]/30 transition-colors leading-5"
                                >
                                  + Agregar
                                </button>
                              )}
                              {eq && yaAgregado && (
                                <span className="shrink-0 text-[10px] text-green-500 px-1 leading-5">✓</span>
                              )}
                              {!eq && item.cant > 0 && (
                                <span className="shrink-0 text-[10px] text-gray-700 px-1 leading-5">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-gray-700 text-xs mt-3 pt-3 border-t border-[#1a1a1a]">
                  Guía comercial de arranque. Ajustar según venue, interior/exterior, altura, si hay pista, y requerimientos específicos del cliente.
                </p>
              </div>
            </details>
          )}

          {/* ── Equipos propios ── */}
          <Seccion titulo="Equipos propios" hint="aplican descuentos · precio editable por línea · ★ = precio especial del cliente">
            {/* Selector */}
            <div className="flex gap-2 mb-4 items-end">
              <div className="flex-1">
                <p className="text-[10px] text-[#555] mb-1 px-1">Equipo</p>
                <SearchableSelect
                  value={selEq}
                  onChange={setSelEq}
                  placeholder={`— Buscar equipo${loadingDisp ? " (cargando disp.)" : ""}… —`}
                  options={equiposPorCategoria.flatMap(([cat, eqs]) => eqs.map(eq => {
                    const d = dispMap[eq.id];
                    const dispLabel = evento.fechaEvento && d !== undefined
                      ? (d.disponible === 0 ? " ⛔" : d.disponible < d.total ? ` ⚠${d.disponible}/${d.total}` : ` ✓${d.disponible}`)
                      : "";
                    return {
                      value: eq.id,
                      label: `${eq.descripcion}${eq.marca ? ` · ${eq.marca}` : ""}${eq.modelo ? ` ${eq.modelo}` : ""}${eq.precioRenta > 0 ? ` — ${formatCurrency(eq.precioRenta)}` : " — INCLUYE"}${dispLabel}`,
                      group: cat,
                    };
                  }))}
                />
              </div>
              <div>
                <p className="text-[10px] text-[#555] mb-1 text-center">Cantidad</p>
                <NumSelect value={selEqCant} onChange={setSelEqCant} max={20} className="w-20 py-2" />
              </div>
              <div>
                <p className="text-[10px] text-[#555] mb-1 text-center">Días</p>
                <NumSelect value={selEqDias} onChange={setSelEqDias} max={10} className="w-20 py-2" />
              </div>
              <button onClick={agregarEquipo} disabled={!selEq} className="px-3 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40">+ Agregar</button>
            </div>

            {lineasEquipo.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-3">Sin equipos agregados</p>
            ) : (
              /* Subsecciones por categoría */
              (() => {
                const cats = Array.from(new Set(lineasEquipo.map(l => l.categoria || "Sin categoría")));
                return cats.map(cat => {
                  const lins = lineasEquipo.filter(l => (l.categoria || "Sin categoría") === cat);
                  const subTotal = lins.reduce((s, l) => s + l.subtotal, 0);
                  return (
                    <div key={cat} className="mb-4 border border-[#222] rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between bg-[#0d0d0d] px-3 py-2">
                        <span className="text-[10px] font-semibold text-[#B3985B] uppercase tracking-wider">{cat}</span>
                        <span className="text-xs text-gray-400">{formatCurrency(subTotal)}</span>
                      </div>
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
                                <span className="text-red-400 text-xs font-semibold shrink-0">⛔ Sobrestock</span>
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
                                <span className="text-yellow-400 text-xs font-semibold shrink-0">⚠ Stock comprometido</span>
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
                          <div className="flex items-center gap-2 px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-white text-sm truncate">{l.descripcion}</p>
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
                              {l.marca && <p className="text-gray-500 text-xs">{l.marca}</p>}
                            </div>
                            <NumSelect value={l.cantidad} onChange={v => updateEquipo(l.id, "cantidad", parseFloat(v) || 1)} max={20} className="w-14 py-1" title="Cantidad" />
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
                        </div>
                        </>
                        );
                      })}
                      {/* Nota por sección */}
                      <div className="px-3 py-2 border-t border-[#111] bg-[#0a0a0a]">
                        <textarea
                          value={notasSecciones[cat] ?? ""}
                          onChange={e => setNotasSecciones(prev => ({ ...prev, [cat]: e.target.value }))}
                          rows={1}
                          placeholder={`Nota de montaje / particularidades para ${cat}...`}
                          className="w-full bg-transparent text-xs text-[#6b7280] placeholder-[#333] resize-none focus:outline-none focus:text-white transition-colors"
                        />
                      </div>
                    </div>
                  );
                });
              })()
            )}

            <div className="mt-1 flex items-center justify-between">
              <button
                onClick={() => fetch("/api/equipos").then(r => r.json()).then(data => setEquipos(data.equipos ?? []))}
                className="text-[10px] text-[#555] hover:text-[#B3985B] transition-colors"
                title="Recargar lista de equipos del catálogo"
              >
                ↻ Recargar catálogo
              </button>
              <a href="/catalogo/equipos" target="_blank" className="text-[10px] text-[#555] hover:text-[#B3985B] transition-colors">
                → Ir al catálogo de equipos
              </a>
            </div>
          </Seccion>

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
                <div className="grid grid-cols-2 gap-2 mb-3">
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
                    label: `${eq.descripcion}${eq.marca ? ` · ${eq.marca}` : ""} — cliente: ${formatCurrency(eq.precioRenta)} / costo: ${formatCurrency(eq.costoProveedor ?? 0)}`,
                  }))}
                  value={selExt}
                  onChange={setSelExt}
                  placeholder="— Buscar equipo externo —"
                />
              </div>
              <div>
                <p className="text-[10px] text-[#555] mb-1 text-center">Cantidad</p>
                <NumSelect value={selExtCant} onChange={setSelExtCant} max={20} className="w-20 py-2" />
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
                      <p className="text-white text-sm truncate">{l.descripcion}</p>
                      {l.marca && <p className="text-gray-500 text-xs">{l.marca}</p>}
                      <p className="text-[#555] text-[10px]">Costo proveedor: {formatCurrency(l.costoProveedor)}/u · Total costo: {formatCurrency(l.costoTotal)}</p>
                    </div>
                    <NumSelect value={l.cantidad} onChange={v => updateExterno(l.id, "cantidad", parseFloat(v) || 1)} max={20} className="w-14 py-1" title="Cantidad" />
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
                <NumSelect value={selOcCant} onChange={setSelOcCant} max={20} className="w-16 py-2" />
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

          {/* ── Sugerencias de técnicos ── */}
          {evento.tipoEvento && (() => {
            const cats = [...new Set(lineasEquipo.map(l => l.categoria))];
            const sugs = getSugerenciasTecnicos(evento.tipoEvento, asistentesEstimados ?? 0, cats);
            return (
              <details className="bg-[#0d0d0d] border border-[#B3985B]/30 rounded-xl group" open>
                <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none">
                  <span className="text-[#B3985B] text-sm font-semibold">Sugerencias de personal técnico</span>
                  <span className="text-gray-500 text-xs">basado en equipos y tamaño del evento</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-[#555] group-open:rotate-180 transition-transform"><path d="M6 9l6 6 6-6"/></svg>
                </summary>
                <div className="px-5 pb-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {sugs.map(grupo => (
                      <div key={grupo.categoria} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-3">
                        <p className="text-[#B3985B] text-[10px] font-bold uppercase tracking-wider mb-2">{grupo.categoria}</p>
                        <div className="space-y-2">
                          {grupo.items.map(item => {
                            const kw = item.rolKeyword.toLowerCase();
                            const rol = roles.find(r => r.nombre.toLowerCase().includes(kw));
                            const yaAgregado = lineasOp.some(l => l.rolTecnicoId === rol?.id);
                            return (
                              <div key={item.rolKeyword} className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${item.esOpcional ? "text-gray-500" : "text-white"}`}>
                                    {rol ? rol.nombre : <span className="text-gray-600 italic">{item.rolKeyword} (sin rol)</span>}
                                    {item.esOpcional && <span className="text-[#555] text-[10px] ml-1">opcional</span>}
                                  </p>
                                  <p className="text-gray-600 text-[10px]">{item.motivo}</p>
                                </div>
                                {rol && (
                                  item.isStagehands ? (
                                    <div className="flex gap-1 shrink-0">
                                      {[1, 2, 4, 6, 8].map(n => {
                                        const yaEsteN = lineasOp.some(l => l.rolTecnicoId === rol.id && l.cantidad === n);
                                        return (
                                          <button
                                            key={n}
                                            onClick={() => agregarSugerenciaTecnico(item.rolKeyword, n)}
                                            disabled={yaEsteN}
                                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                                              yaEsteN
                                                ? "text-green-500 bg-green-900/20 cursor-default"
                                                : "text-[#B3985B] border border-[#B3985B]/40 hover:bg-[#B3985B] hover:text-black"
                                            }`}
                                          >
                                            {yaEsteN ? `✓${n}` : `×${n}`}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => agregarSugerenciaTecnico(item.rolKeyword, item.cantidad)}
                                      disabled={yaAgregado}
                                      className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded transition-colors ${
                                        yaAgregado
                                          ? "text-green-500 bg-green-900/20 cursor-default"
                                          : "text-[#B3985B] border border-[#B3985B]/40 hover:bg-[#B3985B] hover:text-black"
                                      }`}
                                    >
                                      {yaAgregado ? "✓ Agregado" : "+ Agregar"}
                                    </button>
                                  )
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-600 text-[10px] mt-3">Nivel y jornada se toman del selector activo. Ajusta antes de agregar si es necesario.</p>
                </div>
              </details>
            );
          })()}

          {/* ── Operación técnica ── */}
          <Seccion titulo="Operación técnica" hint="sin descuento">
            <div className="flex gap-2 mb-3">
              <SearchableSelect
                value={selRol}
                onChange={setSelRol}
                placeholder="— Buscar rol —"
                options={roles.filter(r => r.nombre !== "DJ").map(r => ({ value: r.id, label: r.nombre }))}
                className="flex-1"
              />
              <Combobox
                value={selRolNivel}
                onChange={v => setSelRolNivel(v)}
                options={[{ value: "AAA", label: "AAA" }, { value: "AA", label: "AA" }, { value: "A", label: "A" }]}
                className="w-20 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-2 text-white text-sm focus:outline-none"
              />
              <Combobox
                value={selRolJornada}
                onChange={v => setSelRolJornada(v)}
                options={[{ value: "CORTA", label: "0–8 hrs" }, { value: "MEDIA", label: "8–12 hrs" }, { value: "LARGA", label: "12+ hrs" }]}
                className="w-36 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-2 text-white text-sm focus:outline-none"
              />
              <NumSelect value={selRolCant} onChange={setSelRolCant} max={20} className="w-16 py-2" title="Cantidad" />
              <button onClick={agregarRol} disabled={!selRol} className="px-3 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm disabled:opacity-40">+ Agregar</button>
            </div>
            {lineasOp.length === 0 ? <p className="text-gray-600 text-sm text-center py-2">Sin técnicos agregados</p> : lineasOp.map(l => (
              <div key={l.id} className="flex items-center gap-3 py-2 border-b border-[#1a1a1a]">
                <div className="flex-1">
                  <p className="text-white text-sm">{l.descripcion}</p>
                  <p className="text-gray-500 text-xs">{l.nivel} · {JORNADA_LABELS[l.jornada] ?? l.jornada} · {l.dias} día(s) · ×{l.cantidad}</p>
                </div>
                <input type="number" value={l.precioUnitario} onChange={e => updateOp(l.id, "precioUnitario", parseFloat(e.target.value) || 0)} className="w-24 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-white text-sm text-right" />
                <span className="w-24 text-right text-white text-sm font-medium">{formatCurrency(l.subtotal)}</span>
                <button onClick={() => setLineasOp(p => p.filter(x => x.id !== l.id))} className="text-gray-600 hover:text-red-400 text-lg leading-none">×</button>
              </div>
            ))}
          </Seccion>

          {/* ── Servicio de DJ ── */}
          <Seccion titulo="Servicio de DJ" hint="cobro por hora · sin descuento">
            <div className="flex gap-2 mb-3">
              <Combobox
                value={selDJNivel}
                onChange={v => setSelDJNivel(v)}
                options={[{ value: "AAA", label: `AAA — ${formatCurrency(DJ_TARIFAS.AAA)}/hr` }, { value: "AA", label: `AA — ${formatCurrency(DJ_TARIFAS.AA)}/hr` }, { value: "A", label: `A — ${formatCurrency(DJ_TARIFAS.A)}/hr` }]}
                className="w-24 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
              />
              <input type="number" min="1" value={selDJHoras} onChange={e => setSelDJHoras(e.target.value)} className="w-24 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none" placeholder="Horas" />
              <div className="flex-1 flex items-center text-gray-400 text-sm">
                Total: {formatCurrency((DJ_TARIFAS[selDJNivel] ?? 0) * (parseFloat(selDJHoras) || 0))}
              </div>
              <button onClick={agregarDJ} className="px-3 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm">+ Agregar</button>
            </div>
            {lineasDJ.length === 0 ? <p className="text-gray-600 text-sm text-center py-2">Sin DJ agregado</p> : lineasDJ.map(l => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-[#1a1a1a]">
                <p className="text-white text-sm">DJ {l.nivel} · {l.horas}h · {formatCurrency(l.tarifa)}/hr</p>
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm font-medium">{formatCurrency(l.subtotal)}</span>
                  <button onClick={() => setLineasDJ(p => p.filter(x => x.id !== l.id))} className="text-gray-600 hover:text-red-400 text-lg leading-none">×</button>
                </div>
              </div>
            ))}
          </Seccion>

          {/* ── Logística ── */}
          <Seccion titulo="Logística" hint="sin descuento">
            {([
              { tipo: "COMIDA" as const, label: "Comida", conceptos: CONCEPTOS_COMIDA, icon: "🍽" },
              { tipo: "TRANSPORTE" as const, label: "Transporte", conceptos: CONCEPTOS_TRANSPORTE, icon: "🚐" },
              { tipo: "HOSPEDAJE" as const, label: "Hospedaje", conceptos: CONCEPTOS_HOSPEDAJE, icon: "🏨" },
            ]).map(({ tipo, label, conceptos, icon }) => {
              const lineas = lineasLog.filter(l => l.tipo === tipo);
              const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0);
              return (
                <div key={tipo} className="mb-4 last:mb-0">
                  <p className="text-xs font-semibold text-[#888] mb-2 uppercase tracking-wider">{icon} {label}</p>
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
                    <NumSelect value={logCant[tipo]} onChange={v => setLogCant(p => ({ ...p, [tipo]: v }))} max={20} className="w-16 py-2" title="Cantidad" />
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
                          <NumSelect value={l.cantidad} onChange={v => { const c = parseFloat(v) || 1; setLineasLog(pr => pr.map(x => x.id === l.id ? { ...x, cantidad: c, subtotal: x.precioUnitario * c * x.dias } : x)); }} max={20} className="w-14 py-1" />
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
          <Seccion titulo="Descuentos" hint="sobre subtotal de equipos propios">
            <div className="space-y-3">
              {/* Volumen — toggle manual */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setVolumenActivo(v => !v); setDVolumenManual(""); }}
                  className={`flex items-center gap-2 w-40 shrink-0 text-sm font-medium transition-colors ${volumenActivo ? "text-[#B3985B]" : "text-gray-600 hover:text-gray-400"}`}>
                  <span className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${volumenActivo ? "bg-[#B3985B]" : "bg-[#333]"}`}>
                    <span className={`w-3 h-3 rounded-full bg-white transition-transform ${volumenActivo ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                  Descuento por volumen
                </button>
                {volumenActivo ? (
                  <>
                    {volumenEdit ? (
                      <>
                        <span className="text-gray-500 text-xs flex-1">Auto: {formatPct(resumen.autoVolumen)}</span>
                        <input type="number" min="0" max="100" step="1" autoFocus
                          value={dVolumenManual} onChange={e => setDVolumenManual(e.target.value)}
                          placeholder={String(Math.round(resumen.autoVolumen * 100))}
                          className="w-20 bg-[#1a1a1a] border border-[#B3985B] rounded-lg px-2 py-1.5 text-white text-sm text-right focus:outline-none" />
                        <span className="text-gray-400 text-sm">%</span>
                        <button onClick={() => { setDVolumenManual(""); setVolumenEdit(false); }} className="text-gray-600 hover:text-white text-xs">✕</button>
                      </>
                    ) : (
                      <>
                        <span className="text-white text-sm font-semibold flex-1">{dVolumenManual !== "" ? dVolumenManual : String(Math.round(resumen.autoVolumen * 100))}%</span>
                        <button onClick={() => setVolumenEdit(true)} className="text-xs text-gray-500 hover:text-[#B3985B] border border-[#333] px-2 py-0.5 rounded transition-colors">Editar</button>
                      </>
                    )}
                    <span className="text-red-400 text-sm w-24 text-right">-{formatCurrency(resumen.subtotalEquiposBruto * resumen.dVolumen)}</span>
                  </>
                ) : (
                  <span className="text-gray-700 text-xs flex-1 italic">Inactivo · actívalo si el cliente pide mejor precio</span>
                )}
              </div>

              {/* B2B */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setB2bActivo(v => !v); setB2bEdit(false); setDB2BManual(""); }}
                  className={`flex items-center gap-2 w-40 shrink-0 text-sm font-medium transition-colors ${b2bActivo ? "text-[#B3985B]" : "text-gray-600 hover:text-gray-400"}`}>
                  <span className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${b2bActivo ? "bg-[#B3985B]" : "bg-[#333]"}`}>
                    <span className={`w-3 h-3 rounded-full bg-white transition-transform ${b2bActivo ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                  Descuento B2B
                </button>
                {b2bActivo ? (
                  <>
                    {b2bEdit ? (
                      <>
                        <span className="text-gray-500 text-xs flex-1">Fijo: 10%</span>
                        <input type="number" min="0" max="100" step="1" autoFocus
                          value={dB2BManual} onChange={e => setDB2BManual(e.target.value)}
                          placeholder="10"
                          className="w-20 bg-[#1a1a1a] border border-[#B3985B] rounded-lg px-2 py-1.5 text-white text-sm text-right focus:outline-none" />
                        <span className="text-gray-400 text-sm">%</span>
                        <button onClick={() => { setDB2BManual(""); setB2bEdit(false); }} className="text-gray-600 hover:text-white text-xs">✕</button>
                      </>
                    ) : (
                      <>
                        <span className="text-white text-sm font-semibold flex-1">{dB2BManual !== "" ? dB2BManual : "10"}%</span>
                        <button onClick={() => setB2bEdit(true)} className="text-xs text-gray-500 hover:text-[#B3985B] border border-[#333] px-2 py-0.5 rounded transition-colors">Editar</button>
                      </>
                    )}
                    <span className="text-red-400 text-sm w-24 text-right">-{formatCurrency(resumen.subtotalEquiposBruto * resumen.dB2B)}</span>
                  </>
                ) : (
                  <span className="text-gray-700 text-xs flex-1 italic">Inactivo · 10% para clientes B2B</span>
                )}
              </div>

              {/* Multi-día */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setMultidiaActivo(v => !v); setMultidiaEdit(false); setDMultidiaManual(""); }}
                  className={`flex items-center gap-2 w-40 shrink-0 text-sm font-medium transition-colors ${multidiaActivo ? "text-[#B3985B]" : "text-gray-600 hover:text-gray-400"}`}>
                  <span className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${multidiaActivo ? "bg-[#B3985B]" : "bg-[#333]"}`}>
                    <span className={`w-3 h-3 rounded-full bg-white transition-transform ${multidiaActivo ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                  Multi-día
                </button>
                {multidiaActivo ? (
                  <>
                    {multidiaEdit ? (
                      <>
                        <span className="text-gray-500 text-xs flex-1">Auto: {formatPct(resumen.autoMultidia)} · {evento.diasEquipo} día(s)</span>
                        <input type="number" min="0" max="100" step="1" autoFocus
                          value={dMultidiaManual} onChange={e => setDMultidiaManual(e.target.value)}
                          placeholder={String(Math.round(resumen.autoMultidia * 100))}
                          className="w-20 bg-[#1a1a1a] border border-[#B3985B] rounded-lg px-2 py-1.5 text-white text-sm text-right focus:outline-none" />
                        <span className="text-gray-400 text-sm">%</span>
                        <button onClick={() => { setDMultidiaManual(""); setMultidiaEdit(false); }} className="text-gray-600 hover:text-white text-xs">✕</button>
                      </>
                    ) : (
                      <>
                        <span className="text-white text-sm font-semibold flex-1">{dMultidiaManual !== "" ? dMultidiaManual : String(Math.round(resumen.autoMultidia * 100))}% · {evento.diasEquipo} día(s)</span>
                        <button onClick={() => setMultidiaEdit(true)} className="text-xs text-gray-500 hover:text-[#B3985B] border border-[#333] px-2 py-0.5 rounded transition-colors">Editar</button>
                      </>
                    )}
                    <span className="text-red-400 text-sm w-24 text-right">-{formatCurrency(resumen.subtotalEquiposBruto * resumen.dMultidia)}</span>
                  </>
                ) : (
                  <span className="text-gray-700 text-xs flex-1 italic">Inactivo · {formatPct(resumen.autoMultidia)} por {evento.diasEquipo} día(s)</span>
                )}
              </div>

              {/* Descuento especial (ex Family & Friends) */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setEspecialActivo(v => !v); setEspecialEdit(false); }}
                  className={`flex items-center gap-2 w-40 shrink-0 text-sm font-medium transition-colors ${especialActivo ? "text-[#B3985B]" : "text-gray-600 hover:text-gray-400"}`}>
                  <span className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${especialActivo ? "bg-[#B3985B]" : "bg-[#333]"}`}>
                    <span className={`w-3 h-3 rounded-full bg-white transition-transform ${especialActivo ? "translate-x-4" : "translate-x-0"}`} />
                  </span>
                  Descuento especial
                </button>
                {especialActivo ? (
                  <>
                    {especialEdit ? (
                      <>
                        <span className="text-gray-500 text-xs flex-1">Editable</span>
                        <input type="number" min="0" max="100" step="1" autoFocus
                          value={dFamilyFriends} onChange={e => setDFamilyFriends(e.target.value)}
                          placeholder="10"
                          className="w-20 bg-[#1a1a1a] border border-[#B3985B] rounded-lg px-2 py-1.5 text-white text-sm text-right focus:outline-none" />
                        <span className="text-gray-400 text-sm">%</span>
                        <button onClick={() => setEspecialEdit(false)} className="text-gray-600 hover:text-white text-xs">✕</button>
                      </>
                    ) : (
                      <>
                        <span className="text-white text-sm font-semibold flex-1">{dFamilyFriends !== "" ? dFamilyFriends : "10"}%</span>
                        <button onClick={() => setEspecialEdit(true)} className="text-xs text-gray-500 hover:text-[#B3985B] border border-[#333] px-2 py-0.5 rounded transition-colors">Editar</button>
                      </>
                    )}
                    <span className="text-red-400 text-sm w-24 text-right">-{formatCurrency(resumen.subtotalEquiposBruto * resumen.dFF)}</span>
                  </>
                ) : (
                  <span className="text-gray-700 text-xs flex-1 italic">Inactivo · se activa automáticamente en tratos Family & Friends</span>
                )}
              </div>
              {/* Total descuento */}
              <div className="flex items-center justify-between pt-2 border-t border-[#222]">
                <span className="text-white text-sm font-medium">Descuento total</span>
                <span className="text-red-400 font-bold">{formatPct(resumen.descuentoTotalPct)} — {formatCurrency(resumen.montoDescuento)}</span>
              </div>
              {/* Descuento a adicionales */}
              <div className="flex items-center gap-3 pt-2 border-t border-[#222]">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input type="checkbox" checked={descuentoAplicaAdicionales} onChange={e => setDescuentoAplicaAdicionales(e.target.checked)} className="w-4 h-4 rounded accent-[#B3985B]" />
                  <span className="text-sm text-gray-300">Aplicar descuento a equipos externos y conceptos adicionales</span>
                </label>
                {descuentoAplicaAdicionales && (resumen.descuentoMontaExternos + resumen.descuentoMontaAdicionales) > 0 && (
                  <span className="text-red-400 text-sm shrink-0">-{formatCurrency(resumen.descuentoMontaExternos + resumen.descuentoMontaAdicionales)}</span>
                )}
              </div>
              {/* Chofer */}
              <div className="flex items-center gap-3 pt-2 border-t border-[#222]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={incluirChofer} onChange={e => setIncluirChofer(e.target.checked)} className="w-4 h-4 rounded accent-[#B3985B]" />
                  <span className="text-sm text-gray-300">Incluir chofer de producción <span className="text-[#B3985B] font-semibold">+$500</span></span>
                </label>
              </div>
              {/* IVA */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={aplicaIva} onChange={e => setAplicaIva(e.target.checked)} className="w-4 h-4 rounded accent-[#B3985B]" />
                  <span className="text-sm text-gray-300">Aplica IVA 16% (cliente pide factura)</span>
                </label>
              </div>
            </div>
          </Seccion>

          {/* ── Observaciones ── */}
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
            <div className="bg-[#111] border border-[#222] rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-400"><span>Equipos bruto</span><span>{formatCurrency(resumen.subtotalEquiposBruto)}</span></div>
              {resumen.montoDescuento > 0 && <div className="flex justify-between text-red-400"><span>Descuento ({formatPct(resumen.descuentoTotalPct)})</span><span>-{formatCurrency(resumen.montoDescuento)}</span></div>}
              <div className="flex justify-between text-white"><span>Equipos neto</span><span>{formatCurrency(resumen.subtotalEquiposNeto)}</span></div>
              {resumen.subtotalExternos > 0 && <div className="flex justify-between text-gray-400"><span>Equipos terceros</span><span>{formatCurrency(resumen.subtotalExternos)}</span></div>}
              {resumen.subtotalOcasionales > 0 && <div className="flex justify-between text-gray-400"><span>Adicionales</span><span>{formatCurrency(resumen.subtotalOcasionales)}</span></div>}
              {resumen.descuentoMontaAdicionales > 0 && <div className="flex justify-between text-red-400"><span>Desc. adicionales ({formatPct(resumen.descuentoTotalPct)})</span><span>-{formatCurrency(resumen.descuentoMontaAdicionales)}</span></div>}
              {resumen.subtotalOperacion > 0 && <div className="flex justify-between text-gray-400"><span>Operación técnica</span><span>{formatCurrency(resumen.subtotalOperacion)}</span></div>}
              {resumen.subtotalDJ > 0 && <div className="flex justify-between text-gray-400"><span>Servicio DJ</span><span>{formatCurrency(resumen.subtotalDJ)}</span></div>}
              {resumen.subtotalTransporte > 0 && <div className="flex justify-between text-gray-400"><span>Transporte</span><span>{formatCurrency(resumen.subtotalTransporte)}</span></div>}
              {resumen.subtotalComidas > 0 && <div className="flex justify-between text-gray-400"><span>Comidas</span><span>{formatCurrency(resumen.subtotalComidas)}</span></div>}
              {resumen.subtotalHospedaje > 0 && <div className="flex justify-between text-gray-400"><span>Hospedaje</span><span>{formatCurrency(resumen.subtotalHospedaje)}</span></div>}
              {resumen.subtotalChofer > 0 && <div className="flex justify-between text-gray-400"><span>Chofer de producción</span><span>{formatCurrency(resumen.subtotalChofer)}</span></div>}
              <div className="flex justify-between text-white font-semibold border-t border-[#333] pt-2"><span>Subtotal</span><span>{formatCurrency(resumen.total)}</span></div>
              {aplicaIva && <div className="flex justify-between text-gray-400"><span>IVA 16%</span><span>{formatCurrency(resumen.montoIva)}</span></div>}
              <div className="flex justify-between text-[#B3985B] font-bold text-base border-t border-[#333] pt-2"><span>Total</span><span>{formatCurrency(resumen.granTotal)}</span></div>
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
