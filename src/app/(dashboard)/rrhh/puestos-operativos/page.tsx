"use client";
import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { LayoutList, LayoutGrid, FileText, UserCheck, UserX, Link2, X, Plus, AlertTriangle } from "lucide-react";
import { AREA_CODES } from "@/lib/areas";
import { useAreas } from "@/components/AreasProvider";
import { MODULOS_POR_SECCION } from "@/lib/nav";
import { parseIdList } from "@/lib/onboarding";
import {
  asignacionesEfectivas, derivarAsignacionesDefault, nivelMax,
  type CapAsignacion, type NivelCapacitacion,
} from "@/lib/capacitacion-plan";
import {
  TIPOS_CONTRATO, MODALIDADES, DIAS_SEMANA, FRECUENCIAS_KPI, UNIDADES_KPI, FRECUENCIAS_ESTANDAR,
  FUENTES_KPI, KPI_PLAN_NOMBRE, KPI_PLAN_META_DEFAULT, jparse, jornadaToString, horasSemanales,
  textosMuySimilares, adverbioVago, generaCiclo,
  type JornadaDia, type CoordinaConItem, type ValorPerfil, type AptitudPerfil, type ConocimientoPerfil,
  type EstandarMinimo, type KpiPuesto, type Nivel,
} from "@/lib/puesto";

interface Ocupante { id: string; nombre: string; userId?: string | null }
interface Estandar { subarea: string; responsabilidad: string; estandar: string }
interface Puesto {
  id: string; nombre: string; area: string;
  subAreaId?: string | null; subArea?: { id: string; nombre: string } | null;
  objetivoArea?: string | null; descripcionPuesto?: string | null; objetivoPuesto?: string | null; misionPuesto?: string | null;
  responsabilidades?: string | null;
  reportaAId?: string | null; reportaA?: { id: string; nombre: string } | null;
  coordinaCon?: string | null; supervisaA?: string | null; coordinaConData?: string | null;
  estandares?: string | null; estandaresMinimos?: string | null;
  valores?: string | null; aptitudes?: string | null; conocimientos?: string | null;
  funciones?: string | null; prestaciones?: string | null; prestacionesOtro?: string | null;
  tipoContrato?: string | null; modalidad?: string | null; horario?: string | null; jornada?: string | null;
  onboardingModulos?: string | null; onboardingCapacitaciones?: string | null; capacitacionAsignaciones?: string | null;
  version?: number | null;
  color?: string | null; activo: boolean;
  ocupantes?: Ocupante[]; kpis?: KpiPuesto[];
}
interface PersonaLite { id: string; nombre: string; puesto: string; activo: boolean }
interface Catalogos {
  prestaciones: { id: string; nombre: string }[];
  valores: { id: string; nombre: string; descripcion?: string | null }[];
  aptitudes: { id: string; nombre: string }[];
  conocimientos: { id: string; nombre: string }[];
}

const AREAS = [...AREA_CODES];
function normArea(a: string): string {
  return a === "RRHH" || a === "GENERAL" ? "ADMINISTRACION" : a;
}
function parseArr(s?: string | null): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return s.split(",").map(x=>x.trim()).filter(Boolean); }
}
function parseEst(s?: string | null): Estandar[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}
function toArr(s: string) {
  return s.split(/\n/).map(x=>x.trim()).filter(Boolean);
}
const NIVELES: { value: Nivel; label: string }[] = [
  { value: "basico", label: "Básico" }, { value: "intermedio", label: "Intermedio" }, { value: "avanzado", label: "Avanzado" },
];

const EMPTY_FORM = {
  nombre:"", area:"ADMINISTRACION", subAreaId:"", color:"",
  descripcionPuesto:"", objetivoPuesto:"", misionPuesto:"",
  responsabilidades:"",
  reportaAId:"",
  funciones:"", tipoContrato:"", modalidad:"", prestacionesOtro:"",
};
type FormState = typeof EMPTY_FORM;

function kpiFijo(): KpiPuesto {
  return { nombre: KPI_PLAN_NOMBRE, resultadoEsperado: "El plan de trabajo del puesto se cumple mes a mes",
    unidad: "%", meta: KPI_PLAN_META_DEFAULT, frecuencia: "mensual", fuenteTipo: "automatica",
    fuente: "Cumplimiento (Plan)", esFijoPlan: true };
}

