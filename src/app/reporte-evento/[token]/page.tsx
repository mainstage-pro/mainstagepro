"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contexto {
  estado: string;
  proyectoNombre: string;
  numeroProyecto: string;
  clienteNombre: string;
  fechaEvento: string | null;
  coordinadorNombre: string | null;
}

interface Incidencia {
  descripcion: string;
  impacto: "bajo" | "medio" | "alto";
  resolucion: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string | null): string {
  if (!s) return "";
  return new Date(s).toLocaleDateString("es-MX", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function SectionHeader({ num, title, sub }: { num: string; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
        {num}
      </span>
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function HorarioRow({
  label,
  planeado,
  real,
  onChangePlaneado,
  onChangeReal,
}: {
  label: string;
  planeado: string;
  real: string;
  onChangePlaneado: (v: string) => void;
  onChangeReal: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Planeado</label>
          <input
            type="time"
            value={planeado}
            onChange={e => onChangePlaneado(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-gray-400"
          />
        </div>
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Real</label>
          <input
            type="time"
            value={real}
            onChange={e => onChangeReal(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-gray-400"
          />
        </div>
      </div>
    </div>
  );
}

function TagList({
  label,
  items,
  setItems,
  placeholder,
}: {
  label: string;
  items: string[];
  setItems: (v: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function add() {
    const v = input.trim();
    if (!v) return;
    setItems([...items, v]);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex gap-2 mb-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-gray-400"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
        >
          +
        </button>
      </div>
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
              <span className="flex-1">{item}</span>
              <button
                type="button"
                onClick={() => setItems(items.filter((_, j) => j !== i))}
                className="text-gray-400 hover:text-red-500 transition-colors text-xs"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length === 0 && (
        <p className="text-xs text-gray-400 italic">Ninguno registrado</p>
      )}
    </div>
  );
}

function TriSelector({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string; color?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-5">
      <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              value === opt.value
                ? "bg-black text-white border-black"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ReportePostEventoPage() {
  const params = useParams();
  const token = params.token as string;

  const [contexto, setContexto] = useState<Contexto | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [yaRespondido, setYaRespondido] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [nombre, setNombre] = useState("");

  // Bloque 1: Horarios
  const [llegadaP, setLlegadaP] = useState("");
  const [llegadaR, setLlegadaR] = useState("");
  const [montajeP, setMontajeP] = useState("");
  const [montajeR, setMontajeR] = useState("");
  const [inicioP, setInicioP] = useState("");
  const [inicioR, setInicioR] = useState("");
  const [salidaP, setSalidaP] = useState("");
  const [salidaR, setSalidaR] = useState("");
  const [seEjecuto, setSeEjecuto] = useState("");

  // Bloque 2: Equipos
  const [fallas, setFallas] = useState<string[]>([]);
  const [mantenimiento, setMantenimiento] = useState<string[]>([]);
  const [faltantes, setFaltantes] = useState<string[]>([]);

  // Bloque 3: Información
  const [brief, setBrief] = useState("");
  const [cambios, setCambios] = useState<boolean | null>(null);
  const [descCambios, setDescCambios] = useState("");

  // Bloque 4: Equipo técnico
  const [calificacion, setCalificacion] = useState(0);
  const [positivos, setPositivos] = useState("");
  const [mejoras, setMejoras] = useState("");

  // Bloque 5: Incidencias
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  // Bloque 6: Cierre
  const [equipoRegreso, setEquipoRegreso] = useState("");
  const [faltantesDesc, setFaltantesDesc] = useState("");
  const [aprendizaje, setAprendizaje] = useState("");
  const [loRepetiriamos, setLoRepetiriamos] = useState("");

  useEffect(() => {
    fetch(`/api/reporte-evento/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setLoading(false); return; }
        setContexto(d);
        if (d.estado === "completado") setYaRespondido(true);
        setLoading(false);
      });
  }, [token]);

  function addIncidencia() {
    setIncidencias(prev => [...prev, { descripcion: "", impacto: "bajo", resolucion: "" }]);
  }

  function updateIncidencia(i: number, field: keyof Incidencia, val: string) {
    setIncidencias(prev => prev.map((inc, idx) => idx === i ? { ...inc, [field]: val } : inc));
  }

  function removeIncidencia(i: number) {
    setIncidencias(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const body = {
      coordinadorNombre: nombre,
      llegadaPlaneada: llegadaP, llegadaReal: llegadaR,
      montajePlaneado: montajeP, montajeReal: montajeR,
      inicioProgramado: inicioP, inicioReal: inicioR,
      salidaPlaneada: salidaP, salidaReal: salidaR,
      seEjecutoSegunPlan: seEjecuto,
      fallasEquipo: fallas,
      equipoMantenimiento: mantenimiento,
      herramientasFaltantes: faltantes,
      briefCompleto: brief,
      cambiosUltimoMomento: cambios,
      descripcionCambios: descCambios,
      calificacionEquipo: calificacion || null,
      puntosPositivos: positivos,
      areasMejora: mejoras,
      incidencias: incidencias.filter(i => i.descripcion.trim()),
      equipoRegreso,
      faltantesDescripcion: faltantesDesc,
      aprendizajeClave: aprendizaje,
      loRepetiriamos,
    };

    const res = await fetch(`/api/reporte-evento/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setEnviado(true);
    } else {
      const d = await res.json();
      if (d.error === "Este reporte ya fue enviado") setYaRespondido(true);
    }
    setSubmitting(false);
  }

  // ── States ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    );
  }

  if (!contexto) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-gray-700 font-semibold">Link no válido</p>
          <p className="text-gray-400 text-sm mt-1">Este reporte no existe o el link ha expirado.</p>
        </div>
      </div>
    );
  }

  if (yaRespondido) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Mainstage Pro" className="h-8 mx-auto mb-8 opacity-60" />
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="text-gray-900 font-bold text-lg">Reporte ya enviado</p>
          <p className="text-gray-500 text-sm mt-2">Este reporte ya fue completado anteriormente. Gracias por tu respuesta.</p>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Mainstage Pro" className="h-8 mx-auto mb-8 opacity-60" />
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="text-gray-900 font-bold text-lg">
            Reporte enviado{nombre ? `, ${nombre}` : ""}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            La información quedó registrada. El equipo de dirección la revisará.
          </p>
          <p className="text-xs text-gray-400 mt-4">{contexto.proyectoNombre} · {contexto.numeroProyecto}</p>
        </div>
      </div>
    );
  }

  // ── Formulario ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-5 flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Mainstage Pro" className="h-7 mb-5 opacity-80" />
        <div className="text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Reporte Post-Evento</p>
          <h1 className="text-xl font-bold text-gray-900">{contexto.proyectoNombre}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {contexto.clienteNombre}
            {contexto.fechaEvento && <> · {fmtDate(contexto.fechaEvento)}</>}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-5 py-8 space-y-10">

        {/* Nombre coordinador */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tu nombre <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="¿Quién está llenando este reporte?"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400"
          />
        </div>

        <hr className="border-gray-100" />

        {/* BLOQUE 1 — Horarios */}
        <div>
          <SectionHeader num="1" title="Horarios — planeado vs real" sub="Registra la hora que se planeó y la hora a la que realmente ocurrió cada etapa" />
          <HorarioRow label="Llegada al venue" planeado={llegadaP} real={llegadaR} onChangePlaneado={setLlegadaP} onChangeReal={setLlegadaR} />
          <HorarioRow label="Inicio de montaje" planeado={montajeP} real={montajeR} onChangePlaneado={setMontajeP} onChangeReal={setMontajeR} />
          <HorarioRow label="Inicio del evento" planeado={inicioP} real={inicioR} onChangePlaneado={setInicioP} onChangeReal={setInicioR} />
          <HorarioRow label="Salida y desmontaje" planeado={salidaP} real={salidaR} onChangePlaneado={setSalidaP} onChangeReal={setSalidaR} />
          <TriSelector
            label="¿El evento se ejecutó según el plan?"
            options={[
              { value: "si", label: "Sí" },
              { value: "ajustes", label: "Con ajustes" },
              { value: "no", label: "No" },
            ]}
            value={seEjecuto}
            onChange={setSeEjecuto}
          />
        </div>

        <hr className="border-gray-100" />

        {/* BLOQUE 2 — Equipos */}
        <div>
          <SectionHeader num="2" title="Equipos" sub="Presiona Enter o el botón + para agregar cada ítem" />
          <TagList label="Fallas de equipo durante el evento" items={fallas} setItems={setFallas} placeholder="Describe la falla..." />
          <TagList label="Equipos que requieren mantenimiento" items={mantenimiento} setItems={setMantenimiento} placeholder="Nombre del equipo..." />
          <TagList label="Herramientas o accesorios que faltaron" items={faltantes} setItems={setFaltantes} placeholder="¿Qué faltó?" />
        </div>

        <hr className="border-gray-100" />

        {/* BLOQUE 3 — Información */}
        <div>
          <SectionHeader num="3" title="Información y planeación" />
          <TriSelector
            label="¿El brief estaba completo?"
            options={[
              { value: "si", label: "Sí, completo" },
              { value: "incompleto", label: "Incompleto" },
              { value: "no", label: "No había brief" },
            ]}
            value={brief}
            onChange={setBrief}
          />
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">¿Hubo cambios de último momento?</p>
            <div className="flex gap-2">
              {[{ v: true, l: "Sí" }, { v: false, l: "No" }].map(opt => (
                <button
                  key={String(opt.v)}
                  type="button"
                  onClick={() => setCambios(opt.v)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium border transition-all ${
                    cambios === opt.v
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
            {cambios === true && (
              <textarea
                value={descCambios}
                onChange={e => setDescCambios(e.target.value)}
                placeholder="Describe brevemente los cambios que hubo..."
                rows={2}
                className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400 resize-none"
              />
            )}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* BLOQUE 4 — Equipo técnico */}
        <div>
          <SectionHeader num="4" title="Equipo técnico" />
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Calificación general del equipo</p>
            <div className="flex gap-2 flex-wrap">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCalificacion(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold border transition-all ${
                    calificacion === n
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Puntos positivos</label>
            <textarea
              value={positivos}
              onChange={e => setPositivos(e.target.value)}
              placeholder="¿Qué estuvo bien? ¿Quién destacó?"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400 resize-none"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Áreas de mejora</label>
            <textarea
              value={mejoras}
              onChange={e => setMejoras(e.target.value)}
              placeholder="¿Qué podría mejorar el equipo para el siguiente evento?"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400 resize-none"
            />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* BLOQUE 5 — Incidencias */}
        <div>
          <SectionHeader num="5" title="Incidencias" sub="Registra cualquier problema que ocurrió durante el evento" />
          {incidencias.length === 0 && (
            <p className="text-sm text-gray-400 italic mb-4">Sin incidencias registradas</p>
          )}
          {incidencias.map((inc, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 mb-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Incidencia {i + 1}</span>
                <button type="button" onClick={() => removeIncidencia(i)} className="text-gray-400 hover:text-red-500 text-sm transition-colors">✕</button>
              </div>
              <input
                value={inc.descripcion}
                onChange={e => updateIncidencia(i, "descripcion", e.target.value)}
                placeholder="¿Qué ocurrió?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-400"
              />
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Nivel de impacto</p>
                <div className="flex gap-2">
                  {(["bajo", "medio", "alto"] as const).map(imp => (
                    <button
                      key={imp}
                      type="button"
                      onClick={() => updateIncidencia(i, "impacto", imp)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
                        inc.impacto === imp
                          ? imp === "alto" ? "bg-red-600 text-white border-red-600"
                          : imp === "medio" ? "bg-yellow-500 text-white border-yellow-500"
                          : "bg-gray-700 text-white border-gray-700"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {imp}
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={inc.resolucion}
                onChange={e => updateIncidencia(i, "resolucion", e.target.value)}
                placeholder="¿Cómo se resolvió?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-400"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addIncidencia}
            className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            + Agregar incidencia
          </button>
        </div>

        <hr className="border-gray-100" />

        {/* BLOQUE 6 — Cierre */}
        <div>
          <SectionHeader num="6" title="Cierre" />
          <TriSelector
            label="¿El equipo regresó completo?"
            options={[
              { value: "completo", label: "Completo" },
              { value: "faltantes", label: "Con faltantes" },
            ]}
            value={equipoRegreso}
            onChange={setEquipoRegreso}
          />
          {equipoRegreso === "faltantes" && (
            <textarea
              value={faltantesDesc}
              onChange={e => setFaltantesDesc(e.target.value)}
              placeholder="¿Qué faltó? Descríbelo..."
              rows={2}
              className="mb-4 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400 resize-none"
            />
          )}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Aprendizaje clave del evento</label>
            <textarea
              value={aprendizaje}
              onChange={e => setAprendizaje(e.target.value)}
              placeholder="¿Qué se lleva el equipo de aprendizaje de este evento?"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400 resize-none"
            />
          </div>
          <TriSelector
            label="¿Lo repetiríamos en las mismas condiciones?"
            options={[
              { value: "si", label: "Sí" },
              { value: "ajustes", label: "Con ajustes" },
              { value: "no", label: "No" },
            ]}
            value={loRepetiriamos}
            onChange={setLoRepetiriamos}
          />
        </div>

        {/* Submit */}
        <div className="pb-10">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white font-semibold py-4 rounded-xl text-sm hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Enviando..." : "Enviar reporte"}
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">
            Esta información es confidencial y solo la revisa dirección.
          </p>
        </div>

      </form>
    </div>
  );
}
