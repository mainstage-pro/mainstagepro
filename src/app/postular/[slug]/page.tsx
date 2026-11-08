"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type TipoPregunta = "texto_corto" | "parrafo" | "opcion_unica" | "opcion_multiple" | "si_no" | "lista" | "archivo_o_liga" | "casilla";

interface Condicion { pregunta: string; valorEn: string[] }
type MostrarSi = Condicion | { todas: Condicion[] } | null;

interface Pregunta {
  id: string; orden: number; codigo: string | null;
  texto: string; ayuda: string | null; tipo: TipoPregunta;
  obligatoria: boolean; opciones: string[]; mostrarSi: MostrarSi;
}
interface Seccion {
  id: string; orden: number; titulo: string; descripcion: string | null;
  mostrarSi: MostrarSi; preguntas: Pregunta[];
}
interface Formulario {
  id: string; slug: string; titulo: string; descripcion: string | null;
  imagenUrl: string | null; mensajeConfirmacion: string | null;
  secciones: Seccion[];
}

function seMuestra(cond: MostrarSi, respuestas: Record<string, unknown>): boolean {
  if (!cond) return true;
  if ("todas" in cond) return cond.todas.every(c => seMuestra(c, respuestas));
  const v = respuestas[cond.pregunta];
  if (v == null) return false;
  if (Array.isArray(v)) return v.some(x => cond.valorEn.includes(String(x)));
  return cond.valorEn.includes(String(v));
}

const inputCls = "w-full bg-neutral-900 border border-neutral-700 text-white text-base rounded-lg px-4 py-3 focus:outline-none focus:border-[#B3985B] placeholder-neutral-500";

