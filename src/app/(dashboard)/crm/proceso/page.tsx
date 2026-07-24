"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ETAPAS,
  ETAPA_LABELS,
  ETAPA_INTERNA_LABELS,
  CANALES,
  CANAL_LABELS,
  CATEGORIAS_REGLA,
  CATEGORIA_REGLA_LABELS,
  esEtapaInterna,
  type EtapaTrato,
} from "@/lib/proceso/valores";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Paso = {
  id: string;
  subetapaId: string;
  orden: number;
  dia: number;
  diaUrgente: number | null;
  titulo: string;
  objetivo: string;
  guion: string;
  canal: string;
  herramienta: string | null;
  avanzaSubetapaA: string | null;
  activo: boolean;
};

type Subetapa = {
  id: string;
  etapa: string;
  etapaInterna: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activa: boolean;
  generacionAutomatica: boolean;
  pasos: Paso[];
};

type Regla = {
  id: string;
  orden: number;
  texto: string;
  categoria: string;
  activa: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Error");
  return res.json();
}

const GOLD = "#C9A84C";

// Color de acento por etapa (consistente con EtapaInternaBar).
const ETAPA_COLOR: Record<EtapaTrato, string> = {
  CONTACTO_INICIAL: "#8b8bd6",
  PROSPECCION: "#a78bfa",
  DESCUBRIMIENTO: "#60a5fa",
  OPORTUNIDAD: "#eab308",
  VENTA_CERRADA: "#34d399",
  VENTA_PERDIDA: "#f87171",
};

