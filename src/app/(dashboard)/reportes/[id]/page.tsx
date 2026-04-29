"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { type ReporteData, generarMensajeWhatsApp, fmtMXN } from "@/lib/reportes";
import { useToast } from "@/components/Toast";

const CEO_WHATSAPP = "524461432565";

type Reporte = {
  id: string;
  semana: string;
  fechaInicio: string;
  fechaFin: string;
  score: number;
  datos: string;
  notas: string | null;
  generadoEn: string;
};

function fmt(iso: string) {
  const [y, m, d] = iso.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

function ScoreBar({ pts, max, label, color }: { pts: number; max: number; label: string; color: string }) {
  const pct = Math.round((pts / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-400 text-xs">{label}</span>
        <span className="text-white text-xs font-semibold">{pts}/{max}</span>
      </div>
      <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, subColor = "text-gray-500" }: { label: string; value: string | number; sub?: string; subColor?: string }) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#555] font-semibold mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className={`text-[11px] mt-0.5 ${subColor}`}>{sub}</p>}
    </div>
  );
}

function SectionHeader({ label, emoji }: { label: string; emoji: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-base">{emoji}</span>
      <p className="text-[11px] font-bold text-[#555] uppercase tracking-widest">{label}</p>
      <div className="flex-1 h-px bg-[#1a1a1a]" />
    </div>
  );
}

