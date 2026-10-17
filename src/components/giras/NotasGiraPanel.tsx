"use client";

/**
 * Autocrítica general de la gira: más breve que las notas por show, porque el
 * detalle de cada fecha ya se capturó ahí. Mismo mecanismo de autoguardado.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAMPOS_EVALUACION_GIRA,
  emptyGiraEvaluacion,
  type GiraEvaluacionData,
} from "@/lib/gira-evaluacion";

export default function NotasGiraPanel({ giraId }: { giraId: string }) {
  const [data, setData] = useState<GiraEvaluacionData>(emptyGiraEvaluacion());
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/giras/${giraId}/evaluacion`, { cache: "no-store" });
      const d = await r.json();
      if (d.evaluacion) setData({ ...emptyGiraEvaluacion(), ...d.evaluacion });
      setLoading(false);
    })();
  }, [giraId]);

  const persistir = useCallback(async (next: GiraEvaluacionData) => {
    setEstado("saving");
    const r = await fetch(`/api/giras/${giraId}/evaluacion`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setEstado(r.ok ? "saved" : "idle");
  }, [giraId]);

  const setCampo = (campo: keyof GiraEvaluacionData, valor: string) => {
    setData((prev) => {
      const next = { ...prev, [campo]: valor };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persistir(next), 800);
      return next;
    });
  };

  if (loading) return <div className="text-center text-[#444] text-sm py-6">Cargando…</div>;

  const estadoTxt = estado === "saving" ? "Guardando…" : estado === "saved" ? "Guardado" : "";

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex justify-end">
        <span className={`text-[11px] h-4 ${estado === "saving" ? "text-[#666]" : "text-green-500"}`}>{estadoTxt}</span>
      </div>
      {CAMPOS_EVALUACION_GIRA.map((campo) => (
        <div key={campo.id}>
          <label className="block text-sm text-white font-medium mb-1.5">{campo.label}</label>
          <textarea
            value={data[campo.id]}
            onChange={(e) => setCampo(campo.id, e.target.value)}
            placeholder={campo.placeholder}
            rows={3}
            className="ms-textarea"
          />
        </div>
      ))}
    </div>
  );
}
