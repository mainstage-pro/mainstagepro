"use client";
import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";

interface Puesto {
  id: string; titulo: string; area: string; descripcion?: string | null;
  objetivoRol?: string | null; salarioMin?: number | null; salarioMax?: number | null;
  tipoContrato?: string | null; modalidad?: string | null; horario?: string | null;
  prestaciones?: string | null;
  habilidadesTecnicas?: string | null; habilidadesBlandas?: string | null;
  conocimientos?: string | null; aptitudes?: string | null; valores?: string | null;
}
interface Postulacion {
  id: string; etapa: string; puestoManual?: string | null; areaManual?: string | null;
  salarioPropuesto?: number | null; fechaIngresoEstimada?: string | null;
  beneficios?: string | null; observaciones?: string | null;
  propuestaFechaEnvio?: string | null; propuestaAceptada?: boolean | null;
  propuestaToken?: string | null;
  contratoGenerado: boolean; contratoFecha?: string | null;
  personalInternoId?: string | null; notasEvaluacion?: string | null;
  puntajeTotal?: number | null;
  onboardingData?: string | null;
  puesto?: Puesto | null;
}

interface OnboardingItem { id: string; label: string; done: boolean; fecha?: string | null }
interface Candidato {
  id: string; nombre: string; correo?: string | null; telefono?: string | null;
  ciudad?: string | null; edad?: number | null; nivelEstudios?: string | null; carrera?: string | null;
  experienciaEventos?: string | null; aniosExperienciaEventos?: number | null;
  eventoDestacado?: string | null; situacionResuelta?: string | null;
  comoResolveria?: string | null; motivacion?: string | null;
  visionLargoPlazo?: string | null; disposicionHorario?: boolean | null;
  disposicionFines?: boolean | null; salarioEsperado?: number | null;
  habilidades?: string | null; experienciaPrevia?: string | null;
  linkedin?: string | null; portfolio?: string | null; notas?: string | null;
  postulaciones: Postulacion[];
}