export default function ProcesoPage() {
  const [subetapas, setSubetapas] = useState<Subetapa[]>([]);
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [conteo, setConteo] = useState<Record<string, number>>({});
  const [abierta, setAbierta] = useState<Record<string, boolean>>({ PROSPECCION: true });
  const [modo, setModo] = useState<"vista" | "editar">("vista");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const data = await api("/api/proceso", "GET");
      setSubetapas(data.subetapas);
      setReglas(data.reglas);
      setConteo(data.conteoPorSubetapa ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const totalSubetapas = subetapas.filter((s) => s.activa).length;
  const totalPasos = subetapas.reduce((n, s) => n + s.pasos.filter((p) => p.activo).length, 0);

  // ── Mutaciones de paso ──
  async function guardarPaso(id: string, campo: keyof Paso, valor: unknown) {
    setSubetapas((prev) =>
      prev.map((s) => ({ ...s, pasos: s.pasos.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)) }))
    );
    try { await api(`/api/proceso/pasos/${id}`, "PATCH", { [campo]: valor }); }
    catch { cargar(); }
  }

  async function agregarPaso(subetapaId: string) {
    await api("/api/proceso/pasos", "POST", { subetapaId });
    cargar();
  }

  async function desactivarPaso(id: string) {
    await api(`/api/proceso/pasos/${id}`, "DELETE");
    cargar();
  }

  async function moverPaso(sub: Subetapa, index: number, dir: -1 | 1) {
    const activos = sub.pasos.filter((p) => p.activo).sort((a, b) => a.orden - b.orden);
    const destino = index + dir;
    if (destino < 0 || destino >= activos.length) return;
    const nuevo = [...activos];
    [nuevo[index], nuevo[destino]] = [nuevo[destino], nuevo[index]];
    await api("/api/proceso/pasos/reorden", "PATCH", { orden: nuevo.map((p) => p.id) });
    cargar();
  }

  // ── Mutaciones de subetapa ──
  async function toggleGeneracion(sub: Subetapa) {
    const valor = !sub.generacionAutomatica;
    setSubetapas((prev) => prev.map((s) => (s.id === sub.id ? { ...s, generacionAutomatica: valor } : s)));
    try { await api(`/api/proceso/subetapas/${sub.id}`, "PATCH", { generacionAutomatica: valor }); }
    catch { cargar(); }
  }

  async function guardarSubetapa(id: string, campo: "nombre" | "descripcion" | "activa", valor: unknown) {
    setSubetapas((prev) => prev.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)));
    try { await api(`/api/proceso/subetapas/${id}`, "PATCH", { [campo]: valor }); }
    catch { cargar(); }
  }

  async function moverSubetapa(etapa: string, index: number, dir: -1 | 1) {
    const enEtapa = subetapas.filter((s) => s.etapa === etapa).sort((a, b) => a.orden - b.orden);
    const destino = index + dir;
    if (destino < 0 || destino >= enEtapa.length) return;
    const a = enEtapa[index];
    const b = enEtapa[destino];
    await Promise.all([
      api(`/api/proceso/subetapas/${a.id}`, "PATCH", { orden: b.orden }),
      api(`/api/proceso/subetapas/${b.id}`, "PATCH", { orden: a.orden }),
    ]);
    cargar();
  }

  async function borrarSubetapa(sub: Subetapa) {
    if (!confirm(`¿Borrar la subetapa "${sub.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api(`/api/proceso/subetapas/${sub.id}`, "DELETE");
      cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo borrar");
    }
  }

  // ── Mutaciones de regla ──
  async function guardarRegla(id: string, texto: string) {
    setReglas((prev) => prev.map((r) => (r.id === id ? { ...r, texto } : r)));
    try { await api(`/api/proceso/reglas/${id}`, "PATCH", { texto }); }
    catch { cargar(); }
  }

  async function agregarRegla(categoria: string) {
    await api("/api/proceso/reglas", "POST", { categoria, texto: "Nueva regla" });
    cargar();
  }

  async function desactivarRegla(id: string) {
    await api(`/api/proceso/reglas/${id}`, "DELETE");
    cargar();
  }

  if (cargando) return <div className="p-6 text-[#888]">Cargando proceso…</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  const expandirTodo = () =>
    setAbierta(Object.fromEntries(ETAPAS.map((e) => [e, true])));
  const colapsarTodo = () => setAbierta({});

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0] p-4 md:p-6 space-y-6">
      {/* Encabezado */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: GOLD }}>Proceso comercial</h1>
          <p className="text-sm text-[#888] mt-1">
            {modo === "vista"
              ? "Vista para presentar el proceso con el equipo, etapa por etapa."
              : "El estándar editable que el motor usa para generar cada seguimiento."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-[#888]">Subetapas activas: <b className="text-[#f0f0f0]">{totalSubetapas}</b></span>
          <span className="text-[#888]">Pasos activos: <b className="text-[#f0f0f0]">{totalPasos}</b></span>
          <div className="flex items-center rounded-lg border border-[#262626] overflow-hidden">
            <button
              onClick={() => setModo("vista")}
              className={`px-3 py-1.5 text-sm transition ${modo === "vista" ? "text-black" : "text-[#888] hover:text-[#f0f0f0]"}`}
              style={modo === "vista" ? { background: GOLD } : undefined}
            >Vista</button>
            <button
              onClick={() => setModo("editar")}
              className={`px-3 py-1.5 text-sm transition ${modo === "editar" ? "text-black" : "text-[#888] hover:text-[#f0f0f0]"}`}
              style={modo === "editar" ? { background: GOLD } : undefined}
            >Editar</button>
          </div>
        </div>
      </header>

      {/* Vista de solo lectura para presentar */}
      {modo === "vista" && (
        <>
          <div className="flex items-center gap-3 text-xs">
            <button onClick={expandirTodo} className="text-[#b3985b] hover:underline">Desplegar todo</button>
            <span className="text-[#333]">·</span>
            <button onClick={colapsarTodo} className="text-[#b3985b] hover:underline">Colapsar todo</button>
          </div>

          {ETAPAS.map((etapa) => {
            const subs = subetapas
              .filter((s) => s.etapa === etapa && s.activa)
              .sort((a, b) => a.orden - b.orden);
            if (subs.length === 0) return null;
            const color = ETAPA_COLOR[etapa];
            const abiertaEtapa = abierta[etapa];
            const nPasos = subs.reduce((n, s) => n + s.pasos.filter((p) => p.activo).length, 0);
            return (
              <section key={etapa} className="rounded-xl border border-[#262626] bg-[#111111] overflow-hidden">
                <button
                  onClick={() => setAbierta((p) => ({ ...p, [etapa]: !p[etapa] }))}
                  className="w-full flex items-center justify-between px-4 py-4 hover:bg-[#1a1a1a] transition"
                  style={{ borderLeft: `4px solid ${color}` }}
                >
                  <span className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-lg font-semibold">{ETAPA_LABELS[etapa as EtapaTrato]}</span>
                  </span>
                  <span className="text-[#666] text-sm">
                    {subs.length} subetapa(s) · {nPasos} paso(s) <span className="text-[#888] ml-1">{abiertaEtapa ? "−" : "+"}</span>
                  </span>
                </button>

                {abiertaEtapa && (
                  <div className="px-4 pb-5 pt-1 space-y-6">
                    {subs.map((sub) => (
                      <VistaSubetapa key={sub.id} sub={sub} conteo={conteo[sub.etapaInterna] ?? 0} color={color} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {/* Reglas en solo lectura */}
          <section className="rounded-xl border border-[#262626] bg-[#111111] p-5 space-y-4">
            <h2 className="font-semibold text-lg" style={{ color: GOLD }}>Reglas del proceso</h2>
            {CATEGORIAS_REGLA.map((cat) => {
              const rs = reglas.filter((r) => r.categoria === cat && r.activa).sort((a, b) => a.orden - b.orden);
              if (rs.length === 0) return null;
              return (
                <div key={cat} className="space-y-2">
                  <h3 className="text-sm font-medium text-[#aaa]">{CATEGORIA_REGLA_LABELS[cat]}</h3>
                  <ol className="space-y-1.5">
                    {rs.map((r) => (
                      <li key={r.id} className="flex items-start gap-3 text-sm">
                        <span className="text-[#555] mt-0.5">{r.orden}.</span>
                        <span className="flex-1 whitespace-pre-wrap leading-relaxed text-[#ddd]">{r.texto}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </section>
        </>
      )}

      {/* Aviso permanente (modo editar) */}
      {modo === "editar" && (
      <div className="rounded-lg border border-[#262626] bg-[#111111] px-4 py-3 text-xs text-[#b3985b]">
        Editar un guion no modifica los seguimientos ya generados. El texto se congela al momento de generarse; solo aplica a los nuevos.
      </div>
      )}

      {/* Acordeón por etapa (modo editar) */}
      {modo === "editar" && ETAPAS.map((etapa) => {
        const subs = subetapas
          .filter((s) => s.etapa === etapa)
          .sort((a, b) => a.orden - b.orden);
        const abiertaEtapa = abierta[etapa];
        return (
          <section key={etapa} className="rounded-xl border border-[#262626] bg-[#111111] overflow-hidden">
            <button
              onClick={() => setAbierta((p) => ({ ...p, [etapa]: !p[etapa] }))}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a] transition"
            >
              <span className="font-medium">{ETAPA_LABELS[etapa as EtapaTrato]}</span>
              <span className="text-[#666] text-sm">{abiertaEtapa ? "−" : "+"} {subs.length} subetapa(s)</span>
            </button>

            {abiertaEtapa && (
              <div className="px-4 pb-4 space-y-4">
                {subs.map((sub, i) => (
                  <SubetapaCard
                    key={sub.id}
                    sub={sub}
                    index={i}
                    total={subs.length}
                    conteo={conteo[sub.etapaInterna] ?? 0}
                    todasSubetapas={subetapas}
                    onGuardarPaso={guardarPaso}
                    onAgregarPaso={agregarPaso}
                    onDesactivarPaso={desactivarPaso}
                    onMoverPaso={moverPaso}
                    onToggleGeneracion={toggleGeneracion}
                    onGuardarSubetapa={guardarSubetapa}
                    onMoverSubetapa={moverSubetapa}
                    onBorrarSubetapa={borrarSubetapa}
                  />
                ))}
                <AgregarSubetapa etapa={etapa} onDone={cargar} />
              </div>
            )}
          </section>
        );
      })}

      {/* Panel de reglas (modo editar) */}
      {modo === "editar" && (
      <section className="rounded-xl border border-[#262626] bg-[#111111] p-4 space-y-4">
        <h2 className="font-medium" style={{ color: GOLD }}>Reglas del proceso</h2>
        {CATEGORIAS_REGLA.map((cat) => (
          <div key={cat} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm text-[#aaa]">{CATEGORIA_REGLA_LABELS[cat]}</h3>
              <button onClick={() => agregarRegla(cat)} className="text-xs text-[#b3985b] hover:underline">+ Agregar</button>
            </div>
            <ol className="space-y-1">
              {reglas.filter((r) => r.categoria === cat && r.activa).sort((a, b) => a.orden - b.orden).map((r) => (
                <li key={r.id} className="flex items-start gap-2">
                  <span className="text-[#555] text-xs mt-2">{r.orden}.</span>
                  <textarea
                    defaultValue={r.texto}
                    onBlur={(e) => e.target.value !== r.texto && guardarRegla(r.id, e.target.value)}
                    rows={1}
                    className="flex-1 bg-[#1a1a1a] border border-[#262626] rounded px-2 py-1 text-sm resize-y focus:border-[#b3985b] outline-none"
                  />
                  <button onClick={() => desactivarRegla(r.id)} className="text-[#666] hover:text-red-400 text-xs mt-2">✕</button>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>
      )}
    </div>
  );
}

// ─── VistaSubetapa (solo lectura, para presentar) ─────────────────────────────
function VistaSubetapa({ sub, conteo, color }: { sub: Subetapa; conteo: number; color: string }) {
  const pasos = sub.pasos.filter((p) => p.activo).sort((a, b) => a.orden - b.orden);
  return (
    <div className="rounded-lg border border-[#262626] bg-[#0a0a0a] overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[#262626]">
        <span className="font-semibold">{sub.nombre}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#888] border border-[#262626]">
          {esEtapaInterna(sub.etapaInterna) ? ETAPA_INTERNA_LABELS[sub.etapaInterna] : "Personalizada"}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1a1a1a", color: GOLD }}>
          {conteo} trato(s)
        </span>
        {!sub.generacionAutomatica && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#888] border border-[#262626]">
            Elección manual
          </span>
        )}
        {sub.descripcion && <p className="w-full text-sm text-[#888] mt-1 whitespace-pre-wrap leading-relaxed">{sub.descripcion}</p>}
      </div>

      {pasos.length === 0 ? (
        <p className="px-4 py-3 text-sm text-[#666]">Sin pasos definidos.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#666] text-left border-b border-[#1a1a1a]">
              <th className="px-4 py-2 font-normal w-16">Día</th>
              <th className="px-4 py-2 font-normal w-48">Título</th>
              <th className="px-4 py-2 font-normal">Objetivo y guion</th>
              <th className="px-4 py-2 font-normal w-40">Canal / avance</th>
            </tr>
          </thead>
          <tbody>
            {pasos.map((p) => (
              <tr key={p.id} className="border-b border-[#1a1a1a] last:border-0 align-top">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center h-7 min-w-7 px-1.5 rounded-full text-xs font-semibold text-black" style={{ background: color }}>
                    {p.dia}
                  </span>
                  {p.diaUrgente != null && (
                    <div className="text-[11px] text-[#f87171] mt-1">urg: {p.diaUrgente}</div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-[#f0f0f0] whitespace-pre-wrap leading-relaxed">{p.titulo}</td>
                <td className="px-4 py-3 space-y-1.5">
                  {p.objetivo && <div className="text-[#aaa] whitespace-pre-wrap leading-relaxed">{p.objetivo}</div>}
                  {p.guion && (
                    <div className="rounded border border-[#1a1a1a] bg-[#111111] px-3 py-2 text-[#ddd] whitespace-pre-wrap leading-relaxed">
                      {p.guion}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 space-y-1.5">
                  <span className="inline-block text-xs px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#262626] text-[#ccc]">
                    {CANAL_LABELS[p.canal as keyof typeof CANAL_LABELS] ?? p.canal}
                  </span>
                  {p.herramienta && (
                    <div className="text-xs text-[#888]">Herramienta: <span className="text-[#ccc]">{p.herramienta}</span></div>
                  )}
                  {p.avanzaSubetapaA && (
                    <div className="text-xs text-[#888]">
                      Avanza a: <span className="text-[#ccc]">{ETAPA_INTERNA_LABELS[p.avanzaSubetapaA as keyof typeof ETAPA_INTERNA_LABELS] ?? p.avanzaSubetapaA}</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── SubetapaCard ─────────────────────────────────────────────────────────────
function SubetapaCard({
  sub, index, total, conteo, todasSubetapas,
  onGuardarPaso, onAgregarPaso, onDesactivarPaso, onMoverPaso, onToggleGeneracion,
  onGuardarSubetapa, onMoverSubetapa, onBorrarSubetapa,
}: {
  sub: Subetapa;
  index: number;
  total: number;
  conteo: number;
  todasSubetapas: Subetapa[];
  onGuardarPaso: (id: string, campo: keyof Paso, valor: unknown) => void;
  onAgregarPaso: (subetapaId: string) => void;
  onDesactivarPaso: (id: string) => void;
  onMoverPaso: (sub: Subetapa, index: number, dir: -1 | 1) => void;
  onToggleGeneracion: (sub: Subetapa) => void;
  onGuardarSubetapa: (id: string, campo: "nombre" | "descripcion" | "activa", valor: unknown) => void;
  onMoverSubetapa: (etapa: string, index: number, dir: -1 | 1) => void;
  onBorrarSubetapa: (sub: Subetapa) => void;
}) {
  const pasos = sub.pasos.filter((p) => p.activo).sort((a, b) => a.orden - b.orden);
  const esBase = esEtapaInterna(sub.etapaInterna);
  // Opciones de "avanza a": todas las subetapas activas, desde la BD (incluye custom).
  const opcionesAvance = todasSubetapas
    .filter((s) => s.activa)
    .sort((a, b) => (a.etapa === b.etapa ? a.orden - b.orden : ETAPAS.indexOf(a.etapa as EtapaTrato) - ETAPAS.indexOf(b.etapa as EtapaTrato)));
  return (
    <div className={`rounded-lg border border-[#262626] bg-[#0a0a0a] ${sub.activa ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[#262626]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              defaultValue={sub.nombre}
              onBlur={(e) => e.target.value.trim() && e.target.value !== sub.nombre && onGuardarSubetapa(sub.id, "nombre", e.target.value.trim())}
              className="font-medium text-sm bg-[#1a1a1a] border border-[#262626] rounded px-1.5 py-0.5 focus:border-[#b3985b] outline-none min-w-[140px]"
            />
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#888] border border-[#262626]" title={esBase ? "Subetapa base del proceso" : "Subetapa personalizada"}>
              {esBase ? (ETAPA_INTERNA_LABELS[sub.etapaInterna as keyof typeof ETAPA_INTERNA_LABELS] ?? sub.etapaInterna) : "Personalizada"}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1a1a1a", color: GOLD }}>
              {conteo} trato(s)
            </span>
            <button onClick={() => onMoverSubetapa(sub.etapa, index, -1)} disabled={index === 0} className="text-[#666] hover:text-[#f0f0f0] disabled:opacity-30 px-1" title="Subir">↑</button>
            <button onClick={() => onMoverSubetapa(sub.etapa, index, 1)} disabled={index === total - 1} className="text-[#666] hover:text-[#f0f0f0] disabled:opacity-30 px-1" title="Bajar">↓</button>
          </div>
          <input
            defaultValue={sub.descripcion ?? ""}
            placeholder="Descripción (opcional)"
            onBlur={(e) => e.target.value !== (sub.descripcion ?? "") && onGuardarSubetapa(sub.id, "descripcion", e.target.value || null)}
            className="mt-1 w-full text-xs text-[#aaa] bg-[#1a1a1a] border border-[#262626] rounded px-1.5 py-0.5 focus:border-[#b3985b] outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-[#888] cursor-pointer" title="Si está activa, aparece en el proceso y los tratos pueden estar en ella.">
            <input type="checkbox" checked={sub.activa} onChange={() => onGuardarSubetapa(sub.id, "activa", !sub.activa)} />
            Activa
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[#888] cursor-pointer" title="Si está activo, el motor genera el siguiente paso solo. Si no, la UI ofrece los pasos como opciones para que el usuario elija cuál usar.">
            <input type="checkbox" checked={sub.generacionAutomatica} onChange={() => onToggleGeneracion(sub)} />
            Automática
          </label>
          {!esBase && (
            <button onClick={() => onBorrarSubetapa(sub)} className="text-[#666] hover:text-red-400 text-xs" title="Borrar subetapa personalizada">Borrar</button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#666] text-left">
              <th className="px-2 py-1 font-normal">Día</th>
              <th className="px-2 py-1 font-normal">Día urg.</th>
              <th className="px-2 py-1 font-normal">Título</th>
              <th className="px-2 py-1 font-normal">Objetivo</th>
              <th className="px-2 py-1 font-normal min-w-[220px]">Guion</th>
              <th className="px-2 py-1 font-normal">Canal</th>
              <th className="px-2 py-1 font-normal">Herramienta</th>
              <th className="px-2 py-1 font-normal">Avanza a</th>
              <th className="px-2 py-1 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {pasos.map((p, i) => (
              <tr key={p.id} className="border-t border-[#1a1a1a] align-top">
                <td className="px-2 py-1"><NumInput value={p.dia} onSave={(v) => onGuardarPaso(p.id, "dia", v)} /></td>
                <td className="px-2 py-1"><NumInput value={p.diaUrgente} nullable onSave={(v) => onGuardarPaso(p.id, "diaUrgente", v)} /></td>
                <td className="px-2 py-1"><TxtInput value={p.titulo} onSave={(v) => onGuardarPaso(p.id, "titulo", v)} /></td>
                <td className="px-2 py-1"><TxtInput value={p.objetivo} onSave={(v) => onGuardarPaso(p.id, "objetivo", v)} /></td>
                <td className="px-2 py-1">
                  <textarea
                    defaultValue={p.guion}
                    onBlur={(e) => e.target.value !== p.guion && onGuardarPaso(p.id, "guion", e.target.value)}
                    rows={3}
                    className="w-full bg-[#1a1a1a] border border-[#262626] rounded px-1.5 py-1 resize-y focus:border-[#b3985b] outline-none"
                  />
                </td>
                <td className="px-2 py-1">
                  <select
                    value={p.canal}
                    onChange={(e) => onGuardarPaso(p.id, "canal", e.target.value)}
                    className="bg-[#1a1a1a] border border-[#262626] rounded px-1 py-1 focus:border-[#b3985b] outline-none"
                  >
                    {CANALES.map((c) => <option key={c} value={c}>{CANAL_LABELS[c]}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1"><TxtInput value={p.herramienta ?? ""} onSave={(v) => onGuardarPaso(p.id, "herramienta", v)} /></td>
                <td className="px-2 py-1">
                  <select
                    value={p.avanzaSubetapaA ?? ""}
                    onChange={(e) => onGuardarPaso(p.id, "avanzaSubetapaA", e.target.value || null)}
                    className="bg-[#1a1a1a] border border-[#262626] rounded px-1 py-1 focus:border-[#b3985b] outline-none"
                  >
                    <option value="">—</option>
                    {opcionesAvance.map((s) => (
                      <option key={s.etapaInterna} value={s.etapaInterna}>{s.nombre}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  <button onClick={() => onMoverPaso(sub, i, -1)} disabled={i === 0} className="text-[#666] hover:text-[#f0f0f0] disabled:opacity-30 px-1">↑</button>
                  <button onClick={() => onMoverPaso(sub, i, 1)} disabled={i === pasos.length - 1} className="text-[#666] hover:text-[#f0f0f0] disabled:opacity-30 px-1">↓</button>
                  <button onClick={() => onDesactivarPaso(p.id)} className="text-[#666] hover:text-red-400 px-1">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-3 py-2 border-t border-[#262626]">
        <button onClick={() => onAgregarPaso(sub.id)} className="text-xs text-[#b3985b] hover:underline">+ Agregar paso</button>
      </div>
    </div>
  );
}

// ─── Inputs en línea ──────────────────────────────────────────────────────────
function TxtInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  return (
    <input
      defaultValue={value}
      onBlur={(e) => e.target.value !== value && onSave(e.target.value)}
      className="w-full min-w-[90px] bg-[#1a1a1a] border border-[#262626] rounded px-1.5 py-1 focus:border-[#b3985b] outline-none"
    />
  );
}

function NumInput({ value, nullable, onSave }: { value: number | null; nullable?: boolean; onSave: (v: number | null) => void }) {
  return (
    <input
      type="number"
      defaultValue={value ?? ""}
      onBlur={(e) => {
        const raw = e.target.value;
        const v = raw === "" ? (nullable ? null : 0) : Number(raw);
        if (v !== value) onSave(v);
      }}
      className="w-14 bg-[#1a1a1a] border border-[#262626] rounded px-1.5 py-1 focus:border-[#b3985b] outline-none"
    />
  );
}

// ─── Agregar subetapa ─────────────────────────────────────────────────────────
function AgregarSubetapa({ etapa, onDone }: { etapa: string; onDone: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (!abierto) {
    return <button onClick={() => setAbierto(true)} className="text-xs text-[#b3985b] hover:underline">+ Agregar subetapa</button>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#262626] bg-[#0a0a0a] p-2">
      <input
        value={nombre}
        autoFocus
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre de la subetapa"
        className="bg-[#1a1a1a] border border-[#262626] rounded px-2 py-1 text-xs min-w-[200px]"
      />
      <button
        disabled={!nombre.trim() || guardando}
        onClick={async () => {
          setGuardando(true);
          try {
            const res = await fetch("/api/proceso/subetapas", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ etapa, nombre: nombre.trim() }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Error");
            setAbierto(false); setNombre(""); onDone();
          } catch (e) {
            alert(e instanceof Error ? e.message : "No se pudo crear");
          } finally {
            setGuardando(false);
          }
        }}
        className="text-xs px-2 py-1 rounded bg-[#b3985b] text-black disabled:opacity-40"
      >Crear</button>
      <button onClick={() => { setAbierto(false); setNombre(""); }} className="text-xs text-[#666]">Cancelar</button>
    </div>
  );
}
