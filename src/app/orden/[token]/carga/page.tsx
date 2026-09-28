"use client";

import { useEffect, useState } from "react";
import { useOrden } from "../OrdenContext";
import { Barra, Cargando, Chip } from "../ui";
import Identificacion, { guardarVerificador, leerVerificador, type Verificador } from "./Identificacion";
import Checklist from "./Checklist";
import { PASE_DESCRIPCION, PASE_LABEL, TIPOS_PASE, type TipoPase } from "@/lib/control-carga";

export default function CargaPage() {
  const { orden, cargando, token, recargar } = useOrden();
  const [verificador, setVerificador] = useState<Verificador | null>(null);
  const [listo, setListo] = useState(false);
  const [cargaId, setCargaId] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState<TipoPase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVerificador(leerVerificador(token));
    setListo(true);
  }, [token]);

  if (cargando || !orden || !listo) return <Cargando />;

  if (!verificador) return <Identificacion onListo={setVerificador} />;

  if (cargaId) {
    return (
      <>
        <button
          onClick={() => { setCargaId(null); void recargar(); }}
          className="flex items-center gap-1.5 text-white/35 text-xs font-semibold mb-3"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Todos los pases
        </button>
        <Checklist
          token={token}
          cargaId={cargaId}
          verificador={verificador}
          onCerrada={() => void recargar()}
        />
      </>
    );
  }

  async function abrir(tipo: TipoPase) {
    if (!verificador) return;
    setError(null);
    setAbriendo(tipo);
    try {
      const res = await fetch(`/api/orden/${token}/carga`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, verificadorId: verificador.id }),
      });
      const data = await res.json();
      // 409 trae el pase que ya estaba abierto: lo natural es entrar a ese.
      if (!res.ok) {
        if (data.cargaId) { setCargaId(data.cargaId); return; }
        setError(data.error ?? "No pudimos abrir el pase");
        return;
      }
      setCargaId(data.cargaId);
      await recargar();
    } catch {
      setError("Sin conexión. Conéctate para abrir el pase.");
    } finally {
      setAbriendo(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-white/35 text-xs">
          Marcando como <span className="text-white/70 font-medium">{verificador.nombre}</span>
        </p>
        <button
          onClick={() => { guardarVerificador(token, null); setVerificador(null); }}
          className="shrink-0 text-white/25 text-xs underline underline-offset-2"
        >
          No soy yo
        </button>
      </div>

      {orden.pases.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-2">Pases de este proyecto</h2>
          <div className="bg-white/[0.025] border border-white/8 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {orden.pases.map((p) => (
              <button
                key={p.id}
                onClick={() => setCargaId(p.id)}
                className="w-full p-4 text-left active:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-white/85 text-sm font-medium truncate">
                    {PASE_LABEL[p.tipo as TipoPase] ?? p.tipo}
                    {p.etiqueta ? ` · ${p.etiqueta}` : ""}
                  </span>
                  <Chip tono={p.estado === "CERRADA" ? "verde" : "ambar"}>
                    {p.estado === "CERRADA" ? "Cerrado" : "En curso"}
                  </Chip>
                </div>
                <Barra pct={p.avance.pct} tono={p.estado === "CERRADA" ? "verde" : "oro"} />
                <p className="text-white/30 text-[11px] mt-1.5">
                  {p.avance.revisados}/{p.avance.total} revisados
                  {p.avance.faltantes > 0 && ` · ${p.avance.faltantes} faltante(s)`}
                  {p.avance.danados > 0 && ` · ${p.avance.danados} dañado(s)`}
                  {p.abiertoPor && ` · abrió ${p.abiertoPor}`}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      <h2 className="text-[#B3985B] text-[10px] font-semibold uppercase tracking-widest mb-2">Abrir un pase nuevo</h2>
      <div className="space-y-2">
        {TIPOS_PASE.map((tipo) => {
          const enCurso = orden.pases.find((p) => p.tipo === tipo && p.estado === "EN_CURSO");
          return (
            <button
              key={tipo}
              onClick={() => void abrir(tipo)}
              disabled={abriendo !== null}
              className="w-full flex items-center gap-3 p-4 bg-white/[0.025] border border-white/8 rounded-2xl text-left active:bg-white/[0.04] disabled:opacity-40"
            >
              <span className="shrink-0 w-10 h-10 rounded-xl bg-[#B3985B]/10 border border-[#B3985B]/25 flex items-center justify-center text-[#B3985B]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {tipo === "SALIDA"
                    ? <><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>
                    : <><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></>}
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-white/85 text-sm font-semibold">
                  {abriendo === tipo ? "Abriendo…" : PASE_LABEL[tipo]}
                </span>
                <span className="block text-white/30 text-xs mt-0.5 leading-relaxed">
                  {enCurso ? "Ya hay uno en curso: continúa ahí." : PASE_DESCRIPCION[tipo]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-red-400 text-xs mt-4">{error}</p>}

      <p className="text-white/20 text-[11px] mt-6 leading-relaxed">
        Los renglones se congelan al abrir el pase: un cambio posterior en el listado del proyecto no
        reescribe lo que ya verificaste con el equipo en la mano.
      </p>
    </>
  );
}
