"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";

type Socio = {
  id: string;
  nombre: string;
  tipo: string;
  status: string;
  pctParticipacion: number | null;
  razonSocial: string | null;
  esRepresentante: boolean;
  esRepartoUtilidades: boolean;
  montoRepartoSemanal: number | null;
  esFundador: boolean;
  ciudad: string | null;
  email: string | null;
  telefono: string | null;
  createdAt: string;
};

type RepartoHistorial = {
  id: string;
  nombre: string;
  beneficiario: string;
  montoBase: number;
  tipoPeriodo: string;
  activo: boolean;
  cuotas: { id: string; periodo: string; monto: number; estado: string; fechaGenerada: string }[];
};

function fmt(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

function Initials({ name }: { name: string }) {
  const parts = name.split(" ").slice(0, 2);
  return <>{parts.map(p => p[0]).join("").toUpperCase()}</>;
}

export default function SociosConstitutivosPage() {
  const toast = useToast();
  const [socios, setSocios] = useState<Socio[]>([]);
  const [repartos, setRepartos] = useState<RepartoHistorial[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    const [sr, rr] = await Promise.all([
      fetch("/api/socios", { cache: "no-store" }),
      fetch("/api/finanzas/repartos", { cache: "no-store" }),
    ]);
    const sd = await sr.json().catch(() => ({ socios: [] }));
    const rd = await rr.json().catch(() => ({ repartos: [] }));
    setSocios(sd.socios || []);
    setRepartos(rd.repartos || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  // Solo socios con pctParticipacion (constitutivos), ordenados por % desc
  const constitutivos = useMemo(
    () => socios
      .filter(s => s.pctParticipacion != null)
      .sort((a, b) => (b.pctParticipacion ?? 0) - (a.pctParticipacion ?? 0)),
    [socios]
  );

  const totalPct = constitutivos.reduce((s, x) => s + (x.pctParticipacion ?? 0), 0);

  // Repartos activos por socio
  const repartosPorSocio = useMemo(() => {
    const map: Record<string, RepartoHistorial[]> = {};
    for (const r of repartos) {
      // match by beneficiario name against socios
      const socio = constitutivos.find(s =>
        r.beneficiario.toLowerCase().includes(s.nombre.split(" ")[0].toLowerCase()) ||
        s.nombre.toLowerCase().includes(r.beneficiario.split(" ")[0].toLowerCase())
      );
      if (socio) {
        if (!map[socio.id]) map[socio.id] = [];
        map[socio.id].push(r);
      }
    }
    return map;
  }, [repartos, constitutivos]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center h-64">
        <div className="text-gray-500 text-sm">Cargando socios...</div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Socios Constitutivos</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {constitutivos.length} socios · Escenario Principal S.A. de C.V.
          </p>
        </div>

      </div>

      {/* Estructura societaria — barra visual */}
      <div className="bg-[#0e0e0e] border border-[#B3985B]/20 rounded-xl p-5 mb-6">
        <p className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-wider mb-4">
          Estructura de participación
        </p>
        <div className="flex h-3 rounded-full overflow-hidden mb-3 gap-0.5">
          {constitutivos.map((s, i) => {
            const colors = ["bg-[#B3985B]", "bg-purple-500", "bg-blue-500", "bg-green-500"];
            return (
              <div
                key={s.id}
                className={`${colors[i % colors.length]} transition-all`}
                style={{ width: `${s.pctParticipacion}%` }}
                title={`${s.nombre}: ${s.pctParticipacion}%`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4">
          {constitutivos.map((s, i) => {
            const colors = ["text-[#B3985B]", "text-purple-400", "text-blue-400", "text-green-400"];
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${["bg-[#B3985B]", "bg-purple-500", "bg-blue-500", "bg-green-500"][i % 4]}`} />
                <span className="text-xs text-white/80">{s.nombre}</span>
                <span className={`text-xs font-bold ${colors[i % colors.length]}`}>{s.pctParticipacion}%</span>
              </div>
            );
          })}
        </div>
        {totalPct !== 100 && (
          <p className="text-[10px] text-yellow-500/70 mt-2">⚠ Suma de participaciones: {totalPct}% (debe ser 100%)</p>
        )}
      </div>

      {/* Tarjetas de socios */}
      <div className="space-y-4">
        {constitutivos.map((s, i) => {
          const colorsAccent = ["[#B3985B]", "purple-400", "blue-400", "green-400"];
          const accent = colorsAccent[i % colorsAccent.length];
          const rSocio = repartosPorSocio[s.id] ?? [];
          const rActivo = rSocio.find(r => r.activo);
          const ultimasCuotas = rActivo?.cuotas
            .sort((a, b) => b.fechaGenerada.localeCompare(a.fechaGenerada))
            .slice(0, 4) ?? [];

          return (
            <div key={s.id} className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
              {/* Top: info principal */}
              <div className="flex items-start gap-4 p-5">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full bg-[#1a1a1a] border border-${accent}/40 flex items-center justify-center shrink-0`}>
                  <span className={`text-${accent} text-sm font-bold`}>
                    <Initials name={s.nombre} />
                  </span>
                </div>

                {/* Datos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h2 className="text-white font-semibold text-base">{s.nombre}</h2>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {s.esRepresentante && (
                          <span className="text-[10px] bg-[#B3985B]/10 text-[#B3985B] border border-[#B3985B]/30 px-2 py-0.5 rounded-full font-medium">
                            Representante Legal
                          </span>
                        )}
                        {s.esFundador && (
                          <span className="text-[10px] bg-white/5 text-white/50 border border-white/10 px-2 py-0.5 rounded-full">
                            Fundador/a
                          </span>
                        )}
                        {s.ciudad && (
                          <span className="text-[10px] text-[#555]">{s.ciudad}</span>
                        )}
                      </div>
                    </div>
                    {/* % participación */}
                    <div className="text-right">
                      <div className={`text-2xl font-bold text-${accent}`}>
                        {s.pctParticipacion}%
                      </div>
                      <div className="text-[10px] text-[#555]">participación</div>
                    </div>
                  </div>

                  {/* Contacto */}
                  <div className="flex flex-wrap gap-4 mt-3">
                    {s.email && (
                      <a href={`mailto:${s.email}`} className="text-xs text-[#555] hover:text-white transition-colors">
                        ✉ {s.email}
                      </a>
                    )}
                    {s.telefono && (
                      <a href={`tel:${s.telefono}`} className="text-xs text-[#555] hover:text-white transition-colors">
                        ☎ {s.telefono}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Reparto semanal */}
              {(s.esRepartoUtilidades || rActivo) && (
                <div className="border-t border-[#1a1a1a] px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-white/70 font-medium">Pago semanal automático</p>
                      <p className="text-[10px] text-[#555] mt-0.5">Generado cada lunes · Ligado a Cuentas por Pagar</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        {rActivo ? fmt(rActivo.montoBase) : fmt(s.montoRepartoSemanal ?? 0)}
                      </div>
                      <div className="text-[10px] text-[#555]">por semana</div>
                    </div>
                  </div>

                  {/* Historial últimas cuotas */}
                  {ultimasCuotas.length > 0 && (
                    <div className="space-y-1.5">
                      {ultimasCuotas.map(c => (
                        <div key={c.id} className="flex items-center justify-between">
                          <span className="text-[11px] text-[#555]">{c.periodo}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-white/60">{fmt(c.monto)}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              c.estado === "PAGADO" ? "bg-green-900/30 text-green-400" :
                              c.estado === "PENDIENTE" ? "bg-yellow-900/30 text-yellow-400" :
                              "bg-gray-800 text-gray-500"
                            }`}>
                              {c.estado}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Footer: sin reparto */}
              {!s.esRepartoUtilidades && !rActivo && (
                <div className="border-t border-[#1a1a1a] px-5 py-3">
                  <p className="text-xs text-[#444] italic">Sin pago periódico configurado</p>
                </div>
              )}
            </div>
          );
        })}

        {constitutivos.length === 0 && (
          <div className="text-center py-16 text-gray-600 text-sm">
            No hay socios constitutivos registrados.
          </div>
        )}
      </div>

      {/* Nota informativa al pie */}
      <div className="mt-8 p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
        <p className="text-xs text-[#555]">
          Este módulo muestra únicamente los socios del acta constitutiva de Escenario Principal S.A. de C.V.
        </p>
      </div>
    </div>
  );
}
