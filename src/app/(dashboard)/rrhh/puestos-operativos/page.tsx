"use client";
import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { LayoutList, LayoutGrid, FileText, UserCheck, UserX, Link2, X, Plus, AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import { AREA_CODES } from "@/lib/areas";
import { useAreas } from "@/components/AreasProvider";
import { MODULOS_POR_SECCION, AREA_MODULE_PRESETS } from "@/lib/nav";
import { parseIdList } from "@/lib/onboarding";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import {
  asignacionesEfectivas, derivarAsignacionesDefault, nivelMax,
  type CapAsignacion, type NivelCapacitacion,
} from "@/lib/capacitacion-plan";
import {
  TIPOS_CONTRATO, MODALIDADES, DIAS_SEMANA, FRECUENCIAS_KPI, UNIDADES_KPI, FRECUENCIAS_ESTANDAR,
  FUENTES_KPI, KPI_PLAN_NOMBRE, KPI_PLAN_META_DEFAULT, ADN_MAINSTAGE, REPORTES_BASE, VALORES_DEFAULT,
  jparse, jornadaToString, horasSemanales, adverbioVago, generaCiclo, procedencia,
  type JornadaDia, type CoordinaConItem, type ValorPerfil, type AptitudPerfil, type ConocimientoPerfil,
  type CriterioCalidad, type ReportePuesto, type KpiPuesto, type Nivel, type OrigenIA, type BloqueIA,
} from "@/lib/puesto";

interface Ocupante { id: string; nombre: string; userId?: string | null }
interface SubAreaLink { subAreaId: string; principal: boolean; subArea: { id: string; nombre: string; areaId: string } }
interface Puesto {
  id: string; nombre: string; area: string;
  subAreas?: SubAreaLink[];
  misionPuesto?: string | null;
  responsabilidades?: string | null;
  reportaAId?: string | null; reportaA?: { id: string; nombre: string } | null;
  coordinaConData?: string | null;
  estandares?: string | null; reportes?: string | null; origenIA?: string | null;
  valores?: string | null; aptitudes?: string | null; conocimientos?: string | null;
  prestaciones?: string | null; prestacionesOtro?: string | null;
  tipoContrato?: string | null; modalidad?: string | null; jornada?: string | null;
  onboardingModulos?: string | null; capacitacionAsignaciones?: string | null;
  version?: number | null;
  activo: boolean;
  ocupantes?: Ocupante[]; kpis?: KpiPuesto[];
}
interface PersonaLite { id: string; nombre: string; puesto: string; activo: boolean }
interface Catalogos {
  prestaciones: { id: string; nombre: string }[];
  valores: { id: string; nombre: string; descripcion?: string | null }[];
  aptitudes: { id: string; nombre: string }[];
  conocimientos: { id: string; nombre: string }[];
}
interface SubAreaOpt { id: string; nombre: string; area: string }

const AREAS = [...AREA_CODES];
function normArea(a: string): string {
  return a === "RRHH" || a === "GENERAL" ? "ADMINISTRACION" : a;
}
function parseArr(s?: string | null): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return s.split(",").map(x=>x.trim()).filter(Boolean); }
}
function toArr(s: string) {
  return s.split(/\n/).map(x=>x.trim()).filter(Boolean);
}
const NIVELES: { value: Nivel; label: string }[] = [
  { value: "basico", label: "Básico" }, { value: "intermedio", label: "Intermedio" }, { value: "avanzado", label: "Avanzado" },
];

const EMPTY_FORM = {
  nombre:"", area:"ADMINISTRACION",
  misionPuesto:"", responsabilidades:"",
  reportaAId:"", tipoContrato:"", modalidad:"", prestacionesOtro:"",
};
type FormState = typeof EMPTY_FORM;

function kpiFijo(): KpiPuesto {
  return { nombre: KPI_PLAN_NOMBRE, resultadoEsperado: "El plan de trabajo del puesto se cumple mes a mes",
    unidad: "%", meta: KPI_PLAN_META_DEFAULT, frecuencia: "mensual", fuenteTipo: "automatica",
    fuente: "Cumplimiento (Plan)", esFijoPlan: true };
}

// Qué bloques del registro están completos: alimenta la barra de avance de la ficha.
function completitud(p: Puesto): { hechos: number; total: number; faltan: string[] } {
  const chk: [string, boolean][] = [
    ["Misión", !!p.misionPuesto?.trim()],
    ["Responsabilidades", parseArr(p.responsabilidades).length > 0],
    ["Criterios de calidad", jparse<CriterioCalidad[]>(p.estandares, []).length > 0],
    ["Resultados clave", (p.kpis?.length ?? 0) >= 3],
    ["Reportes", jparse<ReportePuesto[]>(p.reportes, []).length > 0],
    ["Perfil", jparse<AptitudPerfil[]>(p.aptitudes, []).length > 0 || jparse<ConocimientoPerfil[]>(p.conocimientos, []).length > 0],
    ["Condiciones", !!p.tipoContrato || !!p.modalidad || jparse<JornadaDia[]>(p.jornada, []).length > 0],
    ["Titular", (p.ocupantes?.length ?? 0) > 0],
  ];
  return { hechos: chk.filter(c => c[1]).length, total: chk.length, faltan: chk.filter(c => !c[1]).map(c => c[0]) };
}

