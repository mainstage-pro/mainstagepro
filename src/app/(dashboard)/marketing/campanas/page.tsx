"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useConfirm } from "@/components/Confirm";
import { Combobox } from "@/components/Combobox";

interface TipoCampana {
  id: string; nombre: string;
  objetivo: string; objetivoMeta: string; formato: string; recurrencia: string;
  canal: string; duracionDias: number; presupuestoEstimado: number | null;
  publicoEdadMin: number; publicoEdadMax: number; publicoGenero: string;
  ubicaciones: string; cta: string; copyReferencia: string | null;
  pixelEvento: string | null; descripcion: string | null;
  color: string; activo: boolean; orden: number;
}

// Categorías del documento
const OBJETIVOS = ["INFORMATIVO","VENTA","ENTRETENIMIENTO","POSICIONAMIENTO"];
const OBJ_LABEL: Record<string,string> = {
  INFORMATIVO:"Informativo", VENTA:"Venta", ENTRETENIMIENTO:"Entretenimiento", POSICIONAMIENTO:"Posicionamiento",
};
const OBJ_META = ["RECONOCIMIENTO","TRAFICO","INTERACCION","LEADS","VENTAS"];
const OBJ_META_LABEL: Record<string,string> = {
  RECONOCIMIENTO:"Reconocimiento de marca", TRAFICO:"Tráfico al sitio",
  INTERACCION:"Interacción con publicación", LEADS:"Generación de leads", VENTAS:"Ventas / Conversiones",
};
const FORMATOS = ["IMAGEN","VIDEO","CARRUSEL","REEL","HISTORIA","COLECCION"];
const FORMATO_LABEL: Record<string,string> = {
  IMAGEN:"Imagen", VIDEO:"Video", CARRUSEL:"Carrusel", REEL:"Reel", HISTORIA:"Historia", COLECCION:"Colección",
};
const RECURRENCIAS = ["MENSUAL","QUINCENAL","SEMANAL"];
const REC_LABEL: Record<string,string> = { MENSUAL:"Mensual", QUINCENAL:"Quincenal", SEMANAL:"Semanal" };
const GENEROS = ["TODOS","HOMBRES","MUJERES"];
const GENERO_LABEL: Record<string,string> = { TODOS:"Todos", HOMBRES:"Hombres", MUJERES:"Mujeres" };
const CTAS = ["MAS_INFORMACION","CONTACTAR","ENVIAR_MENSAJE","COTIZAR","REGISTRARSE","VER_MAS","COMPRAR","DESCARGAR"];
const CTA_LABEL: Record<string,string> = {
  MAS_INFORMACION:"Más información", CONTACTAR:"Contáctanos", ENVIAR_MENSAJE:"Enviar mensaje",
  COTIZAR:"Solicitar cotización", REGISTRARSE:"Registrarse", VER_MAS:"Ver más",
  COMPRAR:"Comprar ahora", DESCARGAR:"Descargar",
};
const UBICACIONES_LIST = [
  { key:"FEED_IG",    label:"Feed Instagram" },
  { key:"FEED_FB",    label:"Feed Facebook"  },
  { key:"STORIES_IG", label:"Stories IG"     },
  { key:"STORIES_FB", label:"Stories FB"     },
  { key:"REELS_IG",   label:"Reels IG"       },
  { key:"REELS_FB",   label:"Reels FB"       },
  { key:"EXPLORE_IG", label:"Explore IG"     },
];
const PIXEL_EVENTOS = ["Lead","Purchase","ViewContent","InitiateCheckout","CompleteRegistration","Contact","Schedule"];

const PRESET_COLORS = [
  "#B3985B","#3B82F6","#6366F1","#8B5CF6","#EF4444",
  "#F97316","#EC4899","#14B8A6","#10B981","#F59E0B",
];

