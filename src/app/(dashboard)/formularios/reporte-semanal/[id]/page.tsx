"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

interface TareaItem {
  titulo: string;
  fechaVencimiento: string | null;
}
interface Incidencia {
  que: string;
  causa: string;
  propuesta: string;
}
interface Reporte {
  id: string;
  semana: number;
  anio: number;
  logros: string;
  pendientes: string;
  tareas: TareaItem[];
  incidencias: Incidencia[];
  mejoras: string;
  compromisos: string;
  sugerencias: string;
  bienestar: number;
  estado: string;
  createdAt: string;
  user: { id: string; name: string; area: string | null };
}

const BIENESTAR_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: "Muy pesado 1/10",  color: "bg-red-900/30 text-red-400 border-red-900/40" },
  2: { label: "Muy pesado 2/10",  color: "bg-red-900/30 text-red-400 border-red-900/40" },
  3: { label: "Pesado 3/10",      color: "bg-orange-900/30 text-orange-400 border-orange-900/40" },
  4: { label: "Pesado 4/10",      color: "bg-orange-900/30 text-orange-400 border-orange-900/40" },
  5: { label: "Regular 5/10",     color: "bg-yellow-900/30 text-yellow-400 border-yellow-900/40" },
  6: { label: "Regular 6/10",     color: "bg-yellow-900/30 text-yellow-400 border-yellow-900/40" },
  7: { label: "Bien 7/10",        color: "bg-blue-900/30 text-blue-400 border-blue-900/40" },
  8: { label: "Muy bien 8/10",    color: "bg-blue-900/30 text-blue-400 border-blue-900/40" },
  9: { label: "Excelente 9/10",   color: "bg-green-900/30 text-green-400 border-green-900/40" },
  10: { label: "Excelente 10/10", color: "bg-green-900/30 text-green-400 border-green-900/40" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("es-MX", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-[#B3985B] uppercase tracking-wider font-semibold mb-2">{label}</p>
      <div className="text-gray-300 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export default function ReporteDetalleePage() {
  const params = useParams();
  const toast = useToast();
  const id = params.id as string;

  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/formularios/reporte-semanal/${id}`, { cache: "no-store" })
      .then((r) => {
        if (r.status === 404 || r.status === 403) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => { if (d?.reporte) setReporte(d.reporte); })
      .catch(() => toast.error("Error al cargar el reporte"))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#B3985B] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando reporte...</p>
        </div>
      </div>
    );
  }

  if (notFound || !reporte) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <p className="text-4xl mb-4">🔒</p>
        <p className="text-white font-semibold mb-2">Reporte no encontrado</p>
        <p className="text-gray-500 text-sm mb-6">Este reporte no existe o no tienes acceso.</p>
        <Link href="/formularios/reporte-semanal" className="text-[#B3985B] hover:underline text-sm">
          ← Volver al historial
        </Link>
      </div>
    );
  }

  const bw = BIENESTAR_LABEL[reporte.bienestar] ?? { label: `${reporte.bienestar}/10`, color: "bg-gray-800 text-gray-400 border-gray-700" };
  const tareas = Array.isArray(reporte.tareas) ? reporte.tareas : [];
  const incidencias = Array.isArray(reporte.incidencias) ? reporte.incidencias : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

      {/* Breadcrumb y acciones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px]">
          <Link href="/formularios" className="text-gray-600 hover:text-[#B3985B] transition-colors">Formularios</Link>
          <span className="text-gray-700">/</span>
          <Link href="/formularios/reporte-semanal" className="text-gray-600 hover:text-[#B3985B] transition-colors">Reportes</Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-500">S{reporte.semana} · {reporte.anio}</span>
        </div>
        <Link
          href="/formularios/reporte-semanal"
          className="text-xs text-gray-500 hover:text-white border border-[#2a2a2a] hover:border-[#444] px-3 py-1.5 rounded-lg transition-colors"
        >
          ← Volver
        </Link>
      </div>

      {/* Header del reporte */}
      <div className="bg-gradient-to-br from-[#B3985B]/10 to-[#0d0d0d] border border-[#B3985B]/20 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] text-[#B3985B] uppercase tracking-widest font-semibold mb-1">
              Reporte General Semanal
            </p>
            {/* Nombre como título principal */}
            <h1 className="text-xl font-bold text-white">Reporte de {reporte.user.name}</h1>
            <p className="text-gray-500 text-xs mt-1">
              Semana {reporte.semana} · {reporte.anio}
              {reporte.user.area && <span className="ml-2 text-gray-600">· {reporte.user.area}</span>}
            </p>
            <p className="text-gray-600 text-[10px] mt-0.5">{fmtDate(reporte.createdAt)}</p>
          </div>
          <div>
            <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${bw.color}`}>
              {bw.label}
            </span>
          </div>
        </div>
      </div>

      {/* Secciones del reporte */}
      <div className="space-y-4">

        {/* Logros */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
          <Field label="Logros de la semana anterior">
            <p className="whitespace-pre-wrap">{reporte.logros || <span className="text-gray-700 italic">Sin registrar</span>}</p>
          </Field>
        </div>

        {/* Pendientes */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
          <Field label="Pendientes de la semana anterior">
            <p className="whitespace-pre-wrap">{reporte.pendientes || <span className="text-gray-700 italic">Sin registrar</span>}</p>
          </Field>
        </div>

        {/* Tareas comprometidas */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
          <Field label={`Tareas para la próxima semana (${tareas.length})`}>
            {tareas.length === 0 ? (
              <p className="text-gray-700 italic text-sm">Sin tareas registradas</p>
            ) : (
              <div className="space-y-2 mt-1">
                {tareas.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5">
                    <span className="text-gray-700 text-xs w-5 shrink-0">{i + 1}.</span>
                    <span className="flex-1 text-gray-300 text-sm">{t.titulo}</span>
                    {t.fechaVencimiento && (
                      <span className="text-[10px] text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/20 px-2 py-0.5 rounded-full shrink-0">
                        {fmtDateShort(t.fechaVencimiento)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Field>
        </div>

        {/* Incidencias */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
          <Field label={`Incidencias (${incidencias.filter(i => i.que || i.causa || i.propuesta).length})`}>
            {incidencias.filter(i => i.que || i.causa || i.propuesta).length === 0 ? (
              <p className="text-gray-700 italic text-sm">Sin incidencias registradas</p>
            ) : (
              <div className="space-y-3 mt-1">
                {incidencias.filter(i => i.que || i.causa || i.propuesta).map((inc, i) => (
                  <div key={i} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 space-y-2">
                    <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">
                      Incidencia {i + 1}
                    </p>
                    {inc.que && (
                      <div>
                        <p className="text-[10px] text-gray-600 mb-0.5">¿Qué pasó?</p>
                        <p className="text-gray-300 text-xs whitespace-pre-wrap">{inc.que}</p>
                      </div>
                    )}
                    {inc.causa && (
                      <div>
                        <p className="text-[10px] text-gray-600 mb-0.5">Causa raíz</p>
                        <p className="text-gray-300 text-xs whitespace-pre-wrap">{inc.causa}</p>
                      </div>
                    )}
                    {inc.propuesta && (
                      <div>
                        <p className="text-[10px] text-gray-600 mb-0.5">Propuesta de corrección</p>
                        <p className="text-gray-300 text-xs whitespace-pre-wrap">{inc.propuesta}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Field>
        </div>

        {/* Mejoras */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
          <Field label="Mejoras observadas en otras áreas">
            <p className="whitespace-pre-wrap">{reporte.mejoras || <span className="text-gray-700 italic">Sin registrar</span>}</p>
          </Field>
        </div>

        {/* Compromisos */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
          <Field label="Compromisos de mejora personal">
            <p className="whitespace-pre-wrap">{reporte.compromisos || <span className="text-gray-700 italic">Sin registrar</span>}</p>
          </Field>
        </div>

        {/* Sugerencias */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
          <Field label="Comentarios / solicitudes / sugerencias a dirección">
            <p className="whitespace-pre-wrap">{reporte.sugerencias || <span className="text-gray-700 italic">Sin registrar</span>}</p>
          </Field>
        </div>

        {/* Bienestar visual */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
          <Field label="Estado de inicio de semana">
            <div className="flex items-center gap-4 mt-1">
              <div className="flex gap-1">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <div
                    key={n}
                    className={`w-6 h-6 rounded-md text-[10px] font-semibold flex items-center justify-center transition-all ${
                      n <= reporte.bienestar
                        ? "bg-[#B3985B] text-black"
                        : "bg-[#1a1a1a] text-gray-700"
                    }`}
                  >
                    {n}
                  </div>
                ))}
              </div>
              <span className={`text-sm font-semibold ${bw.color.split(" ").find(c => c.startsWith("text-"))}`}>
                {bw.label}
              </span>
            </div>
          </Field>
        </div>

      </div>

      {/* Footer */}
      <div className="text-center pb-8">
        <p className="text-gray-700 text-xs">Reporte enviado el {fmtDate(reporte.createdAt)}</p>
        <Link href="/formularios/reporte-semanal" className="inline-block mt-3 text-xs text-[#B3985B] hover:underline">
          ← Volver al historial
        </Link>
      </div>

    </div>
  );
}
