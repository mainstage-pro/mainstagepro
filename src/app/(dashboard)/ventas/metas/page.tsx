"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DiaData { fecha: string; dia: string; count: number }
interface HistoricoItem { mes: string; label: string; prospectados: number; cierres: number }
interface NurturingItem {
  id: string; cliente: string; tipoEvento: string;
  proximaAccion: string | null; fechaProximaAccion: string | null;
  diasRetraso: number; etapaNurturing: string | null; temperatura: string | null;
  nextMotivo: string | null; presupuesto: number | null; responsable: string | null;
}
interface LeadItem {
  id: string; cliente: string; tipoEvento: string;
  etapa: string; estatusContacto: string; createdAt: string;
  presupuesto: number | null; asignadoPor: string | null; responsable: string | null;
}
interface ScoreItem {
  id: string; nombre: string;
  hoy: number; semana: number; mes: number;
  oportunidadesMes: number; cierresMes: number;
}
interface MetasData {
  meta: number;
  hoy: { fecha: string; prospectos: number; porcentaje: number };
  semana: DiaData[];
  mes: { prospectados: number; oportunidades: number; cierres: number; perdidos: number; montoCierres: number };
  nurturing: { total: number; pendienteHoy: number; sinFecha: number; lista: NurturingItem[] };
  leads: LeadItem[];
  scoreboard: ScoreItem[];
  historico: HistoricoItem[];
}

const TEMP_COLORS: Record<string, string> = {
  FRIO: "text-blue-400 bg-blue-900/20 border-blue-800/40",
  TIBIO: "text-yellow-400 bg-yellow-900/20 border-yellow-800/40",
  CALIENTE: "text-orange-400 bg-orange-900/20 border-orange-800/40",
};
const TEMP_EMOJI: Record<string, string> = { FRIO: "🧊", TIBIO: "🌡", CALIENTE: "🔥" };

const NURTURING_ETAPAS: Record<string, string> = {
  PRIMER_CONTACTO: "1er contacto",
  SEGUIMIENTO_1: "Seguimiento 1",
  SEGUIMIENTO_2: "Seguimiento 2",
  SEGUIMIENTO_3: "Seguimiento 3",
  PROPUESTA_ENVIADA: "Propuesta",
  EN_DECISION: "En decisión",
};

// Siguiente etapa sugerida al avanzar
const ETAPA_SIGUIENTE: Record<string, string> = {
  PRIMER_CONTACTO: "SEGUIMIENTO_1",
  SEGUIMIENTO_1: "SEGUIMIENTO_2",
  SEGUIMIENTO_2: "SEGUIMIENTO_3",
  SEGUIMIENTO_3: "PROPUESTA_ENVIADA",
  PROPUESTA_ENVIADA: "EN_DECISION",
  EN_DECISION: "EN_DECISION",
};

// Temperatura asociada a cada etapa
const ETAPA_TEMPERATURA: Record<string, string> = {
  PRIMER_CONTACTO: "FRIO",
  SEGUIMIENTO_1: "FRIO",
  SEGUIMIENTO_2: "TIBIO",
  SEGUIMIENTO_3: "TIBIO",
  PROPUESTA_ENVIADA: "CALIENTE",
  EN_DECISION: "CALIENTE",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

// ── Gauge circular ───────────────────────────────────────────────────────────
function GaugeDia({ count, meta }: { count: number; meta: number }) {
  const pct = Math.min(1, count / meta);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const color = pct >= 1 ? "#22c55e" : pct >= 0.58 ? "#eab308" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" className="rotate-[-90deg]">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1a1a1a" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-white leading-none">{count}</span>
        <span className="text-xs text-gray-500 mt-0.5">de {meta}</span>
      </div>
    </div>
  );
}

// ── Barra de día de la semana ─────────────────────────────────────────────────
function BarraDia({ dia, count, meta, isToday }: { dia: string; count: number; meta: number; isToday: boolean }) {
  const pct = Math.min(100, (count / meta) * 100);
  const color = count >= meta ? "bg-green-500" : count >= meta * 0.58 ? "bg-yellow-500" : count === 0 ? "bg-[#1a1a1a]" : "bg-red-500";
  return (
    <div className={`flex flex-col items-center gap-1 ${isToday ? "opacity-100" : "opacity-70"}`}>
      <span className="text-[10px] font-bold text-white">{count}</span>
      <div className="w-8 bg-[#1a1a1a] rounded-full overflow-hidden" style={{ height: 60 }}>
        <div
          className={`w-full rounded-full transition-all duration-700 ${color}`}
          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
        />
      </div>
      <span className={`text-[10px] uppercase tracking-wide ${isToday ? "text-[#B3985B] font-semibold" : "text-gray-600"}`}>
        {dia}
      </span>
    </div>
  );
}

