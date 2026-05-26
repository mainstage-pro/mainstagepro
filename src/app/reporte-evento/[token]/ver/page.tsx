"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Incidencia { descripcion: string; impacto: string; resolucion: string }

interface Reporte {
  estado: string;
  coordinadorNombre: string | null;
  respondidoEn: string | null;
  proyectoNombre: string;
  numeroProyecto: string;
  clienteNombre: string;
  fechaEvento: string | null;
  // Bloque 1
  llegadaPlaneada: string | null; llegadaReal: string | null;
  montajePlaneado: string | null; montajeReal: string | null;
  inicioProgramado: string | null; inicioReal: string | null;
  salidaPlaneada: string | null; salidaReal: string | null;
  seEjecutoSegunPlan: string | null;
  // Bloque 2
  fallasEquipo: string[]; equipoMantenimiento: string[]; herramientasFaltantes: string[];
  // Bloque 3
  briefCompleto: string | null; cambiosUltimoMomento: boolean | null; descripcionCambios: string | null;
  // Bloque 4
  calificacionEquipo: number | null; puntosPositivos: string | null; areasMejora: string | null;
  // Bloque 5
  incidencias: Incidencia[];
  // Bloque 6
  equipoRegreso: string | null; faltantesDescripcion: string | null;
  aprendizajeClave: string | null; loRepetiriamos: string | null;
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-[#1e1e1e]">
        <p className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-200 flex-1">{value}</span>
    </div>
  );
}

function HoraRow({ label, planeado, real }: { label: string; planeado: string | null; real: string | null }) {
  if (!planeado && !real) return null;
  return (
    <div className="flex gap-3 items-center">
      <span className="text-xs text-gray-500 w-36 shrink-0">{label}</span>
      <div className="flex gap-4 flex-1">
        {planeado && <span className="text-xs text-gray-400">Plan: <span className="text-gray-300 font-mono">{planeado}</span></span>}
        {real && <span className="text-xs text-gray-400">Real: <span className={`font-mono font-semibold ${real > (planeado ?? "") ? "text-red-400" : "text-green-400"}`}>{real}</span></span>}
      </div>
    </div>
  );
}

