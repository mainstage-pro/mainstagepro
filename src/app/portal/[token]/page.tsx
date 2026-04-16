"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

interface Linea {
  tipo: string;
  descripcion: string;
  cantidad: number;
  dias: number;
  esIncluido: boolean;
}

interface CuentaCobrar {
  concepto: string;
  monto: number;
  montoCobrado: number | null;
  estado: string;
  fechaCompromiso: string | null;
  tipoPago: string | null;
}

interface Proyecto {
  id: string;
  nombre: string;
  numeroProyecto: string;
  estado: string;
  tipoEvento: string | null;
  fechaEvento: string | null;
  horaInicioEvento: string | null;
  horaFinEvento: string | null;
  fechaMontaje: string | null;
  horaInicioMontaje: string | null;
  lugarEvento: string | null;
  descripcionGeneral: string | null;
  notasPortal: string | null;
  cliente: { nombre: string; empresa: string | null };
  encargado: { name: string } | null;
  personal: { tecnico: { nombre: string } | null; rolTecnico: { nombre: string } | null }[];
  cotizacion: {
    id: string;
    numeroCotizacion: string;
    granTotal: number;
    estado: string;
    aprobacionFecha: string | null;
    lineas: Linea[];
  } | null;
  cuentasCobrar: CuentaCobrar[];
}

const ETAPAS = ["PLANEACION", "CONFIRMADO", "EN_CURSO", "COMPLETADO"];
const ETAPA_LABEL: Record<string, string> = {
  PLANEACION: "Planeación",
  CONFIRMADO: "Confirmado",
  EN_CURSO: "En evento",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

function formatDate(d: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", opts ?? { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function formatMXN(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });
}

const PAGO_ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: "text-yellow-400",
  PARCIAL: "text-blue-400",
  PAGADO: "text-green-400",
  CANCELADO: "text-red-400",
};