type FormState = {
  nombre:string; objetivo:string; objetivoMeta:string; formato:string; recurrencia:string;
  canal:string; duracionDias:string; presupuestoEstimado:string;
  publicoEdadMin:string; publicoEdadMax:string; publicoGenero:string;
  ubicaciones:string[]; cta:string; copyReferencia:string; pixelEvento:string;
  descripcion:string; color:string;
};
const EMPTY: FormState = {
  nombre:"", objetivo:"INFORMATIVO", objetivoMeta:"RECONOCIMIENTO", formato:"VIDEO", recurrencia:"MENSUAL",
  canal:"META", duracionDias:"30", presupuestoEstimado:"",
  publicoEdadMin:"25", publicoEdadMax:"55", publicoGenero:"TODOS",
  ubicaciones:["FEED_IG","REELS_IG","STORIES_IG"], cta:"MAS_INFORMACION",
  copyReferencia:"", pixelEvento:"", descripcion:"", color:"#B3985B",
};

// ── 14 campañas del documento ───────────────────────────────────────────────
type Sugerido = Omit<TipoCampana,"id"|"activo"|"orden">;
const SUGERIDOS: Sugerido[] = [
  {
    nombre:"Servicios Mainstage 1", objetivo:"INFORMATIVO", objetivoMeta:"RECONOCIMIENTO",
    formato:"VIDEO", recurrencia:"MENSUAL", canal:"META", duracionDias:30, presupuestoEstimado:3000,
    publicoEdadMin:25, publicoEdadMax:55, publicoGenero:"TODOS",
    ubicaciones:"FEED_FB,FEED_IG,REELS_IG,STORIES_IG", cta:"MAS_INFORMACION",
    copyReferencia:"¿Próximo evento? Somos la producción técnica de confianza. Audio, iluminación y video profesional para que todo salga perfecto.",
    pixelEvento:"ViewContent", color:"#3B82F6",
    descripcion:"Campaña de reconocimiento de marca con video de producción. Muestra los servicios generales de Mainstage Pro.",
  },
  {
    nombre:"Servicios Mainstage 2", objetivo:"INFORMATIVO", objetivoMeta:"TRAFICO",
    formato:"CARRUSEL", recurrencia:"MENSUAL", canal:"META", duracionDias:30, presupuestoEstimado:2500,
    publicoEdadMin:25, publicoEdadMax:55, publicoGenero:"TODOS",
    ubicaciones:"FEED_FB,FEED_IG,STORIES_IG", cta:"MAS_INFORMACION",
    copyReferencia:"Conoce todo lo que hacemos: renta de equipo, producción técnica y dirección integral. Un solo proveedor para todo tu evento.",
    pixelEvento:"ViewContent", color:"#6366F1",
    descripcion:"Carrusel informativo de servicios. Cada card presenta un servicio con foto + descripción corta.",
  },
  {
    nombre:"Servicios Mainstage 3", objetivo:"INFORMATIVO", objetivoMeta:"RECONOCIMIENTO",
    formato:"IMAGEN", recurrencia:"MENSUAL", canal:"META", duracionDias:30, presupuestoEstimado:2000,
    publicoEdadMin:25, publicoEdadMax:55, publicoGenero:"TODOS",
    ubicaciones:"FEED_IG,STORIES_IG", cta:"MAS_INFORMACION",
    copyReferencia:"Mainstage Pro: producción técnica que hace la diferencia en cada evento.",
    pixelEvento:"ViewContent", color:"#8B5CF6",
    descripcion:"Imagen de posicionamiento con frase de marca. Simple, elegante y directa.",
  },
  {
    nombre:"Renta de equipo", objetivo:"INFORMATIVO", objetivoMeta:"TRAFICO",
    formato:"IMAGEN", recurrencia:"MENSUAL", canal:"META", duracionDias:30, presupuestoEstimado:2000,
    publicoEdadMin:25, publicoEdadMax:50, publicoGenero:"TODOS",
    ubicaciones:"FEED_FB,FEED_IG,STORIES_IG", cta:"MAS_INFORMACION",
    copyReferencia:"Equipo de audio, iluminación y video disponible para renta. Consigue exactamente lo que necesitas para tu producción.",
    pixelEvento:"Lead", color:"#14B8A6",
    descripcion:"Campaña de tráfico para el servicio de renta de equipo. Dirige al cliente a la página de catálogo o cotización.",
  },
  {
    nombre:"Producción técnica", objetivo:"INFORMATIVO", objetivoMeta:"TRAFICO",
    formato:"VIDEO", recurrencia:"MENSUAL", canal:"META", duracionDias:30, presupuestoEstimado:2500,
    publicoEdadMin:25, publicoEdadMax:50, publicoGenero:"TODOS",
    ubicaciones:"FEED_FB,FEED_IG,REELS_IG", cta:"COTIZAR",
    copyReferencia:"Producción técnica integral: armamos, operamos y desmontamos. Tú solo disfruta el evento.",
    pixelEvento:"Lead", color:"#10B981",
    descripcion:"Video que muestra el proceso completo de producción técnica desde el armado hasta el desmontaje.",
  },
  {
    nombre:"Dirección técnica integral", objetivo:"INFORMATIVO", objetivoMeta:"RECONOCIMIENTO",
    formato:"VIDEO", recurrencia:"MENSUAL", canal:"META", duracionDias:30, presupuestoEstimado:3000,
    publicoEdadMin:30, publicoEdadMax:55, publicoGenero:"TODOS",
    ubicaciones:"FEED_FB,FEED_IG,REELS_IG", cta:"CONTACTAR",
    copyReferencia:"La dirección técnica integral que tu evento necesita. Coordinamos cada detalle técnico para que nada falle en el momento más importante.",
    pixelEvento:"Lead", color:"#F59E0B",
    descripcion:"Campaña dirigida a empresas y organizadores que buscan un solo punto de contacto para toda la producción.",
  },
  {
    nombre:"Eventos musicales", objetivo:"VENTA", objetivoMeta:"LEADS",
    formato:"VIDEO", recurrencia:"QUINCENAL", canal:"META", duracionDias:15, presupuestoEstimado:3000,
    publicoEdadMin:25, publicoEdadMax:45, publicoGenero:"TODOS",
    ubicaciones:"FEED_FB,FEED_IG,REELS_IG,STORIES_IG", cta:"COTIZAR",
    copyReferencia:"¿Concierto, festival o evento musical? Tenemos el equipo y el personal técnico para hacerlo sonar y verse increíble. Cotiza ahora.",
    pixelEvento:"Lead", color:"#EF4444",
    descripcion:"Campaña de generación de leads para eventos musicales. Formulario de Meta Ads integrado para capturar contactos.",
  },
  {
    nombre:"Eventos sociales", objetivo:"VENTA", objetivoMeta:"LEADS",
    formato:"VIDEO", recurrencia:"QUINCENAL", canal:"META", duracionDias:15, presupuestoEstimado:3000,
    publicoEdadMin:25, publicoEdadMax:45, publicoGenero:"TODOS",
    ubicaciones:"FEED_FB,FEED_IG,STORIES_IG", cta:"COTIZAR",
    copyReferencia:"XV años, bodas, graduaciones y más. Haz que tu evento social sea memorable con producción técnica que no falla.",
    pixelEvento:"Lead", color:"#EC4899",
    descripcion:"Campaña de leads para eventos sociales (XV años, bodas, graduaciones). Segmentación por edad e intereses de celebración.",
  },
  {
    nombre:"Eventos empresariales", objetivo:"VENTA", objetivoMeta:"LEADS",
    formato:"VIDEO", recurrencia:"QUINCENAL", canal:"META", duracionDias:15, presupuestoEstimado:3500,
    publicoEdadMin:28, publicoEdadMax:55, publicoGenero:"TODOS",
    ubicaciones:"FEED_FB,FEED_IG,STORIES_IG", cta:"COTIZAR",
    copyReferencia:"Congresos, lanzamientos, convenciones y eventos corporativos. Producción técnica que refleja la imagen de tu empresa.",
    pixelEvento:"Lead", color:"#F97316",
    descripcion:"Campaña B2B orientada a empresas. Segmentación por cargo (dueños, directores, gerentes de marketing).",
  },
  {
    nombre:"Eventos reel tipo tik tok musicales", objetivo:"ENTRETENIMIENTO", objetivoMeta:"INTERACCION",
    formato:"REEL", recurrencia:"QUINCENAL", canal:"META", duracionDias:15, presupuestoEstimado:1500,
    publicoEdadMin:18, publicoEdadMax:35, publicoGenero:"TODOS",
    ubicaciones:"REELS_IG,REELS_FB,STORIES_IG", cta:"VER_MAS",
    copyReferencia:"🎶 Así suena la producción de Mainstage Pro en eventos musicales. ¿Cuándo es tu próximo show?",
    pixelEvento:null, color:"#B3985B",
    descripcion:"Reel estilo TikTok de eventos musicales. Edición dinámica con cortes rápidos, texto en pantalla y música de tendencia.",
  },
  {
    nombre:"Eventos reel tipo tik tok sociales", objetivo:"ENTRETENIMIENTO", objetivoMeta:"INTERACCION",
    formato:"REEL", recurrencia:"QUINCENAL", canal:"META", duracionDias:15, presupuestoEstimado:1500,
    publicoEdadMin:18, publicoEdadMax:40, publicoGenero:"TODOS",
    ubicaciones:"REELS_IG,REELS_FB,STORIES_IG", cta:"VER_MAS",
    copyReferencia:"✨ La producción detrás de los momentos más especiales. Bodas, XV años y eventos que no se olvidan.",
    pixelEvento:null, color:"#F59E0B",
    descripcion:"Reel de eventos sociales con corte emocional. Highlights de los mejores momentos producidos.",
  },
  {
    nombre:"Eventos reel tipo tik tok empresariales", objetivo:"ENTRETENIMIENTO", objetivoMeta:"INTERACCION",
    formato:"REEL", recurrencia:"QUINCENAL", canal:"META", duracionDias:15, presupuestoEstimado:1500,
    publicoEdadMin:22, publicoEdadMax:45, publicoGenero:"TODOS",
    ubicaciones:"REELS_IG,REELS_FB,STORIES_IG", cta:"VER_MAS",
    copyReferencia:"🏢 Behind the scenes: así producimos eventos corporativos de alto impacto.",
    pixelEvento:null, color:"#F97316",
    descripcion:"Reel de eventos empresariales con enfoque profesional. Muestra el behind the scenes de producción corporativa.",
  },
  {
    nombre:"Post de la semana", objetivo:"POSICIONAMIENTO", objetivoMeta:"INTERACCION",
    formato:"IMAGEN", recurrencia:"SEMANAL", canal:"META", duracionDias:7, presupuestoEstimado:500,
    publicoEdadMin:20, publicoEdadMax:45, publicoGenero:"TODOS",
    ubicaciones:"FEED_IG,STORIES_IG", cta:"VER_MAS",
    copyReferencia:"Post semanal de posicionamiento de marca: foto o gráfica de un evento reciente o mensaje aspiracional.",
    pixelEvento:null, color:"#6366F1",
    descripcion:"Post semanal de presencia de marca. Imagen estática con alta producción visual y copy corto.",
  },
  {
    nombre:"Reel de la semana", objetivo:"POSICIONAMIENTO", objetivoMeta:"INTERACCION",
    formato:"REEL", recurrencia:"SEMANAL", canal:"META", duracionDias:7, presupuestoEstimado:500,
    publicoEdadMin:18, publicoEdadMax:40, publicoGenero:"TODOS",
    ubicaciones:"REELS_IG,FEED_IG", cta:"VER_MAS",
    copyReferencia:"Reel semanal de posicionamiento: video corto estilo TikTok de un evento reciente o contenido de valor de la industria.",
    pixelEvento:null, color:"#B3985B",
    descripcion:"Reel semanal de posicionamiento orgánico. Bajo presupuesto pero alta frecuencia para mantenerse top of mind.",
  },
];

