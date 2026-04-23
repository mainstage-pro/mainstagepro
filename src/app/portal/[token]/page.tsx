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
  const base = opts ?? { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return new Date(d.substring(0, 10) + "T12:00:00Z").toLocaleDateString("es-MX", { timeZone: "UTC", ...base });
}
function formatMXN(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });
}

const PAGO_ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: "text-yellow-400/80",
  PARCIAL: "text-blue-400/80",
  PAGADO: "text-green-400/80",
  CANCELADO: "text-red-400/80",
};

export default function PortalCliente() {
  const { token } = useParams<{ token: string }>();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

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
    <div className="min-h-screen bg-black flex items-center justify-center"
         style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <div className="w-6 h-6 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
    </div>
  );

  if (error || !proyecto) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6"
         style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <Image src="/logo-white.png" alt="Mainstage Pro" width={130} height={34} className="object-contain opacity-30" />
      <p className="text-white/40 text-sm mt-4">Este enlace no es válido o ha expirado.</p>
      <p className="text-white/20 text-xs">Contacta a tu coordinador para obtener un nuevo enlace.</p>
    </div>
  );

  const ahora = new Date();
  const fechaEvento = proyecto.fechaEvento ? new Date(proyecto.fechaEvento.substring(0, 10) + "T12:00:00Z") : null;
  const diasRestantes = fechaEvento
    ? Math.ceil((fechaEvento.getTime() - ahora.getTime()) / 86400000)
    : null;

  const totalPorCobrar = proyecto.cuentasCobrar.reduce((s, c) => s + Number(c.monto), 0);
  const totalCobrado = proyecto.cuentasCobrar.reduce((s, c) => s + Number(c.montoCobrado ?? 0), 0);
  const porcentajePagado = totalPorCobrar > 0 ? (totalCobrado / totalPorCobrar) * 100 : 0;

  const etapaIdx = ETAPAS.indexOf(proyecto.estado);
  const isCancelado = proyecto.estado === "CANCELADO";

  const pasos: { label: string; done: boolean }[] = [
    { label: "Cotización aprobada", done: proyecto.cotizacion?.estado === "APROBADA" },
    {
      label: "Anticipo pagado",
      done: proyecto.cuentasCobrar.some(c => c.tipoPago === "ANTICIPO" && (c.estado === "PAGADO" || c.estado === "PARCIAL")),
    },
    { label: "Equipo técnico confirmado", done: proyecto.personal.length > 0 },
    { label: "Evento realizado", done: proyecto.estado === "COMPLETADO" },
  ];

  const lineasVisibles = (proyecto.cotizacion?.lineas ?? []).filter(
    l => l.tipo === "EQUIPO_PROPIO" || l.tipo === "EQUIPO_EXTERNO" || l.tipo === "OPERACION"
  );

  return (
    <div className="min-h-screen bg-black text-white"
         style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>

      <style>{`
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 h-14"
           style={{
             background: `rgba(0,0,0,${Math.min(0.92, scrollY / 80)})`,
             backdropFilter: scrollY > 20 ? "blur(24px) saturate(180%)" : "none",
             borderBottom: scrollY > 20 ? "1px solid rgba(255,255,255,0.06)" : "none",
             transition: "background 0.4s, border-color 0.4s",
           }}>
        <Image src="/logo-white.png" alt="Mainstage Pro" width={110} height={28} className="object-contain opacity-80" />
        {isCancelado ? (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-900/30 text-red-400/80 border border-red-500/20">
            Cancelado
          </span>
        ) : (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#B3985B]/10 text-[#B3985B] border border-[#B3985B]/20">
            {ETAPA_LABEL[proyecto.estado] ?? proyecto.estado}
          </span>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(179,152,91,0.06) 0%, transparent 70%)" }} />

        <div className="max-w-2xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-[0.25em] mb-3">
                Portal de cliente · {proyecto.numeroProyecto}
              </p>
              <h1 className="text-white font-bold leading-tight mb-1"
                  style={{ fontSize: "clamp(1.6rem,5vw,2.8rem)", letterSpacing: "-0.02em" }}>
                {proyecto.nombre}
              </h1>
              {proyecto.cliente.empresa && (
                <p className="text-white/35 text-sm mt-1">{proyecto.cliente.empresa}</p>
              )}
            </div>

            {/* Countdown */}
            {diasRestantes !== null && !isCancelado && (
              <div className={`shrink-0 text-center px-5 py-3 rounded-2xl border ${
                diasRestantes <= 7
                  ? "border-[#B3985B]/40 bg-[#B3985B]/8"
                  : "border-white/8 bg-white/[0.025]"
              }`}>
                <p className={`font-black leading-none ${
                  diasRestantes <= 7 ? "text-[#B3985B]" : "text-white"
                }`} style={{ fontSize: diasRestantes > 99 ? "2rem" : "2.8rem", letterSpacing: "-0.04em" }}>
                  {diasRestantes > 0 ? diasRestantes : diasRestantes === 0 ? "¡Hoy!" : "—"}
                </p>
                {diasRestantes > 0 && (
                  <p className="text-white/25 text-[10px] mt-0.5 uppercase tracking-wide">
                    {diasRestantes === 1 ? "día" : "días"}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── BODY ────────────────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-6 pb-24 space-y-4">

        {/* Stepper de etapas */}
        {!isCancelado && (
          <section className="bg-white/[0.025] border border-white/8 rounded-2xl p-6">
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest mb-5">Progreso del proyecto</p>
            <div className="flex items-center">
              {ETAPAS.map((etapa, i) => {
                const done = i < etapaIdx;
                const current = i === etapaIdx;
                const isLast = i === ETAPAS.length - 1;
                return (
                  <div key={etapa} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                        done ? "bg-[#B3985B] border-[#B3985B] text-black"
                          : current ? "border-[#B3985B] text-[#B3985B] bg-transparent"
                          : "border-white/10 text-white/15 bg-transparent"
                      }`}>
                        {done ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                        ) : (i + 1)}
                      </div>
                      <p className={`text-[9px] mt-1.5 text-center leading-tight max-w-[52px] ${
                        done || current ? "text-white/50" : "text-white/15"
                      }`}>{ETAPA_LABEL[etapa]}</p>
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-px mx-1.5 mb-4 ${i < etapaIdx ? "bg-[#B3985B]/50" : "bg-white/8"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Fechas clave */}
        <section className="bg-white/[0.025] border border-white/8 rounded-2xl p-6">
          <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest mb-4">Fechas clave</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {proyecto.fechaMontaje && (
              <div className="bg-white/[0.02] border border-white/6 rounded-xl px-4 py-3">
                <p className="text-[10px] text-white/25 uppercase tracking-wide mb-1">Montaje</p>
                <p className="text-sm text-white font-medium capitalize">
                  {formatDate(proyecto.fechaMontaje, { weekday: "long", month: "long", day: "numeric" })}
                </p>
                {proyecto.horaInicioMontaje && (
                  <p className="text-[10px] text-white/25 mt-1">{proyecto.horaInicioMontaje} hrs</p>
                )}
              </div>
            )}
            {proyecto.fechaEvento && (
              <div className="bg-[#B3985B]/5 border border-[#B3985B]/20 rounded-xl px-4 py-3">
                <p className="text-[10px] text-[#B3985B]/70 uppercase tracking-wide mb-1">Evento</p>
                <p className="text-sm text-white font-medium capitalize">
                  {formatDate(proyecto.fechaEvento, { weekday: "long", month: "long", day: "numeric" })}
                </p>
                {(proyecto.horaInicioEvento || proyecto.horaFinEvento) && (
                  <p className="text-[10px] text-white/25 mt-1">
                    {proyecto.horaInicioEvento ?? ""}{proyecto.horaFinEvento ? ` – ${proyecto.horaFinEvento}` : ""} hrs
                  </p>
                )}
              </div>
            )}
            {proyecto.lugarEvento && (
              <div className="sm:col-span-2 bg-white/[0.02] border border-white/6 rounded-xl px-4 py-3">
                <p className="text-[10px] text-white/25 uppercase tracking-wide mb-1">Lugar</p>
                <p className="text-sm text-white">{proyecto.lugarEvento}</p>
              </div>
            )}
          </div>
        </section>

        {/* Próximos pasos */}
        <section className="bg-white/[0.025] border border-white/8 rounded-2xl p-6">
          <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest mb-4">Estado del proyecto</p>
          <div className="space-y-3">
            {pasos.map((p, i) => (
              <div key={i} className="flex items-center gap-3.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                  p.done ? "bg-green-900/30 border-green-500/30" : "bg-transparent border-white/8"
                }`}>
                  {p.done ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  )}
                </div>
                <p className={`text-sm ${p.done ? "text-white/80" : "text-white/25"}`}>{p.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Servicios contratados */}
        {lineasVisibles.length > 0 && (
          <section className="bg-white/[0.025] border border-white/8 rounded-2xl p-6">
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest mb-4">Servicios contratados</p>
            <div className="divide-y divide-white/5">
              {lineasVisibles.map((l, i) => (
                <div key={i} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white/80 leading-snug truncate">{l.descripcion}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">
                      {l.tipo === "OPERACION" ? "Personal técnico" : "Equipo"}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {l.esIncluido && (
                      <span className="text-[9px] text-[#B3985B] bg-[#B3985B]/10 border border-[#B3985B]/20 px-1.5 py-0.5 rounded-full">incluido</span>
                    )}
                    <span className="text-xs text-white/25 font-medium">
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
          <section className="bg-white/[0.025] border border-white/8 rounded-2xl p-6 space-y-5">
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest">Estado de pagos</p>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/25">Pagado</span>
                <span className="text-xs font-bold text-[#B3985B]">{porcentajePagado.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#B3985B] rounded-full transition-all duration-700"
                     style={{ width: `${Math.min(porcentajePagado, 100)}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-white/20">{formatMXN(totalCobrado)} pagado</span>
                <span className="text-[10px] text-white/20">Total: {formatMXN(totalPorCobrar)}</span>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {proyecto.cuentasCobrar.map((c, i) => (
                <div key={i} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-white/80 font-medium truncate">{c.concepto}</p>
                    {c.fechaCompromiso && (
                      <p className="text-[10px] text-white/25 mt-0.5">
                        {c.estado === "PAGADO" ? "Pagado" : `Vence ${formatDate(c.fechaCompromiso, { month: "short", day: "numeric" })}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white/70">{formatMXN(c.monto)}</p>
                    <p className={`text-[10px] font-semibold ${PAGO_ESTADO_COLOR[c.estado] ?? "text-white/25"}`}>
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
          <section className="bg-white/[0.025] border border-white/8 rounded-2xl p-6 space-y-4">
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest">Tu equipo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {proyecto.personal.map((p, i) => {
                const nombre = p.tecnico?.nombre ?? "Técnico";
                return (
                  <div key={i} className="flex items-center gap-3 bg-white/[0.02] border border-white/6 rounded-xl px-3.5 py-3">
                    <div className="w-8 h-8 rounded-full bg-[#B3985B]/10 border border-[#B3985B]/20 flex items-center justify-center shrink-0">
                      <span className="text-[#B3985B] text-xs font-bold">{nombre.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white/80 font-medium truncate">{nombre}</p>
                      {p.rolTecnico && <p className="text-[10px] text-white/25">{p.rolTecnico.nombre}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Coordinador */}
        {proyecto.encargado && (
          <section className="bg-white/[0.025] border border-white/8 rounded-2xl p-6">
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest mb-4">Tu coordinador</p>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-[#B3985B]/10 border border-[#B3985B]/25 flex items-center justify-center shrink-0">
                <span className="text-[#B3985B] text-base font-bold">{proyecto.encargado.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white/85 font-semibold text-sm">{proyecto.encargado.name}</p>
                <p className="text-white/25 text-xs mt-0.5">Mainstage Pro · Coordinador de producción</p>
              </div>
            </div>
          </section>
        )}

        {/* Mensaje del coordinador */}
        {proyecto.notasPortal && (
          <section className="bg-[#B3985B]/[0.04] border border-[#B3985B]/20 rounded-2xl p-6">
            <p className="text-[10px] text-[#B3985B]/70 font-semibold uppercase tracking-widest mb-3">Mensaje de tu coordinador</p>
            <p className="text-white/50 text-sm whitespace-pre-line leading-relaxed">{proyecto.notasPortal}</p>
          </section>
        )}

        {/* Documentos */}
        {proyecto.cotizacion && (
          <section className="bg-white/[0.025] border border-white/8 rounded-2xl p-6">
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest mb-4">Documentos</p>
            <a
              href={`/api/cotizaciones/${proyecto.cotizacion.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-white/[0.02] border border-white/6 hover:border-[#B3985B]/25 rounded-xl px-5 py-4 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#B3985B]/10 border border-[#B3985B]/20 flex items-center justify-center shrink-0 group-hover:bg-[#B3985B]/20 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B3985B" strokeWidth="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/80 font-medium">Cotización {proyecto.cotizacion.numeroCotizacion}</p>
                <p className="text-[10px] text-white/25 mt-0.5">
                  {formatMXN(Number(proyecto.cotizacion.granTotal))} · {proyecto.cotizacion.estado}
                </p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/15 group-hover:text-[#B3985B]/60 transition-colors shrink-0">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </a>
          </section>
        )}

        {/* Footer note */}
        <div className="text-center py-4 space-y-1">
          <p className="text-white/15 text-xs">Portal generado por Mainstage Pro</p>
          <p className="text-white/10 text-[10px]">Este enlace es confidencial — no lo compartas con terceros</p>
        </div>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <Image src="/logo-white.png" alt="Mainstage Pro" width={80} height={20} className="object-contain opacity-20" />
          <p className="text-white/10 text-xs">Querétaro, México</p>
        </div>
      </footer>

    </div>
  );
}