const ETAPAS = ["NUEVO","EVALUACION","PROPUESTA_ENVIADA","APROBADO","CONTRATADO","RECHAZADO"];
const ETAPA_LABELS: Record<string,string> = {
  NUEVO:"Nuevo", EVALUACION:"Evaluación", PROPUESTA_ENVIADA:"Propuesta enviada",
  APROBADO:"Aprobado", CONTRATADO:"Contratado", RECHAZADO:"Rechazado",
};
const ETAPA_COLORS: Record<string,string> = {
  NUEVO:"bg-gray-800 text-gray-300", EVALUACION:"bg-blue-900/40 text-blue-300",
  PROPUESTA_ENVIADA:"bg-yellow-900/30 text-yellow-300", APROBADO:"bg-green-900/30 text-green-300",
  CONTRATADO:"bg-[#B3985B]/20 text-[#B3985B]", RECHAZADO:"bg-red-900/30 text-red-300",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n);
}
function fmtDate(s?: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CandidatoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const confirm = useConfirm();
  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [tab, setTab] = useState<"perfil"|"discovery"|"propuesta"|"contrato"|"onboarding">("perfil");
  const [propuestaLink, setPropuestaLink] = useState<string | null>(null);
  const [generandoLink, setGenerandoLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const editLoaded = useRef(false);
  const propEditLoaded = useRef(false);
  const editTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const propTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edición inline candidato
  const [edit, setEdit] = useState<Partial<Candidato>>({});
  // Propuesta fields
  const [propEdit, setPropEdit] = useState({
    salarioPropuesto:"", fechaIngresoEstimada:"", beneficios:"", observaciones:"", notasEvaluacion:"",
  });

  async function load() {
    const r = await fetch(`/api/rrhh/candidatos/${id}`, { cache: "no-store" });
    const d = await r.json();
    if (d.candidato) {
      setCandidato(d.candidato);
      const p = d.candidato.postulaciones[0];
      if (p) {
        let bens: string[] = [];
        try { bens = JSON.parse(p.beneficios ?? "[]"); } catch { bens = []; }
        setPropEdit({
          salarioPropuesto: p.salarioPropuesto?.toString() ?? "",
          fechaIngresoEstimada: p.fechaIngresoEstimada ? p.fechaIngresoEstimada.slice(0,10) : "",
          beneficios: bens.join("\n"),
          observaciones: p.observaciones ?? "",
          notasEvaluacion: p.notasEvaluacion ?? "",
        });
      }
    }
    setLoading(false);
    setTimeout(() => { propEditLoaded.current = true; editLoaded.current = true; }, 200);
  }
  useEffect(() => { load(); }, [id]);

  // Auto-save edit (perfil del candidato)
  useEffect(() => {
    if (!editLoaded.current || Object.keys(edit).length === 0) return;
    if (editTimer.current) clearTimeout(editTimer.current);
    editTimer.current = setTimeout(async () => {
      await fetch(`/api/rrhh/candidatos/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(edit) });
      setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000);
    }, 1200);
  }, [edit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save propuesta
  useEffect(() => {
    if (!propEditLoaded.current) return;
    const post = candidato?.postulaciones[0];
    if (!post) return;
    if (propTimer.current) clearTimeout(propTimer.current);
    propTimer.current = setTimeout(async () => {
      const bens = propEdit.beneficios.split(/[\n,]/).map(x=>x.trim()).filter(Boolean);
      await fetch(`/api/rrhh/candidatos/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ postulacionId: post.id, salarioPropuesto: propEdit.salarioPropuesto ? parseFloat(propEdit.salarioPropuesto) : null, fechaIngresoEstimada: propEdit.fechaIngresoEstimada || null, beneficios: bens, observaciones: propEdit.observaciones || null, notasEvaluacion: propEdit.notasEvaluacion || null }),
      });
      setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000);
    }, 1200);
  }, [propEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveCandidato() {
    if (editTimer.current) clearTimeout(editTimer.current);
    setSaving(true);
    const res = await fetch(`/api/rrhh/candidatos/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(edit) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    await load(); setEdit({}); editLoaded.current = false; setSaving(false);
  }

  async function savePropuesta() {
    if (propTimer.current) clearTimeout(propTimer.current);
    setSaving(true);
    const post = candidato?.postulaciones[0];
    if (!post) { setSaving(false); return; }
    const bens = propEdit.beneficios.split(/[\n,]/).map(x=>x.trim()).filter(Boolean);
    const res = await fetch(`/api/rrhh/candidatos/${id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ postulacionId: post.id, salarioPropuesto: propEdit.salarioPropuesto ? parseFloat(propEdit.salarioPropuesto) : null, fechaIngresoEstimada: propEdit.fechaIngresoEstimada || null, beneficios: bens, observaciones: propEdit.observaciones || null, notasEvaluacion: propEdit.notasEvaluacion || null }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    await load(); setSaving(false);
  }

  async function cambiarEtapa(etapa: string) {
    const post = candidato?.postulaciones[0];
    if (!post) return;
    const res = await fetch(`/api/rrhh/candidatos/${id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ postulacionId: post.id, etapa }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      return;
    }
    await load();
  }

  async function contratar() {
    const post = candidato?.postulaciones[0];
    if (!post) return;
    if (!await confirm({ message: `¿Confirmar contratación de ${candidato?.nombre}? Se creará su expediente en Personal.`, confirmText: "Contratar", danger: false })) return;
    setSaving(true);
    const res = await fetch(`/api/rrhh/candidatos/${id}/contratar`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ postulacionId: post.id }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    toast.success("Candidato contratado — expediente creado en Personal");
    await load(); setSaving(false);
  }

  async function generarLinkPropuesta() {
    const post = candidato?.postulaciones[0];
    if (!post) return;
    if (post.propuestaToken) {
      const link = `${window.location.origin}/propuesta/candidato/${post.propuestaToken}`;
      setPropuestaLink(link);
      return;
    }
    setGenerandoLink(true);
    try {
      const res = await fetch(`/api/rrhh/candidatos/${id}/propuesta-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postulacionId: post.id }),
      });
      const d = await res.json();
      if (d.token) {
        const link = `${window.location.origin}/propuesta/candidato/${d.token}`;
        setPropuestaLink(link);
        await load();
      }
    } finally {
      setGenerandoLink(false);
    }
  }

  async function copiarLink() {
    if (!propuestaLink) return;
    await navigator.clipboard.writeText(propuestaLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function buildWAPresentation() {
    if (!candidato) return "";
    const tel = candidato.telefono?.replace(/\D/g,"") ?? "";
    const num = tel.startsWith("52") ? tel : `52${tel}`;
    const nombre = candidato.nombre.split(" ")[0];
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://mainstagepro.vercel.app"}/presentacion/equipo`;
    const msg = `Hola ${nombre} 👋\n\nAntes de enviarte una propuesta formal, queremos que conozcas quiénes somos y lo que hacemos en Mainstage Pro.\n\nTe compartimos esta presentación para que tengas un panorama completo de nuestro equipo, nuestros proyectos y lo que significa ser parte de nosotros:\n\n${url}\n\n¡Esperamos que te entusiasme lo que ves! 🎯`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }

  function buildWA() {
    if (!candidato) return "";
    const tel = candidato.telefono?.replace(/\D/g,"") ?? "";
    const num = tel.startsWith("52") ? tel : `52${tel}`;
    const post = candidato.postulaciones[0];
    const puesto = post?.puesto?.titulo ?? post?.puestoManual ?? "el puesto";
    const msg = `Hola ${candidato.nombre.split(" ")[0]}, te contactamos de Mainstage Producciones 👋\n\nQueremos compartirte una propuesta formal de colaboración para el puesto de *${puesto}*.\n\nPor favor confírmanos tu disponibilidad para revisarla. ¡Creemos que puedes ser una excelente adición a nuestro equipo! 🎯`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!candidato) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><p className="text-red-400">No encontrado</p></div>
  );

  const post = candidato.postulaciones[0];
  const etapa = post?.etapa ?? "NUEVO";
  const inputCls = "w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] placeholder-gray-600";
  const lbl = "block text-xs text-gray-500 mb-1";

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/rrhh/candidatos" className="text-gray-600 hover:text-white text-sm transition-colors">← Candidatos</Link>
            <span className="text-[#333]">|</span>
            <h1 className="text-xl font-semibold text-white">{candidato.nombre}</h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ETAPA_COLORS[etapa]}`}>
              {ETAPA_LABELS[etapa]}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {[post?.puesto?.titulo ?? post?.puestoManual, candidato.ciudad].filter(Boolean).join(" · ")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {candidato.telefono && (
            <a href={buildWA()} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-green-800/50 text-green-400 hover:bg-green-900/20 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              📲 WhatsApp
            </a>
          )}
          {post && etapa !== "CONTRATADO" && etapa !== "RECHAZADO" && (
            <a href={`/api/rrhh/candidatos/${id}/propuesta?postulacionId=${post.id}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              📄 Propuesta PDF
            </a>
          )}
          {(etapa === "APROBADO" || etapa === "CONTRATADO") && post && (
            <a href={`/api/rrhh/candidatos/${id}/contrato?postulacionId=${post.id}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              📋 Contrato PDF
            </a>
          )}
          {etapa === "APROBADO" && !post?.contratoGenerado && (
            <button onClick={contratar} disabled={saving}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-xs px-4 py-1.5 rounded-lg transition-colors">
              ✓ Contratar
            </button>
          )}
        </div>
      </div>

      {/* Pipeline steps */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
        <div className="flex gap-2 flex-wrap">
          {ETAPAS.map((e, i) => {
            const isCurrent = etapa === e;
            const isPast = ETAPAS.indexOf(etapa) > i;
            return (
              <button key={e} onClick={() => cambiarEtapa(e)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                  isCurrent ? ETAPA_COLORS[e] + " border-transparent" :
                  isPast ? "border-[#2a2a2a] text-gray-600 line-through" :
                  "border-[#222] text-gray-600 hover:text-white"
                }`}>
                {isPast ? "✓" : (i+1)+"."} {ETAPA_LABELS[e]}
              </button>
            );
          })}
        </div>
        {post?.contratoGenerado && post.personalInternoId && (
          <div className="mt-3 text-xs text-[#B3985B]">
            ✓ Registrado en Personal — <Link href={`/rrhh/personal/${post.personalInternoId}`} className="underline">Ver expediente →</Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1a1a1a] flex-wrap">
        {(["perfil","discovery","propuesta","contrato",...(etapa === "CONTRATADO" ? ["onboarding"] : [])] as const).map(t => (
          <button key={t} onClick={() => setTab(t as typeof tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? "border-[#B3985B] text-[#B3985B]" : "border-transparent text-gray-500 hover:text-white"
            }`}>
            {t === "perfil" ? "Perfil" : t === "discovery" ? "Descubrimiento" : t === "propuesta" ? "Propuesta" : t === "contrato" ? "Contrato" : "Onboarding"}
          </button>
        ))}
      </div>

      {/* ── TAB PERFIL ── */}
      {tab === "perfil" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Datos personales</p>
            {([
              ["nombre","Nombre completo","text"],
              ["correo","Correo","email"],
              ["telefono","Teléfono","text"],
              ["ciudad","Ciudad","text"],
              ["edad","Edad","number"],
              ["nivelEstudios","Nivel de estudios","text"],
              ["carrera","Carrera / Profesión","text"],
              ["linkedin","LinkedIn","url"],
              ["portfolio","Portfolio","url"],
            ] as [keyof Candidato, string, string][]).map(([field, label]) => (
              <div key={field as string}>
                <label className={lbl}>{label}</label>
                <input
                  defaultValue={(candidato[field] as string | number | null | undefined)?.toString() ?? ""}
                  onChange={e => setEdit(p => ({ ...p, [field]: e.target.value || null }))}
                  className={inputCls}
                  placeholder={label}
                />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Disponibilidad y compensación</p>
              <div>
                <label className={lbl}>Salario esperado mensual (MXN)</label>
                <input type="number"
                  defaultValue={candidato.salarioEsperado?.toString() ?? ""}
                  onChange={e => setEdit(p => ({ ...p, salarioEsperado: e.target.value ? parseFloat(e.target.value) : null }))}
                  className={inputCls} placeholder="12000" />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                    defaultChecked={candidato.disposicionHorario ?? false}
                    onChange={e => setEdit(p => ({ ...p, disposicionHorario: e.target.checked }))}
                    className="w-4 h-4 accent-[#B3985B]" />
                  <span className="text-sm text-gray-300">Disponible 9am–5pm L-V</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                    defaultChecked={candidato.disposicionFines ?? false}
                    onChange={e => setEdit(p => ({ ...p, disposicionFines: e.target.checked }))}
                    className="w-4 h-4 accent-[#B3985B]" />
                  <span className="text-sm text-gray-300">Disponible fines / noches</span>
                </label>
              </div>
            </div>

            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Habilidades y experiencia</p>
              <div>
                <label className={lbl}>Habilidades principales</label>
                <textarea defaultValue={candidato.habilidades ?? ""} rows={3}
                  onChange={e => setEdit(p => ({ ...p, habilidades: e.target.value || null }))}
                  className={`${inputCls} resize-none`} placeholder="Lista de habilidades relevantes" />
              </div>
              <div>
                <label className={lbl}>Experiencia previa (resumen)</label>
                <textarea defaultValue={candidato.experienciaPrevia ?? ""} rows={4}
                  onChange={e => setEdit(p => ({ ...p, experienciaPrevia: e.target.value || null }))}
                  className={`${inputCls} resize-none`} placeholder="Historial laboral resumido" />
              </div>
            </div>

            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
              <label className={lbl}>Notas internas</label>
              <textarea defaultValue={candidato.notas ?? ""} rows={3}
                onChange={e => setEdit(p => ({ ...p, notas: e.target.value || null }))}
                className={`${inputCls} resize-none`} placeholder="Observaciones del equipo de RRHH" />
            </div>

            {Object.keys(edit).length > 0 && (
              <button onClick={saveCandidato} disabled={saving}
                className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm py-2.5 rounded-lg transition-colors">
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── TAB DISCOVERY ── */}
      {tab === "discovery" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 space-y-1">
            <p className="text-xs text-[#B3985B] uppercase tracking-wider mb-3">Formulario de descubrimiento</p>
            <p className="text-xs text-gray-600">Completa las respuestas del candidato. Estas preguntas revelan aptitudes, compromiso y encaje cultural.</p>
          </div>

          {([
            ["experienciaEventos", "¿Cuál es tu experiencia en eventos? (Esta es fundamental para nosotros)", 4],
            ["aniosExperienciaEventos", "¿Cuántos años de experiencia en la industria de eventos?", 1],
            ["eventoDestacado", "¿Cuál es el evento más importante o complejo que has trabajado? Descríbelo.", 3],
            ["situacionResuelta", "Cuéntame una situación real difícil en un evento que hayas resuelto. ¿Qué pasó, qué hiciste y cuál fue el resultado?", 4],
            ["comoResolveria", "Durante un evento, un proveedor de audio falla 30 minutos antes del show. ¿Qué harías?", 3],
            ["motivacion", "¿Por qué quieres trabajar en Mainstage Producciones específicamente?", 3],
            ["visionLargoPlazo", "¿Dónde te ves en 3-5 años? ¿Cómo encaja Mainstage en ese plan?", 3],
          ] as [keyof Candidato, string, number][]).map(([field, pregunta, rows]) => (
            <div key={field as string} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
              <label className="block text-sm text-white mb-2">{pregunta}</label>
              {rows === 1 ? (
                <input
                  defaultValue={(candidato[field] as string | number | null)?.toString() ?? ""}
                  onChange={e => setEdit(p => ({ ...p, [field]: e.target.value || null }))}
                  className={inputCls} type="number" placeholder="Años de experiencia"
                />
              ) : (
                <textarea rows={rows}
                  defaultValue={(candidato[field] as string | null) ?? ""}
                  onChange={e => setEdit(p => ({ ...p, [field]: e.target.value || null }))}
                  className={`${inputCls} resize-none`}
                  placeholder="Respuesta del candidato..."
                />
              )}
            </div>
          ))}

          {Object.keys(edit).length > 0 && (
            <button onClick={saveCandidato} disabled={saving}
              className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm py-2.5 rounded-lg transition-colors">
              {saving ? "Guardando..." : "Guardar respuestas"}
            </button>
          )}
        </div>
      )}

      {/* ── TAB PROPUESTA ── */}
      {tab === "propuesta" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Condiciones de la oferta</p>
              <div>
                <label className={lbl}>Salario propuesto (MXN/mes)</label>
                <input type="number" value={propEdit.salarioPropuesto}
                  onChange={e => setPropEdit(p=>({...p,salarioPropuesto:e.target.value}))}
                  className={inputCls} placeholder="12000" />
              </div>
              <div>
                <label className={lbl}>Fecha estimada de ingreso</label>
                <input type="date" value={propEdit.fechaIngresoEstimada}
                  onChange={e => setPropEdit(p=>({...p,fechaIngresoEstimada:e.target.value}))}
                  className={inputCls} />
              </div>
              <div>
                <label className={lbl}>Beneficios adicionales (una por línea)</label>
                <textarea rows={4} value={propEdit.beneficios}
                  onChange={e => setPropEdit(p=>({...p,beneficios:e.target.value}))}
                  className={`${inputCls} resize-none font-mono text-xs`}
                  placeholder={"IMSS\nVacaciones según ley\nBono por evento"} />
              </div>
              <div>
                <label className={lbl}>Observaciones / mensaje personal</label>
                <textarea rows={3} value={propEdit.observaciones}
                  onChange={e => setPropEdit(p=>({...p,observaciones:e.target.value}))}
                  className={`${inputCls} resize-none`}
                  placeholder="Notas personalizadas para el candidato en la propuesta" />
              </div>
              <div>
                <label className={lbl}>Notas de evaluación (internas)</label>
                <textarea rows={3} value={propEdit.notasEvaluacion}
                  onChange={e => setPropEdit(p=>({...p,notasEvaluacion:e.target.value}))}
                  className={`${inputCls} resize-none`}
                  placeholder="Por qué este candidato encaja con el puesto y la empresa" />
              </div>
              <button onClick={savePropuesta} disabled={saving}
                className="w-full bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white text-sm font-medium py-2 rounded-lg transition-colors">
                {saving ? "Guardando..." : "Guardar oferta"}
              </button>
            </div>
          </div>

          {/* Acciones */}
          <div className="space-y-4">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Acciones</p>

              {/* Presentación de la empresa por WhatsApp */}
              {candidato.telefono && (
                <a href={buildWAPresentation()} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between bg-green-900/20 hover:bg-green-900/30 border border-green-800/30 rounded-lg px-4 py-3 transition-colors">
                  <span className="text-sm text-green-300">📲 Enviar presentación de Mainstage Pro</span>
                  <span className="text-xs text-green-700">→</span>
                </a>
              )}

              {/* Propuesta PDF + WA + Link candidato */}
              <div className="space-y-2">
                {post && (
                  <a href={`/api/rrhh/candidatos/${id}/propuesta?postulacionId=${post.id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between bg-[#0d0d0d] hover:bg-[#151515] border border-[#222] rounded-lg px-4 py-3 transition-colors">
                    <span className="text-sm text-white">📄 Descargar Propuesta PDF</span>
                    <span className="text-xs text-gray-600">→</span>
                  </a>
                )}
                {candidato.telefono && (
                  <a href={buildWA()} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between bg-green-900/20 hover:bg-green-900/30 border border-green-800/30 rounded-lg px-4 py-3 transition-colors">
                    <span className="text-sm text-green-300">📲 Enviar por WhatsApp</span>
                    <span className="text-xs text-green-700">→</span>
                  </a>
                )}
                {/* Link de aceptación para el candidato */}
                <div className="bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 space-y-2">
                  <p className="text-xs text-gray-500">🔗 Link de aceptación para el candidato</p>
                  {propuestaLink || post?.propuestaToken ? (
                    <div className="flex items-center gap-2">
                      <input readOnly
                        value={propuestaLink ?? `${typeof window !== "undefined" ? window.location.origin : ""}/propuesta/candidato/${post?.propuestaToken}`}
                        className="flex-1 bg-[#1a1a1a] border border-[#333] text-gray-400 text-xs rounded px-2 py-1 truncate" />
                      <button onClick={copiarLink}
                        className="text-xs bg-[#B3985B] text-black font-semibold px-3 py-1 rounded transition-colors hover:bg-[#c9a96a]">
                        {linkCopied ? "✓ Copiado" : "Copiar"}
                      </button>
                    </div>
                  ) : (
                    <button onClick={generarLinkPropuesta} disabled={generandoLink}
                      className="text-xs text-[#B3985B] hover:text-white border border-[#B3985B]/30 hover:border-[#B3985B] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      {generandoLink ? "Generando..." : "Generar link"}
                    </button>
                  )}
                  {post?.propuestaAceptada === true && <p className="text-green-400 text-xs font-semibold">✓ Propuesta aceptada por el candidato</p>}
                  {post?.propuestaAceptada === false && <p className="text-red-400 text-xs">✗ Propuesta declinada por el candidato</p>}
                </div>
              </div>

              {post?.propuestaFechaEnvio && (
                <p className="text-xs text-gray-600">Propuesta enviada: {fmtDate(post.propuestaFechaEnvio)}</p>
              )}

              {/* Mover etapa */}
              <div className="border-t border-[#1a1a1a] pt-3 mt-3">
                <p className="text-xs text-gray-600 mb-2">Mover a etapa:</p>
                <div className="flex flex-wrap gap-2">
                  {["APROBADO","RECHAZADO"].map(e => (
                    <button key={e} onClick={() => cambiarEtapa(e)}
                      disabled={etapa === e}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                        e === "APROBADO" ? "border-green-800 text-green-400 hover:bg-green-900/20" :
                        "border-red-900 text-red-400 hover:bg-red-900/20"
                      }`}>
                      {e === "APROBADO" ? "✓ Aprobar" : "✗ Rechazar"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Puesto vinculado */}
            {post?.puesto && (
              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Puesto vinculado</p>
                <p className="text-white font-medium">{post.puesto.titulo}</p>
                <p className="text-gray-500 text-xs">{post.puesto.area}</p>
                {post.puesto.salarioMin && post.puesto.salarioMax && (
                  <p className="text-[#B3985B] text-xs">{fmt(post.puesto.salarioMin)} – {fmt(post.puesto.salarioMax)}</p>
                )}
                {post.puesto.modalidad && <p className="text-gray-600 text-xs">{post.puesto.modalidad} · {post.puesto.tipoContrato}</p>}
                {post.puesto.horario && <p className="text-gray-600 text-xs">{post.puesto.horario}</p>}
              </div>
            )}

            {/* Comparativa salario */}
            {candidato.salarioEsperado && post?.puesto?.salarioMax && (
              <div className={`bg-[#111] border rounded-xl p-4 ${
                candidato.salarioEsperado <= post.puesto.salarioMax ? "border-green-800/30" : "border-yellow-800/30"
              }`}>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Comparativa salarial</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Candidato espera</span>
                    <span className="text-white">{fmt(candidato.salarioEsperado)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rango del puesto</span>
                    <span className="text-[#B3985B]">{fmt(post.puesto.salarioMin ?? 0)} – {fmt(post.puesto.salarioMax)}</span>
                  </div>
                  {propEdit.salarioPropuesto && (
                    <div className="flex justify-between border-t border-[#1a1a1a] pt-1">
                      <span className="text-gray-400">Oferta propuesta</span>
                      <span className="text-white font-semibold">{fmt(parseFloat(propEdit.salarioPropuesto))}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB CONTRATO ── */}
      {tab === "contrato" && (
        <div className="max-w-xl space-y-4">
          {etapa === "APROBADO" && !post?.contratoGenerado && (
            <div className="bg-green-900/10 border border-green-800/30 rounded-xl p-6 text-center space-y-4">
              <p className="text-green-300 font-semibold">Candidato aprobado</p>
              <p className="text-gray-400 text-sm">Al confirmar la contratación se generará el contrato y se creará automáticamente el expediente en el módulo de Personal.</p>
              <div className="flex justify-center gap-3">
                {post && (
                  <a href={`/api/rrhh/candidatos/${id}/contrato?postulacionId=${post.id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 border border-[#B3985B]/40 text-[#B3985B] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#B3985B]/10 transition-colors">
                    📋 Vista previa del contrato
                  </a>
                )}
                <button onClick={contratar} disabled={saving}
                  className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-6 py-2 rounded-lg transition-colors">
                  {saving ? "Procesando..." : "✓ Confirmar contratación"}
                </button>
              </div>
            </div>
          )}

          {etapa === "CONTRATADO" && (
            <div className="bg-[#B3985B]/10 border border-[#B3985B]/30 rounded-xl p-6 text-center space-y-3">
              <p className="text-[#B3985B] font-semibold text-lg">¡Contratado! 🎉</p>
              <p className="text-gray-400 text-sm">{candidato.nombre} ha sido incorporado al equipo.</p>
              {post?.contratoFecha && <p className="text-gray-600 text-xs">Fecha de contratación: {fmtDate(post.contratoFecha)}</p>}
              <div className="flex justify-center gap-3 flex-wrap">
                {post && (
                  <a href={`/api/rrhh/candidatos/${id}/contrato?postulacionId=${post.id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 border border-[#B3985B]/40 text-[#B3985B] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#B3985B]/10 transition-colors">
                    📋 Descargar contrato
                  </a>
                )}
                {post?.personalInternoId && (
                  <Link href={`/rrhh/personal/${post.personalInternoId}`}
                    className="inline-flex items-center gap-1.5 bg-[#B3985B] text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#c9a96a] transition-colors">
                    Ver expediente →
                  </Link>
                )}
              </div>
            </div>
          )}

          {etapa !== "APROBADO" && etapa !== "CONTRATADO" && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-6 text-center">
              <p className="text-gray-500 text-sm">El contrato se genera cuando el candidato pasa a etapa <strong className="text-white">Aprobado</strong></p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB ONBOARDING ── */}
      {tab === "onboarding" && etapa === "CONTRATADO" && (() => {
        const DEFAULT_ITEMS: OnboardingItem[] = [
          { id: "contrato", label: "Firma de contrato", done: false },
          { id: "imss", label: "Alta en IMSS / seguridad social", done: false },
          { id: "cuenta", label: "Apertura de cuenta bancaria para nómina", done: false },
          { id: "equipo", label: "Entrega de equipo de trabajo", done: false },
          { id: "accesos", label: "Configuración de accesos a sistemas", done: false },
          { id: "presentacion", label: "Presentación formal al equipo", done: false },
          { id: "tour", label: "Tour por instalaciones / bodegas", done: false },
          { id: "capacitacion", label: "Capacitación en procesos Mainstage Pro", done: false },
          { id: "politicas", label: "Revisión de políticas y procedimientos", done: false },
          { id: "evaluacion30", label: "Primera evaluación de 30 días agendada", done: false },
        ];
        let items: OnboardingItem[] = DEFAULT_ITEMS;
        try { if (post?.onboardingData) items = JSON.parse(post.onboardingData); } catch { /* */ }
        const done = items.filter(i => i.done).length;

        async function toggleItem(itemId: string) {
          const updated = items.map(i => i.id === itemId
            ? { ...i, done: !i.done, fecha: !i.done ? new Date().toISOString().slice(0, 10) : null }
            : i
          );
          await fetch(`/api/rrhh/candidatos/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postulacionId: post!.id, onboardingData: JSON.stringify(updated) }),
          });
          await load();
        }

        return (
          <div className="max-w-xl space-y-4">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-semibold">Checklist de integración</p>
                  <p className="text-gray-500 text-xs mt-0.5">{candidato.nombre} · {post?.puesto?.titulo ?? post?.puestoManual}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#B3985B] font-bold text-lg">{done}/{items.length}</p>
                  <p className="text-gray-600 text-xs">completados</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 mb-5">
                <div
                  className="bg-[#B3985B] h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.round((done / items.length) * 100)}%` }}
                />
              </div>

              <div className="space-y-2">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      item.done ? "bg-green-900/10 border border-green-800/20" : "bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#333]"
                    }`}>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      item.done ? "bg-green-500 border-green-500" : "border-[#333]"
                    }`}>
                      {item.done && <span className="text-black text-xs font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.done ? "text-gray-500 line-through" : "text-white"}`}>{item.label}</p>
                    </div>
                    {item.done && item.fecha && (
                      <span className="text-xs text-gray-600 shrink-0">{item.fecha}</span>
                    )}
                  </button>
                ))}
              </div>

              {done === items.length && (
                <div className="mt-4 bg-[#B3985B]/10 border border-[#B3985B]/20 rounded-lg p-3 text-center">
                  <p className="text-[#B3985B] font-semibold text-sm">🎉 Integración completa</p>
                  <p className="text-gray-500 text-xs mt-0.5">{candidato.nombre} está completamente integrado al equipo</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