export default function PortalCliente() {
  const { token } = useParams<{ token: string }>();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setProyecto(d.proyecto);
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !proyecto) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-4">
      <Image src="/logo-white.png" alt="Mainstage Pro" width={140} height={36} className="object-contain opacity-60" />
      <p className="text-gray-500 text-sm mt-4">Este enlace no es válido o ha expirado.</p>
      <p className="text-gray-700 text-xs">Contacta a tu coordinador para obtener un nuevo enlace.</p>
    </div>
  );

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const ahora = new Date();
  const fechaEvento = proyecto.fechaEvento ? new Date(proyecto.fechaEvento) : null;
  const diasRestantes = fechaEvento
    ? Math.ceil((fechaEvento.getTime() - ahora.getTime()) / 86400000)
    : null;

  const totalPorCobrar = proyecto.cuentasCobrar.reduce((s, c) => s + Number(c.monto), 0);
  const totalCobrado = proyecto.cuentasCobrar.reduce((s, c) => s + Number(c.montoCobrado ?? 0), 0);
  const porcentajePagado = totalPorCobrar > 0 ? (totalCobrado / totalPorCobrar) * 100 : 0;

  const etapaIdx = ETAPAS.indexOf(proyecto.estado);
  const isCancelado = proyecto.estado === "CANCELADO";

  // ── Próximos pasos automáticos ────────────────────────────────────────────
  const pasos: { label: string; done: boolean }[] = [
    { label: "Cotización aprobada", done: proyecto.cotizacion?.estado === "APROBADA" },
    {
      label: "Anticipo pagado",
      done: proyecto.cuentasCobrar.some(c => c.tipoPago === "ANTICIPO" && (c.estado === "PAGADO" || c.estado === "PARCIAL")),
    },
    { label: "Equipo técnico confirmado", done: proyecto.personal.length > 0 },
    { label: "Evento realizado", done: proyecto.estado === "COMPLETADO" },
  ];

  // ── Servicios contratados (sin precios) ───────────────────────────────────
  const lineasVisibles = (proyecto.cotizacion?.lineas ?? []).filter(
    l => l.tipo === "EQUIPO_PROPIO" || l.tipo === "EQUIPO_EXTERNO" || l.tipo === "OPERACION"
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] bg-[#0d0d0d] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Image src="/logo-white.png" alt="Mainstage Pro" width={110} height={30} className="object-contain" />
          {isCancelado ? (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-900/50 text-red-400">Cancelado</span>
          ) : (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#B3985B]/20 text-[#B3985B]">
              {ETAPA_LABEL[proyecto.estado] ?? proyecto.estado}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Bienvenida + cuenta regresiva */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-1">{proyecto.numeroProyecto}</p>
            <h1 className="text-xl font-bold text-white leading-tight">{proyecto.nombre}</h1>
            {proyecto.cliente.empresa && (
              <p className="text-gray-500 text-sm mt-0.5">{proyecto.cliente.empresa}</p>
            )}
          </div>
          {diasRestantes !== null && !isCancelado && (
            <div className={`shrink-0 text-center px-4 py-2 rounded-2xl border ${diasRestantes <= 7 ? "border-[#B3985B]/50 bg-[#B3985B]/10" : "border-[#1e1e1e] bg-[#111]"}`}>
              <p className={`text-3xl font-black leading-none ${diasRestantes <= 7 ? "text-[#B3985B]" : "text-white"}`}>
                {diasRestantes > 0 ? diasRestantes : diasRestantes === 0 ? "¡Hoy!" : "—"}
              </p>
              {diasRestantes > 0 && <p className="text-gray-500 text-[10px] mt-0.5">{diasRestantes === 1 ? "día" : "días"}</p>}
            </div>
          )}
        </div>

        {/* Stepper de etapas */}
        {!isCancelado && (
          <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Progreso del proyecto</p>
            <div className="flex items-center gap-0">
              {ETAPAS.map((etapa, i) => {
                const done = i < etapaIdx;
                const current = i === etapaIdx;
                const isLast = i === ETAPAS.length - 1;
                return (
                  <div key={etapa} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${done ? "bg-[#B3985B] border-[#B3985B] text-black" : current ? "border-[#B3985B] text-[#B3985B] bg-transparent" : "border-[#333] text-[#444] bg-transparent"}`}>
                        {done ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        ) : (i + 1)}
                      </div>
                      <p className={`text-[9px] mt-1 text-center leading-tight max-w-[52px] ${done || current ? "text-gray-300" : "text-[#444]"}`}>
                        {ETAPA_LABEL[etapa]}
                      </p>
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-px mx-1 mb-3 ${i < etapaIdx ? "bg-[#B3985B]" : "bg-[#222]"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Fechas clave */}
        <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Fechas clave</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {proyecto.fechaMontaje && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-4 py-3">
                <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-0.5">Montaje</p>
                <p className="text-sm text-white font-medium capitalize">{formatDate(proyecto.fechaMontaje, { weekday: "long", month: "long", day: "numeric" })}</p>
                {proyecto.horaInicioMontaje && <p className="text-[10px] text-gray-500 mt-0.5">{proyecto.horaInicioMontaje} hrs</p>}
              </div>
            )}
            {proyecto.fechaEvento && (
              <div className="bg-[#0d0d0d] border border-[#B3985B]/20 rounded-xl px-4 py-3">
                <p className="text-[10px] text-[#B3985B] uppercase tracking-wide mb-0.5">Evento</p>
                <p className="text-sm text-white font-medium capitalize">{formatDate(proyecto.fechaEvento, { weekday: "long", month: "long", day: "numeric" })}</p>
                {(proyecto.horaInicioEvento || proyecto.horaFinEvento) && (
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {proyecto.horaInicioEvento ?? ""}{proyecto.horaFinEvento ? ` – ${proyecto.horaFinEvento}` : ""} hrs
                  </p>
                )}
              </div>
            )}
            {proyecto.lugarEvento && (
              <div className="sm:col-span-2 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-4 py-3">
                <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-0.5">Lugar</p>
                <p className="text-sm text-white">{proyecto.lugarEvento}</p>
              </div>
            )}
          </div>
        </section>

        {/* Próximos pasos */}
        <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Estado del proyecto</p>
          <div className="space-y-2.5">
            {pasos.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${p.done ? "bg-green-900/40" : "bg-[#1a1a1a]"}`}>
                  {p.done ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-400"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#333]" />
                  )}
                </div>
                <p className={`text-sm ${p.done ? "text-white" : "text-gray-500"}`}>{p.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Servicios contratados */}
        {lineasVisibles.length > 0 && (
          <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Servicios contratados</p>
            <div className="divide-y divide-[#1a1a1a]">
              {lineasVisibles.map((l, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white leading-snug truncate">{l.descripcion}</p>
                    {l.tipo === "OPERACION" && <p className="text-[10px] text-gray-600">Personal técnico</p>}
                    {(l.tipo === "EQUIPO_PROPIO" || l.tipo === "EQUIPO_EXTERNO") && <p className="text-[10px] text-gray-600">Equipo</p>}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {l.esIncluido && <span className="text-[9px] text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded">incluido</span>}
                    <span className="text-xs text-gray-400 font-medium">
                      {l.cantidad > 1 ? `×${l.cantidad}` : ""}{l.dias > 1 ? ` · ${l.dias}d` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Estado de pagos */}
        {proyecto.cuentasCobrar.length > 0 && (
          <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 space-y-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Estado de pagos</p>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">Pagado</span>
                <span className="text-xs font-semibold text-[#B3985B]">{porcentajePagado.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
                <div className="h-full bg-[#B3985B] rounded-full transition-all" style={{ width: `${Math.min(porcentajePagado, 100)}%` }} />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[11px] text-gray-600">{formatMXN(totalCobrado)} pagado</span>
                <span className="text-[11px] text-gray-600">Total: {formatMXN(totalPorCobrar)}</span>
              </div>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {proyecto.cuentasCobrar.map((c, i) => (
                <div key={i} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{c.concepto}</p>
                    {c.fechaCompromiso && (
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {c.estado === "PAGADO" ? "Pagado" : `Vence ${formatDate(c.fechaCompromiso, { month: "short", day: "numeric" })}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatMXN(c.monto)}</p>
                    <p className={`text-[10px] font-semibold ${PAGO_ESTADO_COLOR[c.estado] ?? "text-gray-400"}`}>
                      {c.estado === "PARCIAL" ? `${formatMXN(Number(c.montoCobrado ?? 0))} pagado` : c.estado}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Equipo confirmado */}
        {proyecto.personal.length > 0 && (
          <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 space-y-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Tu equipo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {proyecto.personal.map((p, i) => {
                const nombre = p.tecnico?.nombre ?? "Técnico";
                return (
                  <div key={i} className="flex items-center gap-3 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-3 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#1e1e1e] flex items-center justify-center shrink-0">
                      <span className="text-[#B3985B] text-xs font-semibold">{nombre.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{nombre}</p>
                      {p.rolTecnico && <p className="text-[10px] text-gray-600">{p.rolTecnico.nombre}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Coordinador */}
        {proyecto.encargado && (
          <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Tu coordinador</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#1e1e1e] border border-[#B3985B]/30 flex items-center justify-center shrink-0">
                <span className="text-[#B3985B] text-lg font-bold">{proyecto.encargado.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold">{proyecto.encargado.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">Mainstage Pro · Coordinador de producción</p>
              </div>
            </div>
          </section>
        )}

        {/* Mensaje del coordinador */}
        {proyecto.notasPortal && (
          <section className="bg-[#B3985B]/5 border border-[#B3985B]/20 rounded-2xl p-5">
            <p className="text-[10px] text-[#B3985B] uppercase tracking-widest mb-2">Mensaje de tu coordinador</p>
            <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">{proyecto.notasPortal}</p>
          </section>
        )}

        {/* Documentos */}
        {proyecto.cotizacion && (
          <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Documentos</p>
            <div className="space-y-2">
              <a
                href={`/api/cotizaciones/${proyecto.cotizacion.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#333] rounded-xl px-4 py-3 transition-colors group"
              >
                <span className="text-lg">📄</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-medium">Cotización {proyecto.cotizacion.numeroCotizacion}</p>
                  <p className="text-[10px] text-gray-600">{formatMXN(Number(proyecto.cotizacion.granTotal))} · {proyecto.cotizacion.estado}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600 group-hover:text-gray-400 shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </a>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="text-center py-6 space-y-1">
          <p className="text-gray-700 text-xs">Portal generado por Mainstage Pro</p>
          <p className="text-gray-800 text-[10px]">Este enlace es confidencial — no lo compartas con terceros</p>
        </div>
      </main>
    </div>
  );
}
