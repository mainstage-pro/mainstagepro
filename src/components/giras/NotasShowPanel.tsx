"use client";

/**
 * Notas y aprendizajes de un show: un tema por bloque de producción
 * (coordinación, montaje, soundcheck...), cada uno con sus hallazgos
 * (falla + solución propuesta) y un espacio de comentarios abiertos. Se
 * autoguarda con el mismo mecanismo que las evaluaciones post-evento
 * (debounce + merge en servidor), sin checklist, evidencia ni gastos.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import TemaEvaluacionEditor from "./TemaEvaluacionEditor";
import {
  TEMAS_SHOW,
  emptyGiraShowEvaluacion,
  parseGiraShowEvaluacion,
  type GiraShowEvaluacionData,
  type TemaEvaluacion,
  type TemaShowId,
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
      setData(parseGiraShowEvaluacion(d.evaluacion));
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

  const setTema = (id: TemaShowId, tema: TemaEvaluacion) => {
    setData((prev) => {
      const next = { ...prev, temas: { ...prev.temas, [id]: tema } };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persistir(next), 800);
      return next;
    });
  };

  if (loading) return <div className="text-center text-[#444] text-sm py-6">Cargando…</div>;

  const estadoTxt = estado === "saving" ? "Guardando…" : estado === "saved" ? "Guardado" : "";

  return (
    <div className="max-w-2xl space-y-7">
      <div className="flex justify-end">
        <span className={`text-[11px] h-4 ${estado === "saving" ? "text-[#666]" : "text-green-500"}`}>{estadoTxt}</span>
      </div>
      {TEMAS_SHOW.map((t) => (
        <TemaEvaluacionEditor
          key={t.id}
          label={t.label}
          ayuda={t.ayuda}
          tema={data.temas[t.id]}
          onChange={(tema) => setTema(t.id, tema)}
        />
      ))}
    </div>
  );
}