// Sello de procedencia de un bloque: deja ver de un vistazo qué escribió la IA.
function SelloIA({ origen, bloque }: { origen: OrigenIA; bloque: BloqueIA }) {
  const p = procedencia(origen, bloque);
  if (p === "MANUAL") return null;
  const esPuro = p === "IA";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${esPuro ? "text-violet-300 border-violet-500/40 bg-violet-500/10" : "text-gray-400 border-[#2a2a2a]"}`}>
      {esPuro ? "IA" : "IA · editado"}
    </span>
  );
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
  const [subAreaIds, setSubAreaIds] = useState<string[]>([]);
  const [estandares, setEstandares] = useState<CriterioCalidad[]>([]);
  const [reportes, setReportes] = useState<ReportePuesto[]>([]);
  const [coordina, setCoordina] = useState<CoordinaConItem[]>([]);
  const [jornada, setJornada] = useState<JornadaDia[]>([]);
  const [prestacionesSel, setPrestacionesSel] = useState<string[]>([]);
  const [valores, setValores] = useState<ValorPerfil[]>([]);
  const [aptitudes, setAptitudes] = useState<AptitudPerfil[]>([]);
  const [conocimientos, setConocimientos] = useState<ConocimientoPerfil[]>([]);
  const [kpis, setKpis] = useState<KpiPuesto[]>([]);
  const [ocupantesIds, setOcupantesIds] = useState<string[]>([]);
  const [onbModulos, setOnbModulos] = useState<string[]>([]);
  const [capAsignaciones, setCapAsignaciones] = useState<CapAsignacion[]>([]);
  const [categoriasCap, setCategoriasCap] = useState<{ id: string; nombre: string; slug: string; subAreas: string[] }[]>([]);
  const [origen, setOrigen] = useState<OrigenIA>({});
  // Copia literal de lo que devolvió la IA: al guardar, lo que ya no coincide pasa a "IA · editado".
  const [iaSnapshot, setIaSnapshot] = useState<Partial<Record<BloqueIA, string>>>({});
  const [generando, setGenerando] = useState<"completo" | "refresh" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [selected, setSelected] = useState<Puesto | null>(null);
  const [filterArea, setFilterArea] = useState("TODOS");
  const [vista, setVista] = useState<"lista" | "grid">("lista");
  const [genPdf, setGenPdf] = useState<string | null>(null);
  const { downloadPdf } = usePdfDownload();
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

  // Catálogo plano de sub-áreas de TODAS las áreas: un puesto puede abarcar
  // sub-áreas de otra área (p. ej. Dirección general toca RRHH y Ventas).
  const subAreaOpts = useMemo<SubAreaOpt[]>(
    () => AREAS.flatMap(code => (subareasPorArea[code] ?? []).map(s => ({ ...s, area: code }))),
    [subareasPorArea],
  );
  const subAreaById = useMemo(() => new Map(subAreaOpts.map(s => [s.id, s])), [subAreaOpts]);
  // Áreas que toca el puesto: la suya más las de sus sub-áreas prestadas.
  const areasDelPuesto = useMemo(() => {
    const set = new Set<string>([form.area]);
    for (const id of subAreaIds) { const s = subAreaById.get(id); if (s) set.add(s.area); }
    return [...set];
  }, [form.area, subAreaIds, subAreaById]);

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

  // Módulos ofrecidos en el onboarding: solo los del área (y los de las áreas de
  // las sub-áreas prestadas). Sin esto el editor mostraba los ~60 del sistema.
  const modulosPermitidos = useMemo(() => {
    const set = new Set(areasDelPuesto.flatMap(a => AREA_MODULE_PRESETS[a] ?? []));
    return MODULOS_POR_SECCION
      .map(sec => ({ seccion: sec.seccion, items: sec.items.filter(i => set.has(i.key)) }))
      .filter(sec => sec.items.length > 0);
  }, [areasDelPuesto]);

  // Capacitación obligatoria: el área completa de cada área que toca el puesto,
  // para que quien lo ocupe entienda la operación entera y no solo su rincón.
  const capObligatoria = useMemo(
    () => areasDelPuesto.flatMap(a => derivarAsignacionesDefault(a, null, categoriasCap)),
    [areasDelPuesto, categoriasCap],
  );
  const capExtra = useMemo(
    () => capAsignaciones.filter(a => !capObligatoria.some(o => o.categoriaId === a.categoriaId && (o.subArea ?? null) === (a.subArea ?? null))),
    [capAsignaciones, capObligatoria],
  );

  function resetExtras() {
    setSubAreaIds([]); setEstandares([]); setReportes(REPORTES_BASE.map(r => ({ ...r })));
    setCoordina([]); setJornada([]);
    setPrestacionesSel([]);
    // Los valores rigen a toda la empresa; lo que se captura por puesto es cómo se ven aquí.
    setValores(VALORES_DEFAULT.map(v => ({ nombre: v.nombre, comoSeVe: "" })));
    setAptitudes([]); setConocimientos([]);
    setKpis([kpiFijo()]); setOcupantesIds([]);
    setOnbModulos([]); setCapAsignaciones([]);
    setOrigen({}); setIaSnapshot({});
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
      nombre: full.nombre, area: normArea(full.area),
      misionPuesto: full.misionPuesto ?? "",
      responsabilidades: parseArr(full.responsabilidades).join("\n"),
      reportaAId: full.reportaAId ?? "",
      tipoContrato: full.tipoContrato ?? "", modalidad: full.modalidad ?? "", prestacionesOtro: full.prestacionesOtro ?? "",
    });
    setSubAreaIds((full.subAreas ?? []).map(s => s.subAreaId));
    setEstandares(jparse<CriterioCalidad[]>(full.estandares, []));
    const reps = jparse<ReportePuesto[]>(full.reportes, []);
    setReportes(reps.length ? reps : REPORTES_BASE.map(r => ({ ...r })));
    setCoordina(jparse<CoordinaConItem[]>(full.coordinaConData, []));
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
    setCapAsignaciones(asignacionesEfectivas(full.capacitacionAsignaciones, null));
    setOrigen(jparse<OrigenIA>(full.origenIA, {}));
    setIaSnapshot({});
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

  // Borrador con IA. "completo" reescribe todo; "refresh" solo los bloques que
  // siguen siendo 100% IA y respeta lo que se escribió o corrigió a mano.
  async function generar(modo: "completo" | "refresh") {
    if (!editing) { setSaveError("Guarda el puesto antes de generar con IA."); return; }
    if (modo === "completo" && !confirm("Se reemplazará el contenido actual de misión, responsabilidades, criterios, resultados, reportes y perfil. ¿Continuar?")) return;
    setGenerando(modo);
    setSaveError("");
    try {
      const r = await fetch(`/api/rrhh/puestos-operativos/${editing.id}/generar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo, subAreaIds }),
      });
      const d = await r.json();
      if (!r.ok) { setSaveError(d.error ?? "No se pudo generar"); return; }
      if (!d.borrador) { toast.success(d.mensaje ?? "Nada que refrescar"); return; }
      const b = d.borrador as Record<string, unknown>;
      const snap: Partial<Record<BloqueIA, string>> = {};
      if (b.misionPuesto !== undefined) {
        setForm(p => ({ ...p, misionPuesto: String(b.misionPuesto) }));
        snap.misionPuesto = String(b.misionPuesto);
      }
      if (b.responsabilidades !== undefined) {
        const txt = (b.responsabilidades as string[]).join("\n");
        setForm(p => ({ ...p, responsabilidades: txt }));
        snap.responsabilidades = txt;
      }
      if (b.estandares !== undefined) {
        setEstandares(b.estandares as CriterioCalidad[]);
        snap.estandares = JSON.stringify(b.estandares);
      }
      if (b.reportes !== undefined) {
        setReportes(b.reportes as ReportePuesto[]);
        snap.reportes = JSON.stringify(b.reportes);
      }
      if (b.kpis !== undefined) {
        const nuevos = [kpiFijo(), ...(b.kpis as KpiPuesto[])].slice(0, 5);
        setKpis(nuevos);
        snap.kpis = JSON.stringify(nuevos);
      }
      if (b.perfil !== undefined) {
        const perf = b.perfil as { aptitudes: AptitudPerfil[]; conocimientos: ConocimientoPerfil[] };
        setAptitudes(perf.aptitudes);
        setConocimientos(perf.conocimientos);
        snap.perfil = JSON.stringify(perf);
      }
      setIaSnapshot(s => ({ ...s, ...snap }));
      setOrigen(o => {
        const out = { ...o, generadoEn: new Date().toISOString() };
        for (const k of d.regenerar as BloqueIA[]) out[k] = "IA";
        return out;
      });
      const ins = d.insumo as { subAreas: number; plantillas: number; tareasTitular: number };
      toast.success(`Borrador listo · ${ins.subAreas} sub-área(s), ${ins.plantillas} plantilla(s), ${ins.tareasTitular} tarea(s)`);
    } catch {
      setSaveError("Error de conexión al generar");
    } finally {
      setGenerando(null);
    }
  }

  function validar(): string | null {
    if (!form.nombre) return "El nombre del puesto es requerido";
    if (form.reportaAId && editing && generaCiclo(editing.id, form.reportaAId, reportaDe)) {
      return "La relación de reporte genera un ciclo (A reporta a B y B a A).";
    }
    const kpisValidos = kpis.filter(k => k.esFijoPlan || k.nombre.trim());
    if (kpisValidos.length < 3) return "Define al menos 3 resultados clave (incluyendo Cumplimiento del plan).";
    if (kpisValidos.length > 5) return "Máximo 5 resultados clave por puesto.";
    for (const k of kpis) {
      if (!k.esFijoPlan && k.nombre.trim() && !k.resultadoEsperado.trim())
        return `El resultado "${k.nombre}" necesita el resultado esperado del puesto.`;
    }
    return null;
  }

  // Compara cada bloque contra lo que devolvió la IA: lo que ya no coincide
  // se degrada a IA_EDITADO para que el refresh no lo vuelva a pisar.
  function origenFinal(): OrigenIA {
    const actual: Record<BloqueIA, string> = {
      misionPuesto: form.misionPuesto,
      responsabilidades: form.responsabilidades,
      estandares: JSON.stringify(estandares),
      reportes: JSON.stringify(reportes),
      kpis: JSON.stringify(kpis),
      perfil: JSON.stringify({ aptitudes, conocimientos }),
    };
    const out: OrigenIA = { ...origen };
    for (const b of Object.keys(actual) as BloqueIA[]) {
      if (out[b] !== "IA") continue;
      const snap = iaSnapshot[b];
      if (snap !== undefined && snap !== actual[b]) out[b] = "IA_EDITADO";
    }
    return out;
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
      // La capacitación obligatoria del área se guarda siempre; lo extra se suma encima.
      const capFinal: CapAsignacion[] = [...capObligatoria];
      for (const e of capExtra) {
        const i = capFinal.findIndex(a => a.categoriaId === e.categoriaId && (a.subArea ?? null) === (e.subArea ?? null));
        if (i >= 0) capFinal[i] = { ...capFinal[i], nivel: nivelMax(capFinal[i].nivel, e.nivel) };
        else capFinal.push(e);
      }
      const body = {
        nombre: form.nombre, area: form.area,
        subAreaIds,
        misionPuesto: form.misionPuesto || null,
        responsabilidades: toArr(form.responsabilidades),
        reportaAId: form.reportaAId || null,
        coordinaConData: coordina.filter(c => c.puestoId),
        estandares: estandares.filter(e => e.subarea || e.responsabilidad || e.estandar),
        reportes: reportes.filter(r => r.nombre.trim()),
        valores: valores.filter(v => v.nombre),
        aptitudes: aptitudes.filter(a => a.nombre.trim()),
        conocimientos: conocimientos.filter(c => c.nombre.trim()),
        prestaciones: prestacionesFinal,
        prestacionesOtro: form.prestacionesOtro || null,
        tipoContrato: form.tipoContrato || null,
        modalidad: form.modalidad || null,
        jornada: jornada,
        kpis: kpis.filter(k => k.esFijoPlan || k.nombre.trim()),
        ocupantesIds,
        onboardingModulos: onbModulos,
        capacitacionAsignaciones: capFinal,
        origenIA: origenFinal(),
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
      downloadPdf(`/api/rrhh/documentos-laborales/${d.doc.id}/pdf`, `Acuerdo-${personalId.slice(0, 8)}.pdf`, "Acuerdo laboral");
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

  const horasSem = horasSemanales(jornada);
  const esHibrido = form.modalidad === "Híbrido";
  const colorPuesto = areaColor(form.area);

  // Opciones de "Coordina con": excluye el propio, el superior y los subordinados.
  const excluidosCoordina = new Set<string>([
    ...(editing ? [editing.id] : []),
    ...(form.reportaAId ? [form.reportaAId] : []),
    ...supervisaDerivado.map(s => s.id),
  ]);
  const opcionesCoordina = puestos.filter(p => !excluidosCoordina.has(p.id));

  function Detalle({ p }: { p: Puesto }) {
    const resp = parseArr(p.responsabilidades);
    const crit = jparse<CriterioCalidad[]>(p.estandares, []);
    const reps = jparse<ReportePuesto[]>(p.reportes, []);
    const org = jparse<OrigenIA>(p.origenIA, {});
    const { hechos, total, faltan } = completitud(p);
    const jor = jparse<JornadaDia[]>(p.jornada, []);
    return (
      <div className="mt-4 space-y-3 border-t border-[#1a1a1a] pt-4" onClick={e => e.stopPropagation()}>
        <div>
          <div className="flex items-center justify-between text-[10px] text-gray-600 uppercase tracking-wider mb-1">
            <span>Registro del puesto</span><span>{hechos}/{total}</span>
          </div>
          <div className="h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(hechos / total) * 100}%`, background: areaColor(normArea(p.area)) }} />
          </div>
          {faltan.length > 0 && <p className="text-[11px] text-gray-600 mt-1">Falta: {faltan.join(", ")}</p>}
        </div>
        {(p.subAreas?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Sub-áreas</p>
            <div className="flex flex-wrap gap-1.5">
              {p.subAreas!.map(s => (
                <span key={s.subAreaId} className="text-[11px] px-2 py-0.5 rounded-full border"
                  style={{ color: areaColor(normArea(p.area)), borderColor: `${areaColor(normArea(p.area))}55` }}>
                  {s.subArea.nombre}{s.principal ? " · principal" : ""}
                </span>
              ))}
            </div>
          </div>
        )}
        {p.misionPuesto && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">Misión del puesto <SelloIA origen={org} bloque="misionPuesto" /></p>
            <p className="text-xs text-gray-300">{p.misionPuesto}</p>
          </div>
        )}
        {resp.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">Responsabilidades permanentes <SelloIA origen={org} bloque="responsabilidades" /></p>
            <ul className="list-disc list-inside space-y-0.5">{resp.map((r, i) => <li key={i} className="text-xs text-gray-300">{r}</li>)}</ul>
          </div>
        )}
        {(p.kpis?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">Resultados clave <SelloIA origen={org} bloque="kpis" /></p>
            <div className="space-y-1">{p.kpis!.map((k, i) => (
              <div key={i} className="text-xs text-gray-300 bg-[#0d0d0d] rounded px-2 py-1 flex items-center justify-between gap-2">
                <span className="truncate">{k.nombre}</span>
                <span className="text-[#B3985B] shrink-0">{k.meta}{k.unidad === "%" ? "" : ` ${k.unidad}`}</span>
              </div>))}
            </div>
          </div>
        )}
        {crit.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">Criterios de calidad <SelloIA origen={org} bloque="estandares" /></p>
            <div className="space-y-1">{crit.map((e, i) => (
              <div key={i} className="text-xs text-gray-300 bg-[#0d0d0d] rounded px-2 py-1">
                {e.noNegociable && <span className="text-red-400 mr-1" title="No negociable">●</span>}
                {e.subarea && <span className="text-[#B3985B]">{e.subarea}: </span>}
                {e.responsabilidad} {e.estandar && <span className="text-gray-500">→ {e.estandar}</span>}
              </div>))}
            </div>
          </div>
        )}
        {reps.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">Reportes a {p.reportaA?.nombre ?? "su jefe"} <SelloIA origen={org} bloque="reportes" /></p>
            <ul className="space-y-0.5">{reps.map((r, i) => <li key={i} className="text-xs text-gray-300">• {r.nombre} <span className="text-gray-600">({r.frecuencia}{r.formato ? ` · ${r.formato}` : ""})</span></li>)}</ul>
          </div>
        )}
        {(p.tipoContrato || p.modalidad || jor.length > 0) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {p.tipoContrato && <span>Contrato: <span className="text-gray-300">{p.tipoContrato}</span></span>}
            {p.modalidad && <span>Modalidad: <span className="text-gray-300">{p.modalidad}</span></span>}
            {jor.length > 0 && <span>Jornada: <span className="text-gray-300">{jornadaToString(jor)}</span></span>}
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
    const { hechos, total } = completitud(p);
    return (
      <div className="border-b border-[#161616] last:border-0">
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#0f0f0f] transition-colors" onClick={() => setSelected(isOpen ? null : p)}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: areaColor(normArea(p.area)) }} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
            {p.reportaA && <p className="text-[11px] text-gray-600 truncate">Reporta a: {p.reportaA.nombre}</p>}
          </div>
          <span className={`text-[11px] shrink-0 ${hechos === total ? "text-green-400" : "text-gray-600"}`}>{hechos}/{total}</span>
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
          <p className="ms-subtitle">Fuente única de verdad: misión, responsabilidades, resultados clave, perfil y titular por puesto</p>
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
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: areaColor(normArea(p.area)) }} />
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
            <div className="sticky top-0 bg-[#111] border-b border-[#222] px-6 py-4 flex items-center justify-between gap-3 z-10">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorPuesto }} />
                {editing ? "Editar puesto" : "Nuevo puesto"}
                {editing?.version ? <span className="text-gray-600 text-xs font-normal">v{editing.version}</span> : null}
              </h2>
              <div className="flex items-center gap-2">
                {editing && (
                  <>
                    <button onClick={() => generar("refresh")} disabled={!!generando}
                      title="Vuelve a escribir solo lo que generó la IA y no has tocado"
                      className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-[#222] text-gray-400 hover:text-white hover:border-[#333] transition-colors disabled:opacity-50">
                      <RefreshCw className={`w-3 h-3 ${generando === "refresh" ? "animate-spin" : ""}`} /> Refrescar
                    </button>
                    <button onClick={() => generar("completo")} disabled={!!generando}
                      title="Genera todo el contenido desde el área, las sub-áreas y el plan de trabajo"
                      className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-violet-500/40 text-violet-300 hover:bg-violet-500/10 transition-colors disabled:opacity-50">
                      <Sparkles className="w-3 h-3" /> {generando === "completo" ? "Generando…" : "Generar con IA"}
                    </button>
                  </>
                )}
                <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 1 — Identidad y lugar en la organización */}
              <div>
                <p className={sectionCls}>Identidad</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelCls}>Nombre del puesto *</label>
                    <input {...f("nombre")} className={inputCls} placeholder="Ej: Coordinador de Producción" />
                  </div>
                  <div>
                    <label className={labelCls}>Área *</label>
                    <Combobox value={form.area} onChange={v => setForm(p => ({ ...p, area: v }))} options={AREAS.map(a => ({ value: a, label: areaLabel(a) }))} className={inputCls} />
                  </div>
                </div>

                <div className="mt-3">
                  <label className={labelCls}>Sub-áreas que abarca (la primera es la principal)</label>
                  <div className="flex flex-wrap gap-1.5 mb-2 min-h-[26px]">
                    {subAreaIds.length === 0 && <span className="text-gray-700 text-xs">Sin sub-áreas. Elige al menos una: de ahí salen las responsabilidades y un resultado clave por sub-área.</span>}
                    {subAreaIds.map((id, i) => {
                      const s = subAreaById.get(id);
                      const col = areaColor(s?.area ?? form.area);
                      return (
                        <span key={id} className="text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1"
                          style={{ color: col, borderColor: `${col}55`, background: `${col}14` }}>
                          {s?.nombre ?? "(sub-área eliminada)"}
                          {i === 0 && <span className="opacity-60">· principal</span>}
                          {s && s.area !== form.area && <span className="opacity-60">· {areaLabel(s.area)}</span>}
                          <button onClick={() => setSubAreaIds(a => a.filter(x => x !== id))} className="opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
                        </span>
                      );
                    })}
                  </div>
                  <Combobox value="" onChange={v => { if (v && !subAreaIds.includes(v)) setSubAreaIds(a => [...a, v]); }}
                    options={[
                      { value: "", label: "+ Agregar sub-área…" },
                      ...subAreaOpts.filter(s => !subAreaIds.includes(s.id))
                        .map(s => ({ value: s.id, label: s.area === form.area ? s.nombre : `${s.nombre} — ${areaLabel(s.area)}` })),
                    ]} className={inputCls} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className={labelCls}>Reporta a (define el organigrama)</label>
                    <Combobox value={form.reportaAId} onChange={v => setForm(p => ({ ...p, reportaAId: v }))}
                      options={[{ value: "", label: "— Ninguno (nivel más alto) —" }, ...puestos.filter(x => x.id !== editing?.id).map(x => ({ value: x.id, label: x.nombre }))]} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Supervisa a (derivado)</label>
                    <div className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2 min-h-[38px] flex flex-wrap gap-1.5">
                      {supervisaDerivado.length === 0 ? <span className="text-gray-700 text-xs">Ningún puesto reporta a este.</span> :
                        supervisaDerivado.map(s => <span key={s.id} className="text-[11px] bg-[#1a1a1a] text-gray-300 px-2 py-0.5 rounded-full">{s.nombre}</span>)}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <label className={labelCls}>Objetivo del área (del maestro de Áreas)</label>
                  <div className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-gray-400 text-sm rounded-lg px-3 py-2 min-h-[38px]">
                    {objetivoPorArea[form.area] || <span className="text-gray-700">Define el objetivo en Organización → Áreas.</span>}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className={`${labelCls} !mb-0`}>Coordina con</label>
                    <Combobox value="" onChange={v => { if (v && !coordina.some(c => c.puestoId === v)) setCoordina(c => [...c, { puestoId: v, nota: "" }]); }}
                      options={[{ value: "", label: "+ Agregar puesto…" }, ...opcionesCoordina.filter(p => !coordina.some(c => c.puestoId === p.id)).map(p => ({ value: p.id, label: p.nombre }))]}
                      className="text-xs bg-[#0d0d0d] border border-[#222] rounded px-2 py-1" />
                  </div>
                  <div className="space-y-2">
                    {coordina.length === 0 && <p className="text-gray-700 text-xs">Sin coordinaciones.</p>}
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

              {/* 2 — Misión */}
              <div>
                <p className={`${sectionCls} flex items-center gap-2`}>Misión del puesto <SelloIA origen={origen} bloque="misionPuesto" /></p>
                <textarea {...f("misionPuesto")} rows={2} className={`${inputCls} resize-none`} placeholder="Para qué existe este puesto: su contribución concreta a la operación." />
              </div>

              {/* 3 — Responsabilidades */}
              <div>
                <p className={`${sectionCls} flex items-center gap-2`}>Responsabilidades permanentes (una por línea) <SelloIA origen={origen} bloque="responsabilidades" /></p>
                <textarea {...f("responsabilidades")} rows={5} className={`${inputCls} resize-none font-mono text-xs`}
                  placeholder={"Lo que SIEMPRE es responsable, sin importar el plan de trabajo\nEj:\nEntregar cada evento montado a tiempo"} />
              </div>

              {/* 4 — Resultados clave */}
              <div>
                <p className={`${sectionCls} flex items-center gap-2`}>Resultados clave (3 a 5) <SelloIA origen={origen} bloque="kpis" /></p>
                <p className="text-[11px] text-gray-600 mb-2 -mt-2">Con esto se califica el desempeño. Idealmente uno por sub-área: el objetivo del área se arma con los resultados de sus sub-áreas.</p>
                <div className="space-y-3">
                  {kpis.map((k, i) => (
                    <div key={i} className={`rounded-lg p-3 space-y-2 border ${k.esFijoPlan ? "bg-[#0d0d0d] border-[#B3985B]/30" : "bg-[#0d0d0d] border-[#1a1a1a]"}`}>
                      <div className="flex items-center gap-2">
                        {k.esFijoPlan ? (
                          <span className="text-sm text-[#B3985B] font-medium flex-1">{KPI_PLAN_NOMBRE} <span className="text-[10px] text-gray-500">· automático · mensual</span></span>
                        ) : (
                          <input value={k.nombre} onChange={e => setKpis(a => a.map((x, ix) => ix === i ? { ...x, nombre: e.target.value } : x))} className={`${inputCls} flex-1`} placeholder="Nombre del resultado clave" />
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
                    className="mt-2 text-xs text-gray-500 hover:text-[#B3985B] flex items-center gap-1"><Plus className="w-3 h-3" /> Agregar resultado clave</button>
                )}
              </div>

              {/* 5 — Criterios de calidad */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className={`${sectionCls} mb-0 flex items-center gap-2`}>Criterios de calidad <SelloIA origen={origen} bloque="estandares" /></p>
                  <button onClick={() => setEstandares(e => [...e, { subarea: subAreaById.get(subAreaIds[0])?.nombre ?? "", responsabilidad:"", estandar:"", noNegociable: false }])} className="text-xs text-gray-500 hover:text-[#B3985B] flex items-center gap-1"><Plus className="w-3 h-3" /> Agregar</button>
                </div>
                <p className="text-[11px] text-gray-600 mb-2">Cómo se verifica que una responsabilidad está bien cumplida. Marca <span className="text-red-400">no negociable</span> los que, de fallar, topan la evaluación del mes en “En desarrollo”.</p>
                <div className="space-y-2">
                  {estandares.map((e, i) => {
                    const adv = adverbioVago(e.estandar);
                    return (
                      <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-2 space-y-2">
                        <div className="grid grid-cols-12 gap-2 items-start">
                          <input value={e.subarea} onChange={ev => setEstandares(arr => arr.map((x,ix)=>ix===i?{...x,subarea:ev.target.value}:x))} className={`${inputCls} col-span-3`} placeholder="Sub-área" />
                          <input value={e.responsabilidad} onChange={ev => setEstandares(arr => arr.map((x,ix)=>ix===i?{...x,responsabilidad:ev.target.value}:x))} className={`${inputCls} col-span-4`} placeholder="Responsabilidad" />
                          <input value={e.estandar} onChange={ev => setEstandares(arr => arr.map((x,ix)=>ix===i?{...x,estandar:ev.target.value}:x))} className={`${inputCls} col-span-4`} placeholder="Cómo se verifica (medible)" />
                          <button onClick={() => setEstandares(arr => arr.filter((_,ix)=>ix!==i))} className="col-span-1 text-gray-600 hover:text-red-400 text-lg leading-none pt-1">×</button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
                            <input type="checkbox" checked={!!e.noNegociable} className="accent-red-500"
                              onChange={ev => setEstandares(arr => arr.map((x,ix)=>ix===i?{...x,noNegociable:ev.target.checked}:x))} />
                            No negociable
                          </label>
                          {adv && <p className="text-[11px] text-orange-400/90 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Evita “{adv}”: dilo de forma verificable.</p>}
                        </div>
                      </div>
                    );
                  })}
                  {estandares.length === 0 && <p className="text-gray-700 text-xs">Sin criterios de calidad.</p>}
                </div>
              </div>

              {/* 6 — Reportes al jefe */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className={`${sectionCls} mb-0 flex items-center gap-2`}>
                    Reportes a {puestos.find(p => p.id === form.reportaAId)?.nombre ?? "su jefe"}
                    <SelloIA origen={origen} bloque="reportes" />
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setReportes(REPORTES_BASE.map(r => ({ ...r })))} className="text-xs text-gray-600 hover:text-gray-300">Restaurar base</button>
                    <button onClick={() => setReportes(r => [...r, { nombre: "", frecuencia: "semanal", formato: "" }])} className="text-xs text-gray-500 hover:text-[#B3985B] flex items-center gap-1"><Plus className="w-3 h-3" /> Agregar</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {reportes.map((r, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start">
                      <input value={r.nombre} onChange={ev => setReportes(a => a.map((x,ix)=>ix===i?{...x,nombre:ev.target.value}:x))} className={`${inputCls} col-span-6`} placeholder="Qué reporta" />
                      <select value={r.frecuencia} onChange={ev => setReportes(a => a.map((x,ix)=>ix===i?{...x,frecuencia:ev.target.value as ReportePuesto["frecuencia"]}:x))} className={`${inputCls} col-span-2`}>
                        {FRECUENCIAS_ESTANDAR.map(fr => <option key={fr.value} value={fr.value}>{fr.label}</option>)}
                      </select>
                      <input value={r.formato ?? ""} onChange={ev => setReportes(a => a.map((x,ix)=>ix===i?{...x,formato:ev.target.value}:x))} className={`${inputCls} col-span-3`} placeholder="Dónde / cómo" />
                      <button onClick={() => setReportes(a => a.filter((_,ix)=>ix!==i))} className="col-span-1 text-gray-600 hover:text-red-400 text-lg leading-none pt-1">×</button>
                    </div>
                  ))}
                  {reportes.length === 0 && <p className="text-gray-700 text-xs">Sin reportes definidos.</p>}
                </div>
              </div>

              {/* 7 — Perfil requerido */}
              <div>
                <p className={`${sectionCls} flex items-center gap-2`}>Perfil requerido <SelloIA origen={origen} bloque="perfil" /></p>
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2.5 mb-4">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{ADN_MAINSTAGE.titulo} · aplica a todos</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{ADN_MAINSTAGE.texto}</p>
                </div>

                <label className={labelCls}>Valores de la empresa — precisa cómo se ven en este puesto</label>
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

                <label className={labelCls}>Aptitudes y habilidades</label>
                <TagNivelEditor items={aptitudes} setItems={setAptitudes} catalogo={catalogos.aptitudes.map(a => a.nombre)}
                  onCreate={n => crearCatalogo("aptitud", n)} conIndispensable={false} inputCls={inputCls} />
                <label className={labelCls + " mt-4"}>Conocimientos</label>
                <TagNivelEditor items={conocimientos} setItems={setConocimientos as never} catalogo={catalogos.conocimientos.map(c => c.nombre)}
                  onCreate={n => crearCatalogo("conocimiento", n)} conIndispensable inputCls={inputCls} />
              </div>

              {/* 8 — Condiciones laborales */}
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

              {/* 9 — Onboarding */}
              <div>
                <p className={sectionCls}>Onboarding del puesto</p>
                <p className="text-[11px] text-gray-500 mb-3 -mt-1">
                  El recorrido de integración es fijo. Aquí solo eliges los módulos que revisa — y ya filtrados a {areasDelPuesto.map(a => areaLabel(a)).join(" · ")}.
                </p>

                <label className={labelCls}>Módulos de la plataforma a revisar</label>
                <div className="space-y-2 mb-4">
                  {modulosPermitidos.length === 0 && <p className="text-gray-700 text-xs">No hay módulos preconfigurados para esta área.</p>}
                  {modulosPermitidos.map(sec => (
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

                <label className={labelCls}>Capacitación del puesto</label>
                <p className="text-[11px] text-gray-500 mb-2 -mt-1">
                  Toda la capacitación del área es obligatoria, para que quien ocupe el puesto entienda la operación completa. Se asigna sola.
                </p>
                {capObligatoria.length === 0 ? (
                  <p className="text-gray-700 text-xs">No hay áreas de capacitación registradas para {areasDelPuesto.map(a => areaLabel(a)).join(", ")}.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {capObligatoria.map(a => (
                      <span key={a.categoriaId} className="text-[11px] px-2 py-0.5 rounded-full border border-[#B3985B]/40 bg-[#B3985B]/15 text-[#B3985B]">
                        {categoriasCap.find(c => c.id === a.categoriaId)?.nombre ?? "Área"} · obligatorio
                      </span>
                    ))}
                  </div>
                )}
                {categoriasCap.length > 0 && (
                  <div className="mt-3">
                    <label className={labelCls}>Capacitación adicional recomendada (opcional)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {categoriasCap
                        .filter(c => !capObligatoria.some(o => o.categoriaId === c.id))
                        .map(c => {
                          const on = capExtra.some(e => e.categoriaId === c.id && e.subArea === null);
                          return (
                            <button key={c.id} type="button"
                              onClick={() => setCapAsignaciones(prev => on
                                ? prev.filter(x => !(x.categoriaId === c.id && x.subArea === null))
                                : [...prev, { categoriaId: c.id, subArea: null, nivel: "RECOMENDADO" as NivelCapacitacion }])}
                              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${on ? "bg-sky-500/15 text-sky-300 border-sky-500/40" : "border-[#222] text-gray-500 hover:text-white"}`}>
                              {c.nombre}
                            </button>
                          );
                        })}
                    </div>
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