export default function ReporteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [notas, setNotas] = useState("");
  const [savingNotas, setSavingNotas] = useState(false);
  const [notasSaved, setNotasSaved] = useState(false);

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/reportes/${id}`, { cache: "no-store" });
    const d = await r.json();
    setReporte(d.reporte);
    setNotas(d.reporte?.notas || "");
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardarNotas = async () => {
    if (!reporte) return;
    setSavingNotas(true);
    const res = await fetch(`/api/reportes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notas }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSavingNotas(false);
      return;
    }
    setSavingNotas(false);
    setNotasSaved(true);
    setTimeout(() => setNotasSaved(false), 2000);
  };

  if (loading) return <div className="p-6 text-center text-gray-600 text-sm">Cargando reporte...</div>;
  if (!reporte) return <div className="p-6 text-center text-gray-600">Reporte no encontrado.</div>;

  const datos: ReporteData = JSON.parse(reporte.datos);
  const score = datos.score;
  const scoreColor = score.total >= 80 ? "text-green-400" : score.total >= 60 ? "text-yellow-400" : "text-red-400";
  const ringColor  = score.total >= 80 ? "border-green-600/50" : score.total >= 60 ? "border-yellow-600/50" : "border-red-600/50";

  const waMsg = generarMensajeWhatsApp(datos);
  const waUrl = `https://wa.me/${CEO_WHATSAPP}?text=${encodeURIComponent(waMsg)}`;

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6 print:p-4">
      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <Link href="/reportes" className="text-[#B3985B] text-xs hover:underline mb-1 block">← Todos los reportes</Link>
          <h1 className="text-xl font-semibold text-white">
            Semana {datos.periodo.semana} · {datos.periodo.año}
          </h1>
          <p className="text-gray-500 text-sm">{fmt(reporte.fechaInicio)} — {fmt(reporte.fechaFin)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => window.print()}
            className="text-gray-500 hover:text-white text-sm border border-[#222] px-3 py-2 rounded-lg transition-colors hover:border-[#444]">
            🖨 Imprimir
          </button>
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="bg-green-700 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.528 5.855L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.964-1.342l-.356-.212-3.762.98 1.003-3.659-.233-.374A9.818 9.818 0 1112 21.818z"/>
            </svg>
            Enviar a WhatsApp
          </a>
        </div>
      </div>

      {/* ── Score global ──────────────────────────────────────────────────── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-6">
        <div className="flex items-center gap-6 mb-5">
          <div className={`w-20 h-20 rounded-full border-4 ${ringColor} flex items-center justify-center shrink-0`}>
            <div className="text-center">
              <p className={`text-2xl font-bold leading-none ${scoreColor}`}>{score.total}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">de 100</p>
            </div>
          </div>
          <div className="flex-1">
            <p className={`text-lg font-semibold ${scoreColor} mb-0.5`}>
              {score.total >= 80 ? "El negocio va excelente" : score.total >= 60 ? "El negocio va bien" : "Requiere atención"}
            </p>
            <p className="text-gray-500 text-sm">Score compuesto de 6 áreas del negocio</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <ScoreBar pts={score.ventas.pts}     max={score.ventas.max}     label="Ventas"     color="bg-blue-500" />
          <ScoreBar pts={score.finanzas.pts}   max={score.finanzas.max}   label="Finanzas"   color="bg-green-500" />
          <ScoreBar pts={score.produccion.pts} max={score.produccion.max} label="Producción" color="bg-[#B3985B]" />
          <ScoreBar pts={score.marketing.pts}  max={score.marketing.max}  label="Marketing"  color="bg-purple-500" />
          <ScoreBar pts={score.rrhh.pts}       max={score.rrhh.max}       label="RRHH"       color="bg-pink-500" />
          <ScoreBar pts={score.socios.pts}     max={score.socios.max}     label="Socios"     color="bg-orange-500" />
        </div>
      </div>

      {/* ── Highlights + Alertas ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-3">✅ Highlights</p>
          {datos.highlights.length === 0 ? (
            <p className="text-gray-600 text-sm">Sin highlights esta semana.</p>
          ) : (
            <ul className="space-y-2">
              {datos.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-green-500 mt-0.5 shrink-0">✓</span> {h}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-3">⚠️ Alertas</p>
          {datos.alertas.length === 0 ? (
            <p className="text-gray-600 text-sm">Sin alertas críticas. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {datos.alertas.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-300">
                  <span className="text-red-500 mt-0.5 shrink-0">!</span> {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── VENTAS ─────────────────────────────────────────────────────────── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
        <SectionHeader label="Ventas" emoji="📈" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Pipeline activo"     value={datos.ventas.pipelineActivo} sub="tratos en curso" />
          <Kpi label="Valor del pipeline"  value={fmtMXN(datos.ventas.valorPipeline)} sub="presupuesto estimado" subColor="text-[#B3985B]" />
          <Kpi label="Tasa de conversión"  value={`${datos.ventas.tasaConversion}%`}
            sub={`${datos.ventas.tratosCerrados} cerrados · ${datos.ventas.tratosPerdidos} perdidos`}
            subColor={datos.ventas.tasaConversion >= 50 ? "text-green-400" : datos.ventas.tasaConversion >= 30 ? "text-yellow-400" : "text-red-400"} />
          <Kpi label="Tratos nuevos (sem)" value={datos.ventas.tratosNuevos} sub="ingresados esta semana" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Kpi label="Cotizaciones enviadas"  value={datos.ventas.cotizacionesEnviadas}  sub="esta semana" />
          <Kpi label="Cotizaciones aprobadas" value={datos.ventas.cotizacionesAprobadas}
            sub={datos.ventas.valorCotizacionesAprobadas > 0 ? fmtMXN(datos.ventas.valorCotizacionesAprobadas) : "—"}
            subColor="text-green-400" />
          <Kpi label="Seguimientos vencidos" value={datos.ventas.seguimientosVencidos}
            subColor={datos.ventas.seguimientosVencidos > 0 ? "text-red-400" : "text-green-400"}
            sub={datos.ventas.seguimientosVencidos === 0 ? "Al día ✓" : "requieren acción"} />
        </div>
      </div>

      {/* ── FINANZAS ───────────────────────────────────────────────────────── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
        <SectionHeader label="Finanzas" emoji="💰" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Ingresos del mes"  value={fmtMXN(datos.finanzas.ingresosMes)} subColor="text-green-400" sub="registrados" />
          <Kpi label="Gastos del mes"    value={fmtMXN(datos.finanzas.gastosMes)}   subColor="text-red-400"   sub="registrados" />
          <Kpi label="Flujo neto mes"    value={fmtMXN(datos.finanzas.ingresosMes - datos.finanzas.gastosMes)}
            subColor={(datos.finanzas.ingresosMes - datos.finanzas.gastosMes) >= 0 ? "text-green-400" : "text-red-400"}
            sub={(datos.finanzas.ingresosMes - datos.finanzas.gastosMes) >= 0 ? "positivo" : "negativo"} />
          <Kpi label="Disponible bancos" value={fmtMXN(datos.finanzas.disponibleBancos)} sub="saldo total" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Kpi label="CxC pendiente" value={fmtMXN(datos.finanzas.cxcTotal)}
            sub={datos.finanzas.cxcVencidas > 0 ? `${datos.finanzas.cxcVencidas} vencidas` : "Sin vencidas ✓"}
            subColor={datos.finanzas.cxcVencidas > 0 ? "text-red-400" : "text-green-400"} />
          <Kpi label="CxP pendiente"    value={fmtMXN(datos.finanzas.cxpTotal)}
            sub={`${datos.finanzas.cxpVence7dias} vencen en 7d`}
            subColor={datos.finanzas.cxpVence7dias > 0 ? "text-yellow-400" : "text-gray-500"} />
          <Kpi label="HERVAM"
            value={datos.finanzas.hervamEstado ?? "Sin registro"}
            sub={datos.finanzas.hervamMontoAcordado > 0 ? `Acordado: ${fmtMXN(datos.finanzas.hervamMontoAcordado)}` : "—"}
            subColor={datos.finanzas.hervamEstado === "PAGADO" ? "text-green-400" : datos.finanzas.hervamEstado === "PENDIENTE" ? "text-red-400" : "text-gray-500"} />
        </div>
      </div>

      {/* ── PRODUCCIÓN ─────────────────────────────────────────────────────── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
        <SectionHeader label="Producción" emoji="🎪" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Proyectos activos"    value={datos.produccion.proyectosActivos}    sub="en operación" />
          <Kpi label="Completados (semana)" value={datos.produccion.proyectosCompletadosSemana} sub="esta semana" subColor="text-green-400" />
          <Kpi label="Eventos esta semana"  value={datos.produccion.eventosSemana}        sub="programados" />
          <Kpi label="Próximos 7 días"      value={datos.produccion.eventosProximos7}     sub="eventos por venir" subColor="text-[#B3985B]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Kpi label="Sin personal confirmado" value={datos.produccion.proyectosSinPersonal}
            sub={datos.produccion.proyectosSinPersonal === 0 ? "Todo confirmado ✓" : "próximos 30 días"}
            subColor={datos.produccion.proyectosSinPersonal > 0 ? "text-red-400" : "text-green-400"} />
          <Kpi label="Equipos en mant." value={datos.produccion.equiposMantenimiento}
            sub={datos.produccion.equiposMantenimiento === 0 ? "Operativos ✓" : "fuera de servicio"}
            subColor={datos.produccion.equiposMantenimiento > 0 ? "text-yellow-400" : "text-green-400"} />
          <Kpi label="Órdenes pendientes" value={datos.produccion.ordenesPendientes}
            sub={datos.produccion.ordenesPendientes === 0 ? "Al día ✓" : "por procesar"}
            subColor={datos.produccion.ordenesPendientes > 0 ? "text-yellow-400" : "text-green-400"} />
        </div>
      </div>

      {/* ── MARKETING ─────────────────────────────────────────────────────── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
        <SectionHeader label="Marketing" emoji="📣" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Publicaciones del mes" value={datos.marketing.publicacionesMes} sub="programadas" />
          <Kpi label="Publicadas"            value={datos.marketing.publicadasMes}    sub="en el mes" subColor="text-green-400" />
          <Kpi label="Cumplimiento"          value={`${datos.marketing.pctCumplimiento}%`}
            subColor={datos.marketing.pctCumplimiento >= 80 ? "text-green-400" : datos.marketing.pctCumplimiento >= 50 ? "text-yellow-400" : "text-red-400"}
            sub={datos.marketing.pctCumplimiento >= 80 ? "excelente" : datos.marketing.pctCumplimiento >= 50 ? "regular" : "bajo"} />
          <Kpi label="Pendientes"            value={datos.marketing.pendientes}
            sub="por preparar / publicar"
            subColor={datos.marketing.pendientes > 0 ? "text-yellow-400" : "text-green-400"} />
        </div>
      </div>

      {/* ── RRHH ──────────────────────────────────────────────────────────── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
        <SectionHeader label="Recursos Humanos" emoji="👥" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Nómina pendiente"      value={fmtMXN(datos.rrhh.nominaPendiente)}
            sub={datos.rrhh.nominaPendiente === 0 ? "Al día ✓" : "por pagar"}
            subColor={datos.rrhh.nominaPendiente > 0 ? "text-yellow-400" : "text-green-400"} />
          <Kpi label="Incidencias abiertas"  value={datos.rrhh.incidenciasAbiertas}
            sub={datos.rrhh.incidenciasAbiertas === 0 ? "Sin incidencias ✓" : "activas"}
            subColor={datos.rrhh.incidenciasAbiertas > 0 ? "text-red-400" : "text-green-400"} />
          <Kpi label="Evaluaciones pend."    value={datos.rrhh.evaluacionesPendientes}
            sub={datos.rrhh.evaluacionesPendientes === 0 ? "Al día ✓" : "por completar"}
            subColor={datos.rrhh.evaluacionesPendientes > 0 ? "text-yellow-400" : "text-green-400"} />
          <Kpi label="Asistencias (semana)"  value={datos.rrhh.asistenciasSemana} sub="registradas" />
        </div>
      </div>

      {/* ── SOCIOS ─────────────────────────────────────────────────────────── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
        <SectionHeader label="Socios de Activos" emoji="🤝" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Kpi label="Socios activos"        value={datos.socios.sociosActivos}     sub={`${datos.socios.sociosEnRevision} en revisión`} />
          <Kpi label="Facturado del mes"     value={fmtMXN(datos.socios.facturadoMes)} sub="total operación" subColor="text-[#B3985B]" />
          <Kpi label="Comisión Mainstage"    value={fmtMXN(datos.socios.aMainstageMes)} sub="del mes" subColor="text-green-400" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Kpi label="Pagado a socios"       value={fmtMXN(datos.socios.aSociosMes)} sub="del mes" />
          <Kpi label="Reportes pendientes"   value={datos.socios.reportesPendientes}
            sub={datos.socios.reportesPendientes === 0 ? "Al día ✓" : "sin pagar"}
            subColor={datos.socios.reportesPendientes > 0 ? "text-yellow-400" : "text-green-400"} />
          <Kpi label="Contratos por vencer"  value={datos.socios.contratosVencen30}
            sub="en los próximos 30 días"
            subColor={datos.socios.contratosVencen30 > 0 ? "text-orange-400" : "text-green-400"} />
        </div>
      </div>

      {/* ── Notas del CEO ─────────────────────────────────────────────────── */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 print:hidden">
        <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider mb-3">✏ Notas de reunión / análisis</p>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={5}
          placeholder="Agrega aquí tus observaciones, decisiones tomadas, compromisos del equipo..."
          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-[#B3985B] placeholder:text-gray-700"
        />
        <div className="flex items-center gap-3 mt-3">
          <button onClick={guardarNotas} disabled={savingNotas}
            className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            {savingNotas ? "Guardando..." : "Guardar notas"}
          </button>
          {notasSaved && <span className="text-green-400 text-xs">Guardado ✓</span>}
        </div>
      </div>

      {/* ── Print: notas ─────────────────────────────────────────────────── */}
      {notas && (
        <div className="hidden print:block bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-3">Notas</p>
          <p className="text-sm whitespace-pre-wrap">{notas}</p>
        </div>
      )}

      {/* ── Footer print ─────────────────────────────────────────────────── */}
      <div className="hidden print:flex items-center justify-between text-xs text-gray-600 pt-4 border-t border-[#1e1e1e]">
        <span>Mainstage Pro · Reporte Semana {datos.periodo.semana} · {datos.periodo.año}</span>
        <span>Generado {new Date(reporte.generadoEn).toLocaleDateString("es-MX")}</span>
      </div>

      <style jsx global>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:flex { display: flex !important; }
          .bg-\\[\\#111\\] { background: #f9f9f9 !important; border-color: #ddd !important; }
          .bg-\\[\\#0d0d0d\\] { background: #f0f0f0 !important; }
          .text-white { color: #111 !important; }
          .text-gray-400, .text-gray-500, .text-gray-600 { color: #555 !important; }
          .text-\\[\\#B3985B\\] { color: #8a6e3e !important; }
        }
      `}</style>
    </div>
  );
}
