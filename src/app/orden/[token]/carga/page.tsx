"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useOrden } from "../OrdenContext";
import { Barra, Cargando, Chip, Cuadro } from "../ui";
import Identificacion, { guardarVerificador, leerVerificador, type Verificador } from "./Identificacion";
import Checklist from "./Checklist";
import { PASE_LABEL, siguientePase, type TipoPase } from "@/lib/control-carga";

/**
 * Entrada al control de carga.
 *
 * Nadie elige entre "salida" y "retorno": el orden físico es siempre el mismo y
 * el sistema ya sabe en cuál va. Si hay un pase a medias entra directo; si no,
 * ofrece un solo botón con el que toca. Los pases cerrados quedan abajo, para
 * consulta.
 */
export default function CargaPage() {
  const { orden, cargando, token, recargar } = useOrden();
  const [verificador, setVerificador] = useState<Verificador | null>(null);
  const [listo, setListo] = useState(false);
  const [cargaId, setCargaId] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVerificador(leerVerificador(token));
    setListo(true);
  }, [token]);

  const siguiente = orden ? siguientePase(orden.pases) : null;

  // Un pase a medias es trabajo que alguien dejó abierto: se entra sin preguntar.
  useEffect(() => {
    if (siguiente?.accion === "CONTINUAR" && !cargaId) setCargaId(siguiente.cargaId);
  }, [siguiente, cargaId]);

  if (cargando || !orden || !listo || !siguiente) return <Cargando />;

  if (!verificador) return <Identificacion onListo={setVerificador} />;

  if (cargaId) {
    return (
      <>
        <button
          onClick={() => { setCargaId(null); void recargar(); }}
          className="flex items-center gap-1.5 text-[#5a5a5a] text-[12px] font-bold mb-3"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Control de carga
        </button>
        <Checklist token={token} cargaId={cargaId} verificador={verificador} onCerrada={() => void recargar()} />
      </>
    );
  }

  async function abrir(tipo: TipoPase) {
    if (!verificador) return;
    setError(null);
    setAbriendo(true);
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
      setAbriendo(false);
    }
  }

  const completo = siguiente.accion === "COMPLETO";

  return (
    <>
      <Link href={`/orden/${token}`} className="flex items-center gap-1.5 text-[#5a5a5a] text-[12px] font-bold mb-4">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Orden de producción
      </Link>

      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[#5a5a5a] text-[12px]">
          Marcando como <span className="text-[#0d0d0d] font-bold">{verificador.nombre}</span>
        </p>
        <button
          onClick={() => { guardarVerificador(token, null); setVerificador(null); }}
          className="shrink-0 text-[#9a9a9a] text-[12px] underline underline-offset-2"
        >
          No soy yo
        </button>
      </div>

      {/* Lo que toca ahora — un solo botón, sin elegir tipo de pase. */}
      <Cuadro className="mb-5">
        <div className="bg-[#0d0d0d] px-4 py-2.5">
          <span className="text-white text-[10px] font-bold uppercase tracking-[0.15em]">
            {completo ? "Carga cerrada" : "Lo que sigue"}
          </span>
        </div>
        <div className="p-4">
          <p className="text-[#0d0d0d] text-[15px] font-bold leading-snug mb-1">{siguiente.titulo}</p>
          <p className="text-[#5a5a5a] text-[12px] leading-relaxed mb-4">{siguiente.detalle}</p>

          {siguiente.accion === "ABRIR" ? (
            <button
              onClick={() => void abrir(siguiente.tipo)}
              disabled={abriendo}
              className="w-full py-3.5 bg-[#B3985B] rounded-lg text-[#0d0d0d] text-[14px] font-bold disabled:opacity-40"
            >
              {abriendo ? "Abriendo…" : siguiente.titulo}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => void abrir("SALIDA")}
                disabled={abriendo}
                className="flex-1 py-3 border border-[#d8d8d8] rounded-lg text-[#0d0d0d] text-[12.5px] font-bold disabled:opacity-40"
              >
                Otra salida
              </button>
              <button
                onClick={() => void abrir("RETORNO")}
                disabled={abriendo}
                className="flex-1 py-3 border border-[#d8d8d8] rounded-lg text-[#0d0d0d] text-[12.5px] font-bold disabled:opacity-40"
              >
                Otro retorno
              </button>
            </div>
          )}

          {error && <p className="text-[#b91c1c] text-[12px] mt-3">{error}</p>}
        </div>
      </Cuadro>

      {orden.pases.length > 0 && (
        <>
          <p className="text-[#B3985B] text-[10px] font-bold uppercase tracking-[0.13em] mb-2">Pases de este proyecto</p>
          <Cuadro>
            <div className="divide-y divide-[#f0f0f0]">
              {orden.pases.map((p) => (
                <button key={p.id} onClick={() => setCargaId(p.id)} className="w-full px-4 py-3 text-left active:bg-[#f6f6f6]">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[#0d0d0d] text-[13px] font-medium truncate">
                      {PASE_LABEL[p.tipo as TipoPase] ?? p.tipo}
                      {p.etiqueta ? ` · ${p.etiqueta}` : ""}
                    </span>
                    <Chip tono={p.estado === "CERRADA" ? "verde" : "ambar"}>
                      {p.estado === "CERRADA" ? "Cerrado" : "En curso"}
                    </Chip>
                  </div>
                  <Barra pct={p.avance.pct} tono={p.estado === "CERRADA" ? "verde" : "oro"} />
                  <p className="text-[#9a9a9a] text-[10.5px] mt-1 tabular-nums">
                    {p.avance.revisados}/{p.avance.total} revisados
                    {p.avance.faltantes > 0 && ` · ${p.avance.faltantes} faltante(s)`}
                    {p.avance.danados > 0 && ` · ${p.avance.danados} dañado(s)`}
                    {p.abiertoPor && ` · abrió ${p.abiertoPor}`}
                  </p>
                </button>
              ))}
            </div>
          </Cuadro>
        </>
      )}

      <p className="text-[#9a9a9a] text-[11px] mt-5 leading-relaxed">
        Los renglones se congelan al abrir el pase: un cambio posterior en el listado del proyecto no
        reescribe lo que ya verificaste con el equipo en la mano.
      </p>
    </>
  );
}
