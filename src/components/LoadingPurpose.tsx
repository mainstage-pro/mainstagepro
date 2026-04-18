"use client";

import { useMemo } from "react";

const FRASES = [
  "Preparando tu día…",
  "Cargando lo que importa…",
  "Cada evento que producimos es un recuerdo que alguien va a guardar toda la vida.",
  "El detalle que cuidas hoy es la experiencia que alguien recuerda mañana.",
  "Construyendo el siguiente gran evento…",
  "Tu trabajo importa más de lo que crees.",
  "Detrás de cada evento hay un equipo que dio todo.",
  "Cargando…",
];

export default function LoadingPurpose() {
  const frase = useMemo(() => FRASES[Math.floor(Math.random() * FRASES.length)], []);

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-6 h-6 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#444] text-xs text-center max-w-xs italic">{frase}</p>
    </div>
  );
}
