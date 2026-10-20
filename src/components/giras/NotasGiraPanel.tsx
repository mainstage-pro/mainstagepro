"use client";

/**
 * Autocrítica general de la gira: un resumen ejecutivo, los temas que
 * importan a toda la producción (cada uno con sus hallazgos y comentarios,
 * igual que por show) y los aciertos que vale la pena repetir en la próxima
 * gira. Más breve que el detalle por fecha, porque ese ya vive en cada show.
 * Mismo mecanismo de autoguardado.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import TemaEvaluacionEditor from "./TemaEvaluacionEditor";
import {
  TEMAS_GIRA,
  emptyGiraEvaluacion,
  parseGiraEvaluacion,
  type GiraEvaluacionData,
  type TemaEvaluacion,
  type TemaGiraId,
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
      setData(parseGiraEvaluacion(d.evaluacion));
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

  const guardar = (next: GiraEvaluacionData) => {
    setData(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistir(next), 800);
  };

  const setTema = (id: TemaGiraId, tema: TemaEvaluacion) => {
    guardar({ ...data, temas: { ...data.temas, [id]: tema } });
  };

  if (loading) return <div className="text-center text-[#444] text-sm py-6">Cargando…</div>;

  const estadoTxt = estado === "saving" ? "Guardando…" : estado === "saved" ? "Guardado" : "";

  return (
    <div className="max-w-2xl space-y-7">
      <div className="flex justify-end">
        <span className={`text-[11px] h-4 ${estado === "saving" ? "text-[#666]" : "text-green-500"}`}>{estadoTxt}</span>
      </div>

      <div>
        <label className="block text-sm text-white font-medium mb-1.5">Resumen general de la gira</label>
        <textarea
          value={data.resumenGeneral}
          onChange={(e) => guardar({ ...data, resumenGeneral: e.target.value })}
          placeholder="Cómo fue la gira en general, de inicio a fin..."
          rows={3}
          className="ms-textarea"
        />
      </div>

      {TEMAS_GIRA.map((t) => (
        <TemaEvaluacionEditor
          key={t.id}
          label={t.label}
          ayuda={t.ayuda}
          tema={data.temas[t.id]}
          onChange={(tema) => setTema(t.id, tema)}
        />
      ))}

      <div>
        <label className="block text-sm text-white font-medium mb-1.5">Aciertos a repetir</label>
        <textarea
          value={data.aciertos}
          onChange={(e) => guardar({ ...data, aciertos: e.target.value })}
          placeholder="Qué funcionó bien y vale la pena repetir en la próxima gira..."
          rows={3}
          className="ms-textarea"
        />
      </div>
    </div>
  );
}
