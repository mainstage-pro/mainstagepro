"use client";
import { useState } from "react";

// Número y textos de contacto compartidos por toda la capa comercial.
export const WA_NUMBER = "524461432565";
export const WA_URL =
  "https://wa.me/524461432565?text=Hola%2C%20me%20gustar%C3%ADa%20obtener%20informaci%C3%B3n%20sobre%20producci%C3%B3n%20para%20mi%20evento.";

export function waLink(text: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

// Hook único para lanzar el formulario de descubrimiento desde cualquier CTA de
// la presentación. Genera un link /f/{token} preconfigurado y redirige.
export function useDescubrimiento() {
  const [loading, setLoading] = useState(false);

  async function iniciar(opts?: { tipoEvento?: string; tipoServicio?: string | null }) {
    if (loading) return;
    setLoading(true);
    try {
      const r = await fetch("/api/leads/descubrimiento-publico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoEvento: opts?.tipoEvento ?? "OTRO",
          tipoServicio: opts?.tipoServicio ?? null,
        }),
      });
      const d = await r.json();
      if (d?.url) {
        window.location.href = d.url;
        return;
      }
      throw new Error("sin url");
    } catch {
      setLoading(false);
      window.open(WA_URL, "_blank");
    }
  }

  return { iniciar, loading };
}