function TagList({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-300 flex items-center gap-2">
            <span className="text-[#B3985B]">·</span> {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const EJECUTO_LABELS: Record<string, string> = { si: "Sí, según el plan", ajustes: "Con ajustes menores", no: "No" };
const BRIEF_LABELS: Record<string, string> = { si: "Completo", incompleto: "Incompleto", no: "No había brief" };
const IMPACTO_COLORS: Record<string, string> = { alto: "bg-red-900/40 text-red-400", medio: "bg-yellow-900/40 text-yellow-300", bajo: "bg-gray-800 text-gray-400" };

export default function ReporteVerPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This page needs auth — redirect if not logged in happens server-side via middleware
    fetch(`/api/reporte-evento/${token}/detalle`)
      .then(r => { if (!r.ok) { router.push(`/login`); return null; } return r.json(); })
      .then(d => { if (d) setReporte(d); setLoading(false); });
  }, [token, router]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-gray-500 text-sm">Cargando reporte...</p>
    </div>
  );

  if (!reporte) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-gray-500 text-sm">Reporte no encontrado.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-xs text-gray-500 hover:text-white mb-4 transition-colors">
            ← Volver al proyecto
          </button>
          <h1 className="text-xl font-bold text-white">{reporte.proyectoNombre}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {reporte.clienteNombre} · {fmtDate(reporte.fechaEvento)}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs px-2 py-1 rounded-full bg-green-900/40 text-green-400 font-semibold">Completado</span>
            {reporte.respondidoEn && (
              <span className="text-xs text-gray-500">
                Enviado el {new Date(reporte.respondidoEn).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            )}
            {reporte.coordinadorNombre && (
              <span className="text-xs text-gray-500">por {reporte.coordinadorNombre}</span>
            )}
          </div>
        </div>

        {/* Bloque 1 — Horarios */}
        <Block title="1. Horarios — planeado vs real">
          <HoraRow label="Llegada al venue" planeado={reporte.llegadaPlaneada} real={reporte.llegadaReal} />
          <HoraRow label="Inicio de montaje" planeado={reporte.montajePlaneado} real={reporte.montajeReal} />
          <HoraRow label="Inicio del evento" planeado={reporte.inicioProgramado} real={reporte.inicioReal} />
          <HoraRow label="Salida / desmontaje" planeado={reporte.salidaPlaneada} real={reporte.salidaReal} />
          {reporte.seEjecutoSegunPlan && (
            <Row label="Ejecución según plan" value={EJECUTO_LABELS[reporte.seEjecutoSegunPlan] ?? reporte.seEjecutoSegunPlan} />
          )}
        </Block>

        {/* Bloque 2 — Equipos */}
        <Block title="2. Equipos">
          <TagList label="Fallas de equipo" items={reporte.fallasEquipo} />
          <TagList label="Requieren mantenimiento" items={reporte.equipoMantenimiento} />
          <TagList label="Herramientas / accesorios faltantes" items={reporte.herramientasFaltantes} />
          {!reporte.fallasEquipo?.length && !reporte.equipoMantenimiento?.length && !reporte.herramientasFaltantes?.length && (
            <p className="text-sm text-gray-500 italic">Sin observaciones de equipo</p>
          )}
        </Block>

        {/* Bloque 3 — Información */}
        <Block title="3. Información y planeación">
          {reporte.briefCompleto && <Row label="Brief" value={BRIEF_LABELS[reporte.briefCompleto] ?? reporte.briefCompleto} />}
          {reporte.cambiosUltimoMomento != null && (
            <Row label="Cambios de último momento" value={reporte.cambiosUltimoMomento ? "Sí" : "No"} />
          )}
          {reporte.descripcionCambios && <Row label="Descripción de cambios" value={reporte.descripcionCambios} />}
        </Block>

        {/* Bloque 4 — Equipo técnico */}
        <Block title="4. Equipo técnico">
          {reporte.calificacionEquipo && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-36 shrink-0">Calificación general</span>
              <span className={`text-2xl font-bold ${reporte.calificacionEquipo >= 8 ? "text-green-400" : reporte.calificacionEquipo >= 6 ? "text-[#B3985B]" : "text-red-400"}`}>
                {reporte.calificacionEquipo}<span className="text-sm text-gray-500 font-normal">/10</span>
              </span>
            </div>
          )}
          {reporte.puntosPositivos && <Row label="Puntos positivos" value={reporte.puntosPositivos} />}
          {reporte.areasMejora && <Row label="Áreas de mejora" value={reporte.areasMejora} />}
        </Block>

        {/* Bloque 5 — Incidencias */}
        {reporte.incidencias?.length > 0 && (
          <Block title={`5. Incidencias (${reporte.incidencias.length})`}>
            {reporte.incidencias.map((inc, i) => (
              <div key={i} className="bg-[#0d0d0d] rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${IMPACTO_COLORS[inc.impacto] ?? "bg-gray-800 text-gray-400"}`}>
                    {inc.impacto}
                  </span>
                </div>
                <p className="text-sm text-gray-200">{inc.descripcion}</p>
                {inc.resolucion && (
                  <p className="text-xs text-gray-500">Resolución: <span className="text-gray-400">{inc.resolucion}</span></p>
                )}
              </div>
            ))}
          </Block>
        )}

        {/* Bloque 6 — Cierre */}
        <Block title="6. Cierre">
          {reporte.equipoRegreso && (
            <Row label="Equipo" value={reporte.equipoRegreso === "completo" ? "Regresó completo" : "Con faltantes"} />
          )}
          {reporte.faltantesDescripcion && <Row label="Faltantes" value={reporte.faltantesDescripcion} />}
          {reporte.aprendizajeClave && <Row label="Aprendizaje clave" value={reporte.aprendizajeClave} />}
          {reporte.loRepetiriamos && (
            <Row label="¿Lo repetiríamos?" value={reporte.loRepetiriamos === "si" ? "Sí" : reporte.loRepetiriamos === "ajustes" ? "Con ajustes" : "No"} />
          )}
        </Block>

      </div>
    </div>
  );
}
