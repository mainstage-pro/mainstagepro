"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Estandar { subarea: string; responsabilidad: string; estandar: string }
interface Snapshot {
  tipo: string;
  personaNombre: string;
  puestoNombre: string;
  area: string;
  objetivoArea: string | null;
  misionPuesto: string | null;
  responsabilidades: string[];
  estandares: Estandar[];
  coordinaCon: string[];
  supervisaA: string[];
  funciones: string[];
  beneficios: string[];
  tipoContrato: string | null;
  modalidad: string | null;
  horario: string | null;
  reportaA: string | null;
  responsableNombre: string;
  fechaDocumento: string;
}
interface AcuerdoPublico {
  tipo: string;
  snapshot: Snapshot;
  aceptado: boolean;
  aceptadoNombre: string | null;
  aceptadoEn: string | null;
}

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif';

function fmtFecha(s: string) {
  return new Date(s.length <= 10 ? s + "T12:00:00" : s).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">{titulo}</p>
      {children}
    </div>
  );
}

function Lista({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="text-sm text-gray-200 leading-relaxed flex gap-2">
          <span className="text-[#B3985B] shrink-0">·</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AcuerdoAcusePage() {
  const { token } = useParams<{ token: string }>();
  const [acuerdo, setAcuerdo] = useState<AcuerdoPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [firmado, setFirmado] = useState(false);

  useEffect(() => {
    fetch(`/api/acuerdo/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "No se pudo cargar el acuerdo"); return; }
        setAcuerdo(data.acuerdo);
        if (data.acuerdo?.aceptado) setFirmado(true);
      })
      .catch(() => setError("No se pudo cargar el acuerdo"))
      .finally(() => setLoading(false));
  }, [token]);

  async function firmar() {
    if (!nombre.trim() || !acepta) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/acuerdo/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      const data = await res.json();
      if (res.ok) setFirmado(true);
      else setError(data.error ?? "No se pudo registrar el acuse");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center" style={{ fontFamily: FONT }}>
      <div className="w-6 h-6 border-2 border-[#B3985B]/30 border-t-[#B3985B] rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6" style={{ fontFamily: FONT }}>
      <div className="max-w-sm text-center">
        <p className="text-white text-lg font-semibold mb-2">Enlace no disponible</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (!acuerdo) return null;
  const s = acuerdo.snapshot;
  const condiciones = [
    s.tipoContrato && ["Contrato", s.tipoContrato],
    s.modalidad && ["Modalidad", s.modalidad],
    s.horario && ["Horario", s.horario],
    s.reportaA && ["Reporta a", s.reportaA],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="min-h-screen bg-black text-white py-10 px-4" style={{ fontFamily: FONT }}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Encabezado */}
        <div className="text-center space-y-1">
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em]">Acuerdo de alineación y cumplimiento</p>
          <p className="text-[#B3985B] text-sm font-semibold">{s.puestoNombre}</p>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-6">
          <div>
            <p className="text-white text-lg font-semibold">{s.personaNombre}</p>
            <p className="text-gray-500 text-sm">{s.puestoNombre} · {s.area}</p>
          </div>

          {s.misionPuesto && (
            <Seccion titulo="Misión del puesto">
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{s.misionPuesto}</p>
            </Seccion>
          )}
          {s.objetivoArea && (
            <Seccion titulo="Objetivo del área">
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{s.objetivoArea}</p>
            </Seccion>
          )}
          {s.responsabilidades.length > 0 && (
            <Seccion titulo="Responsabilidades"><Lista items={s.responsabilidades} /></Seccion>
          )}
          {s.estandares.length > 0 && (
            <Seccion titulo="Estándares de desempeño">
              <div className="space-y-3">
                {s.estandares.map((e, i) => (
                  <div key={i} className="border-b border-[#1a1a1a] last:border-0 pb-3 last:pb-0">
                    {e.subarea && <p className="text-[10px] text-gray-600 uppercase tracking-wider">{e.subarea}</p>}
                    <p className="text-sm text-gray-200">{e.responsabilidad || "—"}</p>
                    {e.estandar && <p className="text-xs text-gray-500 mt-0.5">{e.estandar}</p>}
                  </div>
                ))}
              </div>
            </Seccion>
          )}
          {s.funciones.length > 0 && (
            <Seccion titulo="Funciones"><Lista items={s.funciones} /></Seccion>
          )}
          {s.coordinaCon.length > 0 && (
            <Seccion titulo="Coordina con"><Lista items={s.coordinaCon} /></Seccion>
          )}
          {s.supervisaA.length > 0 && (
            <Seccion titulo="Supervisa a"><Lista items={s.supervisaA} /></Seccion>
          )}
          {condiciones.length > 0 && (
            <Seccion titulo="Condiciones">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {condiciones.map(([k, v]) => (
                  <div key={k}>
                    <span className="text-gray-600 text-xs">{k}: </span>
                    <span className="text-gray-200">{v}</span>
                  </div>
                ))}
              </div>
            </Seccion>
          )}
          {s.beneficios.length > 0 && (
            <Seccion titulo="Beneficios"><Lista items={s.beneficios} /></Seccion>
          )}
          <p className="text-xs text-gray-600 pt-2 border-t border-[#1a1a1a]">
            Emitido por {s.responsableNombre} · {s.fechaDocumento}
          </p>
        </div>

        {/* Acuse */}
        {firmado ? (
          <div className="bg-green-900/20 border border-green-800 rounded-2xl p-6 text-center space-y-1">
            <p className="text-green-400 font-semibold">Acuse registrado</p>
            <p className="text-gray-400 text-sm">
              {acuerdo.aceptadoNombre ? `${acuerdo.aceptadoNombre}, confirmaste` : "Confirmaste"} que leíste este acuerdo y quedaste enterado de tus responsabilidades.
              {acuerdo.aceptadoEn ? ` (${fmtFecha(acuerdo.aceptadoEn)})` : ""}
            </p>
          </div>
        ) : (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-4">
            <p className="text-sm text-gray-400 leading-relaxed">
              Firmar de enterado confirma que leíste este acuerdo y comprendes las responsabilidades
              y estándares de tu puesto.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#B3985B]" />
              <span className="text-sm text-gray-300">
                Leí y comprendo mis responsabilidades, funciones y estándares de desempeño, y me comprometo a cumplirlos.
              </span>
            </label>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Escribe tu nombre para firmar</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Nombre completo"
                className="w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]" />
            </div>
            <button onClick={firmar} disabled={submitting || !nombre.trim() || !acepta}
              className="w-full bg-[#B3985B] text-black text-sm font-semibold rounded-lg py-3 hover:bg-[#c9a96a] transition-colors disabled:opacity-40">
              {submitting ? "Registrando…" : "Firmar de enterado"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
