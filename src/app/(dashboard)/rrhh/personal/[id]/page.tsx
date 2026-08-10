"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";
import { Combobox } from "@/components/Combobox";
import { BackButton } from "@/components/BackButton";

interface Documento { id: string; tipo: string; nombre: string; url: string; fechaVencimiento: string | null; createdAt: string }
interface DocLaboral { id: string; tipo: string; token: string; aceptado: boolean; aceptadoNombre: string | null; aceptadoEn: string | null; createdAt: string }
interface PagoNomina { id: string; periodo: string; tipoPeriodo: string; monto: number; concepto: string | null; estado: string; fechaPago: string | null; metodoPago: string; notas: string | null; cuentaOrigen: { nombre: string } | null }
interface CuentaBancaria { id: string; nombre: string; banco: string | null }
interface Asistencia { id: string; fecha: string; estado: string; minutosRetardo: number | null; justificada: boolean; notas: string | null }
interface Evaluacion { id: string; periodo: string; fecha: string; evaluador: string | null; puntajeTotal: number | null; estado: string }
interface Acta { id: string; folio: string; fecha: string; gravedad: string; hechos: string; estado: string; nivelEscalon: number; tipo: { nombre: string; gravedad: string } | null }
interface Incidencia { id: string; fecha: string; descripcion: string | null; montoCalculado: number | null; estado: string; tipo: { nombre: string; gravedad: string; categoria: string } | null }
interface Vacacion { id: string; fechaInicio: string; fechaFin: string; dias: number; estado: string; motivo: string | null; aprobadaPor: string | null }
interface PersonaLite { id: string; nombre: string; puesto: string }
interface UsuarioLite { id: string; name: string; email: string; ligadoA: string | null }
interface PersonalData {
  id: string; nombre: string; puesto: string; departamento: string; tipo: string;
  telefono: string | null; correo: string | null; salario: number | null; periodoPago: string;
  fechaIngreso: string | null; activo: boolean; diasLaborables: number[]; cuentaBancaria: string | null;
  datosFiscales: string | null; notas: string | null;
  banco: string | null; clabe: string | null; numeroCuenta: string | null; numeroTarjeta: string | null;
  ineUrl: string | null; domicilio: string | null;
  emergenciaNombre: string | null; emergenciaTel: string | null;
  padecimientos: string | null;
  rfc: string | null; curp: string | null; nss: string | null;
  fechaNacimiento: string | null; estadoCivil: string | null; fotoUrl: string | null;
  fechaBaja: string | null; motivoBaja: string | null;
  jefeId: string | null; jefe: PersonaLite | null;
  userId: string | null;
  documentos: Documento[]; pagos: PagoNomina[];
  asistencias: Asistencia[]; evaluaciones: Evaluacion[]; actas: Acta[]; incidencias: Incidencia[]; vacaciones: Vacacion[];
}
interface Saldo { antiguedad: number; derecho: number; tomados: number; saldo: number; inicioPeriodo: string; finPeriodo: string }

const DEPARTAMENTOS = ["GENERAL", "BODEGA", "COORDINACION", "PRODUCCION", "ADMINISTRACION", "VENTAS"];
const TIPOS_PERIODO = ["MENSUAL", "QUINCENAL", "SEMANAL", "POR_EVENTO"];
const ESTADOS_CIVIL = ["", "Soltero(a)", "Casado(a)", "Unión libre", "Divorciado(a)", "Viudo(a)"];
const MOTIVOS_BAJA = ["", "RENUNCIA", "DESPIDO", "TERMINO_CONTRATO", "ABANDONO", "OTRO"];

type Tab = "perfil" | "laboral" | "pagos" | "asistencia" | "vacaciones" | "desempeno" | "disciplina" | "documentos";
const TABS: { key: Tab; label: string }[] = [
  { key: "perfil", label: "Perfil" },
  { key: "laboral", label: "Laboral" },
  { key: "pagos", label: "Nómina" },
  { key: "asistencia", label: "Asistencia" },
  { key: "vacaciones", label: "Vacaciones" },
  { key: "desempeno", label: "Desempeño" },
  { key: "disciplina", label: "Disciplina" },
  { key: "documentos", label: "Documentos" },
];

const ESTADO_ASISTENCIA: Record<string, { label: string; cls: string }> = {
  PRESENTE: { label: "Presente", cls: "bg-green-900/40 text-green-300" },
  FALTA: { label: "Falta", cls: "bg-red-900/40 text-red-300" },
  RETARDO: { label: "Retardo", cls: "bg-yellow-900/40 text-yellow-300" },
  PERMISO: { label: "Permiso", cls: "bg-blue-900/40 text-blue-300" },
  VACACIONES: { label: "Vacaciones", cls: "bg-purple-900/40 text-purple-300" },
  INCAPACIDAD: { label: "Incapacidad", cls: "bg-orange-900/40 text-orange-300" },
};

function fmt(n: number) { return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n); }
function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function antiguedadTexto(anios: number, ingreso: string | null) {
  if (!ingreso) return "—";
  const ini = new Date(ingreso);
  const now = new Date();
  let meses = (now.getFullYear() - ini.getFullYear()) * 12 + (now.getMonth() - ini.getMonth());
  if (now.getDate() < ini.getDate()) meses--;
  meses = Math.max(0, meses);
  const m = meses % 12;
  if (anios <= 0) return `${meses} mes${meses === 1 ? "" : "es"}`;
  return `${anios} año${anios === 1 ? "" : "s"}${m ? ` ${m} mes${m === 1 ? "" : "es"}` : ""}`;
}