export default function PostularPage() {
  const params = useParams<{ slug: string }>();
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [cerrado, setCerrado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [respuestas, setRespuestas] = useState<Record<string, unknown>>({});
  const [paso, setPaso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  const storageKey = useMemo(() => `postular:${params.slug}`, [params.slug]);

  useEffect(() => {
    fetch(`/api/postular/${params.slug}`)
      .then(r => r.json().then(d => ({ ok: r.ok, d, status: r.status })))
      .then(({ ok, d, status }) => {
        if (!ok || status !== 200) { setCerrado(d.mensaje ?? "Esta convocatoria no está recibiendo postulaciones."); setCargando(false); return; }
        setFormulario(d.formulario);
        // Rescatar borrador si lo hay
        try {
          const guardado = localStorage.getItem(storageKey);
          if (guardado) setRespuestas(JSON.parse(guardado));
        } catch { /* localStorage puede fallar en modo privado */ }
        setCargando(false);
      })
      .catch(() => { setError("No se pudo cargar el formulario."); setCargando(false); });
  }, [params.slug, storageKey]);

  useEffect(() => {
    if (!formulario) return;
    try { localStorage.setItem(storageKey, JSON.stringify(respuestas)); } catch { /* ignorar quota */ }
  }, [respuestas, formulario, storageKey]);

  // Secciones visibles según mostrarSi (orden original).
  const seccionesVisibles = useMemo(() => {
    if (!formulario) return [];
    return formulario.secciones.filter(s => seMuestra(s.mostrarSi, respuestas));
  }, [formulario, respuestas]);

  function preguntasVisiblesDe(s: Seccion) {
    return s.preguntas.filter(p => seMuestra(p.mostrarSi, respuestas));
  }

  function setValor(preguntaId: string, valor: unknown) {
    setRespuestas(prev => ({ ...prev, [preguntaId]: valor }));
  }

  function validarSeccion(s: Seccion): string | null {
    for (const p of preguntasVisiblesDe(s)) {
      if (!p.obligatoria) continue;
      const v = respuestas[p.id];
      const vacio = v == null || v === "" || (Array.isArray(v) && v.length === 0);
      if (vacio) return `Falta responder: ${p.texto}`;
    }
    return null;
  }

  async function subirArchivo(preguntaId: string, file: File) {
    if (file.size > 10 * 1024 * 1024) { setError("El archivo supera 10 MB."); return; }
    setSubiendoArchivo(preguntaId);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/postular/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo subir"); return; }
      setValor(preguntaId, { tipo: "archivo", url: d.url, nombre: file.name });
    } catch {
      setError("No se pudo subir el archivo");
    } finally {
      setSubiendoArchivo(null);
    }
  }

  async function enviar() {
    if (!formulario) return;
    setError(null);
    // Validar todas las secciones visibles
    for (const s of seccionesVisibles) {
      const err = validarSeccion(s);
      if (err) { setError(err); return; }
    }
    setEnviando(true);
    try {
      const r = await fetch(`/api/postular/${params.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuestas, __botbait: honeypot }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo enviar"); setEnviando(false); return; }
      setConfirmacion(d.mensaje ?? "Gracias, recibimos tu postulación.");
      try { localStorage.removeItem(storageKey); } catch { /* ignorar */ }
    } catch {
      setError("Fallo de red al enviar");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#B3985B]" />
      </div>
    );
  }

  if (cerrado) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Mainstage Pro</h1>
          <p className="text-neutral-400">{cerrado}</p>
        </div>
      </div>
    );
  }

  if (confirmacion) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-xl font-semibold">¡Listo!</h1>
          <p className="text-neutral-400 whitespace-pre-wrap">{confirmacion}</p>
        </div>
      </div>
    );
  }

  if (!formulario) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-neutral-400">{error ?? "No se pudo cargar."}</p>
      </div>
    );
  }

  const total = seccionesVisibles.length;
  const seccionActual = seccionesVisibles[Math.min(paso, total - 1)];
  const progreso = Math.round(((paso + 1) / total) * 100);
  const esUltima = paso >= total - 1;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* Header de marca */}
        <div className="mb-6">
          <p className="text-[#B3985B] text-xs tracking-widest uppercase">Mainstage Pro</p>
          <h1 className="text-xl sm:text-2xl font-semibold mt-1">{formulario.titulo}</h1>
          {formulario.descripcion && <p className="text-neutral-400 text-sm mt-2 whitespace-pre-wrap">{formulario.descripcion}</p>}
          {formulario.imagenUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={formulario.imagenUrl} alt="" className="mt-4 rounded-lg max-h-40 w-auto" />
          )}
        </div>

        {/* Progreso */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-neutral-500 mb-1">
            <span>Sección {paso + 1} de {total}</span>
            <span>{progreso}%</span>
          </div>
          <div className="h-1 bg-neutral-900 rounded-full">
            <div className="h-full bg-[#B3985B] rounded-full transition-all" style={{ width: `${progreso}%` }} />
          </div>
        </div>

        {/* Sección */}
        {seccionActual && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white">{seccionActual.titulo}</h2>
              {seccionActual.descripcion && <p className="text-neutral-400 text-sm mt-1 whitespace-pre-wrap">{seccionActual.descripcion}</p>}
            </div>

            {preguntasVisiblesDe(seccionActual).map(p => (
              <div key={p.id} className="space-y-2">
                <label className="block text-sm text-white">
                  {p.codigo ? <span className="text-neutral-500 text-xs mr-1">{p.codigo}</span> : null}
                  {p.texto}
                  {p.obligatoria && <span className="text-red-500 ml-1">*</span>}
                </label>
                {p.ayuda && <p className="text-xs text-neutral-500 whitespace-pre-wrap">{p.ayuda}</p>}
                <CampoPregunta
                  pregunta={p}
                  valor={respuestas[p.id]}
                  onChange={v => setValor(p.id, v)}
                  onFile={f => subirArchivo(p.id, f)}
                  subiendo={subiendoArchivo === p.id}
                />
              </div>
            ))}
          </div>
        )}

        {/* Honeypot */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={e => setHoneypot(e.target.value)}
          className="opacity-0 absolute -z-10 pointer-events-none w-0 h-0"
          aria-hidden="true"
        />

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

        {/* Navegación */}
        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={() => { setError(null); setPaso(p => Math.max(0, p - 1)); }}
            disabled={paso === 0}
            className="flex items-center gap-1 text-sm px-4 py-2 border border-neutral-700 rounded-lg text-neutral-400 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <div className="flex-1" />
          {!esUltima ? (
            <button
              onClick={() => {
                if (!seccionActual) return;
                const err = validarSeccion(seccionActual);
                if (err) { setError(err); return; }
                setError(null);
                setPaso(p => p + 1);
                if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-1 text-sm px-5 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold rounded-lg"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={enviar}
              disabled={enviando}
              className="text-sm px-6 py-2 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold rounded-lg flex items-center gap-2"
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {enviando ? "Enviando…" : "Enviar postulación"}
            </button>
          )}
        </div>

        <p className="text-[11px] text-neutral-700 mt-8 text-center">
          Tus datos se guardan solo para fines de reclutamiento de Mainstage Pro.
        </p>
      </div>
    </div>
  );
}

function CampoPregunta({ pregunta, valor, onChange, onFile, subiendo }: {
  pregunta: Pregunta;
  valor: unknown;
  onChange: (v: unknown) => void;
  onFile: (f: File) => void;
  subiendo: boolean;
}) {
  const v = valor;
  switch (pregunta.tipo) {
    case "texto_corto":
      return <input className={inputCls} value={typeof v === "string" ? v : ""} onChange={e => onChange(e.target.value)} />;
    case "parrafo":
      return <textarea rows={4} className={inputCls} value={typeof v === "string" ? v : ""} onChange={e => onChange(e.target.value)} />;
    case "opcion_unica":
      return (
        <div className="space-y-2">
          {pregunta.opciones.map(o => (
            <label key={o} className="flex items-center gap-3 p-3 border border-neutral-800 rounded-lg hover:border-neutral-600 cursor-pointer">
              <input type="radio" name={pregunta.id} checked={v === o} onChange={() => onChange(o)} />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </div>
      );
    case "opcion_multiple": {
      const arr = Array.isArray(v) ? v as string[] : [];
      return (
        <div className="space-y-2">
          {pregunta.opciones.map(o => (
            <label key={o} className="flex items-center gap-3 p-3 border border-neutral-800 rounded-lg hover:border-neutral-600 cursor-pointer">
              <input type="checkbox" checked={arr.includes(o)}
                onChange={e => onChange(e.target.checked ? [...arr, o] : arr.filter(x => x !== o))} />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </div>
      );
    }
    case "si_no":
      return (
        <div className="flex gap-3">
          {["Sí", "No"].map(o => (
            <label key={o} className={`flex-1 p-3 border rounded-lg text-center cursor-pointer ${v === o ? "border-[#B3985B] bg-[#B3985B]/10" : "border-neutral-800 hover:border-neutral-600"}`}>
              <input type="radio" name={pregunta.id} className="hidden" checked={v === o} onChange={() => onChange(o)} />
              {o}
            </label>
          ))}
        </div>
      );
    case "lista":
      return (
        <select className={inputCls} value={typeof v === "string" ? v : ""} onChange={e => onChange(e.target.value)}>
          <option value="">— Elige una opción —</option>
          {pregunta.opciones.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "archivo_o_liga": {
      const esObj = v && typeof v === "object" && !Array.isArray(v);
      // Objeto {tipo, url, nombre} para archivo subido; string para URL pegada.
      return (
        <div className="space-y-2">
          <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-neutral-700 rounded-lg cursor-pointer hover:border-[#B3985B]">
            <input type="file" accept="image/*,application/pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            <span className="text-sm text-neutral-400">
              {subiendo ? "Subiendo…" : esObj ? `Archivo: ${(v as { nombre: string }).nombre}` : "Subir archivo (PDF/imagen, máx. 10 MB)"}
            </span>
          </label>
          <p className="text-xs text-neutral-600 text-center">o</p>
          <input
            type="url"
            placeholder="Pega una URL (Drive, portafolio, etc.)"
            className={inputCls}
            value={typeof v === "string" ? v : ""}
            onChange={e => onChange(e.target.value)}
          />
        </div>
      );
    }
    case "casilla":
      return (
        <label className="flex items-center gap-3 p-3 border border-neutral-800 rounded-lg cursor-pointer">
          <input type="checkbox" checked={v === true} onChange={e => onChange(e.target.checked)} />
          <span className="text-sm">Acepto</span>
        </label>
      );
    default:
      return null;
  }
}
