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
  ETAPAS_INTERNAS,
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

export default function ProcesoPage() {
  const [subetapas, setSubetapas] = useState<Subetapa[]>([]);
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [conteo, setConteo] = useState<Record<string, number>>({});
  const [abierta, setAbierta] = useState<Record<string, boolean>>({ PROSPECCION: true });
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0] p-4 md:p-6 space-y-6">
      {/* Encabezado */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: GOLD }}>Proceso comercial</h1>
          <p className="text-sm text-[#888] mt-1">
            El estándar editable que el motor usa para generar cada seguimiento.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-[#888]">Subetapas activas: <b className="text-[#f0f0f0]">{totalSubetapas}</b></span>
          <span className="text-[#888]">Pasos activos: <b className="text-[#f0f0f0]">{totalPasos}</b></span>
        </div>
      </header>

      {/* Aviso permanente */}
      <div className="rounded-lg border border-[#262626] bg-[#111111] px-4 py-3 text-xs text-[#b3985b]">
        Editar un guion no modifica los seguimientos ya generados. El texto se congela al momento de generarse; solo aplica a los nuevos.
      </div>

      {/* Acordeón por etapa */}
      {ETAPAS.map((etapa) => {
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
                {subs.map((sub) => (
                  <SubetapaCard
                    key={sub.id}
                    sub={sub}
                    conteo={conteo[sub.etapaInterna] ?? 0}
                    onGuardarPaso={guardarPaso}
                    onAgregarPaso={agregarPaso}
                    onDesactivarPaso={desactivarPaso}
                    onMoverPaso={moverPaso}
                    onToggleGeneracion={toggleGeneracion}
                  />
                ))}
                <AgregarSubetapa etapa={etapa} onDone={cargar} usadas={subetapas.map((s) => s.etapaInterna)} />
              </div>
            )}
          </section>
        );
      })}

      {/* Panel de reglas */}
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
    </div>
  );
}

// ─── SubetapaCard ─────────────────────────────────────────────────────────────
function SubetapaCard({
  sub, conteo, onGuardarPaso, onAgregarPaso, onDesactivarPaso, onMoverPaso, onToggleGeneracion,
}: {
  sub: Subetapa;
  conteo: number;
  onGuardarPaso: (id: string, campo: keyof Paso, valor: unknown) => void;
  onAgregarPaso: (subetapaId: string) => void;
  onDesactivarPaso: (id: string) => void;
  onMoverPaso: (sub: Subetapa, index: number, dir: -1 | 1) => void;
  onToggleGeneracion: (sub: Subetapa) => void;
}) {
  const pasos = sub.pasos.filter((p) => p.activo).sort((a, b) => a.orden - b.orden);
  return (
    <div className="rounded-lg border border-[#262626] bg-[#0a0a0a]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{sub.nombre}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#888] border border-[#262626]">
              {ETAPA_INTERNA_LABELS[sub.etapaInterna as keyof typeof ETAPA_INTERNA_LABELS] ?? sub.etapaInterna}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1a1a1a", color: GOLD }}>
              {conteo} trato(s)
            </span>
          </div>
          {sub.descripcion && <p className="text-xs text-[#666] mt-0.5">{sub.descripcion}</p>}
        </div>
        <label className="flex items-center gap-2 text-xs text-[#888] cursor-pointer" title="Si está activo, el motor genera el siguiente paso solo. Si no, la UI ofrece los pasos como opciones para que el usuario elija cuál usar.">
          <input type="checkbox" checked={sub.generacionAutomatica} onChange={() => onToggleGeneracion(sub)} />
          Generación automática
        </label>
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
                    {ETAPAS_INTERNAS.map((ei) => <option key={ei} value={ei}>{ETAPA_INTERNA_LABELS[ei]}</option>)}
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
function AgregarSubetapa({ etapa, onDone, usadas }: { etapa: string; onDone: () => void; usadas: string[] }) {
  const [abierto, setAbierto] = useState(false);
  const [etapaInterna, setEtapaInterna] = useState("");
  const [nombre, setNombre] = useState("");
  const disponibles = ETAPAS_INTERNAS.filter((ei) => !usadas.includes(ei));

  if (!abierto) {
    return <button onClick={() => setAbierto(true)} className="text-xs text-[#b3985b] hover:underline">+ Agregar subetapa</button>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#262626] bg-[#0a0a0a] p-2">
      <select value={etapaInterna} onChange={(e) => setEtapaInterna(e.target.value)} className="bg-[#1a1a1a] border border-[#262626] rounded px-2 py-1 text-xs">
        <option value="">Etapa interna…</option>
        {disponibles.map((ei) => <option key={ei} value={ei}>{ETAPA_INTERNA_LABELS[ei]}</option>)}
      </select>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" className="bg-[#1a1a1a] border border-[#262626] rounded px-2 py-1 text-xs" />
      <button
        disabled={!etapaInterna || !nombre}
        onClick={async () => {
          await fetch("/api/proceso/subetapas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ etapa, etapaInterna, nombre }),
          });
          setAbierto(false); setNombre(""); setEtapaInterna(""); onDone();
        }}
        className="text-xs px-2 py-1 rounded bg-[#b3985b] text-black disabled:opacity-40"
      >Crear</button>
      <button onClick={() => setAbierto(false)} className="text-xs text-[#666]">Cancelar</button>
    </div>
  );
}