export default function PuestosOperativosPage() {
  const toast = useToast();
  const { label: areaLabel, color: areaColor } = useAreas();
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [personal, setPersonal] = useState<PersonaLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Puesto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [estandares, setEstandares] = useState<Estandar[]>([]);
  const [estMinimos, setEstMinimos] = useState<EstandarMinimo[]>([]);
  const [coordina, setCoordina] = useState<CoordinaConItem[]>([]);
  const [jornada, setJornada] = useState<JornadaDia[]>([]);
  const [prestacionesSel, setPrestacionesSel] = useState<string[]>([]);
  const [valores, setValores] = useState<ValorPerfil[]>([]);
  const [aptitudes, setAptitudes] = useState<AptitudPerfil[]>([]);
  const [conocimientos, setConocimientos] = useState<ConocimientoPerfil[]>([]);
  const [kpis, setKpis] = useState<KpiPuesto[]>([]);
  const [ocupantesIds, setOcupantesIds] = useState<string[]>([]);
  const [onbModulos, setOnbModulos] = useState<string[]>([]);
  const [onbCapacitaciones, setOnbCapacitaciones] = useState<string[]>([]);
  const [capAsignaciones, setCapAsignaciones] = useState<CapAsignacion[]>([]);
  const [categoriasCap, setCategoriasCap] = useState<{ id: string; nombre: string; slug: string; subAreas: string[] }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [selected, setSelected] = useState<Puesto | null>(null);
  const [filterArea, setFilterArea] = useState("TODOS");
  const [vista, setVista] = useState<"lista" | "grid">("lista");
  const [genPdf, setGenPdf] = useState<string | null>(null);
  const [genLink, setGenLink] = useState<string | null>(null);
  const [subareasPorArea, setSubareasPorArea] = useState<Record<string, { id: string; nombre: string }[]>>({});
  const [objetivoPorArea, setObjetivoPorArea] = useState<Record<string, string>>({});
  const [catalogos, setCatalogos] = useState<Catalogos>({ prestaciones: [], valores: [], aptitudes: [], conocimientos: [] });

  async function load() {
    const [rp, rper] = await Promise.all([
      fetch("/api/rrhh/puestos-operativos", { cache: "no-store" }),
      fetch("/api/rrhh/personal", { cache: "no-store" }),
    ]);
    const [dp, dper] = await Promise.all([rp.json(), rper.json()]);
    setPuestos(dp.puestos ?? []);
    setPersonal((dper.personal ?? []).map((p: PersonaLite) => ({ id: p.id, nombre: p.nombre, puesto: p.puesto, activo: p.activo })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    fetch("/api/areas", { cache: "no-store" })
      .then(r => r.json())
      .then((d: { areas?: { codigo: string | null; objetivo?: string | null; subareas?: { id: string; nombre: string }[] }[] }) => {
        const map: Record<string, { id: string; nombre: string }[]> = {};
        const obj: Record<string, string> = {};
        for (const a of d.areas ?? []) if (a.codigo) {
          map[a.codigo.toUpperCase()] = a.subareas ?? [];
          if (a.objetivo) obj[a.codigo.toUpperCase()] = a.objetivo;
        }
        setSubareasPorArea(map);
        setObjetivoPorArea(obj);
      })
      .catch(() => {});
    fetch("/api/rrhh/catalogos", { cache: "no-store" })
      .then(r => r.json())
      .then((d: Catalogos) => setCatalogos({
        prestaciones: d.prestaciones ?? [], valores: d.valores ?? [],
        aptitudes: d.aptitudes ?? [], conocimientos: d.conocimientos ?? [],
      }))
      .catch(() => {});
    fetch("/api/capacitacion/categorias", { cache: "no-store" })
      .then(r => r.json())
      .then((d: { categorias?: { id: string; nombre: string; slug: string; subAreas?: string[] }[] }) =>
        setCategoriasCap((d.categorias ?? []).map(c => ({ ...c, subAreas: c.subAreas ?? [] }))))
      .catch(() => {});
  }, []);

  // Mapa puesto→reportaAId para validar ciclos.
  const reportaDe = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const p of puestos) m.set(p.id, p.reportaAId ?? null);
    return m;
  }, [puestos]);
  // Puestos que reportan al que se edita → "Supervisa a" derivado (§2).
  const supervisaDerivado = useMemo(
    () => (editing ? puestos.filter(p => p.reportaAId === editing.id) : []),
    [puestos, editing],
  );

  function resetExtras() {
    setEstandares([]); setEstMinimos([]); setCoordina([]); setJornada([]);
    setPrestacionesSel([]); setValores([]); setAptitudes([]); setConocimientos([]);
    setKpis([kpiFijo()]); setOcupantesIds([]);
    setOnbModulos([]); setOnbCapacitaciones([]); setCapAsignaciones([]);
  }

  // Nivel actual de una asignación (área completa = subArea null) o undefined si no está.
  function nivelDe(categoriaId: string, subArea: string | null): NivelCapacitacion | undefined {
    return capAsignaciones.find(a => a.categoriaId === categoriaId && (a.subArea ?? null) === subArea)?.nivel;
  }
  // Fija/limpia el nivel de una asignación. Pasar undefined la elimina.
  function fijarNivel(categoriaId: string, subArea: string | null, nivel: NivelCapacitacion | undefined) {
    setCapAsignaciones(prev => {
      const resto = prev.filter(a => !(a.categoriaId === categoriaId && (a.subArea ?? null) === subArea));
      return nivel ? [...resto, { categoriaId, subArea, nivel }] : resto;
    });
  }
  // Alterna: si ya está en ese nivel lo quita; si no, lo pone en ese nivel.
  function alternarNivel(categoriaId: string, subArea: string | null, nivel: NivelCapacitacion) {
    fijarNivel(categoriaId, subArea, nivelDe(categoriaId, subArea) === nivel ? undefined : nivel);
  }
  // "Sugerir según el puesto": deriva del área + sub-área del puesto y fusiona
  // con lo existente (OBLIGATORIO gana). No pisa ajustes manuales previos.
  function sugerirCapacitacion() {
    const subNombre = subareasPorArea[form.area]?.find(s => s.id === form.subAreaId)?.nombre ?? null;
    const derivadas = derivarAsignacionesDefault(form.area, subNombre, categoriasCap);
    if (!derivadas.length) return;
    setCapAsignaciones(prev => {
      const merged = [...prev];
      for (const d of derivadas) {
        const i = merged.findIndex(a => a.categoriaId === d.categoriaId && (a.subArea ?? null) === (d.subArea ?? null));
        if (i >= 0) merged[i] = { ...merged[i], nivel: nivelMax(merged[i].nivel, d.nivel) };
        else merged.push(d);
      }
      return merged;
    });
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    resetExtras();
    setSaveError("");
    setShowForm(true);
  }
  async function openEdit(p: Puesto) {
    setSaveError("");
    // Trae el registro completo (incluye kpis y campos estructurados).
    let full = p;
    try {
      const r = await fetch(`/api/rrhh/puestos-operativos/${p.id}`, { cache: "no-store" });
      if (r.ok) { const d = await r.json(); if (d.puesto) full = d.puesto; }
    } catch { /* usa el de la lista */ }
    setEditing(full);
    setForm({
      nombre: full.nombre, area: normArea(full.area), subAreaId: full.subAreaId ?? "", color: full.color ?? "",
      descripcionPuesto: full.descripcionPuesto ?? "", objetivoPuesto: full.objetivoPuesto ?? "", misionPuesto: full.misionPuesto ?? "",
      responsabilidades: parseArr(full.responsabilidades).join("\n"),
      reportaAId: full.reportaAId ?? "",
      funciones: parseArr(full.funciones).join("\n"),
      tipoContrato: full.tipoContrato ?? "", modalidad: full.modalidad ?? "", prestacionesOtro: full.prestacionesOtro ?? "",
    });
    setEstandares(parseEst(full.estandares));
    setEstMinimos(jparse<EstandarMinimo[]>(full.estandaresMinimos, []));
    // coordinaConData nuevo; si no existe, migra del legado coordinaCon (nombres) sin puestoId.
    const cc = jparse<CoordinaConItem[]>(full.coordinaConData, []);
    setCoordina(cc);
    setJornada(jparse<JornadaDia[]>(full.jornada, []));
    setPrestacionesSel(parseArr(full.prestaciones));
    setValores(jparse<ValorPerfil[]>(full.valores, []));
    setAptitudes(jparse<AptitudPerfil[]>(full.aptitudes, []));
    setConocimientos(jparse<ConocimientoPerfil[]>(full.conocimientos, []));
    const ks = (full.kpis && full.kpis.length) ? full.kpis : [kpiFijo()];
    // Garantiza que el KPI fijo esté presente y primero.
    setKpis(ks.some(k => k.esFijoPlan) ? ks : [kpiFijo(), ...ks]);
    setOcupantesIds((full.ocupantes ?? []).map(o => o.id));
    setOnbModulos(parseIdList(full.onboardingModulos));
    setOnbCapacitaciones(parseIdList(full.onboardingCapacitaciones));
    setCapAsignaciones(asignacionesEfectivas(full.capacitacionAsignaciones, full.onboardingCapacitaciones));
    setShowForm(true);
  }

  async function crearCatalogo(tipo: "aptitud" | "conocimiento", nombre: string) {
    try {
      const r = await fetch("/api/rrhh/catalogos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, nombre }) });
      const d = await r.json();
      if (r.ok && d.item) {
        setCatalogos(c => tipo === "aptitud"
          ? { ...c, aptitudes: [...c.aptitudes.filter(x => x.nombre !== d.item.nombre), d.item] }
          : { ...c, conocimientos: [...c.conocimientos.filter(x => x.nombre !== d.item.nombre), d.item] });
      }
    } catch { /* silencioso */ }
  }

  function validar(): string | null {
    if (!form.nombre) return "El nombre del puesto es requerido";
    if (form.reportaAId && editing && generaCiclo(editing.id, form.reportaAId, reportaDe)) {
      return "La relación de reporte genera un ciclo (A reporta a B y B a A).";
    }
    const kpisValidos = kpis.filter(k => k.esFijoPlan || k.nombre.trim());
    if (kpisValidos.length < 3) return "Define al menos 3 KPIs del puesto (incluyendo Cumplimiento del plan).";
    if (kpisValidos.length > 5) return "Máximo 5 KPIs por puesto.";
    for (const k of kpis) {
      if (!k.esFijoPlan && k.nombre.trim() && !k.resultadoEsperado.trim())
        return `El KPI "${k.nombre}" necesita el resultado esperado del puesto.`;
    }
    return null;
  }

  async function save() {
    const err = validar();
    if (err) { setSaveError(err); return; }
    setSaving(true);
    setSaveError("");
    try {
      const prestacionesFinal = [
        ...prestacionesSel,
        ...(form.prestacionesOtro.trim() ? [form.prestacionesOtro.trim()] : []),
      ];
      const body = {
        nombre: form.nombre, area: form.area, subAreaId: form.subAreaId || null, color: form.color || null,
        objetivoArea: objetivoPorArea[form.area] || null,
        descripcionPuesto: form.descripcionPuesto || null,
        objetivoPuesto: form.objetivoPuesto || null,
        misionPuesto: form.misionPuesto || null,
        responsabilidades: toArr(form.responsabilidades),
        reportaAId: form.reportaAId || null,
        coordinaCon: coordina.map(c => puestos.find(p => p.id === c.puestoId)?.nombre).filter(Boolean),
        coordinaConData: coordina.filter(c => c.puestoId),
        estandares: estandares.filter(e => e.subarea || e.responsabilidad || e.estandar),
        estandaresMinimos: estMinimos.filter(e => e.enunciado.trim()),
        valores: valores.filter(v => v.nombre),
        aptitudes: aptitudes.filter(a => a.nombre.trim()),
        conocimientos: conocimientos.filter(c => c.nombre.trim()),
        funciones: toArr(form.funciones),
        prestaciones: prestacionesFinal,
        prestacionesOtro: form.prestacionesOtro || null,
        tipoContrato: form.tipoContrato || null,
        modalidad: form.modalidad || null,
        horario: jornada.length ? jornadaToString(jornada) : null,
        jornada: jornada,
        kpis: kpis.filter(k => k.esFijoPlan || k.nombre.trim()),
        ocupantesIds,
        onboardingModulos: onbModulos,
        onboardingCapacitaciones: onbCapacitaciones,
        capacitacionAsignaciones: capAsignaciones,
      };
      const url = editing ? `/api/rrhh/puestos-operativos/${editing.id}` : "/api/rrhh/puestos-operativos";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveError(d.error ?? "Error al guardar");
        return;
      }
      await load();
      setShowForm(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(p: Puesto) {
    if (!confirm(`¿Eliminar el puesto "${p.nombre}"? Los titulares quedarán sin puesto asignado.`)) return;
    await fetch(`/api/rrhh/puestos-operativos/${p.id}`, { method: "DELETE" });
    setSelected(null);
    await load();
  }

  async function generarAcuerdo(personalId: string) {
    setGenPdf(personalId);
    try {
      const r = await fetch("/api/rrhh/documentos-laborales", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalId, tipo: "ACUERDO" }),
      });
      const d = await r.json();
      if (!r.ok || !d.doc?.id) { toast.error(d.error ?? "No se pudo generar el acuerdo"); return; }
      window.open(`/api/rrhh/documentos-laborales/${d.doc.id}/pdf`, "_blank");
    } catch { toast.error("Error de conexión"); }
    finally { setGenPdf(null); }
  }
  async function copiarEnlaceAcuerdo(personalId: string) {
    setGenLink(personalId);
    try {
      const r = await fetch("/api/rrhh/documentos-laborales", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalId, tipo: "ACUERDO" }),
      });
      const d = await r.json();
      if (!r.ok || !d.doc?.token) { toast.error(d.error ?? "No se pudo generar el enlace"); return; }
      const url = `${window.location.origin}/acuerdo/${d.doc.token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Enlace de firma copiado");
    } catch { toast.error("No se pudo copiar el enlace"); }
    finally { setGenLink(null); }
  }

  const f = (k: keyof FormState) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value })),
  });

  const inputCls = "w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] placeholder-gray-600";
  const labelCls = "block text-xs text-gray-500 mb-1";
  const sectionCls = "text-xs text-[#B3985B] uppercase tracking-wider mb-3";
  const areaTabs = ["TODOS", ...AREAS];
  const visible = puestos.filter(p => (filterArea === "TODOS" || normArea(p.area) === filterArea) && p.activo);
  const grupos = AREAS
    .map(code => ({ code, items: visible.filter(p => normArea(p.area) === code) }))
    .filter(g => g.items.length > 0);
  const totalAsignados = visible.filter(p => (p.ocupantes?.length ?? 0) > 0).length;
  const totalVacantes = visible.length - totalAsignados;

  // Aviso suave de duplicación (§1)
  const dupWarn = (textosMuySimilares(form.descripcionPuesto, form.objetivoPuesto) ||
    textosMuySimilares(form.objetivoPuesto, form.misionPuesto) ||
    textosMuySimilares(form.descripcionPuesto, form.misionPuesto));
  const horasSem = horasSemanales(jornada);
  const esHibrido = form.modalidad === "Híbrido";

  // Opciones de "Coordina con": excluye el propio, el superior y los subordinados.
  const excluidosCoordina = new Set<string>([
    ...(editing ? [editing.id] : []),
    ...(form.reportaAId ? [form.reportaAId] : []),
    ...supervisaDerivado.map(s => s.id),
  ]);
  const opcionesCoordina = puestos.filter(p => !excluidosCoordina.has(p.id));

  function Detalle({ p }: { p: Puesto }) {
    const resp = parseArr(p.responsabilidades);
    const est = parseEst(p.estandares);
    const min = jparse<EstandarMinimo[]>(p.estandaresMinimos, []);
    return (
      <div className="mt-4 space-y-3 border-t border-[#1a1a1a] pt-4" onClick={e => e.stopPropagation()}>
        {p.subArea && (<div><p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Subárea</p><p className="text-xs text-[#B3985B]">{p.subArea.nombre}</p></div>)}
        {p.descripcionPuesto && (<div><p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Descripción del puesto</p><p className="text-xs text-gray-300">{p.descripcionPuesto}</p></div>)}
        {p.objetivoPuesto && (<div><p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Objetivo del puesto</p><p className="text-xs text-gray-300">{p.objetivoPuesto}</p></div>)}
        {p.misionPuesto && (<div><p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Misión del puesto</p><p className="text-xs text-gray-300">{p.misionPuesto}</p></div>)}
        {resp.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Responsabilidades permanentes</p>
            <ul className="list-disc list-inside space-y-0.5">{resp.map((r, i) => <li key={i} className="text-xs text-gray-300">{r}</li>)}</ul>
          </div>
        )}
        {min.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Estándares mínimos (no negociables)</p>
            <ul className="space-y-0.5">{min.map((m, i) => <li key={i} className="text-xs text-gray-300">• {m.enunciado} <span className="text-gray-600">({m.frecuencia})</span></li>)}</ul>
          </div>
        )}
        {est.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Criterios de calidad</p>
            <div className="space-y-1">{est.map((e, i) => (
              <div key={i} className="text-xs text-gray-300 bg-[#0d0d0d] rounded px-2 py-1">
                {e.subarea && <span className="text-[#B3985B]">{e.subarea}: </span>}
                {e.responsabilidad} {e.estandar && <span className="text-gray-500">→ {e.estandar}</span>}
              </div>))}
            </div>
          </div>
        )}
        {(p.tipoContrato || p.modalidad || p.horario) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {p.tipoContrato && <span>Contrato: <span className="text-gray-300">{p.tipoContrato}</span></span>}
            {p.modalidad && <span>Modalidad: <span className="text-gray-300">{p.modalidad}</span></span>}
            {p.horario && <span>Jornada: <span className="text-gray-300">{p.horario}</span></span>}
          </div>
        )}
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Titulares</p>
          {(p.ocupantes?.length ?? 0) === 0 ? (
            <p className="text-xs text-orange-400/80">Falta asignar el rol. Edita el puesto para nombrar un titular.</p>
          ) : (
            <div className="space-y-1.5">
              {p.ocupantes!.map(o => (
                <div key={o.id} className="flex items-center justify-between gap-2 bg-[#0d0d0d] rounded-lg px-2.5 py-1.5">
                  <span className="text-xs text-gray-200">{o.nombre}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => copiarEnlaceAcuerdo(o.id)} disabled={genLink === o.id}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-[#B3985B] border border-[#222] hover:border-[#B3985B]/50 px-2 py-0.5 rounded transition-colors disabled:opacity-50">
                      <Link2 className="w-3 h-3" /> {genLink === o.id ? "Generando…" : "Enlace de firma"}
                    </button>
                    <button onClick={() => generarAcuerdo(o.id)} disabled={genPdf === o.id}
                      className="flex items-center gap-1 text-[11px] text-[#B3985B] hover:text-[#c9a96a] border border-[#B3985B]/30 hover:border-[#B3985B] px-2 py-0.5 rounded transition-colors disabled:opacity-50">
                      <FileText className="w-3 h-3" /> {genPdf === o.id ? "Generando…" : "Acuerdo PDF"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={() => openEdit(p)} className="text-xs text-gray-400 hover:text-[#B3985B] transition-colors">Editar puesto</button>
          <button onClick={() => eliminar(p)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Eliminar</button>
        </div>
      </div>
    );
  }

  function Fila({ p }: { p: Puesto }) {
    const asignado = (p.ocupantes?.length ?? 0) > 0;
    const isOpen = selected?.id === p.id;
    return (
      <div className="border-b border-[#161616] last:border-0">
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#0f0f0f] transition-colors" onClick={() => setSelected(isOpen ? null : p)}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || areaColor(normArea(p.area)) }} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
            {p.reportaA && <p className="text-[11px] text-gray-600 truncate">Reporta a: {p.reportaA.nombre}</p>}
          </div>
          {asignado ? (
            <span className="flex items-center gap-1 text-[11px] text-green-400 bg-green-900/20 border border-green-500/20 px-2 py-0.5 rounded-full shrink-0">
              <UserCheck className="w-3 h-3" />{p.ocupantes!.length === 1 ? p.ocupantes![0].nombre : `${p.ocupantes!.length} titulares`}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-orange-400 bg-orange-900/20 border border-orange-500/20 px-2 py-0.5 rounded-full shrink-0">
              <UserX className="w-3 h-3" /> Falta el rol
            </span>
          )}
        </div>
        {isOpen && <div className="px-4 pb-4"><Detalle p={p} /></div>}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Puestos</h1>
          <p className="ms-subtitle">Fuente única de verdad: descripción, estándares, KPIs, perfil y titular por puesto</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[#222] overflow-hidden">
            <button onClick={() => setVista("lista")} className={`p-2 transition-colors ${vista === "lista" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-white"}`} title="Vista de lista"><LayoutList className="w-4 h-4" /></button>
            <button onClick={() => setVista("grid")} className={`p-2 transition-colors ${vista === "grid" ? "bg-[#B3985B] text-black" : "text-gray-500 hover:text-white"}`} title="Vista de cuadrícula"><LayoutGrid className="w-4 h-4" /></button>
          </div>
          <button onClick={openNew} className="ms-btn-primary">+ Nuevo puesto</button>
        </div>
      </div>

      {!loading && visible.length > 0 && (
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-green-400"><UserCheck className="w-3.5 h-3.5" /> {totalAsignados} asignado{totalAsignados !== 1 ? "s" : ""}</span>
          <span className="flex items-center gap-1.5 text-orange-400"><UserX className="w-3.5 h-3.5" /> {totalVacantes} sin rol</span>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {areaTabs.map(a => (
          <button key={a} onClick={() => setFilterArea(a)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${filterArea === a ? "bg-[#B3985B] text-black border-[#B3985B]" : "border-[#222] text-gray-500 hover:text-white"}`}>
            {a === "TODOS" ? "Todos" : areaLabel(a)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><div className="w-6 h-6 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" /></div>
      ) : visible.length === 0 ? (
        <div className="ms-empty-state"><p className="text-gray-500">Sin puestos definidos</p><p className="text-gray-700 text-xs mt-1">Define la estructura operativa de tu organización</p></div>
      ) : (
        <div className="space-y-6">
          {grupos.map(g => (
            <div key={g.code}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: areaColor(g.code) }} />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{areaLabel(g.code)}</h2>
                <span className="text-xs text-gray-600">{g.items.filter(p => (p.ocupantes?.length ?? 0) > 0).length}/{g.items.length} con titular</span>
              </div>
              {vista === "lista" ? (
                <div className="ms-card p-0 overflow-hidden">{g.items.map(p => <Fila key={p.id} p={p} />)}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {g.items.map(p => {
                    const asignado = (p.ocupantes?.length ?? 0) > 0;
                    return (
                      <div key={p.id} className="ms-stat-card hover:border-[#2a2a2a] cursor-pointer transition-all" onClick={() => setSelected(p === selected ? null : p)}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-white font-semibold flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color || areaColor(normArea(p.area)) }} />
                            <span className="truncate">{p.nombre}</span>
                          </p>
                        </div>
                        {asignado ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-green-400 bg-green-900/20 border border-green-500/20 px-2 py-0.5 rounded-full"><UserCheck className="w-3 h-3" />{p.ocupantes!.length === 1 ? p.ocupantes![0].nombre : `${p.ocupantes!.length} titulares`}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-orange-400 bg-orange-900/20 border border-orange-500/20 px-2 py-0.5 rounded-full"><UserX className="w-3 h-3" /> Falta el rol</span>
                        )}
                        {p.reportaA && <p className="text-[11px] text-gray-600 mt-2">Reporta a: {p.reportaA.nombre}</p>}
                        {selected?.id === p.id && <Detalle p={p} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto">
          <div className="ms-card w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#111] border-b border-[#222] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-white font-semibold">{editing ? "Editar puesto" : "Nuevo puesto"}{editing?.version ? <span className="text-gray-600 text-xs font-normal ml-2">v{editing.version}</span> : null}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>

            <div className="p-6 space-y-6">
              {/* §1 Identificación */}
              <div>
                <p className={sectionCls}>Identificación</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelCls}>Nombre del puesto *</label>
                    <input {...f("nombre")} className={inputCls} placeholder="Ej: Coordinador de Producción" />
                  </div>
                  <div>
                    <label className={labelCls}>Área *</label>
                    <Combobox value={form.area} onChange={v => setForm(p => ({ ...p, area: v, subAreaId: "" }))} options={AREAS.map(a => ({ value: a, label: areaLabel(a) }))} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className={labelCls}>Subárea</label>
                    <Combobox value={form.subAreaId} onChange={v => setForm(p => ({ ...p, subAreaId: v }))}
                      options={[{ value: "", label: "— Sin subárea —" }, ...(subareasPorArea[form.area] ?? []).map(s => ({ value: s.id, label: s.nombre }))]} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Color (para organigrama)</label>
                    <input {...f("color")} type="text" className={inputCls} placeholder="#B3985B" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Objetivo del área (solo lectura, del maestro de Áreas)</label>
                  <div className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-gray-400 text-sm rounded-lg px-3 py-2 min-h-[38px]">
                    {objetivoPorArea[form.area] || <span className="text-gray-700">Define el objetivo en Organización → Áreas.</span>}
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Descripción del puesto (qué hace en el día a día)</label>
                  <textarea {...f("descripcionPuesto")} rows={3} className={`${inputCls} resize-none`} placeholder="En lenguaje operativo y concreto: lo que lee un candidato para saber en qué consiste el trabajo." />
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Objetivo del puesto (el resultado único por el que existe)</label>
                  <textarea {...f("objetivoPuesto")} rows={2} className={`${inputCls} resize-none`} placeholder="Un resultado, no una actividad. Ej: Cada evento se entrega montado y operando a tiempo." />
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Misión del puesto (su contribución a la operación)</label>
                  <textarea {...f("misionPuesto")} rows={2} className={`${inputCls} resize-none`} placeholder="Para qué existe este puesto dentro de la organización" />
                </div>
                {dupWarn && (
                  <p className="mt-2 text-[11px] text-orange-400/90 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Descripción, objetivo y misión se parecen mucho. Diferéncialos: la descripción es el día a día, el objetivo es el resultado, la misión es la contribución.</p>
                )}
              </div>

              {/* §4.2 Responsabilidades */}
              <div>
                <p className={sectionCls}>Responsabilidades permanentes (una por línea)</p>
                <textarea {...f("responsabilidades")} rows={5} className={`${inputCls} resize-none font-mono text-xs`}
                  placeholder={"Lo que SIEMPRE es responsable, sin importar el plan de trabajo\nEj:\nEntregar cada evento montado a tiempo"} />
              </div>

              {/* §2 Relaciones de trabajo */}
              <div>
                <p className={sectionCls}>Relaciones de trabajo</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Reporta a (puesto)</label>
                    <Combobox value={form.reportaAId} onChange={v => setForm(p => ({ ...p, reportaAId: v }))}
                      options={[{ value: "", label: "— Ninguno —" }, ...puestos.filter(x => x.id !== editing?.id).map(x => ({ value: x.id, label: x.nombre }))]} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Supervisa a (derivado)</label>
                    <div className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 min-h-[38px] flex flex-wrap gap-1.5">
                      {supervisaDerivado.length === 0 ? <span className="text-gray-700 text-xs">Ningún puesto reporta a este.</span> :
                        supervisaDerivado.map(s => <span key={s.id} className="text-[11px] bg-[#1a1a1a] text-gray-300 px-2 py-0.5 rounded-full">{s.nombre}</span>)}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">Se actualiza automáticamente desde el campo <em>Reporta a</em> de cada puesto.</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelCls}>Coordina con</label>
                    <Combobox value="" onChange={v => { if (v && !coordina.some(c => c.puestoId === v)) setCoordina(c => [...c, { puestoId: v, nota: "" }]); }}
                      options={[{ value: "", label: "+ Agregar puesto…" }, ...opcionesCoordina.filter(p => !coordina.some(c => c.puestoId === p.id)).map(p => ({ value: p.id, label: p.nombre }))]}
                      className="text-xs bg-[#0d0d0d] border border-[#222] rounded px-2 py-1" />
                  </div>
                  <div className="space-y-2">
                    {coordina.length === 0 && <p className="text-gray-700 text-xs">Sin coordinaciones. Agrega los puestos con los que este colabora.</p>}
                    {coordina.map((c, i) => {
                      const nombre = puestos.find(p => p.id === c.puestoId)?.nombre ?? "(puesto eliminado)";
                      return (
                        <div key={c.puestoId} className="flex items-center gap-2">
                          <span className="text-xs text-[#B3985B] w-40 shrink-0 truncate">{nombre}</span>
                          <input value={c.nota ?? ""} onChange={e => setCoordina(arr => arr.map((x, ix) => ix === i ? { ...x, nota: e.target.value } : x))}
                            className={`${inputCls} flex-1`} placeholder="Tipo de coordinación (ej. le entrega el rider 48 h antes)" />
                          <button onClick={() => setCoordina(arr => arr.filter((_, ix) => ix !== i))} className="text-gray-600 hover:text-red-400"><X className="w-4 h-4" /></button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* §6 Estándares mínimos (no negociables) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className={sectionCls + " mb-0"}>Estándares mínimos (no negociables)</p>
                  <button onClick={() => setEstMinimos(e => [...e, { enunciado: "", frecuencia: "semanal", evidencia: "", verificaPuestoId: "" }])} className="text-xs text-gray-500 hover:text-[#B3985B] flex items-center gap-1"><Plus className="w-3 h-3" /> Agregar</button>
                </div>
                <p className="text-[11px] text-gray-600 mb-2">Entre 3 y 8. Cada uno una sola afirmación verificable en sí/no. Ej: “Entrega el reporte de cierre antes del martes 12:00.”</p>
                <div className="space-y-2">
                  {estMinimos.map((m, i) => {
                    const adv = adverbioVago(m.enunciado);
                    return (
                      <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-2 space-y-2">
                        <div className="flex items-start gap-2">
                          <input value={m.enunciado} onChange={e => setEstMinimos(arr => arr.map((x, ix) => ix === i ? { ...x, enunciado: e.target.value } : x))}
                            className={`${inputCls} flex-1`} placeholder="Afirmación verificable sí/no (sin conjunciones)" />
                          <button onClick={() => setEstMinimos(arr => arr.filter((_, ix) => ix !== i))} className="text-gray-600 hover:text-red-400 pt-2"><X className="w-4 h-4" /></button>
                        </div>
                        {adv && <p className="text-[11px] text-orange-400/90 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Evita “{adv}”: reescríbelo como algo verificable en sí/no.</p>}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <select value={m.frecuencia} onChange={e => setEstMinimos(arr => arr.map((x, ix) => ix === i ? { ...x, frecuencia: e.target.value as EstandarMinimo["frecuencia"] } : x))} className={inputCls}>
                            {FRECUENCIAS_ESTANDAR.map(fr => <option key={fr.value} value={fr.value}>{fr.label}</option>)}
                          </select>
                          <input value={m.evidencia} onChange={e => setEstMinimos(arr => arr.map((x, ix) => ix === i ? { ...x, evidencia: e.target.value } : x))} className={inputCls} placeholder="Evidencia esperada (foto, reporte…)" />
                          <Combobox value={m.verificaPuestoId ?? ""} onChange={v => setEstMinimos(arr => arr.map((x, ix) => ix === i ? { ...x, verificaPuestoId: v } : x))}
                            options={[{ value: "", label: "Verifica: —" }, ...puestos.map(p => ({ value: p.id, label: p.nombre }))]} className={inputCls} />
                        </div>
                      </div>
                    );
                  })}
                  {estMinimos.length === 0 && <p className="text-gray-700 text-xs">Sin estándares mínimos. Define el piso no negociable.</p>}
                </div>
              </div>

              {/* §6 Criterios de calidad (narrativos, antes "Estándares") */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className={sectionCls + " mb-0"}>Criterios de calidad (cómo se ve bien hecho)</p>
                  <button onClick={() => setEstandares(e => [...e, { subarea:"", responsabilidad:"", estandar:"" }])} className="text-xs text-gray-500 hover:text-[#B3985B]">+ Agregar</button>
                </div>
                <div className="space-y-2">
                  {estandares.map((e, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start">
                      <input value={e.subarea} onChange={ev => setEstandares(arr => arr.map((x,ix)=>ix===i?{...x,subarea:ev.target.value}:x))} className={`${inputCls} col-span-3`} placeholder="Subárea" />
                      <input value={e.responsabilidad} onChange={ev => setEstandares(arr => arr.map((x,ix)=>ix===i?{...x,responsabilidad:ev.target.value}:x))} className={`${inputCls} col-span-4`} placeholder="Responsabilidad" />
                      <input value={e.estandar} onChange={ev => setEstandares(arr => arr.map((x,ix)=>ix===i?{...x,estandar:ev.target.value}:x))} className={`${inputCls} col-span-4`} placeholder="Estándar narrativo" />
                      <button onClick={() => setEstandares(arr => arr.filter((_,ix)=>ix!==i))} className="col-span-1 text-gray-600 hover:text-red-400 text-lg leading-none pt-1">×</button>
                    </div>
                  ))}
                  {estandares.length === 0 && <p className="text-gray-700 text-xs">Sin criterios de calidad.</p>}
                </div>
              </div>

              {/* §4 KPIs del puesto */}
              <div>
                <p className={sectionCls}>KPIs del puesto (3 a 5)</p>
                <div className="space-y-3">
                  {kpis.map((k, i) => (
                    <div key={i} className={`rounded-lg p-3 space-y-2 border ${k.esFijoPlan ? "bg-[#0d0d0d] border-[#B3985B]/30" : "bg-[#0d0d0d] border-[#1a1a1a]"}`}>
                      <div className="flex items-center gap-2">
                        {k.esFijoPlan ? (
                          <span className="text-sm text-[#B3985B] font-medium flex-1">{KPI_PLAN_NOMBRE} <span className="text-[10px] text-gray-500">· automático · mensual</span></span>
                        ) : (
                          <input value={k.nombre} onChange={e => setKpis(a => a.map((x, ix) => ix === i ? { ...x, nombre: e.target.value } : x))} className={`${inputCls} flex-1`} placeholder="Nombre del KPI" />
                        )}
                        {!k.esFijoPlan && <button onClick={() => setKpis(a => a.filter((_, ix) => ix !== i))} className="text-gray-600 hover:text-red-400"><X className="w-4 h-4" /></button>}
                      </div>
                      {!k.esFijoPlan && (
                        <input value={k.resultadoEsperado} onChange={e => setKpis(a => a.map((x, ix) => ix === i ? { ...x, resultadoEsperado: e.target.value } : x))} className={inputCls} placeholder="Resultado esperado del puesto al que responde *" />
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <input value={k.meta} onChange={e => setKpis(a => a.map((x, ix) => ix === i ? { ...x, meta: e.target.value } : x))} className={inputCls} placeholder="Meta" />
                        <select disabled={k.esFijoPlan} value={k.unidad} onChange={e => setKpis(a => a.map((x, ix) => ix === i ? { ...x, unidad: e.target.value as KpiPuesto["unidad"] } : x))} className={`${inputCls} disabled:opacity-60`}>
                          {UNIDADES_KPI.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select disabled={k.esFijoPlan} value={k.frecuencia} onChange={e => setKpis(a => a.map((x, ix) => ix === i ? { ...x, frecuencia: e.target.value as KpiPuesto["frecuencia"] } : x))} className={`${inputCls} disabled:opacity-60`}>
                          {FRECUENCIAS_KPI.map(fr => <option key={fr} value={fr}>{fr}</option>)}
                        </select>
                        <select disabled={k.esFijoPlan} value={k.fuenteTipo} onChange={e => setKpis(a => a.map((x, ix) => ix === i ? { ...x, fuenteTipo: e.target.value as KpiPuesto["fuenteTipo"] } : x))} className={`${inputCls} disabled:opacity-60`}>
                          <option value="automatica">Automática</option>
                          <option value="manual">Manual</option>
                        </select>
                      </div>
                      {!k.esFijoPlan && k.fuenteTipo === "automatica" && (
                        <select value={k.fuente ?? ""} onChange={e => setKpis(a => a.map((x, ix) => ix === i ? { ...x, fuente: e.target.value } : x))} className={inputCls}>
                          <option value="">— Fuente del dato —</option>
                          {FUENTES_KPI.map(fu => <option key={fu} value={fu}>{fu}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
                {kpis.length < 5 && (
                  <button onClick={() => setKpis(a => [...a, { nombre: "", resultadoEsperado: "", unidad: "%", meta: "", frecuencia: "mensual", fuenteTipo: "manual" }])}
                    className="mt-2 text-xs text-gray-500 hover:text-[#B3985B] flex items-center gap-1"><Plus className="w-3 h-3" /> Agregar KPI</button>
                )}
              </div>

              {/* §5 Perfil requerido */}
              <div>
                <p className={sectionCls}>Perfil requerido</p>
                {/* Valores */}
                <label className={labelCls}>Valores (del catálogo de la empresa)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {catalogos.valores.map(v => {
                    const on = valores.some(x => x.nombre === v.nombre);
                    return (
                      <button key={v.id} onClick={() => setValores(a => on ? a.filter(x => x.nombre !== v.nombre) : [...a, { valorId: v.id, nombre: v.nombre, comoSeVe: "" }])}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${on ? "bg-[#B3985B]/15 text-[#B3985B] border-[#B3985B]/40" : "border-[#222] text-gray-500 hover:text-white"}`}>{v.nombre}</button>
                    );
                  })}
                </div>
                <div className="space-y-1.5 mb-4">
                  {valores.map((v, i) => (
                    <div key={v.nombre} className="flex items-center gap-2">
                      <span className="text-xs text-[#B3985B] w-32 shrink-0 truncate">{v.nombre}</span>
                      <input value={v.comoSeVe ?? ""} onChange={e => setValores(a => a.map((x, ix) => ix === i ? { ...x, comoSeVe: e.target.value } : x))} className={`${inputCls} flex-1`} placeholder="Cómo se ve este valor en este puesto" />
                    </div>
                  ))}
                </div>
                {/* Aptitudes */}
                <label className={labelCls}>Aptitudes y habilidades</label>
                <TagNivelEditor items={aptitudes} setItems={setAptitudes} catalogo={catalogos.aptitudes.map(a => a.nombre)}
                  onCreate={n => crearCatalogo("aptitud", n)} conIndispensable={false} inputCls={inputCls} />
                {/* Conocimientos */}
                <label className={labelCls + " mt-4"}>Conocimientos</label>
                <TagNivelEditor items={conocimientos} setItems={setConocimientos as never} catalogo={catalogos.conocimientos.map(c => c.nombre)}
                  onCreate={n => crearCatalogo("conocimiento", n)} conIndispensable inputCls={inputCls} />
              </div>

              {/* §3 Condiciones laborales */}
              <div>
                <p className={sectionCls}>Condiciones laborales (para el acuerdo)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Tipo de contrato</label>
                    <select {...f("tipoContrato")} className={inputCls}>
                      <option value="">— Selecciona —</option>
                      {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Modalidad</label>
                    <select {...f("modalidad")} className={inputCls}>
                      <option value="">— Selecciona —</option>
                      {MODALIDADES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* §3.3 Jornada semanal */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelCls}>Días y horario de operación</label>
                    <button onClick={() => {
                      const base = jornada[0] ?? { entrada: "09:00", salida: "18:00", ubicacion: "oficina" as const };
                      setJornada(j => j.map(d => ({ ...d, entrada: base.entrada, salida: base.salida })));
                    }} className="text-[11px] text-gray-500 hover:text-[#B3985B]">Aplicar a todos los días</button>
                  </div>
                  <div className="space-y-1.5">
                    {DIAS_SEMANA.map(d => {
                      const idx = jornada.findIndex(j => j.dia === d.key);
                      const activo = idx >= 0;
                      const dia = activo ? jornada[idx] : null;
                      return (
                        <div key={d.key} className="flex items-center gap-2 flex-wrap">
                          <label className="flex items-center gap-1.5 w-24 shrink-0 text-xs text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={activo} className="accent-[#B3985B]"
                              onChange={() => setJornada(j => activo ? j.filter(x => x.dia !== d.key) : [...j, { dia: d.key, entrada: "09:00", salida: "18:00", ubicacion: "oficina" }])} />
                            {d.label}
                          </label>
                          {activo && dia && (
                            <>
                              <input type="time" value={dia.entrada} onChange={e => setJornada(j => j.map(x => x.dia === d.key ? { ...x, entrada: e.target.value } : x))} className="bg-[#0d0d0d] border border-[#222] text-white text-xs rounded px-2 py-1" />
                              <span className="text-gray-600 text-xs">a</span>
                              <input type="time" value={dia.salida} onChange={e => setJornada(j => j.map(x => x.dia === d.key ? { ...x, salida: e.target.value } : x))} className="bg-[#0d0d0d] border border-[#222] text-white text-xs rounded px-2 py-1" />
                              {esHibrido && (
                                <button onClick={() => setJornada(j => j.map(x => x.dia === d.key ? { ...x, ubicacion: x.ubicacion === "oficina" ? "home" : "oficina" } : x))}
                                  className={`text-[11px] px-2 py-1 rounded border ${dia.ubicacion === "oficina" ? "text-[#B3985B] border-[#B3985B]/40" : "text-blue-300 border-blue-500/40"}`}>
                                  {dia.ubicacion === "oficina" ? "Oficina" : "Home office"}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {jornada.length > 0 && (
                    <p className="text-[11px] text-gray-500 mt-2">{jornada.length} día(s) · {horasSem.toFixed(1)} h semanales · <span className="text-gray-400">{jornadaToString(jornada)}</span></p>
                  )}
                </div>

                {/* §3.4 Prestaciones */}
                <div className="mt-4">
                  <label className={labelCls}>Prestaciones</label>
                  <div className="flex flex-wrap gap-1.5">
                    {catalogos.prestaciones.map(pr => {
                      const on = prestacionesSel.includes(pr.nombre);
                      return (
                        <button key={pr.id} onClick={() => setPrestacionesSel(a => on ? a.filter(x => x !== pr.nombre) : [...a, pr.nombre])}
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${on ? "bg-[#B3985B]/15 text-[#B3985B] border-[#B3985B]/40" : "border-[#222] text-gray-500 hover:text-white"}`}>{pr.nombre}</button>
                      );
                    })}
                  </div>
                  <input {...f("prestacionesOtro")} className={`${inputCls} mt-2`} placeholder="Otro (texto libre)" />
                </div>

                <div className="mt-4">
                  <label className={labelCls}>Funciones (una por línea)</label>
                  <textarea {...f("funciones")} rows={3} className={`${inputCls} resize-none font-mono text-xs`} placeholder={"Operar la consola de audio\nSupervisar el montaje"} />
                </div>
              </div>

              {/* Titulares */}
              <div>
                <p className={sectionCls}>Titulares</p>
                <div className="max-h-40 overflow-y-auto border border-[#222] rounded-lg bg-[#0d0d0d] p-2 space-y-1">
                  {personal.filter(pe => pe.activo).length === 0 && <p className="text-gray-700 text-xs px-1">Sin personal registrado.</p>}
                  {personal.filter(pe => pe.activo).map(pe => (
                    <label key={pe.id} className="flex items-center gap-2 text-sm text-gray-300 px-1 py-0.5 hover:bg-[#1a1a1a] rounded cursor-pointer">
                      <input type="checkbox" checked={ocupantesIds.includes(pe.id)} onChange={() => setOcupantesIds(ids => ids.includes(pe.id) ? ids.filter(x=>x!==pe.id) : [...ids, pe.id])} className="accent-[#B3985B]" />
                      <span>{pe.nombre}</span><span className="text-gray-600 text-xs">· {pe.puesto}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Onboarding del puesto */}
              <div>
                <p className={sectionCls}>Onboarding del puesto</p>
                <p className="text-[11px] text-gray-500 mb-3 -mt-1">
                  El recorrido de integración es fijo (firma de documentos, cultura, plan de trabajo, etc.). Aquí eliges solo lo específico de este puesto: qué módulos de la plataforma revisa y qué áreas de capacitación le tocan.
                </p>

                <label className={labelCls}>Módulos de la plataforma a revisar</label>
                <div className="space-y-2 mb-4">
                  {MODULOS_POR_SECCION.map(sec => (
                    <div key={sec.seccion}>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{sec.seccion}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {sec.items.map(m => {
                          const on = onbModulos.includes(m.key);
                          return (
                            <button key={m.key} type="button" onClick={() => setOnbModulos(a => on ? a.filter(x => x !== m.key) : [...a, m.key])}
                              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${on ? "bg-[#B3985B]/15 text-[#B3985B] border-[#B3985B]/40" : "border-[#222] text-gray-500 hover:text-white"}`}>{m.label}</button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <label className={`${labelCls} !mb-0`}>Capacitación del puesto</label>
                  <button type="button" onClick={sugerirCapacitacion}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors">
                    Sugerir según el puesto
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mb-3 -mt-1">
                  Marca cada área o sub-área como <span className="text-[#B3985B]">Obligatorio</span> o <span className="text-gray-400">Recomendado</span>. Si el puesto no tiene sub-área, marca el área completa. Esto define lo que cursa quien ocupe el puesto.
                </p>

                {categoriasCap.length === 0 ? (
                  <span className="text-gray-700 text-xs">No hay áreas de capacitación registradas.</span>
                ) : (
                  <div className="space-y-2">
                    {categoriasCap.map(c => (
                      <div key={c.id} className="border border-[#222] rounded-lg bg-[#0d0d0d] overflow-hidden">
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                          <span className="text-sm text-gray-200 font-medium">{c.nombre}
                            <span className="text-gray-600 text-xs font-normal"> · área completa</span>
                          </span>
                          <NivelSwitch nivel={nivelDe(c.id, null)} onPick={n => alternarNivel(c.id, null, n)} />
                        </div>
                        {c.subAreas.length > 0 && (
                          <div className="border-t border-[#1a1a1a] divide-y divide-[#1a1a1a]">
                            {c.subAreas.map(sa => (
                              <div key={sa} className="flex items-center justify-between gap-2 pl-6 pr-3 py-1.5">
                                <span className="text-[13px] text-gray-400">{sa}</span>
                                <NivelSwitch nivel={nivelDe(c.id, sa)} onPick={n => alternarNivel(c.id, sa, n)} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#111] border-t border-[#222] px-6 py-4 flex items-center justify-between gap-3">
              {saveError && <p className="text-red-400 text-xs flex-1">{saveError}</p>}
              <div className="flex gap-3 ml-auto">
                <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-sm px-4 py-2 transition-colors">Cancelar</button>
                <button onClick={save} disabled={saving || !form.nombre} className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-6 py-2 rounded-lg transition-colors">{saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear puesto"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Selector de nivel de capacitación: Obligatorio / Recomendado (toggle). Sin selección = no asignado.
function NivelSwitch({ nivel, onPick }: { nivel?: NivelCapacitacion; onPick: (n: NivelCapacitacion) => void }) {
  const opts: { n: NivelCapacitacion; label: string; on: string }[] = [
    { n: "OBLIGATORIO", label: "Obligatorio", on: "bg-[#B3985B]/20 text-[#B3985B] border-[#B3985B]/50" },
    { n: "RECOMENDADO", label: "Recomendado", on: "bg-sky-500/15 text-sky-300 border-sky-500/40" },
  ];
  return (
    <div className="flex items-center gap-1 shrink-0">
      {opts.map(o => {
        const active = nivel === o.n;
        return (
          <button key={o.n} type="button" onClick={() => onPick(o.n)}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${active ? o.on : "border-[#222] text-gray-600 hover:text-gray-300"}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Editor de tags con nivel requerido y creación al vuelo (aptitudes / conocimientos).
function TagNivelEditor({ items, setItems, catalogo, onCreate, conIndispensable, inputCls }: {
  items: (AptitudPerfil | ConocimientoPerfil)[];
  setItems: React.Dispatch<React.SetStateAction<AptitudPerfil[]>>;
  catalogo: string[];
  onCreate: (n: string) => void;
  conIndispensable: boolean;
  inputCls: string;
}) {
  const [q, setQ] = useState("");
  const sugerencias = catalogo.filter(c => c.toLowerCase().includes(q.toLowerCase()) && !items.some(i => i.nombre === c)).slice(0, 6);
  function add(nombre: string) {
    const n = nombre.trim();
    if (!n || items.some(i => i.nombre === n)) { setQ(""); return; }
    if (!catalogo.includes(n)) onCreate(n);
    const base = conIndispensable ? { nombre: n, nivel: "intermedio" as Nivel, indispensable: false } : { nombre: n, nivel: "intermedio" as Nivel };
    setItems(a => [...a, base as never]);
    setQ("");
  }
  return (
    <div>
      <div className="relative">
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(q); } }}
          className={inputCls} placeholder="Escribe y Enter para agregar (autocompleta del catálogo)" />
        {q && sugerencias.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-[#111] border border-[#222] rounded-lg overflow-hidden">
            {sugerencias.map(s => <button key={s} onClick={() => add(s)} className="block w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#1a1a1a]">{s}</button>)}
          </div>
        )}
      </div>
      <div className="space-y-1.5 mt-2">
        {items.map((it, i) => (
          <div key={it.nombre} className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-200 w-40 shrink-0 truncate">{it.nombre}</span>
            <select value={it.nivel} onChange={e => setItems(a => a.map((x, ix) => ix === i ? { ...x, nivel: e.target.value as Nivel } : x) as never)}
              className="bg-[#0d0d0d] border border-[#222] text-white text-xs rounded px-2 py-1">
              {NIVELES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
            {conIndispensable && (
              <label className="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer">
                <input type="checkbox" checked={(it as ConocimientoPerfil).indispensable}
                  onChange={e => setItems(a => a.map((x, ix) => ix === i ? { ...x, indispensable: e.target.checked } : x) as never)} className="accent-[#B3985B]" />
                Indispensable
              </label>
            )}
            <button onClick={() => setItems(a => a.filter((_, ix) => ix !== i) as never)} className="text-gray-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
