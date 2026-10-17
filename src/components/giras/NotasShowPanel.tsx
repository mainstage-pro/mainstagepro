"use client";

/**
 * Notas y aprendizajes de un show: textareas libres que se autoguardan, sin
 * validación ni gate de "completar" — la estructura solo sirve de guía de qué
 * anotar. Mismo mecanismo de guardado que evaluacion-post-evento (debounce +
 * merge en servidor), pero sin checklist, evidencia ni gastos.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAMPOS_EVALUACION_SHOW,
  emptyGiraShowEvaluacion,
  type GiraShowEvaluacionData,
} from "@/lib/gira-evaluacion";

export default function NotasShowPanel({ showId }: { showId: string }) {
  const [data, setData] = useState<GiraShowEvaluacionData>(emptyGiraShowEvaluacion());
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/gira-shows/${showId}/evaluacion`, { cache: "no-store" });
      const d = await r.json();
      if (d.evaluacion) setData({ ...emptyGiraShowEvaluacion(), ...d.evaluacion });
      setLoading(false);
    })();
  }, [showId]);

  const persistir = useCallback(async (next: GiraShowEvaluacionData) => {
    setEstado("saving");
    const r = await fetch(`/api/gira-shows/${showId}/evaluacion`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setEstado(r.ok ? "saved" : "idle");
  }, [showId]);

  const setCampo = (campo: keyof GiraShowEvaluacionData, valor: string) => {
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
      {CAMPOS_EVALUACION_SHOW.map((campo) => (
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
