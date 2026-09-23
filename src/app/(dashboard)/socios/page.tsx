"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { AlertTriangle, Mail, Phone } from "lucide-react";

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

function fmt(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

function Initials({ name }: { name: string }) {
  const parts = name.split(" ").slice(0, 2);
  return <>{parts.map(p => p[0]).join("").toUpperCase()}</>;
}

export default function SociosConstitutivosPage() {
  useToast();
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    const sr = await fetch("/api/socios", { cache: "no-store" });
    const sd = await sr.json().catch(() => ({ socios: [] }));
    setSocios(sd.socios || []);
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

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex items-center justify-center h-64">
        <div className="text-gray-500 text-sm">Cargando socios...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="ms-h1">Socios Constitutivos</h1>
          <p className="ms-subtitle mt-0.5">
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
          <p className="inline-flex items-center gap-1.5 text-[10px] text-yellow-500/70 mt-2"><AlertTriangle strokeWidth={1.75} className="w-3 h-3" /> Suma de participaciones: {totalPct}% (debe ser 100%)</p>
        )}
      </div>

      {/* Tarjetas de socios */}
      <div className="space-y-4">
        {constitutivos.map((s, i) => {
          const accents = [
            { border: "border-[#B3985B]/40", text: "text-[#B3985B]" },
            { border: "border-purple-400/40", text: "text-purple-400" },
            { border: "border-blue-400/40", text: "text-blue-400" },
            { border: "border-green-400/40", text: "text-green-400" },
          ];
          const accent = accents[i % accents.length];

          return (
            <div key={s.id} className="ms-table-wrapper">
              {/* Top: info principal */}
              <div className="flex items-start gap-4 p-5">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full bg-[#1a1a1a] border ${accent.border} flex items-center justify-center shrink-0`}>
                  <span className={`${accent.text} text-sm font-bold`}>
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
                      <div className={`text-2xl font-bold ${accent.text}`}>
                        {s.pctParticipacion}%
                      </div>
                      <div className="text-[10px] text-[#555]">participación</div>
                    </div>
                  </div>

                  {/* Contacto */}
                  <div className="flex flex-wrap gap-4 mt-3">
                    {s.email && (
                      <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1.5 text-xs text-[#555] hover:text-white transition-colors">
                        <Mail strokeWidth={1.75} className="w-3.5 h-3.5" /> {s.email}
                      </a>
                    )}
                    {s.telefono && (
                      <a href={`tel:${s.telefono}`} className="inline-flex items-center gap-1.5 text-xs text-[#555] hover:text-white transition-colors">
                        <Phone strokeWidth={1.75} className="w-3.5 h-3.5" /> {s.telefono}
                      </a>
                    )}
                  </div>
                </div>
              </div>

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