export default function PersonalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [persona, setPersona] = useState<PersonalData | null>(null);
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const [posiblesJefes, setPosiblesJefes] = useState<PersonaLite[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [tab, setTab] = useState<Tab>("perfil");
  const [editando, setEditando] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PersonalData>>({});
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const editFormLoaded = useRef(false);
  const editTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showPagoForm, setShowPagoForm] = useState(false);
  const [pagoForm, setPagoForm] = useState({ periodo: new Date().toISOString().slice(0, 7), tipoPeriodo: "MENSUAL", monto: "", concepto: "", cuentaOrigenId: "", notas: "" });
  const [addingPago, setAddingPago] = useState(false);
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [fechaPagoReal, setFechaPagoReal] = useState(new Date().toISOString().split("T")[0]);
  const [docsLaborales, setDocsLaborales] = useState<DocLaboral[]>([]);
  const [generando, setGenerando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const [showVacForm, setShowVacForm] = useState(false);
  const [vacForm, setVacForm] = useState({ fechaInicio: "", fechaFin: "", motivo: "", aprobar: false });
  const [addingVac, setAddingVac] = useState(false);

  async function load() {
    const r = await fetch(`/api/rrhh/personal/${id}`, { cache: "no-store" });
    const d = await r.json();
    setPersona(d.persona);
    setSaldo(d.saldoVacaciones ?? null);
    setPosiblesJefes(d.posiblesJefes ?? []);
    setUsuarios(d.usuarios ?? []);
    setLoading(false);
  }

  async function loadDocsLaborales() {
    const r = await fetch(`/api/rrhh/documentos-laborales?personalId=${id}`, { cache: "no-store" });
    const d = await r.json();
    setDocsLaborales(d.docs ?? []);
  }

  useEffect(() => {
    load();
    loadDocsLaborales();
    fetch("/api/cuentas").then(r => r.json()).then(d => setCuentas(d.cuentas ?? []));
  }, [id]);

  async function generarDoc(tipo: "OFERTA" | "ACUERDO") {
    setGenerando(tipo);
    const res = await fetch("/api/rrhh/documentos-laborales", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalId: id, tipo }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al generar documento");
    } else {
      toast.success(tipo === "OFERTA" ? "Oferta generada" : "Acuerdo generado");
      await loadDocsLaborales();
    }
    setGenerando(null);
  }

  async function eliminarDocLaboral(docId: string) {
    if (!await confirm({ message: "¿Eliminar este documento generado?", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/rrhh/documentos-laborales/${docId}`, { method: "DELETE" });
    await loadDocsLaborales();
  }

  function copiarEnlaceAcuse(token: string) {
    const url = `${window.location.origin}/acuse/${token}`;
    navigator.clipboard.writeText(url);
    setCopiado(token);
    setTimeout(() => setCopiado(null), 2000);
  }

  useEffect(() => {
    if (!editando || !editFormLoaded.current) return;
    if (editTimer.current) clearTimeout(editTimer.current);
    setSaving(true);
    editTimer.current = setTimeout(async () => {
      await fetch(`/api/rrhh/personal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
      setAutoSaved(true);
      setSaving(false);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1200);
  }, [editForm]); // eslint-disable-line react-hooks/exhaustive-deps

  async function guardar() {
    if (editTimer.current) clearTimeout(editTimer.current);
    setSaving(true);
    await fetch(`/api/rrhh/personal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    await load();
    setEditando(false);
    editFormLoaded.current = false;
    setSaving(false);
  }

  function abrirEdicion() {
    setEditForm({ ...persona, fechaIngreso: persona?.fechaIngreso?.slice(0, 10) ?? "", fechaNacimiento: persona?.fechaNacimiento?.slice(0, 10) ?? "", fechaBaja: persona?.fechaBaja?.slice(0, 10) ?? "" });
    editFormLoaded.current = false;
    setEditando(true);
    setTimeout(() => { editFormLoaded.current = true; }, 100);
  }

  async function crearPago() {
    if (!pagoForm.monto) return;
    setAddingPago(true);
    const res = await fetch(`/api/rrhh/personal/${id}/pagos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...pagoForm, monto: parseFloat(pagoForm.monto) }) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al registrar");
      setAddingPago(false);
      return;
    }
    await load();
    setPagoForm({ periodo: new Date().toISOString().slice(0, 7), tipoPeriodo: "MENSUAL", monto: persona?.salario?.toString() ?? "", concepto: "", cuentaOrigenId: "", notas: "" });
    setShowPagoForm(false);
    setAddingPago(false);
  }

  async function marcarPagado(pagoId: string) {
    const res = await fetch(`/api/rrhh/personal/${id}/pagos/${pagoId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "PAGADO", fechaPago: fechaPagoReal }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
    await load();
    setPagandoId(null);
  }

  async function eliminarPago(pagoId: string) {
    if (!await confirm({ message: "¿Eliminar este registro de pago?", danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/rrhh/personal/${id}/pagos/${pagoId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
    toast.success("Pago eliminado");
    await load();
  }

  async function crearVacacion() {
    if (!vacForm.fechaInicio || !vacForm.fechaFin) { toast.error("Indica las fechas"); return; }
    setAddingVac(true);
    const res = await fetch(`/api/rrhh/personal/${id}/vacaciones`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fechaInicio: vacForm.fechaInicio, fechaFin: vacForm.fechaFin, motivo: vacForm.motivo, estado: vacForm.aprobar ? "APROBADA" : "PENDIENTE" }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al registrar");
      setAddingVac(false);
      return;
    }
    await load();
    setVacForm({ fechaInicio: "", fechaFin: "", motivo: "", aprobar: false });
    setShowVacForm(false);
    setAddingVac(false);
  }

  async function cambiarEstadoVac(vacId: string, estado: string) {
    const res = await fetch(`/api/rrhh/personal/${id}/vacaciones/${vacId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }),
    });
    if (!res.ok) { toast.error("Error al actualizar"); return; }
    await load();
  }

  async function eliminarVac(vacId: string) {
    if (!await confirm({ message: "¿Eliminar esta solicitud?", danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/rrhh/personal/${id}/vacaciones/${vacId}`, { method: "DELETE" });
    await load();
  }

  async function toggleActivo() {
    if (!persona) return;
    const res = await fetch(`/api/rrhh/personal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !persona.activo }) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
    await load();
  }

  async function eliminarEmpleado() {
    if (!persona) return;
    if (!await confirm({ message: `¿Eliminar permanentemente a ${persona.nombre}? Esta acción no se puede deshacer.`, danger: true, confirmText: "Eliminar" })) return;
    const res = await fetch(`/api/rrhh/personal/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
    router.push("/rrhh/personal");
  }

  if (loading || !persona) return <SkeletonPage rows={5} cols={3} />;

  // ── Métricas derivadas para el encabezado ──
  const mesActual = new Date().toISOString().slice(0, 7);
  const asistenciasMes = persona.asistencias.filter(a => a.fecha.slice(0, 7) === mesActual);
  const faltasMes = asistenciasMes.filter(a => a.estado === "FALTA").length;
  const retardosMes = asistenciasMes.filter(a => a.estado === "RETARDO").length;
  const ultimaEval = persona.evaluaciones.find(e => e.estado === "COMPLETADA") ?? persona.evaluaciones[0];
  const actasAbiertas = persona.actas.filter(a => a.estado !== "ANULADA").length;

  // Checklist de expediente (Fase 4)
  const acuerdoFirmado = docsLaborales.some(d => d.tipo === "ACUERDO" && d.aceptado);
  const checklist = [
    { label: "RFC", ok: !!persona.rfc },
    { label: "CURP", ok: !!persona.curp },
    { label: "NSS (IMSS)", ok: !!persona.nss },
    { label: "Fecha de ingreso", ok: !!persona.fechaIngreso },
    { label: "Datos bancarios", ok: !!(persona.clabe || persona.numeroCuenta) },
    { label: "Contacto emergencia", ok: !!persona.emergenciaNombre },
    { label: "Identificación (INE)", ok: !!persona.ineUrl || persona.documentos.some(d => d.tipo === "IDENTIFICACION") },
    { label: "Acuerdo laboral firmado", ok: acuerdoFirmado },
  ];
  const completos = checklist.filter(c => c.ok).length;
  const docsVencidos = persona.documentos.filter(d => d.fechaVencimiento && new Date(d.fechaVencimiento) < new Date()).length;

  const field = "w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]";

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div className="mb-2"><BackButton /></div>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-white text-sm transition-colors">← Volver</button>
          <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center overflow-hidden">
            {persona.fotoUrl
              ? <img src={persona.fotoUrl} alt={persona.nombre} className="w-full h-full object-cover" />
              : <span className="text-[#B3985B] text-lg font-bold">{persona.nombre.charAt(0)}</span>}
          </div>
          <div>
            <h1 className="ms-h1 flex items-center gap-2">
              {persona.nombre}
              {!persona.activo && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 font-medium">Baja</span>}
            </h1>
            <p className="ms-subtitle">{persona.puesto} · {persona.departamento}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleActivo}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${persona.activo ? "border-[#333] text-gray-400 hover:text-red-400 hover:border-red-900" : "border-green-900 text-green-400 hover:bg-green-900/20"}`}>
            {persona.activo ? "Dar de baja" : "Reactivar"}
          </button>
          <button onClick={abrirEdicion}
            className="text-xs px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-gray-400 hover:text-white transition-colors">
            Editar
          </button>
          <button onClick={eliminarEmpleado}
            className="text-xs px-3 py-1.5 border border-[#333] rounded-lg text-gray-600 hover:text-red-400 hover:border-red-900 transition-colors">
            Eliminar
          </button>
        </div>
      </div>

      {/* Resumen / semáforo del expediente */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="ms-card p-3">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider">Antigüedad</p>
          <p className="text-white text-sm font-semibold mt-0.5">{antiguedadTexto(saldo?.antiguedad ?? 0, persona.fechaIngreso)}</p>
        </div>
        <div className="ms-card p-3">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider">Vacaciones</p>
          <p className={`text-sm font-semibold mt-0.5 ${(saldo?.saldo ?? 0) > 0 ? "text-green-400" : "text-gray-400"}`}>{saldo?.saldo ?? 0} días</p>
        </div>
        <div className="ms-card p-3">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider">Faltas mes</p>
          <p className={`text-sm font-semibold mt-0.5 ${faltasMes > 0 ? "text-red-400" : "text-white"}`}>{faltasMes}{retardosMes ? ` · ${retardosMes} ret.` : ""}</p>
        </div>
        <div className="ms-card p-3">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider">Última eval.</p>
          <p className="text-white text-sm font-semibold mt-0.5">{ultimaEval?.puntajeTotal != null ? `${ultimaEval.puntajeTotal.toFixed(1)}/5` : "—"}</p>
        </div>
        <div className="ms-card p-3 col-span-2 sm:col-span-1">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider">Expediente</p>
          <p className={`text-sm font-semibold mt-0.5 ${completos === checklist.length ? "text-green-400" : "text-yellow-400"}`}>{completos}/{checklist.length}{docsVencidos ? ` · ${docsVencidos} venc.` : ""}</p>
        </div>
      </div>

      {editando && <EditModal />}

      {/* Tabs */}
      <div className="flex gap-1 ms-card p-1 overflow-x-auto">
        {TABS.map(t => {
          const count = t.key === "pagos" ? persona.pagos.length : t.key === "documentos" ? persona.documentos.length + docsLaborales.length : t.key === "desempeno" ? persona.evaluaciones.length : t.key === "disciplina" ? persona.actas.length + persona.incidencias.length : t.key === "vacaciones" ? persona.vacaciones.length : 0;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${tab === t.key ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"}`}>
              {t.label}{count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {tab === "perfil" && <PerfilTab />}
      {tab === "laboral" && <LaboralTab />}
      {tab === "pagos" && <PagosTab />}
      {tab === "asistencia" && <AsistenciaTab />}
      {tab === "vacaciones" && <VacacionesTab />}
      {tab === "desempeno" && <DesempenoTab />}
      {tab === "disciplina" && <DisciplinaTab />}
      {tab === "documentos" && <DocumentosTab />}
    </div>
  );

  // ─────────────────────────── Sub-vistas ───────────────────────────

  function Info({ label, val, mono }: { label: string; val: React.ReactNode; mono?: boolean }) {
    return (
      <div>
        <p className="text-gray-500 text-xs mb-0.5">{label}</p>
        <p className={`text-white ${mono ? "font-mono text-sm" : ""}`}>{val || <span className="text-gray-600 italic">Sin registrar</span>}</p>
      </div>
    );
  }

  function PerfilTab() {
    const p = persona!;
    return (
      <div className="ms-card p-5 space-y-5">
        <div>
          <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Datos personales</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Info label="Nombre" val={p.nombre} />
            <Info label="Fecha de nacimiento" val={fmtDate(p.fechaNacimiento)} />
            <Info label="Estado civil" val={p.estadoCivil} />
            <Info label="Tipo" val={p.tipo === "EMPLEADO" ? "Empleado" : "Freelance recurrente"} />
            <div className="sm:col-span-2"><Info label="Domicilio" val={p.domicilio} /></div>
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Teléfono</p>
              {p.telefono ? (
                <div className="flex items-center gap-2">
                  <span className="text-white">{p.telefono}</span>
                  <a href={`https://wa.me/${p.telefono.replace(/\D/g, "").replace(/^(?!52)/, "52")}?text=${encodeURIComponent(`Hola ${p.nombre.split(" ")[0]}! 👋`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-green-500 hover:text-green-400 bg-green-900/20 hover:bg-green-900/30 border border-green-800/40 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    WA
                  </a>
                </div>
              ) : <span className="text-gray-600 italic">Sin registrar</span>}
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Correo</p>
              {p.correo ? <a href={`mailto:${p.correo}`} className="text-white hover:text-[#B3985B] transition-colors">{p.correo}</a> : <span className="text-gray-600 italic">Sin registrar</span>}
            </div>
          </div>
        </div>

        <div className="border-t border-[#1a1a1a] pt-4">
          <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Datos fiscales / legales</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Info label="RFC" val={p.rfc} mono />
            <Info label="CURP" val={p.curp} mono />
            <Info label="NSS (IMSS)" val={p.nss} mono />
            <Info label="Datos fiscales" val={p.datosFiscales} />
          </div>
        </div>

        <div className="border-t border-[#1a1a1a] pt-4">
          <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Datos bancarios</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Info label="Banco" val={p.banco} />
            <Info label="Núm. cuenta" val={p.numeroCuenta} mono />
            <Info label="CLABE" val={p.clabe} mono />
            <Info label="Núm. tarjeta" val={p.numeroTarjeta} mono />
          </div>
        </div>

        <div className="border-t border-[#1a1a1a] pt-4">
          <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Emergencia y salud</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Info label="Contacto emergencia" val={p.emergenciaNombre} />
            <Info label="Tel. emergencia" val={p.emergenciaTel} />
            <div className="col-span-2"><Info label="Padecimientos / condiciones" val={p.padecimientos} /></div>
          </div>
          {p.ineUrl && <a href={p.ineUrl} target="_blank" rel="noopener noreferrer" className="text-[#B3985B] text-xs hover:underline mt-3 inline-block">Ver foto INE →</a>}
        </div>

        {p.notas && (
          <div className="border-t border-[#1a1a1a] pt-4">
            <Info label="Notas" val={p.notas} />
          </div>
        )}
      </div>
    );
  }

  function LaboralTab() {
    const p = persona!;
    return (
      <div className="space-y-4">
        <div className="ms-card p-5">
          <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Puesto y estructura</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Info label="Puesto" val={p.puesto} />
            <Info label="Departamento" val={p.departamento} />
            <Info label="Jefe directo" val={p.jefe ? p.jefe.nombre : null} />
            <Info label="Fecha de ingreso" val={fmtDate(p.fechaIngreso)} />
            <Info label="Antigüedad" val={antiguedadTexto(saldo?.antiguedad ?? 0, p.fechaIngreso)} />
            <Info label="Salario / tarifa" val={p.salario ? `${fmt(p.salario)} / ${p.periodoPago.toLowerCase()}` : null} />
            <Info label="Días laborables" val={p.diasLaborables?.length ? p.diasLaborables.map(d => ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][d]).join(", ") : "No configurado"} />
          </div>
        </div>

        {!p.activo && (
          <div className="ms-card p-5 border border-red-900/40">
            <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-3">Baja</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <Info label="Fecha de baja" val={fmtDate(p.fechaBaja)} />
              <Info label="Motivo" val={p.motivoBaja} />
            </div>
          </div>
        )}

        {/* Historial de sueldos pagados (derivado de nómina) */}
        <div className="ms-card p-5">
          <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Historial de pagos</p>
          {p.pagos.length === 0 ? (
            <p className="text-gray-600 text-sm py-2">Sin pagos registrados</p>
          ) : (
            <div className="space-y-1.5">
              {p.pagos.slice(0, 6).map(pago => (
                <div key={pago.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{pago.periodo}</span>
                  <span className="text-white font-medium">{fmt(pago.monto)}</span>
                </div>
              ))}
              {p.pagos.length > 6 && <button onClick={() => setTab("pagos")} className="text-[#B3985B] text-xs hover:underline mt-1">Ver toda la nómina →</button>}
            </div>
          )}
        </div>
      </div>
    );
  }

  function PagosTab() {
    const p = persona!;
    return (
      <div className="space-y-4">
        {!showPagoForm ? (
          <button onClick={() => { setShowPagoForm(true); setPagoForm(pf => ({ ...pf, monto: p.salario?.toString() ?? "" })); }}
            className="w-full border border-dashed border-[#333] hover:border-[#B3985B] text-gray-500 hover:text-[#B3985B] py-3 rounded-xl text-sm transition-colors">
            + Registrar pago
          </button>
        ) : (
          <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-3">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nuevo pago</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Periodo</label>
                <input type="month" value={pagoForm.periodo} onChange={e => setPagoForm(pf => ({ ...pf, periodo: e.target.value }))} className="ms-input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                <Combobox value={pagoForm.tipoPeriodo} onChange={v => setPagoForm(pf => ({ ...pf, tipoPeriodo: v }))} options={TIPOS_PERIODO.map(t => ({ value: t, label: t }))} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monto *</label>
                <input type="number" value={pagoForm.monto} onChange={e => setPagoForm(pf => ({ ...pf, monto: e.target.value }))} className="ms-input" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Concepto</label>
                <input value={pagoForm.concepto} onChange={e => setPagoForm(pf => ({ ...pf, concepto: e.target.value }))} placeholder="Opcional" className="ms-input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cuenta origen</label>
                <Combobox value={pagoForm.cuentaOrigenId} onChange={v => setPagoForm(pf => ({ ...pf, cuentaOrigenId: v }))} options={[{ value: "", label: "Sin especificar" }, ...cuentas.map(c => ({ value: c.id, label: c.nombre }))]} className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={crearPago} disabled={addingPago || !pagoForm.monto} className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">{addingPago ? "Guardando..." : "Registrar"}</button>
              <button onClick={() => setShowPagoForm(false)} className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
            </div>
          </div>
        )}

        <div className="ms-table-wrapper">
          {p.pagos.length === 0 ? (
            <div className="py-10 text-center text-gray-600 text-sm">Sin pagos registrados</div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {p.pagos.map(pago => (
                <div key={pago.id} className="px-5 py-4">
                  {pagandoId === pago.id ? (
                    <div className="flex items-center gap-3">
                      <p className="text-white text-sm flex-1">{pago.concepto ?? `Nómina ${pago.periodo}`} — {fmt(pago.monto)}</p>
                      <input type="date" value={fechaPagoReal} onChange={e => setFechaPagoReal(e.target.value)} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-2 py-1 text-white text-xs focus:outline-none" />
                      <button onClick={() => marcarPagado(pago.id)} className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors">Confirmar pago</button>
                      <button onClick={() => setPagandoId(null)} className="text-xs text-gray-500 hover:text-white transition-colors">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{pago.concepto ?? `Nómina ${pago.periodo}`}</p>
                        <p className="text-gray-500 text-xs">{pago.periodo} · {pago.tipoPeriodo.toLowerCase()}{pago.fechaPago ? ` · Pagado ${fmtDate(pago.fechaPago)}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-semibold text-sm">{fmt(pago.monto)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${pago.estado === "PAGADO" ? "bg-green-900/50 text-green-300" : "bg-yellow-900/50 text-yellow-300"}`}>{pago.estado === "PAGADO" ? "Pagado" : "Pendiente"}</span>
                        {pago.estado === "PENDIENTE" && <button onClick={() => setPagandoId(pago.id)} className="text-xs text-[#B3985B] hover:text-white transition-colors">Pagar</button>}
                        <button onClick={() => eliminarPago(pago.id)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">✕</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function AsistenciaTab() {
    const p = persona!;
    const resumen = { PRESENTE: 0, FALTA: 0, RETARDO: 0, PERMISO: 0, VACACIONES: 0, INCAPACIDAD: 0 } as Record<string, number>;
    asistenciasMes.forEach(a => { resumen[a.estado] = (resumen[a.estado] ?? 0) + 1; });
    return (
      <div className="space-y-4">
        <div className="ms-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider">Resumen del mes</p>
            <Link href="/rrhh/asistencia" className="text-[#B3985B] text-xs hover:underline">Ir a captura →</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(resumen).filter(([, n]) => n > 0).map(([est, n]) => (
              <span key={est} className={`text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO_ASISTENCIA[est]?.cls}`}>{ESTADO_ASISTENCIA[est]?.label}: {n}</span>
            ))}
            {asistenciasMes.length === 0 && <span className="text-gray-600 text-sm">Sin registros este mes</span>}
          </div>
        </div>
        <div className="ms-card p-5">
          <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Últimos registros</p>
          {p.asistencias.length === 0 ? (
            <p className="text-gray-600 text-sm py-2">Sin registros de asistencia</p>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {p.asistencias.slice(0, 30).map(a => (
                <div key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-gray-300">{fmtDate(a.fecha)}</span>
                  <div className="flex items-center gap-2">
                    {a.estado === "RETARDO" && a.minutosRetardo ? <span className="text-gray-500 text-xs">{a.minutosRetardo} min</span> : null}
                    {a.justificada && <span className="text-[10px] text-blue-300">justificada</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_ASISTENCIA[a.estado]?.cls}`}>{ESTADO_ASISTENCIA[a.estado]?.label ?? a.estado}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function VacacionesTab() {
    const p = persona!;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="ms-card p-4 text-center">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Derecho anual</p>
            <p className="text-white text-xl font-bold mt-1">{saldo?.derecho ?? 0}</p>
            <p className="text-gray-600 text-[10px]">días LFT</p>
          </div>
          <div className="ms-card p-4 text-center">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Tomados</p>
            <p className="text-white text-xl font-bold mt-1">{saldo?.tomados ?? 0}</p>
            <p className="text-gray-600 text-[10px]">este período</p>
          </div>
          <div className="ms-card p-4 text-center">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Disponibles</p>
            <p className={`text-xl font-bold mt-1 ${(saldo?.saldo ?? 0) > 0 ? "text-green-400" : "text-gray-400"}`}>{saldo?.saldo ?? 0}</p>
            <p className="text-gray-600 text-[10px]">días</p>
          </div>
        </div>
        {saldo && (
          <p className="text-gray-500 text-xs text-center">Período de aniversario: {fmtDate(saldo.inicioPeriodo)} – {fmtDate(saldo.finPeriodo)}</p>
        )}

        {!showVacForm ? (
          <button onClick={() => setShowVacForm(true)} className="w-full border border-dashed border-[#333] hover:border-[#B3985B] text-gray-500 hover:text-[#B3985B] py-3 rounded-xl text-sm transition-colors">+ Registrar vacaciones</button>
        ) : (
          <div className="bg-[#111] border border-[#B3985B]/30 rounded-xl p-5 space-y-3">
            <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Nuevas vacaciones</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Del</label>
                <input type="date" value={vacForm.fechaInicio} onChange={e => setVacForm(v => ({ ...v, fechaInicio: e.target.value }))} className="ms-input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Al</label>
                <input type="date" value={vacForm.fechaFin} onChange={e => setVacForm(v => ({ ...v, fechaFin: e.target.value }))} className="ms-input" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Motivo / nota</label>
                <input value={vacForm.motivo} onChange={e => setVacForm(v => ({ ...v, motivo: e.target.value }))} placeholder="Opcional" className="ms-input" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={vacForm.aprobar} onChange={e => setVacForm(v => ({ ...v, aprobar: e.target.checked }))} /> Aprobar de una vez
            </label>
            <div className="flex gap-3">
              <button onClick={crearVacacion} disabled={addingVac} className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">{addingVac ? "Guardando..." : "Registrar"}</button>
              <button onClick={() => setShowVacForm(false)} className="text-gray-500 hover:text-white text-sm transition-colors px-3">Cancelar</button>
            </div>
          </div>
        )}

        <div className="ms-card p-5">
          {p.vacaciones.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">Sin vacaciones registradas</p>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {p.vacaciones.map(v => (
                <div key={v.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white text-sm">{fmtDate(v.fechaInicio)} – {fmtDate(v.fechaFin)} <span className="text-gray-500">· {v.dias} día{v.dias === 1 ? "" : "s"}</span></p>
                    {v.motivo && <p className="text-gray-500 text-xs">{v.motivo}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${v.estado === "APROBADA" ? "bg-green-900/50 text-green-300" : v.estado === "PENDIENTE" ? "bg-yellow-900/50 text-yellow-300" : "bg-gray-800 text-gray-400"}`}>{v.estado}</span>
                    {v.estado === "PENDIENTE" && <button onClick={() => cambiarEstadoVac(v.id, "APROBADA")} className="text-xs text-green-400 hover:text-green-300">Aprobar</button>}
                    <button onClick={() => eliminarVac(v.id)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function DesempenoTab() {
    const p = persona!;
    return (
      <div className="ms-card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider">Evaluaciones</p>
          <Link href="/rrhh/evaluaciones" className="text-[#B3985B] text-xs hover:underline">Nueva evaluación →</Link>
        </div>
        {p.evaluaciones.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">Sin evaluaciones registradas</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {p.evaluaciones.map(e => (
              <Link key={e.id} href={`/rrhh/evaluaciones/${e.id}`} className="flex items-center justify-between py-3 hover:bg-[#141414] -mx-2 px-2 rounded-lg transition-colors">
                <div>
                  <p className="text-white text-sm">{e.periodo}</p>
                  <p className="text-gray-500 text-xs">{fmtDate(e.fecha)}{e.evaluador ? ` · ${e.evaluador}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  {e.puntajeTotal != null && <span className="text-white font-semibold text-sm">{e.puntajeTotal.toFixed(1)}/5</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${e.estado === "COMPLETADA" ? "bg-green-900/50 text-green-300" : "bg-gray-800 text-gray-400"}`}>{e.estado === "COMPLETADA" ? "Completada" : "Borrador"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  function DisciplinaTab() {
    const p = persona!;
    return (
      <div className="space-y-4">
        <div className="ms-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider">Actas administrativas</p>
            <Link href="/rrhh/actas" className="text-[#B3985B] text-xs hover:underline">Ir a actas →</Link>
          </div>
          {p.actas.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-3">Sin actas</p>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {p.actas.map(a => (
                <div key={a.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-sm font-medium">{a.folio} <span className="text-gray-500 font-normal">· {a.tipo?.nombre ?? "—"}</span></p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.gravedad === "MUY_GRAVE" ? "bg-red-900/50 text-red-300" : a.gravedad === "GRAVE" ? "bg-orange-900/50 text-orange-300" : "bg-yellow-900/50 text-yellow-300"}`}>{a.gravedad}</span>
                      <span className="text-[10px] text-gray-500">Escalón {a.nivelEscalon}</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{fmtDate(a.fecha)} · {a.estado}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="ms-card p-5">
          <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Incidencias y descuentos</p>
          {p.incidencias.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-3">Sin incidencias</p>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {p.incidencias.map(i => (
                <div key={i.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white text-sm">{i.tipo?.nombre ?? i.descripcion ?? "Incidencia"}</p>
                    <p className="text-gray-500 text-xs">{fmtDate(i.fecha)}{i.tipo?.categoria ? ` · ${i.tipo.categoria}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.montoCalculado != null && i.montoCalculado > 0 && <span className="text-red-400 text-sm font-medium">-{fmt(i.montoCalculado)}</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${i.estado === "APROBADA" ? "bg-green-900/50 text-green-300" : i.estado === "RECHAZADA" ? "bg-gray-800 text-gray-400" : "bg-yellow-900/50 text-yellow-300"}`}>{i.estado}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function DocumentosTab() {
    const p = persona!;
    return (
      <div className="space-y-4">
        {/* Checklist de expediente */}
        <div className="ms-card p-5">
          <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider mb-3">Checklist de expediente ({completos}/{checklist.length})</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {checklist.map(c => (
              <div key={c.label} className="flex items-center gap-2 text-sm">
                <span className={c.ok ? "text-green-400" : "text-gray-600"}>{c.ok ? "✓" : "○"}</span>
                <span className={c.ok ? "text-gray-300" : "text-gray-500"}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Documentos laborales generados */}
        <div className="ms-card p-5">
          <div className="mb-4">
            <p className="text-white font-semibold text-sm">Documentos laborales</p>
            <p className="text-gray-500 text-xs mt-0.5">Genera la oferta o el acuerdo desde el puesto principal y compártelo para acuse de recibo.</p>
          </div>
          {!p.puesto && <p className="text-yellow-500/80 text-xs mb-3">Asigna un puesto principal a esta persona para llenar el documento con sus responsabilidades y estándares.</p>}
          <div className="flex gap-2 mb-4">
            <button onClick={() => generarDoc("OFERTA")} disabled={generando !== null} className="text-xs px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-gray-300 hover:text-white hover:border-[#B3985B] disabled:opacity-50 transition-colors">{generando === "OFERTA" ? "Generando..." : "+ Generar oferta de trabajo"}</button>
            <button onClick={() => generarDoc("ACUERDO")} disabled={generando !== null} className="text-xs px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-gray-300 hover:text-white hover:border-[#B3985B] disabled:opacity-50 transition-colors">{generando === "ACUERDO" ? "Generando..." : "+ Generar acuerdo laboral"}</button>
          </div>
          {docsLaborales.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-6">Aún no has generado documentos</p>
          ) : (
            <div className="space-y-2">
              {docsLaborales.map(doc => (
                <div key={doc.id} className="flex items-center justify-between gap-3 py-3 border-b border-[#1a1a1a] last:border-0">
                  <div className="min-w-0">
                    <p className="text-white text-sm">{doc.tipo === "OFERTA" ? "Oferta de trabajo" : "Acuerdo laboral"}</p>
                    <p className="text-gray-500 text-xs">
                      {fmtDate(doc.createdAt)}
                      {doc.aceptado ? <span className="text-green-400"> · Aceptado por {doc.aceptadoNombre}{doc.aceptadoEn ? ` (${fmtDate(doc.aceptadoEn)})` : ""}</span> : <span className="text-yellow-500/80"> · Pendiente de acuse</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={`/api/rrhh/documentos-laborales/${doc.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#B3985B] hover:text-white transition-colors">PDF</a>
                    <button onClick={() => copiarEnlaceAcuse(doc.token)} className="text-xs text-gray-400 hover:text-white transition-colors">{copiado === doc.token ? "¡Copiado!" : "Copiar enlace"}</button>
                    <button onClick={() => eliminarDocLaboral(doc.id)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Otros documentos */}
        <div className="ms-card p-5">
          <p className="text-white font-semibold text-sm mb-3">Otros documentos</p>
          {p.documentos.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-6">Sin documentos registrados</p>
          ) : (
            <div className="space-y-2">
              {p.documentos.map(doc => (
                <div key={doc.id} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                  <div>
                    <p className="text-white text-sm">{doc.nombre}</p>
                    <p className="text-gray-500 text-xs">{doc.tipo}{doc.fechaVencimiento ? ` · Vence: ${fmtDate(doc.fechaVencimiento)}` : ""}</p>
                  </div>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#B3985B] hover:text-white transition-colors">Ver →</a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function EditModal() {
    const set = (k: string, v: unknown) => setEditForm(prev => ({ ...prev, [k]: v }));
    const txt = (k: keyof PersonalData, label: string, ph?: string) => (
      <div>
        <label className="text-xs text-gray-500 mb-1 block">{label}</label>
        <input value={(editForm as Record<string, unknown>)[k] as string ?? ""} onChange={e => set(k, e.target.value)} placeholder={ph} className={field} />
      </div>
    );
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70" onClick={() => { setEditando(false); editFormLoaded.current = false; }} />
        <div className="relative bg-[#111] border border-[#333] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] sticky top-0 bg-[#111] z-10">
            <h3 className="text-white font-semibold">Editar empleado</h3>
            <button onClick={() => { setEditando(false); editFormLoaded.current = false; }} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider">Datos personales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {txt("nombre", "Nombre")}
              {txt("puesto", "Puesto")}
              {txt("telefono", "Teléfono")}
              {txt("correo", "Correo")}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fecha de nacimiento</label>
                <input type="date" value={(editForm.fechaNacimiento as string) ?? ""} onChange={e => set("fechaNacimiento", e.target.value)} className={field} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Estado civil</label>
                <Combobox value={editForm.estadoCivil ?? ""} onChange={v => set("estadoCivil", v)} options={ESTADOS_CIVIL.map(s => ({ value: s, label: s || "Sin especificar" }))} className={field} />
              </div>
              <div className="col-span-2">{txt("domicilio", "Domicilio")}</div>
              <div className="col-span-2">{txt("fotoUrl", "URL de foto", "https://...")}</div>
            </div>

            <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider pt-1">Fiscales / legales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {txt("rfc", "RFC")}
              {txt("curp", "CURP")}
              {txt("nss", "NSS (IMSS)")}
              {txt("datosFiscales", "Datos fiscales")}
            </div>

            <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider pt-1">Datos bancarios</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {txt("banco", "Banco")}
              {txt("numeroCuenta", "Número de cuenta")}
              {txt("clabe", "CLABE")}
              {txt("numeroTarjeta", "Número de tarjeta")}
            </div>

            <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider pt-1">Emergencia y salud</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {txt("emergenciaNombre", "Contacto de emergencia", "Nombre")}
              {txt("emergenciaTel", "Tel. de emergencia", "Teléfono")}
              <div className="col-span-2">{txt("padecimientos", "Padecimientos / condiciones", "Ej: Diabetes, alergias...")}</div>
              <div className="col-span-2">{txt("ineUrl", "URL foto INE", "https://...")}</div>
            </div>

            <p className="text-[10px] text-[#B3985B] font-semibold uppercase tracking-wider pt-1">Laboral</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Departamento</label>
                <Combobox value={editForm.departamento ?? ""} onChange={v => set("departamento", v)} options={DEPARTAMENTOS.map(d => ({ value: d, label: d }))} className={field} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Jefe directo</label>
                <Combobox value={editForm.jefeId ?? ""} onChange={v => set("jefeId", v)} options={[{ value: "", label: "Sin asignar" }, ...posiblesJefes.map(j => ({ value: j.id, label: j.nombre }))]} className={field} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Usuario (login)</label>
                <Combobox
                  value={editForm.userId ?? ""}
                  onChange={v => set("userId", v)}
                  options={[
                    { value: "", label: "Sin ligar" },
                    ...usuarios.map(u => ({
                      value: u.id,
                      label: `${u.name} · ${u.email}${u.ligadoA ? `  (ligado a ${u.ligadoA})` : ""}`,
                    })),
                  ]}
                  className={field}
                />
                <p className="text-[10px] text-gray-600 mt-1">Liga el expediente a la cuenta de acceso. Necesario para leer sus tareas del plan de trabajo y generar el puesto.</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fecha de ingreso</label>
                <input type="date" value={(editForm.fechaIngreso as string) ?? ""} onChange={e => set("fechaIngreso", e.target.value)} className={field} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Salario</label>
                <input type="number" value={editForm.salario?.toString() ?? ""} onChange={e => set("salario", parseFloat(e.target.value) || null)} className={field} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Periodo pago</label>
                <Combobox value={editForm.periodoPago ?? "MENSUAL"} onChange={v => set("periodoPago", v)} options={TIPOS_PERIODO.map(t => ({ value: t, label: t }))} className={field} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 mb-2 block">Días laborables (afecta porcentaje de asistencia)</label>
                <div className="flex flex-wrap gap-3">
                  {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d, i) => (
                    <label key={i} className="flex items-center gap-1.5 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-600 bg-[#0d0d0d] text-[#B3985B] focus:ring-[#B3985B]"
                        checked={editForm.diasLaborables ? editForm.diasLaborables.includes(i) : [1, 2, 3, 4, 5].includes(i)}
                        onChange={e => {
                          const current = editForm.diasLaborables ?? [1, 2, 3, 4, 5];
                          if (e.target.checked) set("diasLaborables", [...current, i].sort());
                          else set("diasLaborables", current.filter(x => x !== i));
                        }}
                      /> {d}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {!editForm.activo && (
              <>
                <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider pt-1">Baja</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Fecha de baja</label>
                    <input type="date" value={(editForm.fechaBaja as string) ?? ""} onChange={e => set("fechaBaja", e.target.value)} className={field} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Motivo de baja</label>
                    <Combobox value={editForm.motivoBaja ?? ""} onChange={v => set("motivoBaja", v)} options={MOTIVOS_BAJA.map(m => ({ value: m, label: m || "Sin especificar" }))} className={field} />
                  </div>
                </div>
              </>
            )}

            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Notas</label>
              <textarea value={editForm.notas ?? ""} onChange={e => set("notas", e.target.value)} rows={2} className={`${field} resize-none`} />
            </div>

            <div className="flex justify-end items-center gap-3 pt-2">
              {saving && <span className="text-xs text-gray-500 animate-pulse">Guardando…</span>}
              {autoSaved && !saving && <span className="text-xs text-green-500">✓ Guardado</span>}
              <button onClick={() => { setEditando(false); editFormLoaded.current = false; }} className="px-4 py-2 rounded-lg border border-[#333] text-gray-400 text-sm hover:text-white transition-colors">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors">Guardar cambios</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
