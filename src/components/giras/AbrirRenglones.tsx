"use client";

/**
 * Abrir varios renglones de golpe.
 *
 * Cuando ya se sabe cuántos canales son —«son 32 entradas»— capturarlos de uno
 * en uno es dar de alta 32 veces antes de poder escribir. Esto abre los 32
 * renglones vacíos y numerados de una vez, y el nombre se llena después, que es
 * como de verdad se trabaja: primero el conteo, luego el detalle.
 *
 * No reemplaza el alta de uno: para un canal suelto con todos sus datos sigue
 * sirviendo el formulario completo.
 */

import { useState } from "react";

const TOPE = 128;

interface Props {
  /// Qué se está abriendo, en singular y plural: "canal"/"canales".
  que: [string, string];
  trabajando?: boolean;
  onAbrir: (cantidad: number) => void | Promise<void>;
}

export default function AbrirRenglones({ que, trabajando, onAbrir }: Props) {
  const [texto, setTexto] = useState("8");

  const cantidad = Math.trunc(Number(texto));
  const valida = Number.isFinite(cantidad) && cantidad >= 1 && cantidad <= TOPE;

  function abrir() {
    if (!valida || trabajando) return;
    void onAbrir(cantidad);
  }

  const [singular, plural] = que;

  return (
    <div className="inline-flex items-center gap-1.5">
      <input
        type="number"
        min={1}
        max={TOPE}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") abrir();
        }}
        className="ms-input-inline w-14 text-center tabular-nums"
        aria-label={`Cuántos ${plural} abrir`}
      />
      <button
        onClick={abrir}
        disabled={!valida || trabajando}
        className="ms-btn-ghost disabled:opacity-50"
        title={`Abre los renglones vacíos y numerados para llenarlos después (hasta ${TOPE})`}
      >
        Abrir {valida ? (cantidad === 1 ? singular : plural) : plural}
      </button>
    </div>
  );
}
