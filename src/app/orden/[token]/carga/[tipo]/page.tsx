"use client";

import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useOrden } from "../../OrdenContext";
import { Barra, Cargando, Chip, Cuadro } from "../../ui";
import Identificacion, { guardarVerificador, leerVerificador, type Verificador } from "../Identificacion";
import Checklist from "../Checklist";
import { PASE_DESCRIPCION, PASE_LABEL, paseVisible, tipoDesdeRuta } from "@/lib/control-carga";

/**
 * Una pasada física de verificación: la salida de bodega o el retorno.
 *
 * Cada una tiene su propia dirección porque son dos lugares distintos del
 * documento, no dos estados de una misma pantalla: así la barra de abajo lleva
 * directo y el botón de "atrás" del teléfono regresa a donde uno venía.
 *
 * Al entrar se enseña el pase vivo; si ya se cerró, el último —cómo quedó— y no
 * una pantalla vacía pidiendo abrir otro. Los viajes repetidos se listan aparte.
 */
export default function PasePage() {
  const { tipo: segmento } = useParams<{ tipo: string }>();
  const tipo = tipoDesdeRuta(segmento);
  if (!tipo) notFound();

  return <Pase tipo={tipo} />;
}

function Pase({ tipo }: { tipo: "SALIDA" | "RETORNO" }) {
  const { orden, cargando, token, recargar } = useOrden();
  const [verificador, setVerificador] = useState<Verificador | null>(null);
  const [listo, setListo] = useState(false);
  const [elegido, setElegido] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVerificador(leerVerificador(token));
    setListo(true);
  }, [token]);

  // Cambiar de pestaña es cambiar de pasada: la elección manual de un viaje
  // viejo no debe seguir pegada al volver.
  useEffect(() => { setElegido(null); }, [tipo]);

  if (cargando || !orden || !listo) return <Cargando />;
  if (!verificador) return <Identificacion onListo={setVerificador} />;

  const { activo, delTipo } = paseVisible(orden.pases, tipo, elegido);

  async function abrir() {
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
        if (data.cargaId) { setElegido(data.cargaId); await recargar(); return; }
        setError(data.error ?? "No pudimos abrir el pase");
        return;
      }
      setElegido(data.cargaId);
      await recargar();
    } catch {
      setError("Sin conexión. Conéctate para abrir el pase.");
    } finally {
      setAbriendo(false);
    }
  }

  const firma = (
    <div className="flex items-center justify-between gap-3 mb-4">
      <p className="text-[#5a5a5a] text-[12px] min-w-0 truncate">
        Marcando como <span className="text-[#0d0d0d] font-bold">{verificador.nombre}</span>
      </p>
      <button
        onClick={() => { guardarVerificador(token, null); setVerificador(null); }}
        className="shrink-0 text-[#9a9a9a] text-[12px] underline underline-offset-2"
      >
        No soy yo
      </button>
    </div>
  );

  /* Nada abierto todavía: una sola puerta, con el nombre de lo que va a pasar. */
  if (!activo) {
    return (
      <>
        {firma}
        <Cuadro>
          <div className="bg-[#0d0d0d] px-4 py-2.5">
            <span className="text-white text-[10px] font-bold uppercase tracking-[0.15em]">
              {PASE_LABEL[tipo]}
            </span>
          </div>
          <div className="p-4">
            <p className="text-[#5a5a5a] text-[12.5px] leading-relaxed mb-4">{PASE_DESCRIPCION[tipo]}</p>
            <button
              onClick={() => void abrir()}
              disabled={abriendo}
              className="w-full py-3.5 bg-[#B3985B] rounded-lg text-[#0d0d0d] text-[14px] font-bold disabled:opacity-40"
            >
              {abriendo ? "Abriendo…" : `Empezar ${tipo === "SALIDA" ? "la salida" : "el retorno"}`}
            </button>
            {error && <p className="text-[#b91c1c] text-[12px] mt-3">{error}</p>}
          </div>
        </Cuadro>

        <p className="text-[#9a9a9a] text-[11px] mt-5 leading-relaxed">
          Los renglones se congelan al abrir: un cambio posterior en el listado del proyecto no
          reescribe lo que ya verificaste con el equipo en la mano.
        </p>
      </>
    );
  }

  const otros = delTipo.filter((p) => p.id !== activo.id);

  return (
    <>
      {firma}

      <Checklist
        key={activo.id}
        token={token}
        cargaId={activo.id}
        verificador={verificador}
        onCerrada={() => void recargar()}
      />

      {/* Un evento puede necesitar más de un viaje. Se ofrece abajo, después del
          trabajo, y no arriba: abrir otra pasada es la excepción. */}
      {(otros.length > 0 || activo.estado === "CERRADA") && (
        <div className="mt-8">
          <p className="text-[#B3985B] text-[10px] font-bold uppercase tracking-[0.13em] mb-2">
            Otros viajes de {tipo === "SALIDA" ? "salida" : "retorno"}
          </p>
          <Cuadro>
            <div className="divide-y divide-[#f0f0f0]">
              {otros.map((p) => (
                <button key={p.id} onClick={() => setElegido(p.id)} className="w-full px-4 py-3 text-left active:bg-[#f6f6f6]">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[#0d0d0d] text-[13px] font-medium truncate">
                      {p.etiqueta || new Date(p.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
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
                  </p>
                </button>
              ))}
            </div>
          </Cuadro>

          {activo.estado === "CERRADA" && (
            <>
              <button
                onClick={() => void abrir()}
                disabled={abriendo}
                className="w-full mt-2 py-3 border border-[#d8d8d8] rounded-lg text-[#0d0d0d] text-[12.5px] font-bold disabled:opacity-40"
              >
                {abriendo ? "Abriendo…" : `Abrir otra ${tipo === "SALIDA" ? "salida" : "pasada de retorno"}`}
              </button>
              {error && <p className="text-[#b91c1c] text-[12px] mt-2">{error}</p>}
            </>
          )}
        </div>
      )}
    </>
  );
}
