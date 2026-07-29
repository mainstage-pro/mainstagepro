"use client";

import { useMemo, useState } from "react";
import {
  SECCIONES, faltantesRequeridas, preguntaVisible,
  type Pregunta, type Respuestas,
} from "@/lib/satisfaccion-form";

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';
const OTRO = "__otro__";

type Props = {
  nombre: string;
  puesto?: string;
  periodo: string;
  onSubmit: (respuestas: Respuestas) => Promise<{ ok: boolean; error?: string }>;
  onCambiarUsuario?: () => void;
};

function ScaleBtn({ n, selected, onClick }: { n: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ fontFamily: FONT }}
      className={`w-10 h-10 rounded-xl border text-sm font-semibold transition-all ${
        selected
          ? n >= 4 ? "bg-green-700 border-green-500 text-white" : n >= 3 ? "bg-yellow-700 border-yellow-500 text-white" : "bg-red-700 border-red-500 text-white"
          : "border-[#333] text-[#666] hover:border-[#555] hover:text-white"
      }`}
    >
      {n}
    </button>
  );
}

export default function EncuestaSatisfaccionForm({ nombre, puesto, periodo, onSubmit, onCambiarUsuario }: Props) {
  const [resp, setResp] = useState<Respuestas>({});
  // "Otro" de single: bandera + texto; "Otro" de multi: bandera + texto
  const [singleOtro, setSingleOtro] = useState<Record<string, boolean>>({});
  const [multiOtro, setMultiOtro] = useState<Record<string, { on: boolean; text: string }>>({});
  const [otroText, setOtroText] = useState<Record<string, string>>({});

  const [intentado, setIntentado] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const setScale = (id: string, n: number) => setResp(p => ({ ...p, [id]: n }));
  const setText = (id: string, v: string) => setResp(p => ({ ...p, [id]: v }));
  const setYesno = (id: string, v: string) => setResp(p => ({ ...p, [id]: v }));

  const setSingle = (id: string, opcion: string) => {
    if (opcion === OTRO) {
      setSingleOtro(p => ({ ...p, [id]: true }));
      setResp(p => ({ ...p, [id]: (otroText[id] ?? "").trim() }));
    } else {
      setSingleOtro(p => ({ ...p, [id]: false }));
      setResp(p => ({ ...p, [id]: opcion }));
    }
  };
  const setSingleOtroText = (id: string, v: string) => {
    setOtroText(p => ({ ...p, [id]: v }));
    if (singleOtro[id]) setResp(p => ({ ...p, [id]: v.trim() }));
  };

  const construirMulti = (id: string, standard: string[], otro: { on: boolean; text: string }) => {
    const extra = otro.on && otro.text.trim() ? [otro.text.trim()] : [];
    return [...standard, ...extra];
  };
  const toggleMulti = (id: string, opcion: string) => {
    setResp(p => {
      const actual = Array.isArray(p[id]) ? (p[id] as string[]) : [];
      const standard = actual.filter(o => !(multiOtro[id]?.on && multiOtro[id]?.text.trim() === o));
      const nuevoStd = standard.includes(opcion) ? standard.filter(o => o !== opcion) : [...standard, opcion];
      return { ...p, [id]: construirMulti(id, nuevoStd, multiOtro[id] ?? { on: false, text: "" }) };
    });
  };
  const toggleMultiOtro = (id: string) => {
    setMultiOtro(prev => {
      const cur = prev[id] ?? { on: false, text: otroText[id] ?? "" };
      const next = { ...cur, on: !cur.on };
      setResp(p => {
        const actual = Array.isArray(p[id]) ? (p[id] as string[]) : [];
        const standard = actual.filter(o => !(cur.on && cur.text.trim() === o));
        return { ...p, [id]: construirMulti(id, standard, next) };
      });
      return { ...prev, [id]: next };
    });
  };
  const setMultiOtroText = (id: string, v: string) => {
    setMultiOtro(prev => {
      const cur = prev[id] ?? { on: true, text: "" };
      const next = { ...cur, text: v };
      setResp(p => {
        const actual = Array.isArray(p[id]) ? (p[id] as string[]) : [];
        const standard = actual.filter(o => !(cur.on && cur.text.trim() === o));
        return { ...p, [id]: construirMulti(id, standard, next) };
      });
      return { ...prev, [id]: next };
    });
  };

  const faltantes = useMemo(() => new Set(faltantesRequeridas(resp)), [resp]);
  const listo = faltantes.size === 0;

  const submit = async () => {
    setIntentado(true);
    if (!listo) {
      const primero = faltantesRequeridas(resp)[0];
      if (primero) document.getElementById(`q-${primero}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    setError(null);
    // Limpia respuestas vacías antes de enviar
    const limpio: Respuestas = {};
    for (const [k, v] of Object.entries(resp)) {
      if (v == null) continue;
      if (Array.isArray(v)) { if (v.length) limpio[k] = v; }
      else if (typeof v === "string") { if (v.trim()) limpio[k] = v.trim(); }
      else limpio[k] = v;
    }
    const res = await onSubmit(limpio);
    if (res.ok) setEnviado(true);
    else setError(res.error || "Error al enviar. Intenta de nuevo.");
    setSubmitting(false);
  };

  if (enviado) return (
    <div style={{ fontFamily: FONT }} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-white text-xl font-bold mb-2">¡Gracias, {nombre}!</h1>
        <p className="text-[#555] text-sm leading-relaxed">
          Tus opiniones y propuestas <b className="text-[#888]">sí importan</b> y se revisan cada período para
          definir mejoras y darles seguimiento. Este formulario no es solo para medir — es para accionar.
        </p>
      </div>
    </div>
  );

  const renderPregunta = (p: Pregunta) => {
    if (!preguntaVisible(p, resp)) return null;
    const falta = intentado && faltantes.has(p.id);
    const val = resp[p.id];

    return (
      <div
        key={p.id}
        id={`q-${p.id}`}
        className={`bg-[#111] border rounded-xl p-5 ${falta ? "border-red-800/60" : "border-[#1e1e1e]"}`}
      >
        <p className="text-white text-sm font-semibold mb-0.5">
          {p.label} {p.required && <span className="text-[#B3985B]">*</span>}
        </p>
        {p.desc && <p className="text-[#555] text-xs mb-3">{p.desc}</p>}

        {p.tipo === "scale5" && (
          <div className="mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              {p.escalaMin && <span className="text-[10px] text-[#555] w-20 shrink-0 text-right pr-1 hidden sm:block">{p.escalaMin}</span>}
              {[1, 2, 3, 4, 5].map(n => (
                <ScaleBtn key={n} n={n} selected={val === n} onClick={() => setScale(p.id, n)} />
              ))}
              {p.escalaMax && <span className="text-[10px] text-[#555] w-20 shrink-0 pl-1 hidden sm:block">{p.escalaMax}</span>}
            </div>
            <div className="flex justify-between text-[10px] text-[#444] mt-1.5 sm:hidden">
              <span>{p.escalaMin}</span><span>{p.escalaMax}</span>
            </div>
          </div>
        )}

        {p.tipo === "yesno" && (
          <div className="flex gap-2 mt-3">
            {["Sí", "No"].map(o => (
              <button
                key={o} type="button" onClick={() => setYesno(p.id, o)}
                className={`px-6 py-2 rounded-xl border text-sm font-semibold transition-all ${
                  val === o ? "bg-[#B3985B] border-[#B3985B] text-black" : "border-[#333] text-[#888] hover:border-[#555]"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        )}

        {p.tipo === "single" && (
          <div className="space-y-2 mt-3">
            {(p.opciones ?? []).map(o => (
              <label key={o} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio" name={p.id} checked={!singleOtro[p.id] && val === o}
                  onChange={() => setSingle(p.id, o)}
                  className="w-4 h-4 accent-[#B3985B]"
                />
                <span className="text-gray-300 text-sm group-hover:text-white">{o}</span>
              </label>
            ))}
            {p.permiteOtro && (
              <div className="flex items-center gap-3">
                <input
                  type="radio" name={p.id} checked={!!singleOtro[p.id]}
                  onChange={() => setSingle(p.id, OTRO)}
                  className="w-4 h-4 accent-[#B3985B]"
                />
                <span className="text-gray-300 text-sm">Otro:</span>
                <input
                  type="text" value={otroText[p.id] ?? ""}
                  onChange={e => setSingleOtroText(p.id, e.target.value)}
                  onFocus={() => setSingle(p.id, OTRO)}
                  placeholder="Especifica..."
                  className="flex-1 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#444] focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {p.tipo === "multi" && (
          <div className="space-y-2 mt-3">
            {(p.opciones ?? []).map(o => {
              const arr = Array.isArray(val) ? val : [];
              return (
                <label key={o} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox" checked={arr.includes(o)} onChange={() => toggleMulti(p.id, o)}
                    className="w-4 h-4 accent-[#B3985B]"
                  />
                  <span className="text-gray-300 text-sm group-hover:text-white">{o}</span>
                </label>
              );
            })}
            {p.permiteOtro && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox" checked={!!multiOtro[p.id]?.on} onChange={() => toggleMultiOtro(p.id)}
                  className="w-4 h-4 accent-[#B3985B]"
                />
                <span className="text-gray-300 text-sm">Otro:</span>
                <input
                  type="text" value={multiOtro[p.id]?.text ?? ""}
                  onChange={e => setMultiOtroText(p.id, e.target.value)}
                  onFocus={() => { if (!multiOtro[p.id]?.on) toggleMultiOtro(p.id); }}
                  placeholder="Especifica..."
                  className="flex-1 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#444] focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {p.tipo === "text" && (
          <textarea
            value={typeof val === "string" ? val : ""}
            onChange={e => setText(p.id, e.target.value)}
            placeholder="Escribe aquí..."
            rows={3}
            className="w-full mt-3 bg-[#0d0d0d] border border-[#222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none resize-none"
          />
        )}

        {falta && <p className="text-red-400 text-xs mt-2">Esta pregunta es obligatoria.</p>}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: FONT }} className="min-h-screen bg-[#0a0a0a] py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        <div className="text-center pt-4 pb-2">
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-3">Mainstage Pro</p>
          <h1 className="text-white text-2xl font-bold mb-1">Satisfacción y Mejora del Equipo</h1>
          <p className="text-[#555] text-sm">{nombre}{puesto ? ` · ${puesto}` : ""}</p>
          {periodo && <p className="text-[#333] text-xs mt-1">Período: {periodo}</p>}
          {onCambiarUsuario && (
            <button onClick={onCambiarUsuario} className="text-[#B3985B] text-xs mt-2 hover:underline">
              ¿No eres tú? Cambiar
            </button>
          )}
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 text-sm text-[#777] leading-relaxed">
          Tus respuestas son <b className="text-[#999]">confidenciales</b> y se usan para mejorar el ambiente, la
          operación y las herramientas. No hay respuestas correctas o incorrectas: responde con honestidad.
          Las preguntas marcadas con <span className="text-[#B3985B]">*</span> son obligatorias.
        </div>

        {SECCIONES.map(sec => (
          <div key={sec.id} className="space-y-3">
            <div className="pt-2">
              <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mb-1">{sec.titulo}</p>
              {sec.intro && <p className="text-[#555] text-xs leading-relaxed">{sec.intro}</p>}
            </div>
            {sec.preguntas.map(renderPregunta)}
          </div>
        ))}

        {error && <div className="bg-red-900/20 border border-red-900/40 rounded-xl p-3 text-red-400 text-sm text-center">{error}</div>}
        {intentado && !listo && (
          <div className="bg-red-900/20 border border-red-900/40 rounded-xl p-3 text-red-400 text-sm text-center">
            Faltan {faltantes.size} pregunta(s) obligatoria(s) por responder.
          </div>
        )}

        <div className="pb-8">
          <button
            type="button" onClick={submit} disabled={submitting}
            className="w-full bg-[#B3985B] hover:bg-[#c9aa6a] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm py-4 rounded-xl transition-all"
          >
            {submitting ? "Enviando..." : "Enviar encuesta"}
          </button>
        </div>

      </div>
    </div>
  );
}