// ── Gráfica de línea SVG ─────────────────────────────────────────────────────
function LineChart({ datos, meta }: { datos: HistoricoItem[]; meta: number }) {
  if (!datos.length) return null;
  const W = 560; const H = 120; const PAD = { t: 10, r: 16, b: 28, l: 36 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const maxVal = Math.max(meta * 20, ...datos.map(d => d.prospectados), 1);
  const xs = datos.map((_, i) => PAD.l + (i / (datos.length - 1)) * chartW);
  const yP = (v: number) => PAD.t + chartH - (v / maxVal) * chartH;
  const pathP = datos.map((d, i) => `${i === 0 ? "M" : "L"} ${xs[i]} ${yP(d.prospectados)}`).join(" ");
  const pathC = datos.map((d, i) => `${i === 0 ? "M" : "L"} ${xs[i]} ${yP(d.cierres)}`).join(" ");
  const metaY = yP(meta * 20);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Grid line meta mensual */}
      <line x1={PAD.l} y1={metaY} x2={W - PAD.r} y2={metaY} stroke="#2a2a2a" strokeWidth="1" strokeDasharray="4 3" />
      <text x={PAD.l - 4} y={metaY + 4} textAnchor="end" fontSize="9" fill="#444">{meta * 20}</text>
      {/* Línea prospectados */}
      <path d={pathP} fill="none" stroke="#B3985B" strokeWidth="2" strokeLinejoin="round" />
      {/* Línea cierres */}
      <path d={pathC} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" />
      {/* Puntos + etiquetas */}
      {datos.map((d, i) => (
        <g key={d.mes}>
          <circle cx={xs[i]} cy={yP(d.prospectados)} r="3.5" fill="#B3985B" />
          <circle cx={xs[i]} cy={yP(d.cierres)} r="3.5" fill="#22c55e" />
          <text x={xs[i]} y={H - 4} textAnchor="middle" fontSize="9" fill="#666">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function MetasPage() {
  const [data, setData] = useState<MetasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"hoy" | "nurturing" | "leads" | "mes">("hoy");
  // Estado para el formulario inline "Contacté"
  const [contactando, setContactando] = useState<string | null>(null); // tratoId
  const [cForm, setCForm] = useState({ nota: "", nextFecha: "", nextMotivo: "", nextEtapa: "" });
  const [savingContacto, setSavingContacto] = useState(false);

  const reload = () => {
    fetch("/api/ventas/metas").then(r => r.json()).then(setData);
  };

  useEffect(() => {
    setLoading(true);
    fetch("/api/ventas/metas")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function registrarContacto(tratoId: string, item: NurturingItem) {
    setSavingContacto(true);
    // Etapa destino: la que eligió el usuario o la siguiente sugerida
    const etapaActual = item.etapaNurturing ?? "PRIMER_CONTACTO";
    const nextEtapa = cForm.nextEtapa || ETAPA_SIGUIENTE[etapaActual] || etapaActual;
    const nextTemp = ETAPA_TEMPERATURA[nextEtapa] ?? ETAPA_TEMPERATURA[etapaActual] ?? null;

    const logEntry = {
      fecha: new Date().toISOString().slice(0, 10),
      accion: item.proximaAccion ?? "Seguimiento",
      nota: cForm.nota || null,
      resultado: "CONTACTADO",
      etapaResultante: nextEtapa,
    };
    // Leer nurturingData actual del trato para agregar al log
    const tratoRes = await fetch(`/api/tratos/${tratoId}`);
    const tratoData = await tratoRes.json();
    let nData: Record<string, unknown> = {};
    try { if (tratoData.trato?.nurturingData) nData = JSON.parse(tratoData.trato.nurturingData); } catch { /* */ }
    const log = Array.isArray(nData.log) ? [...nData.log, logEntry] : [logEntry];
    const updatedNurturing = { ...nData, etapa: nextEtapa, temperatura: nextTemp, log };

    await fetch(`/api/tratos/${tratoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nurturingData: JSON.stringify(updatedNurturing),
        proximaAccion: cForm.nextMotivo || null,
        fechaProximaAccion: cForm.nextFecha || null,
        estatusContacto: "CONTACTADO",
      }),
    });
    setSavingContacto(false);
    setContactando(null);
    setCForm({ nota: "", nextFecha: "", nextMotivo: "", nextEtapa: "" });
    reload();
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-gray-500 text-sm">Cargando metas...</p>
    </div>
  );
  if (!data) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-red-400 text-sm">Error cargando datos</p>
    </div>
  );

  const { meta, hoy, semana, mes, nurturing, leads, scoreboard, historico } = data;
  const hoyIndex = semana.length - 1;
  const pctMes = meta * 20; // meta mensual: 20 días hábiles × 12
  const diasHabilesMes = 20;
  const metaMensual = meta * diasHabilesMes;

  const mesActual = new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs text-[#B3985B] uppercase tracking-widest mb-1">Ventas · Outbound</p>
            <h1 className="text-2xl font-bold text-white">Metas de prospección</h1>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">{mesActual}</p>
          </div>
          <Link href="/crm/tratos/nuevo?tipo=OUTBOUND"
            className="text-sm bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold px-4 py-2 rounded-lg transition-colors">
            + Nuevo prospecto
          </Link>
        </div>

        {/* ── KPIs rápidos ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Prospectados hoy", value: hoy.prospectos, sub: `meta ${meta}/día`, color: hoy.prospectos >= meta ? "text-green-400" : hoy.prospectos >= 7 ? "text-yellow-400" : "text-red-400" },
            { label: "Nurturing activo", value: nurturing.total, sub: `${nurturing.pendienteHoy} pendientes hoy`, color: "text-[#B3985B]" },
            { label: "Prospectos del mes", value: mes.prospectados, sub: `meta ~${metaMensual}`, color: mes.prospectados >= metaMensual ? "text-green-400" : "text-white" },
            { label: "Cierres del mes", value: mes.cierres, sub: mes.montoCierres > 0 ? fmt(mes.montoCierres) : "—", color: mes.cierres > 0 ? "text-green-400" : "text-gray-400" },
          ].map(k => (
            <div key={k.label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-1 w-fit">
          {([
            ["hoy", "Scoreboard"],
            ["nurturing", `Nurturing${nurturing.pendienteHoy > 0 ? ` (${nurturing.pendienteHoy})` : ""}`],
            ["leads", `Leads${leads.length > 0 ? ` (${leads.length})` : ""}`],
            ["mes", "Embudo del mes"],
          ] as [typeof tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${tab === key ? "bg-[#B3985B] text-black" : "text-gray-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ─────── TAB: HOY / SCOREBOARD ─────── */}
        {tab === "hoy" && (
          <div className="space-y-5">
            {/* Meta del día */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-5">Meta del día — {fmtDate(hoy.fecha)}</p>
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Gauge */}
                <div className="flex flex-col items-center gap-3">
                  <GaugeDia count={hoy.prospectos} meta={meta} />
                  <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    hoy.prospectos >= meta ? "bg-green-900/30 text-green-400" :
                    hoy.prospectos >= 7 ? "bg-yellow-900/30 text-yellow-400" :
                    "bg-red-900/30 text-red-400"
                  }`}>
                    {hoy.prospectos >= meta ? "✓ Meta cumplida" : hoy.prospectos >= 7 ? "Vas a la mitad" : hoy.prospectos === 0 ? "Sin prospectos hoy" : "Por debajo de meta"}
                  </div>
                </div>
                {/* Semana */}
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Últimos 7 días</p>
                  <div className="flex items-end gap-3 justify-center md:justify-start">
                    {semana.map((d, i) => (
                      <BarraDia key={d.fecha} dia={d.dia} count={d.count} meta={meta} isToday={i === hoyIndex} />
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-600">
                    <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />≥{meta} meta</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1" />7-11 parcial</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />0-6 bajo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Histórico 6 meses */}
            {historico && historico.length > 1 && (
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Histórico — últimos 6 meses</p>
                  <div className="flex items-center gap-4 text-[10px] text-gray-600">
                    <span><span className="inline-block w-3 h-0.5 bg-[#B3985B] mr-1.5 align-middle" />Prospectados</span>
                    <span><span className="inline-block w-3 h-0.5 bg-green-500 mr-1.5 align-middle" />Cierres</span>
                  </div>
                </div>
                <LineChart datos={historico} meta={meta} />
              </div>
            )}

            {/* Scoreboard por vendedor (admin) */}
            {scoreboard.length > 0 && (
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Scoreboard del equipo</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-[#1a1a1a]">
                        <th className="text-left pb-2">Vendedor</th>
                        <th className="text-center pb-2">Hoy</th>
                        <th className="text-center pb-2">7 días</th>
                        <th className="text-center pb-2">Mes</th>
                        <th className="text-center pb-2">Oport.</th>
                        <th className="text-center pb-2">Cierres</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreboard.map(v => (
                        <tr key={v.id} className="border-b border-[#111] hover:bg-[#111]">
                          <td className="py-2.5 pr-4 font-medium text-white">{v.nombre}</td>
                          <td className="py-2.5 text-center">
                            <span className={`font-bold ${v.hoy >= meta ? "text-green-400" : v.hoy >= 7 ? "text-yellow-400" : v.hoy === 0 ? "text-gray-600" : "text-red-400"}`}>
                              {v.hoy}
                            </span>
                            <span className="text-gray-600 text-xs">/{meta}</span>
                          </td>
                          <td className="py-2.5 text-center text-gray-300">{v.semana}</td>
                          <td className="py-2.5 text-center">
                            <span className={v.mes >= metaMensual * 0.7 ? "text-[#B3985B] font-medium" : "text-gray-400"}>{v.mes}</span>
                          </td>
                          <td className="py-2.5 text-center text-blue-400">{v.oportunidadesMes}</td>
                          <td className="py-2.5 text-center text-green-400 font-semibold">{v.cierresMes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────── TAB: NURTURING ─────── */}
        {tab === "nurturing" && (
          <div className="space-y-4">
            {/* Stats rápidos */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total en nurturing", val: nurturing.total, color: "text-[#B3985B]" },
                { label: "Pendientes hoy", val: nurturing.pendienteHoy, color: nurturing.pendienteHoy > 0 ? "text-red-400" : "text-green-400" },
                { label: "Sin próxima acción", val: nurturing.sinFecha, color: nurturing.sinFecha > 0 ? "text-yellow-400" : "text-gray-400" },
              ].map(s => (
                <div key={s.label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Lista nurturing pendiente */}
            {nurturing.lista.length === 0 ? (
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-10 text-center">
                <p className="text-4xl mb-3">✓</p>
                <p className="text-white font-semibold">Sin seguimientos pendientes</p>
                <p className="text-gray-500 text-sm mt-1">Todos los prospectos tienen su próxima acción programada a futuro</p>
              </div>
            ) : (
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Seguimientos para hoy</p>
                  <span className="text-xs text-gray-500">{nurturing.lista.length} prospectos</span>
                </div>
                <div className="divide-y divide-[#111]">
                  {nurturing.lista.map(n => {
                    const overdue = n.diasRetraso > 0;
                    const isContactando = contactando === n.id;
                    return (
                      <div key={n.id} className="border-b border-[#111] last:border-0">
                        {/* Fila principal */}
                        <div className="flex items-center gap-4 px-5 py-3 hover:bg-[#0a0a0a] transition-colors group">
                          {/* Temperatura */}
                          <div className="shrink-0 w-8 text-center">
                            {n.temperatura ? (
                              <span className="text-lg">{TEMP_EMOJI[n.temperatura] ?? "•"}</span>
                            ) : (
                              <span className="text-gray-600 text-lg">•</span>
                            )}
                          </div>
                          {/* Info */}
                          <Link href={`/crm/tratos/${n.id}`} className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white text-sm font-medium truncate group-hover:text-[#B3985B] transition-colors">
                                {n.cliente}
                              </p>
                              {n.etapaNurturing && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-[#1a1a1a] text-gray-400 rounded shrink-0">
                                  {NURTURING_ETAPAS[n.etapaNurturing] ?? n.etapaNurturing}
                                </span>
                              )}
                              {n.temperatura && (
                                <span className={`text-[10px] px-1.5 py-0.5 border rounded shrink-0 ${TEMP_COLORS[n.temperatura] ?? "text-gray-500"}`}>
                                  {n.temperatura.toLowerCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {n.proximaAccion && <p className="text-xs text-gray-500 truncate">{n.proximaAccion}</p>}
                              {n.presupuesto && <span className="text-xs text-[#B3985B]/70">{fmt(n.presupuesto)}</span>}
                            </div>
                          </Link>
                          {/* Fecha / retraso */}
                          <div className="shrink-0 text-right">
                            <span className={`text-xs font-semibold ${overdue ? "text-red-400" : "text-green-400"}`}>
                              {n.diasRetraso === 0 ? "Hoy" : `${n.diasRetraso}d atrás`}
                            </span>
                            {n.responsable && <p className="text-[10px] text-gray-600 mt-0.5">{n.responsable}</p>}
                          </div>
                          {/* Botón contacté */}
                          <button
                            onClick={() => {
                              if (isContactando) { setContactando(null); } else {
                                setContactando(n.id);
                                setCForm({ nota: "", nextFecha: "", nextMotivo: "", nextEtapa: "" });
                              }
                            }}
                            className={`shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                              isContactando
                                ? "bg-[#B3985B]/20 border-[#B3985B] text-[#B3985B]"
                                : "border-[#333] text-gray-500 hover:border-[#B3985B] hover:text-[#B3985B]"
                            }`}>
                            ✓ Contacté
                          </button>
                        </div>

                        {/* Formulario inline "Contacté" */}
                        {isContactando && (() => {
                          const etapaActual = n.etapaNurturing ?? "PRIMER_CONTACTO";
                          const etapaSugerida = cForm.nextEtapa || ETAPA_SIGUIENTE[etapaActual] || etapaActual;
                          const tempResultante = ETAPA_TEMPERATURA[etapaSugerida];
                          return (
                          <div className="mx-5 mb-3 p-4 bg-[#0d0d0d] border border-[#B3985B]/30 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs text-[#B3985B] font-semibold">Registrar seguimiento — {n.cliente.split(" ·")[0]}</p>
                              {tempResultante && (
                                <span className={`text-[10px] px-2 py-0.5 border rounded font-semibold ${TEMP_COLORS[tempResultante]}`}>
                                  {TEMP_EMOJI[tempResultante]} {tempResultante.toLowerCase()}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="text-[10px] text-gray-500 block mb-1">Nota del contacto (opcional)</label>
                                <input
                                  value={cForm.nota}
                                  onChange={e => setCForm(p => ({ ...p, nota: e.target.value }))}
                                  placeholder="¿Cómo fue el contacto? ¿Qué mencionó?"
                                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500 block mb-1">Avanzar a etapa</label>
                                <select
                                  value={cForm.nextEtapa || etapaSugerida}
                                  onChange={e => setCForm(p => ({ ...p, nextEtapa: e.target.value }))}
                                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                                >
                                  {Object.entries(NURTURING_ETAPAS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}{k === etapaSugerida ? " (sugerida)" : ""}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500 block mb-1">Próximo seguimiento (motivo)</label>
                                <input
                                  value={cForm.nextMotivo}
                                  onChange={e => setCForm(p => ({ ...p, nextMotivo: e.target.value }))}
                                  placeholder="Ej: Enviar cotización, llamar en 3 días…"
                                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500 block mb-1">Fecha del próximo contacto</label>
                                <input
                                  type="date"
                                  value={cForm.nextFecha}
                                  onChange={e => setCForm(p => ({ ...p, nextFecha: e.target.value }))}
                                  className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#B3985B]"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => registrarContacto(n.id, n)}
                                disabled={savingContacto}
                                className="text-xs bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors">
                                {savingContacto ? "Guardando..." : "Guardar seguimiento"}
                              </button>
                              <button onClick={() => setContactando(null)} className="text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                                Cancelar
                              </button>
                            </div>
                          </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────── TAB: LEADS ─────── */}
        {tab === "leads" && (
          <div className="space-y-4">
            {leads.length === 0 ? (
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-10 text-center">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-white font-semibold">Sin leads asignados pendientes</p>
                <p className="text-gray-500 text-sm mt-1">Los leads asignados aparecerán aquí hasta que avancen a Oportunidad</p>
              </div>
            ) : (
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Leads asignados por gestionar</p>
                  <span className="text-xs text-gray-500">{leads.length} leads</span>
                </div>
                <div className="divide-y divide-[#111]">
                  {leads.map(l => {
                    const dias = Math.floor((Date.now() - new Date(l.createdAt).getTime()) / 86400000);
                    const noContactado = l.estatusContacto === "PENDIENTE";
                    return (
                      <Link key={l.id} href={`/crm/tratos/${l.id}`}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-[#111] transition-colors group">
                        <div className="shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            noContactado ? "bg-yellow-900/30 text-yellow-400" : "bg-blue-900/30 text-blue-400"
                          }`}>
                            {noContactado ? "Sin contactar" : "Contactado"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium group-hover:text-[#B3985B] transition-colors truncate">
                            {l.cliente}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-gray-500">{l.tipoEvento}</span>
                            {l.presupuesto && <span className="text-[10px] text-[#B3985B]/70">{fmt(l.presupuesto)}</span>}
                            {l.asignadoPor && <span className="text-[10px] text-gray-600">Asignado por {l.asignadoPor}</span>}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-gray-500">{dias === 0 ? "Hoy" : `hace ${dias}d`}</p>
                          {l.responsable && <p className="text-[10px] text-gray-600 mt-0.5">{l.responsable}</p>}
                        </div>
                        <svg className="w-4 h-4 text-gray-600 group-hover:text-[#B3985B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────── TAB: EMBUDO DEL MES ─────── */}
        {tab === "mes" && (
          <div className="space-y-5">
            {/* Funnel visual */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
              <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-5">Embudo de conversión — {mesActual}</p>
              <div className="space-y-3 max-w-md">
                {[
                  { label: "Prospectados (outbound)", value: mes.prospectados, meta: metaMensual, color: "bg-[#B3985B]", pctBase: mes.prospectados },
                  { label: "Avanzaron a Oportunidad", value: mes.oportunidades, meta: null, color: "bg-blue-500", pctBase: mes.prospectados },
                  { label: "Ventas cerradas", value: mes.cierres, meta: null, color: "bg-green-500", pctBase: mes.prospectados },
                  { label: "Perdidos", value: mes.perdidos, meta: null, color: "bg-red-500/60", pctBase: mes.prospectados },
                ].map((row, i) => {
                  const pct = row.pctBase > 0 ? Math.min(100, (row.value / row.pctBase) * 100) : 0;
                  const displayPct = i === 0 && row.meta ? Math.min(100, (row.value / row.meta) * 100) : pct;
                  const convRate = i > 0 && mes.prospectados > 0 ? ((row.value / mes.prospectados) * 100).toFixed(1) : null;
                  return (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">{row.label}</span>
                        <div className="flex items-center gap-2">
                          {convRate && <span className="text-[10px] text-gray-600">{convRate}% conv.</span>}
                          <span className="text-sm font-bold text-white">{row.value}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${row.color}`}
                          style={{ width: `${displayPct}%` }}
                        />
                      </div>
                      {i === 0 && row.meta && (
                        <p className="text-[10px] text-gray-600 mt-0.5">Meta mensual: {row.meta} · {displayPct.toFixed(0)}% alcanzado</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Monto cerrado */}
              {mes.montoCierres > 0 && (
                <div className="mt-6 pt-5 border-t border-[#1a1a1a]">
                  <p className="text-xs text-gray-500 mb-1">Monto total de cierres del mes</p>
                  <p className="text-3xl font-bold text-green-400">{fmt(mes.montoCierres)}</p>
                </div>
              )}
            </div>

            {/* Scoreboard por vendedor (admin) */}
            {scoreboard.length > 0 && (
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
                <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-4">Resultados del mes por vendedor</p>
                <div className="space-y-3">
                  {scoreboard.sort((a, b) => b.mes - a.mes).map(v => {
                    const convPct = v.mes > 0 ? ((v.cierresMes / v.mes) * 100).toFixed(0) : "0";
                    return (
                      <div key={v.id} className="flex items-center gap-3 p-3 bg-[#111] rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{v.nombre}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-gray-500">{v.mes} prospectados</span>
                            <span className="text-[10px] text-blue-400">{v.oportunidadesMes} oport.</span>
                            <span className="text-[10px] text-green-400 font-semibold">{v.cierresMes} cierres</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-[#B3985B]">{convPct}%</p>
                          <p className="text-[10px] text-gray-600">conversión</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
