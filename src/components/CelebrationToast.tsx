"use client";

import { useEffect, useState } from "react";

const FRASES_TAREA = [
  "Hecho. Cada detalle cuenta.",
  "Un paso más. Así se construye.",
  "Completado. El equipo avanza.",
  "Listo. Eso es disciplina.",
  "Tachado. Eso importa.",
  "¡Excelente! Sigue así.",
  "Completado. Cada tarea suma al evento.",
  "Bien hecho. El cliente lo sentirá.",
  "Un menos en la lista. Un más en el resultado.",
  "Completado. Así se hace historia.",
];

const FRASES_VENTA = [
  "¡Nuevo evento confirmado! El equipo entra en acción.",
  "¡Venta cerrada! Alguien va a vivir algo memorable gracias a ustedes.",
  "¡Trato cerrado! Otro evento en el que Mainstage dejará huella.",
  "¡Lo lograron! Un cliente más que confió en el equipo.",
  "¡Confirmado! Prepárense para crear algo increíble.",
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface Props {
  type: "tarea" | "venta";
  onDone?: () => void;
}

export function CelebrationToast({ type, onDone }: Props) {
  const [visible, setVisible] = useState(true);
  const frase = type === "venta" ? getRandom(FRASES_VENTA) : getRandom(FRASES_TAREA);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone?.(), 300);
    }, type === "venta" ? 3500 : 2200);
    return () => clearTimeout(t);
  }, [type, onDone]);

  return (
    <div className={`fixed bottom-6 right-6 z-[200] transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
      {type === "venta" ? (
        <div className="bg-[#B3985B] text-black px-5 py-3.5 rounded-2xl shadow-2xl shadow-black/60 max-w-xs">
          <p className="text-xs font-bold uppercase tracking-wider mb-0.5">¡Venta cerrada! 🎉</p>
          <p className="text-sm font-medium leading-snug">{frase}</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#2a2a2a] px-4 py-2.5 rounded-xl shadow-xl shadow-black/50 flex items-center gap-2.5 max-w-xs">
          <span className="text-[#B3985B] text-base">✓</span>
          <p className="text-white text-xs font-medium">{frase}</p>
        </div>
      )}
    </div>
  );
}

// Hook para disparar celebración desde cualquier componente
export function useCelebration() {
  const [celebrating, setCelebrating] = useState<"tarea" | "venta" | null>(null);

  function celebrate(type: "tarea" | "venta") {
    setCelebrating(type);
  }

  const Toast = celebrating ? (
    <CelebrationToast type={celebrating} onDone={() => setCelebrating(null)} />
  ) : null;

  return { celebrate, Toast };
}
