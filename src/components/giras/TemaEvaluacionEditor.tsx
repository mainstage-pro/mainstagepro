"use client";

/**
 * Un tema de notas y aprendizajes: una lista de hallazgos (falla o situación +
 * la solución que se propone, con severidad) y un espacio de comentarios
 * abiertos para lo que no encaja como hallazgo puntual. La misma pieza sirve
 * para los temas por show y los temas generales de la gira — solo cambia el
 * label y la ayuda que le pasa el panel que la monta.
 */

import { Plus, Trash2 } from "lucide-react";
import {
  SEVERIDADES,
  SEVERIDAD_LABEL,
  type Hallazgo,
  type Severidad,
  type TemaEvaluacion,
} from "@/lib/gira-evaluacion";

const SEVERIDAD_ESTILO: Record<Severidad, string> = {
  MENOR: "border-[#2a2a2a] text-[#9ca3af] bg-[#161616]",
  IMPORTANTE: "border-amber-700/50 text-amber-400 bg-amber-950/40",
  CRITICA: "border-red-800/50 text-red-400 bg-red-950/40",
};

function nuevoHallazgo(): Hallazgo {
  return { id: crypto.randomUUID(), severidad: "IMPORTANTE", falla: "", solucion: "" };
}

export default function TemaEvaluacionEditor({
  label,
  ayuda,
  tema,
  onChange,
}: {
  label: string;
  ayuda?: string;
  tema: TemaEvaluacion;
  onChange: (next: TemaEvaluacion) => void;
}) {
  function agregar() {
    onChange({ ...tema, hallazgos: [...tema.hallazgos, nuevoHallazgo()] });
  }
  function actualizar(id: string, patch: Partial<Hallazgo>) {
    onChange({ ...tema, hallazgos: tema.hallazgos.map((h) => (h.id === id ? { ...h, ...patch } : h)) });
  }
  function quitar(id: string) {
    onChange({ ...tema, hallazgos: tema.hallazgos.filter((h) => h.id !== id) });
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm text-white font-medium">{label}</h3>
        {ayuda ? <p className="ms-meta mt-0.5">{ayuda}</p> : null}
      </div>

      {tema.hallazgos.length > 0 && (
        <div className="space-y-2">
          {tema.hallazgos.map((h) => (
            <div key={h.id} className="ms-card-deep p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {SEVERIDADES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => actualizar(h.id, { severidad: s })}
                      className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                        h.severidad === s ? SEVERIDAD_ESTILO[s] : "border-[#1e1e1e] text-[#555] bg-transparent"
                      }`}
                    >
                      {SEVERIDAD_LABEL[s]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => quitar(h.id)}
                  className="text-[#555] hover:text-red-400 shrink-0"
                  title="Quitar hallazgo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="ms-label">Falla o situación</label>
                  <textarea
                    value={h.falla}
                    onChange={(e) => actualizar(h.id, { falla: e.target.value })}
                    placeholder="Qué pasó..."
                    rows={2}
                    className="ms-textarea"
                  />
                </div>
                <div>
                  <label className="ms-label">Solución propuesta</label>
                  <textarea
                    value={h.solucion}
                    onChange={(e) => actualizar(h.id, { solucion: e.target.value })}
                    placeholder="Qué se propone para que no se repita..."
                    rows={2}
                    className="ms-textarea"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={agregar}
        className="ms-btn-ghost inline-flex items-center gap-1.5 text-[12px]"
      >
        <Plus className="w-3.5 h-3.5 shrink-0" />
        Agregar hallazgo
      </button>

      <div>
        <label className="ms-label">Comentarios abiertos</label>
        <textarea
          value={tema.comentarios}
          onChange={(e) => onChange({ ...tema, comentarios: e.target.value })}
          placeholder="Cualquier otra cosa que valga la pena dejar escrita sobre este tema..."
          rows={2}
          className="ms-textarea"
        />
      </div>
    </div>
  );
}
