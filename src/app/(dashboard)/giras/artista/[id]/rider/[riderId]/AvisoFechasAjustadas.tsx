"use client";

/**
 * El aviso de que este renglón del rider no se lee igual en todas las plazas.
 *
 * Cambiar el rider NO mueve a la fecha que ya ajustó el renglón: se queda con lo
 * suyo, que es lo correcto casi siempre —el venue solo tenía otro micrófono— y
 * por eso esto no interrumpe la captura. Pero tiene que verse, porque si el
 * cambio del rider era justo la corrección que todas esperaban, esas fechas
 * quedarían mintiendo. De ahí el botón: realinearlas o dejarlas.
 */

import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { fmtFechaCorta } from "@/lib/giras";
import type { FechaConAjuste } from "@/lib/show-canales";

interface Props {
  riderId: string;
  /// Null = fila que todavía no se guarda, así que ninguna fecha puede ajustarla.
  canalId: string | null;
  nombre: string;
  fechas: FechaConAjuste[];
  onRealineado: (divergencias: Record<string, FechaConAjuste[]>) => void;
}

function renglon(f: FechaConAjuste): string {
  const donde = [fmtFechaCorta(f.fecha), f.ciudad ?? f.gira].join(" · ");
  return `• ${donde}${f.oculto ? " — la saca de su lista" : ""}`;
}

export default function AvisoFechasAjustadas({ riderId, canalId, nombre, fechas, onRealineado }: Props) {
  const confirmar = useConfirm();
  const toast = useToast();
  const [trabajando, setTrabajando] = useState(false);

  if (!canalId || fechas.length === 0) return null;

  const cuantas = fechas.length;

  async function realinear() {
    const ok = await confirmar({
      title: `${cuantas} fecha${cuantas === 1 ? "" : "s"} con su propia versión`,
      message: [
        `«${nombre}» no se lee igual en:`,
        ...fechas.map(renglon),
        "",
        "Realinearlas las devuelve a lo que dice el rider y se pierde lo que capturó cada plaza. Respetarlas las deja como están.",
      ].join("\n"),
      confirmText: "Realinear",
      cancelText: "Respetarlas",
      danger: true,
    });
    if (!ok) return;

    setTrabajando(true);
    try {
      const res = await fetch(`/api/artista-riders/${riderId}/canales/${canalId}/realinear`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudieron realinear las fechas");
        return;
      }
      onRealineado((d.divergencias ?? {}) as Record<string, FechaConAjuste[]>);
      toast.success(`${cuantas} fecha${cuantas === 1 ? "" : "s"} vuelve${cuantas === 1 ? "" : "n"} a leer el rider`);
    } catch {
      toast.error("Error de red al realinear las fechas");
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <button
      onClick={() => void realinear()}
      disabled={trabajando}
      className="ms-badge ms-badge-gold mt-1 inline-block disabled:opacity-50"
      title="Estas fechas tienen su propia versión del renglón: ver cuáles y decidir"
    >
      {cuantas} fecha{cuantas === 1 ? "" : "s"} distinto
    </button>
  );
}