// ── Helpers de badge ────────────────────────────────────────────────────────
const OBJ_META_COLOR: Record<string,string> = {
  RECONOCIMIENTO:"bg-purple-900/30 text-purple-300",
  TRAFICO:"bg-blue-900/30 text-blue-300",
  INTERACCION:"bg-yellow-900/30 text-yellow-300",
  LEADS:"bg-green-900/30 text-green-300",
  VENTAS:"bg-red-900/30 text-red-300",
};
const REC_COLOR: Record<string,string> = {
  MENSUAL:"bg-slate-800 text-slate-400",
  QUINCENAL:"bg-teal-900/30 text-teal-400",
  SEMANAL:"bg-orange-900/30 text-orange-400",
};
const FORMATO_ICON: Record<string,string> = {
  IMAGEN:"🖼", VIDEO:"🎬", CARRUSEL:"🎠", REEL:"🎞", HISTORIA:"📱", COLECCION:"🗃",
};

function UbicTag({ k }: { k: string }) {
  const found = UBICACIONES_LIST.find(u => u.key === k);
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40">{found?.label ?? k}</span>
  );
}

export default function TiposCampanaPage() {
  const confirm = useConfirm();
  const [tipos, setTipos] = useState<TipoCampana[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/marketing/tipos-campana", { cache: "no-store" });
    const d = await r.json();
    setTipos(d.tipos ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function toggleUbic(key: string) {
    setForm(f => ({
      ...f,
      ubicaciones: f.ubicaciones.includes(key)
        ? f.ubicaciones.filter(u => u !== key)
        : [...f.ubicaciones, key],
    }));
  }

  function startEdit(t: TipoCampana) {
    setForm({
      nombre: t.nombre,
      objetivo: t.objetivo,
      objetivoMeta: t.objetivoMeta,
      formato: t.formato,
      recurrencia: t.recurrencia,
      canal: t.canal,
      duracionDias: t.duracionDias.toString(),
      presupuestoEstimado: t.presupuestoEstimado?.toString() ?? "",
      publicoEdadMin: t.publicoEdadMin.toString(),
      publicoEdadMax: t.publicoEdadMax.toString(),
      publicoGenero: t.publicoGenero,
      ubicaciones: t.ubicaciones ? t.ubicaciones.split(",").filter(Boolean) : ["FEED_IG","REELS_IG","STORIES_IG"],
      cta: t.cta,
      copyReferencia: t.copyReferencia ?? "",
      pixelEvento: t.pixelEvento ?? "",
      descripcion: t.descripcion ?? "",
      color: t.color,
    });
    setEditId(t.id);
    setShowForm(true);
    setExpandedId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() { setForm(EMPTY); setEditId(null); setShowForm(false); }

  async function save() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const payload = {
      nombre: form.nombre,
      objetivo: form.objetivo,
      objetivoMeta: form.objetivoMeta,
      formato: form.formato,
      recurrencia: form.recurrencia,
      canal: form.canal,
      duracionDias: parseInt(form.duracionDias) || 14,
      presupuestoEstimado: form.presupuestoEstimado ? parseFloat(form.presupuestoEstimado) : null,
      publicoEdadMin: parseInt(form.publicoEdadMin) || 25,
      publicoEdadMax: parseInt(form.publicoEdadMax) || 55,
      publicoGenero: form.publicoGenero,
      ubicaciones: form.ubicaciones.join(","),
      cta: form.cta,
      copyReferencia: form.copyReferencia || null,
      pixelEvento: form.pixelEvento || null,
      descripcion: form.descripcion || null,
      color: form.color,
    };
    const url = editId ? `/api/marketing/tipos-campana/${editId}` : "/api/marketing/tipos-campana";
    const method = editId ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    cancelForm();
    await load();
    setSaving(false);
  }

  async function toggleActivo(t: TipoCampana) {
    await fetch(`/api/marketing/tipos-campana/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !t.activo }),
    });
    await load();
  }

  async function del(t: TipoCampana) {
    if (!await confirm({ message: `¿Eliminar "${t.nombre}"?`, danger: true, confirmText: "Eliminar" })) return;
    await fetch(`/api/marketing/tipos-campana/${t.id}`, { method: "DELETE" });
    await load();
  }

  async function cargarSugeridos() {
    if (!await confirm({ message: `¿Cargar las ${SUGERIDOS.length} campañas del documento? Los duplicados se omitirán.`, danger: false, confirmText: "Cargar" })) return;
    setSeeding(true);
    const existing = tipos.map(t => t.nombre.toLowerCase());
    for (const s of SUGERIDOS) {
      if (existing.includes(s.nombre.toLowerCase())) continue;
      await fetch("/api/marketing/tipos-campana", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...s, ubicaciones: s.ubicaciones }),
      });
    }
    await load();
    setSeeding(false);
  }

  const activos   = tipos.filter(t => t.activo);
  const inactivos = tipos.filter(t => !t.activo);

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Publicidad</p>
          <h1 className="text-xl font-semibold text-white">Tipos de campaña</h1>
          <p className="text-white/40 text-sm mt-0.5">Plantillas de campañas Meta Ads para programar en el calendario.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/marketing/campanas/calendario"
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors">
            Ver calendario →
          </Link>
          {tipos.length === 0 && (
            <button onClick={cargarSugeridos} disabled={seeding}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#B3985B]/30 text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors disabled:opacity-50">
              {seeding ? "Cargando…" : "Cargar del documento"}
            </button>
          )}
          <button onClick={() => { cancelForm(); setShowForm(s => !s); }}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-[#B3985B] text-black hover:opacity-85 transition-opacity">
            {showForm && !editId ? "Cancelar" : "+ Nueva campaña"}
          </button>
        </div>
      </div>

      {/* ── Formulario ──────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-white">{editId ? "Editar campaña" : "Nueva campaña Meta Ads"}</h2>

          {/* Nombre + color */}
          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider">Nombre y color</label>
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                  placeholder="Nombre de la campaña" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap" style={{ maxWidth: 220 }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, outline: form.color === c ? `2px solid white` : "none", outlineOffset: 2 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Recurrencia */}
          <div className="flex gap-2">
            {RECURRENCIAS.map(r => (
              <button key={r} onClick={() => setForm(f => ({ ...f, recurrencia: r }))}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${form.recurrencia === r ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]" : "border-white/10 text-white/40 hover:border-white/20 hover:text-white"}`}>
                {REC_LABEL[r]}
              </button>
            ))}
          </div>

          {/* Objetivo + Objetivo Meta */}
          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider">Objetivo</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-white/30 mb-1">Categoría del documento</p>
                <Combobox
                  value={form.objetivo}
                  onChange={v => setForm(f => ({ ...f, objetivo: v }))}
                  options={OBJETIVOS.map(o => ({ value: o, label: OBJ_LABEL[o] }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                />
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">Objetivo en Meta Ads</p>
                <Combobox
                  value={form.objetivoMeta}
                  onChange={v => setForm(f => ({ ...f, objetivoMeta: v }))}
                  options={OBJ_META.map(o => ({ value: o, label: OBJ_META_LABEL[o] }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                />
              </div>
            </div>
          </div>

          {/* Formato */}
          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider">Formato del anuncio</label>
            <div className="flex gap-2 flex-wrap">
              {FORMATOS.map(f => (
                <button key={f} onClick={() => setForm(s => ({ ...s, formato: f }))}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${form.formato === f ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]" : "border-white/10 text-white/40 hover:border-white/20 hover:text-white"}`}>
                  {FORMATO_ICON[f]} {FORMATO_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Audiencia */}
          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider">Audiencia</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-white/30 mb-1">Edad mín.</p>
                <input type="number" min={13} max={65} value={form.publicoEdadMin}
                  onChange={e => setForm(f => ({ ...f, publicoEdadMin: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">Edad máx.</p>
                <input type="number" min={13} max={65} value={form.publicoEdadMax}
                  onChange={e => setForm(f => ({ ...f, publicoEdadMax: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]" />
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">Género</p>
                <Combobox
                  value={form.publicoGenero}
                  onChange={v => setForm(f => ({ ...f, publicoGenero: v }))}
                  options={GENEROS.map(g => ({ value: g, label: GENERO_LABEL[g] }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                />
              </div>
            </div>
          </div>

          {/* Ubicaciones */}
          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider">Ubicaciones en Meta</label>
            <div className="flex gap-2 flex-wrap">
              {UBICACIONES_LIST.map(u => (
                <button key={u.key} onClick={() => toggleUbic(u.key)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${form.ubicaciones.includes(u.key) ? "border-[#B3985B] bg-[#B3985B]/10 text-[#B3985B]" : "border-white/10 text-white/40 hover:border-white/20 hover:text-white"}`}>
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duración + Presupuesto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Duración estimada (días)</label>
              <input type="number" min={1} value={form.duracionDias}
                onChange={e => setForm(f => ({ ...f, duracionDias: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Presupuesto estimado (MXN)</label>
              <input type="number" min={0} value={form.presupuestoEstimado}
                onChange={e => setForm(f => ({ ...f, presupuestoEstimado: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
                placeholder="Opcional" />
            </div>
          </div>

          {/* CTA + Pixel evento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">CTA del anuncio</label>
              <Combobox
                value={form.cta}
                onChange={v => setForm(f => ({ ...f, cta: v }))}
                options={CTAS.map(c => ({ value: c, label: CTA_LABEL[c] }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Evento del píxel</label>
              <Combobox
                value={form.pixelEvento}
                onChange={v => setForm(f => ({ ...f, pixelEvento: v }))}
                options={[{ value: "", label: "— Sin píxel —" }, ...PIXEL_EVENTOS.map(p => ({ value: p, label: p }))]}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B]"
              />
            </div>
          </div>

          {/* Copy de referencia */}
          <div>
            <label className="block text-xs text-white/40 mb-1">Copy de referencia</label>
            <textarea value={form.copyReferencia} onChange={e => setForm(f => ({ ...f, copyReferencia: e.target.value }))}
              rows={3} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B] resize-none"
              placeholder="Texto principal del anuncio (referencia para quien ejecuta la campaña)…" />
          </div>

          {/* Notas internas */}
          <div>
            <label className="block text-xs text-white/40 mb-1">Notas / descripción interna</label>
            <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={2} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#B3985B] resize-none"
              placeholder="Para qué sirve esta campaña, cuándo usarla, segmentación sugerida…" />
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-white/[0.04]">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: form.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{form.nombre || "Nombre de la campaña"}</p>
              <p className="text-white/35 text-xs mt-0.5">
                {OBJ_META_LABEL[form.objetivoMeta]} · {FORMATO_LABEL[form.formato]} · {REC_LABEL[form.recurrencia]} · {form.duracionDias || 14} días
              </p>
            </div>
            {form.presupuestoEstimado && (
              <span className="text-[#B3985B] text-xs shrink-0">${parseFloat(form.presupuestoEstimado).toLocaleString("es-MX")}</span>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button onClick={cancelForm} className="text-xs px-4 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white transition-colors">
              Cancelar
            </button>
            <button onClick={save} disabled={saving || !form.nombre.trim()}
              className="text-xs font-semibold px-5 py-2 rounded-lg bg-[#B3985B] text-black hover:opacity-85 disabled:opacity-50 transition-opacity">
              {saving ? "Guardando…" : editId ? "Guardar cambios" : "Crear campaña"}
            </button>
          </div>
        </div>
      )}

      {loading && <div className="text-white/30 text-sm text-center py-12">Cargando…</div>}

      {/* Empty state */}
      {!loading && tipos.length === 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-16 text-center space-y-3">
          <div className="text-3xl opacity-20">📣</div>
          <p className="text-white/40 text-sm">Sin tipos de campaña</p>
          <p className="text-white/25 text-xs max-w-xs mx-auto leading-relaxed">
            Carga las 14 campañas del documento de planeación para empezar a programarlas en el calendario.
          </p>
          <button onClick={cargarSugeridos} disabled={seeding}
            className="mt-2 text-xs px-4 py-2 rounded-lg border border-[#B3985B]/30 text-[#B3985B] hover:bg-[#B3985B]/10 transition-colors">
            {seeding ? "Cargando…" : "Cargar 14 campañas del documento"}
          </button>
        </div>
      )}

      {/* Lista activos */}
      {!loading && activos.length > 0 && (
        <div className="space-y-2">
          {activos.map(t => {
            const ubics = t.ubicaciones ? t.ubicaciones.split(",").filter(Boolean) : [];
            const expanded = expandedId === t.id;
            return (
              <div key={t.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                <div style={{ height: 2, background: t.color }} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: t.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setExpandedId(expanded ? null : t.id)}
                          className="text-white text-sm font-medium hover:text-[#B3985B] transition-colors text-left">
                          {t.nombre}
                        </button>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${OBJ_META_COLOR[t.objetivoMeta] ?? "bg-white/10 text-white/50"}`}>
                          {OBJ_META_LABEL[t.objetivoMeta]}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40">
                          {FORMATO_ICON[t.formato]} {FORMATO_LABEL[t.formato]}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${REC_COLOR[t.recurrencia]}`}>
                          {REC_LABEL[t.recurrencia]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-white/30 flex-wrap">
                        <span>{t.publicoEdadMin}–{t.publicoEdadMax} años · {GENERO_LABEL[t.publicoGenero]}</span>
                        <span>{t.duracionDias} días</span>
                        {t.presupuestoEstimado && <span className="text-[#B3985B]/70">${t.presupuestoEstimado.toLocaleString("es-MX")} MXN</span>}
                        <span>{CTA_LABEL[t.cta]}</span>
                      </div>
                      {ubics.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1.5">
                          {ubics.map(u => <UbicTag key={u} k={u} />)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(t)} className="text-xs text-white/30 hover:text-white px-2 py-1 rounded transition-colors">Editar</button>
                      <button onClick={() => toggleActivo(t)} className="text-xs text-white/30 hover:text-yellow-400 px-2 py-1 rounded transition-colors">Pausar</button>
                      <button onClick={() => del(t)} className="text-xs text-white/30 hover:text-red-400 px-2 py-1 rounded transition-colors">Eliminar</button>
                      <button onClick={() => setExpandedId(expanded ? null : t.id)}
                        className="text-white/25 hover:text-white p-1 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points={expanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 pt-4 border-t border-white/[0.05] space-y-3">
                      {t.copyReferencia && (
                        <div>
                          <p className="text-xs text-white/25 mb-1">Copy de referencia</p>
                          <p className="text-white/60 text-xs leading-relaxed italic">"{t.copyReferencia}"</p>
                        </div>
                      )}
                      {t.descripcion && (
                        <div>
                          <p className="text-xs text-white/25 mb-1">Notas</p>
                          <p className="text-white/45 text-xs leading-relaxed">{t.descripcion}</p>
                        </div>
                      )}
                      <div className="flex gap-4 text-xs text-white/30 flex-wrap">
                        <span>Objetivo doc: <span className="text-white/50">{OBJ_LABEL[t.objetivo]}</span></span>
                        {t.pixelEvento && <span>Píxel: <span className="text-white/50">{t.pixelEvento}</span></span>}
                        <span>CTA: <span className="text-white/50">{CTA_LABEL[t.cta]}</span></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inactivos */}
      {!loading && inactivos.length > 0 && (
        <details className="group">
          <summary className="text-xs text-white/30 cursor-pointer hover:text-white/50 transition-colors select-none">
            {inactivos.length} campaña{inactivos.length !== 1 ? "s" : ""} pausada{inactivos.length !== 1 ? "s" : ""}
          </summary>
          <div className="mt-3 space-y-2">
            {inactivos.map(t => (
              <div key={t.id} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 flex items-center gap-4 opacity-50">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: t.color }} />
                <p className="flex-1 text-white/50 text-sm">{t.nombre}</p>
                <button onClick={() => toggleActivo(t)} className="text-xs text-white/30 hover:text-green-400 px-2 py-1 rounded transition-colors">Activar</button>
                <button onClick={() => del(t)} className="text-xs text-white/30 hover:text-red-400 px-2 py-1 rounded transition-colors">Eliminar</button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
